import "server-only";
import { stepStats, type MessageRow, type StepStats } from "../stats";
import { fetchAll, type ServiceClient } from "./data";
import { CAMPAIGN_COLUMNS, type CampaignRow } from "./campaigns";

/** Purchases count toward a campaign when made within this many days after it went out. */
export const ATTRIBUTION_DAYS = 7;

export interface CampaignStats {
  emails: StepStats;
  purchases: number;
  revenueCents: number;
  unsubscribes: number;
}

const EMPTY: CampaignStats = { emails: stepStats([]), purchases: 0, revenueCents: 0, unsubscribes: 0 };

async function statsFor(sb: ServiceClient, campaign: CampaignRow, messages: (MessageRow & { user_id: string | null; to_email: string })[]): Promise<CampaignStats> {
  if (!campaign.started_at || messages.length === 0) return { ...EMPTY, emails: stepStats(messages) };
  const start = campaign.started_at;
  const end = new Date(new Date(start).getTime() + ATTRIBUTION_DAYS * 86_400_000).toISOString();
  const reached = messages.filter((m) => m.status === "sent");
  const users = new Set(reached.map((m) => m.user_id).filter((u): u is string => Boolean(u)));
  const emails = new Set(reached.map((m) => m.to_email.toLowerCase()));
  // Orders and unsubscribes in the window, matched here (thousands of recipients won't fit in a URL).
  const [paid, unsubscribed] = await Promise.all([
    fetchAll<{ user_id: string; amount_cents: number }>((from, to) =>
      sb.from("orders").select("id, user_id, amount_cents").eq("status", "paid").gte("paid_at", start).lte("paid_at", end).order("id").range(from, to),
    ),
    fetchAll<{ user_id: string | null; email: string | null }>((from, to) =>
      sb.from("email_unsubscribes").select("id, user_id, email").gte("unsubscribed_at", start).order("id").range(from, to),
    ),
  ]);
  const orders = paid.filter((o) => users.has(o.user_id));
  return {
    emails: stepStats(messages),
    purchases: orders.length,
    revenueCents: orders.reduce((sum, o) => sum + o.amount_cents, 0),
    unsubscribes: unsubscribed.filter((u) => (u.user_id && users.has(u.user_id)) || (u.email && emails.has(u.email.toLowerCase()))).length,
  };
}

const MESSAGE_COLUMNS = "campaign_id, node_id, variant, status, delivered_at, opened_at, clicked_at, bounced_at, complained_at, user_id, to_email";

export async function loadCampaigns(sb: ServiceClient): Promise<{ campaign: CampaignRow; stats: CampaignStats }[]> {
  const { data, error } = await sb.from("email_campaigns").select(CAMPAIGN_COLUMNS).order("created_at", { ascending: false });
  if (error) console.error("[campaigns] list failed", { error: error.message });
  const campaigns = (data ?? []) as unknown as CampaignRow[];
  const sent = campaigns.filter((c) => c.started_at).map((c) => c.id);
  const messages = sent.length
    ? await fetchAll<MessageRow & { campaign_id: string; user_id: string | null; to_email: string }>((from, to) =>
        sb.from("email_messages").select(MESSAGE_COLUMNS).not("campaign_id", "is", null).in("campaign_id", sent).order("id").range(from, to),
      )
    : [];
  return Promise.all(campaigns.map(async (c) => ({ campaign: c, stats: await statsFor(sb, c, messages.filter((m) => m.campaign_id === c.id)) })));
}

export async function loadCampaign(sb: ServiceClient, id: string): Promise<{ campaign: CampaignRow; stats: CampaignStats } | null> {
  const { data } = await sb.from("email_campaigns").select(CAMPAIGN_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const campaign = data as unknown as CampaignRow;
  const messages = campaign.started_at
    ? await fetchAll<MessageRow & { user_id: string | null; to_email: string }>((from, to) =>
        sb.from("email_messages").select(MESSAGE_COLUMNS).eq("campaign_id", id).order("id").range(from, to),
      )
    : [];
  return { campaign, stats: await statsFor(sb, campaign, messages) };
}
