import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { Ms, StateCard } from "@/components/app/ui";
import { isMuxConfigured } from "@/lib/feedback/upload-server";
import { loadSubjects } from "@/lib/feedback/queries";
import { buildSubjectOptions, defaultSubject } from "@/lib/feedback/subjects";
import { SendVideoForm } from "./SendVideoForm";

export const metadata = { title: "Send a video to Roni" };

type Search = Promise<{ lesson?: string; move?: string }>;

const TIPS = [
  { icon: "screen_rotation", text: "Film landscape, from the side" },
  { icon: "crop_free", text: "Keep the whole dog in frame" },
  { icon: "timer", text: "30–90 seconds is plenty" },
  { icon: "light_mode", text: "Daylight, no backlight" },
];

export default async function SendVideoPage({ searchParams }: { searchParams: Search }) {
  const viewer = await requireMember("/feedback/new");
  const query = await searchParams;
  const muxReady = isMuxConfigured();

  const { moves, lessons } = await loadSubjects(await createClient(), new Date());
  const options = buildSubjectOptions(moves, lessons);
  const initial = defaultSubject(options, moves, query);

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Feedback</span>
        <h1 className="h1">Send a video to Roni</h1>
        <p className="lede">Roni watches every video and replies with notes pinned to moments in your clip.</p>
      </div>
      <div className="grid-main">
        {muxReady ? (
          <SendVideoForm options={options} initial={initial} dogId={viewer.activeDog?.id ?? null} dogName={viewer.activeDog?.name ?? null} />
        ) : (
          <StateCard
            icon="videocam_off"
            tone="orange"
            eyebrow="Not switched on yet"
            title="Video upload isn't switched on yet"
            action={
              <Link className="btn btn-ghost btn-sm" href="/help#ask">
                Ask Roni&apos;s team
              </Link>
            }
          >
            Sending videos to Roni needs the video service to be connected. Ask Roni&apos;s team, or send your training question in writing
            for now.
          </StateCard>
        )}
        <div className="stack-lg sticky">
          <div className="card tight">
            <span className="eyebrow muted">Filming tips</span>
            {TIPS.map((t) => (
              <div className="check-row" key={t.icon}>
                <span className="ms" style={{ color: "var(--teal)" }} aria-hidden>
                  {t.icon}
                </span>
                {t.text}
              </div>
            ))}
          </div>
          <div className="media" style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- design photo */}
            <img src="/app/img/low.jpg" alt="Roni training a Border Collie on a wide plaza" />
          </div>
          {!viewer.activeDog && (
            <Link className="link" href="/dogs/new">
              Add your dog so Roni knows who she&apos;s watching
              <Ms name="arrow_forward" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
