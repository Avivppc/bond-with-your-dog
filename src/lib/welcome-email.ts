import type { OutgoingEmail } from "@/lib/email";

/**
 * The branded welcome a new member gets right after signing up (email or Google).
 * Pure builder: no I/O, so copy, links and escaping stay unit-testable.
 */
export interface WelcomeEmailInput {
  to: string;
  /** Full name from the signup form or Google profile; may be empty. */
  fullName: string;
  /** Site origin for links and the logo, e.g. https://www.bonded.dog */
  baseUrl: string;
  /** One-time link proving the inbox. Omitted when the email is already verified (Google). */
  verifyUrl: string | null;
}

const FALLBACK_NAME = "friend";

const COLORS = {
  page: "#edf8ff",
  card: "#ffffff",
  ink: "#243036",
  muted: "#515d64",
  brand: "#8b4b00",
  button: "#ff8f00",
  buttonInk: "#462300",
  tint: "#dbebf4",
} as const;

const NEXT_STEPS = [
  { title: "Tell me about your dog", body: "Name, age and anything I should know about their body. It shapes every lesson." },
  { title: "Choose your chapter", body: "Foundations, Moves or Let's Dance. Most teams start with Foundations." },
  { title: "Keep it short", body: "10–15 minutes a day is all it takes. Short, happy sessions build the bond fastest." },
] as const;

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || FALLBACK_NAME;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function button(href: string, label: string, primary: boolean): string {
  const look = primary
    ? `background:${COLORS.button};color:${COLORS.buttonInk};`
    : `background:${COLORS.tint};color:${COLORS.ink};`;
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;border-radius:999px;${look}font-weight:700;font-size:15px;text-decoration:none;">${label}</a>`;
}

function stepsHtml(): string {
  return NEXT_STEPS.map(
    (step, i) => `
      <tr>
        <td style="padding:0 0 18px 0;vertical-align:top;width:36px;">
          <div style="width:26px;height:26px;border-radius:13px;background:${COLORS.tint};color:${COLORS.brand};font-weight:700;font-size:13px;line-height:26px;text-align:center;">${i + 1}</div>
        </td>
        <td style="padding:0 0 18px 0;vertical-align:top;">
          <div style="font-weight:700;color:${COLORS.ink};font-size:15px;margin-bottom:2px;">${step.title}</div>
          <div style="color:${COLORS.muted};font-size:14px;line-height:1.5;">${step.body}</div>
        </td>
      </tr>`
  ).join("");
}

function verifyBlockHtml(verifyUrl: string): string {
  return `
          <div style="background:${COLORS.page};border-radius:14px;padding:20px;margin:0 0 28px 0;">
            <div style="font-weight:700;color:${COLORS.ink};font-size:15px;margin-bottom:6px;">One quick thing: confirm your email</div>
            <div style="color:${COLORS.muted};font-size:14px;line-height:1.5;margin-bottom:14px;">You're already in. Confirming lets us unlock any courses that were bought or gifted to this address.</div>
            ${button(verifyUrl, "Confirm my email", true)}
          </div>`;
}

export function welcomeEmail({ to, fullName, baseUrl, verifyUrl }: WelcomeEmailInput): OutgoingEmail {
  const firstName = firstNameOf(fullName);
  const homeUrl = `${baseUrl}/home`;
  const subject = `Welcome to BONDED, ${firstName} 🐾`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 24px 0;" align="center">
          <img src="${escapeHtml(baseUrl)}/app/img/logo.png" alt="BONDED" width="120" style="display:block;border:0;height:auto;">
        </td></tr>
        <tr><td style="background:${COLORS.card};border-radius:20px;padding:40px 36px;">
          <p style="margin:0 0 8px 0;color:${COLORS.brand};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">You're in</p>
          <h1 style="margin:0 0 16px 0;color:${COLORS.ink};font-size:28px;line-height:1.2;">Welcome to BONDED, ${escapeHtml(firstName)}!</h1>
          <p style="margin:0 0 28px 0;color:${COLORS.muted};font-size:16px;line-height:1.6;">
            I'm so happy you're here. Everything we do starts with trust and communication between you and your dog. The tricks and the dancing come when you're both ready.
          </p>${verifyUrl ? verifyBlockHtml(verifyUrl) : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">${stepsHtml()}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;"><tr><td>${button(homeUrl, "Open BONDED", !verifyUrl)}</td></tr></table>
          <p style="margin:0 0 4px 0;color:${COLORS.muted};font-size:15px;line-height:1.6;">See you inside,</p>
          <p style="margin:0;color:${COLORS.ink};font-size:15px;font-weight:700;">Roni</p>
        </td></tr>
        <tr><td style="padding:24px 8px 0 8px;" align="center">
          <p style="margin:0;color:${COLORS.muted};font-size:12px;line-height:1.6;">You're getting this because you created a BONDED account.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Welcome to BONDED, ${firstName}!`,
    "",
    "I'm so happy you're here. Everything we do starts with trust and communication between you and your dog. The tricks and the dancing come when you're both ready.",
    "",
    ...(verifyUrl
      ? ["One quick thing: confirm your email so we can unlock any courses bought or gifted to this address:", verifyUrl, ""]
      : []),
    ...NEXT_STEPS.map((step, i) => `${i + 1}. ${step.title}: ${step.body}`),
    "",
    `Open BONDED: ${homeUrl}`,
    "",
    "See you inside,",
    "Roni",
  ].join("\n");

  return { to, subject, html, text };
}

/** The "send me a new link" email from the Home reminder. */
export function confirmEmail(to: string, verifyUrl: string): OutgoingEmail {
  return {
    to,
    subject: "Confirm your email for BONDED",
    text: [
      "Hi,",
      "",
      "Here's your link to confirm this email address (it works once):",
      verifyUrl,
      "",
      "Confirming unlocks any courses bought or gifted to this address.",
      "",
      "Roni & the BONDED team",
    ].join("\n"),
  };
}
