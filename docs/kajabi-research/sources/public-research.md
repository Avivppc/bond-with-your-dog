# Kajabi — public-sources research (as of 2026-09-29)

> Compiled by a research sub-agent from public web sources only (no login). Legend: **[V]** verified on a Kajabi-owned page (kajabi.com, help.kajabi.com, developers.kajabi.com); **[3P]** third-party (often competitor-authored, treat as biased); **UNCERTAIN** = conflicting/unconfirmed. English on purpose — reference material with source URLs.

## 0. Five facts that matter most for an Israeli / Hebrew-first competitor

1. **No Hebrew, no RTL.** Site auto-translation supports 16 languages (Danish, German, English, Spanish, Finnish, French, Hungarian, Italian, Japanese, Dutch, Norwegian, Polish, Portuguese, Russian, Swedish, Turkish) — no Hebrew/Arabic, no RTL mentioned [V] https://help.kajabi.com/en/articles/17174356-change-a-site-language.md. Communities support only EN/NL/FR/DE/IT/ES/TR [V] https://help.kajabi.com/en/articles/17174407-create-a-community-in-another-language.md. Admin UI was English-only until Spanish in Aug 2026 [V] https://www.kajabi.com/updates/cycles/laguna/. One language per site; official advice is to duplicate products/pages per language [V][3P] https://supplygem.com/kajabi-languages/.
   *Admin crawl note:* the site-details form **does** expose a `text_direction` select (LTR / RTL) even though Hebrew is not a locale option.
2. **Kajabi Payments is not available in Israel.** Supported: US, Canada, Australia, UAE, UK, ~20 Eurozone countries [V] https://help.kajabi.com/en/articles/17174587-kajabi-payments-overview.md. Stripe does not onboard Israeli businesses (UAE is the only Middle-East country) [V] https://stripe.com/global. In practice an Israeli creator is limited to **PayPal**, or an external checkout wired in via webhooks/Zapier.
3. **One currency per offer.** Checkout cannot switch currency; workaround = duplicate offers per currency [V] https://help.kajabi.com/en/articles/17174715-make-offers-available-in-multiple-currencies.md.
4. **No Israeli invoicing/gateway integrations** found (Green Invoice, iCount, Cardcom, Grow/Meshulam, Tranzila). UNCERTAIN (absence of evidence).
5. **Jan-2026 price hike (+20–25%), no grandfathering**; Basic contact cap cut 10,000 → 2,500 [3P] https://www.ruzuku.com/learn/articles/kajabi-2025-price-increase.

## 1. Pricing & plans (since 13 Jan 2026) — https://kajabi.com/pricing [V]; cross-check https://learningrevolution.net/kajabi-pricing/ [3P]

| | Basic | Growth | Pro |
|---|---|---|---|
| Monthly | $179 | $249 | $499 |
| Annual (per mo) | $143 | $199 | $399 |
| Products | 5 | 50 | Unlimited |
| Contacts | 2,500 | 25,000 | 100,000 |
| Admin users | 2 | 11 | 26 |
| Communities / Websites | 1 / 1 | 1 / 1 | 3 / 3 |
| Marketing emails, LPs, funnels, access groups | Unlimited | Unlimited | Unlimited |
| AI credits / mo | 0 | 500 | 1,000 |
| Kajabi Payments card fee (US) | 2.9% + $0.30 | 2.8% + $0.30 | 2.7% + $0.30 |
| Surcharge for own Stripe (not PayPal/KP) | 2% | 1% | 0.5% |
| API | $25/mo add-on | ✓ | ✓ |
| Branded mobile app | $199/mo add-on | ✓ (conflict — help center says Pro only) | ✓ |
| Advanced automations | ✗ | ✓ | ✓ |
| Remove Kajabi branding | ? | ? (UNCERTAIN) | ✓ |
| Custom code editor | ✗ | ✗ | ✓ |

- Affiliates: pricing page says all plans; several reviews say Growth+ (UNCERTAIN). Webhooks: pricing page says all, help says Growth/Pro [V] https://help.kajabi.com/en/articles/17175699-connect-a-third-party-payment-gateway-to-kajabi.md. Cohort courses: Growth/Pro [V] https://help.kajabi.com/en/articles/17174383-kajabi-products-overview.md.
- Extra contacts: $125/mo per +25k. AI credits: 1/min transcription, 10/min translation, 100/min dubbing; top-up 500 = $15; no rollover [V] https://help.kajabi.com/en/articles/17174340-ai-credits.md.
- **Hidden Kajabi Payments fees** [V] https://help.kajabi.com/en/articles/17174624-kajabi-payments-fees-united-states.md: +1.5% international cards; **+0.7% on every recurring charge**; +1% currency conversion; +0.4% invoices; Afterpay 6% + $0.30; Klarna 5.99% + $0.30; ACH 0.8% (cap $5); instant payouts 1.5% (min $0.50); disputes $15; fees not returned on refunds.
- Kickstarter plan ($89) retired for new sales. 14-day trial; "30-day money-back guarantee" but reviews cite strict no-refunds [3P] https://www.group.app/blog/kajabi-review/. Promo since May 2026: 50% off 6 months [3P].
- Add-ons: Expert Agents $49/mo early pricing [V] https://www.kajabi.com/updates/cycles/stonebridge/; Backstage beta, seats ~$49/seat/mo (UNCERTAIN) [V] https://help.kajabi.com/en/articles/17174378-backstage-offer-pricing.md; Amplify free to join, 80/20 fee split [V] https://help.kajabi.com/en/articles/17174327-amplify-overview.md; Partner Program 30% recurring lifetime [3P] https://schoolmaker.com/blog/kajabi-affiliate-program.md; Kajabi Capital (revenue-based financing) [V].

## 2. Features by area

**Products** [V] https://help.kajabi.com/en/articles/17174383-kajabi-products-overview.md
- Courses (evergreen or cohort): modules → submodules → lessons; video/audio/PDF; quizzes (graded/ungraded) & assessments; certificates; lesson locking (complete previous / pass quiz); drip relative (≤731 days) or by calendar date (Jan 2026); comments; announcements; search; auto-advance; video chapters (≤20); searchable captions; optional video downloads; live sessions (Kajabi Live / YouTube Live). No xAPI [V] https://help.kajabi.com/en/articles/17174467-can-i-create-a-course-that-is-xapi-compliant.md; no SCORM, no gradebook [3P].
- Coaching: 1:1 / group, scheduling, built-in video with breakout rooms, auto-attached recordings, shared/private notes, post-session upsell, client dashboard.
- Backstage (beta, May 2026): private per-client workspace — messaging, resources, tasks/assignments, auto-transcribed meetings, booking; mobile July 2026 [V] cycles westwind/stonebridge.
- Communities: channels (feed/chat), DMs, announcements, challenges, meetups, recorded Live Rooms, points/badges/titles/leaderboard, read-only channels, weekly digest; don't count as products; 1 per site on Basic/Growth; weak customization [3P].
- Podcasts (public or private/paid), Downloads (all count as 1 product), Newsletters (free + paid tiers, Sept 2025) [3P] https://www.learningrevolution.net/kajabi-rebrand-updates/. Physical goods only via Shopify Buy Button/Zapier.

**Sales & checkout**
- Offer = price for 1..n products; multiple pricing options (one-time, payment plan, subscription, free trial, setup fee). Cart (multi-offer checkout, June 2025) https://kajabi.com/updates/kajabi-cart; quantity checkout/limits; multiple order bumps, mixed-pricing & conditional bumps; upsells/downsells, reusable upsell pages, discounted upsells; coupons (single-use, offer or cart-wide, affiliate coupons).
- Subscriptions: prorated tier switching (Aug 2026), self-pause & auto-resume, win-back discounts, cancellation reasons, early payoff of payment plans, payment reminders, gift offers, abandoned-checkout emails, test checkout (Jul 2026), manual charges, multi-line invoices, ACH invoices (US), PDF receipts, auto sales tax (KP only), 1099s.
- Gateways: Kajabi Payments (Stripe Connect underneath; Apple Pay, Google Pay, Klarna, Afterpay, Link), own Stripe, PayPal [V] https://help.kajabi.com/en/articles/17175714-payment-options-available-with-kajabi.md. Card vault lock-in with KP [3P].
- Affiliates: per-offer commissions, affiliate coupons, links, portal, payouts, "Affiliate Challenges" (Jan 2026).

**Website** — editors Premier (legacy) / **Encore** (current: block widths, mobile vs desktop layouts, animations, custom code) / **Nova** (2026, AI-first composition from a prompt or screenshot) [V] https://help.kajabi.com/en/articles/17175039-page-editors-nova-premier-and-encore.md. Liquid themes. LPs, funnel pages, blog, library, custom checkout. Custom domain, global brand settings, AI/search bot blocking, A/B tests for pages & emails. Marketplace templates $100–900 [3P].

**Marketing** — broadcasts & sequences, visual editor, A/B, pause/resume, no-send dates, send-time personalization (Aug 2026), preference center. **Strict DMARC mandatory from 9 Feb 2026**; sending rewritten to `kjbm.<domain>` [V] https://help.kajabi.com/en/articles/12696261-custom-email-domain-requirements. Automations: legacy When/Then/Only-if (conditions Growth+) + new visual canvas with multi-trigger, branching, date/time waits (Jan 2026) [V] https://help.kajabi.com/en/articles/17175200-automations-overview.md. Funnels (ex-"Pipelines") incl. webinar funnels. Forms (webhook URL), Events, opt-in popups. Comment-to-DM for IG/FB (Growth+), Universal Inbox (IG, Messenger, Backstage, Agents). **No SMS / WhatsApp** [V] https://help.kajabi.com/en/articles/17175209-manage-messages-in-universal-inbox.md. Amplify requires Stripe-supported country → excludes Israel.

**CRM** — tags, segments, custom fields, notes, lifecycle stages (Mar 2026), video-watch tagging, custom admin roles/permissions (Aug 2026).

**Analytics** — page, email, newsletter, coupon/upsell/offer stats, KP reports, course progress. Aggregate-only, no source/cohort segmentation [3P].

**Mobile** [V] https://help.kajabi.com/en/articles/17175439-kajabi-mobile-app-vs-branded-mobile-app.md — free Kajabi app (courses, coaching, private podcasts, Backstage, community; magic link / 6-digit code login). Branded app (own store listing, in-app offers, push, segmented screens; needs Apple/Google dev accounts + DUNS; Apple 1–2 wks, Google 6–8 wks testing) [3P] https://techcrunch.com/2024/05/02/online-course-platform-kajabi-allows-creators-to-build-their-own-branded-apps. Separate Cofounder app.

**AI**
- Cofounder (Jan 2026): memory; drafts pages/emails/courses/offers; edits themes; publishes only after confirmation; cannot delete/import/touch payments [V] https://help.kajabi.com/en/articles/17174322-cofounder-faqs-and-limitations.md.
- Expert Agents (May 2026): Teaching Assistant (in-course answers with timestamped clips) + Sales Agent (on LPs, lead capture since July) auto-trained on creator content [V] https://www.kajabi.com/blog/what-is-kajabi-expert-agents.
- **Kajabi MCP** `https://mcp.kajabi.com/mcp` (OAuth; Claude/ChatGPT/Cursor; ~100 tools; drafts only for automations; can't blast email; all plans) [V] https://help.kajabi.com/en/articles/17175695-connect-kajabi-to-claude-or-chatgpt.md.
- Media Library AI: transcription, translation (30+ → 70+ languages, likely Wistia-backed; Hebrew UNCERTAIN), dubbing, SRT/VTT.
- Creator Studio being sunset (clips moved to Media Library 9 Sep 2026) [V] https://help.kajabi.com/en/articles/17175261-prepare-for-the-creator-studio-sunset.md.

**Public API / webhooks** — OpenAPI https://developers.kajabi.com/openapi.yaml [V]: "Kajabi API V1" 1.1.0 at `https://api.kajabi.com/v1`, JSON:API (`application/vnd.api+json`), `page[number]/page[size]`, filters, `include`, sparse fieldsets. OAuth2 client-credentials (also refresh / password grant); per-user API keys with scopes. Resources: blog_posts, contacts, contact_notes, contact_tags, courses, custom_fields, customers, forms, form_submissions, hooks, kajabi_payments_payouts, landing_pages, offers, orders, order_items, podcasts, products, purchases, sites, transactions, website_pages. **Mostly read-only** — writes: contacts & notes CRUD, tag/offer add-remove on contacts, grant/revoke offers, form submit, webhook create/delete, purchase reactivate/deactivate, cancel subscription. **Cannot create courses/offers/products.** **Webhook events: only 6** — `purchase`, `payment_succeeded`, `order_created`, `form_submission`, `tag_added`, `tag_removed`. Per-offer activation/deactivation URLs. Rate limits unpublished. Zapier, Postman. ~13 native integrations [3P]. **No member SSO** [V] https://help.kajabi.com/en/articles/12695379-does-the-system-use-single-sign-on-sso; admin 2FA.

## 3. Changelog 2025–2026 (≈6-week "cycles") — https://www.kajabi.com/updates/cycles/{seaside,timberline,westwind,stonebridge,laguna}/

- **2025:** KP in EU (Apr) + UAE; Cart (Jun); PayPal in cart; Klarna; quantity checkout; email A/B; Adobe Express; community weekly digest; inline editing; KP in AU/CA/UK; Sept rebrand + Newsletters, Downloads, Invoicing; visual automations; flexible checkout.
- **Seaside (Jan 5–Feb 13 2026):** Cofounder; automation branching + date/time waits; pricing-option automations; Comment-to-DM; cancellation reasons + win-back automations; reusable upsell pages; affiliate challenges; global brand settings; calendar-date drip; community badges/audio; multi-line invoices; transaction/payout APIs.
- **Timberline (Mar 2–Apr 10):** Unified Media Library; video chapters; 358 community improvements; add-to-calendar; contact lifecycle; email preference center; payment reminders; ACH invoices; instant payouts; checkout text overrides; upsell report; abandoned-checkout upgrades.
- **Westwind (Apr 27–Jun 5):** Backstage, Expert Agents, Kajabi MCP, Amplify, Cofounder mobile + MCP; Nova announced; multiple order bumps; duplicate anything; coupon upgrades; manual purchases.
- **Stonebridge (Jun 22–Jul 17):** Test checkout; offer stats; discounted upsells; Orders (beta); mixed-pricing bumps; payment-plan early payoff; win-back discounts; self-pause/timed pauses; Backstage mobile; Expert Agents $49 + lead capture; MCP media library.
- **Laguna (early Aug):** prorated tier switching; conditional bumps; Link by Stripe; MCP automation building; email pause & send-time optimization; **live video rebuilt on proprietary stack**; notification center; **Spanish admin**; custom user permissions.
- Also: pricing overhaul (Jan), Strict DMARC (Feb 9), Creator Studio sunset (Sept). No post-Laguna cycle found (UNCERTAIN).

## 4. Reviews — strengths & weaknesses

Ratings: G2 ~4.1/5 (93); Capterra 4.4/5 (228; value 3.7, ease 4.1, support 4.1, features 4.2) [3P] https://www.capterra.com.au/reviews/154682/kajabi; Trustpilot 3.4/5 (2,344; bimodal 75% 5★ / 9% 1★) [3P] https://www.trustpilot.com/review/kajabi.com.

**Praised:** all-in-one (replaces 4–5 tools); deep checkout monetization (bumps, upsells, plans, subs, affiliates, invoices); best-in-category coaching & live; Wistia hosting included; branded app; training; fits established creators > $3–5K/mo [3P] https://schoolmaker.com/blog/kajabi-migration.

**Complaints:** (1) price/value — no grandfathering, hidden fees (0.7% recurring, 1.5% intl, 0.5–2% Stripe surcharge), realistic floor is Growth $249; (2) support decline (AI-first, slow escalation, refund disputes); (3) email deliverability after `kjbm.` subdomain move (UNCERTAIN extent); (4) community weaker than Skool/Circle; (5) thin learning/analytics (no SCORM/xAPI/gradebook); (6) dated UI, 3 generations of editors; (7) payments lock-in, launch-time checkout failures; (8) no SMS/WhatsApp, few integrations, weak localization.

**Competitive positioning [3P]:** Teachable/Thinkific cheaper ($39–49) for course-only; Skool/Circle/Mighty better for community-first (migration to Skool after 2026 hike); Podia/Systeme.io far cheaper for beginners ($27–39). https://dupple.com/blog/online-course-platforms-comparison

## 5. Technical facts

- Stack [3P, job posts]: Ruby on Rails, React, Postgres, Sidekiq, Redis, AWS https://ats.rippling.com/kajabi/jobs/9931c3e3-5f48-4a01-ab67-fdafe7f81d76; Communities team React/TypeScript + GraphQL; Memcached; Liquid; some Go/Python.
- Video: "hosted by Wistia at no additional cost" [V] https://help.kajabi.com/en/articles/17174907-does-kajabi-host-my-video-content.md; 4 GB per upload; live video rebuilt on proprietary stack (Aug 2026).
- Company: founded 2010, Irvine/Newport Beach CA; CEO Ahad Khan; creators earned $10B cumulative (Aug 2025) [3P] https://www.businesswire.com/news/home/20250806424975/en/; ARR reportedly > $100M.
