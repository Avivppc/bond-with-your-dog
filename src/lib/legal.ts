/**
 * The business details the legal pages (Terms, Refund, Privacy) and payment-provider review need.
 * Entered in Settings → General; {{legal_name}} also honours the older NEXT_PUBLIC_LEGAL_NAME.
 */
export interface LegalDetails {
  /** The registered business name (company, or the sole trader's name). */
  name: string;
  /** Israeli company number (ח.פ.) or authorised/exempt dealer number (ע.מ./ע.פ.). */
  businessNumber: string;
  address: string;
  phone: string;
}

export const EMPTY_LEGAL_DETAILS: LegalDetails = { name: "", businessNumber: "", address: "", phone: "" };

/** Name shown when Settings has none: the environment variable some deployments already set. */
export const ENV_LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME ?? "";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);

export interface LegalContext {
  legal: LegalDetails;
  contactEmail: string;
  /** Used for {{legal_name}} when no legal name is set. */
  fallbackName: string;
}

/** The lines of {{business_details}}: only what is filled in, escaped, in a fixed order. */
function businessDetailsHtml({ legal, contactEmail, fallbackName }: LegalContext): string {
  const lines = [
    `<strong>${escapeHtml(legal.name || fallbackName)}</strong>`,
    legal.businessNumber && `Business registration no.: ${escapeHtml(legal.businessNumber)}`,
    ...legal.address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(escapeHtml),
    legal.phone && `Phone: ${escapeHtml(legal.phone)}`,
    `Email: <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>`,
  ].filter(Boolean);
  return `<p>${lines.join("<br>")}</p>`;
}

/**
 * Fills {{legal_name}}, {{contact_email}} and {{business_details}} in a legal page's HTML.
 * Everything inserted is escaped; the caller still sanitizes the result. Pure.
 */
export function fillLegalPlaceholders(body: string, context: LegalContext): string {
  return body
    .replaceAll("{{business_details}}", () => businessDetailsHtml(context))
    .replaceAll("{{contact_email}}", () => escapeHtml(context.contactEmail))
    .replaceAll("{{legal_name}}", () => escapeHtml(context.legal.name || context.fallbackName));
}
