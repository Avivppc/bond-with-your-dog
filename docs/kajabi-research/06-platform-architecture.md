# 06 — ארכיטקטורת הפלטפורמה: Admin, אתר ואפליקציה על דאטה בייס אחד

> **ההחלטות מ-29.09.2026:**
> - **שפה:** אנגלית.
> - **ספק סליקה:** עדיין אין.
> - **המטרה:** פלטפורמה בסגנון Kajabi לפרויקט עצמי, כלומר Tenant אחד ולא SaaS למכירה. היא כוללת ניהול קורסים, ובהמשך אפליקציה ייעודית, והכול יושב על אותו דאטה בייס.

## העיקרון המנחה: הלוגיקה חיה ליד הדאטה, לא בתוך הקליינט

הסכנה בפלטפורמה עם כמה קליינטים (Web Admin, Web Member, App) היא שכללים עסקיים ישוכפלו בכל אחד מהם, ואז יסטו זה מזה. לדוגמה: "האם מותר לראות את השיעור?", "האם השיעור נפתח ב-Drip?" ו-"מה קורה כשמשלימים שיעור?". לכן:

```
                    ┌─────────────────────── Supabase (מקור אמת יחיד) ───────────────────────┐
                    │ Postgres: טבלאות + RLS + פונקציות RPC (can_access_lesson, complete_lesson…) │
                    │ Auth (web + app, אותם משתמשים) · Storage · Realtime                         │
                    └───────▲───────────────────────▲──────────────────────────▲─────────────────┘
                            │ supabase-js (RLS)      │ supabase-js (RLS)         │ service role
          ┌─────────────────┴───┐      ┌─────────────┴──────────┐   ┌───────────┴──────────────────┐
          │ Web Member (Next.js) │      │ Mobile App (Expo/RN)   │   │ Server API (Next.js /api/v1) │
          │ + Web Admin          │      │                        │──►│ פעולות מיוחסות בלבד:          │
          └──────────┬───────────┘      └────────────────────────┘   │ playback token · checkout ·   │
                     └──────────────────────────────────────────────►│ webhooks · grant/revoke ·     │
                                                                      │ uploads · emails · cron       │
                                                                      └──────────────────────────────┘
```

### איפה כל סוג לוגיקה יושב

| סוג לוגיקה | מיקום | דוגמאות |
|---|---|---|
| **מי רשאי לראות או לכתוב מה** | RLS ב-Postgres | תלמיד רואה רק את ההתקדמות שלו; שיעור בתשלום רק למי שיש לו Enrollment |
| **כללי גישה ותוכן** | פונקציות SQL (RPC) | `can_access_lesson(uid, lesson_id)`, `lesson_unlocks_at()` (כבר קיימת), `course_outline_for_user(course_id)` |
| **פעולות שמשנות מצב ויש להן תופעות לוואי** | RPC או טריגר, שכותבים שורה ל-`events` | `complete_lesson()` מסמן התקדמות, בודק תעודה ומוסיף אירוע `lesson.completed` |
| **פעולות שדורשות סוד או צד שלישי** | Server API (`/api/v1/*`) | חתימת טוקן Mux, יצירת תשלום, אימות webhook, שליחת מייל, העלאה ל-Mux |
| **תהליכים מתוזמנים** | Vercel Cron → `/api/cron/*` | המשך אוטומציות, מיילי Drip, נטישת עגלה |
| **תצוגה בלבד** | קליינט | עיצוב, ניווט, מצב UI |

**מבחן פשוט:** אם הלוגיקה צריכה לעבוד **גם באפליקציה**, היא לא נכתבת בתוך Server Action של Next.js. היא נכתבת ב-SQL, או ב-`/api/v1` שהאפליקציה יכולה לקרוא לו.

> **המצב היום:** חלק מהלוגיקה יושב ב-Server Actions. לדוגמה, ההרשמה ב-`src/app/learn/[courseId]/page.tsx` והשמירות של ה-Admin. צריך להעביר אותם בהדרגה ל-RPC או ל-API.

## מבנה הקוד: Monorepo

**עכשיו:** לא צריך להמיר. כותבים לוגיקה טהורה (drip, scoring, תמחור, Zod schemas) ב-`src/lib/` **בלי import מ-Next**, כך שאפשר להעביר אותה החוצה בלי שינוי. `src/lib/drip.ts` ו-`src/lib/quiz/scoring.ts` כבר בנויים כך.

**כשמתחילים את האפליקציה:** עוברים ל-pnpm workspaces עם Turborepo:

```
apps/
  web/        ← Next.js הנוכחי (אתר + member + admin + /api/v1)
  mobile/     ← Expo (React Native) — member בלבד
packages/
  db/         ← supabase/migrations + טיפוסים מג'ונרטים (supabase gen types)
  core/       ← Zod schemas, לוגיקה טהורה, קבועים (משותף web+mobile)
  api-client/ ← קליינט טיפוסי ל-/api/v1 (fetch + auth header)
```

## API לאפליקציה (`/api/v1`)

- **Auth:** האפליקציה שולחת `Authorization: Bearer <supabase access token>`, והשרת מאמת אותו מול Supabase. זה אותו דפוס שראינו ב-Kajabi: ה-API שלהם מחזיר 401 לבקשה עם cookie בלבד.
- **גרסאות:** `/api/v1` מההתחלה. אפליקציה שכבר מותקנת אצל משתמשים לא מתעדכנת מיד, ולכן אסור לשבור חוזים קיימים.
- **ולידציה:** קלט ופלט עם Zod מתוך `packages/core`. האפליקציה והשרת משתמשים באותן סכמות.
- **Endpoints שהאפליקציה צריכה:**

| Endpoint | תפקיד |
|---|---|
| `POST /api/v1/lessons/:id/playback` | טוקן Mux חתום. קיים היום כ-`/api/lessons/[lessonId]/playback` |
| `POST /api/v1/lessons/:id/complete` | עוטף את ה-RPC `complete_lesson` |
| `GET /api/v1/me/library` | הקורסים שלי, כולל התקדמות. אפשר גם RPC ישיר |
| `POST /api/v1/uploads` | וידאו של תלמיד. קיים היום |
| `POST /api/v1/devices` | רישום Push token (Expo Notifications) |

- **קריאות רגילות** (מבנה קורס, התקדמות, פרופיל) עוברות ישירות ב-supabase-js עם RLS, בלי לעבור דרך ה-API. כך יש פחות קוד.

## האפליקציה: החלטות שכדאי לדעת עליהן כבר עכשיו

1. **Expo (React Native)** מתאים ל-Stack: TypeScript, React ו-supabase-js עובדים בו. Mux (HLS חתום) מתנגן דרך `react-native-video` או ה-SDK של Mux. **כדאי לבדוק את התמיכה העדכנית לפני שמתחילים.**
2. **מכירה בתוך האפליקציה (חשוב):**
   - Apple ו-Google מחייבים In-App Purchase (עמלה של 15–30%) על מכירת תוכן דיגיטלי בתוך האפליקציה.
   - **המודל המקובל, וזה גם מה שהאפליקציה החינמית של Kajabi עושה:** מוכרים באתר, והאפליקציה משמשת רק לצריכת תוכן ("reader app"). המשתמש מתחבר, והקורסים שקנה מופיעים.
   - ב-Branded App של Kajabi יש IAP. ראינו בקטלוג האוטומציות את הטריגר `AppOfferPurchasedOrGranted`.
   - ⚠️ הכללים של Apple לגבי קישור חיצוני לתשלום השתנו בשנים האחרונות, ובארה"ב הם שונים משאר העולם. **יש לבדוק את ההנחיות העדכניות לפני שמחליטים.**
   - **המשמעות לדאטה בייס:** `orders.provider` יכול לקבל גם `apple_iap` ו-`google_iap`. הגישה עדיין נגזרת מ-`enrollments`, כלומר אותו מודל בדיוק.
3. **התראות Push:** טבלת `devices(user_id, expo_push_token, platform)`, ושליחה מה-Server או מאוטומציה. זו פעולה חדשה בקטלוג: `push.send`.
4. **Offline:** הורדת שיעורים לצפייה בלי אינטרנט היא יכולת שכדאי לתכנן לשלב מאוחר. זה תלוי ביכולות של Mux וב-DRM.
5. **Deep links:** Magic link או OTP לכניסה. הכתובת `bondedacademy://lesson/:id` צריכה להתאים למבנה ה-URL באתר.

## סליקה: אין עדיין ספק, ולכן בונים מתאם (Adapter)

כל עוד לא נבחר ספק, בונים את המסחר כך שהספק יהיה פרט מימוש בלבד:

```ts
// packages/core (או src/lib/payments) — ממשק בלבד
interface PaymentProvider {
  createCheckout(input: { orderId: string; offer: Offer; customer: Customer; returnUrl: string }): Promise<{ redirectUrl: string }>;
  parseWebhook(req: Request): Promise<PaymentEvent>;   // מאמת חתימה, מחזיר אירוע נורמלי
  refund(providerRef: string, amount?: number): Promise<void>;
}
type PaymentEvent =
  | { type: 'payment.succeeded'; orderId: string; providerRef: string; amount: number; currency: string }
  | { type: 'payment.failed'; orderId: string; reason?: string }
  | { type: 'subscription.renewed' | 'subscription.canceled'; subscriptionRef: string };
```

- **מה עובד כבר בלי ספק:** הצעות חינמיות (`provider='free'`) והענקה ידנית מה-Admin (`provider='manual'`). כך כל הצינור נבדק מקצה לקצה לפני שיש סליקה אמיתית: Order, Enrollment, Event ומייל.
- **איך לבחור ספק, כשמגיעים לזה** (האתר באנגלית, כנראה קהל בינלאומי):
  - **Merchant of Record** (למשל Paddle או Lemon Squeezy): הספק הוא המוכר הרשמי, והוא מטפל במע"מ ובמס מכירה בכל העולם ובחשבוניות ללקוח. זה מתאים לעסק ישראלי שמוכר לחו"ל. **יש לאמת שהספק מקבל מוכרים מישראל, מה העמלות, ואיך מדווחים על ההכנסה בישראל.**
  - **סולק ישראלי** (Grow, Cardcom, PayPlus): מתאים אם רוב הלקוחות בישראל. דורש הפקת חשבונית בנפרד.
  - **Stripe:** לא זמין לעסק שרשום בישראל.

## מה זה משנה בתוכנית השלבים

| שלב | היקף מעודכן |
|---|---|
| **0: יסודות** | תיקוני אבטחה (הרשמה חופשית, RLS של תעודות). מקור אמת יחיד לתוכן. `can_access_lesson()` ו-`complete_lesson()` כ-RPC. טבלת `events`. יצירת טיפוסים מ-Supabase (`supabase gen types`) |
| **1: ליבת ניהול הקורסים (Kajabi Products)** | Modules, Paywall וגישה limited. Admin: עורך קורס עם מודולים, סידור בגרירה (position עם רווחים), העלאת וידאו ל-Mux מה-Admin ו-Mux webhook. קבצים לשיעור |
| **2: Offers וגישה (Kajabi Sales, בלי סליקה)** | `offers`, `offer_courses`, `orders` ו-`enrollments.source/expires_at`. הצעה חינמית והענקה ידנית. Admin: תלמידים והזמנות. מיילים טרנזקציוניים (Welcome, Access granted) |
| **3: API v1 והכנה לאפליקציה** | `/api/v1` עם Bearer auth ו-Zod. מעבר ל-Monorepo. `packages/core` ו-`packages/db` |
| **4: אפליקציה (MVP)** | Expo: התחברות, הספרייה שלי, נגן, השלמת שיעור, התקדמות, Push. מכירה רק באתר |
| **5: סליקה** | בחירת ספק ומימוש `PaymentProvider`. צ'קאאוט באתר. חשבוניות |
| **6: CRM, מייל ואוטומציות** | `contacts` ו-`tags`, מנוע אוטומציות, Sequences, דשבורד הכנסות |
| **7: קהילה ו-AI** | Challenges, נקודות, AI TA |

> **למה הסדר השתנה:** כל עוד אין ספק סליקה, אין טעם לחכות. שלבים 0–4 לא תלויים בו, והם בונים את הבסיס שהאפליקציה צריכה. המודל (Order, Enrollment) כבר תומך בסליקה, כך שבשלב 5 רק מחברים ספק.
