import "@/styles/member-app.css";

export const metadata = { robots: { index: false, follow: false } };

/** Bare Member App screens (onboarding): no sidebar or top bar. */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-app bare">
      <div className="main">
        <main className="content">
          <div className="screen on">{children}</div>
        </main>
      </div>
    </div>
  );
}
