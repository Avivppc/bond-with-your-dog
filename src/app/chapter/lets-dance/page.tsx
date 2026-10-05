import ChapterPlaceholder from "@/components/quiz/ChapterPlaceholder";
import SalesAssistant from "@/components/assistant/SalesAssistant";
import { loadQuizConfig } from "@/lib/quiz/config-server";

export const metadata = { title: "Bonded: Let's Dance" };
// Shows the quiz result copy staff edit in the admin, so render it fresh each time.
export const dynamic = "force-dynamic";

export default async function LetsDancePage() {
  const { results } = await loadQuizConfig();
  return (<><ChapterPlaceholder tier="letsDance" result={results.letsDance} /><SalesAssistant /></>);
}
