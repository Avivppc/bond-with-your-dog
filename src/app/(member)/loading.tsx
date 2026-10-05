/**
 * Shown the moment a member taps to another page (Next prefetches it), while the page's data
 * loads: the sidebar, top bar and tab bar stay, and the content area shows its rough shape.
 */
export default function MemberLoading() {
  return (
    <div className="stack-lg" aria-busy="true" aria-label="Loading">
      <div className="head-block">
        <div className="skel" style={{ width: 120, height: 14 }} />
        <div className="skel" style={{ width: "min(420px, 80%)", height: 34, marginTop: 10 }} />
      </div>
      <div className="skel" style={{ height: 200, borderRadius: "var(--r-lg)" }} />
      <div className="grid-2">
        <div className="skel" style={{ height: 120, borderRadius: "var(--r-md)" }} />
        <div className="skel" style={{ height: 120, borderRadius: "var(--r-md)" }} />
      </div>
    </div>
  );
}
