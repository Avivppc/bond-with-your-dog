import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { siteUrl } from "@/lib/email";
import { PaddleCheckout } from "./PaddleCheckout";

export const dynamic = "force-dynamic";

/** Paddle "default payment link" page: Paddle.js opens the overlay for ?_ptxn=… */
export default async function PayPage({ searchParams }: { searchParams: Promise<{ order?: string; _ptxn?: string }> }) {
  const { order, _ptxn } = await searchParams;
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!_ptxn || !token) redirect("/");

  const successUrl = order ? `${siteUrl()}/checkout/success?order=${encodeURIComponent(order)}` : `${siteUrl()}/home`;
  return (
    <>
      <SiteHeader />
      <main className="pt-40 pb-20 max-w-xl mx-auto px-5 min-h-screen" style={{ backgroundColor: "#edf8ff" }}>
        <PaddleCheckout
          clientToken={token}
          environment={process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox"}
          successUrl={successUrl}
        />
      </main>
    </>
  );
}
