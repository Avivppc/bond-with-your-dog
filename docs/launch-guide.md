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
| תלמידים — רשימה, התקדמות, הענקת גישה במייל (גם למי שעוד לא נרשם), ביטול | `/admin/students` | בעלים + עורך |
| הזמנות, לידים (+ ייצוא CSV), סרטוני Spotlight | `/admin/orders`, `/admin/leads`, `/admin/videos` | בעלים + עורך |
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
3. ⚠️ **להריץ ממש לפני פריסת הקוד החדש.** המיגרציות חוסמות כתיבה ישירה שהקוד הישן עדיין עושה.
4. **הגדרות ה-Auth:**
   - **Confirm email: פעיל.** ההזמנות לצוות וההענקות במייל נפתחות רק למייל מאומת.
   - Site URL: `https://www.bonded.dog`.
   - להוסיף ל-Redirect URLs את `https://www.bonded.dog/auth/callback`.
5. **Storage:** הבאקטים `lesson-files` (פרטי, עד 200MB לקובץ), `course-images` (ציבורי) ו-`community-media` (פרטי, תמונות בקהילה עד 10MB) נוצרים אוטומטית במיגרציות. לוודא שהם קיימים.
   - ⚠️ **מגבלת העלאה גלובלית:** ב-Storage → Settings יש "Upload file size limit" שגובר על הגדרת הבאקט. בתוכנית Free היא 50MB לכל היותר. אם יש קבצי הורדה גדולים יותר, צריך תוכנית Pro ולהעלות את המגבלה ל-200MB.

### ג. Vercel
להגדיר את משתני הסביבה מ-[env.example](env.example). בפרט:
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`: המייל שלך. זה חשבון הבעלים הראשון.
- `NEXT_PUBLIC_LEGAL_NAME`: השם הרשום של העסק.
- כל משתני Paddle ו-Resend.

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

### ז. הכנסת הלקוח ותוכן
1. **הזמנת הלקוח:** ב-`/admin/team` ← Invite, עם תפקיד Content editor. הלקוח נרשם או מתחבר עם אותו מייל.
2. **בניית הקורס:** עץ הקורס ביד, או ייבוא מטבלה ב-"Import from spreadsheet".
3. **הצעות מחיר:** ליצור הצעה ולפרסם.
4. **העברת תלמידים קיימים מ-Kajabi:** ב-`/admin/students` ← Grant access, לכל מייל. הגישה נפתחת כשהם נרשמים.
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
- **אפליקציה:** התשתית מוכנה (הכללים בדאטה בייס). ראו [06-platform-architecture.md](kajabi-research/06-platform-architecture.md).
