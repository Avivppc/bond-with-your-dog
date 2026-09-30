import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { cancelAccessInvite, grantAccessByEmail, revokeCourseAccess } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface EnrollmentSummary {
  course_id: string;
  title: string;
  source: string;
  expires_at: string | null;
}

interface StudentRow {
  user_id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  completed_lessons: number;
  enrollments: EnrollmentSummary[];
  total_count: number;
}

function accessLabel(e: EnrollmentSummary): { text: string; active: boolean } {
  if (!e.expires_at) return { text: "lifetime", active: true };
  const active = new Date(e.expires_at) > new Date();
  return { text: `${active ? "until" : "ended"} ${new Date(e.expires_at).toLocaleDateString("en-US")}`, active };
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; ok?: string; error?: string }>;
}) {
  await requireStaff("sales");
  const { q, page: pageParam, ok, error } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const sb = createServiceClient();

  const [studentsRes, offersRes, invitesRes] = await Promise.all([
    sb.rpc("admin_list_students", { p_search: q?.trim() ?? "", p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE }),
    sb.from("offers").select("id, title").order("title"),
    sb.from("access_invites").select("id, email, created_at, offers(title)").is("claimed_at", null).order("created_at", { ascending: false }),
  ]);

  if (studentsRes.error) console.error("[students] list failed", studentsRes.error.message);
  const users = (studentsRes.data ?? []) as StudentRow[];
  const total = users[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => `/admin/students?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) }).toString()}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tighter">Students</h1>
        <p className="text-sm text-slate-500">Everyone with an account, their courses and progress.</p>
      </header>

      {ok && <p role="status" className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">{ok}</p>}
      {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-extrabold mb-3">Grant access</h2>
        <form action={grantAccessByEmail} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 flex-1 min-w-56">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Email</span>
            <input name="email" type="email" required className="px-4 py-2.5 rounded-lg border border-slate-200" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Offer</span>
            <select name="offer_id" required className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
              {(offersRes.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 w-32">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Days</span>
            <input name="days" type="number" min={1} placeholder="lifetime" className="px-4 py-2.5 rounded-lg border border-slate-200" />
          </label>
          <button type="submit" className="bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold text-sm">
            Grant
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2">No account yet? Access unlocks when they sign up with this email. Useful for moving students from Kajabi.</p>
        {(invitesRes.data ?? []).length > 0 && (
          <ul className="mt-4 text-sm divide-y divide-slate-100">
            {(invitesRes.data ?? []).map((inv) => (
              <li key={inv.id} className="py-2 flex items-center justify-between">
                <span>
                  <b>{inv.email}</b> — waiting for sign-up ({(inv.offers as unknown as { title: string } | null)?.title})
                </span>
                <form action={cancelAccessInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button type="submit" className="text-xs text-red-600">
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search by email" className="px-4 py-2 rounded-lg border border-slate-200 flex-1 max-w-sm" />
        <button type="submit" className="px-4 py-2 rounded-full border border-slate-300 text-sm font-bold">
          Search
        </button>
      </form>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th>Courses</th>
              <th>Lessons done</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const mine = u.enrollments;
              return (
                <tr key={u.user_id} className="align-top">
                  <td className="px-4 py-3 font-semibold">{u.email}{u.full_name && <span className="block text-xs font-normal text-slate-500">{u.full_name}</span>}</td>
                  <td className="py-3">
                    {mine.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {mine.map((e) => {
                          const label = accessLabel(e);
                          return (
                            <li key={e.course_id} className="flex items-center gap-2">
                              <span className={label.active ? "" : "line-through text-slate-400"}>{e.title}</span>
                              <span className="text-[10px] uppercase text-slate-500">
                                {e.source} · {label.text}
                              </span>
                              {label.active && (
                                <form action={revokeCourseAccess}>
                                  <input type="hidden" name="user_id" value={u.user_id} />
                                  <input type="hidden" name="course_id" value={e.course_id} />
                                  <button type="submit" className="text-[10px] text-red-600 hover:text-red-800">
                                    revoke
                                  </button>
                                </form>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                  <td className="py-3">{u.completed_lessons}</td>
                  <td className="py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString("en-US")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-6 text-sm text-slate-500">No students found.</p>}
      </section>

      {pages > 1 && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Pages">
          {page > 1 && <a href={pageHref(page - 1)} className="font-bold text-orange-700">← Previous</a>}
          <span className="text-slate-500">
            Page {page} of {pages} · {total} students
          </span>
          {page < pages && <a href={pageHref(page + 1)} className="font-bold text-orange-700">Next →</a>}
        </nav>
      )}
    </div>
  );
}
