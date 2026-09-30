import { parseVimeoUrl } from "./video/vimeo";

/**
 * Bulk course import from a pasted spreadsheet (TSV from Sheets/Excel, or CSV).
 * Required columns: Module, Lesson. Optional: Submodule, Vimeo, Description.
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

/** Splits one line; handles double-quoted CSV fields with escaped quotes. */
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t");
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

const clean = (v: string | undefined): string | null => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, 500) : null;
};

export function parseOutlineImport(text: string): ImportResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const firstIndex = lines.findIndex((l) => l.trim());
  if (firstIndex === -1) return { rows: [], errors: [{ line: 1, message: "The pasted table is empty." }] };

  const delimiter = lines[firstIndex].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[firstIndex], delimiter).map(columnFor);
  if (!headers.includes("module") || !headers.includes("lesson")) {
    return { rows: [], errors: [{ line: firstIndex + 1, message: "The first row must name the columns — at least Module and Lesson." }] };
  }

  const dataLines = lines
    .map((content, i) => ({ content, line: i + 1 }))
    .slice(firstIndex + 1)
    .filter((l) => l.content.trim());
  if (dataLines.length > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ line: firstIndex + 2, message: `Import up to ${MAX_IMPORT_ROWS} lessons at a time.` }] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  for (const { content, line } of dataLines) {
    const cells = splitLine(content, delimiter);
    const get = (c: Column) => clean(cells[headers.indexOf(c)]);
    const moduleTitle = get("module");
    const lesson = get("lesson");
    const vimeoUrl = headers.includes("vimeo") ? get("vimeo") : null;

    if (!moduleTitle) errors.push({ line, message: "Module is required" });
    else if (!lesson) errors.push({ line, message: "Lesson title is required" });
    else if (vimeoUrl && !parseVimeoUrl(vimeoUrl)) errors.push({ line, message: `Not a Vimeo link: ${vimeoUrl}` });
    else {
      rows.push({
        line,
        module: moduleTitle,
        submodule: headers.includes("submodule") ? get("submodule") : null,
        lesson,
        vimeoUrl,
        description: headers.includes("description") ? get("description") : null,
      });
    }
  }
  return { rows, errors };
}
