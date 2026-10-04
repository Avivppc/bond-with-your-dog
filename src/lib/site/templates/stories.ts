import { simpleCta, splitCta } from "../sections/journey";
import { photoHero, pillList, quoteGrid } from "../sections/text";
import { page, section } from "./helpers";

/** The Stories page as it was hand-built (Oct 2026): the starting point before anyone edits it. */
export function storiesTemplate() {
  return page(
    [
      section(photoHero, "hero"),
      section(pillList, "countries"),
      section(quoteGrid, "quotes"),
      section(splitCta, "share", {
        heading: "Share your story.",
        text: "Did BONDED change something between you and your dog? Send Roni a few sentences and a photo, and your story could be featured here.",
        // The form lands in Admin → Inbox → Stories.
        button: { label: "Send your story", href: "/stories/share" },
        image: { src: "/images/photos/borderonis-17.jpg", alt: "Roni sitting on a staircase with her five dogs" },
        color: "secondary",
        size: "compact",
      }),
      section(simpleCta, "final-cta", {
        heading: "The next story could be yours.",
        text: "Begin with Foundations and build the relationship you've always wanted with your dog.",
        smallText: "",
        button: { label: "Start with Foundations", href: "/chapter/foundations" },
        size: "compact",
      }),
    ],
    false,
  );
}
