import { coach, faq, featureCards, gradientCta, heroVideo, imageBanner, imageSteps, journey, logoStrip, testimonials } from "../sections/home";
import { page, section } from "./helpers";

/** The home page as it was hand-built (Oct 2026): the starting point before anyone edits it. */
export function homeTemplate() {
  return page(
    [
      section(heroVideo, "hero"),
      section(logoStrip, "as-seen-on"),
      section(featureCards, "chapters"),
      section(imageSteps, "method"),
      section(journey, "journey"),
      section(coach, "meet-roni"),
      section(testimonials, "stories"),
      section(imageBanner, "community"),
      section(faq, "faq"),
      section(gradientCta, "final-cta"),
    ],
    true,
  );
}
