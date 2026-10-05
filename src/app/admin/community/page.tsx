import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePage } from "@/lib/content/pagination";
import { LocalTime } from "@/components/ui/LocalTime";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, INPUT, LABEL, Notice, PageHeader, StatusPill, Tabs, type TabItem } from "@/app/admin/_components/ui";
import { StatCard } from "@/app/admin/_components/list-kit";
import { saveCommunitySettings } from "./actions";
import { CoverImageField } from "./CoverImageField";
import { ChallengeForm, ChannelForm, StepForm, type ChallengeRecord, type ChannelRecord, type StepRecord } from "./forms";
import { MeetupForm, type MeetupRecord } from "./MeetupForm";
import { MembersTab } from "./MembersTab";
import { ModerationTab } from "./ModerationTab";

export const metadata = { title: "Community" };

export const dynamic = "force-dynamic";

const TABS = ["settings", "channels", "challenges", "meetups", "members", "moderation"] as const;
type TabKey = (typeof TABS)[number];
const MAX_SEARCH = 100;

interface CommunitySearch {
  tab?: string;
  saved?: string;
  error?: string;
  q?: string;
  page?: string;
}

export default async function AdminCommunityPage({ searchParams }: { searchParams: Promise<CommunitySearch> }) {
  await requireStaff("content");
  const { tab: tabParam, saved, error, q, page } = await searchParams;
  const tab: TabKey = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as TabKey) : "settings";
  const sb = createServiceClient();

  const [settingsRes, postsRes, reviewRes, commentsRes] = await Promise.all([
    sb.from("community_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("community_posts").select("id", { count: "exact", head: true }).neq("status", "removed"),
    sb.from("community_posts").select("id", { count: "exact", head: true }).or("status.eq.pending,report_count.gt.0").neq("status", "removed"),
    sb.from("community_comments").select("id", { count: "exact", head: true }).eq("removed", false),
  ]);
  const settings = settingsRes.data;
  const toReview = reviewRes.count ?? 0;
  const tabs: TabItem[] = TABS.map((key) => ({
    key,
    label: key === "moderation" && toReview > 0 ? `Moderation (${toReview})` : key[0].toUpperCase() + key.slice(1),
    href: `/admin/community?tab=${key}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community"
        description="Feed, channels, challenges, meetups and members of your community."
        actions={
          <>
            {toReview > 0 && (
              <Link href="/admin/community?tab=moderation" className={BTN_SECONDARY}>
                Review posts ({toReview})
              </Link>
            )}
            <Link href="/community" target="_blank" className={BTN_PRIMARY}>
              Go to community ↗
            </Link>
          </>
        }
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Posts" value={String(postsRes.count ?? 0)} />
        <StatCard label="Comments" value={String(commentsRes.count ?? 0)} />
        <StatCard label="Waiting for review" value={String(toReview)} href="/admin/community?tab=moderation" />
      </section>
      <Tabs items={tabs} active={tab} />
      {saved && <Notice tone="success">Saved.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {tab === "settings" && (
        <Card title="Community settings">
          <form action={saveCommunitySettings} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Name</span>
              <input name="name" defaultValue={settings?.name ?? ""} required maxLength={80} className={INPUT} />
            </label>
            <CoverImageField label="Cover image" defaultValue={settings?.cover_image_url} />
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={LABEL}>Description</span>
              <textarea name="description" defaultValue={settings?.description ?? ""} rows={2} maxLength={500} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={LABEL}>WhatsApp group link</span>
              <input
                name="whatsapp_url"
                type="url"
                defaultValue={settings?.whatsapp_url ?? ""}
                maxLength={500}
                placeholder="https://chat.whatsapp.com/…"
                className={INPUT}
              />
              <span className="text-xs text-[#6c6a69]">The invite link members open from the community hub (https only). Leave blank if there&apos;s no group.</span>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={LABEL}>Community guidelines</span>
              <textarea name="guidelines" defaultValue={settings?.guidelines ?? ""} rows={4} maxLength={4000} className={INPUT} />
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" name="open_to_students" defaultChecked={settings?.open_to_students ?? true} className="mt-0.5 h-4 w-4 accent-[#343332]" />
              <span className="text-sm">
                Every student with an active course is a member
                <span className="block text-xs text-[#6c6a69]">Off: only offers that include the community give access.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" name="require_approval" defaultChecked={settings?.require_approval ?? false} className="mt-0.5 h-4 w-4 accent-[#343332]" />
              <span className="text-sm">
                Members&apos; posts need approval
                <span className="block text-xs text-[#6c6a69]">New posts wait in the Review feed until the team approves them.</span>
              </span>
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className={BTN_PRIMARY}>
                Save
              </button>
            </div>
          </form>
        </Card>
      )}

      {tab === "channels" && <ChannelsTab />}
      {tab === "challenges" && <ChallengesTab />}
      {tab === "meetups" && <MeetupsTab />}
      {tab === "members" && <MembersTab search={(q ?? "").trim().slice(0, MAX_SEARCH)} page={parsePage(page)} />}
      {tab === "moderation" && <ModerationTab />}
    </div>
  );
}

async function ChannelsTab() {
  const { data } = await createServiceClient().from("community_channels").select("*").order("position").order("name");
  const channels = (data ?? []) as ChannelRecord[];
  return (
    <div className="space-y-4">
      <Card flush title="Channels" description="Topics members post in. Announcement channels are for the team only.">
        <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
          {channels.map((c) => (
            <li key={c.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
                  <span className="font-medium"># {c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-[#6c6a69]">
                    <span className="capitalize">{c.default_view}</span>
                    {c.posting === "staff" && <StatusPill tone="info">Team only</StatusPill>}
                    {c.requires_approval && <StatusPill tone="warning">Approval</StatusPill>}
                  </span>
                </summary>
                <div className="border-t border-[#efeeed] bg-[#fafaf9] p-5">
                  <ChannelForm channel={c} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="New channel">
        <ChannelForm />
      </Card>
    </div>
  );
}

async function ChallengesTab() {
  const sb = createServiceClient();
  const [challengesRes, stepsRes, participantsRes] = await Promise.all([
    sb.from("community_challenges").select("*").order("starts_at", { ascending: false }),
    sb.from("community_challenge_steps").select("*").order("position"),
    sb.from("community_challenge_participants").select("challenge_id, completed_at"),
  ]);
  const challenges = (challengesRes.data ?? []) as ChallengeRecord[];
  const steps = (stepsRes.data ?? []) as StepRecord[];
  const participants = participantsRes.data ?? [];
  return (
    <div className="space-y-4">
      <Card flush title="Challenges">
        {challenges.length === 0 ? (
          <EmptyState title="No challenges yet." />
        ) : (
          <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
            {challenges.map((c) => {
              const mine = steps.filter((s) => s.challenge_id === c.id);
              const joined = participants.filter((p) => p.challenge_id === c.id);
              return (
                <li key={c.id}>
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <span className="font-medium">{c.title}</span>
                      <span className="flex items-center gap-2 text-xs text-[#6c6a69]">
                        <LocalTime iso={c.starts_at} format="dateTime" zoneLabel /> · {mine.length} steps · {joined.length} joined · {joined.filter((p) => p.completed_at).length} completed
                        <StatusPill tone={c.published ? "published" : "draft"}>{c.published ? "Published" : "Draft"}</StatusPill>
                      </span>
                    </summary>
                    <div className="space-y-5 border-t border-[#efeeed] bg-[#fafaf9] p-5">
                      <ChallengeForm challenge={c} />
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Steps</h3>
                        {mine.map((s) => (
                          <StepForm key={s.id} challengeId={c.id} step={s} nextPosition={0} />
                        ))}
                        <StepForm challengeId={c.id} nextPosition={(mine.at(-1)?.position ?? 0) + 1} />
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="New challenge" description="Create it as a draft, add its steps, then publish.">
        <ChallengeForm />
      </Card>
    </div>
  );
}

async function MeetupsTab() {
  const sb = createServiceClient();
  const [meetupsRes, rsvpsRes] = await Promise.all([
    sb.from("community_meetups").select("*").order("starts_at", { ascending: false }).limit(100),
    sb.from("community_rsvps").select("meetup_id"),
  ]);
  const meetups = (meetupsRes.data ?? []) as MeetupRecord[];
  const rsvps = rsvpsRes.data ?? [];
  return (
    <div className="space-y-4">
      <Card flush title="Meetups">
        {meetups.length === 0 ? (
          <EmptyState title="No meetups yet." />
        ) : (
          <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
            {meetups.map((m) => (
              <li key={m.id}>
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="font-medium">{m.title}</span>
                    <span className="flex items-center gap-2 text-xs text-[#6c6a69]">
                      {m.kind === "live_qa" && <StatusPill tone="info">Live Q&amp;A</StatusPill>}
                      <LocalTime iso={m.starts_at} format="dateTime" zoneLabel /> · {rsvps.filter((r) => r.meetup_id === m.id).length} going
                      {m.canceled ? <StatusPill tone="danger">Canceled</StatusPill> : <StatusPill tone={m.published ? "published" : "draft"}>{m.published ? "Published" : "Draft"}</StatusPill>}
                    </span>
                  </summary>
                  <div className="border-t border-[#efeeed] bg-[#fafaf9] p-5">
                    <MeetupForm meetup={m} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="New meetup" description="Live Q&A sessions can also be managed under Coaching → Live Q&A.">
        <MeetupForm />
      </Card>
    </div>
  );
}
