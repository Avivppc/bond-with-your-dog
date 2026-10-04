import "@/styles/member-app.css";
import { MEMBER_APP_METADATA } from "@/lib/install/member-app-metadata";
import { InstallPromptCapture } from "@/components/app/install/InstallPromptCapture";

export const metadata = MEMBER_APP_METADATA;

/** Bare Member App screens (onboarding): no sidebar or top bar. */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-app bare">
      <InstallPromptCapture />
      <div className="main">
        <main className="content">
          <div className="screen on">{children}</div>
        </main>
      </div>
    </div>
  );
}
