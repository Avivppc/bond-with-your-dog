import Link from "next/link";
import { SoonLink } from "@/components/app/SoonLink";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/member/viewer";
import { dogSubtitle } from "@/components/app/Topbar";
import { ArrowLink, Ms } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { PracticePrefsCard, ProfileHeaderActions } from "./ProfileForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireMember("/profile");
  const supabase = await createClient();
  const [{ count: courses }, { count: certificates }, sessionsRes] = await Promise.all([
    supabase.from("enrollments").select("course_id", { count: "exact", head: true }),
    supabase.from("certificates").select("code", { count: "exact", head: true }).eq("user_id", viewer.userId),
    supabase.from("practice_sessions").select("dog_id"),
  ]);
  const sessionsByDog = new Map<string, number>();
  for (const s of (sessionsRes.data ?? []) as { dog_id: string | null }[]) if (s.dog_id) sessionsByDog.set(s.dog_id, (sessionsByDog.get(s.dog_id) ?? 0) + 1);
  const p = viewer.profile;

  return (
    <>
      <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- member photo
          <img className="avatar xl" src={p.avatar_url} alt="" style={{ width: 104, height: 104 }} />
        ) : (
          <div className="avatar-initials" style={{ width: 104, height: 104, fontSize: 34 }}>
            {viewer.initials}
          </div>
        )}
        <div className="stack" style={{ gap: 6, flex: 1, minWidth: 220 }}>
          <span className="eyebrow">
            Member since <LocalTime iso={viewer.createdAt} format="monthYear" />
          </span>
          <h1 className="h1">{p.full_name || viewer.firstName}</h1>
          <p className="muted">{[p.location, viewer.email].filter(Boolean).join(" · ")}</p>
        </div>
        <ProfileHeaderActions fullName={p.full_name ?? ""} location={p.location ?? ""} avatarUrl={p.avatar_url} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2 className="h3">Your dogs</h2>
            <ArrowLink href="/dogs">Manage</ArrowLink>
          </div>
          {viewer.dogs.length === 0 ? (
            <Link className="list-row" href="/dogs/new">
              <Ms name="add_circle" color="var(--teal)" />
              <div className="grow">Add your dog</div>
            </Link>
          ) : (
            <div className="list">
              {viewer.dogs.map((d) => (
                <Link key={d.id} className="list-row" href={`/dogs/${d.id}`}>
                  {d.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dog photo
                    <img className="avatar" src={d.photo_url} alt="" />
                  ) : (
                    <span className="avatar-initials" style={{ width: 44, height: 44 }}>
                      {d.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="grow">
                    <div className="title">{d.name}</div>
                    <div className="faint">
                      {[dogSubtitle(d), `${sessionsByDog.get(d.id) ?? 0} practice sessions`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {viewer.activeDog?.id === d.id && <span className="pill reliable">Active</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
        <PracticePrefsCard goals={p.goals} sessionMinutes={p.session_minutes} practiceDays={p.practice_days} />
      </div>

      <div className="grid-3">
        <Link className="card tight" href="/membership">
          <Ms name="card_membership" color="var(--teal)" />
          <b>Membership &amp; purchases</b>
          <span className="faint">
            {courses ?? 0} {courses === 1 ? "course" : "courses"} · orders and subscriptions
          </span>
        </Link>
        <Link className="card tight" href="/my-courses">
          <Ms name="workspace_premium" color="var(--teal)" />
          <b>Certificates</b>
          <span className="faint">{certificates ?? 0} earned</span>
        </Link>
        <Link className="card tight" href="/settings">
          <Ms name="tune" color="var(--teal)" />
          <b>Settings &amp; privacy</b>
          <span className="faint">Notifications, account, your data</span>
        </Link>
      </div>
      <div className="grid-3">
        {[
          { href: "/community", icon: "groups", label: "Community", sub: "Feed, live Q&A and stories" },
          { href: "/moves", icon: "auto_stories", label: "Moves Library", sub: "Every move with its cue" },
          { href: "/help", icon: "help", label: "Help", sub: "Questions and support" },
        ].map((l) => (
          <SoonLink key={l.href} className="card tight" href={l.href}>
            <Ms name={l.icon} color="var(--teal)" />
            <b>{l.label}</b>
            <span className="faint">{l.sub}</span>
          </SoonLink>
        ))}
      </div>
      <div className="row" style={{ gap: 20 }}>
        <ArrowLink href="/refer">Refer a friend</ArrowLink>
        <ArrowLink href="/welcome?again=1">Redo the welcome questions</ArrowLink>
        <ArrowLink href="/home?tour=home">Take the guided tour again</ArrowLink>
      </div>
      <form action="/auth/logout" method="post">
        <button type="submit" className="btn btn-ghost btn-sm">
          <Ms name="logout" size="sm" />
          Sign out
        </button>
      </form>
    </>
  );
}
