import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";

export default async function AdminCoursesPage() {
  const sb = createServiceClient();
  const { data: courses } = await sb
    .from("courses")
    .select("id, title, level, category, published")
    .order("created_at", { ascending: false });

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter">Courses</h1>
        <Link
          href="/admin/courses/new"
          className="bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold text-sm"
        >
          + New course
        </Link>
      </header>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {!courses || courses.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No courses yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-bold text-slate-700">Title</th>
                <th className="text-left px-6 py-3 font-bold text-slate-700">Category</th>
                <th className="text-left px-6 py-3 font-bold text-slate-700">Level</th>
                <th className="text-left px-6 py-3 font-bold text-slate-700">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold">{c.title}</td>
                  <td className="px-6 py-4 text-slate-600">{c.category}</td>
                  <td className="px-6 py-4 text-slate-600">{c.level}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.published
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {c.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/courses/${c.id}`} className="font-bold text-orange-700">
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
