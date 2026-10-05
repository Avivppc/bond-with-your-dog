/**
 * The From header for marketing email: the address stays EMAIL_FROM's (verified with Resend), the
 * name is whatever the team set in Settings → Email.
 */
export function fromWithName(envFrom: string, senderName: string): string {
  const name = senderName.replace(/["<>\r\n\\]/g, "").replace(/\s+/g, " ").trim();
  if (!name) return envFrom;
  const address = envFrom.match(/<([^>]+)>/)?.[1] ?? envFrom.trim();
  return `"${name}" <${address}>`;
}
