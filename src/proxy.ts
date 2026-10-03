import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // `tails` is the PostHog reverse proxy; it, the service worker and the manifest need no Supabase session refresh.
    "/((?!_next/static|_next/image|tails|sw\\.js|manifest\\.webmanifest|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
