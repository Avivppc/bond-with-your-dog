import "server-only";
import { headers } from "next/headers";

/** The site the member is on (preview or production); Supabase only follows allow-listed redirect URLs. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.includes(".localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
