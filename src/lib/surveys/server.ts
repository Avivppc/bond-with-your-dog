import "server-only";
import { fetchAll, type ServiceClient } from "@/lib/flows/server/data";
import { parseSurveyDefinition, type SurveyAnswers, type SurveyDefinition } from "./survey";

/** Survey reads and writes for the admin and the member app (service role, after auth checks). */

export type SurveyStatus = "draft" | "published" | "closed";

export interface SurveyRecord extends SurveyDefinition {
  id: string;
  status: SurveyStatus;
  courseId: string | null;
  updatedAt: string;
}

const COLUMNS = "id, title, intro, thank_you, questions, status, course_id, updated_at";

interface SurveyDbRow {
  id: string;
  title: string;
  intro: string;
  thank_you: string;
  questions: unknown;
  status: SurveyStatus;
  course_id: string | null;
  updated_at: string;
}

/** Stored questions are checked again on the way out; a broken row reads as having none. */
function toRecord(row: SurveyDbRow): SurveyRecord {
  const parsed = parseSurveyDefinition({ title: row.title, intro: row.intro, thankYou: row.thank_you, questions: row.questions });
  const questions = parsed.ok ? parsed.survey.questions : [];
  return { id: row.id, title: row.title, intro: row.intro, thankYou: row.thank_you, questions, status: row.status, courseId: row.course_id, updatedAt: row.updated_at };
}

export async function loadSurvey(sb: ServiceClient, id: string): Promise<SurveyRecord | null> {
  const { data, error } = await sb.from("surveys").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`survey unavailable: ${error.message}`);
  return data ? toRecord(data as SurveyDbRow) : null;
}

export interface SurveyListItem extends SurveyRecord {
  responses: number;
}

export async function loadSurveyList(sb: ServiceClient): Promise<SurveyListItem[]> {
  const [{ data, error }, responses] = await Promise.all([
    sb.from("surveys").select(COLUMNS).order("updated_at", { ascending: false }),
    fetchAll<{ survey_id: string }>((from, to) => sb.from("survey_responses").select("survey_id").order("id").range(from, to)),
  ]);
  if (error) throw new Error(`surveys unavailable: ${error.message}`);
  return ((data ?? []) as SurveyDbRow[]).map((row) => ({ ...toRecord(row), responses: responses.filter((r) => r.survey_id === row.id).length }));
}

export interface SurveyResponseRow {
  userId: string;
  answers: SurveyAnswers;
  createdAt: string;
}

export async function loadResponses(sb: ServiceClient, surveyId: string): Promise<SurveyResponseRow[]> {
  const rows = await fetchAll<{ user_id: string; answers: SurveyAnswers; created_at: string }>((from, to) =>
    sb.from("survey_responses").select("user_id, answers, created_at").eq("survey_id", surveyId).order("created_at", { ascending: false }).order("id").range(from, to),
  );
  return rows.map((r) => ({ userId: r.user_id, answers: r.answers, createdAt: r.created_at }));
}

/** The published survey at the end of a chapter that this member hasn't answered yet, if any. */
export async function pendingChapterSurvey(sb: ServiceClient, userId: string, courseId: string): Promise<{ id: string; title: string } | null> {
  const { data, error } = await sb.from("surveys").select("id, title").eq("course_id", courseId).eq("status", "published").order("created_at").limit(5);
  if (error || !data?.length) return null;
  const { data: answered } = await sb.from("survey_responses").select("survey_id").eq("user_id", userId).in("survey_id", data.map((s) => s.id));
  const done = new Set((answered ?? []).map((a) => a.survey_id));
  return data.find((s) => !done.has(s.id)) ?? null;
}

export async function memberResponse(sb: ServiceClient, surveyId: string, userId: string): Promise<{ answers: SurveyAnswers; createdAt: string } | null> {
  const { data } = await sb.from("survey_responses").select("answers, created_at").eq("survey_id", surveyId).eq("user_id", userId).maybeSingle();
  return data ? { answers: data.answers as SurveyAnswers, createdAt: data.created_at as string } : null;
}
