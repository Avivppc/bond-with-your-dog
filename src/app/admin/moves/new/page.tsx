import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { BTN_PRIMARY, BTN_SECONDARY, PageHeader } from "@/app/admin/_components/ui";
import { MOVE_FORM_ID, MoveForm, type MoveDefaults } from "../MoveForm";
import { loadPlacementOptions } from "../data";

export const dynamic = "force-dynamic";

const EMPTY_MOVE: MoveDefaults = {
  id: null,
  name: "",
  slug: "",
  course_id: null,
  lesson_id: null,
  cue: null,
  summary: null,
  steps: [],
  video_url: null,
  image_url: null,
  loads_joints: false,
  gentle_alternative: null,
  position: 0,
  published: false,
};

export default async function NewMovePage() {
  await requireStaff("content");
  const { courses, lessons } = await loadPlacementOptions();
  return (
    <div>
      <PageHeader
        title="New move"
        crumbs={[{ label: "Moves Library", href: "/admin/moves" }, { label: "New move" }]}
        actions={
          <>
            <Link href="/admin/moves" className={BTN_SECONDARY}>
              Cancel
            </Link>
            <button type="submit" form={MOVE_FORM_ID} className={BTN_PRIMARY}>
              Save
            </button>
          </>
        }
      />
      <MoveForm move={EMPTY_MOVE} courses={courses} lessons={lessons} />
    </div>
  );
}
