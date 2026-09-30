/** Kajabi-style "Displaying 1–25 of 312" pagination. Pure — safe for tests. */
export interface PageWindow {
  page: number;
  pages: number;
  offset: number;
  /** 1-based index of the first row shown (0 when there are none). */
  first: number;
  /** 1-based index of the last row shown. */
  last: number;
}

/** A positive page number from a query string; anything else is page 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Number.parseInt(typeof raw === "string" ? raw : "", 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function pageWindow(total: number, requestedPage: number, perPage: number): PageWindow {
  const safeTotal = Math.max(0, Math.floor(total));
  const pages = Math.max(1, Math.ceil(safeTotal / perPage));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), pages);
  const offset = (page - 1) * perPage;
  return {
    page,
    pages,
    offset,
    first: safeTotal === 0 ? 0 : offset + 1,
    last: Math.min(offset + perPage, safeTotal),
  };
}
