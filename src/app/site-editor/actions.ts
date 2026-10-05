"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePageDoc, seoSchema, type PageDoc } from "@/lib/site/page-doc";
import { SECTION_DEFS } from "@/lib/site/registry";
import { ensureSystemPageRow, loadPageRow, pageTag, sanitizeDoc, THEME_TAG } from "@/lib/site/server";
import { slugify, slugProblem, type SystemKey, SYSTEM_PAGES } from "@/lib/site/system-pages";
import { themeSchema } from "@/lib/site/theme";
import { memberAreaSchema } from "@/lib/member-area/settings";
import { MEMBER_AREA_TAG } from "@/lib/member-area/server";
import { storeLibraryImage } from "@/lib/media/server";
import { heroVideo } from "@/lib/site/sections/home";
import { newSection } from "@/lib/site/page-doc";

/** Website editor writes. Every action checks staff access ("content": the people who edit the site). */

export type EditorResult = { ok: true; rev?: number; message?: string } | { ok: false; error: string; conflict?: boolean };

const SITE_MEDIA = "site-media";
const Id = z.string().uuid();

function pathOf(slug: string): string {
  return slug ? `/${slug}` : "/";
}

/** The live page and anything showing it (the cached row, and the rendered page). */
function refreshLive(slug: string) {
  updateTag(pageTag(slug));
  revalidatePath(pathOf(slug));
}

// ---------- Opening and creating pages ----------

export async function openSystemPage(formData: FormData): Promise<void> {
  const { user } = await requireStaff("content");
  const key = String(formData.get("key") ?? "") as SystemKey;
  if (!SYSTEM_PAGES.some((p) => p.key === key)) redirect("/admin/website?error=Unknown+page.");
  const id = await ensureSystemPageRow(createServiceClient(), key, user.id);
  redirect(`/site-editor/${id}`);
}

const NewPage = z.object({ title: z.string().trim().min(1, "Give the page a name.").max(120), slug: z.string().trim().max(60) });

/** A new page starts as a draft with one hero section (nobody sees it until it's published). */
export async function createSitePage(formData: FormData): Promise<void> {
  const { user } = await requireStaff("content");
  const parsed = NewPage.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/website?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const slug = parsed.data.slug || slugify(parsed.data.title);
  const problem = slugProblem(slug);
  if (problem) redirect(`/admin/website?error=${encodeURIComponent(problem)}`);
  const doc: PageDoc = { sections: [newSection(heroVideo, new Set())], assistant: false };
  const { data, error } = await createServiceClient()
    .from("site_pages")
    .insert({ slug, title: parsed.data.title, draft: doc, draft_seo: { title: "", description: "", image: "" }, status: "draft", created_by: user.id, updated_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") redirect(`/admin/website?error=${encodeURIComponent(`bonded.dog/${slug} is already taken by another page.`)}`);
  if (error || !data) {
    console.error("[site] create page failed", { slug, error: error?.message });
    redirect("/admin/website?error=Couldn%27t+create+the+page.+Try+again.");
  }
  revalidatePath("/admin/website");
  redirect(`/site-editor/${data.id}`);
}

// ---------- Drafts ----------

const DraftInput = z.object({
  id: Id,
  rev: z.number().int().min(1),
  title: z.string().trim().min(1, "Give the page a name.").max(120, "The page name can be up to 120 characters."),
  slug: z.string().trim().max(60),
  seo: seoSchema,
  doc: z.unknown(),
});

/** Saves the editor's draft. Refused (conflict) when the page was saved elsewhere since it was opened. */
export async function saveSiteDraft(input: unknown): Promise<EditorResult> {
  const { user } = await requireStaff("content");
  const parsed = DraftInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the page settings." };
  const { id, rev, title, slug, seo } = parsed.data;
  const doc = parsePageDoc(parsed.data.doc, SECTION_DEFS);
  if (!doc.ok) return { ok: false, error: doc.error };
  const sb = createServiceClient();
  const row = await loadPageRow(sb, id);
  if (!row) return { ok: false, error: "This page was deleted." };
  if (!row.system_key && slug !== row.slug) {
    const problem = slugProblem(slug);
    if (problem) return { ok: false, error: problem };
  }
  const { data, error } = await sb.rpc("save_site_page_draft", {
    p_id: id,
    p_rev: rev,
    p_doc: sanitizeDoc(doc.doc),
    p_seo: seo,
    p_title: title,
    p_slug: row.system_key ? row.slug : slug,
    p_staff: user.id,
  });
  if (error?.code === "23505") return { ok: false, error: `bonded.dog/${slug} is already taken by another page.` };
  if (error) {
    console.error("[site] save draft failed", { id, error: error.message });
    return { ok: false, error: "Couldn't save. Check your connection; your changes are still here." };
  }
  if (data === null) return { ok: false, conflict: true, error: "Someone else saved this page in the meantime. Reload to see their version." };
  // A live page that moved: the old address stops showing it and the new one starts now (it may
  // have been cached as "no page here").
  if (row.status === "published" && !row.system_key && slug !== row.slug) {
    refreshLive(row.slug);
    refreshLive(slug);
  }
  return { ok: true, rev: data as number };
}

export async function publishSitePage(id: string): Promise<EditorResult> {
  const { user } = await requireStaff("content");
  if (!Id.safeParse(id).success) return { ok: false, error: "Unknown page." };
  const sb = createServiceClient();
  const row = await loadPageRow(sb, id);
  if (!row) return { ok: false, error: "This page was deleted." };
  const now = new Date().toISOString();
  const { data: published, error } = await sb
    .from("site_pages")
    .update({ published: row.draft, published_seo: row.draft_seo, published_title: row.title, status: "published", has_changes: false, published_at: now, updated_by: user.id })
    .eq("id", id)
    .eq("draft_rev", row.draft_rev)
    .select("id");
  if (error) {
    console.error("[site] publish failed", { id, error: error.message });
    return { ok: false, error: "Couldn't publish. Try again." };
  }
  if (!published?.length) return { ok: false, conflict: true, error: "The page changed while publishing. Publish again." };
  const { error: versionError } = await sb.from("site_page_versions").insert({ page_id: id, title: row.title, doc: row.draft, seo: row.draft_seo, created_by: user.id });
  if (versionError) console.error("[site] version not kept", { id, error: versionError.message });
  refreshLive(row.slug);
  revalidatePath("/admin/website");
  return { ok: true, message: "Published. It's live now." };
}

/** Takes a page made in the editor off the site (built-in pages can't be hidden). */
export async function hideSitePage(id: string): Promise<EditorResult> {
  await requireStaff("content");
  const sb = createServiceClient();
  const row = Id.safeParse(id).success ? await loadPageRow(sb, id) : null;
  if (!row || row.system_key) return { ok: false, error: "Built-in pages stay on the site." };
  const { error } = await sb.from("site_pages").update({ status: "hidden", has_changes: true }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't take the page down. Try again." };
  refreshLive(row.slug);
  revalidatePath("/admin/website");
  return { ok: true, message: "The page is off the site. Publish to bring it back." };
}

export async function deleteSitePage(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = String(formData.get("id") ?? "");
  const sb = createServiceClient();
  const row = Id.safeParse(id).success ? await loadPageRow(sb, id) : null;
  if (!row || row.system_key) redirect("/admin/website?error=Built-in+pages+can%27t+be+deleted.");
  const { error } = await sb.from("site_pages").delete().eq("id", id).is("system_key", null);
  if (error) redirect("/admin/website?error=Couldn%27t+delete+the+page.");
  refreshLive(row.slug);
  revalidatePath("/admin/website");
  redirect("/admin/website?ok=Page+deleted.");
}

/** Throws the draft away: back to what's live. */
export async function discardSiteDraft(id: string): Promise<EditorResult> {
  await requireStaff("content");
  const sb = createServiceClient();
  const row = Id.safeParse(id).success ? await loadPageRow(sb, id) : null;
  if (!row?.published) return { ok: false, error: "This page was never published, so there's nothing to go back to." };
  const { data, error } = await sb
    .from("site_pages")
    .update({ draft: row.published, draft_seo: row.published_seo ?? {}, title: row.published_title ?? row.title, draft_rev: row.draft_rev + 1, has_changes: false })
    .eq("id", id)
    .select("draft_rev")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't discard. Try again." };
  return { ok: true, rev: data.draft_rev as number, message: "Back to the live version." };
}

// ---------- Versions ----------

export interface VersionSummary {
  id: string;
  title: string;
  createdAt: string;
  by: string | null;
}

export async function listSiteVersions(id: string): Promise<VersionSummary[]> {
  await requireStaff("content");
  if (!Id.safeParse(id).success) return [];
  const sb = createServiceClient();
  const { data, error } = await sb.from("site_page_versions").select("id, title, created_at, created_by").eq("page_id", id).order("created_at", { ascending: false }).limit(30);
  if (error) console.error("[site] versions failed", { id, error: error.message });
  const rows = data ?? [];
  const staffIds = [...new Set(rows.map((r) => r.created_by).filter((v): v is string => Boolean(v)))];
  const { data: profiles } = staffIds.length ? await sb.from("profiles").select("id, full_name").in("id", staffIds) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? null]));
  return rows.map((r) => ({ id: r.id as string, title: r.title as string, createdAt: r.created_at as string, by: names.get(r.created_by as string) ?? null }));
}

/** Puts an earlier published version back into the draft (publish to make it live). */
export async function restoreSiteVersion(pageId: string, versionId: string): Promise<EditorResult> {
  await requireStaff("content");
  if (!Id.safeParse(pageId).success || !Id.safeParse(versionId).success) return { ok: false, error: "Unknown version." };
  const sb = createServiceClient();
  const [{ data: version }, row] = await Promise.all([
    sb.from("site_page_versions").select("title, doc, seo").eq("id", versionId).eq("page_id", pageId).maybeSingle(),
    loadPageRow(sb, pageId),
  ]);
  if (!version || !row) return { ok: false, error: "That version is gone." };
  const { data, error } = await sb
    .from("site_pages")
    .update({ draft: version.doc, draft_seo: version.seo, title: version.title, draft_rev: row.draft_rev + 1, has_changes: true })
    .eq("id", pageId)
    .select("draft_rev")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't restore. Try again." };
  return { ok: true, rev: data.draft_rev as number, message: "Restored into your draft. Publish to make it live." };
}

// ---------- Images ----------

export type UploadResult = { url: string } | { error: string };

/** An image for a website section (field "file"), stored in the media library (site-media bucket). */
export async function uploadSiteImage(formData: FormData): Promise<UploadResult> {
  const { user } = await requireStaff("content");
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose an image to upload." };
  return storeLibraryImage(user.id, file);
}

export interface UploadedImage {
  src: string;
  name: string;
  createdAt: string | null;
}

const MAX_LIBRARY = 300;

/** Images uploaded for the website, newest first (one folder per year in the bucket). */
export async function listSiteUploads(): Promise<UploadedImage[]> {
  await requireStaff("content");
  const storage = createServiceClient().storage.from(SITE_MEDIA);
  const { data: folders, error } = await storage.list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (error) {
    console.error("[site images] list failed", { error: error.message });
    return [];
  }
  const years = (folders ?? []).filter((f) => /^\d{4}$/.test(f.name)).map((f) => f.name);
  const lists = await Promise.all(years.map((y) => storage.list(y, { limit: MAX_LIBRARY, sortBy: { column: "created_at", order: "desc" } })));
  return lists
    .flatMap((res, i) => (res.data ?? []).filter((f) => f.id).map((f) => ({ path: `${years[i]}/${f.name}`, createdAt: f.created_at ?? null })))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, MAX_LIBRARY)
    .map((f) => ({ src: storage.getPublicUrl(f.path).data.publicUrl, name: f.path.split("/").pop() ?? f.path, createdAt: f.createdAt }));
}

// ---------- Theme ----------

export async function saveThemeDraft(rev: number, input: unknown): Promise<EditorResult> {
  const { user } = await requireStaff("content");
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the theme." };
  const { data, error } = await createServiceClient().rpc("save_site_theme_draft", { p_rev: rev, p_theme: parsed.data, p_staff: user.id });
  if (error) {
    console.error("[site] theme save failed", { error: error.message });
    return { ok: false, error: "Couldn't save. Check your connection; your changes are still here." };
  }
  if (data === null) return { ok: false, conflict: true, error: "Someone else changed the theme in the meantime. Reload to see their version." };
  return { ok: true, rev: data as number };
}

export async function publishTheme(): Promise<EditorResult> {
  const { user } = await requireStaff("content");
  const sb = createServiceClient();
  const { data: row } = await sb.from("site_theme").select("draft").eq("id", 1).maybeSingle();
  const parsed = themeSchema.safeParse(row?.draft);
  if (!parsed.success) return { ok: false, error: "Save a theme change first." };
  const { error } = await sb.from("site_theme").update({ published: parsed.data, has_changes: false, published_at: new Date().toISOString(), updated_by: user.id }).eq("id", 1);
  if (error) return { ok: false, error: "Couldn't publish the theme. Try again." };
  updateTag(THEME_TAG);
  // Colors, fonts, header and footer are on every page.
  revalidatePath("/", "layout");
  return { ok: true, message: "Theme published. Every page uses it now." };
}

// ---------- Member area ----------

export async function saveMemberAreaDraft(rev: number, input: unknown): Promise<EditorResult> {
  const { user } = await requireStaff("content");
  const parsed = memberAreaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the member area settings." };
  const { data, error } = await createServiceClient().rpc("save_member_area_draft", { p_rev: rev, p_settings: parsed.data, p_staff: user.id });
  if (error) {
    console.error("[member area] save failed", { error: error.message });
    return { ok: false, error: "Couldn't save. Check your connection; your changes are still here." };
  }
  if (data === null) return { ok: false, conflict: true, error: "Someone else changed the member area in the meantime. Reload to see their version." };
  return { ok: true, rev: data as number };
}

export async function publishMemberArea(): Promise<EditorResult> {
  const { user } = await requireStaff("content");
  const sb = createServiceClient();
  const { data: row } = await sb.from("member_area").select("draft").eq("id", 1).maybeSingle();
  const parsed = memberAreaSchema.safeParse(row?.draft);
  if (!parsed.success) return { ok: false, error: "Save a change first." };
  const { error } = await sb.from("member_area").update({ published: parsed.data, has_changes: false, published_at: new Date().toISOString(), updated_by: user.id }).eq("id", 1);
  if (error) return { ok: false, error: "Couldn't publish. Try again." };
  updateTag(MEMBER_AREA_TAG);
  return { ok: true, message: "Published. Members see it now." };
}
