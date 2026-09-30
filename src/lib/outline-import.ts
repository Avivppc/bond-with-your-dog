import { parseVimeoUrl } from "./video/vimeo";

/**
 * Bulk course import from a pasted spreadsheet (TSV from Sheets/Excel, or CSV).
 * Required columns: Module, Lesson. Optional: Submodule, Vimeo, Description.
 * A blank Module cell continues the module above it (grouped sheets).
 * Pure — the admin action turns the rows into draft modules/lessons.
 */
export interface ImportRow {
  line: number;
  module: string;
  submodule: string | null;
  lesson: string;
  vimeoUrl: string | null;
  description: string | null;
}

export interface ImportError {
  line: number;
  message: string;
}

export interface ImportResult {
  rows: ImportRow[];
  errors: ImportError[];
}

export const MAX_IMPORT_ROWS = 500;

type Column = "module" | "submodule" | "lesson" | "vimeo" | "description";

const ALIASES: Record<Column, string[]> = {
  module: ["module", "module title", "section", "chapter"],
  submodule: ["submodule", "sub module", "sub-module", "subsection"],
  lesson: ["lesson", "lesson title", "title of lesson", "lesson name"],
  vimeo: ["vimeo", "vimeo link", "vimeo url", "video", "video link", "video url", "link"],
  description: ["description", "summary", "notes"],
};

function columnFor(header: string): Column | null {
  const h = header.trim().toLowerCase();
  return (Object.keys(ALIASES) as Column[]).find((c) => ALIASES[c].includes(h)) ?? null;
}

interface RawRecord {
  line: number;
  cells: string[];
}

/**
 * Splits pasted text into records. A cell that starts with a double quote may contain the
 * delimiter, newlines and "" escapes — Sheets/Excel quote multi-line cells this way in TSV too.
 */
function tokenize(text: string, delimiter: string): RawRecord[] {
  const records: RawRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let atCellStart = true;
  let line = 1;
  let recordLine = 1;

  const endCell = () => {
    cells = [...cells, cell];
    cell = "";
    atCellStart = true;
  };
  const endRecord = () => {
    endCell();
    records.push({ line: recordLine, cells });
    cells = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") line++;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && atCellStart) {
      quoted = true;
      atCellStart = false;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === "\n") {
      endRecord();
      recordLine = line;
    } else {
      cell += ch;
      atCellStart = false;
    }
  }
  endRecord();
  return records.filter((r) => r.cells.some((c) => c.trim()));
}

interface Placement {
  module: string;
  submodule: string | null;
}

/** A row's own Module starts a new group; a blank one continues the group above (Submodule may change). */
function placeRow(previous: Placement | null, ownModule: string | null, submodule: string | null): Placement | null {
  if (ownModule) return { module: ownModule, submodule };
  if (!previous) return null;
  return { module: previous.module, submodule: submodule ?? previous.submodule };
}

const clean = (v: string | undefined): string | null => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, 500) : null;
};

export function parseOutlineImport(text: string): ImportResult {
  const normalized = text.replace(/\r\n?/g, "\n");
  const firstLine = normalized.split("\n").find((l) => l.trim());
  if (firstLine === undefined) return { rows: [], errors: [{ line: 1, message: "The pasted table is empty." }] };

  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const [header, ...records] = tokenize(normalized, delimiter);
  const headers = header.cells.map(columnFor);
  if (!headers.includes("module") || !headers.includes("lesson")) {
    return { rows: [], errors: [{ line: header.line, message: "The first row must name the columns — at least Module and Lesson." }] };
  }
  if (records.length > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ line: header.line + 1, message: `Import up to ${MAX_IMPORT_ROWS} lessons at a time.` }] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  // Grouped spreadsheets name the module once; blank Module cells below belong to it.
  let current: Placement | null = null;
  for (const { cells, line } of records) {
    const get = (c: Column) => (headers.includes(c) ? clean(cells[headers.indexOf(c)]) : null);
    current = placeRow(current, get("module"), get("submodule"));

    const lesson = get("lesson");
    const vimeoUrl = get("vimeo");
    if (!current) errors.push({ line, message: "Module is required" });
    else if (!lesson) errors.push({ line, message: "Lesson title is required" });
    else if (vimeoUrl && !parseVimeoUrl(vimeoUrl)) errors.push({ line, message: `Not a Vimeo link: ${vimeoUrl}` });
    else rows.push({ line, module: current.module, submodule: current.submodule, lesson, vimeoUrl, description: get("description") });
  }
  return { rows, errors };
}
