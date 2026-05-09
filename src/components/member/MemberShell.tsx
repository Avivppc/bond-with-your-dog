import MemberSidebar from "./MemberSidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function MemberShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#edf8ff" }} className="min-h-screen text-slate-800">
      <MemberSidebar />
      <main className="lg:ml-64 pb-28 lg:pb-10">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
