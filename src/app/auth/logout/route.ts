import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { forgetDevice, PUSH_DEVICE_COOKIE } from "@/lib/push/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // A shared phone must not keep showing the previous member's notifications.
  await forgetDevice(user?.id, request.cookies.get(PUSH_DEVICE_COOKIE)?.value);
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/`, { status: 303 });
  response.cookies.delete(PUSH_DEVICE_COOKIE);
  return response;
}
