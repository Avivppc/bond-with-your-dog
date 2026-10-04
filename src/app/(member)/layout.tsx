import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GuidedTour } from "@/components/app/GuidedTour";
import { Mrs_Saint_Delafield } from "next/font/google";
import { memberViewer } from "@/lib/member/viewer";
import { Sidebar, Tabbar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { TimeZoneCapture } from "@/components/app/TimeZoneCapture";
import { MemberBanners } from "@/components/app/MemberBanners";
import { MemberPreviewBridge } from "@/components/app/MemberPreviewBridge";
import { RegisterServiceWorker } from "@/components/app/RegisterServiceWorker";
import { InstallGuide } from "@/components/app/install/InstallGuide";
import { InstallNudge } from "@/components/app/install/InstallNudge";
import { MEMBER_APP_METADATA } from "@/lib/install/member-app-metadata";
import { loadMemberArea } from "@/lib/member-area/server";
import { activeBanners, memberCss, memberFontsHref, memberNav } from "@/lib/member-area/settings";
import { loadLiveTheme } from "@/lib/site/server";
import { createClient } from "@/lib/supabase/server";
import "@/styles/member-app.css";
import "@/styles/install.css";

// Roni's signature on certificates.
const script = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"], variable: "--font-script", display: "swap" });

export const metadata = MEMBER_APP_METADATA;

/** Today in the member's time zone (banners run by calendar day). */
function today(timezone: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone ?? "UTC" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Any active enrollment counts (limited access too), as on the home page. */
async function hasChapter(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if (error) console.error("[member layout] enrollment check failed", error.message);
  return (count ?? 0) > 0;
}

/**
 * The Member App shell (design: docs/member-app/spec.md): sidebar, sticky top bar, content column,
 * phone tab bar. Its look, menu, banners and home screen come from Website → Member area.
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await memberViewer();
  if (!viewer) redirect("/login");

  const [{ settings, preview }, site] = await Promise.all([loadMemberArea(viewer.isStaff), loadLiveTheme()]);
  // Only ask the database when a banner is aimed at members with or without a chapter.
  const withChapter = settings.banners.some((b) => b.audience !== "all") ? await hasChapter(viewer.userId) : false;
  const nav = memberNav(settings.menu);
  const css = memberCss(settings.look, site, { all: preview });
  const fontsHref = memberFontsHref(settings.look, site, { all: preview });
  const banners = activeBanners(settings.banners, today(viewer.profile.timezone), withChapter);

  return (
    <div className={`member-app ${script.variable}`}>
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
      {/* Built only from validated hex colors, a fixed font list and fixed radii. */}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <Sidebar isStaff={viewer.isStaff} nav={nav.main} foot={nav.foot} logo={settings.look.logo} />
      <div className="main">
        <Topbar viewer={viewer} logo={settings.look.logo} />
        <main className="content" id="content">
          <div className="screen on">
            <MemberBanners banners={banners} />
            {children}
          </div>
        </main>
      </div>
      <Tabbar tabs={nav.tabs} />
      {!viewer.profile.timezone && <TimeZoneCapture />}
      {!preview && (
        <>
          <RegisterServiceWorker />
          <InstallGuide email={viewer.email} />
          <InstallNudge />
        </>
      )}
      {preview && <MemberPreviewBridge />}
      {/* The tour would cover the screen in the editor's preview. */}
      {!preview && (
        <Suspense fallback={null}>
          <GuidedTour seen={viewer.profile.tours_seen} onboarded={Boolean(viewer.profile.onboarded_at)} />
        </Suspense>
      )}
    </div>
  );
}
