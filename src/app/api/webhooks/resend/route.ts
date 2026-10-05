import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { verifyResendWebhook } from "@/lib/flows/signing";

interface ResendEvent {
  type?: string;
  created_at?: string;
  data?: { email_id?: string };
}

/**
 * Resend webhook: delivery, opens, clicks, bounces and spam complaints for the emails flows send.
 * Signed with RESEND_WEBHOOK_SECRET (Svix). Each delivery is stored and applied in one transaction
 * (apply_email_webhook), so a retry after a failure is applied again and a retry after success is a no-op.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend webhook] RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  const body = await req.text();
  const headers = { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") };
  if (!verifyResendWebhook(secret, headers, body, new Date())) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const occurredAt = event.created_at && !Number.isNaN(Date.parse(event.created_at)) ? event.created_at : new Date().toISOString();

  const { data: applied, error } = await createServiceClient().rpc("apply_email_webhook", {
    p_delivery_id: headers.id,
    p_provider_id: event.data?.email_id ?? null,
    p_type: event.type ?? "",
    p_payload: event,
    p_at: occurredAt,
  });
  if (error) {
    console.error("[resend webhook] apply failed", { type: event.type, error: error.message });
    return NextResponse.json({ error: "could not record" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, duplicate: applied === false });
}
