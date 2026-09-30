import Link from "next/link";
import { Inter } from "next/font/google";
import { requireStaff } from "@/lib/admin";
import { adminNavFor } from "@/lib/admin-nav";
import { AdminSidebar } from "./_components/AdminSidebar";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-admin" });

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireStaff("content");
  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className={`${inter.variable} min-h-screen bg-[#f8f8f8] text-[14px] text-[#1a1a19]`} style={{ fontFamily: "var(--font-admin), system-ui, sans-serif" }}>
      <AdminSidebar groups={adminNavFor(role)} />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b border-[#ebeae8] bg-white/90 px-4 backdrop-blur">
          <Link href="/" className="rounded-full px-3 py-1.5 text-sm text-[#3d3c3a] hover:bg-[#f3f3f2]">
            View site
          </Link>
          <Link href="/dashboard" className="rounded-full px-3 py-1.5 text-sm text-[#3d3c3a] hover:bg-[#f3f3f2]">
            My learning
          </Link>
          <details className="relative">
            <summary
              className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#e7e6e4] py-1 pl-1 pr-3 text-sm"
              aria-label="Account"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a19] text-xs font-semibold text-white">{initial}</span>
              <span className="capitalize">{role}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-[12px] border border-[#e7e6e4] bg-white p-1 shadow-lg">
              <p className="truncate px-3 py-2 text-xs text-[#6c6a69]">{user.email}</p>
              <form action="/auth/logout" method="post">
                <button type="submit" className="w-full rounded-[8px] px-3 py-2 text-left text-sm hover:bg-[#f3f3f2]">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
