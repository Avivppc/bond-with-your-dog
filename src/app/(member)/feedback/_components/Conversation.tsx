import { LocalTime } from "@/components/ui/LocalTime";

export interface ConversationMessage {
  id: string;
  body: string;
  from_staff: boolean;
  created_at: string;
}

/** Messages under a feedback video, oldest first. `staffView` flips who "You" is. */
export function Conversation({ messages, staffView = false, memberName }: { messages: ConversationMessage[]; staffView?: boolean; memberName?: string }) {
  if (messages.length === 0) return null;
  return (
    <div className="list" aria-label="Conversation">
      {messages.map((m) => {
        const who = m.from_staff ? (staffView ? "Roni's team" : "Roni") : staffView ? (memberName ?? "Member") : "You";
        return (
          <div key={m.id} className="list-row" style={{ alignItems: "flex-start", padding: "10px 0" }}>
            <div className="grow">
              <div className="faint">
                <b style={{ color: "var(--ink)" }}>{who}</b> · <LocalTime iso={m.created_at} format="dateTime" />
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
