import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { Ms, Tip } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { parseRoutineItems, formatTimecode } from "@/lib/practice/timeline";
import { NewRoutineForm } from "./NewRoutineForm";

export const metadata = { title: "Routines · Bonded" };

interface RoutineRow {
  id: string;
  name: string;
  music_name: string | null;
  duration_seconds: number | null;
  items: unknown;
  updated_at: string;
  sent_for_feedback_at: string | null;
}

export default async function RoutinesPage() {
  const viewer = await requireMember("/routine");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, music_name, duration_seconds, items, updated_at, sent_for_feedback_at")
    .order("updated_at", { ascending: false });
  if (error) console.error("[routine] list failed", error.message);
  const routines = (data ?? []) as RoutineRow[];
  const dogName = viewer.activeDog?.name ?? "your dog";

  return (
    <>
      <div className="between">
        <div className="head-block">
          <span className="eyebrow">Let&apos;s Dance · Routine builder</span>
          <h1 className="h1">Your routines</h1>
          <p className="lede">Lay {dogName}&apos;s reliable moves on your music, preview it, and send it to Roni for feedback.</p>
        </div>
        {routines.length > 0 && <NewRoutineForm dogId={viewer.activeDog?.id ?? null} compact />}
      </div>
      {routines.length === 0 ? (
        <div className="card">
          <div className="row" style={{ gap: 16 }}>
            <div className="sketch" style={{ width: 52, height: 52, background: "var(--ink)", color: "#ffd59a" }}>
              <Ms name="music_note" fill />
            </div>
            <div>
              <b>Your first routine</b>
              <div className="faint">Name it, upload a song (MP3, M4A, WAV, up to 20 MB) and place moves on the timeline.</div>
            </div>
          </div>
          <NewRoutineForm dogId={viewer.activeDog?.id ?? null} />
        </div>
      ) : (
        <div className="card">
          <div className="list">
            {routines.map((r) => {
              const moves = parseRoutineItems(r.items).length;
              return (
                <Link key={r.id} className="list-row" href={`/routine/${r.id}`}>
                  <div className="sketch" style={{ width: 52, height: 52, background: "var(--ink)", color: "#ffd59a", flexShrink: 0 }}>
                    <Ms name="music_note" fill />
                  </div>
                  <div className="grow">
                    <div className="title">{r.name}</div>
                    <div className="faint">
                      {[r.music_name ? `${r.music_name}${r.duration_seconds ? ` · ${formatTimecode(r.duration_seconds)}` : ""}` : "No music yet", `${moves} ${moves === 1 ? "move" : "moves"}`].join(" · ")}
                      {" · edited "}
                      <LocalTime iso={r.updated_at} format="shortDate" />
                    </div>
                  </div>
                  {r.sent_for_feedback_at && <span className="pill reliable">Sent to Roni</span>}
                  <Ms name="chevron_right" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <Tip icon="tips_and_updates" warm>
        <b>Roni&apos;s tip</b>
        <br />
        Leave two seconds of free movement between hard moves. It gives {dogName} time to breathe and reads as musical, not rushed.
      </Tip>
    </>
  );
}
