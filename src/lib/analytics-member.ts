import "server-only";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackMember, type EventName, type EventProps, type ServerEvent } from "@/lib/analytics-server";

/**
 * trackMember for actions that don't already hold the user: the sign-in lookup
 * runs after the response, so the member never waits for analytics.
 */
export function trackSignedIn(
  event: EventName,
  props: EventProps = {},
  options: Pick<ServerEvent, "dedupeKey" | "occurredAt"> = {},
): void {
  after(async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) trackMember(user, event, props, options);
  });
}
