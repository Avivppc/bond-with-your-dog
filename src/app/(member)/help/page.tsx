import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { Ms } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { HelpCenter } from "./HelpCenter";
import { SupportForm } from "./SupportForm";

export const metadata = { title: "Help" };

interface RequestRow {
  id: string;
  kind: "question" | "bug" | "story";
  subject: string | null;
  body: string;
  status: "open" | "answered" | "closed";
  answer: string | null;
  created_at: string;
}

const KIND_LABEL: Record<RequestRow["kind"], string> = { question: "Question", bug: "Problem report", story: "Story" };

function YourRequests({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) return null;
  return (
    <div className="card tight">
      <span className="eyebrow muted">Your requests</span>
      <div className="list">
        {requests.map((r) => (
          <div key={r.id} className="stack" style={{ gap: 6, padding: "12px 0" }}>
            <div className="faint">
              {KIND_LABEL[r.kind]} · <LocalTime iso={r.created_at} format="shortDate" />
              {" · "}
              {r.answer ? "Answered" : r.status === "closed" ? "Closed" : "Waiting for the team"}
            </div>
            <b style={{ whiteSpace: "pre-wrap" }}>{r.subject ?? r.body}</b>
            {r.answer && (
              <div className="tip">
                <Ms name="support_agent" />
                <div style={{ whiteSpace: "pre-wrap" }}>{r.answer}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HelpPage() {
  await requireMember("/help");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("id, kind, subject, body, status, answer, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) console.error("[help] requests load failed", error.message);

  const aside = (
    <>
      <div className="card tight">
        <span className="ms" style={{ color: "var(--teal)" }} aria-hidden>
          support_agent
        </span>
        <b>Ask Roni about training</b>
        <p className="faint">Send a video or a question. Roni answers training questions herself.</p>
        <Link className="btn btn-ghost btn-sm" href="/feedback/new" style={{ alignSelf: "flex-start" }}>
          Ask Roni
        </Link>
      </div>
      <SupportForm kind="question" />
      <SupportForm kind="bug" />
      <YourRequests requests={(data ?? []) as RequestRow[]} />
    </>
  );

  return <HelpCenter aside={aside} />;
}
