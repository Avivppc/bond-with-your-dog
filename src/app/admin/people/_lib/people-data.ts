import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { toAmounts, type CurrencyAmount } from "@/lib/admin-helpers/money";

export const PEOPLE_PER_PAGE = 25;

export const SEGMENTS = [
  { key: "all", label: "All contacts" },
  { key: "students", label: "Students" },
  { key: "no_course", label: "No course" },
  { key: "team", label: "Team" },
  { key: "not_onboarded", label: "Not onboarded" },
] as const;

export type Segment = (typeof SEGMENTS)[number]["key"];

export function parseSegment(raw: unknown): Segment {
  return SEGMENTS.find((s) => s.key === raw)?.key ?? "all";
}

export interface EnrollmentSummary {
  course_id: string;
  title: string;
  source: string;
  expires_at: string | null;
  access_level: string | null;
}

export interface PersonRow {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  dogName: string | null;
  staffRole: string | null;
  onboarded: boolean;
  completedLessons: number;
  enrollments: EnrollmentSummary[];
  marketingOptIn: boolean;
  lifetimeValue: CurrencyAmount[];
}

interface PeopleRpcRow {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  dog_name: string | null;
  staff_role: string | null;
  onboarded: boolean;
  completed_lessons: number;
  enrollments: EnrollmentSummary[] | null;
  total_count: number;
}

interface ExtrasRow {
  user_id: string;
  marketing_opt_in: boolean;
  lifetime_value: unknown;
}

export interface PeoplePage {
  rows: PersonRow[];
  total: number;
  failed: boolean;
}

async function loadExtras(userIds: string[]): Promise<Map<string, ExtrasRow>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await createServiceClient().rpc("admin_people_extras", { p_user_ids: userIds });
  if (error) console.error("[people] extras failed", error.message);
  return new Map(((data ?? []) as ExtrasRow[]).map((r) => [r.user_id, r]));
}

/** One page of contacts plus their marketing consent and lifetime value. */
export async function loadPeople(search: string, segment: Segment, offset: number): Promise<PeoplePage> {
  const { data, error } = await createServiceClient().rpc("admin_list_people", {
    p_search: search,
    p_filter: segment,
    p_limit: PEOPLE_PER_PAGE,
    p_offset: offset,
  });
  if (error) {
    console.error("[people] list failed", { search, segment, error: error.message });
    return { rows: [], total: 0, failed: true };
  }
  const raw = (data ?? []) as PeopleRpcRow[];
  const extras = await loadExtras(raw.map((r) => r.user_id));
  return {
    total: Number(raw[0]?.total_count ?? 0),
    failed: false,
    rows: raw.map((r) => {
      const extra = extras.get(r.user_id);
      return {
        userId: r.user_id,
        email: r.email,
        createdAt: r.created_at,
        lastSignInAt: r.last_sign_in_at,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
        dogName: r.dog_name,
        staffRole: r.staff_role,
        onboarded: r.onboarded,
        completedLessons: Number(r.completed_lessons),
        enrollments: r.enrollments ?? [],
        marketingOptIn: extra?.marketing_opt_in ?? false,
        lifetimeValue: toAmounts(extra?.lifetime_value),
      };
    }),
  };
}

/** Lifetime value and consent for one person (the contact page). */
export async function loadPersonExtras(userId: string): Promise<{ marketingOptIn: boolean; lifetimeValue: CurrencyAmount[] }> {
  const extra = (await loadExtras([userId])).get(userId);
  return { marketingOptIn: extra?.marketing_opt_in ?? false, lifetimeValue: toAmounts(extra?.lifetime_value) };
}
