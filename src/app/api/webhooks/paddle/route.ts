import { NextResponse, type NextRequest } from "next/server";
import { mapPaddleEvent, verifyPaddleSignature } from "@/lib/payments/paddle-webhook";
import { applyBillingEvent, markBillingEvent, recordBillingEvent } from "@/lib/payments/billing";

/**
 * Paddle Billing webhook. Verify the signature on the RAW body, record the event
 * once (idempotent on event_id), then apply it. Returns 500 on processing errors so
 * Paddle retries; duplicates return 200.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? "";
  const rawBody = await req.text();
  if (!verifyPaddleSignature(rawBody, req.headers.get("paddle-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { event_id?: string; event_type?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const eventId = payload.event_id;
  const type = payload.event_type ?? "unknown";
  if (!eventId) return NextResponse.json({ error: "missing event id" }, { status: 400 });

  const status = await recordBillingEvent("paddle", eventId, type, payload);
  if (status === "processed") return NextResponse.json({ ok: true, duplicate: true });

  try {
    await applyBillingEvent("paddle", mapPaddleEvent(payload));
    await markBillingEvent("paddle", eventId, null);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[paddle webhook] processing failed", { eventId, type, message });
    await markBillingEvent("paddle", eventId, message);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
