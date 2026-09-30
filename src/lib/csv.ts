type Cell = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`; // stop Excel/Sheets executing it as a formula
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV (CRLF rows) with CSV-injection protection. */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
