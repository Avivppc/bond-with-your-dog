# הערות רוני לאתר – סיכום מסודר לפי עמודים

מקור: Google Doc, טאב "Webpages - notes" (טקסט + כל 19 צילומי המסך נקראו ב-24.9.2026).
הצלבה: כל הערה מופתה לסקשן בקוד. האתר החי (bonded.dog) תואם לקוד בריפו.
תמונות: כל 27 התמונות בתיקיית "צילומים לאתר" נסקרו (קטלוג בסעיף 7).

---

## סטטוס ביצוע (24.9.2026, branch `claude/webpages-fixes-review-08528b`)

**בוצע בקוד**
- כללי: שמות Bonded: Foundations / Moves / Let's Dance בכל האתר; routes `/chapter/moves` ו-`/chapter/lets-dance` (עם redirect מהישנים); Rhythm במקום River; 16 תמונות הורדו ל-`public/images/photos/`.
- בית: כפתור "Watch Rhythm & Roni" מקשר ליוטיוב; Hero = תמונה 1; כרטיסים = 2/11/19 עם השמות החדשים; סדר המתודה Communication → Trust → Connection → Movement → Joy; **באג החיצים הכפולים תוקן**; רשימת 26 השיעורים (11 עם סקיצה קיימת, 15 עם מספר בינתיים); טקסט קהילה = WhatsApp + Q&A רבעוני; "Meet Roni" = תמונה 17.
- Journey: Hero = 15; "One journey. Three chapters..."; שלושת האייקונים (pets / directions_run / music_note) עם השמות החדשים; badge "Chapter One · Foundations" וכו'; טקסט מלא לשלושת הפרקים + תמונות 2/6/19 + כפתורים חדשים; "Bond Through It All" + שלושת המשפטים (טיוטה); משפט "Begin with Foundations..." ב-CTA (טיוטה); כל הכפתורים מקושרים.
- About: כל הטקסט החדש סקשן אחר סקשן; Intro "Hi, I'm Roni"; Rhythm; THE PERFORMANCE / REAL LIFE עם תמונות AGT (IMG_7069) ו-REAL LIFE (IMG_8598), הכרטיס של AGT מקשר לוידאו; תמונות 21/17/10/12/3.
- Quiz: 6 השאלות החדשות (כולל שאלת המוכנות במקום זמן); מנוע חוקים מדורג ב-`scoring.ts` עם 11 unit tests (vitest); שמות ותוצאות חדשות; רשימות "You'll learn"; "10–15 minutes of training a day is all it takes" במסך הפתיחה; API + מיגרציה `20260924000000_quiz_leads_tier_rename.sql` (**צריך להריץ ב-Supabase**).
- אימות: `tsc` נקי, `eslint` נקי (רק אזהרות `<img>` שהיו קודם), `next build` עובר, נבדק ויזואלית בדפדפן.

**סגרנו בעצמנו (24.9, החלטת אביב) – רוני רק מאשרת/מתקנת על האתר החי**
1. תיאורי כרטיסי Moves ו-Let's Dance בבית – נגזרו מתיאורי הפרקים שלה: "Expand your dog's movement vocabulary with expressive, contact and jumping tricks." / "Bring your tricks, your own movement and the music together into a dance."
2. ארבעת הניסוחים שהיא סימנה כטיוטה – הוכנסו כמו שהיא כתבה אותם.
3. "Our Philosophy" ב-About – נשאר.
4. חפיפה Q3-A / Q5-A – Q3-A שונה ל-"We're still working on the basics." (מה הכלב יודע), Q5-A נשאר (כמה עצמאי).
5. שיבוץ התמונות – לפי סעיף 7.
6. ה-CTA הסופי ב-About – נשאר כמו שהוא. עמדתנו: לגיטימי.
7. קובץ REAL LIFE השני – לא נדרש, יש סלוט אחד ו-IMG_8598 יושב בו.
8. קהילה – הקישור ל-WhatsApp יופיע רק בתוך אזור החברים. הכפתור בבית מוביל ל-`/signup` ("Become a Member").

**באמת צריך את רוני**
- ✅ תמונת רוני+סרפינה – אביב שלח, שובצה מעל שלבי המתודה (`roni-serafina.jpg`, 1600px).
- סבב אישור אחד על האתר החי: כרטיסים, ניסוחים, תמונות, שאלות הקוויז.

**נשאר פתוח – אביב**
0. PR #1 פתוח: https://github.com/Avivppc/bond-with-your-dog/pull/1 – מיזוג ל-main מפעיל deploy ל-bonded.dog (preview URLs חסומים ב-SSO, אז רוני רואה רק production).
9. 15 סקיצות חדשות לשיעורים בלי סקיצה (1.4) – ומי מייצר.
10. עמוד Stories (`/stories`, "Stories" בניווט): כרגע כולו placeholder. ההחלטה: טופס `/stories/share` + Supabase Storage + אישור admin – פיצ'ר חדש, טרם נבנה (3).
11. עמוד הקוויז הוא client component בלי metadata, ולכן הכותרת בטאב היא "Keta Tov - Train. Connect. Dance." (הבעיה הייתה קיימת גם קודם).
12. ✅ מיגרציה `20260924000000_quiz_leads_tier_rename.sql` הורצה ב-Supabase (פרויקט "bondi", שוחזר מהשהיה ב-24.9).

---

מקרא:
- ✅ ברור – יש טקסט/החלטה סופית, אפשר לבצע.
- ✏️ טיוטה – רוני כתבה "לא סגורה" / "אולי" / "הצעות". צריך אישור ניסוח.
- ❓ פתוח – חסר תוכן או החלטה.
- 💡 המלצה שלי.

---

## 0. כללי (חוצה עמודים)

| # | נושא | סטטוס | פירוט |
|---|------|-------|-------|
| 0.1 | תמונות חדשות | ✅ | תיקיית Drive "צילומים לאתר" – 27 תמונות מקצועיות (`The BordeRonis_web (1..27).jpg`). קטלוג + שיבוץ מוצע בסעיף 7. |
| 0.2 | שמות הקורסים החדשים | ✅ | בכל האתר: **Bonded: Foundations · Bonded: Moves · Bonded: Let's Dance**. כרגע בקוד: Foundations / Movement / Masterpiece (בית, journey, quiz, routes `/chapter/movement` ו-`/chapter/masterpiece`, מפתחות tier בקוויז). |
| 0.3 | שם הכלב ב-AGT | ✅ | **Rhythm**, לא River. באתר כרגע: "Watch Roni & River" (בית) ו-"When River and I appeared on America's Got Talent" (About). רוני מזכירה גם את **סרפינה** (תמונה לסקשן המתודה). |
| 0.4 | וידאו AGT Finals | ✅ | `https://youtu.be/hNUWEknZ2xs` – כפתור ה-Hero בבית + עמוד About. |

---

## 1. עמוד הבית (`/` – `src/app/page.tsx`)

### 1.1 Hero (צילום מסך 1 – חץ מצביע על התמונה)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | כפתור "Watch Roni & River" → **"Rhythm & Roni"**, מקשר ל-`https://youtu.be/hNUWEknZ2xs`. (כרגע ללא קישור.) | ✅ |
| b | תמונת ה-Hero → **"tell a secret pose"**. 💡 תמונה (1): רוני על המדרגות רוכנת אל אוזן הכלב. פורטרט, מתאים ליחס 4:5 של ה-Hero. חלופה: (21). | ✅ |

### 1.2 Start Your Journey (צילום מסך 2)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | תת-כותרת "Start your path to a deeper connection." → **"Every journey starts with one little step"** / **"...with the first step"** – רוני לא החליטה. | ✏️ |
| b | כרטיס Foundations: → **"Build trust, communication, confidence and all the skills for all that will follow."** ("לא סגורה על המשפטים פה בכלל"). | ✏️ |
| c | כרטיס Moves – תיאור: **????** | ❓ |
| d | כרטיס Let's Dance – תיאור: **????** | ❓ |
| e | שמות הכרטיסים לפי 0.2. | ✅ |
| f | 💡 תמונות הכרטיסים (16:9): Foundations → (2) קשר עין על המדרגות · Moves → (11) שני כלבים על שתיים · Let's Dance → (19) פוזת ריקוד. | 💡 |

### 1.3 סקשן המתודה "A new way to grow together" (צילום מסך 3)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | סדר → **Communication → Trust → Connection → Movement → Joy** (כרגע Trust → Communication → Movement → Connection → Joy). | ✅ |
| b | החיצים "מבולגן": בצילום המסך רואים **שני חיצים בכל שלב** (→ ומתחתיו ↓). באג: גם החץ של הדסקטופ וגם החץ של המובייל מוצגים יחד (`hidden md:block` + `md:hidden rotate-90`). לתקן. | ✅ באג |
| c | תמונה של רוני וסרפינה ברגע חיבה – רוני תשלח אופציות. 💡 בינתיים מועמדות מהתיקייה: (16) חיבוק/נשיקה במסדרון, (21) חיבוק מאחור. | ✏️ |

### 1.4 See Your Journey (צילום מסך 4)
רשימות חדשות (כרגע 5 בכל פרק; החדש 10 / 7 / 9):

- **01 Bonded: Foundations** – The Bond · Feeding Drive · Living Together · Crate Training · Loose Leash Walk · Platform Work · Prey Drive · World Of Tricks · Sequences · Bonding Time
- **02 Bonded: Moves** – Discovering Moves · Floor Tricks · Balance & Body Control · Directional Motion · Expressive Tricks · Contact Tricks · Jumping Tricks
- **03 Bonded: Let's Dance** – From Tricks To Dance · Preparing The Moves · The Human Dancer · When Two Dancers Meet · Moving Together · Distance & Independence · Delayed Reward · Advanced Sequences · Preparing Your First Dance

**החלטה (אביב):** סקיצות חדשות לכל שיעור. יש 15 ב-`public/sketches/` (מקור ב-`design/sketches-original/`), צריך 26. חלק ניתן למחזר: leash-walking → Loose Leash Walk, basic-tricks → World Of Tricks, jump-basics/hoop-jumps → Jumping Tricks, moving-together → Moving Together, dancing-skills → From Tricks To Dance. ❓ מי מצייר את ה-21 החסרות (אותו מאייר / AI באותו סגנון).

### 1.5 Community (צילום מסך 5)
רוני: "צריך לראות שלא מבטיחים פה משהו שאני לא אצליח לעמוד בו, וגם להבין איך בדיוק זה הולך לעבוד כקהילה."

**החלטה (אביב, בתגובה במסמך + כאן):** קהילת WhatsApp, עדכונים שם, ו-**Q&A פעם ברבעון**. הטקסט הנוכחי מבטיח "challenges, live Q&As" – לשכתב כך שיתאר רק את זה. 💡 טיוטה:
> Join the BONDED community on WhatsApp. Share your progress, ask questions, and join Roni's quarterly live Q&A.

---

## 2. Bonded Journey (`/courses` – `src/app/courses/page.tsx`)

### 2.1 Hero (צילום מסך 6)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | להחליף תמונה ("צולם במיוחד לאתר"). 💡 (15) הכלב קופץ עליה במסדרון, פורטרט, מתאים ל-600px גובה. חלופות: (2), (16). | ✅ |

### 2.2 Method Overview "One method. Three stages." (צילום מסך 7)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | כותרת → **"One journey. Three chapters. A lifetime of possibilities."** | ✅ |
| b | תת-כותרת → **"Each chapter builds on the one before it—starting with communication, expanding into movement, and bringing everything together through dance."** | ✅ |
| c | שלושת האייקונים: שמות חדשים, ואולי אייקונים "כלביים". רוני: "אנסה גם לחשוב על משהו". 💡 Material Symbols: `pets` (Foundations), `sprint` או `directions_run` (Moves), `music_note` (Let's Dance). | ✏️ |

### 2.3 סקשני הפרקים – badge (צילום מסך 8)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | badge: **Chapter One · Foundations**, **Chapter Two · Moves**, **Chapter Three · Let's Dance**. | ✅ |

### 2.4 טקסט מלא חדש לשלושת הפרקים ✅

**Chapter One · Foundations**
- Headline: **Build the foundation everything else grows from.**
- Description: Foundations is where you and your dog learn how to learn together. You'll build trust, communication and engagement, then turn them into everyday skills, confident movement and your first experiences of dancing as one.
- You'll Learn: A clear shared language · Engagement & Focus · Calm, practical everyday skills · Understanding prey drive and how to play with your dog · Confident movement and body awareness · Tricks, the idea of sequences and mini dances
- Perfect For: New dogs and new partnerships · Dogs of every age and experience · Anyone ready to build a stronger bond
- Outcome: **A dog who understands you, chooses you and is ready to learn with you.**
- Button: **Start with Foundations**
- 💡 תמונה: (2) או (3).

**Chapter Two · Moves**
- Headline: **Discover how much your dog is capable of.**
- Description: Moves expands the language you built in Foundations. You'll teach your dog a varied movement vocabulary, from expressive and contact tricks to backwards, sideways and jumping skills while building confidence, coordination and understanding.
- You'll Learn: How to break down complex tricks · Ground, balance and expressive tricks · Backwards and sideways movement · Contact tricks performed together · Confident and carefully prepared jumps
- Perfect For: Teams who completed Bonded: Foundations · Dogs ready to expand their movement vocabulary · Anyone preparing for the journey into dance
- Outcome: **A confident dog with a growing vocabulary of movements you can perform together.**
- Button: **Learn the Moves**
- 💡 תמונה: (6) אף-לאף על המעקה, או (11).

**Chapter Three · Let's Dance**
- Headline: **Turn your movements into a dance.**
- Description: Let's Dance brings the pieces together. You'll prepare your dog's tricks for performance, develop your own movement and learn how to combine both with flow, expression and music—without losing your dog's confidence or connection.
- You'll Learn: How to prepare tricks for dancing · Human movement and musical expression · How to move without distracting your dog · Distance, independence and delayed reward · Sequences that flow with the music
- Perfect For: Teams who completed Bonded: Moves · Handlers ready to become part of the movement · Anyone ready to build their first dance or take their dog dancing to the next level
- Outcome: **A dance where you, your dog and the music move as one.**
- Button: **Build Your Dance**
- 💡 תמונה: (19) או (18).

הערה: ל-"Perfect For" יש אייקון לכל שורה – לבחור מחדש לטקסטים החדשים.

### 2.5 "Built on connection" – העקרונות (צילום מסך 9)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | "3. Progress That Lasts" → **"3. Bond Through It All"**. | ✅ |
| b | משפטים ("הצעות למשפטים"): | ✏️ |

1. **Trust Comes First** – A dog who feels safe is ready to connect, explore and learn.
2. **Learn Together** – Training becomes a conversation where both ends of the leash take part.
3. **Bond Through It All** – From everyday moments to new challenges, every experience becomes an opportunity to strengthen your bond.

### 2.6 CTA סופי "Every great relationship starts with one step" (צילום מסך 10 – אומת)
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | להוסיף לפני הכפתור, "אולי": **"Begin with Foundations and progress through the journey at your own pace."** 💡 כן – זה מוריד את החשש "אני לא בטוח מאיפה להתחיל". | ✏️ |

---

## 3. Stories (`/stories`)

רוני: "כל העמוד הזה צריך להבין איך נעשה אותו, מה אני צריכה לבקש מאנשים ואיך – כדי שיהיו גם סרטונים וגם תמונות סטטיות וגם הסיפורים."

**החלטה (אביב):** טופס בתוך האתר (`/stories/share`), העלאה ל-Supabase Storage.
💡 שדות מוצעים: שם, שם הכלב, מדינה, פרק שסיימו, ציטוט קצר (עד 120 תווים), הסיפור (עד 600), תמונה (חובה), וידאו (אופציונלי, קישור או קובץ), אישור פרסום. אישור ידני ב-admin לפני שמופיע.
כל התוכן בעמוד כרגע placeholder (Bella & Emma וכו').

---

## 4. About (`/about` – `src/app/about/page.tsx`)

### 4.1 תמונות
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | להחליף תמונות ("יש תמונות וואו"). 💡 שיבוץ בסעיף 7. | ✅ |
| b | SPOTLIGHT: `IMG_7069.JPG` (`1mGTkqDfk6JXWT3_5lIsG6WDbFyn5clwZ`) – צילום NBC מגמר AGT, Roni Sagi & Rhythm. ✔ נגיש. | ✅ |
| c | REAL LIFE: `IMG_8598.JPG` (`14_dPo1MGSFNrXQ_r-UIe6sh7m8F6cYJK`, 7.3MB). ✔ נגיש. | ✅ |
| d | REAL LIFE (קובץ שני): `1lPr6KjJqSqVJD583LG9PDXW7EAxQdWl2` – **לא נגיש**. לבקש מרוני לשתף. | ❓ |
| e | AGT FINALS (וידאו): `https://www.youtube.com/watch?v=hNUWEknZ2xs`. | ✅ |

### 4.2 טקסט חדש – לפי צילומי המסך 11–17, סקשן אחר סקשן ✅

**Hero** (צילום 11)
> It was never just about teaching dogs to dance.
> It was about discovering what becomes possible when a dog and human truly understand each other.

**Intro (חדש – "Followed by introduction")**
> **Hi, I'm Roni.**
> I'm a professional dog trainer, dog dance performer and educator from Israel.

**"I fell in love..."** (צילום 12, מחליף "I didn't fall in love with dog dancing")
> **I fell in love with what dog dancing made possible.**
> Over the years, I've performed on some of the world's biggest stages, taught thousands of dog lovers and built a global community around the relationship between dogs and their people.
> But everything I teach comes back to the same idea: the most beautiful movements begin long before the music starts.

**"Our Philosophy"** (צילום 13) – **אין טקסט חדש**. רוני צירפה את הצילום בלי הערה. 💡 להשאיר כמו שהוא, ולוודא איתה.

**"I wanted everyone..."** (צילום 14)
> **I wanted everyone to experience this feeling.**
> Over the years, people kept asking me, "How can I create this kind of relationship with my dog?"
> My dogs taught me that tricks alone are not enough. Real connection comes from giving your dog a reason to choose you, building trust and putting the relationship before the results.
> That is why I created Bonded.

**AGT** (צילום 15)
> **Millions watched us dance. What made it possible happened long before the stage.**
> When Rhythm and I appeared on America's Got Talent, people saw the tricks, choreography and music. But behind every movement was the trust and communication we had built long before the performance began.
>
> THE PERFORMANCE – Tricks, choreography and spectacle.
> REAL LIFE – Trust, communication and all the quiet moments in between.
>
> A performance lasts only a few minutes. The relationship behind it is built every day.

(הכרטיסים "The Spotlight" / "The Soul" → THE PERFORMANCE / REAL LIFE.)

**"I want this journey to feel different"** (צילום 16)
> You'll never hear me talk about perfect dogs. Because that's not what I'm here to help you create. I'm here to help you build a relationship filled with trust, curiosity, confidence, and joy.
> **Wherever you are starting, Bonded gives you and your dog a clear path forward.**

### 4.3 השאלה של רוני – על ה-CTA הסופי (צילום 17: "Let's build something extraordinary together / Start with BONDED Foundations")
> "מצד אחד זה יפה ברמות, מצד שני – האם זה לא מרגיש מכירתי מדי? ואם כן, האם זה לגיטימי?"

💡 תשובה מוצעת לרוני: זה לגיטימי ומקובל. עמוד About הוא העמוד השני הכי נצפה באתרי קורסים, ומי שקרא עד הסוף כבר "התחמם". CTA אחד בסוף, בטון של הזמנה ולא של מכירה, הוא best practice. מה שכן כדאי: (1) להוריד את המילה "extraordinary" שחוזרת בכל האתר ולהחליף בטון האישי שלה, למשל "Let's build this together." (2) לשמור כפתור אחד בלבד. (3) ה-Hero החדש ("It was never just about...") כבר עושה את העבודה הרגשית, אז הסיום יכול להיות קצר.

---

## 5. Journey Quiz (`/quiz` – `src/lib/quiz/data.ts`, `scoring.ts`)

רוני: "קודם כל הרעיון גאוני ואני עפה עליו."

### 5.1 שמות
| # | מה לשנות | סטטוס |
|---|----------|-------|
| a | תוצאות → Bonded: Foundations / Bonded: Moves / Bonded: Let's Dance (headline, CTA, קישורי `/chapter/...`). | ✅ |

### 5.2 השאלות – נוכחי מול חדש

**Q1 – Relationship today** – נשאר. ✅
- כלל: "We're just getting started" **חוסם** המלצה ישירה על Let's Dance. לא מכריח Foundations לבד, אבל שוקל יותר מתשובה שאפתנית.

**Q2 – Biggest goal** – לשכתב B ו-C. ✅
- Build trust and better communication.
- Learn new tricks and explore movement together.
- Bring our skills together through music and dance.
- כלל: משפיע אבל **לא עוקף ניסיון**.

**Q3 – Training experience** ("השאלה הכי חשובה") – תשובות חדשות. ✅
- A: My dog still needs food and clear hand guidance.
- B: My dog can perform the basic tricks
- C: My dog can perform sequences from known movements but I need to get better in my dancing.
- כלל: A ⇒ Foundations. B ⇒ מאפשר Moves. C ⇒ מאפשר Let's Dance, בכפוף ל-Q5 החדשה.

**Q4 – What excites you the most?** – תשובות חדשות. ✅
- Building a stronger everyday connection.
- Discovering new tricks and movements.
- Turning our skills into a dance.

**Q5 – Time available** – **להסיר מהניקוד**, להחליף בשאלת מוכנות: ✅
> **How independent are your dog's trained movements?**
- A: My dog still needs food and clear guidance from my hands. ⇒ Foundations או Moves
- B: My dog can perform basic tricks without any help but is still learning more advanced movements. ⇒ Moves
- C: My dog confidently performs many tricks without food or a toy in my hand, even in different environments. ⇒ מאפשר Let's Dance
- בנוסף: להוסיף בתחילת/סוף הקוויז ש-**10–15 דקות אימון ביום מספיקות**. 💡 במסך הפתיחה, מתחת ל-"Six quick questions...".

💡 חפיפה: Q3-A החדשה ≈ Q5-A החדשה. להציע לרוני: Q3 על "מה הכלב יודע" (A: "We're still working on the basics"), Q5 על "כמה עצמאי".

**Q6 – Finish the sentence** – להסיר C ("People see the incredible bond"). ✅
- My dog understands me better.
- We've discovered new things we love doing together.
- We can express our connection through movement and music.
- שאלת העדפה קלה.

### 5.3 לוגיקת התוצאה ✅ (שכתוב `scoring.ts`)
"Do not let the six answers contribute equally." מודל **מדורג**:

- **Foundations** כאשר: ניסיון מועט/אין · עדיין בונים engagement ותקשורת · הכלב צריך הכוונה משמעותית.
- **Moves** כאשר: הכלב יודע את הבסיס · רוצים להרחיב טריקים · הכלב לא עצמאי מספיק כשהמטפל רוקד · התשובות "באמצע".
- **Let's Dance רק כאשר** (כולם): מגוון טריקים · רצפים קצרים · עבודה בלי פיתיון גלוי · בטוח כשהמטפל זז · רוצה לשלב מוזיקה · רוצה לשפר את עצמו/ה.

💡 מימוש: Q3 + Q5 קובעים "תקרה" (max tier). Q1-A מוריד תקרה ל-Moves. Q2/Q4/Q6 בוחרים בתוך התקרה. אין ניקוד מצטבר.

### 5.4 מסך תוצאות – "You'll learn" (צילומים 18–19: רק הצ'יפים משתנים, לא התמונות) ✅
- **Foundations**: Trust & communication · Engagement & focus · Everyday skills · Playing with Toy · Basic tricks and Sequences
- **Moves**: Jumping Tricks · Expressive tricks · Directional Movement · Contact tricks · Floor work · Balance & Body awareness
- **Let's Dance**: Musicality · Human movement · Creating Flow · Distance and independence · Delayed rewarding · Choreography

---

## 6. פריטים פתוחים

**ממתין לרוני**
1. תיאורי כרטיסי Moves ו-Let's Dance בבית (1.2 c,d).
2. ניסוח סופי: תת-כותרת (1.2a), תיאור Foundations (1.2b), משפטי העקרונות (2.5b), משפט CTA (2.6a).
3. תמונת רוני+סרפינה (1.3c) – או לאשר (16)/(21).
4. אייקונים ל-Method Overview (2.2c).
5. קובץ REAL LIFE השני (4.1d).
6. "Our Philosophy" ב-About – נשאר? (4.2).
7. חפיפה Q3-A / Q5-A (5.2).
8. אישור שיבוץ התמונות (סעיף 7).

**החלטות שהתקבלו (אביב, 24.9)**
- קהילה: WhatsApp + Q&A רבעוני → שכתוב טקסט (1.5).
- Stories: טופס בתוך האתר (3).
- See Your Journey: סקיצות חדשות לכל 26 השיעורים (1.4). ❓ מי מייצר.
- העברת תמונות: דרך Chrome (בוצע).

**לביצוע טכני**
- routes/מפתחות: movement→moves, masterpiece→lets-dance (0.2).
- באג חיצים כפולים בסקשן המתודה (1.3b).
- מנוע קוויז מדורג (5.3).
- הורדת 27 התמונות מ-Drive ל-`public/images/` (אופטימיזציה ל-web, גודל).

---

## 7. קטלוג תמונות – "צילומים לאתר" (27 קבצים)

| # | תיאור | כיוון | שימוש מוצע |
|---|-------|-------|------------|
| 1 | רוני על המדרגות, רוכנת אל אוזן הכלב השחור | פורטרט | **Home Hero ("tell a secret")** |
| 2 | רוני יושבת על המדרגות, כלב שחור עם כף על הברך, קשר עין | פורטרט | כרטיס Foundations (בית) / Chapter One |
| 3 | רוני על המדרגות, כלב שוכב לידה, יד עליו, רגוע | לרוחב | About "feel different" / Chapter One |
| 4 | כלב שחור עומד על שתיים מול רוני במסדרון | לרוחב | Moves |
| 5 | רוני על המדרגות, כלב על שתיים בתחתית המעקה | לרוחב | רזרבה |
| 6 | כלב על שתיים על המעקה, אף-לאף עם רוני | לרוחב | **Chapter Two · Moves** |
| 7 | קלוז-אפ בורדר קולי מרל עיניים כחולות, כפות על מוט | לרוחב | רזרבה (כלב בלבד) |
| 8 | רוני נשענת על קיר, כלב על שתיים מגיע אליה | לרוחב | Moves |
| 9 | רוני הולכת במסדרון, כלב מכל צד | לרוחב | About CTA סופי / "Moving Together" |
| 10 | רוני כורעת במסדרון, שני כלבים מביטים בה | לרוחב | Community |
| 11 | רוני כורעת, שני כלבים על שתיים | לרוחב | **כרטיס Moves (בית)** |
| 12 | רוני כורעת, נותנת חטיף לשני כלבים | לרוחב | About "I wanted everyone" |
| 13 | כלב לבד יושב במסדרון, מביט אחורה | פורטרט | רזרבה |
| 14 | מלמעלה: כלב בין רגליה של רוני, לשון בחוץ | לרוחב | About Hero (חלופה) |
| 15 | רוני עומדת, כלב קופץ עליה במסדרון | פורטרט | **Journey Hero** |
| 16 | רוני כורעת מחבקת/מנשקת כלב שחור במסדרון | פורטרט | **סקשן המתודה (חיבה)** / Journey Hero חלופה |
| 17 | רוני על המדרגות עם 5 כלבים | לרוחב | **About "I fell in love"** / Community |
| 18 | רוני בפוזת ריקוד, ידיים לצדדים, כלב לצידה | לרוחב | Let's Dance |
| 19 | רוני בפוזת ריקוד יד למעלה, כלב נשען על רגלה | לרוחב | **כרטיס Let's Dance (בית) / Chapter Three** |
| 20 | מלמעלה: מרל בין רגליה מביט למעלה | לרוחב | Quiz (חלופה) |
| 21 | רוני מאחור מחבקת כלב מעל הכתף | פורטרט | Home Hero חלופה / סקשן המתודה |
| 22 | רוני הולכת עם כלב ליד בניין זכוכית | לרוחב | "Loose Leash Walk" |
| 23 | רוני הולכת בעיר, כלב צמוד | לרוחב | Foundations |
| 24 | רוני משחקת משיכה עם כלב, רקע עירוני | לרוחב | "Prey Drive" / Play |
| 25 | רוני רוכנת, כלב רץ אליה, צעצוע מאחור | לרוחב | "Feeding Drive" / Play |
| 26 | רוני הולכת עם כלב ברחבה עירונית | לרוחב | רזרבה |
| 27 | 5 בורדר קולי יושבים בשורה במסדרון | לרוחב | Community bg / Footer |

הערה: התמונות מקצועיות, סגנון אחיד (עירוני, מסדרון עם אורות, מדרגות). כמעט כולן לרוחב – לסקשנים עם תמונה גבוהה (Hero, Chapter) יש רק (1), (2), (13), (15), (16), (21).
