# מדריך העלאה לאוויר — פלטפורמת Bonded

> מה נבנה, איך מריצים מקומית, ומה צריך לעשות (לפי הסדר) כדי שהמערכת תעבוד באתר האמיתי.
> משתני סביבה מלאים: [env.example](env.example). רקע ומחקר: [kajabi-research/](kajabi-research/README.md).

## 1. מה יש במערכת

| אזור | כתובת | מי |
|---|---|---|
| דשבורד | `/admin` | בעלים + עורך |
| ניהול קורסים — עץ מודולים/תת-מודולים/שיעורים, גרירה, טיוטה/פרסום, **Paywall** | `/admin/courses` ← קורס | בעלים + עורך |
| עורך שיעור — וידאו (קישור Vimeo), טקסט עשיר, קבצים להורדה, חידון | `/admin/courses/<id>/lessons/<lesson>` | בעלים + עורך |
| ייבוא שיעורים מטבלה (Google Sheets / Excel) | `/admin/courses/<id>/import` | בעלים + עורך |
| הצעות מחיר (חינם / חד-פעמי / מנוי, כמה קורסים בהצעה, גישה מלאה/מוגבלת, כולל קהילה) | `/admin/offers` | בעלים + עורך |
| Analytics ו-Reports (הכנסות, החזרים, מנויים, לקוחות, קהילה, התקדמות) + CSV | `/admin/analytics`, `/admin/reports` | בעלים + עורך |
| תוכנית "חבר מביא חבר" — הגדרות ורשימת הפניות | `/admin/referrals` | בעלים + עורך |
| קהילה — הגדרות, ערוצים, אתגרים, מפגשים | `/admin/community` | בעלים + עורך |
| הקהילה של התלמידים (פיד, ערוצים, אתגרים, מפגשים, לוח מובילים, חברים) | `/community` | תלמידים + צוות |
| "Refer a friend" — הקישור האישי של התלמיד | `/refer` | תלמידים |
| אנשי קשר (Contacts) — רשימה, סינון, כרטיס אדם, הענקת גישה, הזמנה במייל (גם בכמות) | `/admin/people`, `/admin/people/add` | בעלים + עורך |
| Inbox — שאלות, דיווחי תקלות וסיפורים שתלמידים שולחים מהאפליקציה | `/admin/inbox` | בעלים + עורך |
| ייבוא הקורסים מ-Kajabi (נוצרים כטיוטה, אפשר להריץ שוב) | `/admin/courses/import-kajabi` | בעלים + עורך |
| ספריית תנועות, שאלות על שיעורים, Live Q&A | `/admin/moves`, `/admin/coaching/questions`, `/admin/coaching/live-qa` | בעלים + עורך |
| Feedback Studio — רוני צופה בסרטוני התלמידים, מוסיפה הערות על ציר הזמן ומסכם | `/studio` | בעלים + עורך |
| הזמנות, לידים (+ ייצוא CSV) | `/admin/orders`, `/admin/leads` | בעלים + עורך |
| **פורטל התלמיד:** Home, My Courses, שיעור, Practice, Plan, Routines, Moves, Feedback, Progress, Community, Profile, Dogs, Settings, Help, Notifications | `/home` ועוד | תלמידים |
| Onboarding — שאלון, תמונות של התלמיד והכלב, והדרכה אינטראקטיבית (Guided tour) | `/welcome` | תלמידים חדשים |
| צוות — הזמנת עורכים/בעלים במייל | `/admin/team` | בעלים בלבד |
| קנייה — עמוד הצעה ← תשלום ← "You're in!" | `/checkout/<slug>` | כולם |
| דפים משפטיים | `/terms`, `/refund-policy`, `/privacy` | כולם |

**עקרונות אבטחה שכבר בפנים:**
- כללי הגישה נמצאים בדאטה בייס, ולכן חלים גם על האתר וגם על אפליקציה עתידית.
- לקוח לא יכול לכתוב ישירות לטבלאות של גישה, התקדמות, תשלומים או תעודות.
- קישורי הווידאו והקבצים נשלחים רק למי שיש לו גישה.
- webhooks של תשלום עוברים אימות חתימה, ואירוע כפול לא יעובד פעמיים.

## 2. הרצה מקומית

דרישות: Docker, Supabase CLI, Node.

```bash
supabase start                 # דאטה בייס מקומי (פורטים 556xx), מריץ את כל המיגרציות
./scripts/seed-local.sh        # משתמשי בדיקה + קורס לדוגמה + ‎.env.local
npm run dev -- --port 3100
```

**חשבונות הבדיקה** מתוארים בראש הקובץ `scripts/seed-local.sh`: בעלים, עורך, תלמיד וקונה. במצב מקומי `PAYMENTS_PROVIDER=test`, כך שאפשר "לקנות" בלי כסף אמיתי.

**בדיקות:**
- `npm test`: בדיקות לוגיקה.
- `npm run test:db`: בדיקות הדאטה בייס (הרשאות, גישה, מסחר).
- `node scripts/simulate-paddle-webhook.mjs`: שולח webhook חתום של Paddle לשרת המקומי.

## 3. העלאה לאוויר — צ'קליסט לפי הסדר

### א. קוד
1. למזג את הענף `worktree-phase-0-foundations` ל-`main` דרך Pull Request.
2. ⚠️ **העותק המקומי שלך מפגר אחרי GitHub.** יש בו שינויים שלא נשמרו (עבודת Sanity, שהוחלט לוותר עליה). לשמור או למחוק אותם לפני שמושכים את `main`.

### ב. Supabase (הפרויקט האמיתי)
1. **לגבות את הדאטה בייס:** Dashboard ← Database ← Backups.
2. **להריץ את המיגרציות.** יש שתי דרכים:
   - דרך ה-CLI:
     ```bash
     supabase link --project-ref <ref>
     supabase db push
     ```
   - או להריץ כל קובץ ב-`supabase/migrations/` ב-SQL Editor, לפי סדר השמות. המיגרציות החדשות מתחילות ב-`20260929…`.
   - המיגרציות של פורטל התלמיד (`20261012…`, `20261013…`, `20261015…`) עדיין לא הורצו על הפרויקט האמיתי. `supabase db push --dry-run` מראה בדיוק מה ירוץ.
3. ⚠️ **להריץ ממש לפני פריסת הקוד החדש.** המיגרציות חוסמות כתיבה ישירה שהקוד הישן עדיין עושה.
4. **הגדרות ה-Auth:**
   - **Confirm email: פעיל.** ההזמנות לצוות וההענקות במייל נפתחות רק למייל מאומת.
   - Site URL: `https://www.bonded.dog`.
   - להוסיף ל-Redirect URLs את `https://www.bonded.dog/auth/callback` ואת `https://www.bonded.dog/auth/confirm` (הזמנות ואיפוס סיסמה).
   - לתצוגות מקדימות ב-Vercel: להוסיף גם `https://*-avivppc.vercel.app/**`.
   - ⚠️ **שולח מיילים (SMTP) — חובה לפני פתיחה.** מיילי ההרשמה ואיפוס הסיסמה נשלחים מ-Supabase עצמו. השולח המובנה שלהם מגיע רק לכתובות של צוות הפרויקט ומוגבל לכמה מיילים בשעה, כך שלקוחות חדשים לא יקבלו את מייל האימות. ב-Authentication ← Emails ← SMTP Settings לחבר את Resend:
     - Host `smtp.resend.com`, Port `465`, User `resend`, Password = מפתח ה-API של Resend, Sender = אותו `EMAIL_FROM`.
   - **תבניות המייל (Authentication ← Emails ← Templates),** כדי שהקישור יעבוד גם כשפותחים אותו בטלפון ולא בדפדפן שבו נרשמו:
     - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/home`
     - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
     - עיצוב: במקום הטקסט של Supabase, להדביק בכל תבנית (לשונית Source) את הקובץ המעוצב המתאים: [confirm-signup.html](email-templates/confirm-signup.html) ו-[reset-password.html](email-templates/reset-password.html). הם כבר כוללים את הקישורים שלמעלה.
   - **התחברות עם Google:** הכפתור מופיע ב-`/login` וב-`/signup`. ב-Authentication ← Providers ← Google להדביק Client ID ו-Secret מ-Google Cloud Console (OAuth client מסוג Web, עם Redirect URI של Supabase שמופיע באותו מסך). בלי זה הכפתור מחזיר שגיאה.
5. **Storage:** הבאקטים `lesson-files` (פרטי, עד 200MB לקובץ), `course-images` (ציבורי), `community-media` (פרטי, תמונות בקהילה עד 10MB), `profile-photos` (ציבורי, 5MB) ו-`routine-music` (פרטי, 20MB) נוצרים אוטומטית במיגרציות. לוודא שהם קיימים.
   - ⚠️ **מגבלת העלאה גלובלית:** ב-Storage → Settings יש "Upload file size limit" שגובר על הגדרת הבאקט. בתוכנית Free היא 50MB לכל היותר. אם יש קבצי הורדה גדולים יותר, צריך תוכנית Pro ולהעלות את המגבלה ל-200MB.

### ג. Vercel
להגדיר את משתני הסביבה מ-[env.example](env.example). בפרט:
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`: המייל שלך. זה חשבון הבעלים הראשון.
- `NEXT_PUBLIC_LEGAL_NAME`: השם הרשום של העסק.
- כל משתני Paddle ו-Resend.
- משתני Mux (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`). בלעדיהם תלמידים לא יכולים להעלות סרטונים ל-Feedback.
- לתצוגה המקדימה (Preview) צריך את אותם משתנים גם בסביבת Preview.

### ד. Vimeo — פרטיות (חובה לפני פתיחה לתלמידים)
בכל סרטון, או בברירת המחדל של החשבון: Settings ← Privacy.
1. **Who can watch:** "Hide from Vimeo". הסרטון לא מופיע ב-vimeo.com.
2. **Where can this be embedded:** "Specific domains", ולהוסיף `bonded.dog` ו-`www.bonded.dog`. בתקופת המעבר להוסיף גם את הדומיין של Kajabi.
3. אחרי השינוי, תצוגה מקדימה של הסרטון (תמונה ואורך) עלולה לא להופיע בעריכת שיעור, אבל הסרטון יתנגן באתר. זה צפוי.

> ייתכן שהגדרות האלה דורשות מנוי בתשלום ב-Vimeo. יש לבדוק במנוי שלכם.

### ה. Paddle
1. **פתיחת חשבון ואישור:**
   - לשלוח מייל ל-sellers@paddle.com ולבקש אישור מראש לקורסי וידאו מקוריים ולמנוי. פירוט ב-[08-payments.md](kajabi-research/08-payments.md).
   - Paddle בודקים את האתר (דף מחירים ודפים משפטיים), ולכן כדאי שהם יהיו באוויר לפני הבקשה.
2. **לעבוד קודם ב-Sandbox:** `PADDLE_ENV=sandbox` ו-`NEXT_PUBLIC_PADDLE_ENV=sandbox`.
3. **Catalog:** ליצור Product ו-Price לכל הצעה (חד-פעמי, או חודשי/שנתי למנוי). את ה-`pri_…` להדביק בשדה "Paddle price id" של ההצעה ב-`/admin/offers`.
4. **Checkout settings ← Default payment link:** `https://www.bonded.dog/checkout/pay`.
5. **Developer tools ← Authentication:**
   - API key ← `PADDLE_API_KEY`
   - Client-side token ← `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
6. **Developer tools ← Notifications:**
   - יעד חדש: `https://www.bonded.dog/api/webhooks/paddle`
   - אירועים: `transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `adjustment.created`, `adjustment.updated`
   - את ה-secret להעתיק ל-`PADDLE_WEBHOOK_SECRET`.
7. **קנייה אמיתית ב-Sandbox:** כרטיס בדיקה של Paddle, ולבדוק שההזמנה מופיעה ב-`/admin/orders` ושהגישה נפתחה.
8. **הנחות לתוכנית "חבר מביא חבר":** ב-Catalog ← Discounts ליצור שתי הנחות באחוזים, זהות לאחוזים ב-`/admin/referrals`: אחת לחבר (קנייה ראשונה) ואחת לתגמול למפנה. את ה-`dsc_…` של כל אחת להדביק שם. הנחה בלי מזהה לא תופעל ב-Paddle, אבל הקנייה לא נחסמת (פשוט במחיר מלא).
9. **מעבר ל-production:** אותם צעדים עם מפתחות production, ואז `PADDLE_ENV=production`.

### ו. Resend (מיילים)
1. לאמת את הדומיין ב-Resend: רשומות DNS.
2. להגדיר `RESEND_API_KEY` ו-`EMAIL_FROM`.
3. בלי ההגדרה הזו המערכת עובדת, אבל לא נשלחים מיילים (ברוך הבא, הזמנות, "קיבלת גישה").

### ו2. תזכורות והתראות מתוזמנות
פעם ביום (06:00 UTC, ב-`vercel.json`) Vercel Cron קורא ל-`/api/cron/reminders`. מה נשלח:
- **תזכורת אימון:** ביום אימון של התלמיד (לפי אזור הזמן שלו), אם עוד לא התאמן היום. אם אצלו כבר ערב (18:00 ואילך), התזכורת היא "מחר יום אימון".
- **שיעור חדש נפתח:** כששיעור עם השהיה (drip) נפתח לתלמיד. התראה באפליקציה בלבד.
- **Live Q&A ומפגשים:** תזכורת יום לפני וביום עצמו. Live Q&A לכל חברי הקהילה, מפגש רגיל רק למי שאישר הגעה.
- **Feedback שמחכה יותר מ-5 ימים:** התראה לכל אנשי הצוות באפליקציה, ומייל מרוכז ל-`COACH_INBOX` (או ל-`EMAIL_FROM` אם אין).

כל תזכורת נשלחת פעם אחת בלבד, גם אם הריצה חוזרת. התלמידים שולטים בכל סוג ב-Settings. מייל לתלמיד נשלח רק אם הפעיל "Reminders by email" (כבוי כברירת מחדל). אזור הזמן נשמר אוטומטית מהדפדפן, ואפשר לשנות אותו ב-Settings.

**להפעלה:**
1. להריץ את המיגרציה `20261018000000_reminders.sql`.
2. ב-Vercel להגדיר `CRON_SECRET`: מחרוזת אקראית, לפחות 16 תווים. בלי המשתנה הזה הכתובת דוחה כל קריאה.
3. מיילים יוצאים רק כש-Resend מוגדר (סעיף ו).
4. לבדיקה ידנית: `curl -H "Authorization: Bearer <CRON_SECRET>" https://www.bonded.dog/api/cron/reminders`. התשובה מראה כמה נשלח מכל סוג.

> ב-Vercel Hobby מותר Cron אחד ביום, והוא רץ מתישהו במהלך השעה שנקבעה. התזכורות בנויות לזה.

### ז. הכנסת הלקוח ותוכן
1. **הזמנת הלקוח:** ב-`/admin/team` ← Invite, עם תפקיד Content editor. הלקוח נרשם או מתחבר עם אותו מייל.
2. **ייבוא הקורסים מ-Kajabi:** ב-`/admin/courses` ← "Import from Kajabi". שלושת הקורסים (Foundations, Moves, Let's Dance) נוצרים כטיוטה עם כל המודולים, השיעורים, הטקסטים והתמונות. אפשר להריץ שוב בלי כפילויות. אחר כך:
   - להוסיף לכל שיעור קישור Vimeo (Kajabi לא מאפשר לייצא את הווידאו).
   - לצרף ידנית את 4 קבצי ה-PDF להורדה.
   - לפרסם כל קורס. אפשר להסתיר את קורסי הדמו הישנים (Unpublish).
3. **הצעות מחיר:** ליצור הצעה ולפרסם.
4. **העברת תלמידים קיימים מ-Kajabi:** ב-`/admin/people/add` להדביק רשימת מיילים ולבחור קורסים. כל אחד מקבל הזמנה במייל, והגישה נפתחת כשהוא נרשם.
5. **Paywall (כמו ב-Kajabi):** בעץ הקורס ← Add content ← Paywall, לגרור את הקו למקום. בהצעה לסמן את הקורס כ-"Limited". מי שקנה הצעה מוגבלת רואה רק את מה שמעל הקו, וכפתור שדרוג.
6. **קהילה:** ב-`/admin/community` לעדכן שם, תיאור ותמונת שער, לערוך ערוצים, וליצור אתגר או מפגש ראשון. ברירת המחדל: כל תלמיד עם קורס פעיל הוא חבר בקהילה.
7. **חבר מביא חבר:** ב-`/admin/referrals` להפעיל ולקבוע אחוזים (ואת מזהי ההנחות של Paddle, סעיף ה.8).

## 4. מגבלות ידועות והמשך
- **תשלומים בפריסה (N חיובים):** לא מומש. ב-Paddle זה נבנה כמנוי שמבוטל אחרי N חיובים.
- **השלמת שיעור בלי צפייה:** אפשר לסמן שיעור כהושלם בלי לצפות בו. זו החלטה עסקית פתוחה.
- **קהילה:** אין עדיין הודעות פרטיות (DM), תיוג (@), חדר Live והתראות במייל. מפגשים עובדים עם קישור Zoom/Meet חיצוני.
- **Analytics:** הזמנים לפי UTC. ההכנסות מוצגות **בלי מע"מ/מס**. תשלומים ישנים בלי אמצעי תשלום מופיעים כ-"Other".
- **חבר מביא חבר:** מי שפותח שני חשבונות יכול להפנות את עצמו פעם אחת (אותו כלל כמו ברוב התוכניות). תגמול אחד לכל חבר שקונה. הנחה "שמורה" 24 שעות לקנייה שלא שולמה עדיין, כדי שלא אפשר יהיה להשתמש בה בכמה קניות במקביל.
- **קהילה — מי חבר:** כברירת מחדל כל תלמיד עם קורס פעיל, **כולל קורסים חינמיים וגישה מוגבלת**. כדי שרק קונים ייכנסו: ב-`/admin/community` לבטל את "Every student with an active course is a member" ולסמן "Includes community access" בהצעות המתאימות.
- **תזכורות:** רצות פעם ביום (סעיף ו2), לא בשעה אישית לכל תלמיד. אין עדיין התראות Push לטלפון.
- **סרטוני Feedback:** מתנגנים דרך Mux עם playback ציבורי (כתובת לא ניתנת לניחוש, אבל לא חתומה).
- **מוזיקה לרוטינות:** קובץ שהוחלף או שהרוטינה שלו נמחקה נשאר ב-Storage. אין עדיין ניקוי אוטומטי.
- **אפליקציה:** התשתית מוכנה (הכללים בדאטה בייס). ראו [06-platform-architecture.md](kajabi-research/06-platform-architecture.md).
