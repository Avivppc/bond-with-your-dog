# Admin crawl — raw notes (2026-09-29)

> Raw field notes from a read-only walkthrough of the Kajabi admin + member site (account: Bonded Academy, site 2148882335). Field names are taken verbatim from form inputs / API payloads. English on purpose — these are reference data.

# Raw notes — architecture + automations
## Architecture signals
- Rails monolith (csrf authenticity_token meta, turbo-prefetch meta), Hotwire Turbo + Stimulus controllers (turbo-fetch, turbo-modal, hotwired--modal, admin--data-table--{search,sort,filter,scroll,bulk-actions,saved-view-picker,saved-view-creator})
- React islands via Stimulus `react-mounter`: data-react-mounter-component-value=<Name>, props-value JSON, admin-copy-value=[i18n bundles "admin.react.*"] lazy-loaded
- Vite assets on kajabi-app-assets.kajabi-cdn.com
- React components seen: CartSettings, CommerceInvoices, DashboardView(affiliates), WorkflowAutomations, PipelinesApp, AnalyticsDashboard (analytics+reports), PeoplesApp (contacts, imports), ContactInsights, MarketingHome, UniversalInbox, BrandedMobileAppLandingPageV2, OfferCreationWizard{productId,source}, DashboardOfferBanner, SideNavOffer, AcceptOfferModal
- JSON API /api/v1/admin/* and /api/admin/* — requires auth header (plain fetch w/ cookie -> 401)
  - /api/v1/admin/universal_inbox_topnav_status, /api/admin/users/gsa_offer, /api/admin/sites/:id/segments, /api/admin/contacts?site_id, /api/admin/newsletter, /api/v1/admin/workflows?page, /workflows/automation_trigger_options, /automation_action_options, /api/admin/pipelines
- Pagination shape: {current_page,total_pages,total_count,per_page:25}
- 3rd party in admin: Intercom, MS Clarity, GA4/GTM (server-side proxied /gtm), Meta/LinkedIn/Bing pixels, Braze(appboy), ProfitWell (churn/billing analytics), RudderStack-like rs-cdn integrations
- Plan limit hit: "reached your current plan's limit of 5 products" (trial?). Trial: email = broadcasts only.
- Site id per site; account can have multiple sites (/admin/sites "Manage sites")
- Release cadence named "cycles": Seaside, Timberline(Apr 10 2026: Unified Media Library, Contact Lifecycle Tracking), Westwind(Jun 5: Expert Agents, MCP, Amplify), Stonebridge(Jul 17: Test Checkout, win-back discounts, member self-pause, unified Orders), Laguna(Aug 3 preview: checkout upsells, AI)

## Admin nav (38 pages)
Products: All, Courses, Coaching, Community, Podcasts, Newsletters, Downloads
Sales: Payments, Pricing(offers), Cart, Invoices, Coupons, Affiliates
Website: Design, Pages, Landing Pages, Navigation, Blog
Marketing: Overview, Email Campaigns(broadcast/sequence, A/B), Funnels(pipelines), Automations(workflows), Events, Forms
Contacts: All, Insights, Assessments
Analytics: Overview, Reports
Agents(expert_agents AI add-on), Media Library, Amplify, Partner Program, Backstage, Branded App, Settings, Universal inbox, Cofounder (AI assistant chat in admin)

## Automations — trigger catalog (Automation::Triggers::*)
events: AssessmentCompleted; CertificateSent; EmailBroadcastOpened/Clicked; EmailSequenceCompleted/EmailSent/EmailOpened/EmailClicked; EventRegistered; FormSubmitted; LeadCapturedViaAgent; InactiveFor7/30/60/90Days; QuizCompleted/Failed/Passed
contact: ContactTagAdded/Removed
external(premium some): Instagram/Facebook comment received (specific post premium, any post free)
courses: OfferPurchased, OfferPurchasedAsGift, OfferGranted, GiftOfferRedeemed, OfferSubscriptionSuccessful/Failed/Canceled/CancelationInitiated/CancelationCompleted, OfferPaymentPlanComplete; AppOfferPurchasedOrGranted (IAP); PostCompleted (lesson)
coaching: CoachingSessionCompleted, AllSessionsCompleted, SessionsRemaining, AdditionalSessionsPurchased, InvoiceUpcomingDueDate, InvoiceOverdue
## Actions (Automation::Actions::*)
membership: OfferGrant, OfferRevoke, OfferCancelPaymentAndAccess; CouponSend; CertificateSend
communication: OfferSend, EmailSequenceSubscribe/Unsubscribe, EventRegister/Deregister, EmailSend
contact: ContactTagAdd/Remove
instagram/facebook: DirectMessage, Reply
coaching: SessionsCancel, SessionsRemove, InvoiceReminder, SendProgramSurvey, SendSessionSurvey
communities: ChannelMemberAdd/Remove, PostToChannel, SendDm
system (premium): Wait, Branch
## Workflow record
{id,name,status(published),version,published_at,paused_at,pause_source,total_enrolled,is_publishable,errors[],trigger_type,full_trigger_description,full_action_description,contains_restricted_features}
Existing: 2 workflows "Form submitted -> add tag" auto-created by presale landing page template.

---

# Raw notes — Course product model
- Products list: type column "Evergreen course", "Access group" (Training Together = community access group), members count; actions Preview/Edit/Details/Manage Comments/Duplicate(to another site!)/Delete. Plan limit counts products; all downloads count as one product.
- Course admin tabs: Outline | Customize | Offers(2) | Customers(0) | Certificates | Settings | More | Preview | "Course generator"(AI) | Add content. Banner: "Courses now with live video sessions! Enable in Settings"
- Hierarchy: Product -> Category (module) -> sub-Category (parentCategory, 2 levels) -> Post (lesson). Posts reference media (video/…)
- API is JSON:API style: {data:[{id,type,attributes,relationships,links}]}. endpoints: /api/admin/products/:id/categories, /api/admin/products/:id/posts, /api/admin/categories/:id, /api/admin/posts/:id, /api/admin/posts/:id/status (polling), /api/admin/videos/:id, /api/admin/bulk_video_uploads/:categoryId, /api/admin/ui_states (persist UI expand/collapse)
- Category attrs: title, description, dripDays, publishAt, posterImage (+MediaLibraryAssetId), position (int, gaps of 2^30 → midpoint insert ordering), publishing{status draft/published, meta, cohort_meta}, courseType evergreen (vs cohort), isPaywall (special category "Paywall Wrapper"; members of "limited access product" see only content above paywall), isHidden, wasScheduled, siteDripSettings{dripHour 10, tz} (site-level drip time), lockedByPost (lesson-completion gating), canEdit/canDestroy/canClone permissions in payload
- Post attrs: title, visibleCommentsCount (comments per lesson), position, status(ready = media processing state), publishing, isLiveSessionScheduled (live video sessions inside course), urls{preview, viewComments, edit, automations}, useWorkflowsForResource (lesson-completed automation per lesson)
- Preview urls use signed Rails MessageVerifier preview_token (user_id, expires_at) on <sub>.mykajabi.com
- Media: kajabi-storefronts-production.kajabi-cdn.com file-uploads/sites/:site/images/...
- Foundations course: 8 top modules (The Bond, Feeding Drive, Living Together, Platform Work, Prey Drive, World Of Tricks[draft], Sequences[draft], Bonding Through Motion[draft]) + nested submodules (Crate Training, Loose Leash Walking, Dynamic Tricks, Positions...) + Paywall after "The 3 D's"

---

# Lesson editor (/admin/posts/:id/edit) — server-rendered form + React bits
- Fields: title, module select (move lesson), Media (Wistia video; "use current frame as thumbnail", formats), Downloads (files attached per lesson, /api/admin/posts/:id/downloads), body (TinyMCE "tiny-react"), status draft/published (publishingOption), thumbnail 1280x720, comments mode Visible|Hidden|Locked, automations on lesson (get_workflows_for_resource resource_type=Post), delete
- Video: Wistia (fast.wistia.com E-v1.js, HLS m3u8, videoFoam). video_upload_retries endpoint. bulk video upload per module creates lessons.
- Media library config endpoint; Media library: videos/audio/images/files, tags, saved views, filters by ext, AI image generation, Adobe Express/Adobe Stock integration
- Design system: "Sage" (sage-btn, legacy Rails ERB components) + "Pine DS" PDS web components (pds-button, Stencil `hydrated`)

# Offer (= price/SKU; decoupled from Product; many products per offer, many offers per product)
Offers index: KPIs purchases/net revenue 30d & all-time; tabs Offers | Upsells; columns Products count, Price, Qty sold, Net revenue, Status. Export. Duplicate.
Offer tabs: Details | Pricing | Purchase flow | Settings | Stats(dashboard) | Edit checkout (theme settings) | Preview (/offers/:token/checkout on site domain) | webhook_log_entries
## Details: title(100), internal_title, description, image 1280x720, products[] (add/remove), access: effective_start_date, days_of_access (expiring access), status draft/published, Get Link
## Pricing: payment_type (Free / one-time / subscription / payment plan — only Free until payments connected), price, subscription_plan_id, currency, is_pay_what_you_want, checkout_quantity_enabled (buy multiple seats), price_text_override, quantity_limit_enabled+quantity_limit, sold_out_preference(sold-out page|redirect LP)+sold_out_body, qty_limit_display (show remaining count threshold → scarcity), expires_at + expired_preference(page|LP), purchase_webhook_url. Rule: subscriptions/payment plans support only ONE order bump.
## Purchase flow: thank_you_preference (Member's Product Library | Existing Landing Page | Custom Thank You Page + body), skip_account_creation_enabled, welcome_email_enabled, purchase_confirmation_email (subject/content with Liquid {{member.name}} {{offer}} {{site}} {{site_login_url}}), Upsell funnel: offer_upsell{upsell_offer_id,title,subtitle,description,wistia_video_id,autoplay,purchase_button_text,cancel_text} chain upsell→downsell (one-click post-purchase; payment method must match)
## Settings: checkout_page_color, checkout button text override, collect name/phone/address/tax id (business number), default country / geolocation, order bump(s) (multiple order bumps), service agreement (none/default/custom text), collect_password, giftable ("Send as a gift", one-time only; disables bumps/upsells), third-party email provider push (Mailchimp/Aweber/Drip), purchase notification recipients, cart abandonment emails (Customers only|All visitors; delay 1/6/10/24h), affiliate commission (percentage|fixed; payout mode), custom checkout fields (offer_field[field_id])
## Integrations per offer: Activation URL / Deactivation URL webhooks (params name,email,external_user_id) = inbound webhook to grant/revoke; Outbound Purchase Webhook URL; webhook log
Existing: 2 free offers for Foundations: full + "limited access" (paywall product)
Checkout themes: /admin/themes/:id/settings/edit — checkout is a themed page (legacy vs new checkout editor; "Pay What You Want"; returning members no login)

---

# Course product settings (/admin/products/:id/edit)
title, description, thumbnail, Paywall (add paywall to course → "limited access" product/offer = freemium preview), Live Rooms (live video session per course: title, description, schedule, auto-upload recordings as lessons, publish+notify), Community (enable community for course → Access Group link), comment settings (enable / lock all), popup checkout offer, site. More actions: Manage Comments, Announcements (email/notify members), View Progress (per-member progress), Duplicate (cross-site), Share Course, Preview full/limited access.
Customize (/themes): per-product template ("Bonded Course Experience 1.0.0" third-party uploaded zip; canonical presets; theme upload via storage key/original_zip) — Liquid-based theming, versioned templates (Encore 2.14.8 for pages).
Certificates (/certificate_template/edit): enabled, logo, title, recipient subtitle, student name, subtitle, course name, completion date, serial number, expiration (count+Years/Months/Days), custom field, background image+overlay. Emailed on completion; email template editable.

# Site settings
- Checkout settings: email opt-in (unchecked recommended/pre-checked/disabled), auto-subscribe paid buyers, gift recipient opt-in, card storage opt-in, translation_override_form (override checkout strings!), header/footer tracking code for checkout & upsell pages
- Customer payments: receipts (title, message, first-only for subscriptions, skip zero value, refund receipts, PDF attach, business address, VAT number), PaymentReminderSettings(React), auto_revoke_on_failed_payment, subscription pause (member_can_pause, max duration cycles, pauses per year), enable_subscription_cancellation (self-serve) + disabled message, cancellation flow: retention offer (once per customer), multi-step, personalized message
- Tax: tax_integration (Kajabi Payments auto sales tax; QuickBooks/Xero sync)
- Site details: title, subdomain, support email/phone, locale [Danish, German, English, Spanish, Finnish, French, Hungarian, Italian, Japanese, Dutch, Norwegian, Polish, Portuguese, Russian, Swedish, Turkish] — NO HEBREW; text_direction LTR/RTL exists; default currency; homepage = Store | Library(login) | Newsletter | Landing page | Template home; instructor profile (image,name,title,bio); header page scripts; SEO title/desc/image
- Branding: favicon, logo, heading/body typography, primary/accent colors, palette
- Domain: custom domain
- Marketing settings: CAN-SPAM address, email branding image, from name/email, reply-to, sequence default send hour + TZ
- Drip settings: drip hour + TZ, email notification on drip
- Form fields (custom contact fields): types Text|Phone|Email|Text Area|Checkbox|Select|Radio|Country|Mobile Phone; required
- Third-party integrations: Aweber, Mailchimp, Drip, ConvertKit, ActiveCampaign, Segment, GA, Facebook Pixel (+CAPI access token, consent mode), Zapier, PayPal, third-party payment provider
- Mobile app (Kajabi app): icon, colors, member banner, email swipe copy, push-notification upsell reminders; Branded app = separate paid white-label
- Scheduling (coaching): availability, calendar connection, booking buffer, minimum notice
- Account: subscriptions/billing, security (MFA), manage users (team), notifications, tracking, Cofounder settings, tax documents

---

# Community v2 — SEPARATE SERVICE
- Admin side in Rails is thin: /admin/communities/v2/:id → Dashboard(analytics), Access groups (React AccessGroups; group = product "Training Together" w/ members), Offers, Settings(title, description, cover). "Go to Community" → redirect w/ SSO into member-facing app.
- App: Next.js App Router (__next_f RSC), served on creator domain under /products/communities/v2/<slug>/ via reverse proxy; assets communities-web-assets.kajabi-cdn.com; Module Federation (__federation_shared__); Sentry; Pendo; hls.js for video; UUID ids (vs Rails bigint ids) → own DB/service. Admin inline (in-app admin mode) at /admin/settings/*.
- Member nav: Home (global feed, pinned posts, sort newest), Challenges, Meetups, Leaderboard, Scheduled Posts, Review Feed (moderation queue), per Access Group: Challenges, Meetups, Leaderboard, Channels (e.g. Q&A type=forum), Live. Right rail: offers promo, meetups, challenges. Search ⌘K. Profiles /profile/:uuid. Timezone prompt.
- Admin settings: Details (URL slug, social links FB/IG/LinkedIn/Snapchat/TikTok/X/YouTube/Shop/Website, community guidelines), Email Notifications, Gamification, Customization, Challenges, Meetups, Access Groups, Channels, Announcements
- Channels: name, owner, posts, members, privacy (public/private), type (Feed|Forum|Gallery view modes, default view)
- Gamification points rules (points / max per day?): completed challenge 100; commented on challenge 3; reacted 1; received reaction 1; posted in channel 1 (max 5); reacted to message 1 (max 5); poll response 1; RSVP event 25; earned title. "Titles" (levels/badges). Leaderboards global + per challenge + per access group; rename points alias.
- Customization: feature aliases (rename Challenges/Channels/Meetups/Announcements singular/plural), enable/disable features, Global feed title, Live Room (always open, floating emoji reactions), branding, reactions set
- Email notifications (per type toggles): channel replies, DMs, mentions; challenge end/comment/mention/hype-ups; meetup 1d/1h/start/created/rescheduled/cancelled; live room start/recording; announcements global/channel; Weekly Digest (Thu 9am PT, personalized per access groups)
- Features: posts w/ media, polls, DMs, mentions, hype-ups, challenges (homework/onboarding checklist w/ entries), meetups (events w/ RSVP), live rooms w/ recordings, scheduled posts, moderation review feed

---

# Student side (<sub>.mykajabi.com or custom domain)
- /library "My Courses" (product cards); /settings/account; /logout; homepage configurable
- Product page composed of Liquid theme sections: product_title, product_outline, dashboard_welcome, dashboard_tabs(Home|Course Map|Updates), product_body, community_widget, product_sidebar, product_badges; progress % + "Continue training"
- Lesson page sections: mini_dashboard, product_outline, post_actions, post_completion ("Complete lesson" / "Continue to next lesson"), post_paywall, post_teaching_assistant (AI TA per lesson); resources (downloads count); comments form POST /posts/:id/comments; product search GET /products/:slug/search
- URLs: /products/:slug/categories/:id/posts/:id ; admin preview via ?preview_token= + preview_bar
- Student pages load Pine DS from jsDelivr (@pine-ds/core@4.1.0 — public OSS), vite system.js, RudderStack analytics (cdn.rudderlabs.com), Wistia
- Custom course template "Bonded Course Experience 1.0.0" (3rd-party uploaded)

# Website / Landing page builder
- Landing pages list: status Draft/Published, template version (Encore 2.14.8, changelog themes.kajabi.com), actions: Customize/Edit design, Edit details, page analytics (/stats), A/B test (/landing_pages/ab_tests), Duplicate, Modify code (/admin/themes/:id/edit — Liquid code editor, ace), Export theme, Update template (versioned w/ revert)
- EVERY landing page = its own Theme instance (themeableType LandingPage, codename encore). Website = site theme; product = product theme; checkout = theme; emails isEmailable
- Builder (/admin/themes/:id/settings/edit#/): left panel Sections list (Header, Form&Text, 3 Feature Columns, Hero with Image, FAQ, Social, Add section, Footer, Exit Popup, Two Step Optin) + Settings (global styles), Undo/Redo, Preview, Save, Draft; right = iframe /admin/theme_files/:id/preview?editor=true&inline_editing=true (server-rendered Liquid w/ inline editing). Uploads via Filestack (filepicker.io). ActionCable present. Datadog RUM/logs. Hotkeys.
- settings.json API: {file(index.liquid), theme{settings, settingsSchema{groups,theme_info}, sectionSchemas, fallbackBlockSchema, fallbackSectionSchema, colorPalette, ctaOptions, fields, mediaLibraryImageAssets}, linkPaths}
- Section schemas (landing): section (generic container w/ blocks), carousel, two_step, exit_pop, header, footer, page_embedded_checkout, teaching_assistant
- Block types: text, rich_text, form, feature, image, accordion, social_icons, link_list, countdown, audio, video, multi_video, video_embed, carousel, event, event_video, assessment, offer, pricing, cta, card, course, course_outline, coaching_scheduling_widget, page_embedded_checkout (checkout inside page), blog, code (custom HTML), external_widget, chatbot/teaching_assistant_chat (AI agent block), social_share, hello_bar, menu, dropdown, user, logo, copyright, spacer
- Setting input types: text, textarea, rich_text, image_picker, color (allow_blank, default_global_settings_attribute), checkbox, range(min,max,step), select, radio, pill_tabs, font_select, align, grid, action(CTA link target), info; conditional hide_if{setting:value}
- Global theme settings: typography sizes per heading desktop/mobile, weights, line-heights, colors (heading/body/secondary/placeholder/error), buttons (style,size,radius,width,text color), background image, color palette 16
- Page settings data shape ≈ Shopify: sections{id:{type,settings,blocks{id:{type,settings}},block_order}}, order

---

# Contacts (PeoplesApp React)
- List cols: Name, Email, Email Marketing status (Subscribed/Unsubscribed/…), Lifetime Value, Added date, Last activity; sort; 25/page; Segments (saved filters; /api/admin/sites/:id/segments default+alphabetical); Filters; Manage tags; Add contacts (single + CSV imports); bulk: tag, subscribe to sequence
- Contact record: id, email, name, join_date, phone_number, subscribed, opt_in_at, opt_out_ip/opt_out_at (compliance), hidden_at, last_activity_at, marketing_status(+description), is_member, profile_image(gravatar), net_revenue
- Search backend: OpenSearch (search_type), total_count{count,precision exact|estimate}
- Tags seen: form-auto tags, "Kajabi Mobile App Login Link Access for Hero"
- Contact Insights (ContactInsights React) + Contact Lifecycle Tracking (Timberline cycle)
- Assessments = quizzes/surveys for lead data (separate from lesson quizzes)

# Analytics dashboard (AnalyticsDashboard React) — /api/analytics_dashboard/*  (date range + comparison=previous_period + currency + group_by)
widgets: payments_over_time (gross revenue), payments_by_offer (top offers), payments_by_payment_method, payments_by_pricing_type, top_customers, new_contacts_over_time, opt_ins_over_time, unsubscribed_contacts, contacts_breakdown_by_customer_segment, subscription_status_by_offer (Active/Trialing/Past due/Pending cancellation/Paused), subscription_retention_over_time (cohort PMT1..PMT24 table), canceled_subscriptions_over_time, subscription_churn_rate_over_time, subscriptions_mrr_over_time, subscription_arpu_over_time, payment_plan_status_by_offer, canceled_payment_plans_over_time, payment_plan_purchases_over_time, payment_plans_mrr_over_time, refunds_over_time. "Customize view" (insights_dashboard_preference). Dashboard home: "Customize metrics".
# Reports catalog (≈30): Gross revenue; Refunds; Payments by method; by pricing type; Free offers over time; Payments by country/state; Cart orders; Payment plan payments (+forecast future); Offer purchases over time; Payments by offer; Paid invoices; Top customers; New subscriptions; MRR subs; New contacts; Canceled subs (+reasons); Customer-initiated cancellation feedback; Subscription status by offer; Subscription payment retention; Churn rate; ARPU; New payment plans; Payment plan status; MRR payment plans; Canceled payment plans; Revenue recovered from abandoned checkout emails; Upsell purchases; Net revenue; Subscription forecast tool; Opt-ins (forms/LP); Page views (LP); Sales tax; Product progress (per customer per product); Offers sold; Affiliates.

---

# System (transactional) email templates — all editable, Liquid
Affiliate Announcement; Affiliate Conversion; Product Announcement; Assessment Completion; Abandoned Checkout; Cart Order Confirmation; New Community Admin Post; New Community Comment; Community Connect Request; Course Completion Certificate; Double Opt-In; Double Opt-In Resubscription; Checkout Double Opt-In; Member Cancels Initiated Pause; Member Initiated Pause; Member Drip Notification (daily digest of unlocked modules); Offer Grant Confirmation; Payment Action Required (SCA); Subscription Payment Failed (dunning); Mention Notification; Offer Purchase Confirmation; Reply Comment Notification; User Cancelled/Paused/Resumed Subscription; Upcoming Payment Notification; Member Welcome Email (magic access when no account created / granted via automation/webhook); Podcast Episode Published; New Podcast Subscriber; Quiz Completion; Quiz Graded; Coaching Session Added/Added(multi)/Scheduled/Rescheduled/Canceled/Reminder/Content Changed/Recording Uploaded (+ICS attachments); Course Live Session Starting/Recording Ready/Scheduled/Rescheduled/Cancelled; Backstage Meeting Scheduled/Rescheduled/Canceled, New DM, Assignment Assigned, …
# Marketing email
- Email Campaigns (EmailFolders React; folders): types Broadcast (A/B test) | Sequence (triggered by automation) ; trial = broadcasts only; marketing_email_templates (reusable designs); events (webinar) link
- Forms: title → fields (custom fields), submissions list, auto-created automation (form submitted → add tag), double opt-in, spam protection

---

