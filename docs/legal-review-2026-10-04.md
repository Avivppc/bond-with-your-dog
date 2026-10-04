# Legal pages and marketing consent: review of 2026-10-04

Prepared before submitting the site to PayPlus. This is an engineering brief built from public sources, **not legal advice**:
have an Israeli lawyer read the Terms, Refund and Privacy pages once before launch. Items marked **[verify]** were not
confirmed against a primary source.

## What changed

| Area | Change |
|---|---|
| Signup | Marketing box starts ticked only for visitors in the US (`src/lib/auth/marketing-regions.ts`); unticked everywhere else, and when the country is unknown. Notice with links to Terms and Privacy and an 18+ confirmation under the form. |
| Supabase | `profiles.marketing_opt_in_source / _country / _prechecked` next to the existing `marketing_opt_in(_at)`. Cleared automatically when marketing is turned off (trigger). Written by email signup (auth metadata → `handle_new_user`), Google signup (`/auth/callback`) and Settings. |
| PostHog | Person properties `marketing_opt_in`, `_at`, `_source`, `_country`, `_prechecked`; event `marketing_consent_changed` when a member's answer changes. Sent from the browser (`src/lib/analytics-marketing*.ts`), so it follows whatever cookie-consent gating PostHog is under. |
| Legal pages | Terms, Refund, Privacy rewritten for PayPlus (the business is the seller, not a reseller); new Accessibility Statement at `/accessibility` (footer link). Copy lives in `src/lib/site/legal-copy/`. |
| Business details | Settings → General → Business details (registered name, company/dealer number, address, phone) fills `{{business_details}}` on every legal page. |

## Why only the US is pre-ticked

Research (sources in the report below) found a pre-ticked box is **not** valid consent in: Israel (Communications Law s.30A: explicit prior
consent; Consumer Council says pre-ticked is not allowed; Privacy Protection Authority opinion of 25 Feb 2026 calls it "suspicious
consent"), the EU/EEA (Planet49, CJEU C-673/17), the UK (PECR, ICO), Canada (CASL), Australia (Spam Act, ACMA), Brazil, Korea, and
most others reviewed. The US (CAN-SPAM) is opt-out. Japan allows it but recommends default-off. So the list is an allow-list:
`PRETICK_COUNTRIES = {"US"}`. Add a country only after confirming its rule.

Israel carries statutory damages up to NIS 1,000 per message without proof of harm, and class actions are the main enforcement tool.
Because Bonded is an Israeli sender, Israel is treated as strict even for recipients abroad.

**Known gap:** the country comes from the visitor's IP. Someone on a VPN in the US who actually lives in the EU is pre-ticked.
Recommended follow-up: re-derive country at send time (billing country from PayPlus) and re-permission anyone whose country resolves
to an opt-in country (`marketing_opt_in_prechecked = true` finds them).

## Decisions taken in the copy (change them with a lawyer)

1. **Refund:** flat 14-day full refund, no cancellation fee. More generous than Israel (fee up to the lower of 5% / NIS 100), the EU/UK
   (digital-content waiver) and Australia, so one rule fits every buyer and chargebacks stay low. Israel has no EU-style
   "waive the right by consenting to immediate access", so a stricter policy would be legally riskier **[verify]**.
2. **Governing law:** Israeli law and Israeli courts, with mandatory consumer rights and local courts preserved.
3. **Age:** 18+ (avoids minors' contract-capacity issues; Israeli Legal Capacity law).
4. **Liability cap:** amount paid in the last 12 months, with the carve-outs the law requires (injury, fraud, wilful acts, consumer guarantees).
5. **Retention:** payment records seven years (Israeli bookkeeping law; confirm with the accountant). Analytics retention is "a limited period":
   state the real number once it is set in PostHog.
6. **Accessibility statement** is deliberately modest (aims for IS 5568 / WCAG AA, lists known limits). Do an actual accessibility check before
   claiming more.

## Promises in the copy the product must keep

- **Renewal reminder emails** before a plan that renews after a year or longer (Israeli Consumer Protection Law s.13A: notice 21-60 days before
  the term ends; a silent auto-renewal is void) **[verify section number]**. `offers.interval` can be `year`, so annual plans exist. **Not implemented yet.**
- **Cancelling a membership stops billing within 3 business days** (s.13C-13D **[verify]**). The Cancel button does this immediately.
- **Refund within 7 business days** of cancellation to the original card. Refund is currently a manual action: make sure someone owns it.
- **Advance notice before a chapter is withdrawn.**
- **Email confirmation after purchase** with a receipt or tax invoice (the Israeli disclosure document, s.14C(b)). Check what the PayPlus checkout sends.

## Still needed from the owner

1. Legal entity: Ltd, authorised dealer or exempt dealer, with name, number and address. Acquirers require an Israeli company or an authorised dealer.
2. VAT status. Israeli buyers see VAT-inclusive prices; services to foreign residents can be zero-rated (VAT Law s.30(a)(5)); ask the accountant how to evidence residency.
3. A real phone number and postal address (also the CAN-SPAM address; it already exists in Settings → Email).
4. Prior-year turnover (decides the accessibility-law exemption) and who the accessibility contact is.
5. EU/UK representative (GDPR Art. 27) if you keep selling continuously to the EU/UK; the "occasional" exemption probably does not apply **[verify]**. Choose the EU region for Supabase if you can.
6. Sign data-processing agreements with Supabase, PostHog, Vimeo, Mux, Resend, Anthropic, PayPlus, Cloudflare and Google; check each vendor's Data Privacy Framework status.
7. Ask PayPlus underwriting (03-9444788, service@payplus.co.il) for their site checklist in writing.

## Checkout (handed to the PayPlus checkout work)

The Israeli Clearing Association's site-joining guide asks for card-brand logos on the payment page and an **active, not pre-ticked** checkbox that
records acceptance of the Terms. The EU/UK waiver wording is not needed because the refund is unconditional for 14 days.
Also show price, currency, billing period and cancellation steps next to the pay button for memberships.

## Sources (as reported by the research)

- Marketing consent: Israel Communications Law s.30A (Meitar summary; consumers.org.il; Pearl Cohen on the PPA consent opinion), ICO PECR guide,
  CJEU C-673/17 (White & Case), CRTC bulletins 2012-548/549, ACMA "avoid sending spam", FTC CAN-SPAM guide, KISA/Network Act art. 50.
- Israel: Consumer Protection Law ss.13A-D, 14C, 14H, 17B; Cancellation Regulations 2010; Israeli Clearing Association guide (slika.org.il);
  Accessibility Regulations 2013 reg. 35; Privacy Protection Law Amendment 13 (in force 14 Aug 2025); Standard Contracts Law 1982.
- International: GDPR Arts. 13, 27; EDPB Guidelines 3/2018; Israel adequacy (Commission review, Jan 2024); CRD Art. 16(m) and 11a;
  California ARL (AB 2863); EU AI Act Art. 50; COPPA; DMCA 17 USC 512(c).
