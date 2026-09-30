import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { matchesMoveSearch } from "@/lib/content/moves";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, INPUT, Notice, PageHeader, StatusPill } from "@/app/admin/_components/ui";
import type { MoveRow } from "./data";

export const dynamic = "force-dynamic";

const MAX_MOVES = 500;
type ListedMove = Pick<MoveRow, "id" | "slug" | "name" | "course_id" | "lesson_id" | "cue" | "image_url" | "position" | "published">;

export default async function MovesLibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string; error?: string }> }) {
  await requireStaff("content");
  const { q = "", deleted, error } = await searchParams;
  const query = q.slice(0, 100);
  const sb = createServiceClient();

  const [movesRes, coursesRes] = await Promise.all([
    sb.from("moves").select("id, slug, name, course_id, lesson_id, cue, image_url, position, published").order("position").order("name").limit(MAX_MOVES),
    sb.from("courses").select("id, title"),
  ]);
  if (movesRes.error) console.error("[admin/moves] list load failed", movesRes.error.message);
  const all = (movesRes.data ?? []) as ListedMove[];
  const lessonIds = [...new Set(all.flatMap((m) => (m.lesson_id ? [m.lesson_id] : [])))];
  const lessonsRes = lessonIds.length ? await sb.from("lessons").select("id, title").in("id", lessonIds) : null;
  const courseTitle = new Map(((coursesRes.data ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));
  const lessonTitle = new Map(((lessonsRes?.data ?? []) as { id: string; title: string }[]).map((l) => [l.id, l.title]));
  const moves = all.filter((m) => matchesMoveSearch(m, query));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moves Library"
        description="Every move members can look up, with its cue, steps and clip."
        actions={
          <Link href="/admin/moves/new" className={BTN_PRIMARY}>
            <span aria-hidden>+</span> New move
          </Link>
        }
      />
      {deleted && <Notice tone="success">Move deleted.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <Card flush>
        <form className="-mt-4 flex flex-wrap items-center gap-2 px-5 pt-5" role="search">
          <input name="q" defaultValue={query} placeholder="Search moves" aria-label="Search moves" className={`${INPUT} max-w-xs`} />
          <button type="submit" className={BTN_SECONDARY}>
            Search
          </button>
          {query && (
            <Link href="/admin/moves" className="text-sm text-[#6c6a69] hover:underline">
              Clear
            </Link>
          )}
          <span className="ml-auto text-sm text-[#6c6a69]">
            Displaying {moves.length} of {all.length} {all.length === 1 ? "move" : "moves"}
          </span>
        </form>
        {moves.length === 0 ? (
          <EmptyState title={all.length === 0 ? "No moves yet." : "No moves match your search."}>
            {all.length === 0 && (
              <Link href="/admin/moves/new" className="font-medium text-[#1a1a19] underline">
                Add the first move
              </Link>
            )}
          </EmptyState>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-[#efeeed] text-left text-[#6c6a69]">
                <tr>
                  <th className="px-5 py-3 font-medium">Move</th>
                  <th className="px-3 py-3 font-medium">Chapter</th>
                  <th className="px-3 py-3 font-medium">Lesson</th>
                  <th className="px-3 py-3 font-medium">Cue</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efeeed]">
                {moves.map((m) => (
                  <tr key={m.id} className="hover:bg-[#fafaf9]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/moves/${m.id}`} className="flex items-center gap-3 font-medium hover:underline">
                        <MoveThumb src={m.image_url} />
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[#6c6a69]">{m.course_id ? courseTitle.get(m.course_id) ?? m.course_id : "—"}</td>
                    <td className="px-3 py-3 text-[#6c6a69]">{m.lesson_id ? lessonTitle.get(m.lesson_id) ?? "—" : "—"}</td>
                    <td className="max-w-[16rem] truncate px-3 py-3 text-[#6c6a69]">{m.cue ?? "—"}</td>
                    <td className="px-3 py-3">
                      <StatusPill tone={m.published ? "published" : "draft"}>{m.published ? "Published" : "Draft"}</StatusPill>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#6c6a69]">{m.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MoveThumb({ src }: { src: string | null }) {
  if (!src) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#f0efee] text-[#9b9997]" aria-hidden>
        <span className="material-symbols-outlined text-[20px]">pets</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail from the public bucket
  return <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-[8px] border border-[#e7e6e4] object-cover" />;
}
