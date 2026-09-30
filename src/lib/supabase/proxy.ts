import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Member App areas (src/app/(member)) and older member URLs that redirect into it. */
const MEMBER_PREFIXES = [
  "/dashboard",
  "/home",
  "/welcome",
  "/my-courses",
  "/learn",
  "/certificates",
  "/practice",
  "/plan",
  "/routine",
  "/moves",
  "/search",
  "/feedback",
  "/progress",
  "/community",
  "/refer",
  "/profile",
  "/dogs",
  "/settings",
  "/membership",
  "/notifications",
  "/help",
  "/studio",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Pages here need a signed-in member (the page itself checks again).
  const isProtected = MEMBER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
