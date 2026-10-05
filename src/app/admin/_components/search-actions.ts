"use server";

import { requireStaff } from "@/lib/admin";
import { likePattern, searchTerm, type SearchGroup, type SearchHit } from "@/lib/admin-search";
import { canPerform } from "@/lib/staff";
import { createServiceClient } from "@/lib/supabase/admin";

/** ⌘K: a few matches per kind of thing, each linking to where it is edited. */
const PER_GROUP = 5;

type Service = ReturnType<typeof createServiceClient>;
type Finder = (sb: Service, term: string, pattern: string) => Promise<SearchHit[]>;

function logged<T>(label: string, error: { message: string } | null, rows: T[] | null): T[] {
  if (error) console.error(`[admin-search] ${label} failed`, error.message);
  return rows ?? [];
}

const findContacts: Finder = async (sb, term) => {
  const { data, error } = await sb.rpc("admin_list_people", { p_search: term, p_filter: "all", p_limit: PER_GROUP, p_offset: 0 });
  const rows = logged("contacts", error, data as { user_id: string; email: string; full_name: string | null }[] | null);
  return rows.map((r) => ({ label: r.full_name?.trim() || r.email, detail: r.full_name ? r.email : undefined, href: `/admin/people/${r.user_id}`, icon: "person" }));
};

const findCourses: Finder = async (sb, _term, pattern) => {
  const { data, error } = await sb.from("courses").select("id, title, published").ilike("title", pattern).order("title").limit(PER_GROUP);
  return logged("courses", error, data).map((c) => ({ label: c.title, detail: c.published ? undefined : "Draft", href: `/admin/courses/${c.id}`, icon: "school" }));
};

const findLessons: Finder = async (sb, _term, pattern) => {
  const { data, error } = await sb
    .from("lessons")
    .select("id, title, course_id, courses(title)")
    .ilike("title", pattern)
    .order("title")
    .limit(PER_GROUP)
    .returns<{ id: string; title: string; course_id: string; courses: { title: string } | null }[]>();
  return logged("lessons", error, data).map((l) => ({ label: l.title, detail: l.courses?.title, href: `/admin/courses/${l.course_id}/lessons/${l.id}`, icon: "play_lesson" }));
};

const findMoves: Finder = async (sb, _term, pattern) => {
  const { data, error } = await sb.from("moves").select("id, name").ilike("name", pattern).order("name").limit(PER_GROUP);
  return logged("moves", error, data).map((m) => ({ label: m.name, href: `/admin/moves/${m.id}`, icon: "pets" }));
};

const findSitePages: Finder = async (sb, _term, pattern) => {
  const { data, error } = await sb.from("site_pages").select("id, title, slug").or(`title.ilike.${pattern},slug.ilike.${pattern}`).order("title").limit(PER_GROUP);
  return logged("site pages", error, data).map((p) => ({ label: p.title, detail: `/${p.slug}`, href: `/site-editor/${p.id}`, icon: "web" }));
};

const findOffers: Finder = async (sb, _term, pattern) => {
  const { data, error } = await sb.from("offers").select("id, title").ilike("title", pattern).order("title").limit(PER_GROUP);
  return logged("offers", error, data).map((o) => ({ label: o.title, href: `/admin/offers/${o.id}`, icon: "sell" }));
};

const findFlows: Finder = async (sb, _term, pattern) => {
  const { data, error } = await sb.from("email_flows").select("id, name").ilike("name", pattern).order("name").limit(PER_GROUP);
  return logged("email flows", error, data).map((f) => ({ label: f.name, href: `/admin/email-flows/${f.id}`, icon: "account_tree" }));
};

const CONTENT_FINDERS: [string, Finder][] = [
  ["Courses", findCourses],
  ["Lessons", findLessons],
  ["Moves", findMoves],
  ["Website pages", findSitePages],
];
const SALES_FINDERS: [string, Finder][] = [
  ["Offers", findOffers],
  ["Email flows", findFlows],
];

/** Everything the staff member may open that matches; contacts first (the most common search). */
export async function adminSearch(raw: string): Promise<SearchGroup[]> {
  const { role } = await requireStaff("content");
  const term = searchTerm(typeof raw === "string" ? raw : "");
  if (!term) return [];

  const sales = canPerform(role, "sales");
  const finders: [string, Finder][] = [...(sales ? [["Contacts", findContacts] as [string, Finder]] : []), ...CONTENT_FINDERS, ...(sales ? SALES_FINDERS : [])];
  const sb = createServiceClient();
  const pattern = likePattern(term);
  const results = await Promise.all(
    finders.map(async ([group, find]) => {
      try {
        return { group, hits: await find(sb, term, pattern) };
      } catch (error) {
        console.error(`[admin-search] ${group} threw`, error);
        return { group, hits: [] };
      }
    }),
  );
  const groups = results.filter((g) => g.hits.length > 0);
  if (!sales) return groups;
  // Always offer the full contacts list for this search, like the old top-bar box did.
  const allContacts = { label: `Search all contacts for "${term}"`, href: `/admin/people?q=${encodeURIComponent(term)}`, icon: "manage_search" };
  return [...groups, { group: "More", hits: [allContacts] }];
}
