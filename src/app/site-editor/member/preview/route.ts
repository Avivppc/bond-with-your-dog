import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/admin";
import { MEMBER_PREVIEW_COOKIE, MEMBER_PREVIEW_MAX_AGE } from "@/lib/member-area/server";

/** Member app pages the preview may open (only these; anything else goes home). */
const ALLOWED = /^\/(home|my-courses|practice|moves|feedback|progress|community|settings|help|notifications)(\/[a-z0-9-]*)?$/;

/**
 * Turns the member area draft preview on (or off with ?off=1) for this staff browser, then opens a
 * member page. The editor's preview frame starts here.
 */
export async function GET(req: NextRequest) {
  await requireStaff("content");
  const to = req.nextUrl.searchParams.get("to") ?? "/home";
  const target = ALLOWED.test(to) ? to : "/home";
  const res = NextResponse.redirect(new URL(target, req.nextUrl.origin));
  if (req.nextUrl.searchParams.get("off") === "1") {
    res.cookies.delete(MEMBER_PREVIEW_COOKIE);
  } else {
    res.cookies.set(MEMBER_PREVIEW_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MEMBER_PREVIEW_MAX_AGE });
  }
  return res;
}
