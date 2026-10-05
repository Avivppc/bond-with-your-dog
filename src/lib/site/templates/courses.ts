import { chapterStage, iconCards, iconSteps, journeyHero, simpleCta, splitCta } from "../sections/journey";
import { page, section } from "./helpers";

/** The Courses page as it was hand-built (Oct 2026): the starting point before anyone edits it. */

const movesStage = {
  badge: "Chapter Two · Moves",
  badgeIcon: "directions_run",
  badgeColor: "secondary",
  title: "Discover how much your dog is capable of.",
  text: "Moves expands the language you built in Foundations. You'll teach your dog a varied movement vocabulary, from expressive and contact tricks to backwards, sideways and jumping skills while building confidence, coordination and understanding.",
  learn: [
    "How to break down complex tricks",
    "Ground, balance and expressive tricks",
    "Backwards and sideways movement",
    "Contact tricks performed together",
    "Confident and carefully prepared jumps",
  ].map((text) => ({ text })),
  learnColor: "secondary",
  perfectFor: [
    { icon: "school", label: "Teams who completed Bonded: Foundations" },
    { icon: "explore", label: "Dogs ready to expand their movement vocabulary" },
    { icon: "music_note", label: "Anyone preparing for the journey into dance" },
  ],
  perfectColor: "primary",
  outcome: "A confident dog with a growing vocabulary of movements you can perform together.",
  outcomeColor: "secondary",
  testimonial: "mara",
  button: { label: "Learn the Moves", href: "/chapter/moves" },
  buttonColor: "secondary",
  image: { src: "/images/photos/borderonis-06.jpg", alt: "Border collie standing on a stair rail, nose to nose with Roni" },
  imageShape: "landscape",
  imageSide: "left",
  background: "white",
};

const letsDanceStage = {
  badge: "Chapter Three · Let's Dance",
  badgeIcon: "music_note",
  badgeColor: "tertiary",
  title: "Turn your movements into a dance.",
  text: "Let's Dance brings the pieces together. You'll prepare your dog's tricks for performance, develop your own movement and learn how to combine both with flow, expression and music—without losing your dog's confidence or connection.",
  learn: [
    "How to prepare tricks for dancing",
    "Human movement and musical expression",
    "How to move without distracting your dog",
    "Distance, independence and delayed reward",
    "Sequences that flow with the music",
  ].map((text) => ({ text })),
  learnColor: "tertiary",
  perfectFor: [
    { icon: "school", label: "Teams who completed Bonded: Moves" },
    { icon: "person", label: "Handlers ready to become part of the movement" },
    { icon: "celebration", label: "Anyone ready to build their first dance or take their dog dancing to the next level" },
  ],
  perfectColor: "secondary",
  outcome: "A dance where you, your dog and the music move as one.",
  outcomeColor: "tertiary",
  testimonial: "sanna",
  button: { label: "Build Your Dance", href: "/chapter/lets-dance" },
  buttonColor: "tertiary",
  image: { src: "/images/photos/borderonis-19.jpg", alt: "Roni in a dance pose with her border collie leaning on her leg" },
  imageShape: "landscape",
  imageSide: "right",
  background: "low",
  bottomGlow: true,
};

export function coursesTemplate() {
  return page(
    [
      section(journeyHero, "hero"),
      section(iconSteps, "overview"),
      section(chapterStage, "foundations"),
      section(chapterStage, "moves", movesStage),
      section(chapterStage, "lets-dance", letsDanceStage),
      section(iconCards, "principles"),
      section(splitCta, "quiz-cta"),
      section(simpleCta, "final-cta"),
    ],
    true,
  );
}
