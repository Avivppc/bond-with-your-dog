import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { canPerform, type StaffCapability } from "@/lib/staff";

export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; needs: StaffCapability }[] = [
  { href: "/admin", label: "Courses", needs: "content" },
  { href: "/admin/offers", label: "Offers", needs: "sales" },
  { href: "/admin/students", label: "Students", needs: "sales" },
  { href: "/admin/orders", label: "Orders", needs: "sales" },
  { href: "/admin/leads", label: "Leads", needs: "sales" },
  { href: "/admin/videos", label: "Spotlight queue", needs: "content" },
  { href: "/admin/team", label: "Team", needs: "staff" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireStaff("content");
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f7fa" }}>
      <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-extrabold tracking-tighter text-lg">
            Bonded · Admin
          </Link>
          {NAV.filter((item) => canPerform(role, item.needs)).map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-slate-300 hover:text-white">
              {item.label}
            </Link>
          ))}
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
