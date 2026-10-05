import TestimonialCard from "@/components/TestimonialCard";
import { testimonialById } from "@/lib/testimonials";
import type { FieldValues } from "@/lib/site/fields";
import { ACCENT_TEXT, hasLink, Highlight, Icon, img, items, lnk, SiteImg, SiteLink, str } from "../bits";
import type { SectionProps } from "./types";

/** Components for src/lib/site/sections/journey.ts (first used on the Courses page). */

const GRADIENT_TEXT = "text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container";
const GRADIENT_PILL = "bg-gradient-to-r from-primary to-primary-container text-on-primary";

/** A choice's classes, or the fallback choice's when the saved value is unknown. */
function pick(map: Record<string, string>, value: string, fallback: string): string {
  return Object.hasOwn(map, value) ? map[value] : map[fallback];
}

// ---------- Journey hero ----------

const HERO_BACKDROP: Record<string, string> = {
  primary: "bg-primary-container/30",
  secondary: "bg-secondary-container/30",
  tertiary: "bg-tertiary-container/30",
};

export function JourneyHero({ settings: s }: SectionProps) {
  const button = lnk(s.button);
  const second = lnk(s.secondButton);
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-10 lg:py-16 flex flex-col lg:flex-row items-center gap-16">
      <div className="lg:w-1/2 z-10 space-y-8">
        <h1 className="font-display text-5xl lg:text-7xl font-extrabold tracking-tight text-on-background leading-[1.1]">
          <Highlight text={str(s.heading)} accentClass={GRADIENT_TEXT} />
        </h1>
        <p className="font-body text-lg lg:text-xl text-on-surface-variant max-w-xl leading-relaxed">{str(s.text)}</p>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {hasLink(button) && (
            <SiteLink
              link={button}
              className={`${GRADIENT_PILL} font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2`}
            >
              <Icon name="arrow_forward" className="text-sm" filled />
            </SiteLink>
          )}
          {hasLink(second) && (
            <SiteLink
              link={second}
              className="bg-surface-container text-on-surface font-label text-base font-semibold px-8 py-4 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
            />
          )}
        </div>
      </div>
      <div className="lg:w-1/2 relative">
        <div className={`absolute -inset-4 ${pick(HERO_BACKDROP, str(s.backdrop), "secondary")} rounded-[3rem] -rotate-3 transform scale-105`} />
        <SiteImg image={img(s.image)} className="relative z-10 w-full max-w-md mx-auto lg:max-w-none aspect-[3/4] object-cover object-top rounded-xl shadow-2xl" />
      </div>
    </section>
  );
}

// ---------- Icon steps ----------

const STEP_ICON: Record<string, string> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

export function IconSteps({ settings: s }: SectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 text-center">
      <div className="max-w-3xl mx-auto mb-16 space-y-6">
        <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background">
          <Highlight text={str(s.heading)} />
        </h2>
        <p className="font-body text-lg text-on-surface-variant">{str(s.text)}</p>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 relative">
        <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-1 bg-surface-container -z-10 rounded-full" />
        {items(s.steps).map((step, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-4 bg-surface-container-lowest p-8 rounded-xl hover:scale-[1.02] hover:bg-surface-bright transition-all duration-500 shadow-sm z-10 w-full md:w-auto mt-4 md:mt-0 first:mt-0"
          >
            <div className={`w-16 h-16 rounded-full ${pick(STEP_ICON, str(step.color), "primary")} flex items-center justify-center mb-2`}>
              <Icon name={str(step.icon)} className="text-3xl" filled />
            </div>
            <h3 className="font-display text-xl font-bold text-on-surface">{str(step.label)}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Chapter stage (mirrors src/components/chapters/ChapterStage.tsx) ----------

const STAGE_BADGE: Record<string, string> = {
  primary: "bg-primary-container/20 text-primary-dim",
  secondary: "bg-secondary-container/30 text-secondary-dim",
  tertiary: "bg-tertiary-container/30 text-tertiary-dim",
};

const STAGE_BUTTON: Record<string, string> = {
  primary: "bg-primary text-on-primary shadow-lg",
  secondary: "bg-secondary text-on-secondary shadow-lg",
  tertiary: "bg-tertiary text-on-tertiary shadow-lg",
};

const STAGE_PANEL: Record<string, string> = { low: "bg-surface-container-low", white: "bg-surface-container-lowest" };

/** The outcome box contrasts with the panel: white with a border on tint, tint on white. */
const STAGE_OUTCOME: Record<string, string> = { low: "bg-surface-container-lowest border border-surface-variant/50", white: "bg-surface-container-low" };

const STAGE_ASPECT: Record<string, string> = { portrait: "aspect-[4/5]", landscape: "aspect-[4/3]" };

/** The panel color's key ("low" when the saved value is unknown). */
const panelKey = (s: FieldValues): string => (Object.hasOwn(STAGE_PANEL, str(s.background)) ? str(s.background) : "low");

const accent = (value: string) => pick(ACCENT_TEXT, value, "primary");

function PerfectForList({ list, color }: { list: FieldValues[]; color: string }) {
  return (
    <ul className="space-y-3 font-body text-on-surface-variant">
      {list.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <Icon name={str(item.icon)} className={`${color} text-xl`} />
          {str(item.label)}
        </li>
      ))}
    </ul>
  );
}

function StageLists({ s }: { s: FieldValues }) {
  const perfectFor = items(s.perfectFor);
  const perfectColor = accent(str(s.perfectColor));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      <div>
        <h4 className="font-display text-lg font-bold text-on-surface mb-4">{str(s.learnHeading)}</h4>
        <ul className="space-y-3 font-body text-on-surface-variant">
          {items(s.learn).map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <Icon name="check_circle" className={`${accent(str(s.learnColor))} text-xl`} />
              {str(item.text)}
            </li>
          ))}
        </ul>
      </div>
      <div>
        {/* Desktop: always visible. Mobile: collapsed behind a toggle. */}
        <h4 className="hidden md:block font-display text-lg font-bold text-on-surface mb-4">{str(s.perfectHeading)}</h4>
        <details className="group md:hidden">
          <summary className="list-none cursor-pointer font-display text-lg font-bold text-on-surface mb-4 flex items-center justify-between">
            {str(s.perfectHeading)}
            <Icon name="expand_more" className="text-xl group-open:rotate-180 transition-transform" />
          </summary>
          <PerfectForList list={perfectFor} color={perfectColor} />
        </details>
        <div className="hidden md:block">
          <PerfectForList list={perfectFor} color={perfectColor} />
        </div>
      </div>
    </div>
  );
}

function StageText({ s }: { s: FieldValues }) {
  const testimonial = testimonialById(str(s.testimonial));
  const button = lnk(s.button);
  const background = panelKey(s);
  return (
    <div className="lg:w-1/2 relative z-10">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${pick(STAGE_BADGE, str(s.badgeColor), "primary")} font-label text-sm font-bold`}>
          <Icon name={str(s.badgeIcon)} className="text-sm" filled />
          {str(s.badge)}
        </div>
      </div>
      <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background mb-6">{str(s.title)}</h2>
      <p className="font-body text-lg text-on-surface-variant mb-8">{str(s.text)}</p>
      <StageLists s={s} />
      <div className={`${STAGE_OUTCOME[background]} p-6 rounded-2xl shadow-sm mb-8`}>
        <p className="font-display font-semibold text-on-surface">
          <span className={`${accent(str(s.outcomeColor))} mr-2`}>{str(s.outcomeLabel)}</span>
          {str(s.outcome)}
        </p>
      </div>
      {testimonial && (
        <div className="mb-8">
          <TestimonialCard testimonial={testimonial} variant="inline" />
        </div>
      )}
      {hasLink(button) && (
        <SiteLink
          link={button}
          className={`${pick(STAGE_BUTTON, str(s.buttonColor), "primary")} font-label text-base font-semibold px-8 py-4 rounded-full hover:scale-105 transition-transform inline-flex items-center justify-center gap-2 w-full sm:w-auto`}
        >
          <Icon name="arrow_forward" className="text-sm" />
        </SiteLink>
      )}
    </div>
  );
}

export function ChapterStage({ settings: s }: SectionProps) {
  const imageLeft = str(s.imageSide) === "left";
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div
        className={`${STAGE_PANEL[panelKey(s)]} rounded-[3rem] p-8 lg:p-16 gap-16 flex flex-col ${imageLeft ? "lg:flex-row-reverse" : "lg:flex-row"} items-center relative overflow-hidden`}
      >
        {!imageLeft && <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />}
        {s.bottomGlow === true && <div className="absolute bottom-0 left-0 w-96 h-96 bg-tertiary-container/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />}
        <StageText s={s} />
        <div className="lg:w-1/2 w-full order-first lg:order-none lg:self-center">
          <div className={`relative w-full ${pick(STAGE_ASPECT, str(s.imageShape), "portrait")} max-h-[640px]`}>
            {imageLeft && <div className="absolute -inset-4 bg-primary-container/20 rounded-2xl rotate-3 transform scale-105" />}
            <SiteImg image={img(s.image)} className="absolute inset-0 w-full h-full object-cover object-top rounded-2xl shadow-xl z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Icon cards ----------

const CARD_ICON: Record<string, string> = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container/20 text-secondary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
};

export function IconCards({ settings: s }: SectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 bg-surface rounded-[3rem]">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background mb-4">
          <Highlight text={str(s.heading)} />
        </h2>
        <p className="font-body text-lg text-on-surface-variant">{str(s.text)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {items(s.cards).map((card, i) => (
          <div
            key={i}
            className={`bg-surface-container-lowest p-8 rounded-2xl hover:scale-[1.02] hover:bg-surface-bright transition-all duration-500 shadow-sm border border-surface-variant/30 text-center${i > 0 ? " mt-8 md:mt-0" : ""}`}
          >
            <div className={`w-16 h-16 mx-auto ${pick(CARD_ICON, str(card.color), "primary")} rounded-full flex items-center justify-center mb-6`}>
              <Icon name={str(card.icon)} className="text-3xl" />
            </div>
            <h3 className="font-display text-xl font-bold text-on-surface mb-3">{str(card.title)}</h3>
            <p className="font-body text-on-surface-variant">{str(card.body)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Split CTA ----------

const SPLIT_COLOR: Record<string, { panel: string; heading: string; text: string; button: string; hover: string }> = {
  primary: {
    panel: "bg-primary-container",
    heading: "text-on-primary-container",
    text: "text-on-primary-container/80",
    button: "bg-on-primary-container text-primary-container",
    hover: "hover:bg-primary",
  },
  secondary: {
    panel: "bg-secondary-container",
    heading: "text-on-secondary-container",
    text: "text-on-secondary-container/80",
    button: "bg-on-secondary-container text-secondary-container",
    hover: "hover:bg-secondary",
  },
  tertiary: {
    panel: "bg-tertiary-container",
    heading: "text-on-tertiary-container",
    text: "text-on-tertiary-container/80",
    button: "bg-on-tertiary-container text-tertiary-container",
    hover: "hover:bg-tertiary",
  },
};

/** Roomy = the Courses page's quiz panel; compact = the Stories page's "Share your story". */
const SPLIT_SIZE: Record<string, { section: string; body: string; heading: string; button: string }> = {
  roomy: { section: "py-24", body: "p-12 lg:p-20", heading: "text-4xl", button: "w-max" },
  compact: { section: "pb-20", body: "p-10 lg:p-20", heading: "text-3xl md:text-4xl", button: "w-full sm:w-max text-center" },
};

export function SplitCta({ settings: s }: SectionProps) {
  const color = SPLIT_COLOR[str(s.color)] ?? SPLIT_COLOR.secondary;
  const size = SPLIT_SIZE[str(s.size)] ?? SPLIT_SIZE.roomy;
  const button = lnk(s.button);
  return (
    <section className={`max-w-7xl mx-auto px-6 ${size.section}`}>
      <div className={`${color.panel} rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-lg`}>
        <div className={`md:w-1/2 ${size.body} flex flex-col justify-center`}>
          <h2 className={`font-display ${size.heading} font-bold ${color.heading} mb-4`}>{str(s.heading)}</h2>
          <p className={`font-body text-lg ${color.text} mb-8`}>{str(s.text)}</p>
          {hasLink(button) && (
            <SiteLink link={button} className={`${color.button} font-label text-base font-bold px-8 py-4 rounded-full ${size.button} ${color.hover} transition-colors shadow-md`} />
          )}
        </div>
        <div className="md:w-1/2 h-64 md:h-auto relative">
          <SiteImg image={img(s.image)} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>
    </section>
  );
}

// ---------- Simple CTA ----------

const SIMPLE_SIZE: Record<string, { section: string; heading: string; text: string; button: string }> = {
  roomy: { section: "pb-24", heading: "text-5xl", text: "text-xl", button: "" },
  compact: { section: "pb-12", heading: "text-4xl md:text-5xl", text: "text-lg md:text-xl", button: " w-full sm:w-auto" },
};

export function SimpleCta({ settings: s }: SectionProps) {
  const size = SIMPLE_SIZE[str(s.size)] ?? SIMPLE_SIZE.roomy;
  const button = lnk(s.button);
  const smallText = str(s.smallText);
  return (
    <section className={`max-w-3xl mx-auto px-6 ${size.section} text-center`}>
      <h2 className={`font-display ${size.heading} font-extrabold text-on-background mb-6`}>{str(s.heading)}</h2>
      {str(s.text) && <p className={`font-body ${size.text} text-on-surface-variant ${smallText ? "mb-4" : "mb-10"}`}>{str(s.text)}</p>}
      {smallText && <p className="font-body text-lg text-on-surface-variant mb-10">{smallText}</p>}
      {hasLink(button) && (
        <SiteLink
          link={button}
          className={`inline-block ${GRADIENT_PILL} font-label text-lg font-bold px-10 py-5 rounded-full shadow-xl hover:scale-105 transition-transform${size.button}`}
        />
      )}
    </section>
  );
}
