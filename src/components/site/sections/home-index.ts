import type { ComponentType } from "react";
import type { SectionProps } from "./types";
import { Coach, Faq, FeatureCards, GradientCta, HeroVideo, ImageBanner, ImageSteps, Journey, LogoStrip, Testimonials } from "./home";

/** Components for the section types in src/lib/site/sections/home.ts, by type. */
export const HOME_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  hero_video: HeroVideo,
  logo_strip: LogoStrip,
  feature_cards: FeatureCards,
  image_steps: ImageSteps,
  journey: Journey,
  coach: Coach,
  testimonials: Testimonials,
  image_banner: ImageBanner,
  faq: Faq,
  gradient_cta: GradientCta,
};
