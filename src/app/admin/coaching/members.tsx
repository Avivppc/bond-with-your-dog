import "server-only";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";

export interface MemberInfo {
  id: string;
  name: string | null;
  email: string | null;
}

/** Names (profiles) and emails (auth) for a set of members, keyed by user id. */
export async function loadMembers(ids: readonly string[]): Promise<Map<string, MemberInfo>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const sb = createServiceClient();
  const [profilesRes, emailsRes] = await Promise.all([
    sb.from("profiles").select("id, full_name").in("id", unique),
    sb.rpc("admin_user_emails", { p_user_ids: unique }),
  ]);
  if (profilesRes.error || emailsRes.error) {
    console.error("[admin/coaching] member lookup failed", profilesRes.error?.message ?? emailsRes.error?.message);
  }
  const names = new Map(((profilesRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name?.trim() || null]));
  const emails = new Map(((emailsRes.data ?? []) as { user_id: string; email: string }[]).map((e) => [e.user_id, e.email]));
  return new Map(unique.map((id) => [id, { id, name: names.get(id) ?? null, email: emails.get(id) ?? null }]));
}

/** Member name + email linking to their People profile. */
export function MemberLink({ member }: { member: MemberInfo | undefined }) {
  if (!member) return <span className="text-[#6c6a69]">Deleted member</span>;
  return (
    <Link href={`/admin/people/${member.id}`} className="group inline-flex min-w-0 flex-col">
      <span className="truncate font-medium text-[#1a1a19] group-hover:underline">{member.name ?? member.email ?? "Member"}</span>
      {member.name && member.email && <span className="truncate text-xs text-[#6c6a69]">{member.email}</span>}
    </Link>
  );
}
