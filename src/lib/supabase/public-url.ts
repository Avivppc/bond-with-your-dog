import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";

type ServiceClient = ReturnType<typeof createServiceClient>;

/** "<storage url>/object/public/<bucket>/" — the prefix of every public URL in that bucket. */
export function publicBucketBase(sb: ServiceClient, bucket: string): string {
  const probe = sb.storage.from(bucket).getPublicUrl("x").data.publicUrl;
  return probe.slice(0, -1);
}
