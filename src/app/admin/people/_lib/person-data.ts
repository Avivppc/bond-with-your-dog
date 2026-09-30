import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadPersonExtras } from "./people-data";

const RECENT = 20;
const MAX_SESSIONS_SUMMED = 5000;

export interface PersonDetail {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
    goals: string[];
    sessionMinutes: number | null;
    practiceDays: number[];
    onboardedAt: string | null;
    location: string | null;
  };
  marketingOptIn: boolean;
  lifetimeValue: { currency: string; net_cents: number }[];
  staffRole: string | null;
  dogs: { id: string; name: string; breed: string | null; age_group: string | null; size: string | null; limitations: string[] | null; limitation_note: string | null }[];
  enrollments: { course_id: string; source: string; expires_at: string | null; access_level: string | null; enrolled_at: string; title: string }[];
  orders: { id: string; status: string; amount_cents: number; currency: string; provider: string; created_at: string; offer: string | null }[];
  payments: { id: string; kind: string; amount_cents: number; currency: string; occurred_at: string; offer: string | null; is_renewal: boolean }[];
  pendingInvites: { id: string; offer: string | null; created_at: string }[];
  activity: { lessonsCompleted: number; practiceSessions: number; practiceMinutes: number; communityPoints: number };
  videos: { id: string; title: string; status: string; created_at: string }[];
}

function logIfError(label: string, userId: string, error: { message: string } | null): void {
  if (error) console.error(`[person] ${label} failed`, { userId, error: error.message });
}

type Titled = { title: string } | null;
const titleOf = (v: unknown) => (v as Titled)?.title ?? null;

/** Everything the contact page shows, read with the service role (callers checked requireStaff). */
export async function loadPerson(userId: string): Promise<PersonDetail | null> {
  const sb = createServiceClient();
  const { data: auth, error: authError } = await sb.auth.admin.getUserById(userId);
  if (authError || !auth.user) return null;
  const user = auth.user;

  const [profile, staff, dogs, enrollments, orders, payments, invites, lessons, sessions, points, videos, extras] = await Promise.all([
    sb.from("profiles").select("full_name, avatar_url, goals, session_minutes, practice_days, onboarded_at, location").eq("id", userId).maybeSingle(),
    sb.from("staff_members").select("role").eq("user_id", userId).maybeSingle(),
    sb.from("dogs").select("id, name, breed, age_group, size, limitations, limitation_note").eq("owner_id", userId).order("created_at"),
    sb.from("enrollments").select("course_id, source, expires_at, access_level, enrolled_at, courses(title)").eq("user_id", userId).order("enrolled_at", { ascending: false }),
    sb.from("orders").select("id, status, amount_cents, currency, provider, created_at, offers(title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(RECENT),
    sb.from("payments").select("id, kind, amount_cents, currency, occurred_at, is_renewal, offers(title)").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(RECENT),
    sb.from("access_invites").select("id, created_at, offers(title)").eq("email", (user.email ?? "").toLowerCase()).is("claimed_at", null),
    sb.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).not("completed_at", "is", null),
    sb.from("practice_sessions").select("duration_seconds", { count: "exact" }).eq("user_id", userId).limit(MAX_SESSIONS_SUMMED),
    sb.from("community_points").select("points").eq("user_id", userId),
    sb.from("feedback_videos").select("id, title, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    loadPersonExtras(userId),
  ]);
  logIfError("profile", userId, profile.error);
  logIfError("dogs", userId, dogs.error);
  logIfError("enrollments", userId, enrollments.error);
  logIfError("orders", userId, orders.error);
  logIfError("payments", userId, payments.error);
  logIfError("practice", userId, sessions.error);
  logIfError("videos", userId, videos.error);

  const p = profile.data;
  return {
    userId,
    email: user.email ?? "",
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    profile: {
      fullName: p?.full_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      goals: (p?.goals as string[] | null) ?? [],
      sessionMinutes: (p?.session_minutes as number | null) ?? null,
      practiceDays: (p?.practice_days as number[] | null) ?? [],
      onboardedAt: (p?.onboarded_at as string | null) ?? null,
      location: (p?.location as string | null) ?? null,
    },
    marketingOptIn: extras.marketingOptIn,
    lifetimeValue: extras.lifetimeValue,
    staffRole: staff.data?.role ?? null,
    dogs: dogs.data ?? [],
    enrollments: (enrollments.data ?? []).map(({ courses, ...e }) => ({ ...e, title: titleOf(courses) ?? e.course_id })),
    orders: (orders.data ?? []).map(({ offers, ...o }) => ({ ...o, offer: titleOf(offers) })),
    payments: (payments.data ?? []).map(({ offers, ...pay }) => ({ ...pay, offer: titleOf(offers) })),
    pendingInvites: (invites.data ?? []).map(({ offers, ...i }) => ({ ...i, offer: titleOf(offers) })),
    activity: {
      lessonsCompleted: lessons.count ?? 0,
      practiceSessions: sessions.count ?? 0,
      practiceMinutes: Math.round((sessions.data ?? []).reduce((sum, s) => sum + Number(s.duration_seconds ?? 0), 0) / 60),
      communityPoints: (points.data ?? []).reduce((sum, r) => sum + Number(r.points), 0),
    },
    videos: videos.data ?? [],
  };
}

export async function loadOfferOptions(): Promise<{ id: string; title: string }[]> {
  const { data, error } = await createServiceClient().from("offers").select("id, title").order("title");
  if (error) console.error("[person] offers failed", error.message);
  return data ?? [];
}
