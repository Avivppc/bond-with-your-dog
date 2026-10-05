import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeByToken } from "@/lib/flows/server/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058): Gmail and Apple Mail POST here from their own "Unsubscribe"
 * button, using the List-Unsubscribe header every flow email carries.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const ok = await unsubscribeByToken(token, "one_click");
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
