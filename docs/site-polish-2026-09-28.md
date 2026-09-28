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
1. ✅ **מיגרציה** `20260928000000_profiles_marketing_opt_in.sql` – הורצה על ידי אביב ב-28.9.
2. **Google OAuth** – Supabase Dashboard → Authentication → Providers → Google:
   - ליצור OAuth Client ב-Google Cloud Console (Web application), עם Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - להדביק Client ID + Secret ב-Supabase ולהפעיל.
   - Authentication → URL Configuration → Redirect URLs: להוסיף `https://www.bonded.dog/auth/callback`, `https://bonded.dog/auth/callback`, `http://localhost:3000/auth/callback` (או `https://www.bonded.dog/**`).
   - עד אז הכפתור מציג הודעת שגיאה עדינה ומפנה להרשמה במייל.
3. Lint: 13 שגיאות `react-hooks` קיימות מראש בעמודי `/admin` (יצירת קומפוננטות בזמן render) – לא נגענו, שווה סבב נפרד.

## Google Sign-in – צעד אחרי צעד

### א. Google Cloud Console (console.cloud.google.com)
1. למעלה משמאל בוחרים/יוצרים פרויקט (למשל "Bonded").
2. **APIs & Services → OAuth consent screen** (או "Google Auth Platform → Branding"):
   - User type: **External**.
   - App name: `BONDED`, User support email: `info.bonded@gmail.com`.
   - App logo: אפשר להעלות את `public/images/logo.png` (לא חובה).
   - Authorized domains: `bonded.dog` ו-`supabase.co`.
   - Developer contact: המייל שלך. שומרים.
3. באותו מסך, **Publishing status → Publish app** (אחרת רק 100 משתמשי "test" יוכלו להתחבר). ל-scopes בסיסיים (email/profile) לא צריך אימות של Google.
4. **APIs & Services → Credentials → + Create credentials → OAuth client ID**:
   - Application type: **Web application**, Name: `Bonded Supabase`.
   - Authorized JavaScript origins: `https://www.bonded.dog` ו-`https://bonded.dog`.
   - Authorized redirect URIs: ה-**Callback URL** שמופיע ב-Supabase תחת Authentication → Providers → Google (נראה כמו `https://<project-ref>.supabase.co/auth/v1/callback`).
   - Create → מעתיקים **Client ID** ו-**Client secret**.

### ב. Supabase Dashboard (פרויקט bondi)
5. **Authentication → Providers → Google**: מדליקים Enable, מדביקים Client ID + Client secret, Save.
6. **Authentication → URL Configuration**:
   - Site URL: `https://www.bonded.dog`.
   - Redirect URLs: להוסיף `https://www.bonded.dog/auth/callback`, `https://bonded.dog/auth/callback`, `http://localhost:3000/auth/callback`.

### ג. בדיקה
7. bonded.dog/signup → "Sign up with Google". אחרי החזרה אמורים לנחות ב-`/dashboard`, ובטבלת `profiles` יופיע שם מלא (Google שולח `full_name`) ו-`marketing_opt_in` לפי ה-checkbox.
