import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/admin";
import { toCsv } from "@/lib/csv";
import { findReport } from "@/lib/analytics/reports";
import { analyticsContext } from "@/app/admin/_components/analytics-context";
import { buildReport } from "../../report-data";

export const dynamic = "force-dynamic";

/** A report's table as CSV, for the same range/currency as the page (staff with sales access). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await requireStaff("sales");
  const { slug } = await params;
  if (!findReport(slug)) return NextResponse.json({ error: "unknown report" }, { status: 404 });

  const search = request.nextUrl.searchParams;
  const ctx = await analyticsContext({
    range: search.get("range") ?? undefined,
    from: search.get("from") ?? undefined,
    to: search.get("to") ?? undefined,
    currency: search.get("currency") ?? undefined,
  });
  const data = await buildReport(slug, ctx);
  if (!data) return NextResponse.json({ error: "unknown report" }, { status: 404 });

  return new NextResponse(toCsv(data.columns, data.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonded-${slug}-${ctx.fromDay}-to-${ctx.toDay}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
