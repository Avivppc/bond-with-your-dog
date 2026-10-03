import type { Metadata } from "next";
import { LegalPage, LEGAL_NAME } from "@/components/LegalPage";
import { loadSiteSettings } from "@/lib/site-settings-server";

export const metadata: Metadata = { title: "Refund Policy | BONDED" };

export default async function RefundPolicyPage() {
  const { contactEmail: CONTACT_EMAIL } = await loadSiteSettings();
  return (
    <LegalPage title="Refund Policy">
      <p>
        We want you and your dog to love learning with {LEGAL_NAME}. If a course isn&apos;t right for you, you can ask for a
        full refund within <strong>14 days</strong> of purchase — no questions asked.
      </p>
      <h2>How to request a refund</h2>
      <p>
        Our order process is conducted by our online reseller Paddle.com, who is the Merchant of Record for all our orders.
        To request a refund, reply to your purchase receipt from Paddle or contact Paddle through{" "}
        <a href="https://paddle.net">paddle.net</a>. You can also email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
        and we&apos;ll help.
      </p>
      <h2>Memberships and subscriptions</h2>
      <p>
        You can cancel a membership at any time; you keep access until the end of the period you already paid for.
        Refunds for the first payment of a membership follow the same 14-day window.
      </p>
      <h2>After a refund</h2>
      <p>Access to the refunded course or membership ends when the refund is processed.</p>
    </LegalPage>
  );
}
