import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { configuredProvider } from "@/lib/payments/provider";
import { Card, MUTED, PageHeader, StatusPill } from "../../_components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment settings" };

/** Keys the checkout needs, by environment variable. Only whether each is set is shown, never the value. */
const PADDLE_KEYS = [
  { env: "PADDLE_API_KEY", label: "API key", hint: "Creates the checkout." },
  { env: "PADDLE_WEBHOOK_SECRET", label: "Webhook secret", hint: "Confirms payments so access is granted." },
  { env: "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", label: "Client token", hint: "Opens the payment window on the site." },
] as const;

function isSet(env: string): boolean {
  return Boolean(process.env[env]?.trim());
}

/** Read-only: which payment provider is connected and whether it has everything it needs. */
export default async function PaymentSettingsPage() {
  await requireStaff("settings");
  const provider = configuredProvider();
  const live = process.env.PADDLE_ENV === "production";
  const missing = provider === "paddle" ? PADDLE_KEYS.filter((k) => !isSet(k.env)) : [];

  return (
    <>
      <PageHeader title="Payments" description="How the checkout takes money. Keys live in Vercel, so this page only shows whether they're set." />

      <div className="space-y-6">
        <Card title="Payment provider">
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            {provider === "paddle" && (
              <>
                <span className="font-medium">Paddle</span>
                {live ? <StatusPill tone="published">Live</StatusPill> : <StatusPill tone="warning">Sandbox (test payments)</StatusPill>}
                {missing.length > 0 && <StatusPill tone="danger">Missing keys</StatusPill>}
              </>
            )}
            {provider === "test" && (
              <>
                <span className="font-medium">Test payments</span>
                <StatusPill tone="info">Local development only</StatusPill>
              </>
            )}
            {provider === null && (
              <>
                <StatusPill tone="danger">Not connected</StatusPill>
                <span className={MUTED}>Paid offers can&apos;t be bought until PAYMENTS_PROVIDER is set in Vercel. Free offers still work.</span>
              </>
            )}
          </div>
          {provider === "paddle" && (
            <ul className="mt-4 divide-y divide-[#efeeed] rounded-[8px] border border-[#efeeed]">
              {PADDLE_KEYS.map((k) => (
                <li key={k.env} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span>
                    <span className="block font-medium">{k.label}</span>
                    <span className={`block text-[12px] ${MUTED}`}>
                      {k.hint} <code className="text-[11px]">{k.env}</code>
                    </span>
                  </span>
                  {isSet(k.env) ? <StatusPill tone="published">Set</StatusPill> : <StatusPill tone="danger">Missing</StatusPill>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Moving to PayPlus" description="Bonded will charge through PayPlus.">
          <p className={`text-[14px] ${MUTED}`}>
            The checkout still runs on the provider above until the PayPlus connection is built. Prices, offers and discount codes are kept
            in Bonded, so they carry over.
          </p>
        </Card>

        <Card title="Prices and offers">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium">
            <li>
              <Link href="/admin/pricing" className="hover:underline">
                Chapter prices
              </Link>
            </li>
            <li>
              <Link href="/admin/offers" className="hover:underline">
                Offers
              </Link>
            </li>
            <li>
              <Link href="/admin/discount-codes" className="hover:underline">
                Discount codes
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className="hover:underline">
                Orders
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
