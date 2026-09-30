import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { BTN_PRIMARY, Card, EmptyState, INPUT, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { CourseThumb } from "../_components/CourseTable";
import { loadAdminCourses } from "../_components/course-stats";
import { dashboardCounts } from "../_components/dashboard-data";
import { shortDate } from "../_components/list-kit";

export const dynamic = "force-dynamic";

interface ProductRow {
  key: string;
  href: string;
  title: string;
  image: string | null;
  members: number | null;
  created: string | null;
  type: "Evergreen course" | "Access group";
  published: boolean;
}

async function loadCommunityProduct(): Promise<ProductRow | null> {
  const [settings, counts] = await Promise.all([
    createServiceClient().from("community_settings").select("name, cover_image_url").eq("id", 1).maybeSingle(),
    dashboardCounts(),
  ]);
  if (settings.error) console.error("[products] community settings failed", settings.error.message);
  if (!settings.data) return null;
  return {
    key: "community",
    href: "/admin/community",
    title: settings.data.name,
    image: settings.data.cover_image_url || null,
    members: counts?.communityMembers ?? null,
    created: null,
    type: "Access group",
    published: true,
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("content");
  const { q } = await searchParams;
  const needle = typeof q === "string" ? q.trim().toLowerCase() : "";
  const [courses, community] = await Promise.all([loadAdminCourses(), loadCommunityProduct()]);

  const all: ProductRow[] = [
    ...courses.map((c) => ({
      key: c.id,
      href: `/admin/courses/${c.id}`,
      title: c.title,
      image: c.image,
      members: c.stats.activeStudents,
      created: c.created_at,
      type: "Evergreen course" as const,
      published: c.published,
    })),
    ...(community ? [community] : []),
  ];
  const rows = needle ? all.filter((p) => p.title.toLowerCase().includes(needle)) : all;

  return (
    <div>
      <PageHeader
        title="All Products"
        actions={
          <Link href="/admin/courses/new" className={BTN_PRIMARY}>
            New product
          </Link>
        }
      />
      <Card flush>
        <form className="-mt-1 px-5 pb-1 pt-4" role="search">
          <label className="relative block max-w-sm">
            <span className="sr-only">Search products</span>
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
              search
            </span>
            <input name="q" defaultValue={needle} placeholder="Search products" className={`${INPUT} pl-9`} />
          </label>
        </form>
        {rows.length === 0 ? (
          <EmptyState title={needle ? "No products match your search." : "No products yet."} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Title</th>
                  <th className={TH}>Members</th>
                  <th className={TH}>Created</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.key} className={TROW}>
                    <td className={TD}>
                      <Link href={p.href} className="flex items-center gap-3 font-medium hover:underline">
                        <CourseThumb src={p.image} />
                        <span className="min-w-0">{p.title}</span>
                      </Link>
                    </td>
                    <td className={`${TD} tabular-nums`}>{p.members === null ? "—" : p.members.toLocaleString("en-US")}</td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(p.created)}</td>
                    <td className={TD}>
                      <span className="rounded-full bg-[#f0efee] px-2.5 py-0.5 text-[12px] font-medium text-[#4b4a48]">{p.type}</span>
                    </td>
                    <td className={TD}>
                      <StatusPill tone={p.published ? "published" : "draft"}>{p.published ? "Published" : "Draft"}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-[#efeeed] px-5 py-3 text-[12px] text-[#6c6a69]">
          Showing <b className="text-[#1a1a19]">{rows.length}</b> of <b className="text-[#1a1a19]">{all.length}</b> products
        </p>
      </Card>
    </div>
  );
}
