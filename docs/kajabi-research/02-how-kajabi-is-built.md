# 02 — איך Kajabi בנוי (ממצאים טכניים)

> הממצאים כאן מתבססים על מה שנחשף בדפדפן: HTML, שמות רכיבים, בקשות רשת ו-payloads. **אין לנו גישה לקוד שלהם.** כל מה שכתוב כאן הוא הסקה מראיות. היכן שהראיה היא ממקור ציבורי (כמו מודעות דרושים), זה מצוין במפורש.

## תמונה כללית

```
                        ┌──────────────────────────────────────────┐
  admin: app.kajabi.com │  Rails monolith (Hotwire: Turbo+Stimulus) │
                        │  ├─ ERB + "Sage" (legacy DS)              │
                        │  ├─ React islands via `react-mounter`     │──► JSON API /api/admin/*, /api/v1/admin/*
                        │  ├─ Pine DS web components (Stencil)      │    (JSON:API, token header)
                        │  └─ Liquid theme engine + builder         │
                        └───────────────┬──────────────────────────┘
                                        │ Postgres · Redis · Sidekiq · OpenSearch · ActionCable
  creator site:                         │
  <sub>.mykajabi.com  ──► Rails renders Liquid themes (store, library, course player, checkout, LPs)
                     └──► /products/communities/v2/* ──reverse proxy──► Community service (Next.js App Router, UUIDs, GraphQL per job posts)
  media: Wistia (video/HLS) · Filestack (uploads) · kajabi-cdn (assets)
  3rd: Intercom · Pendo · Datadog RUM/Logs · Sentry · RudderStack · GA4/GTM(server-side proxy) · Meta/LinkedIn/Bing · Braze · ProfitWell
```

## 1. ה-Admin: מונולית Rails עם "איים" של React

| ראיה | משמעות |
|---|---|
| `<meta name="csrf-param" content="authenticity_token">`, טפסים עם `_method` | Rails, כולל Form helpers קלאסיים |
| `<meta name="turbo-prefetch">`, Stimulus controllers בשם `turbo-fetch`, `turbo-modal`, `hotwired--modal` | Hotwire (Turbo ו-Stimulus) |
| `data-controller="react-mounter"` + `data-react-mounter-component-value="WorkflowAutomations"` + `props-value='{...}'` + `admin-copy-value='["admin.react.workflows"]'` | דפוס של **React Islands**: השרת מרנדר מעטפת HTML, ו-Stimulus מרכיב (mount) רכיב React עם props ועם חבילת תרגומים שנטענת בעצלות (lazy) |
| נכסים (assets) מגיעים מ-`kajabi-app-assets.kajabi-cdn.com/vite/assets/*` | הבנייה נעשית עם Vite |
| Stimulus controllers בשם `admin--data-table--{search,sort,filter,scroll,bulk-actions,saved-view-picker}` | רכיב Data table גנרי ב-Stimulus, משותף לכל הרשימות |
| `sage-btn` לצד `<pds-button class="hydrated">` | שתי מערכות עיצוב: **Sage** הישנה, ו-**Pine DS** (`@pine-ds/core@4.1.0`, Web Components ב-Stencil, קוד פתוח ב-npm) |
| `ACTION_CABLE_CONSUMER` | WebSockets דרך ActionCable, לעדכונים חיים ולסטטוס עיבוד |
| `tinymce`, `ace`, `filestack` | עורך טקסט עשיר, עורך קוד ל-Liquid, והעלאת קבצים |

**רכיבי React שזוהו:**
- מכירות: `OfferCreationWizard`, `CartSettings`, `CommerceInvoices`, `PaymentReminderSettings`.
- שיווק: `WorkflowAutomations`, `PipelinesApp`, `EmailFolders`, `MarketingHome`.
- קשר ואנליטיקה: `PeoplesApp`, `ContactInsights`, `AnalyticsDashboard`, `UniversalInbox`, `AccessGroups`.
- אפליקציה: `BrandedMobileAppLandingPageV2`.

**הלקח:** הם לא כתבו את כל ה-Admin מחדש כ-SPA. מסכי CRUD פשוטים (טפסי Offer, הגדרות) נשארו ERB ו-Turbo. רק מסכים אינטראקטיביים (אוטומציות, אנליטיקה, רשימת אנשי קשר) הם React. זו גישה פרגמטית, וכדאי לאמץ אותה: Server Components לטפסים, ו-Client Components רק היכן שצריך אינטראקציה.

## 2. ה-API הפנימי

- נתיבים: `/api/admin/*` ו-`/api/v1/admin/*`. בקשת fetch עם עוגייה בלבד מחזירה **401**, כלומר נדרש Header עם טוקן. מודול בשם `adminHeaders` מוסיף אותו.
- **פורמט JSON:API** עבור ישויות התוכן (`{data:[{id,type,attributes,relationships,links}]}`). מסכים חדשים יותר משתמשים ב-JSON רגיל עם `pagination{current_page,total_pages,total_count,per_page:25}`.
- **ה-payload כולל הרשאות:** `canEdit`, `canDestroy`, `canClone`. הלקוח לא מחשב הרשאות בעצמו.
- **Polling לעיבוד מדיה:** `links.pollingPath` → `/api/admin/posts/:id/status`, ו-`/api/admin/bulk_video_uploads/:category`.
- **UI state נשמר בשרת:** `/api/admin/ui_states`, למשל אילו מודולים פתוחים.
- **אנליטיקה:** Endpoint נפרד לכל ווידג'ט (`/api/analytics_dashboard/payments_over_time?start_date&end_date&comparison=previous_period&currency=USD`). כך כל כרטיס נטען במקביל, ואפשר להגדיר לו Cache בנפרד.
- **קטלוגים דינמיים:** `automation_trigger_options` ו-`automation_action_options`. השרת מחזיר רשימת טריגרים ופעולות לפי קטגוריה, עם `is_premium`. כך ה-UI לא צריך לדעת מראש על פיצ'רים או על מגבלות התוכנית.
- **שמות מחלקות דולפים:** `Automation::Triggers::OfferPurchased`, `Automation::Actions::OfferGrant`, `Ai::Chatbot`, `BrandedMobileApp::Iap`. זה מלמד על מבנה Namespaced ב-Rails, עם STI או polymorphism לכל טריגר ופעולה.

## 3. מנוע התבניות (Themes / Liquid)

- **הכול הוא Theme:** האתר, כל דף נחיתה, כל מוצר (נגן הקורס), הצ'קאאוט והמיילים (`isEmailable`). `themeableType` הוא polymorphic (`LandingPage` וכו').
- **Theme** = קבצי Liquid (`index.liquid`, sections, blocks) + **Settings JSON** + **Schema**. הדפוס כמעט זהה ל-Shopify Online Store 2.0:
  - `sectionSchemas[type] = {name, elements[], groups[{name, elements[]}]}`
  - לכל element יש `{type, id, label, default, info, min/max/step, hide_if:{other_setting:value}, default_global_settings_attribute}`
  - Settings של דף: `sections{ id: {type, settings, blocks{ id:{type, settings} }, block_order} }`, ורשימת סדר
- **הבילדר:** פאנל שמאלי עם רשימת Sections וטופס שנוצר מה-schema. בצד ימין **iframe** עם `/admin/theme_files/:id/preview?editor=true&inline_editing=true`: השרת מרנדר Liquid אמיתי עם עריכה inline. יש Undo/Redo וקיצורי מקלדת.
- **ניהול גרסאות של תבניות:** לתבנית Encore יש גרסה (2.14.8) ו-changelog, עם "Update template" ו-Revert.
- **Liquid גם בתוכן:** מיילי מערכת ומיילי אישור משתמשים ב-`{{member.name}}`, `{{offer}}`, `{{site_login_url}}`.

**הלקח:** מנוע Section/Block/Schema הוא הדרך הנכונה לבנות Page builder שמתרחב בלי לגעת בקוד הבילדר. כדי להוסיף Block חדש, מוסיפים קומפוננטה ו-schema. ב-Next.js מקבילים את Liquid לרכיבי React ששמורים ב-Registry (ראו [05-build-plan.md](05-build-plan.md)).

## 4. הקהילה: שירות נפרד

- כתובת: `https://<sub>.mykajabi.com/products/communities/v2/<slug>/...`. **ה-Rails לא מרנדר את הדף.**
- סקריפטים מ-`communities-web-assets.kajabi-cdn.com/products/communities/v2/_next/static/...`, ו-`self.__next_f`. זה **Next.js App Router** (RSC).
- `__federation_shared__` מעיד על Module Federation, כנראה לשיתוף רכיבים עם ה-Admin או עם האפליקציה.
- מזהים הם **UUID**, לעומת bigint ב-Rails. כלומר DB נפרד.
- לפי מודעות דרושים, צוות Communities עובד ב-**React, TypeScript ו-GraphQL** [3P].
- ה-Admin ב-Rails מכיל רק "מעטפת": Dashboard, Access groups, Offers ו-Settings בסיסיים. כל ניהול התוכן (ערוצים, גיימיפיקציה, מיילים) נעשה **בתוך אפליקציית הקהילה עצמה**, במצב Admin.
- נכנסים דרך redirect ב-SSO (`/admin/communities/v2/redirects/:id`).

**הלקח:** כשפיצ'ר עשיר כמו קהילה צריך UX אחר ועדכונים בזמן אמת, הם פיצלו אותו לשירות. אצלנו, בשלב ראשון, אפשר להשאיר הכול באותו Next.js עם Supabase Realtime. אין צורך בשירות נפרד.

## 5. מדיה

- **וידאו: Wistia.** נטען `fast.wistia.com/assets/external/E-v1.js` עם HLS `.m3u8` ו-`videoFoam`. גודל קובץ מקסימלי 4GB. אפשר לבחור "use current frame as thumbnail". יש `video_upload_retries`. יש Bulk upload למודול, שיוצר שיעור לכל קובץ.
- **Media Library מאוחד:** וידאו, אודיו, תמונות וקבצים, עם תגיות, תצוגות שמורות, פילטר לפי סיומת, יצירת תמונות ב-AI ו-Adobe Express/Stock.
- **העלאות:** Filestack (filepicker.io), ל-S3/CDN תחת `kajabi-storefronts-production.kajabi-cdn.com/file-uploads/sites/:site/...`.
- **Preview לא מאובטח ב-cookie:** לינקי Preview משתמשים ב-`preview_token`, שהוא Rails `MessageVerifier` (Marshal מקודד ב-Base64, ואחריו `--HMAC`) עם user_id ו-expires_at.

## 6. נתונים ותשתית
- **חיפוש אנשי קשר:** OpenSearch (`search_type: "opensearch"`, `total_count.precision: exact|estimate`).
- **Rails, Postgres, Sidekiq, Redis, AWS, Memcached:** לפי מודעות דרושים [3P].
- **Multi-tenant:** `account` מכיל כמה `sites`, וכל ישות שייכת ל-`site_id`. תת-דומיין לכל אתר, או דומיין מותאם.
- **תצפיות:** Datadog RUM ו-Logs, Sentry (בקהילה), Pendo (Product analytics), Intercom (תמיכה), ProfitWell (Churn של המנוי שלהם), RudderStack (CDP).
- **Feature gating:** ה-API מחזיר `is_premium` ו-`contains_restricted_features`, ומודאלים של "Upgrade to unlock" מרונדרים מראש בכל עמוד. המגבלות נאכפות ברמת החשבון (למשל "limit of 5 products").
- **Release cadence:** "Cycles" של כ-6 שבועות עם שמות (Seaside, Timberline, Westwind, Stonebridge, Laguna). הודעות מופיעות בתוך המוצר (Dispatch notifications).

## 7. API ציבורי (לעומת הפנימי)
- `api.kajabi.com/v1`, בפורמט JSON:API, עם OAuth2 client-credentials.
- **ברובו קריאה בלבד.** אי אפשר ליצור קורס או הצעה.
- **רק 6 webhooks:** `purchase`, `payment_succeeded`, `order_created`, `form_submission`, `tag_added`, `tag_removed`.
- **MCP server** (`mcp.kajabi.com/mcp`) עם כ-100 כלים. דרכו AI יכול לעשות יותר ממה שה-API הציבורי מאפשר. זו אסטרטגיה מעניינת: הם משקיעים ב-MCP ולא ב-REST.
