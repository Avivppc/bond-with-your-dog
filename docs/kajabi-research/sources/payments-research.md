# Payment provider research — Israeli-registered online course platform (2026-09-30)

> Compiled by a research sub-agent from public sources. Not tax/legal advice; **[Accountant]** = confirm with an Israeli CPA. **UNCERTAIN** = conflicting/weak sources.

## Bottom line
- Stripe still does not onboard Israeli businesses ([stripe.com/global](https://stripe.com/global)); Stripe Managed Payments also excludes Israel ([eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)).
- Use a Merchant of Record: as a non-EU seller of e-learning you'd owe EU VAT from the first sale via non-Union OSS ([PKF](https://www.pkf-l.com/insights/tax-talk-cross-border-transactions-with-the-eu/)), same for UK ([Commenda](https://www.commenda.io/uk/vat-registration-for-foreign-companies)), plus US digital sales tax.
- **Pick: Paddle → fallback Polar.sh → distant third Lemon Squeezy.** Israeli gateway only later, as an ILS/Bit/installments add-on.

## Comparison
| | Paddle | Polar.sh | Lemon Squeezy | Israeli gateways | PayPal (IL) |
|---|---|---|---|---|---|
| Role | MoR | MoR | MoR (Stripe-owned) | gateway — you're the merchant | processor — you're the merchant |
| Israeli sellers | yes ([list](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)) | yes ([list](https://polar.sh/docs/merchant-of-record/supported-countries)) | yes ([list](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)) | yes | yes |
| Courses | grey zone — AUP bans non-owned courses & non-software services ([AUP](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle)); **get written OK** | explicitly allowed ([AUP](https://polar.sh/docs/merchant-of-record/acceptable-use)) | explicitly allowed ([list](https://docs.lemonsqueezy.com/help/getting-started/prohibited-products)) | yes | yes |
| Fees | 5% + $0.50 flat ([pricing](https://www.paddle.com/pricing)) | 5% + $0.50 +1.5% non-US; paid plans 3.8% + $0.40 ([fees](https://polar.sh/docs/merchant-of-record/fees)) | 5% + $0.50 +1.5% intl +0.5% subs ([fees](https://docs.lemonsqueezy.com/help/getting-started/fees)) | negotiated; foreign cards surcharged | 3.4% + $0.30 +1–2% intl +2.5% FX ([fees](https://www.paypal.com/il/webapps/mpp/merchant-fees)) |
| Installments | subscription + cancel after N ([cancel API](https://developer.paddle.com/build/subscriptions/cancel-subscriptions)) | same approach | none | Israeli cards mainly | pay-in-3/4 some markets |
| Webhooks | HMAC-SHA256 `Paddle-Signature` ([docs](https://developer.paddle.com/webhooks/signature-verification)) | Standard Webhooks | yes | callback URLs (varies) | yes |
| Payout to Israel | monthly, $100 min, SWIFT/Payoneer, USD ([payouts](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid)) | via Stripe Connect Express ($2/mo + 0.25% + $0.25) | bank 1% / PayPal | ILS to Israeli account | free ≥ ₪1,000 |
| Customer invoice / VAT | Paddle | Polar | LS | you | you |
| Your document | Paddle self-billing reverse invoice ([info](https://www.paddle.com/help/manage/get-paid/do-i-need-to-invoice-paddle-for-my-payout)) — **[Accountant]** | statements **[Accountant]** | same | receipt/tax invoice per sale | per sale |

Risks: Paddle approval for courses; a competitor-authored post reports rejections of sellers with no history ([dev.to](https://dev.to/odedunipaas/paddle-rejected-my-account-heres-the-map-of-what-actually-works-in-2026-1f1k)) — UNCERTAIN/biased. Lemon Squeezy's future under Stripe Managed Payments (Israel ineligible) — UNCERTAIN.

## Paddle onboarding
1. Email sellers@paddle.com for written confirmation (self-created video courses + membership via our web app).
2. Build in sandbox (sandbox-vendors.paddle.com) before approval.
3. Domain review ([requirements](https://www.paddle.com/help/start/account-verification/what-is-domain-approval)): live HTTPS site (no coming-soon/login wall), product description, public pricing, Terms (legal name), Refund Policy 14–90 days pointing to Paddle ([minimum seller terms](https://developer.paddle.com/partners/embed-billing/seller-go-live/minimum-seller-terms)), Privacy; each checkout domain approved; manual review ~5–7 business days.
4. Identity verification (ID + video selfie); business verification for Ltd only ([info](https://www.paddle.com/help/start/account-verification/what-is-business-verification)).
5. Legal name / domain owner / bank holder consistent.
6. USD account at Israeli bank or Payoneer.
7. **[Accountant]** osek murshe vs Ltd; 0% VAT export of services on MoR payouts; Israeli-customer share; whether own invoice per payout is needed; FX for books.

## Code (Paddle Billing)
Route handler with raw body; verify `Paddle-Signature` (`@paddle/paddle-node-sdk` `webhooks.unmarshal()`); unique `event_id`; pass `custom_data {user_id, course_id, plan}` into checkout. Events ([overview](https://developer.paddle.com/webhooks/overview)):
- `transaction.completed` → grant (also renewals with `origin=subscription_recurring`); don't double-grant after `transaction.paid`.
- `subscription.created/activated/updated` → membership + `current_period_end`, scheduled cancel.
- `subscription.past_due` → grace banner (Paddle dunning). `subscription.canceled/paused/resumed` → revoke/suspend/restore.
- Installments: subscription with `custom_data.installments_total = N`, cancel after N-th `transaction.completed`, keep permanent entitlement.
- `adjustment.created/updated` (refund/chargeback, `approved`) → revoke/adjust.
- Polar equivalents: `order.paid`, `subscription.active/canceled/revoked/past_due`, `order.refunded`.

## Other routes
- Israeli gateways (Cardcom, PayPlus, Tranzila, iCredit/Rivhit, Grow): hosted page/iframe (SAQ-A), token recurring, Cardcom/Rivhit invoice APIs ([Rivhit](https://rivhit-api.readme.io/)); multi-currency varies (Tranzila UNCERTAIN); Morning (Green Invoice) Hebrew-only receipts; you carry EU/UK/US consumer tax.
- US LLC + Stripe Atlas: Israeli "management and control" can make it Israeli-resident ([Mondaq](https://webiis08.mondaq.com/tax-authorities/818254/the-israeli-tax-complications-of-llcs)); needs cross-border tax adviser; not for launch.
