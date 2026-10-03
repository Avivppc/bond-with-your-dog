import type { Metadata } from "next";
import { loadQuizConfig } from "@/lib/quiz/config-server";
import { questionCountWord } from "@/lib/quiz/count-word";
import QuizFlow from "./QuizFlow";

// Staff edit the quiz in the admin; visitors should see the latest version right away.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { questions } = await loadQuizConfig();
  return {
    description: `${questionCountWord(questions.length)} quick questions to discover which BONDED chapter fits you and your dog.`,
  };
}

export default async function QuizPage() {
  const { questions, results } = await loadQuizConfig();
  return <QuizFlow questions={questions} results={results} />;
}
