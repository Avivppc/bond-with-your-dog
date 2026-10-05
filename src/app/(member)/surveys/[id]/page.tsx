import { notFound } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/member/viewer";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadSurvey, memberResponse } from "@/lib/surveys/server";
import { LocalTime } from "@/components/ui/LocalTime";
import { SurveyForm } from "./SurveyForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Survey" };

const Id = z.string().uuid();

export default async function MemberSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireMember(`/surveys/${id}`);
  if (!Id.safeParse(id).success) notFound();
  const sb = createServiceClient();
  const survey = await loadSurvey(sb, id);
  if (!survey || survey.status === "draft") notFound();
  const previous = await memberResponse(sb, survey.id, viewer.userId);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 22 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow">A few questions from Roni</span>
        <h1 className="display">{survey.title}</h1>
        {survey.intro && <p className="lede">{survey.intro}</p>}
        {previous && (
          <p className="faint">
            You answered on <LocalTime iso={previous.createdAt} format="longDate" />. You can change your answers below.
          </p>
        )}
      </header>
      {survey.status === "closed" ? (
        <div className="card">
          <p className="lede">This survey is closed. Thank you for being here.</p>
        </div>
      ) : (
        <SurveyForm surveyId={survey.id} questions={survey.questions} thankYou={survey.thankYou} initial={previous?.answers ?? null} />
      )}
    </div>
  );
}
