# סקירת האתר במובייל – bonded.dog (24.9.2026)

## סטטוס תיקונים (24.9)
✅ תוקן: #1 (title/description/OG), #2 (/enroll נמחק → /signup), #3 (kinetic-basics נמחק; /community ו-/blog נשארו כי אזור החברים מקשר אליהם – סומנו noindex), #4 (Stories נכתב מחדש: 2 ציטוטים אמיתיים + "Share your story" במייל), #5 (פוטר: קישורים אמיתיים, סלוגן חדש, Privacy/Terms הוסרו עד שיהיו עמודים), #6 (info.bonded@gmail.com בפוטר וב-FAQ), #7 ("BONDED student"), #8 (Join the Waitlist → /signup), #9 (robots + sitemap), #10 (מתודה קומפקטית, "Show all N lessons", ציטוטים קטנים יותר), #11 (תמונה ראשונה וקצרה, Perfect For מקופל), #12 ("Start with Foundations", כפתורים ברוחב מלא), #13 (As seen on: America's Got Talent · NBC), #14 (4 שאלות FAQ נוספות), #15 (Member Login בתפריט), #16 (Join BONDED + משפט ציפיות). "Your dog is already speaking" הוסר מ-Journey.
⏳ נשאר: אייקוני Instagram/YouTube הוסרו מהפוטר עד שיהיו קישורים; שאלות FAQ על מחיר והחזר (החלטה עסקית); #17 (alt ריק על תמונת רקע – מכוון).


נבדק: כל העמודים הציבוריים ב-375×812, סריקת לינקים אוטומטית (50 כתובות פנימיות + 17 חיצוניות), בדיקת כפתורים ללא יעד, מטא-דאטה, ואורך טקסטים.

**תוצאה כללית**: אין אף לינק שבור (כולם 200). הבעיות הן במקומות אחרים: עמודי לגאסי של המותג הישן שעדיין חיים, תוכן מומצא בעמוד Stories, כפתורים שלא מובילים לשום מקום, ועמודים ארוכים מדי במובייל.

---

## 🔴 קריטי – לתקן לפני שרוני עוברת

| # | בעיה | איפה | תיקון |
|---|------|------|-------|
| 1 | **כותרת הטאב "Keta Tov - Train. Connect. Dance."** (המותג הישן) בכל עמוד שאין לו כותרת משלו: quiz, login, signup, enroll, community, blog. גם ה-meta description: "Professional Dog Dance Academy teaching connection through choreography." אין תמונת OG בכלל, אז שיתוף בוואטסאפ/פייסבוק מציג קישור עירום. | `src/app/layout.tsx` | title ברירת מחדל "BONDED – Learn your dog's secret language", description חדש, `openGraph.images` עם תמונה 1600×900 (למשל roni-serafina). |
| 2 | **עמוד /enroll** – עמוד מחירים מהעידן הקודם: "$49 / $65 / $89 per month", "12k+ Active Dancers Globally", "The Essential Bond / Precision & Flow", "NBC SPORTS", "MASTER CLASS". **מגיעים אליו** מכפתור "Enroll Now" בשלושת עמודי הפרקים. | `src/app/enroll/page.tsx` | למחוק ולהפנות ל-`/signup`, או להחליט על תמחור אמיתי. |
| 3 | **עמודי לגאסי יתומים** שגוגל יכול לאנדקס: `/community` ("Academy Hub", "+1.2k Students Dancing", "Monthly Challenges", "Win academy credits"), `/blog/5-tips-for-better-flow` (מתוארך Oct 2024, "Kinetic Duet"), `/courses/kinetic-basics` ("Buy Course", "Level 1: Fundamentals"). | 3 תיקיות ב-`src/app` | למחוק. אם רוצים לשמור לעתיד – `robots: noindex` + redirect ל-`/`. |
| 4 | **עמוד Stories כולו מומצא**: Bella & Emma, Max & Oliver, Luna & Sarah, "Thousands of stronger relationships", ביקורות של Michael & Bruno ו-Jessica & Daisy, תמונות סטוק (איש מבוגר עם כלב). זה בתפריט הראשי. **9 כפתורים מתים**: Start Your Story, 6 פילטרים, Watch Story ×3, Start with BONDED Foundations, Build Your Bond. | `/stories` | עד שיש סיפורים אמיתיים: להוריד מהתפריט, או להחליף בעמוד קצר עם 2 הציטוטים האמיתיים (Shari Divone) וטופס "Share your story". |
| 5 | **פוטר**: "Contact Us", "FAQ", "Privacy Policy", "Terms of Service" ואייקוני Instagram/YouTube הם טקסט, לא קישורים. הסלוגן "Empowering dog and handler through the art of flow, rhythm, and deep connection." הוא מהמותג הישן. "The Method" בפוטר לעומת "Bonded Journey" בתפריט. | `Footer.tsx` | קישורים אמיתיים (mailto / אינסטגרם / יוטיוב), FAQ → `/#faq`, סלוגן חדש, למחוק Privacy/Terms עד שיש עמודים. |
| 6 | **אין contact בשום מקום באתר**. מי שרוצה לשאול שאלה לפני רכישה – אין לו לאן. | כללי | mailto בפוטר + שורת "Questions? hello@bonded.dog" ב-FAQ. |
| 7 | **ציטוט בבית**: "Marcus & Toby – Move Together Alumni" (שם קורס ישן). לוודא שהציטוט אמיתי. | `page.tsx` | "Bonded: Foundations" או להסיר. |
| 8 | **עמודי הפרקים** ("Coming Soon"): הטקסט "This chapter page is being designed — for now, explore the full BONDED Method or get in touch to enroll" + כפתור "Enroll Now" → `/enroll` הישן. זה היעד של כל כפתורי "Start with Foundations" באתר. | `ChapterPlaceholder.tsx` | כפתור → `/signup`, טקסט: "Sign up to be the first to know when Foundations opens." |
| 9 | **אין robots.txt ו-sitemap.xml** (404). | `src/app` | `robots.ts` + `sitemap.ts` של Next. |

---

## 🟠 מובייל – layout ואורך

| # | בעיה | המלצה |
|---|------|-------|
| 10 | **עמוד הבית 12,500px** במובייל (~15 מסכים). האשמים: "See Your Journey" עם 26 שורות (~3,000px), סקשן המתודה עם 5 עיגולים אנכיים וחיצים (~900px), שני ציטוטים בטקסט ענק. | See Your Journey → אקורדיון לפי פרק (פתוח רק Foundations) או 3 טאבים. מתודה → grid 2×3 או שורה אחת עם גלילה אופנית. ציטוטים → text-base. |
| 11 | **Journey 13,300px**. בכל פרק: badge, כותרת, פסקה, שתי רשימות, outcome, כפתור, ואז תמונה 500px בתחתית שלא מחוברת לטקסט. | במובייל: תמונה למעלה ביחס 16:9, "Perfect for" מקופל, min-height של התמונה 260px. |
| 12 | **כפתורים שנשברים ל-2–3 שורות**: "Start with Bonded: Foundations" (About, 3 שורות), "Start with Foundations" (Chapter One). | קיצור: "Start Foundations". |
| 13 | **"As seen on"** – חמש מילים בטקסט (AGT, DOG SHOW, NBC, K9 STYLE, PETS PLUS). נראה חלש, ו-"DOG SHOW"/"K9 STYLE"/"PETS PLUS" לא אומרים כלום. | שורה אחת: "As seen on America's Got Talent" עם לוגו AGT, או להוריד. |
| 14 | **FAQ** – 3 שאלות בלבד. במובייל זה המקום שבו מתלבטים. | להוסיף: What does it cost? / Is there a refund? / What age can my dog start? / Do I need equipment? / Is it in English? |
| 15 | **תפריט מובייל**: "Build Your Bond" מופיע פעמיים (בבר ובתוך התפריט). אין "Log in". | להחליף את הכפתור בתפריט ב-"Member Login". |
| 16 | **Signup**: "Join the dance / Create your account to start training." – שפה ישנה. ומה קורה אחרי ההרשמה? אין תשלום ואין קורס פתוח. | "Join BONDED" + משפט ציפיות: "You'll get access as soon as Foundations opens." |
| 17 | תמונה אחת ללא alt (רקע ה-CTA הסופי בבית). | alt="" מפורש. |

---

## 🟡 טקסטים

- **אורך**: בית 566 מילים, Journey 628, About 444. About טוב. Journey כבד במובייל בגלל שלוש הרשימות הכפולות, לא בגלל הפסקאות.
- **חזרות**: "extraordinary" מופיע ב-Journey hero, About CTA, Stories. "Your dog is already speaking" מופיע 3 פעמים (CTA בבית, ב-Journey, ב-About). לגוון: ב-Journey "Ready when you are.", ב-About להשאיר (הכי אישי).
- **"BONDED" באותיות גדולות מול "Bonded:"** בשמות הקורסים. באותו עמוד יש "BONDED Method", "Bonded: Foundations", "the BONDED community". להחליט על צורה אחת (המלצה: BONDED למותג, Bonded: Foundations לקורסים, בלי "BONDED Method").
- **Meet Roni** בבית: "+1M Social" – לוודא מספר.

---

## ✅ מה עובד טוב במובייל

- Hero בבית ו-About: כותרות בגודל נכון, תמונות פורטרט מתאימות.
- הקוויז: מסך פתיחה, progress bar, כרטיסי תשובה – נקי ונוח לאגודל.
- כרטיסי הפרקים בבית עם ה-badge.
- אין גלילה אופקית באף עמוד. אין לינק שבור.

---

## סדר עדיפויות מוצע

1. #1, #2, #3, #8 – מותג ישן ועמודי לגאסי (חצי יום).
2. #4, #5, #6 – Stories, פוטר, contact (חצי יום).
3. #10, #11, #12 – קיצור עמודים במובייל (יום).
4. #9, #14, #16 – SEO, FAQ, signup (חצי יום).
