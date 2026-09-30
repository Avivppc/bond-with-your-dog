import { notFound } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/app/ui";
import { isOwnMusicPath, ROUTINE_MUSIC_BUCKET } from "@/lib/practice/music";
import { paletteOrder } from "@/lib/practice/moves";
import { parseRoutineItems } from "@/lib/practice/timeline";
import { levelMap, loadDogSkills, loadPublishedMoves, MOVE_FALLBACK_IMAGE } from "@/lib/practice/server/moves";
import { RoutineBuilder } from "./RoutineBuilder";
import { RoutineSettings } from "./RoutineSettings";

export const metadata = { title: "Routine builder · Bonded" };

const MUSIC_URL_SECONDS = 60 * 60 * 2;

export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireMember(`/routine/${id}`);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: routine, error } = await supabase
    .from("routines")
    .select("id, name, items, music_path, music_name, duration_seconds, bpm, sent_for_feedback_at, dog_id")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("[routine] load failed", error.message);
  if (!routine) notFound();

  const dog = viewer.dogs.find((d) => d.id === routine.dog_id) ?? viewer.activeDog;
  const [moves, skills] = await Promise.all([loadPublishedMoves(), loadDogSkills(dog?.id ?? null)]);
  const levels = levelMap(skills);
  const items = parseRoutineItems(routine.items);

  // Names for moves already on the timeline, even if one was unpublished since.
  const missing = [...new Set(items.map((i) => i.move_id))].filter((mid) => !moves.some((m) => m.id === mid));
  const extra = missing.length ? (await supabase.from("moves").select("id, name").in("id", missing)).data ?? [] : [];
  const names = Object.fromEntries([...moves.map((m) => [m.id, m.name]), ...extra.map((m) => [m.id as string, m.name as string])]);

  const path = routine.music_path as string | null;
  const hasMusic = Boolean(path && routine.duration_seconds && isOwnMusicPath(path, viewer.userId));
  let musicUrl: string | null = null;
  if (hasMusic && path) {
    const signed = await createServiceClient().storage.from(ROUTINE_MUSIC_BUCKET).createSignedUrl(path, MUSIC_URL_SECONDS);
    if (signed.error) console.error("[routine] music url failed", signed.error.message);
    musicUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <>
      <Breadcrumbs items={[{ href: "/routine", label: "Routines" }, { label: routine.name as string }]} />
      <RoutineBuilder
        key={routine.id as string}
        routine={{
          id: routine.id as string,
          name: routine.name as string,
          items,
          music: hasMusic && path ? { path, name: (routine.music_name as string | null) ?? "Your music", durationSeconds: routine.duration_seconds as number } : null,
          bpm: (routine.bpm as number | null) ?? null,
          sentAt: (routine.sent_for_feedback_at as string | null) ?? null,
        }}
        musicUrl={musicUrl}
        palette={paletteOrder(moves, levels).map((m) => ({ id: m.id, name: m.name, image: m.imageUrl ?? MOVE_FALLBACK_IMAGE, level: levels.get(m.id) ?? null }))}
        names={names}
        dogName={dog?.name ?? "your dog"}
      />
      <RoutineSettings id={routine.id as string} name={routine.name as string} />
    </>
  );
}
