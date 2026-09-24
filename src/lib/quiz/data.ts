export type Tier = "foundations" | "moves" | "letsDance";

export type OptionId = "A" | "B" | "C";

export interface QuizOption {
  id: OptionId;
  label: string;
}

export interface QuizQuestion {
  id: number;
  /** Stable key used by the result rules in scoring.ts. */
  key: "relationship" | "goal" | "experience" | "excites" | "independence" | "worthIt";
  question: string;
  options: QuizOption[];
  imageUrl: string;
  imageAlt: string;
}

/** Order of the chapters. Used for tie-breaking and for "ceiling" comparisons. */
export const TIER_ORDER: Tier[] = ["foundations", "moves", "letsDance"];

export const TIER_LABELS: Record<Tier, string> = {
  foundations: "Bonded: Foundations",
  moves: "Bonded: Moves",
  letsDance: "Bonded: Let's Dance",
};

/** Hero image shown on the quiz intro screen. */
export const QUIZ_INTRO_IMAGE_URL = "/images/quiz/lavender-field.jpg";

/**
 * Questions per Roni's feedback (Sept 2026). The options no longer carry
 * points: the recommendation is computed by explicit rules in scoring.ts,
 * where readiness (experience + independence) sets a ceiling and the
 * preference questions choose a direction within it.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    key: "relationship",
    question: "Which best describes your relationship today?",
    imageUrl: "/images/quiz/studio-portrait.jpg",
    imageAlt: "Roni smiling together with her dog",
    options: [
      { id: "A", label: "We're just getting started." },
      { id: "B", label: "We communicate well, but I know we can do more." },
      { id: "C", label: "We're already a great team. I'm looking for our next challenge." },
    ],
  },
  {
    id: 2,
    key: "goal",
    question: "What's your biggest goal?",
    imageUrl: "/images/quiz/dog-leaping-aspiration.jpg",
    imageAlt: "Dog leaping in the air while Roni sits calmly, full of aspiration",
    options: [
      { id: "A", label: "Build trust and better communication." },
      { id: "B", label: "Learn new tricks and explore movement together." },
      { id: "C", label: "Bring our skills together through music and dance." },
    ],
  },
  {
    id: 3,
    key: "experience",
    question: "Where are you and your dog in your training journey?",
    imageUrl: "/images/quiz/walking-in-sync.jpg",
    imageAlt: "Roni and her dog walking in perfect sync during training",
    options: [
      // Roni's draft for A duplicated the independence question; reworded so
      // Q3 asks what the dog knows and Q5 asks how independently it works.
      { id: "A", label: "We're still working on the basics." },
      { id: "B", label: "My dog can perform the basic tricks." },
      {
        id: "C",
        label: "My dog can perform sequences from known movements, but I need to get better in my dancing.",
      },
    ],
  },
  {
    id: 4,
    key: "excites",
    question: "What excites you the most?",
    imageUrl: "/images/quiz/dog-flying-studio.jpg",
    imageAlt: "Dog flying joyfully mid-air facing Roni in a studio",
    options: [
      { id: "A", label: "Building a stronger everyday connection." },
      { id: "B", label: "Discovering new tricks and movements." },
      { id: "C", label: "Turning our skills into a dance." },
    ],
  },
  {
    id: 5,
    key: "independence",
    question: "How independent are your dog's trained movements?",
    imageUrl: "/images/quiz/dog-resting-head.jpg",
    imageAlt: "A dog gently resting its head on Roni's shoulder",
    options: [
      { id: "A", label: "My dog still needs food and clear guidance from my hands." },
      {
        id: "B",
        label: "My dog can perform basic tricks without any help, but is still learning more advanced movements.",
      },
      {
        id: "C",
        label: "My dog confidently performs many tricks without food or a toy in my hand, even in different environments.",
      },
    ],
  },
  {
    id: 6,
    key: "worthIt",
    question: `Finish this sentence… "I'll know this journey was worth it when…"`,
    imageUrl: "/images/quiz/holding-paw.jpg",
    imageAlt: "Roni and her dog sharing a paw",
    options: [
      { id: "A", label: "My dog understands me better." },
      { id: "B", label: "We've discovered new things we love doing together." },
      { id: "C", label: "We can express our connection through movement and music." },
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
  /** Used by the lead-capture email. */
  firstLesson: string;
  welcomeOffer: string;
  imageUrl: string;
  imageAlt: string;
}

export const TIER_RESULTS: Record<Tier, TierResultContent> = {
  foundations: {
    tier: "foundations",
    personalization:
      "Every extraordinary relationship starts with trust. You're in the perfect place.",
    headline: "Your journey begins with Bonded: Foundations.",
    supporting:
      "The strongest relationships are built on trust and communication. This is where everything begins.",
    learn: [
      "Trust & communication",
      "Engagement & focus",
      "Everyday skills",
      "Playing with a toy",
      "Basic tricks and sequences",
    ],
    cta: { label: "Start Foundations", href: "/chapter/foundations" },
    secondaryCta: { label: "Learn More", href: "/courses" },
    firstLesson: "Lesson 1: The Bond — creating instant engagement with your dog.",
    welcomeOffer: "A free welcome call with our team to personalize your first week.",
    imageUrl: "/images/quiz/studio-portrait.jpg",
    imageAlt: "Roni and her dog side by side — a warm beginning",
  },
  moves: {
    tier: "moves",
    personalization:
      "You already have a wonderful connection. Let's help you take it to the next level.",
    headline: "You're ready for Bonded: Moves.",
    supporting:
      "Your dog knows the basics. Now it's time to expand your movement vocabulary together.",
    learn: [
      "Jumping tricks",
      "Expressive tricks",
      "Directional movement",
      "Contact tricks",
      "Floor work",
      "Balance & body awareness",
    ],
    cta: { label: "Continue with Moves", href: "/chapter/moves" },
    firstLesson: "Lesson 1: Discovering Moves — how to break down a new trick.",
    welcomeOffer: "A free welcome call with our team to personalize your first week.",
    imageUrl: "/images/quiz/golden-park-leap.jpg",
    imageAlt: "Dog leaping through golden afternoon light in the park",
  },
  letsDance: {
    tier: "letsDance",
    personalization:
      "You've built something rare together. Now it's time to turn that bond into a dance.",
    headline: "You're ready for Bonded: Let's Dance.",
    supporting:
      "Your dog already works with confidence and independence. Now you'll bring it all together with music.",
    learn: [
      "Musicality",
      "Human movement",
      "Creating flow",
      "Distance and independence",
      "Delayed rewarding",
      "Choreography",
    ],
    cta: { label: "Start Let's Dance", href: "/chapter/lets-dance" },
    firstLesson: "Lesson 1: From Tricks To Dance — preparing your dog's tricks for performance.",
    welcomeOffer: "A free welcome call with our team to personalize your first week.",
    imageUrl: "/images/quiz/lavender-field.jpg",
    imageAlt: "Roni embracing her dog in a dreamy purple lavender field at sunset",
  },
};
