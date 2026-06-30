export type Tier = "foundations" | "movement" | "masterpiece";

export interface QuizOption {
  id: "A" | "B" | "C";
  label: string;
  /** Points awarded per tier when this option is chosen. Edit freely to retune the quiz. */
  points: Partial<Record<Tier, number>>;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
}

/**
 * Tier order matters for tie-breaking: earlier tiers in this array win ties.
 * "Never recommend skipping the foundation unless Masterpiece wins clearly."
 */
export const TIER_ORDER: Tier[] = ["foundations", "movement", "masterpiece"];

/**
 * Scoring weights below come directly from the quiz brief. Two notes on
 * judgment calls made while encoding it (change here if these are wrong):
 *  - Q1 and Q3 option B splits points 2/1 between Movement and Foundations,
 *    exactly as specified ("2 Movement, 1 Foundations").
 *  - Q5 uses weight 1 per option (the brief calls this question's scoring
 *    weight "lower" and says it mainly personalizes the result).
 *  - Q6 uses full weight 3 per option, matching the unweighted pattern of
 *    Q2/Q4 (only Q5 was explicitly called out as lower-weight).
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Which best describes your relationship today?",
    options: [
      {
        id: "A",
        label: "We're just getting started.",
        points: { foundations: 3 },
      },
      {
        id: "B",
        label: "We communicate well, but I know we can do more.",
        points: { movement: 2, foundations: 1 },
      },
      {
        id: "C",
        label: "We're already a great team. I'm looking for our next challenge.",
        points: { masterpiece: 3 },
      },
    ],
  },
  {
    id: 2,
    question: "What's your biggest goal?",
    options: [
      {
        id: "A",
        label: "Build trust and better communication.",
        points: { foundations: 3 },
      },
      {
        id: "B",
        label: "Find a fun activity we can enjoy together.",
        points: { movement: 3 },
      },
      {
        id: "C",
        label: "Learn dog dance and create beautiful routines.",
        points: { masterpiece: 3 },
      },
    ],
  },
  {
    id: 3,
    question: "How would you describe your dog's training experience?",
    options: [
      {
        id: "A",
        label: "Little or none.",
        points: { foundations: 3 },
      },
      {
        id: "B",
        label: "Knows the basics and enjoys learning.",
        points: { movement: 2, foundations: 1 },
      },
      {
        id: "C",
        label: "Already knows many tricks and loves working with me.",
        points: { masterpiece: 3 },
      },
    ],
  },
  {
    id: 4,
    question: "What excites you the most?",
    options: [
      {
        id: "A",
        label: "Understanding my dog better.",
        points: { foundations: 3 },
      },
      {
        id: "B",
        label: "Learning new skills together.",
        points: { movement: 3 },
      },
      {
        id: "C",
        label: "Creating something extraordinary together.",
        points: { masterpiece: 3 },
      },
    ],
  },
  {
    id: 5,
    question: "How much time do you usually have to train?",
    options: [
      { id: "A", label: "10–15 minutes.", points: { foundations: 1 } },
      { id: "B", label: "15–30 minutes.", points: { movement: 1 } },
      {
        id: "C",
        label: "I'm happy to dedicate regular practice.",
        points: { masterpiece: 1 },
      },
    ],
  },
  {
    id: 6,
    question: "Finish this sentence… “I'll know this journey was worth it when…”",
    options: [
      {
        id: "A",
        label: "My dog understands me better.",
        points: { foundations: 3 },
      },
      {
        id: "B",
        label: "We're having more fun together.",
        points: { movement: 3 },
      },
      {
        id: "C",
        label: "People see the incredible bond we've built.",
        points: { masterpiece: 3 },
      },
    ],
  },
];

export interface TierResultContent {
  tier: Tier;
  personalization: string;
  headline: string;
  supporting: string;
  learn: string[];
  cta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Used by the lead-capture email — feel free to rewrite per tier. */
  firstLesson: string;
  welcomeOffer: string;
}

export const TIER_RESULTS: Record<Tier, TierResultContent> = {
  foundations: {
    tier: "foundations",
    personalization:
      "Every extraordinary relationship starts with trust. You're in the perfect place.",
    headline: "Your journey begins with BONDED Foundations.",
    supporting:
      "The strongest relationships are built on trust and communication. This is where everything begins.",
    learn: ["Engagement", "Communication", "Positive Reinforcement", "Focus", "Trust"],
    cta: { label: "Start Foundations", href: "/chapter/foundations" },
    secondaryCta: { label: "Learn More", href: "/courses" },
    firstLesson: "Lesson 1: The First 5 Minutes — creating instant engagement with your dog.",
    welcomeOffer: "A free welcome call with our team to personalize your first week.",
  },
  movement: {
    tier: "movement",
    personalization:
      "You already have a wonderful connection. Let's help you take it to the next level.",
    headline: "You're ready for BONDED Movement.",
    supporting:
      "You already have a connection. Now it's time to grow together through movement, play and creativity.",
    learn: ["Movement", "Confidence", "Creative Exercises", "Teamwork"],
    cta: { label: "Continue with Movement", href: "/chapter/movement" },
    firstLesson: "Lesson 1: Find Your Flow — a simple game to build joyful momentum together.",
    welcomeOffer: "A free welcome call with our team to personalize your first week.",
  },
  masterpiece: {
    tier: "masterpiece",
    personalization:
      "You've built something rare together. Now it's time to turn that bond into art.",
    headline: "You're ready for BONDED Masterpiece.",
    supporting:
      "You've already built a strong relationship. Now it's time to express it through beautiful movement and dog dance.",
    learn: ["Choreography", "Musicality", "Creative Expression", "Advanced Communication"],
    cta: { label: "Start Masterpiece", href: "/chapter/masterpiece" },
    firstLesson: "Lesson 1: Reading the Room — translating connection into choreography.",
    welcomeOffer: "A free welcome call with our team to personalize your first week.",
  },
};
