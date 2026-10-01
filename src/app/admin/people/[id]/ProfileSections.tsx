import Link from "next/link";
import { formatAmounts } from "@/lib/admin-helpers/money";
import { Card, StatusPill } from "../../_components/ui";
import { Avatar, shortDate } from "../../_components/list-kit";
import type { PersonDetail } from "../_lib/person-data";
import { AnswersEditor } from "./AnswersEditor";
import { DogsEditor } from "./DogsEditor";

const GOALS: Record<string, string> = {
  bond: "Build our bond",
  tricks: "Learn tricks",
  dance: "Dance together",
  calm: "A calmer dog",
  job: "Give my dog a job",
  perform: "Perform on stage",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PersonHeader({ person }: { person: PersonDetail }) {
  const name = person.profile.fullName || person.email.split("@")[0];
  return (
    <header className="flex flex-wrap items-center gap-4">
      <Avatar name={name} src={person.profile.avatarUrl} size={64} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-[24px] font-semibold tracking-tight">{name}</h1>
          {person.staffRole ? (
            <StatusPill tone="info">{person.staffRole === "owner" ? "Owner" : "Editor"}</StatusPill>
          ) : (
            <StatusPill tone="draft">Member</StatusPill>
          )}
          {!person.emailConfirmed && <StatusPill tone="warning">Invitation not accepted</StatusPill>}
        </div>
        <p className="mt-0.5 text-[14px] text-[#3d3c3a]">{person.email}</p>
        <p className="mt-1 text-[12px] text-[#6c6a69]">
          Joined {shortDate(person.createdAt)} · Last sign-in {person.lastSignInAt ? shortDate(person.lastSignInAt) : "never"} · Lifetime value{" "}
          {formatAmounts(person.lifetimeValue)} · Email marketing: {person.marketingOptIn ? "subscribed" : "not subscribed"}
        </p>
      </div>
    </header>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2">
      <dt className="text-[#6c6a69]">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function DogsAndOnboarding({ person }: { person: PersonDetail }) {
  const { profile } = person;
  return (
    <Card title="Dogs & onboarding">
      <dl className="divide-y divide-[#efeeed] text-[14px]">
        <Row label="Onboarding">{profile.onboardedAt ? `Finished ${shortDate(profile.onboardedAt)}` : "Not finished yet"}</Row>
        <Row label="Goals">{profile.goals.length ? profile.goals.map((g) => GOALS[g] ?? g).join(", ") : "—"}</Row>
        <Row label="Session length">{profile.sessionMinutes ? `${profile.sessionMinutes} minutes` : "—"}</Row>
        <Row label="Practice days">{profile.practiceDays.length ? [...profile.practiceDays].sort().map((d) => DAYS[d] ?? d).join(", ") : "—"}</Row>
        {profile.location && <Row label="Location">{profile.location}</Row>}
      </dl>
      <AnswersEditor
        userId={person.userId}
        answers={{ goals: profile.goals, sessionMinutes: profile.sessionMinutes, practiceDays: profile.practiceDays, location: profile.location, onboardedAt: profile.onboardedAt }}
      />
      <h3 className="mt-5 text-[14px] font-semibold">Dogs</h3>
      <DogsEditor userId={person.userId} dogs={person.dogs} />
    </Card>
  );
}

const VIDEO_STATUS: Record<string, string> = { uploading: "Uploading", waiting: "Waiting for Roni", replied: "Replied", errored: "Upload failed" };

export function ActivitySection({ person }: { person: PersonDetail }) {
  const { activity } = person;
  const stats = [
    { label: "Lessons completed", value: activity.lessonsCompleted },
    { label: "Practice sessions", value: activity.practiceSessions },
    { label: "Minutes practised", value: activity.practiceMinutes },
    { label: "Community points", value: activity.communityPoints },
  ];
  return (
    <Card title="Activity">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[8px] bg-[#f8f8f8] px-3 py-2">
            <dt className="text-[12px] text-[#6c6a69]">{s.label}</dt>
            <dd className="text-[20px] font-semibold tabular-nums">{s.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-5 text-[14px] font-semibold">Videos sent to Roni</h3>
      {person.videos.length === 0 ? (
        <p className="mt-1 text-[14px] text-[#6c6a69]">No videos yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#efeeed] text-[14px]">
          {person.videos.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 py-2">
              <Link href="/studio" className="truncate hover:underline">
                {v.title}
              </Link>
              <span className="shrink-0 text-[12px] text-[#6c6a69]">
                {VIDEO_STATUS[v.status] ?? v.status} · {shortDate(v.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
