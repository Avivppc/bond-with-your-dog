import { describe, expect, test } from "vitest";
import {
  DEFAULT_QUIZ_CONFIG,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  QuizConfigSchema,
  absoluteHref,
  describeQuizIssue,
  isSafeHref,
  parseQuizConfig,
  quizConfigProblem,
  type QuizConfig,
  type QuizConfigQuestion,
} from "./config";
import { QUIZ_QUESTIONS, TIER_RESULTS } from "./data";
import { questionCountWord } from "./count-word";

function withQuestions(questions: QuizConfigQuestion[]): QuizConfig {
  return { ...DEFAULT_QUIZ_CONFIG, questions };
}

function withCtaHref(href: string): QuizConfig {
  const moves = { ...DEFAULT_QUIZ_CONFIG.results.moves, cta: { label: "Go", href } };
  return { ...DEFAULT_QUIZ_CONFIG, results: { ...DEFAULT_QUIZ_CONFIG.results, moves } };
}

function blankQuestion(id: number): QuizConfigQuestion {
  return { id, prompt: `Question ${id}?`, options: { A: "a", B: "b", C: "c" } };
}

describe("DEFAULT_QUIZ_CONFIG", () => {
  test("passes the schema", () => {
    expect(QuizConfigSchema.safeParse(DEFAULT_QUIZ_CONFIG).success).toBe(true);
  });

  test("is built from the questions and results in data.ts", () => {
    expect(DEFAULT_QUIZ_CONFIG.questions).toHaveLength(QUIZ_QUESTIONS.length);
    expect(DEFAULT_QUIZ_CONFIG.questions[2]).toMatchObject({
      id: QUIZ_QUESTIONS[2].id,
      key: QUIZ_QUESTIONS[2].key,
      prompt: QUIZ_QUESTIONS[2].question,
      options: { A: QUIZ_QUESTIONS[2].options[0].label, C: QUIZ_QUESTIONS[2].options[2].label },
      imageUrl: QUIZ_QUESTIONS[2].imageUrl,
    });
    expect(DEFAULT_QUIZ_CONFIG.results).toBe(TIER_RESULTS);
  });
});

describe("parseQuizConfig", () => {
  test("returns a valid saved config, trimmed", () => {
    // Arrange
    const saved = withQuestions([
      { ...blankQuestion(1), prompt: "  How long have you trained?  " },
      blankQuestion(2),
      blankQuestion(7),
    ]);

    // Act
    const config = parseQuizConfig(saved);

    // Assert
    expect(config.questions.map((q) => q.id)).toEqual([1, 2, 7]);
    expect(config.questions[0].prompt).toBe("How long have you trained?");
    expect(config.results.letsDance.headline).toBe(TIER_RESULTS.letsDance.headline);
  });

  test.each([
    ["nothing", null],
    ["a string", "quiz"],
    ["missing results", { questions: DEFAULT_QUIZ_CONFIG.questions }],
    ["an empty answer", withQuestions([{ ...blankQuestion(1), options: { A: "a", B: "   ", C: "c" } }, blankQuestion(2), blankQuestion(3)])],
    ["a missing tier", { ...DEFAULT_QUIZ_CONFIG, results: { foundations: TIER_RESULTS.foundations, moves: TIER_RESULTS.moves } }],
    ["a result filed under the wrong tier", { ...DEFAULT_QUIZ_CONFIG, results: { ...TIER_RESULTS, moves: TIER_RESULTS.foundations } }],
    ["duplicate question ids", withQuestions([blankQuestion(1), blankQuestion(1), blankQuestion(2)])],
    ["a scoring key used twice", withQuestions([{ ...blankQuestion(1), key: "goal" }, { ...blankQuestion(2), key: "goal" }, blankQuestion(3)])],
  ])("falls back to the original quiz for %s", (_label, raw) => {
    expect(parseQuizConfig(raw)).toBe(DEFAULT_QUIZ_CONFIG);
  });
});

describe("limits", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => blankQuestion(i + 1));

  test(`allows ${MIN_QUESTIONS} to ${MAX_QUESTIONS} questions`, () => {
    expect(quizConfigProblem(withQuestions(ids(MIN_QUESTIONS)))).toBeNull();
    expect(quizConfigProblem(withQuestions(ids(MAX_QUESTIONS)))).toBeNull();
  });

  test("rejects too few or too many questions with a plain message", () => {
    expect(quizConfigProblem(withQuestions(ids(MIN_QUESTIONS - 1)))).toBe(`Keep at least ${MIN_QUESTIONS} questions.`);
    expect(quizConfigProblem(withQuestions(ids(MAX_QUESTIONS + 1)))).toBe(`The quiz can have up to ${MAX_QUESTIONS} questions.`);
  });

  test("rejects text over the length limit", () => {
    const long = { ...blankQuestion(2), options: { A: "a", B: "x".repeat(241), C: "c" } };
    expect(quizConfigProblem(withQuestions([blankQuestion(1), long, blankQuestion(3)]))).toBe(
      "Question 2, answer B is too long (up to 240 characters)."
    );
  });

  test("needs at least one and at most ten 'You'll learn' items", () => {
    const empty = { ...DEFAULT_QUIZ_CONFIG.results.letsDance, learn: [] };
    const tooMany = { ...DEFAULT_QUIZ_CONFIG.results.letsDance, learn: Array.from({ length: 11 }, (_, i) => `Skill ${i}`) };
    expect(quizConfigProblem({ ...DEFAULT_QUIZ_CONFIG, results: { ...TIER_RESULTS, letsDance: empty } })).toBe(
      "The Let's Dance result's “You'll learn” list needs at least one item."
    );
    expect(quizConfigProblem({ ...DEFAULT_QUIZ_CONFIG, results: { ...TIER_RESULTS, letsDance: tooMany } })).toMatch(/up to 10 items/);
  });
});

describe("button links", () => {
  test.each(["/chapter/moves", "/courses?from=quiz#top", "https://bonded.dog/start"])("accepts %s", (href) => {
    expect(isSafeHref(href)).toBe(true);
    expect(quizConfigProblem(withCtaHref(href))).toBeNull();
  });

  test.each([
    "//evil.example/phish",
    "/\\evil.example",
    "http://bonded.dog",
    "javascript:alert(1)",
    "chapter/moves",
    "https://",
    "/chapter moves",
    "",
  ])("rejects %j", (href) => {
    expect(isSafeHref(href)).toBe(false);
    expect(quizConfigProblem(withCtaHref(href))).toMatch(/^The Moves result's button link/);
  });

  test("site paths get the site address for email; https links stay as they are", () => {
    expect(absoluteHref("/chapter/moves", "https://bonded.dog")).toBe("https://bonded.dog/chapter/moves");
    expect(absoluteHref("https://example.com/x", "https://bonded.dog")).toBe("https://example.com/x");
  });
});

describe("describeQuizIssue", () => {
  test("names the question or result field in plain words", () => {
    expect(describeQuizIssue({ path: ["questions", 0, "prompt"], message: "can't be empty." })).toBe("Question 1 can't be empty.");
    expect(describeQuizIssue({ path: ["results", "foundations", "cta", "label"], message: "can't be empty." })).toBe(
      "The Foundations result's button text can't be empty."
    );
    expect(describeQuizIssue({ path: ["results", "moves", "learn", 1], message: "can't be empty." })).toBe(
      "The Moves result's “You'll learn” line 2 can't be empty."
    );
  });
});

describe("questionCountWord", () => {
  test("spells out the question count for the intro", () => {
    expect(questionCountWord(6)).toBe("Six");
    expect(questionCountWord(3)).toBe("Three");
    expect(questionCountWord(10)).toBe("Ten");
    expect(questionCountWord(12)).toBe("12");
  });
});
