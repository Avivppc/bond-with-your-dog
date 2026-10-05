import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface ExportRow {
  kind: string;
  email: string;
  full_name: string | null;
  subscribed: boolean;
  unsubscribed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  tags: string | null;
  chapters: string | null;
}

const yesNo = (v: boolean) => (v ? "yes" : "no");
/** PostgREST returns at most 1000 rows per call; read page by page. */
const PAGE = 1000;
const MAX_PAGES = 200;

async function allRows(): Promise<ExportRow[] | null> {
  const sb = createServiceClient();
  const rows: ExportRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await sb.rpc("admin_export_contacts", { p_limit: PAGE, p_offset: page * PAGE });
    if (error) {
      console.error("[contacts export] failed", { page, error: error.message });
      return null;
    }
    const batch = (data ?? []) as ExportRow[];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
  return rows;
}

/** Every contact (members and email-only) as CSV, for staff with sales access. */
export async function GET() {
  await requireStaff("sales");
  const data = await allRows();
  if (!data) {
    return new NextResponse("The contacts couldn't be exported. Please go back and try again.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const csv = toCsv(
    ["email", "name", "type", "newsletter", "unsubscribed", "added", "last_sign_in", "tags", "chapters"],
    data.map((r) => [
      r.email,
      r.full_name,
      r.kind,
      yesNo(r.subscribed && !r.unsubscribed),
      yesNo(r.unsubscribed),
      r.created_at,
      r.last_sign_in_at,
      r.tags,
      r.chapters,
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonded-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
