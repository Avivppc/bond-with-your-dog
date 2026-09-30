import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** All quiz leads as CSV (staff with sales access only). */
export async function GET() {
  await requireStaff("sales");
  const { data, error } = await createServiceClient()
    .from("quiz_leads")
    .select("created_at, first_name, email, tier")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[leads export] failed", error.message);
    return NextResponse.json({ error: "export failed" }, { status: 500 });
  }
  const csv = toCsv(
    ["created_at", "first_name", "email", "tier"],
    (data ?? []).map((l) => [l.created_at, l.first_name, l.email, l.tier])
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonded-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
