import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f7fa" }}>
      <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-extrabold tracking-tighter text-lg">
            Keta Tov · Admin
          </Link>
          <Link href="/admin" className="text-sm text-slate-300 hover:text-white">
            Courses
          </Link>
          <Link href="/admin/videos" className="text-sm text-slate-300 hover:text-white">
            Spotlight queue
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-300 hover:text-white">
            View site
          </Link>
          <Link href="/dashboard" className="text-slate-300 hover:text-white">
            My learning
          </Link>
          <form action="/auth/logout" method="post">
            <button type="submit" className="text-slate-300 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
