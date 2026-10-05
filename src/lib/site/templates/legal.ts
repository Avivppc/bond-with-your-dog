import { blocks, legalText } from "../sections/text";
import { page, section } from "./helpers";

/** The legal pages as they were hand-built (Oct 2026): the starting point before anyone edits them. */

const UPDATED = "October 1, 2026";

const TERMS_HTML = blocks(
  "<p>These terms govern your use of the Bonded website and online courses, operated by <strong>{{legal_name}}</strong> (“we”, “us”). By creating an account or buying a course you agree to them.</p>",
  "<h2>Purchases</h2>",
  '<p>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders and handles customer service inquiries and returns related to payments. Prices are shown at checkout, including any applicable taxes. See our <a href="/refund-policy">Refund Policy</a>.</p>',
  "<h2>Your access</h2>",
  "<p>When you buy a course you get a personal, non-transferable license to watch and use its materials for your own training. One-time purchases include lifetime access unless the offer states a time limit; memberships include access while they are active. Please don't share your login or redistribute course videos and materials.</p>",
  "<h2>Training safety</h2>",
  "<p>Our lessons are educational. You are responsible for your dog's wellbeing and safety during training. Consult a veterinarian if your dog has health or mobility concerns.</p>",
  "<h2>Content you share</h2>",
  "<p>If you upload videos to the community, you confirm you have the right to share them. You can choose whether a video is public; public videos are reviewed before they appear.</p>",
  "<h2>Changes and contact</h2>",
  '<p>We may update these terms; we\'ll post the new date above. Questions: <a href="mailto:{{contact_email}}">{{contact_email}}</a>.</p>',
);

const REFUND_HTML = blocks(
  "<p>We want you and your dog to love learning with {{legal_name}}. If a course isn't right for you, you can ask for a full refund within <strong>14 days</strong> of purchase — no questions asked.</p>",
  "<h2>How to request a refund</h2>",
  '<p>Our order process is conducted by our online reseller Paddle.com, who is the Merchant of Record for all our orders. To request a refund, reply to your purchase receipt from Paddle or contact Paddle through <a href="https://paddle.net">paddle.net</a>. You can also email us at <a href="mailto:{{contact_email}}">{{contact_email}}</a> and we\'ll help.</p>',
  "<h2>Memberships and subscriptions</h2>",
  "<p>You can cancel a membership at any time; you keep access until the end of the period you already paid for. Refunds for the first payment of a membership follow the same 14-day window.</p>",
  "<h2>After a refund</h2>",
  "<p>Access to the refunded course or membership ends when the refund is processed.</p>",
);

/** legal_text's defaults are the Privacy Policy. */
export function privacyTemplate() {
  return page([section(legalText, "policy")], false);
}

export function termsTemplate() {
  return page([section(legalText, "policy", { heading: "Terms of Service", updated: UPDATED, body: TERMS_HTML })], false);
}

export function refundTemplate() {
  return page([section(legalText, "policy", { heading: "Refund Policy", updated: UPDATED, body: REFUND_HTML })], false);
}
