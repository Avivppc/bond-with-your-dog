import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/app/admin/_components/ui";
import data from "../../../../../data/kajabi/bonded-courses.json";
import { countPlan, planImport, type KajabiExport } from "@/lib/kajabi-import/plan";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";
// Copying ~60 images from Kajabi's CDN and the lesson PDFs takes a while.
export const maxDuration = 300;

export default async function ImportKajabiPage() {
  await requireStaff("content");
  const plan = planImport(data as KajabiExport);
  const { data: courses } = await createServiceClient().from("courses").select("id, title, published, import_ref").order("created_at");
  const imported = new Set((courses ?? []).filter((c) => c.import_ref).map((c) => c.import_ref));
  const demo = (courses ?? []).filter((c) => !c.import_ref && c.published && !plan.some((p) => p.id === c.id));

  return (
    <div className="space-y-6">
      <PageHeader title="Import from Kajabi" description="Brings Bonded: Foundations, Moves and Let's Dance over from the Kajabi account as draft courses." />
      <Card title="What will be imported">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#6c6a69]">
            <tr>
              <th className="py-2">Course</th>
              <th>Chapter</th>
              <th>Modules</th>
              <th>Lessons</th>
              <th>With text</th>
              <th>Thumbnails</th>
              <th>Downloads</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efeeed]">
            {plan.map((c) => {
              const n = countPlan(c);
              return (
                <tr key={c.id}>
                  <td className="py-2 font-medium">{c.title}</td>
                  <td>{c.chapterNumber}</td>
                  <td>{n.modules}</td>
                  <td>{n.lessons}</td>
                  <td>{n.withText}</td>
                  <td>{n.withThumb}</td>
                  <td>{n.files}</td>
                  <td>{imported.has(c.ref) ? "Already imported" : "Ready"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-[#6c6a69]">
          <li>Courses arrive as drafts. Review them, add the Vimeo link to each lesson, then publish.</li>
          <li>Module and lesson publish states, sub-modules, lesson text, thumbnails and the Foundations paywall come across as in Kajabi.</li>
          <li>Lesson downloads (the 4 Foundations PDFs) are attached to their lessons, as in Kajabi.</li>
          <li>Kajabi hosts its lesson videos itself (Wistia) and they can&apos;t be copied — paste the Vimeo link in each lesson.</li>
          <li>Running the import again never duplicates anything: courses already imported are skipped.</li>
        </ul>
      </Card>
      <Card title="Import">
        <ImportForm demoCourses={demo.map((c) => ({ id: c.id, title: c.title }))} />
      </Card>
    </div>
  );
}
