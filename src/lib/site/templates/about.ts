import { storyCta, storyHero, storyImageText, storyIntro, storyMediaPair } from "../sections/story";
import { page, section } from "./helpers";

/** The About page as it was hand-built (Oct 2026): the starting point before anyone edits it. */
export function aboutTemplate() {
  return page(
    [
      section(storyHero, "hero"),
      section(storyIntro, "intro"),
      section(storyImageText, "beginning"),
      section(storyImageText, "belief", {
        eyebrow: "Our Philosophy",
        eyebrowIcon: "visibility",
        heading: "Every dog is already communicating. Most of us simply haven't learned the *language* yet.",
        highlightStyle: "primary",
        text: "I don't believe in forcing dogs to obey. I believe in creating a relationship where communication comes naturally. When trust comes first, everything else becomes easier.\n\nLearning becomes play. Training becomes quality time. Movement becomes conversation. And suddenly, you're no longer teaching your dog… You're growing together.",
        image: { src: "/images/photos/borderonis-10.jpg", alt: "Roni kneeling in a corridor, two border collies watching her" },
        imageShape: "classic",
        layout: "top",
        background: "surface",
        quote: "none",
      }),
      section(storyImageText, "why", {
        heading: "I wanted everyone to *experience* this feeling.",
        highlightStyle: "primary_italic",
        text: "Over the years, people kept asking me, “How can I create this kind of relationship with my dog?”\n\nMy dogs taught me that tricks alone are not enough. Real connection comes from giving your dog a reason to choose you, building trust and putting the relationship before the results.\n\nThat is why I created Bonded.",
        emphasis: "lead",
        image: { src: "/images/photos/borderonis-12.jpg", alt: "Roni kneeling and rewarding two border collies" },
        imageSide: "right",
        layout: "top_wide",
        background: "highest",
        quote: "none",
      }),
      section(storyMediaPair, "agt"),
      section(storyImageText, "promise", {
        heading: "I want this journey to *feel different*.",
        highlightStyle: "light_italic",
        text: "You'll never hear me talk about perfect dogs. Because that's not what I'm here to help you create. I'm here to help you build a relationship filled with trust, curiosity, confidence, and joy.\n\nWherever you are starting, Bonded gives you and your dog a clear path forward.",
        emphasis: "closing",
        image: { src: "/images/photos/borderonis-03.jpg", alt: "Roni sitting on a staircase with her dog resting beside her" },
        imageShape: "classic",
        imageStyle: "tilted",
        imageSide: "right",
        background: "primary",
        quote: "none",
      }),
      section(storyCta, "final-cta"),
    ],
    false,
  );
}
