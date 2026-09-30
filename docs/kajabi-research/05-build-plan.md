# 05 — איך לבנות את זה: אפיון לבנייה ב-Bond-with-your-dog

> ה-Stack הקיים: Next.js 16 (App Router, `src/proxy.ts`), React 19, Tailwind 4, Supabase (Auth, Postgres, RLS), Mux, Resend, Vercel, ו-Sanity לתוכן.
> **לפני כתיבת קוד:** לפי `AGENTS.md`, יש לקרוא את המדריכים ב-`node_modules/next/dist/docs/`. גרסה 16 שונה מהגרסאות המוכרות.

## 1. ניתוח פערים: Kajabi מול הקוד הקיים

סימון מצב: ✅ קיים · 🟡 חלקי · ❌ חסר. עדיפות: P0 הכי דחוף.

| פיצ'ר Kajabi | מצב בריפו | פעולה | עדיפות |
|---|---|---|---|
| Product (קורס) | ✅ `courses` | להשאיר | - |
| Modules / Submodules | ❌ שיעורים שטוחים | טבלת `modules` ו-`lessons.module_id` | P1 |
| שיעור: וידאו, טקסט, קבצים | ✅ Mux signed, `resources` | העלאת וידאו ל-Mux מתוך ה-Admin (Direct upload, כבר קיים לסטודנטים) | P1 |
| Drip | ✅ `available_after_days` | להוסיף `publish_at` ומייל "נפתח שיעור" | P2 |
| נעילה עד השלמה או חידון | 🟡 `pass_threshold` קיים | `locked_until_lesson_id` | P2 |
| חידונים | ✅ | - | - |
| תעודות | ✅ טריגר ו-PDF | **לתקן RLS** (`using (true)`) | **P0** |
| Paywall (Freemium) | ❌ | `modules.is_paywall` ו-`enrollments.access_level` | P1 |
| **Offer, צ'קאאוט, סליקה** | ❌ **אין תשלומים; הרשמה חופשית לכל קורס** | [סעיף 3](#3-מסחר-offer--checkout--סליקה-ישראלית) | **P0** |
| חשבונית או קבלה | ❌ | אינטגרציה עם ספק חשבוניות | **P0** (חובה חוקית) |
| קופונים | ❌ | טבלת `coupons` | P2 |
| Order bump / Upsell | ❌ | אחרי שהצ'קאאוט עובד | P3 |
| מנויים וחברות | ❌ ("coming soon" בפרופיל) | `subscriptions` וחיוב חוזר אצל ספק הסליקה | P2 |
| נטישת עגלה | ❌ | `checkout_sessions` ו-Cron | P3 |
| תגובות על שיעור | ❌ | `lesson_comments` | P2 |
| קהילה | 🟡 גלריית `student_videos` עם מודרציה | אתגרים וקיר תגובות (סעיף 7) | P3 |
| אנשי קשר, תגיות, CRM | 🟡 רק `quiz_leads` | `contacts` ו-`tags`, ומיגרציה של הלידים | P1 |
| Forms / Opt-in | 🟡 הקוויז | טופס Opt-in גנרי שכותב ל-`contacts` | P2 |
| Email broadcasts ו-sequences | ❌ (Resend רק ל"שאל את המאמן") | Resend Broadcasts/Audiences, או Sequence engine פנימי | P2 |
| מיילים מערכתיים | ❌ | Welcome, קבלה, גישה ניתנה, Drip, תעודה (React Email) | P1 |
| אוטומציות | ❌ | מנוע אירועים מינימלי (סעיף 5) | P2 |
| דפי נחיתה / בילדר | 🟡 דפים סטטיים בקוד | בשלב זה: Sections ב-Sanity. בילדר מלא רק אם יש צורך (סעיף 6) | P3 |
| Admin: תלמידים, הזמנות, לידים, הכנסות | ❌ | מסכי Admin (סעיף 8) | P1 |
| הענקת או ביטול גישה ידנית | ❌ | כפתור ב-Admin (עבור `source='grant'`) | P1 |
| אנליטיקה | ❌ | דשבורד בסיסי ו-PostHog או Vercel Analytics | P2 |
| **עברית ו-RTL** | ❌ `lang="en"` | סעיף 4 | **P0/P1** (החלטה עסקית) |
| AI Teaching Assistant | ❌ | תמלולי Mux, Embeddings ו-Claude | P3 |
| אפליקציה | ❌ | PWA מספיק בשלב זה | P4 |

### בעיות קיימות לתקן לפני הכול (P0)
1. **`enrollments_insert_own` ו-Server Action של "Enroll for free"** (`src/app/learn/[courseId]/page.tsx`): כל משתמש מחובר יכול להירשם לכל קורס. אחרי שיש מחירים זו פרצה.
2. **`certificates_verify_by_code` ו-`achievements_select_public_for_spotlight` עם `using (true)`:** כל שורה חשופה. צריך להגביל את הגישה ל-RPC שמקבל קוד.
3. **שני מקורות אמת לתוכן:** Admin באפליקציה ו-Sanity sync כותבים לאותן שורות. צריך להחליט על מקור אחד. **ההמלצה היא Supabase לתוכן הקורסים**, ו-Sanity לחדשות ולשיווק בלבד.

## 2. ארכיטקטורה מוצעת

```
Next.js 16 (Vercel)
├─ app/(marketing)     ← דפים ציבוריים, RSC, מהירים; בעתיד Sections-from-CMS
├─ app/(member)        ← דשבורד, נגן, קהילה — RSC + Client islands (כמו ה"react-mounter" של Kajabi)
├─ app/(admin)         ← requireAdmin(); Server Actions לטפסים, Client רק לטבלאות/גרפים
├─ app/checkout/[slug] ← צ'קאאוט עברי; יוצר checkout_session → מפנה/מטמיע דף סליקה
├─ app/api/webhooks/{payments,mux,resend}  ← מקור האמת להזמנות/גישה/סטטוס וידאו
└─ app/api/cron/*      ← Vercel Cron: automations resume, drip emails, abandoned carts

Supabase: Postgres + RLS + Auth (+ magic link) + Storage + Realtime (קהילה)
          פונקציית SQL אחת: can_access_lesson(uid, lesson_id)
          טבלת events (append-only) ← כל פעולה עסקית; טריגר/Server Action כותב, automations קוראים
Mux: וידאו (signed) + webhooks (asset.ready) + captions/transcripts (ל-AI TA)
Resend: טרנזקציוני + Broadcasts; תבניות ב-React Email (RTL)
ספק סליקה ישראלי + ספק חשבוניות (ראו סעיף 3)
```

**שלושה עקרונות שלוקחים מ-Kajabi:**
1. **הגישה נגזרת מההזמנה.** שורה ב-`enrollments` נוצרת רק מ-webhook של תשלום, ממענק ידני או מהצעה חינמית. הקליינט לעולם לא יוצר אותה.
2. **אירוע אחד לכל פעולה.** `order.paid`, `lesson.completed`, `form.submitted`, `tag.added` נכתבים לטבלת `events`. המיילים, האוטומציות והאנליטיקה צורכים את אותו אירוע.
3. **Islands.** ברירת המחדל היא Server Components, ו-Client רק היכן שיש אינטראקציה: נגן, בונה אוטומציות, גרפים.

## 3. מסחר: Offer, צ'קאאוט וסליקה ישראלית

**Flow:**
```
/checkout/[offerSlug]  →  טופס (שם, מייל, טלפון, קופון, הסכמה לדיוור)
   → Server Action: create checkout_session (pending order) → provider.createPayment()
   → redirect/iframe לדף הסליקה של הספק
   → webhook /api/webhooks/payments (אימות חתימה!) → order.paid
        → upsert contact (+tag buyer:<offer>) → grant enrollments(offer_courses)
        → הפקת חשבונית/קבלה (API ספק החשבוניות) → שמירת invoice_url
        → events: order.paid → מייל Welcome/קבלה → automations
   → /checkout/thank-you?order=… (פולינג לסטטוס עד paid)
```

**ספקים שכדאי לבדוק** (יש לאמת בעצמכם את היכולות העדכניות, ה-API והעמלות מול כל ספק):
- **סליקה:** Grow (Meshulam), Cardcom, PayPlus, Tranzila. **קריטריונים:** תשלומים, Bit, Apple Pay, Google Pay, הוראת קבע למנויים, webhook חתום, דף סליקה מתארח (Hosted) כדי להישאר מחוץ ל-PCI, ו-SDK או REST נוח.
- **חשבוניות:** Morning (Green Invoice), iCount, EZcount. חלק מספקי הסליקה מפיקים מסמך בעצמם. אם כן, זה חוסך אינטגרציה.
- **בינלאומי:** PayPal או Paddle (Merchant of Record) להצעה בדולרים.

**כללים עסקיים מ-Kajabi שכדאי לאמץ:**
- מטבע אחד להצעה. אם צריך דולר, יוצרים הצעה נפרדת.
- הצעת Freemium (`access_level='limited'`) מול הצעה מלאה (`'full'`) לאותו קורס.
- `days_of_access` לגישה עם תפוגה, ו-`access_starts_at` למחזורים.
- מייל אישור עם משתנים (`{{name}}`, `{{course}}`, `{{login_url}}`).
- **Idempotency:** `orders.provider_ref` ייחודי, וה-webhook יכול להגיע פעמיים.

## 4. עברית ו-RTL

- `<html lang="he" dir="rtl">` ב-`src/app/layout.tsx`. אם רוצים דו-לשוניות: `app/[locale]` עם `next-intl`, ו-dir נגזר מה-locale.
- **Tailwind 4:** לעבור ל-Logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) במקום `ml-*`, `mr-*`, `left-*`. חצים ואייקונים כיווניים מקבלים `rtl:rotate-180`.
- **פונטים:** Heebo, Assistant או Rubik (עברית ולטינית).
- **מיילים:** React Email עם `dir="rtl"` ברמת ה-`<Html>` וב-`<Body>`.
- **מספרים ותאריכים:** `Intl.NumberFormat('he-IL', {style:'currency', currency:'ILS'})`, ואזור זמן `Asia/Jerusalem` (גם ל-Drip).
- ⚠️ זו **החלטה עסקית פתוחה**: האם הקהל של Keta Tov דובר עברית, אנגלית או שתיהן? היום כל האתר באנגלית.

## 5. אוטומציות: מנוע מינימלי בסגנון Kajabi

- **המודל:** `Trigger(type, resource_id?)` ← אחריו `steps[]` ב-JSON: `tag.add`, `tag.remove`, `email.send`, `sequence.subscribe`, `offer.grant`, `wait{days}`.
- **הביצוע:**
  1. Server Action או webhook כותב ל-`events`.
  2. `dispatchEvent(event)` מאתר אוטומציות מתאימות ויוצר `automation_runs`. יש אילוץ unique על `(automation_id, event_id)`, כך שכל אירוע מפעיל כל אוטומציה פעם אחת בלבד (idempotency).
  3. הצעדים רצים עד שמגיעים ל-`wait`. אז נשמר `resume_at`, ו-Vercel Cron (כל 5 דקות) ממשיך מאותה נקודה.
- **טריגרים לשלב ראשון:**
  - `order.paid(offer)`, `form.submitted(form)`, `quiz.completed(tier)`
  - `lesson.completed(lesson)`, `course.completed(course)`
  - `tag.added(tag)`, `contact.inactive(days)`, `subscription.canceled`
- **UI:** כמו ה-Legacy של Kajabi: "When / Then", כלומר רשימת צעדים. קנבס עם Branch מגיע רק כשיש צורך.
- **קטלוג דינמי:** endpoint שמחזיר את רשימת הטריגרים והפעולות הזמינים, כמו `automation_trigger_options` ב-Kajabi. ה-UI לא מקודד אותם.

## 6. דפי נחיתה: לא לבנות בילדר עכשיו

- הקוד הקיים כבר מכיל דפים מעוצבים בקוד. בילדר ויזואלי מלא הוא פרויקט של חודשים.
- **שלב ביניים מומלץ, בדפוס של Kajabi (Section, Block, Schema):**
  - Registry בקוד: `sections/{hero,features,faq,testimonials,pricing,optin,course-outline,countdown}.tsx`, ולכל אחד `schema` ב-Zod.
  - הדף נשמר כ-JSON: `{sections:[{type, settings, blocks:[{type, settings}]}]}`, ב-Sanity (שכבר קיים) או ב-Supabase.
  - Renderer גנרי: `<PageRenderer page={json}/>`. Section חדש = קומפוננטה ו-schema. זה בדיוק מה שנותן ל-Kajabi יכולת להתרחב.
  - בהמשך אפשר לבנות עורך טפסים שנוצר מה-schema, עם תצוגה מקדימה ב-iframe.

## 7. קהילה "קלה" שמתאימה ל-Bonded

- בונים על `student_videos` הקיים ועל המודרציה הקיימת.
- **Challenges:**
  - דוגמה: "5 ימים, 5 משחקים", שכבר קיים כשיעור ב-Kajabi.
  - טבלאות `challenges` ו-`challenge_entries`. הגשה היא וידאו, ויש Hype-up או תגובה.
- **Points ו-Leaderboard פשוטים:**
  - טבלת `points_ledger` שמתעדכנת דרך טריגרים.
  - אפשר להיעזר בחוקי הנקודות של Kajabi כנקודת פתיחה: השלמת אתגר 100, RSVP 25, תגובה 3.
- **Realtime:** Supabase Realtime לתגובות.
- **הודעות:** WhatsApp (דרך ספק כמו Twilio או 360dialog) לתזכורות אתגר. **זה בדיוק מה שחסר ב-Kajabi.**

## 8. מסכי Admin שחסרים (לפי סדר)

1. **Orders:** רשימה, סטטוס, החזר (דרך הספק), וקישור לחשבונית.
2. **Students:** רשימה עם LTV, קורסים והתקדמות. פעולות: הענקה, ביטול והארכה של גישה.
3. **Offers:** CRUD, מחיר ותשלומים, סוג גישה (full/limited), קורסים בחבילה, קישור לצ'קאאוט.
4. **Contacts ו-Leads:** לידים מהקוויז, תגיות, ייצוא.
5. **Dashboard:** הכנסה (7 ו-30 יום, לעומת התקופה הקודמת), רכישות, לידים חדשים, השלמת קורסים. כל כרטיס מביא את הנתונים שלו בנפרד, כמו אצל Kajabi.
6. **Automations ו-Emails:** בהמשך.

## 9. תוכנית שלבים

| שלב | היקף | תוצאה |
|---|---|---|
| **0: תיקונים** | סגירת ההרשמה החופשית, תיקון ה-RLS של תעודות והישגים, החלטה על מקור אמת לתוכן | בסיס בטוח |
| **1: למכור** | `offers`, `offer_courses`, `orders`, צ'קאאוט בעברית, ספק סליקה, webhook, חשבונית, מייל Welcome וקבלה, מסכי Admin להזמנות, תלמידים והצעות | **הכנסה ראשונה** |
| **2: Freemium וקורס מלא** | `modules`, Paywall ו-limited offer, העלאת וידאו מה-Admin, מייל Drip, תגובות על שיעור | משפך מ-"limited" למלא |
| **3: CRM ומייל** | `contacts` ו-`tags` (מיגרציה של `quiz_leads`), טופס Opt-in, Sequence Welcome ו-Nurture, מנוע אוטומציות מינימלי, דשבורד הכנסות | שיווק אוטומטי |
| **4: מעורבות** | Challenges, נקודות, תזכורות ב-WhatsApp, מנוי חודשי (Membership) | שימור והכנסה חוזרת |
| **5: AI ו-Scale** | Teaching Assistant מתוך תמלולי Mux, Order bump ו-Upsell, נטישת עגלה, Page sections מ-CMS | הגדלת ערך הזמנה |

## 10. החלטות

> **עדכון 29.09.2026:** החלטות 1–3 התקבלו. תוכנית השלבים המעודכנת נמצאת ב-[06-platform-architecture.md](06-platform-architecture.md), והיא **מחליפה את סעיף 9**.

1. ✅ **שפה: אנגלית.** סעיף 4 (RTL) יורד מהתוכנית.
2. ✅ **ספק סליקה: עדיין אין.** בונים `PaymentProvider` adapter ומתחילים עם הצעות חינמיות והענקה ידנית. את הספק בוחרים בשלב 5.
3. ✅ **מטרה:** פלטפורמה בסגנון Kajabi לפרויקט עצמי (Tenant אחד), עם אפליקציה ייעודית על אותו דאטה בייס. מודל ההכנסה עוד פתוח, אבל הסכמה (`payment_type`) תומכת בכל האפשרויות.
4. **Sanity:** להשאיר לתוכן שיווקי ולחדשות, או לבטל? ההמלצה: לא לנהל בו קורסים.
5. **Kajabi עצמו:** להמשיך להשתמש בו במקביל, למשל לצ'קאאוט דרך PayPal, או לעבור לגמרי לפלטפורמה שלכם? ב-Kajabi כבר יש 3 קורסים מלאים עם וידאו ב-Wistia. **מיגרציה של התוכן** (וידאו, טקסטים, קבצים) תהיה משימה בפני עצמה.
