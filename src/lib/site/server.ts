import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { sanitizeSiteHtml } from "./sanitize-site";
import type { FieldDef, FieldValues } from "./fields";
import { EMPTY_SEO, readPageDoc, seoSchema, type PageDoc, type PageSeo } from "./page-doc";
import { SECTION_DEFS } from "./registry";
import { SYSTEM_PAGES, systemPage, type SystemKey } from "./system-pages";
import { DEFAULT_THEME, readTheme, type SiteTheme } from "./theme";

/** Loading and caching website pages and the theme. Writes live in src/app/site-editor/actions.ts. */

type Service = ReturnType<typeof createServiceClient>;

export const THEME_TAG = "site-theme";
export const pageTag = (slug: string) => `site-page:${slug || "home"}`;
/** Saving refreshes at once; this is only a safety net for pages built while the database was down. */
const SAFETY_REFRESH_SECONDS = 3600;

export interface LivePage {
  id: string | null;
  slug: string;
  title: string;
  seo: PageSeo;
  doc: PageDoc;
}

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  system_key: SystemKey | null;
  draft: unknown;
  draft_seo: unknown;
  published: unknown;
  published_seo: unknown;
  published_title: string | null;
  status: "draft" | "published" | "hidden";
  draft_rev: number;
  has_changes: boolean;
  updated_at: string;
  published_at: string | null;
}

export const PAGE_COLUMNS =
  "id, slug, title, system_key, draft, draft_seo, published, published_seo, published_title, status, draft_rev, has_changes, updated_at, published_at";

export function readSeo(raw: unknown): PageSeo {
  const parsed = seoSchema.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY_SEO;
}

function fromTemplate(key: SystemKey): LivePage {
  const p = systemPage(key);
  return { id: null, slug: p.slug, title: p.title, seo: p.seo, doc: p.template() };
}

/** Throws on a database error, so a failed read is never cached. */
async function readLiveRow(slug: string): Promise<PageRow | null> {
  const { data, error } = await createServiceClient().from("site_pages").select(PAGE_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PageRow | null) ?? null;
}

function liveFromRow(row: PageRow): LivePage | null {
  if (row.status !== "published" || !row.published) return null;
  return { id: row.id, slug: row.slug, title: row.published_title ?? row.title, seo: readSeo(row.published_seo), doc: readPageDoc(row.published, SECTION_DEFS) };
}

/**
 * The live version of a built-in page: its published copy, or the hand-built template when it
 * was never edited (or the database can't be reached).
 */
export async function loadLiveSystemPage(key: SystemKey): Promise<LivePage> {
  const slug = systemPage(key).slug;
  const cached = unstable_cache(() => readLiveRow(slug), ["site-page", slug], { tags: [pageTag(slug)], revalidate: SAFETY_REFRESH_SECONDS });
  try {
    const row = await cached();
    return (row && liveFromRow(row)) ?? fromTemplate(key);
  } catch (error: unknown) {
    console.error("[site] page load failed; showing the built-in page", { key, error: error instanceof Error ? error.message : String(error) });
    return fromTemplate(key);
  }
}

/** A published page made in the editor, by address (null when there's none, or it's hidden). */
export async function loadLiveCustomPage(slug: string): Promise<LivePage | null> {
  const cached = unstable_cache(() => readLiveRow(slug), ["site-page", slug], { tags: [pageTag(slug)], revalidate: SAFETY_REFRESH_SECONDS });
  const row = await cached();
  if (!row || row.system_key) return null;
  return liveFromRow(row);
}

async function readThemeRow(): Promise<unknown> {
  const { data, error } = await createServiceClient().from("site_theme").select("published").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.published ?? {};
}

const cachedTheme = unstable_cache(readThemeRow, ["site-theme"], { tags: [THEME_TAG], revalidate: SAFETY_REFRESH_SECONDS });

export async function loadLiveTheme(): Promise<SiteTheme> {
  try {
    return readTheme(await cachedTheme());
  } catch (error: unknown) {
    console.error("[site] theme load failed; using the built-in design", { error: error instanceof Error ? error.message : String(error) });
    return DEFAULT_THEME;
  }
}

// ---------- Editor side (uncached) ----------

export async function loadPageRow(sb: Service, id: string): Promise<PageRow | null> {
  const { data, error } = await sb.from("site_pages").select(PAGE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`site page unavailable: ${error.message}`);
  return (data as PageRow | null) ?? null;
}

export async function loadDraftTheme(sb: Service): Promise<{ theme: SiteTheme; rev: number; hasChanges: boolean; publishedAt: string | null }> {
  const { data, error } = await sb.from("site_theme").select("draft, published, draft_rev, has_changes, published_at").eq("id", 1).maybeSingle();
  if (error) throw new Error(`theme unavailable: ${error.message}`);
  const draft = data?.draft && Object.keys(data.draft as object).length > 0 ? data.draft : data?.published;
  return { theme: readTheme(draft ?? {}), rev: data?.draft_rev ?? 1, hasChanges: data?.has_changes ?? false, publishedAt: data?.published_at ?? null };
}

/**
 * The row for a built-in page, made from its template the first time it's opened in the editor.
 * It starts as published (the template is what the site shows today), with no changes.
 */
export async function ensureSystemPageRow(sb: Service, key: SystemKey, staffId: string): Promise<string> {
  const { data: existing } = await sb.from("site_pages").select("id").eq("system_key", key).maybeSingle();
  if (existing) return existing.id as string;
  const p = systemPage(key);
  const doc = p.template();
  const { data, error } = await sb
    .from("site_pages")
    .insert({
      slug: p.slug,
      title: p.title,
      system_key: key,
      draft: doc,
      draft_seo: p.seo,
      published: doc,
      published_seo: p.seo,
      published_title: p.title,
      status: "published",
      has_changes: false,
      created_by: staffId,
      updated_by: staffId,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (data) return data.id as string;
  // Two editors opened it at the same moment: the other insert won.
  const { data: again } = await sb.from("site_pages").select("id").eq("system_key", key).maybeSingle();
  if (again) return again.id as string;
  throw new Error(`could not create the ${key} page: ${error?.message ?? "unknown error"}`);
}

export { SYSTEM_PAGES };

// ---------- Rich text is cleaned before it's stored ----------

function cleanValues(fields: readonly FieldDef[], values: FieldValues): FieldValues {
  return Object.fromEntries(
    fields.map((f) => {
      const v = values[f.key];
      if (f.kind === "richtext" && typeof v === "string") return [f.key, sanitizeSiteHtml(v)];
      if (f.kind === "list" && Array.isArray(v)) return [f.key, v.map((item) => cleanValues(f.fields, item))];
      if (f.kind === "blocks" && Array.isArray(v)) {
        return [f.key, v.map((item) => {
          const def = f.blockTypes.find((b) => b.type === item.type);
          return def ? { ...cleanValues(def.fields, item), type: def.type } : item;
        })];
      }
      return [f.key, v];
    }),
  );
}

export function sanitizeDoc(doc: PageDoc): PageDoc {
  return {
    ...doc,
    sections: doc.sections.map((s) => {
      const def = SECTION_DEFS[s.type];
      return def ? { ...s, settings: cleanValues(def.fields, s.settings) } : s;
    }),
  };
}
