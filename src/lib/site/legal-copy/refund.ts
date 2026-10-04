import { blocks } from "./shared";

/**
 * Cancellation and refunds. A flat 14-day full refund is more generous than the Israeli, EU and UK
 * minimums (a fee may be charged in Israel; digital-content waivers exist in the EU/UK), and it
 * keeps one simple rule for every buyer and fewer chargebacks. Change it only with a lawyer.
 */
export const REFUND_HTML = blocks(
  "<p>We want you and your dog to love learning with Bonded. If it isn&#39;t right for you, you can cancel your purchase within <strong>14 days</strong> and get <strong>a full refund</strong>. No reason needed and no cancellation fee.</p>",
  "{{business_details}}",

  "<h2>Your 14 days</h2>",
  "<p>The 14 days start on the day you receive the confirmation email for your purchase. This applies to one-time purchases and to the first payment of a membership, and it applies whether or not you have already started watching. It is in addition to your rights under consumer law, which we don&#39;t limit.</p>",

  "<h2>How to cancel and ask for a refund</h2>",
  "<ul>",
  "<li>Email <a href=\"mailto:{{contact_email}}\">{{contact_email}}</a> from the address on your account with the words “cancel my purchase” and the name of what you bought, or</li>",
  "<li>send us a message from <strong>Help</strong> in your account, or</li>",
  "<li>for a membership, use <strong>Membership &amp; purchases → Cancel subscription</strong> to stop renewals, and email us to ask for the refund of your first payment.</li>",
  "</ul>",
  "<p>We confirm every cancellation by email. Use whichever of these is easiest for you.</p>",

  "<h2>When you get your money back</h2>",
  "<p>We refund you within <strong>7 business days</strong> of your cancellation, to the card you paid with, in the currency you paid in, through our payment provider PayPlus. Your bank or card company may take a few more days to show it. Access to what you cancelled ends when the refund is processed.</p>",

  "<h2>Memberships and subscriptions</h2>",
  "<p>You can cancel a membership at any time. Cancelling stops all future charges within three business days at the latest, usually immediately, and you keep access until the end of the period you have already paid for. Payments for a period you have already used are not refunded, except for the first payment during the 14 days described above. For plans that renew after a year or longer, we email you before the renewal so you can cancel in time.</p>",

  "<h2>After the 14 days</h2>",
  "<p>After 14 days we don&#39;t refund purchases you decided not to use. We do refund, or put right, a purchase that doesn&#39;t work as described: for example if a course can&#39;t be opened or played and we can&#39;t fix it, or what you bought isn&#39;t what we described. Write to us and we will sort it out. Your legal rights are never affected.</p>",

  "<h2>If we cancel</h2>",
  "<p>If we cancel an offer or end your access without it being your fault, we refund what you paid for the period you couldn&#39;t use.</p>",

  "<h2>Chargebacks</h2>",
  "<p>Please write to us before asking your card issuer to reverse a payment. We reply quickly and a refund from us is faster for you.</p>",
);
