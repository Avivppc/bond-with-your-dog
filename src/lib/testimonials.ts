import type { Tier } from "@/lib/quiz/data";

/**
 * Student testimonials, curated from the BONDED students group (consent
 * confirmed by Roni, Sept 2026). Quotes are shortened, never reworded.
 * Source sheet: "Testimonials - Keta Tov - Jun 2026".
 */
export interface Testimonial {
  id: string;
  /** Handler first name (and last name where they post publicly under it). */
  name: string;
  dog: string;
  country?: string;
  quote: string;
  /** One line of context shown under the name. */
  detail?: string;
  /** Chapter this quote best supports. */
  tier?: Tier;
  /** Public video the student shared with the quote. */
  videoUrl?: string;
  /** Photo of the handler with their dog (under /public/images/students). TODO: collect from students. */
  photoUrl?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "jessica",
    name: "Jessica & Sprinkles",
    dog: "Sprinkles",
    quote:
      "Thank you Roni for helping us lay down strong foundations from the beginning. It makes ALL the difference!",
    detail: "Sprinkles performed her first routine in front of a crowd at 11 months old",
    tier: "foundations",
    videoUrl: "https://www.facebook.com/reel/1419349189020864",
  },
  {
    id: "lili",
    name: "Lili & Ellie",
    dog: "Ellie",
    country: "Hungary",
    quote: "I never thought a bond between a dog and people can be so strong.",
    detail: "Ellie is Lili's first dog",
    tier: "foundations",
    videoUrl: "https://www.facebook.com/reel/1123455572007692",
  },
  {
    id: "magali",
    name: "Magalí & Tina",
    dog: "Tina",
    country: "Argentina",
    quote:
      "Having a more specific and organized communication system helped me a lot in training Tina.",
    detail: "Tina started at almost 12 years old",
    tier: "foundations",
    videoUrl: "https://www.facebook.com/reel/384406360774119",
  },
  {
    id: "katya",
    name: "Katya & Unic",
    dog: "Unic",
    quote:
      "I never saw her that interested in training! I could see that she really wanted to give me all the behaviors she can do.",
    tier: "foundations",
    videoUrl: "https://www.facebook.com/reel/264532233186584",
  },
  {
    id: "mara",
    name: "Mara & Whiskey",
    dog: "Whiskey",
    country: "Romania",
    quote:
      "Never in the 6.5 years since I had him did I manage to make him do it. Today we managed the first steps.",
    detail: "Whiskey is a 6-year-old Border Collie whose main sport is agility",
    tier: "moves",
    videoUrl: "https://www.facebook.com/reel/346920428221441",
  },
  {
    id: "janina",
    name: "Janina & Kala",
    dog: "Kala",
    country: "Costa Rica",
    quote: "Kala's progress after one week of training. She has so much fun.",
    detail: "Kala is a 1-year-old mini Schnauzer",
    tier: "foundations",
    videoUrl: "https://www.facebook.com/reel/489587073489468",
  },
  {
    id: "birgit",
    name: "Birgit & Birdy",
    dog: "Birdy",
    country: "Germany",
    quote: "We'd love to learn, just for fun. This is so great and exactly what I waited for.",
    detail: "Birdy is an Irish rescue collie",
    tier: "moves",
  },
  {
    id: "jack",
    name: "Jack & Cowboy",
    dog: "Cowboy",
    quote:
      "Cowboy is recovering from surgery. Using techniques from Roni's course makes it easier for him to maintain a forward posture.",
    tier: "moves",
    videoUrl: "https://www.facebook.com/reel/1046481680189296",
  },
  {
    id: "sanna",
    name: "Sanna & Rilla",
    dog: "Rilla",
    country: "Finland",
    quote:
      "We compete in freestyle and HTM open class, and we're starting Roni's online courses. We're really excited!",
    detail: "Rilla is a 7-year-old Shetland Sheepdog",
    tier: "letsDance",
    videoUrl: "https://youtu.be/nOtSPIexVTA",
  },
  {
    id: "shari",
    name: "Shari & Linus",
    dog: "Linus",
    quote:
      "I am very much a beginner and I worried that the online format wouldn't work for me. I was WRONG. The courses are well planned and the videos are clear.",
    tier: "foundations",
    videoUrl: "https://youtu.be/4-uaGxXWKwg",
  },
];

/** Quotes about Roni herself, used on the About page. */
export const ABOUT_TESTIMONIALS: Testimonial[] = [
  {
    id: "mara-roni",
    name: "Mara & Whiskey",
    dog: "Whiskey",
    country: "Romania",
    quote: "I fell in love with her way of teaching and her mentality towards the sport and training.",
  },
  {
    id: "mary",
    name: "Mary Ohashi",
    dog: "",
    quote: "You've now shown the world what's possible.",
    detail: "After the AGT finals",
  },
];

export function testimonialsFor(tier: Tier): Testimonial[] {
  return TESTIMONIALS.filter((t) => t.tier === tier);
}

export function testimonialById(id: string): Testimonial | undefined {
  return TESTIMONIALS.find((t) => t.id === id);
}
