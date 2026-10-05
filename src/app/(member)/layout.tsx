import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GuidedTour } from "@/components/app/GuidedTour";
import { Mrs_Saint_Delafield } from "next/font/google";
import { memberViewer } from "@/lib/member/viewer";
import { Sidebar, Tabbar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { TimeZoneCapture } from "@/components/app/TimeZoneCapture";
import { StaffInviteBanner } from "@/components/app/StaffInviteBanner";
import { stuckStaffInvite } from "@/lib/auth/staff-invite-proof";
import "@/styles/member-app.css";

// Roni's signature on certificates.
const script = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"], variable: "--font-script", display: "swap" });

export const metadata = { robots: { index: false, follow: false } };

/**
 * The Member App shell (design: docs/member-app/spec.md): sidebar, sticky top bar, content column,
 * phone tab bar. Pages render their sections directly; the .screen wrapper spaces them.
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await memberViewer();
  if (!viewer) redirect("/login");
  const staffInvite = viewer.isStaff ? null : await stuckStaffInvite({ id: viewer.userId, email: viewer.email });

  return (
    <div className={`member-app ${script.variable}`}>
      <Sidebar isStaff={viewer.isStaff} />
      <div className="main">
        <Topbar viewer={viewer} />
        <main className="content" id="content">
          {staffInvite && <StaffInviteBanner email={viewer.email} role={staffInvite.role} />}
          <div className="screen on">{children}</div>
        </main>
      </div>
      <Tabbar />
      {!viewer.profile.timezone && <TimeZoneCapture />}
      <Suspense fallback={null}>
        <GuidedTour seen={viewer.profile.tours_seen} onboarded={Boolean(viewer.profile.onboarded_at)} />
      </Suspense>
    </div>
  );
}
