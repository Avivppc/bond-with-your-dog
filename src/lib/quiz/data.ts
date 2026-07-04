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
  /** Google Drive CDN URL (lh3.googleusercontent.com/d/{fileId}) for the mood image shown above this question. */
  imageUrl: string;
  imageAlt: string;
}

/**
 * Tier order matters for tie-breaking: earlier tiers in this array win ties.
 * "Never recommend skipping the foundation unless Masterpiece wins clearly."
 */
export const TIER_ORDER: Tier[] = ["foundations", "movement", "masterpiece"];

/**
 * Hero image shown on the quiz intro screen.
 * Format: https://lh3.googleusercontent.com/d/{Google Drive file ID}
 * Replace file IDs here if you move images to different storage.
 */
export const QUIZ_INTRO_IMAGE_URL =
  "https://lh3.googleusercontent.com/d/1cQG8_zSYk2N068onVoSROs2ZpeUvXt4n";

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
    imageUrl: "https://lh3.googleusercontent.com/d/1tFCYGrTsshred3-infIiT7pchd02-N31",
    imageAlt: "Roni smiling together with her dog",
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
    imageUrl: "https://lh3.googleusercontent.com/d/1ZrE_w9FJEVTpwrZ4cVcfU5BiydwrS7MQ",
    imageAlt: "Dog leaping in the air while Roni sits calmly, full of aspiration",
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
    imageUrl: "https://lh3.googleusercontent.com/d/1jVku7vQb2JshFrQyGs5PVuUDQKLpc5xh",
    imageAlt: "Roni and her dog walking in perfect sync during training",
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
    imageUrl: "https://lh3.googleusercontent.com/d/1i6arXkEWdk4UwFHoSf9oA7yeQQymr8LL",
    imageAlt: "Dog flying joyfully mid-air facing Roni in a studio",
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
    imageUrl: "https://lh3.googleusercontent.com/d/1sENoXEaV4_rDrJakRo_GLEXrbVDVj3YM",
    imageAlt: "A dog gently resting its head on Roni's shoulder — an intimate bonding moment",
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
    question: `Finish this sentence… "I’ll know this journey was worth it when…"`,
    imageUrl: "https://lh3.googleusercontent.com/d/1WhV7ba1yeB56doITyJtbfw3UionAXA-F",
    imageAlt: "Roni and her dog sharing a paw — the payoff moment of deep connection",
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
  /** Hero image shown on the result screen for this tier. */
  imageUrl: string;
  imageAlt: string;
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
    imageUrl: "https://lh3.googleusercontent.com/d/1tFCYGrTsshred3-infIiT7pchd02-N31",
    imageAlt: "Roni and her dog side by side — a warm beginning",
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
    imageUrl: "https://lh3.googleusercontent.com/d/1sBDACftU79WnLdnrOQIG6onf78HmiKVc",
    imageAlt: "Dog leaping through golden afternoon light in the park",
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
    imageUrl: "https://lh3.googleusercontent.com/d/1cQG8_zSYk2N068onVoSROs2ZpeUvXt4n",
    imageAlt: "Roni embracing her dog in a dreamy purple lavender field at sunset",
  },
};
