import type { Metadata } from "next";
import { LegalPage, LEGAL_NAME } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/components/Footer";

export const metadata: Metadata = { title: "Privacy Policy | BONDED" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {LEGAL_NAME} respects your privacy. This policy explains what we collect and why.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address and profile information you choose to add (such as your dog&apos;s name).</li>
        <li>Learning data: the courses you have access to, your lesson progress, quiz results and certificates.</li>
        <li>Content you upload, such as training videos.</li>
        <li>Quiz answers and email when you take our &ldquo;Find your journey&rdquo; quiz.</li>
        <li>Basic usage analytics to improve the site.</li>
      </ul>
      <h2>Payments</h2>
      <p>
        Payments are processed by Paddle.com, our Merchant of Record. We never see or store your card details; Paddle
        shares with us only what we need to give you access (such as your email and the order).
      </p>
      <h2>How we use it</h2>
      <p>
        To provide your courses, track your progress, send emails about your account and purchases, and — only if you
        opted in — send news and training tips. You can unsubscribe at any time.
      </p>
      <h2>Service providers</h2>
      <p>
        We use trusted providers to run the service: hosting and database (Vercel, Supabase), video (Vimeo, Mux), email
        (Resend), payments (Paddle) and analytics (PostHog).
      </p>
      <h2 id="cookies">Cookies and analytics</h2>
      <p>
        Necessary cookies keep you signed in, keep checkout secure and remember your cookie choice. They are always on.
      </p>
      <p>
        Analytics cookies are set by PostHog so we can see how people use the site and the app, for example which
        lessons are finished and where people get stuck. When you are signed in, this activity is linked to your
        account email. Where the law asks for it (such as in the EU, UK, Switzerland and Brazil) we ask before setting
        them; elsewhere they are on unless you turn them off. If you say no, we still count visits, anonymously and
        without cookies. You can change your choice any time from &ldquo;Cookie settings&rdquo; at the bottom of every
        page. We keep a record of each choice (when, what and which region&apos;s rule applied) as proof.
      </p>
      <p>
        If you are a paying member, we also analyse your activity in the courses you bought (such as lessons completed,
        practice sessions and videos sent to Roni) on our own servers, to run and improve the service. This uses no
        cookies and continues even if you turn analytics cookies off.
      </p>
      <p>
        We do not sell or share your personal information. If your browser sends a Global Privacy Control signal, we
        treat it as a request to turn analytics cookies off, as California and other US state laws require.
      </p>
      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
