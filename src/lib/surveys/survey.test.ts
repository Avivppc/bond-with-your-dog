import { describe, expect, it } from "vitest";
import { parseSurveyDefinition, summarize, validateAnswers, type SurveyQuestion } from "./survey";

const Q: SurveyQuestion[] = [
  { id: "q1", type: "single", prompt: "How was the chapter?", required: true, options: ["Too easy", "Just right", "Too hard"] },
  { id: "q2", type: "multi", prompt: "What did you like?", required: false, options: ["Videos", "Practice plans", "Community"] },
  { id: "q3", type: "rating", prompt: "How much fun did your dog have?", required: true, options: [] },
  { id: "q4", type: "long", prompt: "Anything else?", required: false, options: [] },
];

describe("parseSurveyDefinition", () => {
  it("accepts a complete survey and trims text", () => {
    const parsed = parseSurveyDefinition({ title: " Chapter check-in ", intro: "", thankYou: "Thanks!", questions: Q });
    expect(parsed.ok && parsed.survey.title).toBe("Chapter check-in");
  });

  it("needs options for choice questions and at least one question", () => {
    const noOptions = parseSurveyDefinition({ title: "T", intro: "", thankYou: "", questions: [{ ...Q[0], options: ["Only one"] }] });
    expect(noOptions.ok).toBe(false);
    expect(parseSurveyDefinition({ title: "T", intro: "", thankYou: "", questions: [] }).ok).toBe(false);
  });

  it("rejects duplicate question ids", () => {
    expect(parseSurveyDefinition({ title: "T", intro: "", thankYou: "", questions: [Q[0], { ...Q[3], id: "q1" }] }).ok).toBe(false);
  });
});

describe("validateAnswers", () => {
  it("keeps valid answers and drops unknown questions", () => {
    const res = validateAnswers(Q, { q1: "Just right", q2: ["Videos", "Community"], q3: 5, q4: "  Loved it  ", extra: "x" });
    expect(res).toEqual({ ok: true, answers: { q1: "Just right", q2: ["Videos", "Community"], q3: 5, q4: "Loved it" } });
  });

  it("asks for required questions", () => {
    expect(validateAnswers(Q, { q3: 4 })).toEqual({ ok: false, error: "Please answer: How was the chapter?" });
  });

  it("refuses options that aren't on the list and ratings out of range", () => {
    expect(validateAnswers(Q, { q1: "Amazing", q3: 3 }).ok).toBe(false);
    expect(validateAnswers(Q, { q1: "Too easy", q3: 6 }).ok).toBe(false);
    expect(validateAnswers(Q, { q1: "Too easy", q2: ["Videos", "Nope"], q3: 3 }).ok).toBe(false);
  });

  it("treats empty optional answers as unanswered", () => {
    expect(validateAnswers(Q, { q1: "Too easy", q2: [], q3: 2, q4: "   " })).toEqual({ ok: true, answers: { q1: "Too easy", q3: 2 } });
  });
});

describe("summarize", () => {
  it("counts choices, averages ratings and lists text answers", () => {
    const out = summarize(Q, [
      { q1: "Just right", q2: ["Videos"], q3: 5, q4: "Great" },
      { q1: "Too hard", q2: ["Videos", "Community"], q3: 3 },
    ]);
    expect(out[0]).toEqual({ id: "q1", prompt: "How was the chapter?", type: "single", answered: 2, counts: { "Too easy": 0, "Just right": 1, "Too hard": 1 } });
    expect(out[1].counts).toEqual({ Videos: 2, "Practice plans": 0, Community: 1 });
    expect(out[2]).toMatchObject({ answered: 2, average: 4 });
    expect(out[3]).toMatchObject({ answered: 1, texts: ["Great"] });
  });
});
