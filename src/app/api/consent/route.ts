import { createClient } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/consent/record";

export async function POST(request: Request) {
  const supabase = await createClient();
  return recordConsent(request, supabase);
}
