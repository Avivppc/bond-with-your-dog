export interface Pagination {
  page: number;
  pages: number;
  /** Zero-based, inclusive row range for Supabase's `.range(from, to)`. */
  from: number;
  to: number;
  /** Kajabi-style "Displaying 1–25 of 60". */
  label: string;
}

/** `?page=` → a positive whole page number (1 for anything else). */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function paginate(requestedPage: number, pageSize: number, total: number): Pagination {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const label = total === 0 ? "Displaying 0 of 0" : `Displaying ${from + 1}–${Math.min(to + 1, total)} of ${total}`;
  return { page, pages, from, to, label };
}
