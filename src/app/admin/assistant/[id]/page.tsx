import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { LocalTime } from "@/components/ui/LocalTime";
import { Card, MUTED, PageHeader, StatusPill } from "../../_components/ui";
import { PROVIDER_LABEL, loadConversation, type ConversationDetail } from "../data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistant" };

function Facts({ c }: { c: ConversationDetail }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[14px]">
      <dt className={MUTED}>Who</dt>
      <dd>{c.email ?? "Visitor"}</dd>
      <dt className={MUTED}>Where</dt>
      <dd>
        {c.lesson ? (
          <Link className="hover:underline" href={`/learn/${c.lesson.courseId}/${c.lesson.id}?tab=questions`}>
            Lesson: {c.lesson.title}
          </Link>
        ) : (
          (c.page ?? (c.mode === "member" ? "Member area" : "Sales page"))
        )}
      </dd>
      <dt className={MUTED}>Started</dt>
      <dd>
        <LocalTime iso={c.createdAt} format="longDateTime" zoneLabel />
      </dd>
      <dt className={MUTED}>Handed to Roni</dt>
      <dd>{c.handedOff ? <StatusPill tone="warning">Yes</StatusPill> : "No"}</dd>
    </dl>
  );
}

function Message({ m }: { m: ConversationDetail["messages"][number] }) {
  const mine = m.role === "user";
  return (
    <li className={`flex flex-col gap-1 ${mine ? "items-start" : "items-end"}`}>
      <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-[12px] px-4 py-3 text-[14px] ${mine ? "bg-[#f3f3f2]" : "bg-[#e6f0fb]"}`} dir="auto">
        {m.content}
      </div>
      <span className={`text-[12px] ${MUTED}`}>
        {mine ? "Question" : `Reply · ${m.provider ? (PROVIDER_LABEL[m.provider] ?? m.provider) : "—"}${m.tokens ? ` · ${m.tokens}` : ""}`} ·{" "}
        <LocalTime iso={m.createdAt} format="time" />
      </span>
    </li>
  );
}

/** One assistant conversation, in full. */
export default async function AssistantConversationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const conversation = await loadConversation(createServiceClient(), id);
  if (!conversation) notFound();

  return (
    <>
      <PageHeader
        title="Conversation"
        crumbs={[{ label: "Assistant", href: "/admin/assistant" }, { label: "Conversation" }]}
        description={conversation.mode === "member" ? "A member asking inside a lesson." : "A visitor on the sales pages."}
      />
      <div className="flex flex-col gap-6">
        <Card>
          <Facts c={conversation} />
        </Card>
        <Card title={`${conversation.messages.length} messages`}>
          <ol className="flex flex-col gap-4">
            {conversation.messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
