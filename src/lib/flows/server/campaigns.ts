import "server-only";
import { createHash } from "node:crypto";
import { siteUrl } from "@/lib/email";
import { emailDocFromNodeData } from "@/lib/email-blocks/defaults";
import { renderEmailDoc } from "@/lib/email-blocks/render";
import type { EmailDoc } from "@/lib/email-blocks/types";
import type { ServiceClient } from "./data";
import { hasPostalAddress, loadEmailSettings, type EmailSettings } from "./email-settings";
import { sendMarketingBatch, unsubscribeLinks } from "./send";

/**
 * Campaigns: one email to an audience, now or at a set time. When a campaign starts, the database
 * queues one message per recipient (enqueue_campaign); every job then sends the queued messages in
 * batches of 100 (Resend's batch API). A job holds the campaign while it sends, each batch carries an
 * idempotency key made from its messages, and a failed batch stays queued for the next job, so
 * nobody gets it twice and nobody is dropped. Sending stops after a day of failures.
 */

export type AudienceKind = "all_members" | "owns_chapter" | "not_owns_chapter" | "completed_chapter" | "inactive_practice" | "quiz_leads" | "everyone";
export interface Audience {
  kind: AudienceKind;
  courseId?: string | null;
  days?: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "canceled";
  audience: Audience;
  email: EmailDoc;
  scheduled_at: string | null;
  started_at: string | null;
  sent_at: string | null;
  recipients: number | null;
}

export const CAMPAIGN_COLUMNS = "id, name, status, audience, email, scheduled_at, started_at, sent_at, recipients";

const BATCH = 100;
/** How long a job holds a campaign; a job that died lets go after this. */
const LEASE_MS = 5 * 60 * 1000;
/** Messages still failing a day after the start are given up on (Resend keeps idempotency keys 24h). */
const GIVE_UP_MS = 24 * 60 * 60 * 1000;

/** How many people an audience reaches right now (counted in the database, so no row limits). */
export async function audienceSize(sb: ServiceClient, audience: Audience): Promise<number> {
  const { data, error } = await sb.rpc("campaign_audience_size", { p_audience: audience });
  if (error) throw new Error(`audience unavailable: ${error.message}`);
  return Number(data ?? 0);
}

interface QueuedMessage {
  id: string;
  user_id: string | null;
  to_email: string;
}

/** First and dog names for a batch of members (leads have none). */
async function namesFor(sb: ServiceClient, userIds: string[]): Promise<Map<string, { first: string; dog: string }>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await sb.from("profiles").select("id, full_name, dog_name").in("id", userIds);
  if (error) throw new Error(`names unavailable: ${error.message}`);
  return new Map((data ?? []).map((p) => [p.id as string, { first: String(p.full_name ?? "").trim().split(/\s+/)[0] ?? "", dog: String(p.dog_name ?? "") }]));
}

/** The same messages always get the same key, so a retried batch is never delivered twice. */
function batchKey(campaignId: string, batch: readonly QueuedMessage[]): string {
  const digest = createHash("sha256").update(batch.map((m) => m.id).join(",")).digest("hex").slice(0, 32);
  return `campaign:${campaignId}:${digest}`;
}

/** Sends one batch. ok: false means Resend took none of it; the messages stay queued for later. */
async function sendBatch(sb: ServiceClient, campaign: CampaignRow, batch: readonly QueuedMessage[], settings: EmailSettings): Promise<{ sent: number; ok: boolean }> {
  const names = await namesFor(sb, batch.map((m) => m.user_id).filter((id): id is string => Boolean(id)));
  const doc = emailDocFromNodeData(campaign.email);
  const site = siteUrl();
  const rendered = batch.map((m) => {
    const name = m.user_id ? names.get(m.user_id) : undefined;
    const links = unsubscribeLinks({ userId: m.user_id, email: m.to_email });
    const appUrl = m.user_id ? `${site}/home` : `${site}/signup`;
    const email = renderEmailDoc(doc, { siteUrl: site, vars: { first_name: name?.first ?? "", dog_name: name?.dog ?? "", app_url: appUrl, offer_url: appUrl }, unsubscribeUrl: links.page, postalAddress: settings.postalAddress });
    return { to: m.to_email, subject: email.subject, html: email.html, text: email.text, unsubscribe: links, sender: { name: settings.senderName, replyTo: settings.replyTo } };
  });
  const result = await sendMarketingBatch(rendered, batchKey(campaign.id, batch));
  if (!result.ok) {
    console.error("[campaigns] batch failed", { campaign: campaign.id, error: result.error });
    return { sent: 0, ok: false };
  }
  await Promise.all(
    batch.map((m, i) => {
      const item = result.items[i];
      if (item?.ok) {
        return sb.from("email_messages").update({ status: "sent", provider_id: item.id, subject: rendered[i].subject, sent_at: new Date().toISOString() }).eq("id", m.id);
      }
      console.error("[campaigns] recipient rejected", { campaign: campaign.id, message: m.id, error: item?.error });
      return sb.from("email_messages").update({ status: "failed" }).eq("id", m.id);
    }),
  );
  return { sent: result.items.filter((item) => item.ok).length, ok: true };
}

/** Holds the campaign for this job (or extends the hold). False when another job has it or it was stopped. */
async function hold(sb: ServiceClient, id: string, now: Date, renew: boolean): Promise<boolean> {
  let query = sb.from("email_campaigns").update({ locked_until: new Date(Date.now() + LEASE_MS).toISOString() }).eq("id", id).eq("status", "sending");
  if (!renew) query = query.or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`);
  const { data, error } = await query.select("id");
  if (error) console.error("[campaigns] hold failed", { campaign: id, error: error.message });
  return Boolean(data?.length);
}

/** Queues every recipient once (safe to repeat) and records how many there are. */
async function enqueue(sb: ServiceClient, id: string): Promise<void> {
  const { error } = await sb.rpc("enqueue_campaign", { p_campaign_id: id });
  if (error) throw new Error(`enqueue failed: ${error.message}`);
  const { count, error: countError } = await sb.from("email_messages").select("id", { count: "exact", head: true }).eq("campaign_id", id);
  if (countError) throw new Error(`count failed: ${countError.message}`);
  await sb.from("email_campaigns").update({ recipients: count ?? 0 }).eq("id", id);
}

async function nextBatch(sb: ServiceClient, id: string): Promise<QueuedMessage[]> {
  const { data, error } = await sb.from("email_messages").select("id, user_id, to_email").eq("campaign_id", id).eq("status", "queued").order("id").limit(BATCH);
  if (error) throw new Error(`queue unavailable: ${error.message}`);
  return (data ?? []) as QueuedMessage[];
}

async function finish(sb: ServiceClient, id: string): Promise<void> {
  await sb.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), locked_until: null }).eq("id", id).eq("status", "sending");
}

/** Sends one campaign's queued messages until it's done, time runs out, or Resend fails. */
async function sendCampaign(sb: ServiceClient, campaign: CampaignRow, now: Date, deadline: number, settings: EmailSettings): Promise<number> {
  if (!(await hold(sb, campaign.id, now, false))) return 0;
  let sent = 0;
  try {
    if (campaign.recipients === null) await enqueue(sb, campaign.id);
    const startedAt = new Date(campaign.started_at ?? now.toISOString()).getTime();
    while (Date.now() < deadline) {
      if (now.getTime() - startedAt > GIVE_UP_MS) {
        console.error("[campaigns] giving up on unsent messages", { campaign: campaign.id });
        await sb.from("email_messages").update({ status: "failed" }).eq("campaign_id", campaign.id).eq("status", "queued");
        await finish(sb, campaign.id);
        break;
      }
      const batch = await nextBatch(sb, campaign.id);
      if (batch.length === 0) {
        await finish(sb, campaign.id);
        break;
      }
      const result = await sendBatch(sb, campaign, batch, settings);
      sent += result.sent;
      // Resend is down or limiting: the rest waits for the next job. Stopped by an admin: done.
      if (!result.ok || !(await hold(sb, campaign.id, now, true))) break;
    }
  } catch (e: unknown) {
    console.error("[campaigns] send failed", { campaign: campaign.id, error: e instanceof Error ? e.message : String(e) });
  } finally {
    await sb.from("email_campaigns").update({ locked_until: null }).eq("id", campaign.id);
  }
  return sent;
}

/** Sends every campaign that's due, until the time budget runs out. Returns how many emails went out. */
export async function sendDueCampaigns(sb: ServiceClient, now: Date, deadline: number): Promise<{ ok: boolean; sent: number }> {
  const { data, error } = await sb
    .from("email_campaigns")
    .select(CAMPAIGN_COLUMNS)
    .or(`status.eq.sending,and(status.eq.scheduled,scheduled_at.lte.${now.toISOString()})`)
    .order("scheduled_at");
  if (error) {
    console.error("[campaigns] load failed", { error: error.message });
    return { ok: false, sent: 0 };
  }
  const due = (data ?? []) as unknown as CampaignRow[];
  if (due.length === 0) return { ok: true, sent: 0 };
  const settings = await loadEmailSettings(sb);
  if (!hasPostalAddress(settings)) {
    console.error("[campaigns] no postal address in Settings → Email; campaigns wait until it's set");
    return { ok: false, sent: 0 };
  }
  let sent = 0;
  for (const row of due) {
    if (Date.now() > deadline) break;
    let campaign = row;
    if (row.status === "scheduled") {
      const { data: claimed } = await sb.from("email_campaigns").update({ status: "sending", started_at: now.toISOString() }).eq("id", row.id).eq("status", "scheduled").select("id");
      if (!claimed?.length) continue;
      campaign = { ...row, status: "sending", started_at: now.toISOString() };
    }
    sent += await sendCampaign(sb, campaign, now, deadline, settings);
  }
  return { ok: true, sent };
}
