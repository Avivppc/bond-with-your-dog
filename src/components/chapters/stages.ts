import type { Tier } from "@/lib/quiz/data";

/**
 * The three chapters as the website presents them (copy per Roni's brief, Sept 2026). Shared by the
 * public /courses page and the member app's "choose your chapter" view, so both always match.
 */

export interface PerfectFor {
  icon: string;
  label: string;
}

export interface Stage {
  badge: string;
  badgeBg: string;
  badgeIcon: string;
  title: string;
  body: string;
  learn: string[];
  learnColor: string;
  perfectFor: PerfectFor[];
  perfectColor: string;
  outcome: string;
  outcomeColor: string;
  outcomeBg: string;
  /** Id of the student quote shown under the outcome. */
  testimonialId: string;
  /** Which chapter this stage sells; reported with the CTA click. */
  plan: Tier;
  /** The course this chapter is in the platform (see src/lib/kajabi-import/plan.ts). */
  courseId: string;
  ctaLabel: string;
  ctaHref: string;
  ctaBg: string;
  img: string;
  imgAlt: string;
  /** Tailwind aspect class matching the photo's orientation. */
  imgAspect: string;
  sectionBg: string;
  reverse: boolean;
}

export const STAGES: readonly Stage[] = [
  {
    badge: "Chapter One · Foundations",
    badgeBg: "bg-primary-container/20 text-primary-dim",
    badgeIcon: "favorite",
    title: "Build the foundation everything else grows from.",
    body: "Foundations is where you and your dog learn how to learn together. You'll build trust, communication and engagement, then turn them into everyday skills, confident movement and your first experiences of dancing as one.",
    learn: [
      "A clear shared language",
      "Engagement & focus",
      "Calm, practical everyday skills",
      "Understanding prey drive and how to play with your dog",
      "Confident movement and body awareness",
      "Tricks, the idea of sequences and mini dances",
    ],
    learnColor: "text-primary",
    perfectFor: [
      { icon: "pets", label: "New dogs and new partnerships" },
      { icon: "diversity_1", label: "Dogs of every age and experience" },
      { icon: "handshake", label: "Anyone ready to build a stronger bond" },
    ],
    perfectColor: "text-secondary",
    outcome: "A dog who understands you, chooses you and is ready to learn with you.",
    outcomeColor: "text-primary",
    outcomeBg: "bg-surface-container-lowest border border-surface-variant/50",
    testimonialId: "jessica",
    plan: "foundations",
    courseId: "bonded-foundations",
    ctaLabel: "Start with Foundations",
    ctaHref: "/chapter/foundations",
    ctaBg: "bg-primary text-on-primary shadow-lg",
    img: "/images/photos/borderonis-02.jpg",
    imgAlt: "Roni sitting on a staircase, her dog resting a paw on her knee",
    imgAspect: "aspect-[4/5]",
    sectionBg: "bg-surface-container-low",
    reverse: false,
  },
  {
    badge: "Chapter Two · Moves",
    badgeBg: "bg-secondary-container/30 text-secondary-dim",
    badgeIcon: "directions_run",
    title: "Discover how much your dog is capable of.",
    body: "Moves expands the language you built in Foundations. You'll teach your dog a varied movement vocabulary, from expressive and contact tricks to backwards, sideways and jumping skills while building confidence, coordination and understanding.",
    learn: [
      "How to break down complex tricks",
      "Ground, balance and expressive tricks",
      "Backwards and sideways movement",
      "Contact tricks performed together",
      "Confident and carefully prepared jumps",
    ],
    learnColor: "text-secondary",
    perfectFor: [
      { icon: "school", label: "Teams who completed Bonded: Foundations" },
      { icon: "explore", label: "Dogs ready to expand their movement vocabulary" },
      { icon: "music_note", label: "Anyone preparing for the journey into dance" },
    ],
    perfectColor: "text-primary",
    outcome: "A confident dog with a growing vocabulary of movements you can perform together.",
    outcomeColor: "text-secondary",
    outcomeBg: "bg-surface-container-low",
    testimonialId: "mara",
    plan: "moves",
    courseId: "bonded-moves",
    ctaLabel: "Learn the Moves",
    ctaHref: "/chapter/moves",
    ctaBg: "bg-secondary text-on-secondary shadow-lg",
    img: "/images/photos/borderonis-06.jpg",
    imgAlt: "Border collie standing on a stair rail, nose to nose with Roni",
    imgAspect: "aspect-[4/3]",
    sectionBg: "bg-surface-container-lowest",
    reverse: true,
  },
  {
    badge: "Chapter Three · Let's Dance",
    badgeBg: "bg-tertiary-container/30 text-tertiary-dim",
    badgeIcon: "music_note",
    title: "Turn your movements into a dance.",
    body: "Let's Dance brings the pieces together. You'll prepare your dog's tricks for performance, develop your own movement and learn how to combine both with flow, expression and music—without losing your dog's confidence or connection.",
    learn: [
      "How to prepare tricks for dancing",
      "Human movement and musical expression",
      "How to move without distracting your dog",
      "Distance, independence and delayed reward",
      "Sequences that flow with the music",
    ],
    learnColor: "text-tertiary",
    perfectFor: [
      { icon: "school", label: "Teams who completed Bonded: Moves" },
      { icon: "person", label: "Handlers ready to become part of the movement" },
      {
        icon: "celebration",
        label: "Anyone ready to build their first dance or take their dog dancing to the next level",
      },
    ],
    perfectColor: "text-secondary",
    outcome: "A dance where you, your dog and the music move as one.",
    outcomeColor: "text-tertiary",
    outcomeBg: "bg-surface-container-lowest border border-surface-variant/50",
    testimonialId: "sanna",
    plan: "letsDance",
    courseId: "bonded-lets-dance",
    ctaLabel: "Build Your Dance",
    ctaHref: "/chapter/lets-dance",
    ctaBg: "bg-tertiary text-on-tertiary shadow-lg",
    img: "/images/photos/borderonis-19.jpg",
    imgAlt: "Roni in a dance pose with her border collie leaning on her leg",
    imgAspect: "aspect-[4/3]",
    sectionBg: "bg-surface-container-low",
    reverse: false,
  },
];
