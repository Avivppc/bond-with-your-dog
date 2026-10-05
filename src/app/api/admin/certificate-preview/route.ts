import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/admin";
import { certificateDesignSchema, SAMPLE_CERTIFICATE } from "@/lib/certificates/design";
import { certificatePdfStream } from "@/lib/certificates/pdf";

export const dynamic = "force-dynamic";

const MAX_PARAM = 2000;

/** Admin → Settings → Certificate preview: a sample certificate in the design on screen (not yet saved). */
export async function GET(req: NextRequest) {
  await requireStaff("content");

  const raw = req.nextUrl.searchParams.get("d") ?? "";
  let candidate: unknown = null;
  try {
    candidate = raw.length <= MAX_PARAM ? JSON.parse(raw) : null;
  } catch {
    candidate = null;
  }
  const parsed = certificateDesignSchema.safeParse(candidate);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid design" }, { status: 400 });

  const body = await certificatePdfStream({ ...SAMPLE_CERTIFICATE }, parsed.data);
  return new Response(body, { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } });
}
