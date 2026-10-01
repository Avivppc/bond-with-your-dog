import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/member/viewer";
import { dogSubtitle } from "@/components/app/Topbar";
import { Ms, Tip } from "@/components/app/ui";
import { LIMITATIONS } from "@/lib/member/schemas";
import { MakeActive } from "./MakeActive";
import { plural } from "@/lib/feedback/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your dogs" };

const LIMIT_LABEL = Object.fromEntries(LIMITATIONS.map((l) => [l.key, l.label]));

export default async function DogsPage() {
  const viewer = await requireMember("/dogs");
  const supabase = await createClient();
  const [sessionsRes, skillsRes] = await Promise.all([supabase.from("practice_sessions").select("dog_id"), supabase.from("dog_skills").select("dog_id, level")]);
  const count = (rows: { dog_id: string | null }[] | null, id: string) => (rows ?? []).filter((r) => r.dog_id === id).length;
  const ready = (id: string) => ((skillsRes.data ?? []) as { dog_id: string; level: string }[]).filter((s) => s.dog_id === id && s.level !== "learning").length;
  const names = viewer.dogs.map((d) => d.name);
  const anyLimits = viewer.dogs.some((d) => d.limitations.length > 0);

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Your dogs</span>
        <h1 className="h1">{names.length === 0 ? "Add your dog" : names.length <= 3 ? names.join(" & ") : `${names.length} dogs`}</h1>
        <p className="lede">Each dog keeps their own practice, skills and feedback. Switch anytime from the dog chip at the top.</p>
      </div>
      <div className="grid-3">
        {viewer.dogs.map((d) => {
          const active = viewer.activeDog?.id === d.id;
          return (
            <div key={d.id} className="dog-card">
              <div className="media">
                {d.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dog photo
                  <img src={d.photo_url} alt={d.name} />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", background: "var(--tint)" }}>
                    <span className="avatar-initials" style={{ width: 96, height: 96, fontSize: 36 }}>
                      {d.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="body">
                <div className="between" style={{ alignItems: "center" }}>
                  <h2 className="h2">{d.name}</h2>
                  {active ? <span className="pill reliable">Active</span> : <MakeActive dogId={d.id} />}
                </div>
                <p className="faint">{dogSubtitle(d) || "Tell us a little more about them"}</p>
                {d.limitations.length > 0 && (
                  <div className="row">
                    {d.limitations.map((l) => (
                      <span key={l} className="chip">
                        <Ms name="healing" size="sm" color="var(--cognac)" />
                        {d.limitation_note && d.limitations.length === 1 ? d.limitation_note : LIMIT_LABEL[l]}
                      </span>
                    ))}
                  </div>
                )}
                <div className="between" style={{ alignItems: "center" }}>
                  <span className="faint">
                    {plural(count(sessionsRes.data, d.id), "session")} · {plural(ready(d.id), "move")} ready
                  </span>
                  <Link className="link" href={`/dogs/${d.id}`}>
                    Edit
                    <Ms name="edit" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        <Link className="dog-card add" href="/dogs/new">
          <Ms name="add_circle" />
          Add {viewer.dogs.length ? "another" : "your"} dog
          <span className="faint" style={{ fontWeight: 400 }}>
            Takes about a minute
          </span>
        </Link>
      </div>
      {anyLimits && (
        <Tip icon="healing" warm>
          For dogs with a limitation, moves that load the joints (paws-up, bunny hop, jumps) show a gentler alternative first.
        </Tip>
      )}
    </>
  );
}
