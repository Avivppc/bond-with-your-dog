import { legalText } from "../sections/text";
import { ACCESSIBILITY_HTML, LEGAL_UPDATED, PRIVACY_HTML, REFUND_HTML, TERMS_HTML } from "../legal-copy";
import { page, section } from "./helpers";

/** The legal pages as written for the payment provider's review (Oct 2026): the starting point before anyone edits them in Website → Pages. */

const legalPage = (heading: string, body: string) =>
  page([section(legalText, "policy", { heading, updated: LEGAL_UPDATED, body })], false);

export const privacyTemplate = () => legalPage("Privacy Policy", PRIVACY_HTML);
export const termsTemplate = () => legalPage("Terms of Service", TERMS_HTML);
export const refundTemplate = () => legalPage("Refund and Cancellation Policy", REFUND_HTML);
export const accessibilityTemplate = () => legalPage("Accessibility Statement", ACCESSIBILITY_HTML);
