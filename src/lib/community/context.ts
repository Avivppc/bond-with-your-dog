import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { communityViewer, loadChannels, loadSettings, type ChannelRow, type CommunitySettings, type Viewer } from "./queries";

export interface CommunityContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  viewer: Viewer;
  me: { id: string; name: string; avatarUrl: string | null };
  settings: CommunitySettings | null;
  channels: ChannelRow[];
}

/** Per-request community context (deduplicated between the layout and the page). */
export const communityContext = cache(async (): Promise<CommunityContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/community");

  const [viewer, profileRes] = await Promise.all([
    communityViewer(supabase, user.id),
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  const [settings, channels] = viewer.canAccess ? await Promise.all([loadSettings(supabase), loadChannels(supabase)]) : [null, []];
  return {
    supabase,
    viewer,
    me: { id: user.id, name: profileRes.data?.full_name?.trim() || user.email?.split("@")[0] || "Me", avatarUrl: profileRes.data?.avatar_url ?? null },
    settings,
    channels,
  };
});

/** Channels the viewer may post in (announcement-style channels are staff-only). */
export function postableChannels(channels: readonly ChannelRow[], isStaff: boolean): ChannelRow[] {
  return channels.filter((c) => isStaff || c.posting === "members");
}
