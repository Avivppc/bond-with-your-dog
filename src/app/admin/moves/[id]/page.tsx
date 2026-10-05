import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { readTextList } from "@/lib/content/lists";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, Card, Notice, PageHeader, StatusPill } from "@/app/admin/_components/ui";
import { ConfirmSubmit } from "@/app/admin/_components/ConfirmSubmit";
import { MOVE_FORM_ID, MoveForm } from "../MoveForm";
import { MOVE_COLUMNS, loadPlacementOptions, type MoveRow } from "../data";
import { deleteMove } from "../actions";

export const metadata = { title: "Move" };

export const dynamic = "force-dynamic";

export default async function EditMovePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaff("content");
  const { id } = await params;
  const { saved, error } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [{ data, error: loadError }, options] = await Promise.all([
    createServiceClient().from("moves").select(MOVE_COLUMNS).eq("id", id).maybeSingle(),
    loadPlacementOptions(),
  ]);
  if (loadError) console.error("[admin/moves] move load failed", { id, error: loadError.message });
  if (!data) notFound();
  const move = data as MoveRow;

  return (
    <div>
      <PageHeader
        title={move.name}
        crumbs={[{ label: "Moves Library", href: "/admin/moves" }, { label: move.name }]}
        actions={
          <>
            <StatusPill tone={move.published ? "published" : "draft"}>{move.published ? "Published" : "Draft"}</StatusPill>
            {move.published && (
              <Link href={`/moves?move=${encodeURIComponent(move.slug)}`} target="_blank" className={BTN_SECONDARY}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  visibility
                </span>
                Preview
              </Link>
            )}
            <button type="submit" form={MOVE_FORM_ID} className={BTN_PRIMARY}>
              Save
            </button>
          </>
        }
      />
      {(saved || error) && <div className="mb-5">{error ? <Notice tone="error">{error}</Notice> : <Notice tone="success">Move saved.</Notice>}</div>}
      <MoveForm
        move={{ ...move, steps: readTextList(move.steps) }}
        courses={options.courses}
        lessons={options.lessons}
        aside={
          <Card title="Delete move" description="Removes it from the library and members' skill tracking.">
            <form action={deleteMove}>
              <input type="hidden" name="id" value={move.id} />
              <ConfirmSubmit className={BTN_DANGER} message={`Delete "${move.name}"? Members' skill levels for it are deleted too.`}>
                Delete move
              </ConfirmSubmit>
            </form>
          </Card>
        }
      />
    </div>
  );
}
