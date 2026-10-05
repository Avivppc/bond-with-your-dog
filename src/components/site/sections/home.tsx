import InlineVideo from "@/components/InlineVideo";
import PlayVideoButton from "@/components/PlayVideoButton";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import TestimonialCard from "@/components/TestimonialCard";
import { TESTIMONIALS } from "@/lib/testimonials";
import { hasLink, Highlight, Icon, img, items, lnk, SiteImg, SiteLink, str } from "../bits";
import type { SectionProps } from "./types";

/** Lessons shown per track on phones before "Show all". */
const MOBILE_LESSON_PREVIEW = 4;

export function HeroVideo({ settings: s, id }: SectionProps) {
  const videoId = `${id}-video`;
  const playEvent = `bonded:play-${id}`;
  const button = lnk(s.button);
  const playLabel = str(s.playLabel);
  const youtube = str(s.youtube);
  const poster = img(s.poster);
  return (
    <section className="relative px-8 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center text-center md:text-left">
      <div className="md:col-span-7 z-10 mx-auto md:mx-0 max-w-4xl">
        <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
          <Highlight text={str(s.heading)} />
        </h1>
        <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mx-auto md:mx-0 mb-10 leading-relaxed font-light">{str(s.text)}</p>
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          {hasLink(button) && (
            <SiteLink
              link={button}
              className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl shadow-primary/30 flex items-center gap-2 group"
            >
              <Icon name="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
            </SiteLink>
          )}
          {playLabel && youtube && (
            <PlayVideoButton
              eventName={playEvent}
              scrollToId={videoId}
              className="bg-surface-container-high text-on-surface-variant px-8 py-4 rounded-full font-headline font-bold text-lg hover:bg-surface-container-highest transition-colors flex items-center gap-2"
            >
              <Icon name="play_circle" className="text-xl" />
              {playLabel}
            </PlayVideoButton>
          )}
        </div>
      </div>
      <div className="md:col-span-5 relative">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary-container rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="relative scroll-mt-32">
          {youtube ? (
            <InlineVideo
              id={videoId}
              youtubeId={youtube}
              title={str(s.videoTitle) || "Video"}
              posterSrc={poster.src}
              posterAlt={poster.alt}
              playEventName={playEvent}
              posterFrameClassName="aspect-[4/5] rounded-xl shadow-2xl bg-surface-container-low"
              playingFrameClassName="aspect-video rounded-xl shadow-2xl"
            />
          ) : (
            <SiteImg image={poster} className="aspect-[4/5] w-full rounded-xl shadow-2xl object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}

export function LogoStrip({ settings: s }: SectionProps) {
  return (
    <section className="bg-surface-container-low/50 py-12 mb-20">
      <div className="max-w-7xl mx-auto px-8">
        <p className="text-center font-label text-xs uppercase tracking-[0.2em] text-outline mb-8 font-bold">{str(s.eyebrow)}</p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {items(s.items).map((item, i) => {
            const logo = img(item.logo);
            return logo.src ? (
              <SiteImg key={i} image={{ src: logo.src, alt: logo.alt || str(item.name) }} className="h-8 md:h-10 w-auto object-contain" />
            ) : (
              <span key={i} className="font-headline text-xl md:text-2xl font-black">
                {str(item.name)}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const CARD_BADGE: Record<string, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

export function FeatureCards({ settings: s }: SectionProps) {
  const cards = items(s.cards);
  return (
    <section className="px-8 max-w-7xl mx-auto mb-32 pt-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
        <div>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-4">{str(s.heading)}</h2>
          <p className="text-on-surface-variant max-w-md font-light">{str(s.text)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((card, i) => {
          const link = lnk(card.link);
          return (
            <div key={i} className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 flex flex-col h-full relative">
              <div className="aspect-[4/3] rounded-md overflow-hidden mb-6 relative bg-surface-container-low">
                <SiteImg image={img(card.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              {str(card.badge) && (
                <div className="absolute top-4 -left-2 z-20">
                  <div className={`${CARD_BADGE[str(card.color)] ?? CARD_BADGE.primary} font-label text-[10px] font-bold tracking-widest px-4 py-2 rounded-r-full shadow-lg relative -left-2 flex items-center gap-2`}>
                    <Icon name={str(card.icon)} className="text-xs" filled />
                    {str(card.badge)}
                  </div>
                </div>
              )}
              <h3 className="font-headline text-2xl font-bold mb-2">{str(card.title)}</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow font-light font-body">{str(card.text)}</p>
              {hasLink(link) && (
                <div className="flex justify-between items-center pt-6 border-t border-surface-container-high">
                  <SiteLink link={link} className="text-primary font-bold flex items-center gap-1 group/btn w-fit">
                    {" "}
                    <Icon name="arrow_forward" className="text-lg group-hover/btn:translate-x-1 transition-transform" />
                  </SiteLink>
                </div>
              )}
              {i < cards.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                  <Icon name="chevron_right" className="text-outline-variant/30 text-3xl" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ImageSteps({ settings: s }: SectionProps) {
  return (
    <section className="py-24 max-w-7xl mx-auto px-8 text-center mb-16 bg-surface-container-low/30 rounded-3xl">
      <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-10">{str(s.heading)}</h2>
      {img(s.image).src && (
        <div className="max-w-5xl mx-auto mb-14 rounded-2xl overflow-hidden shadow-xl aspect-[3/2] md:aspect-[16/9]">
          <SiteImg image={img(s.image)} className="w-full h-full object-cover object-[50%_40%]" />
        </div>
      )}
      <div className="flex flex-wrap md:flex-nowrap items-start justify-center gap-x-6 gap-y-8 md:gap-4 max-w-5xl mx-auto">
        {items(s.steps).map((step, i) => (
          <div key={i} className="contents">
            {i > 0 && <Icon name="arrow_forward" className="text-outline hidden md:block md:mt-7" />}
            <div className="flex flex-col items-center w-24 md:w-auto">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-3 md:mb-4">
                <Icon name={str(step.icon)} className="text-2xl md:text-3xl" />
              </div>
              <span className="font-bold text-sm md:text-lg text-center">{str(step.label)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const TRACK_STYLE: Record<string, { badge: string; first: string; icon: string }> = {
  tertiary: { badge: "bg-tertiary-container text-on-tertiary-container", first: "border-tertiary", icon: "bg-tertiary-container/20 border border-tertiary-fixed-dim" },
  primary: { badge: "bg-primary-container text-on-primary-container", first: "border-primary", icon: "bg-primary-container/15 border border-primary-fixed-dim" },
  secondary: { badge: "bg-secondary-container text-on-secondary-container", first: "border-secondary", icon: "bg-secondary-container/40 border border-secondary" },
};

function LessonRow({ label, sketch, number, iconClass, className }: { label: string; sketch: string; number: number; iconClass: string; className: string }) {
  return (
    <div className={`items-center gap-4 p-3 bg-surface-container-lowest rounded-md shadow-sm ${className}`}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${iconClass}`}>
        {sketch ? (
          <SiteImg image={{ src: sketch, alt: label }} className="w-[112%] h-[112%] object-contain mix-blend-multiply" />
        ) : (
          <span className="font-headline font-bold text-sm text-on-surface-variant">{number}</span>
        )}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function Journey({ settings: s }: SectionProps) {
  return (
    <section className="py-24 bg-surface-container-low/30 overflow-hidden mb-20">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-16">
          <h2 className="font-headline text-4xl font-extrabold mb-4">{str(s.heading)}</h2>
          <p className="text-on-surface-variant">{str(s.text)}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {items(s.tracks).map((track, t) => {
            const style = TRACK_STYLE[str(track.color)] ?? TRACK_STYLE.primary;
            const lessons = items(track.lessons);
            return (
              <div key={t}>
                <div className="flex items-center gap-3 mb-6">
                  <span className={`${style.badge} w-10 h-10 rounded-full flex items-center justify-center font-black`}>{String(t + 1).padStart(2, "0")}</span>
                  <h4 className="font-headline text-xl font-bold">{str(track.title)}</h4>
                </div>
                <div className="space-y-3">
                  {lessons.map((lesson, i) => (
                    <LessonRow
                      key={i}
                      label={str(lesson.label)}
                      sketch={img(lesson.sketch).src}
                      number={i + 1}
                      iconClass={style.icon}
                      className={`${i === 0 ? `border-l-4 ${style.first}` : ""} ${i < MOBILE_LESSON_PREVIEW ? "flex" : "hidden md:flex"}`}
                    />
                  ))}
                  {lessons.length > MOBILE_LESSON_PREVIEW && (
                    <details className="md:hidden group">
                      <summary className="list-none cursor-pointer text-primary font-bold text-sm py-2 flex items-center gap-1 group-open:hidden">
                        Show all {lessons.length} lessons
                        <Icon name="expand_more" className="text-lg" />
                      </summary>
                      <div className="space-y-3">
                        {lessons.slice(MOBILE_LESSON_PREVIEW).map((lesson, i) => (
                          <LessonRow key={i} label={str(lesson.label)} sketch={img(lesson.sketch).src} number={MOBILE_LESSON_PREVIEW + i + 1} iconClass={style.icon} className="flex" />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Coach({ settings: s }: SectionProps) {
  const button = lnk(s.button);
  const quote = str(s.quote);
  return (
    <section className="bg-surface-container-high py-24 mb-20">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="relative order-2 md:order-1">
          <div className="bg-white p-4 rounded-lg shadow-2xl rotate-2 relative z-10">
            <SiteImg image={img(s.image)} className="w-full h-auto rounded" />
          </div>
          {quote && (
            <div className="absolute -bottom-8 -left-8 bg-secondary-container p-6 rounded-lg shadow-xl z-20 max-w-[240px]">
              <p className="font-headline font-bold text-on-secondary-container italic">&ldquo;{quote}&rdquo;</p>
            </div>
          )}
        </div>
        <div className="order-1 md:order-2">
          <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">{str(s.eyebrow)}</span>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">{str(s.heading)}</h2>
          <p className="text-on-surface-variant text-lg font-light leading-relaxed mb-6">{str(s.text)}</p>
          {items(s.stats).length > 0 && (
            <div className="flex flex-wrap md:flex-nowrap items-center gap-8 md:gap-12 mb-8">
              {items(s.stats).map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-headline font-black text-primary">{str(stat.value)}</p>
                  <p className="text-sm text-outline font-bold">{str(stat.label)}</p>
                </div>
              ))}
            </div>
          )}
          {hasLink(button) && (
            <SiteLink
              link={button}
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-primary text-primary font-headline font-bold text-sm hover:bg-primary hover:text-on-primary transition-all duration-300 mt-4"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ settings: s }: SectionProps) {
  const link = lnk(s.link);
  const grid = str(s.layout) === "grid";
  return (
    <section className="py-24 max-w-7xl mx-auto px-8 mb-20 bg-surface-container-low/30 rounded-3xl">
      {(str(s.heading) || str(s.text)) && (
        <div className="text-center mb-16">
          {str(s.heading) && <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-4">{str(s.heading)}</h2>}
          {str(s.text) && <p className="text-on-surface-variant text-lg font-light">{str(s.text)}</p>}
        </div>
      )}
      {grid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      ) : (
        <TestimonialCarousel testimonials={TESTIMONIALS} />
      )}
      {hasLink(link) && (
        <div className="text-center mt-10">
          <SiteLink link={link} className="text-primary font-bold inline-flex items-center gap-1">
            <Icon name="arrow_forward" className="text-lg" />
          </SiteLink>
        </div>
      )}
    </section>
  );
}

export function ImageBanner({ settings: s }: SectionProps) {
  const button = lnk(s.button);
  return (
    <section className="relative py-32 overflow-hidden mb-20">
      <div className="absolute inset-0 z-0">
        <SiteImg image={img(s.image)} className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm" />
      </div>
      <div className="max-w-4xl mx-auto px-8 relative z-10 text-center">
        <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">{str(s.heading)}</h2>
        <p className="text-xl text-on-surface-variant font-light mb-10 max-w-2xl mx-auto">{str(s.text)}</p>
        {hasLink(button) && (
          <SiteLink link={button} className="inline-block kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl shadow-primary/30" />
        )}
      </div>
    </section>
  );
}

export function Faq({ settings: s }: SectionProps) {
  const anchor = str(s.anchor).replace(/[^a-z0-9-]/gi, "");
  return (
    <section id={anchor || undefined} className="py-24 max-w-3xl mx-auto px-8 mb-20 scroll-mt-24">
      <div className="text-center mb-16">
        <h2 className="font-headline text-4xl font-extrabold">{str(s.heading)}</h2>
      </div>
      <div className="space-y-4">
        {items(s.items).map((item, i) => (
          <details key={i} className="bg-surface-container-low p-6 rounded-2xl group cursor-pointer">
            <summary className="font-headline font-bold text-lg flex justify-between items-center">
              {str(item.q)}
              <Icon name="expand_more" className="transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-on-surface-variant font-light leading-relaxed">{str(item.a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function GradientCta({ settings: s }: SectionProps) {
  const button = lnk(s.button);
  return (
    <section className="max-w-7xl mx-auto px-8 mb-32">
      <div className="kinetic-gradient rounded-3xl overflow-hidden relative aspect-video md:aspect-[21/9] flex items-center justify-center text-center p-8 text-on-primary">
        <div className="absolute inset-0 z-0">
          <SiteImg image={img(s.image)} className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Icon name="pets" className="text-[12rem]" filled />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-6 leading-tight">{str(s.heading)}</h2>
          <p className="text-xl md:text-2xl text-on-primary/90 font-light mb-10">{str(s.text)}</p>
          {hasLink(button) && (
            <SiteLink link={button} className="inline-block bg-white text-primary px-10 py-4 rounded-full font-headline font-bold text-lg hover:bg-orange-50 transition-colors shadow-xl" />
          )}
        </div>
      </div>
    </section>
  );
}
