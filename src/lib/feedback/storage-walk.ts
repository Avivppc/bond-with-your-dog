/**
 * Every file under a storage folder, including nested folders (e.g. `<user>/stories/…`).
 * Supabase's `list` returns one level at a time and marks sub-folders with `id: null`.
 * Pure apart from the injected `list`, so it can be tested without Supabase.
 */
export interface StorageEntry {
  name: string;
  id: string | null;
}

export type StorageList = (
  prefix: string,
  options: { limit: number; offset: number }
) => Promise<{ data: StorageEntry[] | null; error: { message: string } | null }>;

export interface WalkResult {
  paths: string[];
  /** Folders that could not be listed (with the error), so the caller can log them. */
  errors: { prefix: string; message: string }[];
}

const PAGE_SIZE = 1000;
/** Member folders are shallow (`<user>/stories/<file>`); this only guards against runaway trees. */
const MAX_DEPTH = 5;

async function listFolder(list: StorageList, prefix: string): Promise<{ entries: StorageEntry[]; error: string | null }> {
  const pages: StorageEntry[][] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await list(prefix, { limit: PAGE_SIZE, offset });
    if (error) return { entries: pages.flat(), error: error.message };
    const page = data ?? [];
    pages.push(page);
    if (page.length < PAGE_SIZE) return { entries: pages.flat(), error: null };
  }
}

export async function listFilesRecursive(list: StorageList, root: string, depth = 0): Promise<WalkResult> {
  const { entries, error } = await listFolder(list, root);
  const files = entries.filter((e) => e.id).map((e) => `${root}/${e.name}`);
  const folders = entries.filter((e) => !e.id && e.name).map((e) => `${root}/${e.name}`);
  const own: WalkResult = { paths: files, errors: error ? [{ prefix: root, message: error }] : [] };
  if (depth >= MAX_DEPTH) {
    return folders.length ? { ...own, errors: [...own.errors, { prefix: root, message: "folders nested too deep" }] } : own;
  }
  const nested = await Promise.all(folders.map((folder) => listFilesRecursive(list, folder, depth + 1)));
  return {
    paths: [...own.paths, ...nested.flatMap((n) => n.paths)],
    errors: [...own.errors, ...nested.flatMap((n) => n.errors)],
  };
}
