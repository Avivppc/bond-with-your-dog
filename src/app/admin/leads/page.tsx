import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const LIMIT = 500;

export default async function LeadsPage() {
  await requireStaff("sales");
  const { data: leads, error } = await createServiceClient()
    .from("quiz_leads")
    .select("id, first_name, email, tier, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) console.error("[leads] list failed", error.message);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">Leads</h1>
          <p className="text-sm text-slate-500">People who took the &ldquo;Find your journey&rdquo; quiz (latest {LIMIT}).</p>
        </div>
        <Link href="/admin/leads/export" className="bg-orange-700 text-white px-4 py-2 rounded-full font-bold text-xs" prefetch={false}>
          Download CSV
        </Link>
      </header>
      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(leads ?? []).map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 text-slate-500">{new Date(l.created_at).toLocaleDateString("en-US")}</td>
                <td>{l.first_name}</td>
                <td>{l.email}</td>
                <td className="capitalize">{l.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(leads ?? []).length === 0 && <p className="p-6 text-sm text-slate-500">No leads yet.</p>}
      </section>
    </div>
  );
}
