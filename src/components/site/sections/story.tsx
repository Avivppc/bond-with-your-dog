import type { ReactNode } from "react";
import InlineVideo from "@/components/InlineVideo";
import TestimonialCard from "@/components/TestimonialCard";
import type { FieldValues, ImageValue } from "@/lib/site/fields";
import { storyQuote } from "@/lib/site/sections/story";
import type { Testimonial } from "@/lib/testimonials";
import { BACKGROUND_CLASS, hasLink, Highlight, Icon, img, lnk, Paragraphs, SiteImg, SiteLink, str } from "../bits";
import type { SectionProps } from "./types";

const HIGHLIGHT_CLASS: Record<string, string> = {
  primary: "text-primary",
  primary_italic: "text-primary italic",
  secondary: "text-secondary",
  light_italic: "italic text-tertiary-container",
  underline: "text-primary italic underline decoration-tertiary-container decoration-8 underline-offset-8",
};

const SHAPE_CLASS: Record<string, string> = {
  wide: "aspect-[3/2]",
  classic: "aspect-[4/3]",
  tall: "aspect-[4/5]",
  square: "aspect-square",
};

const FRAME_CLASS: Record<string, string> = {
  soft: "image-reveal-wrapper kinetic-shadow",
  tilted: "image-reveal-wrapper border-4 border-primary-container shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700",
};

const pick = (map: Record<string, string>, key: string, fallback: string): string => map[key] ?? map[fallback];

function Heading({ s, className, as: Tag = "h2" }: { s: FieldValues; className: string; as?: "h1" | "h2" }) {
  return (
    <Tag className={className}>
      <Highlight text={str(s.heading)} accentClass={pick(HIGHLIGHT_CLASS, str(s.highlightStyle), "primary")} />
    </Tag>
  );
}

function FramedImage({ image, frame, shape, imgClass = "w-full h-full object-cover" }: { image: ImageValue; frame: string; shape: string; imgClass?: string }) {
  if (!image.src) return null;
  return (
    <div className={`${pick(FRAME_CLASS, frame, "soft")} ${pick(SHAPE_CLASS, shape, "wide")}`}>
      <SiteImg image={image} className={imgClass} />
    </div>
  );
}

function Quote({ testimonial, className }: { testimonial: Testimonial; className: string }) {
  return (
    <div className={className}>
      <TestimonialCard testimonial={testimonial} variant="inline" />
    </div>
  );
}

function Eyebrow({ text, icon }: { text: string; icon: string }) {
  if (!text) return null;
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label font-semibold text-sm mb-8 uppercase tracking-widest">
      <Icon name={icon} className="text-sm" /> {text}
    </div>
  );
}

export function StoryHero({ settings: s }: SectionProps) {
  return (
    <section className="relative flex items-center px-8 md:px-20 pt-8 pb-16 md:pt-12 md:pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
        <div className="z-10">
          <Heading s={s} as="h1" className="font-display font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-8" />
          <Paragraphs text={str(s.text)} className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed max-w-xl" />
        </div>
        <div className="relative">
          <FramedImage image={img(s.image)} frame="soft" shape={str(s.imageShape)} imgClass="w-full h-full object-cover object-top" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-tertiary-container rounded-full mix-blend-multiply opacity-20 animate-pulse" />
        </div>
      </div>
    </section>
  );
}

export function StoryIntro({ settings: s }: SectionProps) {
  return (
    <section className="px-8 md:px-20 pb-24">
      <div className="max-w-3xl mx-auto text-center">
        <Heading s={s} className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-4" />
        <Paragraphs text={str(s.text)} className="font-body text-xl text-on-surface-variant leading-relaxed" />
      </div>
    </section>
  );
}

// ---------- Image and text ----------

const EMPHASIS_CLASS: Record<string, { lead?: string; closing?: string }> = {
  lead: { lead: "text-xl font-medium text-on-surface italic" },
  closing: { closing: "font-semibold" },
};

function Body({ text, emphasis, className }: { text: string; emphasis: string; className: string }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const style = EMPHASIS_CLASS[emphasis] ?? {};
  const classFor = (i: number) => (i === 0 && style.lead) || (i === paras.length - 1 && style.closing) || undefined;
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i} className={classFor(i)}>
          {p}
        </p>
      ))}
    </div>
  );
}

const BODY_CLASS = {
  normal: "space-y-6 font-body text-lg text-on-surface-variant leading-relaxed",
  airy: "space-y-8 font-body text-lg text-on-surface-variant",
  brand: "space-y-8 font-body text-lg md:text-xl opacity-90 leading-relaxed",
};

const HEADING_CLASS = {
  side: "font-display font-bold text-3xl md:text-5xl tracking-tight leading-tight mb-8",
  sideBrand: "font-display font-extrabold text-4xl md:text-6xl mb-8 tracking-tighter",
  top: "font-display font-bold text-4xl md:text-6xl tracking-tight mb-12",
  top_wide: "font-display font-extrabold text-4xl md:text-6xl text-center mb-16 tracking-tight",
};

interface ImageTextParts {
  s: FieldValues;
  imageLeft: boolean;
  image: ReactNode;
  body: (className: string) => ReactNode;
  quote: ReactNode;
  eyebrow: ReactNode;
  onBrand: boolean;
}

function SideLayout({ s, imageLeft, image, body, quote, eyebrow, onBrand }: ImageTextParts) {
  const text = (
    <div className={imageLeft ? "order-1 lg:order-2" : undefined}>
      {eyebrow}
      <Heading s={s} className={onBrand ? HEADING_CLASS.sideBrand : HEADING_CLASS.side} />
      {body(onBrand ? BODY_CLASS.brand : BODY_CLASS.normal)}
      {quote}
    </div>
  );
  const photo = <div className={imageLeft ? "order-2 lg:order-1" : undefined}>{image}</div>;
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
      {imageLeft ? photo : text}
      {imageLeft ? text : photo}
    </div>
  );
}

function TopLayout({ s, imageLeft, image, body, quote, eyebrow, onBrand }: ImageTextParts) {
  const bodyEl = body(onBrand ? BODY_CLASS.brand : BODY_CLASS.normal);
  const text = quote ? (
    <div>
      {bodyEl}
      {quote}
    </div>
  ) : (
    bodyEl
  );
  return (
    <div className="max-w-4xl mx-auto text-center">
      {eyebrow}
      <Heading s={s} className={HEADING_CLASS.top} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left items-center">
        {imageLeft ? image : text}
        {imageLeft ? text : image}
      </div>
    </div>
  );
}

function TopWideLayout({ s, imageLeft, image, body, quote, eyebrow, onBrand }: ImageTextParts) {
  const bodyClass = onBrand ? BODY_CLASS.brand : BODY_CLASS.airy;
  const text = quote ? (
    <div className="lg:col-span-5">
      {body(bodyClass)}
      {quote}
    </div>
  ) : (
    body(`lg:col-span-5 ${bodyClass}`)
  );
  const photo = <div className="lg:col-span-7">{image}</div>;
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center">
      {eyebrow}
      <Heading s={s} className={HEADING_CLASS.top_wide} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {imageLeft ? photo : text}
        {imageLeft ? text : photo}
      </div>
    </div>
  );
}

const LAYOUTS: Record<string, typeof SideLayout> = { side: SideLayout, top: TopLayout, top_wide: TopWideLayout };

export function StoryImageText({ settings: s }: SectionProps) {
  const background = str(s.background);
  const layout = str(s.layout);
  const onBrand = background === "primary";
  const Layout = LAYOUTS[layout] ?? SideLayout;
  const testimonial = storyQuote(str(s.quote));
  const overflow = onBrand || layout === "top_wide" ? " relative overflow-hidden" : "";
  return (
    <section className={`${pick(BACKGROUND_CLASS, background, "surface")} py-32 px-8 md:px-20${overflow}`}>
      {onBrand && <div className="absolute top-0 right-0 w-1/3 h-full bg-primary-dim opacity-10 -skew-x-12 translate-x-1/2" />}
      <Layout
        s={s}
        onBrand={onBrand}
        imageLeft={str(s.imageSide) === "left"}
        image={<FramedImage image={img(s.image)} frame={str(s.imageStyle)} shape={str(s.imageShape)} />}
        body={(className) => <Body text={str(s.text)} emphasis={str(s.emphasis)} className={className} />}
        quote={testimonial && <Quote testimonial={testimonial} className="mt-10" />}
        eyebrow={<Eyebrow text={str(s.eyebrow)} icon={str(s.eyebrowIcon)} />}
      />
    </section>
  );
}

// ---------- Video and photo ----------

function Caption({ label, text }: { label: string; text: string }) {
  if (!label && !text) return null;
  return (
    <p className="font-body text-on-surface-variant">
      {label && <span className="font-label font-bold uppercase tracking-widest text-xs block mb-1">{label}</span>}
      {text}
    </p>
  );
}

function SectionVideo({ settings: s, id }: SectionProps) {
  const poster = img(s.poster);
  const youtube = str(s.youtube);
  if (!youtube) return <FramedImage image={poster} frame="soft" shape="wide" />;
  return (
    <InlineVideo
      id={`${id}-video`}
      youtubeId={youtube}
      title={str(s.videoTitle) || "Video"}
      posterSrc={poster.src}
      posterAlt={poster.alt}
      playEventName={`bonded:play-${id}`}
      posterFrameClassName="aspect-[3/2] rounded-2xl kinetic-shadow"
      playingFrameClassName="aspect-video rounded-2xl kinetic-shadow"
    />
  );
}

export function StoryMediaPair({ settings: s, id }: SectionProps) {
  const outro = str(s.outro);
  const quote = storyQuote(str(s.quote));
  return (
    <section className={`py-32 px-8 md:px-20 ${pick(BACKGROUND_CLASS, str(s.background), "surface")}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <Heading s={s} className="font-display font-bold text-4xl md:text-6xl tracking-tight mb-8" />
          <Paragraphs text={str(s.intro)} className="font-body text-xl text-on-surface-variant max-w-3xl mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <div className="space-y-6">
            <SectionVideo settings={s} id={id} />
            <Caption label={str(s.videoLabel)} text={str(s.videoCaption)} />
          </div>
          <div className="space-y-6">
            <FramedImage image={img(s.image)} frame="soft" shape="wide" />
            <Caption label={str(s.imageLabel)} text={str(s.imageCaption)} />
          </div>
        </div>
        {(outro || quote) && (
          <div className="mt-16 text-center max-w-2xl mx-auto">
            <Paragraphs text={outro} className="font-body text-lg text-on-surface-variant" />
            {quote && <Quote testimonial={quote} className={outro ? "mt-10 text-left" : "text-left"} />}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Closing call to action ----------

export function StoryCta({ settings: s }: SectionProps) {
  const button = lnk(s.button);
  return (
    <section className={`py-40 px-8 text-center ${pick(BACKGROUND_CLASS, str(s.background), "white")}`}>
      <div className="max-w-4xl mx-auto">
        <Heading s={s} className="font-display font-black text-5xl md:text-7xl mb-8 tracking-tight" />
        <Paragraphs text={str(s.text)} className="font-body text-xl md:text-2xl text-on-surface-variant mb-12" />
        {hasLink(button) && (
          <SiteLink
            link={button}
            className="group bg-primary text-on-primary px-12 py-5 rounded-full font-headline font-bold text-xl hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-4 mx-auto"
          >
            <Icon name="arrow_forward" className="group-hover:translate-x-2 transition-transform" />
          </SiteLink>
        )}
      </div>
    </section>
  );
}
