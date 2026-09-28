# Site polish round – 28.9.2026

## נעשה
- **Above the fold**: הורדנו את הריפוד העליון ב-hero של הבית, About ו-Journey. ב-1440px "As Seen On" נכנס למסך הראשון.
- **עמוד הרשמה** (`/signup`): פריסה חדשה בשני טורים – ערך (כותרת, 4 יתרונות, תמונה, המלצה של Lili) + טופס. נוספו:
  - checkbox "Send me training tips…" (מסומן כברירת מחדל) → נשמר ב-`profiles.marketing_opt_in` + `marketing_opt_in_at`.
  - כפתור **Sign up with Google** (Supabase OAuth). גם ב-`/login`.
- **404 ממותג** (`src/app/not-found.tsx`) במקום עמוד ברירת המחדל של Next.
- Metadata (title) ל-`/signup` ו-`/login`.
- באג: רווח חסר ב-Chapter placeholder ("begins.Lessons").
- `/auth/callback` מקבל רק `next` יחסי (מונע open redirect).

## נשאר אצל אביב
1. **מיגרציה** `supabase/migrations/20260928000000_profiles_marketing_opt_in.sql` – להריץ ב-Supabase (פרויקט bondi). בלי זה ההרשמה עובדת אבל ה-checkbox לא נשמר.
2. **Google OAuth** – Supabase Dashboard → Authentication → Providers → Google:
   - ליצור OAuth Client ב-Google Cloud Console (Web application), עם Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - להדביק Client ID + Secret ב-Supabase ולהפעיל.
   - Authentication → URL Configuration → Redirect URLs: להוסיף `https://www.bonded.dog/auth/callback`, `https://bonded.dog/auth/callback`, `http://localhost:3000/auth/callback` (או `https://www.bonded.dog/**`).
   - עד אז הכפתור מציג הודעת שגיאה עדינה ומפנה להרשמה במייל.
3. Lint: 13 שגיאות `react-hooks` קיימות מראש בעמודי `/admin` (יצירת קומפוננטות בזמן render) – לא נגענו, שווה סבב נפרד.
