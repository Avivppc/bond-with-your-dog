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

/** Every contact (members and email-only) as CSV, for staff with sales access. */
export async function GET() {
  await requireStaff("sales");
  const { data, error } = await createServiceClient().rpc("admin_export_contacts");
  if (error) {
    console.error("[contacts export] failed", error.message);
    return new NextResponse("The contacts couldn't be exported. Please go back and try again.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const csv = toCsv(
    ["email", "name", "type", "newsletter", "unsubscribed", "added", "last_sign_in", "tags", "chapters"],
    ((data ?? []) as ExportRow[]).map((r) => [
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
