# 03 — מודל הנתונים

## חלק א': מודל הנתונים של Kajabi (כפי שהוסק)

```
Account ─┬─< Site (subdomain/custom domain, locale, text_direction, currency, drip_hour, branding)
         └─< AdminUser (roles/permissions)

Site ─┬─< Product (type: course | coaching | community | podcast | newsletter | download | access_group)
      │     └─< Category (module; parent_category_id → submodule; is_paywall; drip_days | publish_at; locked_by_post_id)
      │           └─< Post (lesson; media→Video/Audio; body; downloads[]; comments_mode; status/publishing)
      │                 └─< Comment
      ├─< Offer (price/payment_type/currency/subscription_plan; access start/days; limits; expiry; checkout settings)
      │     ├─<> Product           (many-to-many: offer_products)
      │     ├─< OfferUpsell        (chain: upsell → downsell)
      │     ├─< OrderBump
      │     └─< OfferField         (custom checkout fields)
      ├─< Purchase / Order / Transaction / Subscription / Invoice / Coupon / AffiliateLink
      ├─< Contact (email, name, phone, subscribed, opt_in_at/opt_out_at/ip, lifecycle, net_revenue, is_member)
      │     ├─<> Tag
      │     ├─< ContactNote
      │     └─< CustomFieldValue ──> Field (type: text|phone|email|textarea|checkbox|select|radio|country|mobile)
      ├─< Segment (saved filter)
      ├─< Form ──< FormSubmission
      ├─< EmailCampaign (broadcast | sequence ──< SequenceEmail)
      ├─< Workflow (automation; status; version; total_enrolled)
      │     ├─ Trigger  (Automation::Triggers::* + resource ref, polymorphic)
      │     ├─ Conditions
      │     └─< Step (Automation::Actions::* | Wait | Branch)
      ├─< Pipeline (funnel) ──< PipelineStep (LP / email / offer)
      ├─< Theme (themeable: Site | LandingPage | Product | Checkout | Email) ──< ThemeFile (liquid) ; settings JSON
      ├─< LandingPage / WebsitePage / BlogPost / Navbar
      ├─< MediaAsset (video|audio|image|file; tags)
      └─< CertificateTemplate (per product) ──< CertificateIssued

Community (separate service, UUID) ─< AccessGroup ─< Channel(feed|forum|gallery) ─< ChannelPost ─< Reply/Reaction
                                   ├─< Challenge ─< Entry      ├─< Meetup ─< RSVP
                                   └─< PointsLedger / Title     └─< LiveRoom ─< Recording
```

### דפוסים שכדאי לאמץ
1. **Product ו-Offer מופרדים, בקשר רבים-לרבים.** מוצר אחד נמכר בכמה הצעות: מלאה, "limited", מתנה או חבילה. הצעה אחת מעניקה כמה מוצרים (Bundle). **גישה נגזרת מ-Offer ולא מ-Product.**
2. **Paywall כקטגוריה.** Paywall ב-Kajabi הוא לא דגל על שיעור. הוא *מפריד* בסדר השיעורים, ו-Offer מסוג "limited" נותן גישה רק עד אליו.
3. **סידור עם רווחים.** ה-position הוא מספר שלם עם רווחים של 2^30 (`-1073741824`, `0`, `1073741824`). כך מכניסים פריט באמצע בלי לעדכן את כל השורות. (חלופה: fractional indexing עם מחרוזות.)
4. **`publishing{status, meta, cohort_meta}`.** סטטוס פרסום אחיד לכל ישות, כולל הרחבה ל-cohort.
5. **טריגר ופעולה polymorphic.** לכל טריגר יש `type` ו-`resource_type/resource_id`. לכן אפשר לשאול "אילו אוטומציות משתמשות בשיעור הזה?" (`get_workflows_for_resource`).
6. **ביקורת על הסכמה לדיוור:** `opt_in_at`, `opt_out_at` ו-`opt_out_ip` נשמרים על איש הקשר.

---

## חלק ב': סכמה מוצעת ל-Bond-with-your-dog (Supabase/Postgres)

**עקרונות:**
- **שומרים על מה שקיים ומרחיבים אותו.** `courses`, `lessons`, `enrollments` ו-`lesson_progress` כבר קיימים ועובדים.
- **Tenancy בודד.** יש אקדמיה אחת, ולכן אין צורך ב-`site_id` בשלב זה. אבל כדאי לתכנן את השמות כך שאפשר יהיה להוסיף אותו בעתיד.
- **Supabase הוא מקור האמת היחיד** לתוכן הקורסים. את Sanity משאירים לתוכן שיווקי, או מבטלים. ראו "שני מקורות אמת" ב-[05](05-build-plan.md).

```sql
-- ── תוכן ────────────────────────────────────────────────
create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references courses(id) on delete cascade,
  parent_id uuid references modules(id) on delete cascade,     -- submodule
  title text not null,
  description text,
  position bigint not null,                                     -- gap ordering (2^30 steps)
  is_paywall boolean not null default false,                    -- separator: limited offers stop here
  drip_days int,                                                -- relative to access start
  publish_at timestamptz,                                       -- or absolute date
  status text not null default 'draft' check (status in ('draft','published'))
);
alter table lessons add column module_id uuid references modules(id) on delete set null;
alter table lessons add column comments_mode text not null default 'visible'
  check (comments_mode in ('visible','hidden','locked'));
alter table lessons add column locked_until_lesson_id uuid references lessons(id);  -- completion gating

create table lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references lesson_comments(id) on delete cascade,
  body text not null,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── מסחר ────────────────────────────────────────────────
create table offers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- public checkout URL /checkout/:slug
  title text not null,
  internal_title text,
  description text,
  payment_type text not null check (payment_type in ('free','one_time','subscription','payment_plan')),
  price_agorot int,                             -- ILS in minor units (אגורות)
  currency text not null default 'ILS',
  installments int,                             -- payment_plan: מספר תשלומים
  interval text check (interval in ('month','year')),
  trial_days int,
  access_level text not null default 'full' check (access_level in ('full','limited')),  -- limited = up to paywall
  days_of_access int,                           -- null = lifetime
  access_starts_at timestamptz,
  quantity_limit int,
  expires_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published')),
  thank_you_url text,
  created_at timestamptz not null default now()
);
create table offer_courses (                    -- many-to-many (bundle)
  offer_id uuid references offers(id) on delete cascade,
  course_id text references courses(id) on delete cascade,
  primary key (offer_id, course_id)
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text not null,
  offer_id uuid not null references offers(id),
  status text not null check (status in ('pending','paid','failed','refunded','canceled')),
  amount_agorot int not null,
  currency text not null,
  provider text not null,                       -- 'grow' | 'cardcom' | 'paypal' | 'manual' | 'free'
  provider_ref text,                            -- transaction id at the gateway
  invoice_url text,                             -- חשבונית/קבלה (Green Invoice / iCount)
  coupon_id uuid,
  created_at timestamptz not null default now()
);
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  offer_id uuid not null references offers(id),
  status text not null check (status in ('trialing','active','past_due','paused','pending_cancel','canceled')),
  current_period_end timestamptz,
  provider_ref text,
  cancel_reason text
);
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  percent_off int, amount_off_agorot int,
  offer_id uuid references offers(id),          -- null = all offers
  max_redemptions int, redeemed int not null default 0,
  expires_at timestamptz
);

-- enrollments מקבלות מקור ותוקף — הגישה נגזרת מהזמנה/מענק
alter table enrollments add column source text not null default 'free'
  check (source in ('free','order','grant','subscription'));
alter table enrollments add column order_id uuid references orders(id);
alter table enrollments add column access_level text not null default 'full';
alter table enrollments add column expires_at timestamptz;

-- ── CRM ─────────────────────────────────────────────────
create table contacts (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  name text, phone text,
  user_id uuid references auth.users(id),       -- set when the contact becomes a member
  subscribed boolean not null default false,
  opt_in_at timestamptz, opt_out_at timestamptz, opt_out_ip inet,
  source text,                                  -- quiz | form | checkout | import
  created_at timestamptz not null default now()
);
create table tags (id uuid primary key default gen_random_uuid(), name text unique not null);
create table contact_tags (contact_id uuid references contacts(id) on delete cascade,
                           tag_id uuid references tags(id) on delete cascade,
                           primary key (contact_id, tag_id));
-- quiz_leads → הופכים ל-contacts + tag 'quiz:<tier>'

-- ── אוטומציות (מינימלי) ─────────────────────────────────
create table automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','published','paused')),
  trigger_type text not null,        -- 'offer.purchased' | 'form.submitted' | 'lesson.completed' | 'tag.added' | 'contact.inactive_30d' ...
  trigger_resource_id text,          -- offer id / lesson id / tag id (nullable = any)
  steps jsonb not null               -- [{type:'tag.add',tag_id}, {type:'wait',days:2}, {type:'email.send',template}]
);
create table automation_runs (       -- idempotency + audit
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references automations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  event_id text not null,            -- unique per triggering event
  step_index int not null default 0,
  resume_at timestamptz,             -- for wait steps (cron picks up)
  status text not null default 'running',
  unique (automation_id, event_id)
);
```

### RLS: עקרונות לסכמה החדשה
- `offers` ו-`offer_courses`: קריאה ציבורית רק כש-`status='published'`. כתיבה דרך service role בלבד.
- `orders` ו-`subscriptions`: `select` רק על השורות של המשתמש. **אין `insert` מהלקוח.** יוצרים שורות רק דרך webhook של ספק התשלום.
- `enrollments`: **מבטלים את `enrollments_insert_own`.** הרשמה חינמית עוברת דרך Server Action שבודק שקיימת הצעה עם `payment_type='free'`.
- `contacts`, `tags` ו-`automations`: service role בלבד. הם מוצגים ב-Admin דרך `requireAdmin()`.
- גישה לשיעור (לנגן ה-Mux ולתוכן): נגזרת מ-`enrollments`, `access_level`, `expires_at`, ה-Paywall והדריפ. **לרכז את כל הבדיקות בפונקציה אחת** (`can_access_lesson(user, lesson)`), שמשמשת את ה-RLS, את API ה-playback ואת ה-UI.
