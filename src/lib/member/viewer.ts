import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimPendingAccess } from "@/lib/access";
import { isAdminEmail } from "@/lib/admin";

export type AgeGroup = "puppy" | "adult" | "senior";
export type SkillLevel = "learning" | "reliable" | "performance";
export type Goal = "bond" | "tricks" | "dance" | "calm" | "job" | "perform";

export interface Dog {
  id: string;
  name: string;
  breed: string | null;
  age_group: AgeGroup;
  size: "small" | "medium" | "large" | null;
  limitations: string[];
  limitation_note: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface MemberProfile {
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  onboarded_at: string | null;
  goals: Goal[];
  session_minutes: 5 | 10 | 15;
  practice_days: number[];
  active_dog_id: string | null;
  tours_seen: string[];
  notif_prefs: Record<string, boolean>;
  marketing_opt_in: boolean;
  /** IANA zone used for reminders; null until the browser reports it */
  timezone: string | null;
}

export interface MemberViewer {
  userId: string;
  email: string;
  createdAt: string;
  profile: MemberProfile;
  firstName: string;
  initials: string;
  dogs: Dog[];
  activeDog: Dog | null;
  unreadNotifications: number;
  isStaff: boolean;
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

const PROFILE_COLUMNS =
  "full_name, avatar_url, location, onboarded_at, goals, session_minutes, practice_days, active_dog_id, tours_seen, notif_prefs, marketing_opt_in, timezone";
const DOG_COLUMNS = "id, name, breed, age_group, size, limitations, limitation_note, photo_url, created_at";

function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

async function load(supabase: ServerSupabase): Promise<MemberViewer | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  await claimPendingAccess(supabase);

  const [profileRes, dogsRes, unreadRes, staffRes] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle(),
    supabase.from("dogs").select(DOG_COLUMNS).order("created_at"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    // Also claims a pending admin invite once the inbox is proven (returns an existing role as is).
    supabase.rpc("claim_staff_invite"),
  ]);
  if (profileRes.error) console.error("[viewer] profile load failed", profileRes.error.message);
  if (dogsRes.error) console.error("[viewer] dogs load failed", dogsRes.error.message);

  const raw = (profileRes.data ?? {}) as Partial<MemberProfile>;
  const profile: MemberProfile = {
    full_name: raw.full_name ?? null,
    avatar_url: raw.avatar_url ?? null,
    location: raw.location ?? null,
    onboarded_at: raw.onboarded_at ?? null,
    goals: (raw.goals ?? []) as Goal[],
    session_minutes: (raw.session_minutes ?? 10) as 5 | 10 | 15,
    practice_days: raw.practice_days ?? [1, 3, 6],
    active_dog_id: raw.active_dog_id ?? null,
    tours_seen: raw.tours_seen ?? [],
    notif_prefs: (raw.notif_prefs ?? {}) as Record<string, boolean>,
    marketing_opt_in: Boolean(raw.marketing_opt_in),
    timezone: raw.timezone ?? null,
  };
  const dogs = (dogsRes.data ?? []) as Dog[];
  const activeDog = dogs.find((d) => d.id === profile.active_dog_id) ?? dogs[0] ?? null;
  const name = profile.full_name?.trim() || "";
  const email = user.email ?? "";

  return {
    userId: user.id,
    email,
    createdAt: user.created_at,
    profile,
    firstName: name.split(/\s+/)[0] || email.split("@")[0] || "friend",
    initials: initialsOf(name, email),
    dogs,
    activeDog,
    unreadNotifications: unreadRes.count ?? 0,
    isStaff: typeof staffRes.data === "string" || isAdminEmail(email),
  };
}

/** The signed-in member for this request (one load per render, shared by the layout and the page). */
export const memberViewer = cache(async (): Promise<MemberViewer | null> => load(await createClient()));

/** Same, but sends signed-out visitors to the login page and returns them here afterwards. */
export async function requireMember(next: string): Promise<MemberViewer> {
  const viewer = await memberViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** "Luna" or, before the member adds a dog, "your dog". */
export function dogName(viewer: MemberViewer): string {
  return viewer.activeDog?.name ?? "your dog";
}
