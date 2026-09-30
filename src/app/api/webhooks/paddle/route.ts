import { NextResponse, type NextRequest } from "next/server";
import { mapPaddleEvent, verifyPaddleSignature } from "@/lib/payments/paddle-webhook";
import {
  BillingIgnored,
  applyBillingEvent,
  claimBillingEvent,
  markBillingEvent,
  recordBillingEvent,
} from "@/lib/payments/billing";

/**
 * Paddle Billing webhook. Verify the signature on the RAW body, record the event once,
 * claim it atomically (concurrent deliveries get 409 and are retried by Paddle), then apply.
 * Deliberately ignored events return 200; processing errors return 500 so Paddle retries.
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

  try {
    const status = await recordBillingEvent("paddle", eventId, type, payload);
    if (status === "processed") return NextResponse.json({ ok: true, duplicate: true });
    if (!(await claimBillingEvent("paddle", eventId))) {
      return NextResponse.json({ error: "already processing" }, { status: 409 });
    }
  } catch (error: unknown) {
    console.error("[paddle webhook] could not record event", { eventId, error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 500 });
  }

  try {
    await applyBillingEvent("paddle", mapPaddleEvent(payload));
    await markBillingEvent("paddle", eventId, null);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof BillingIgnored) {
      await markBillingEvent("paddle", eventId, `ignored: ${message}`);
      return NextResponse.json({ ok: true, ignored: message });
    }
    console.error("[paddle webhook] processing failed", { eventId, type, message });
    await markBillingEvent("paddle", eventId, message, true);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
