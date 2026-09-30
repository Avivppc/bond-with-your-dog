# Kajabi UI reference (captured 2026-09-30, read-only)

Visual reference for the Bonded platform redesign. Layout and patterns only — no Kajabi branding.

## Admin (app.kajabi.com)

Tokens: Inter 14px · page bg `#f8f8f8` · text `#1a1a19` · muted `#6c6a69` · primary button `#343332`
(white text, pill `9999px`, 8px 16px, weight 500) · cards white, radius ~12px, hairline borders ·
status pill green (Published) / neutral (Draft).

- **Shell:** fixed left sidebar (white, ~230px): site switcher pill at the top, grouped nav with icons
  (Dashboard · Products ▸ All Products / Courses … · Sales ▾ · Contacts ▾ · Analytics), active item =
  light-gray rounded fill; Settings at the bottom. Top bar: breadcrumbs (Courses / Course / Lesson),
  search + account on the right.
- **Products list:** H1 + dark "New product" pill; white card with search box and table
  (thumbnail + title, Members, Created, Type badge, ⋯ menu); "Showing 1–4 of 4".
- **Course page:** header row = thumbnail (16:9, ~84px) + title + tabs
  (Outline · Customize · Offers (n) · Customers (n) · Certificates · Settings); right: ⋯, preview eye,
  dark "Add content". Outline card: search "Find module or lesson…", "8 Modules" + "Expand all",
  module rows (folder icon, title, "+ Add content", status pill with ▾, collapse chevron) with lesson
  rows beneath (type icon, title, status pill).
- **Lesson editor:** breadcrumbs; H1 lesson title; top right "Preview" (outline pill) + "Save" (dark).
  Two columns: main card "Lesson details" (Title, Select module, Media, body, Downloads, Automations);
  right rail cards: Status (Draft / Published radios), Lesson thumbnail, Comments (Visible/Hidden/Locked).

## Student portal (Bonded theme on mykajabi)

Tokens: sidebar teal `#006366` · page bg `#e6f3fb` · text `#253137` · accent orange `#ff9500`
(pill buttons) · headings "Plus Jakarta Sans" 800 · body "Be Vietnam Pro" · cards white radius 12px.

- **Library ("My Courses"):** grid of cards — cover image, title, progress bar.
- **Course home:** left teal sidebar (brand avatar + course name, "← All courses", "Course journey"
  list grouped by module with status icons); main: teal hero card "Member dashboard · Welcome back,
  {name}", tagline, progress bar + %, orange "Continue training →"; tabs Home · Course map · Updates;
  lesson search; "Your training" section.
- **Lesson:** same sidebar with "Now learning", course title, progress bar + %, current lesson as a
  white pill (teal bold text); main: lesson search, video card, bar under video
  (‹ prev · duration · n resources · ★ · orange "Complete lesson" · next ›), then body text card.
