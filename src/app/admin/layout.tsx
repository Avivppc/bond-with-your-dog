import { Inter } from "next/font/google";
import { requireStaff } from "@/lib/admin";
import { adminNavFor } from "@/lib/admin-nav";
import { canPerform } from "@/lib/staff";
import { AdminSidebar } from "./_components/AdminSidebar";
import { AdminTopBar } from "./_components/AdminTopBar";

export const dynamic = "force-dynamic";

export const metadata = { title: { default: "Bonded Academy · Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

const inter = Inter({ subsets: ["latin"], variable: "--font-admin" });

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireStaff("content");

  return (
    <div
      className={`${inter.variable} min-h-screen bg-[#f8f8f8] text-[14px] leading-[1.45] text-[#1a1a19] antialiased`}
      style={{ fontFamily: "var(--font-admin), Inter, system-ui, sans-serif" }}
    >
      <AdminSidebar nav={adminNavFor(role)} />
      <div className="lg:pl-[217px]">
        <AdminTopBar email={user.email ?? ""} canSeeContacts={canPerform(role, "sales")} />
        <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
