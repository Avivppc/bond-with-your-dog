import { simpleCta, splitCta } from "../sections/journey";
import { photoHero, pillList, quoteGrid } from "../sections/text";
import { page, section } from "./helpers";

const SHARE_MAILTO = `mailto:{{contact_email}}?subject=${encodeURIComponent("Our BONDED story")}&body=${encodeURIComponent(
  "Hi Roni,\n\nOur names: \nOur dog: \nWhich chapter we did: \nOur story (a few sentences): \n\nWe're attaching a photo or a short video. You're welcome to share it on bonded.dog.\n",
)}`;

/** The Stories page as it was hand-built (Oct 2026): the starting point before anyone edits it. */
export function storiesTemplate() {
  return page(
    [
      section(photoHero, "hero"),
      section(pillList, "countries"),
      section(quoteGrid, "quotes"),
      section(splitCta, "share", {
        heading: "Share your story.",
        text: "Did BONDED change something between you and your dog? Send Roni a few sentences and a photo or short video, and your story could be featured here.",
        // Goes to the contact email in Settings → General, with a story template filled in.
        button: { label: "Send your story", href: SHARE_MAILTO },
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
