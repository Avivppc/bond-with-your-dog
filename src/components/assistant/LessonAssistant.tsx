import { createServiceClient } from "@/lib/supabase/admin";
import { loadAssistantSettings } from "@/lib/assistant/settings";
import { Ms } from "@/components/app/ui";
import AssistantPanel from "./AssistantPanel";

/** Collapsible "Ask about this lesson" card on the lesson page; shown only while the member assistant is on. */
export default async function LessonAssistant({ lessonId }: { lessonId: string }) {
  const settings = await loadAssistantSettings(createServiceClient());
  if (!settings.membersEnabled) return null;
  return (
    <details className="card tight">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <Ms name="forum" />
        <span className="grow">Ask about this lesson</span>
        <Ms name="expand_more" size="sm" />
      </summary>
      <AssistantPanel
        mode="member"
        lessonId={lessonId}
        title="Ask Bonded"
        intro="Answers come from the lessons in your chapters. If it needs Roni's eye, it goes to Roni."
      />
    </details>
  );
}
