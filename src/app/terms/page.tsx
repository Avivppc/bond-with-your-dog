import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LEGAL_NAME } from "@/components/LegalPage";
import { loadSiteSettings } from "@/lib/site-settings-server";

export const metadata: Metadata = { title: "Terms of Service | BONDED" };

export default async function TermsPage() {
  const { contactEmail: CONTACT_EMAIL } = await loadSiteSettings();
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern your use of the Bonded website and online courses, operated by <strong>{LEGAL_NAME}</strong>{" "}
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or buying a course you agree to them.
      </p>
      <h2>Purchases</h2>
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our
        orders and handles customer service inquiries and returns related to payments. Prices are shown at checkout,
        including any applicable taxes. See our <Link href="/refund-policy">Refund Policy</Link>.
      </p>
      <h2>Your access</h2>
      <p>
        When you buy a course you get a personal, non-transferable license to watch and use its materials for your own
        training. One-time purchases include lifetime access unless the offer states a time limit; memberships include
        access while they are active. Please don&apos;t share your login or redistribute course videos and materials.
      </p>
      <h2>Training safety</h2>
      <p>
        Our lessons are educational. You are responsible for your dog&apos;s wellbeing and safety during training. Consult
        a veterinarian if your dog has health or mobility concerns.
      </p>
      <h2>Content you share</h2>
      <p>
        If you upload videos to the community, you confirm you have the right to share them. You can choose whether a
        video is public; public videos are reviewed before they appear.
      </p>
      <h2>Changes and contact</h2>
      <p>
        We may update these terms; we&apos;ll post the new date above. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
