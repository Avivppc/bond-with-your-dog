import InlineVideo from "@/components/InlineVideo";
import type { FieldValues } from "@/lib/site/fields";
import { sanitizeSiteHtml } from "@/lib/site/sanitize-site";
import { bool, hasLink, Highlight, Icon, img, items, lnk, SiteImg, SiteLink, str, BACKGROUND_CLASS } from "../bits";
import type { SectionProps } from "./types";

/** "Build your own": columns of blocks. Each block reads its own design options. */

const ALIGN: Record<string, string> = { inherit: "", left: "text-left", center: "text-center", right: "text-right" };
const JUSTIFY: Record<string, string> = { inherit: "", left: "justify-start", center: "justify-center", right: "justify-end" };
const COLOR: Record<string, string> = { default: "text-on-surface", muted: "text-on-surface-variant", primary: "text-primary", secondary: "text-secondary", white: "text-white" };

const HEADING_SIZE: Record<string, string> = {
  s: "text-xl md:text-2xl font-bold",
  m: "text-2xl md:text-3xl font-bold",
  l: "text-3xl md:text-5xl font-extrabold",
  xl: "text-4xl md:text-6xl font-extrabold leading-[1.05]",
};

function Heading({ b }: { b: FieldValues }) {
  const level = str(b.level);
  const Tag = level === "h1" ? "h1" : level === "h3" ? "h3" : "h2";
  return (
    <Tag className={`font-headline tracking-tight ${HEADING_SIZE[str(b.size)] ?? HEADING_SIZE.l} ${ALIGN[str(b.align)] ?? ""} ${COLOR[str(b.color)] ?? COLOR.default}`}>
      <Highlight text={str(b.text)} />
    </Tag>
  );
}

const TEXT_SIZE: Record<string, string> = { s: "text-sm", m: "text-base md:text-lg", l: "text-lg md:text-xl" };

function Text({ b }: { b: FieldValues }) {
  const html = sanitizeSiteHtml(str(b.body));
  if (!html) return null;
  return (
    <div
      className={`lesson-prose max-w-none font-body leading-relaxed ${TEXT_SIZE[str(b.size)] ?? TEXT_SIZE.m} ${ALIGN[str(b.align)] ?? ""} ${COLOR[str(b.color)] ?? COLOR.muted}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const ASPECT: Record<string, string> = { auto: "", square: "aspect-square", "4/3": "aspect-[4/3]", "16/9": "aspect-video", "4/5": "aspect-[4/5]" };
const CORNERS: Record<string, string> = { soft: "rounded-2xl", round: "rounded-[2.5rem]", none: "rounded-none", circle: "rounded-full aspect-square" };

function ImageBlock({ b }: { b: FieldValues }) {
  const image = img(b.image);
  if (!image.src) return null;
  const aspect = str(b.aspect);
  const frame = `overflow-hidden ${CORNERS[str(b.corners)] ?? CORNERS.soft} ${bool(b.shadow) ? "shadow-xl" : ""} ${ASPECT[aspect] ?? ""}`;
  const picture = <SiteImg image={image} className={`w-full ${aspect === "auto" && str(b.corners) !== "circle" ? "h-auto" : "h-full object-cover"}`} />;
  const link = lnk(b.link);
  return <div className={frame}>{link.href.trim() ? <SiteLink link={{ label: "", href: link.href }} className="block h-full">{picture}</SiteLink> : picture}</div>;
}

const BUTTON: Record<string, string> = {
  gradient: "kinetic-gradient text-on-primary shadow-lg shadow-primary/25 hover:scale-[1.03]",
  solid: "bg-primary text-on-primary hover:bg-primary-dim",
  outline: "border-2 border-primary text-primary hover:bg-primary hover:text-on-primary",
  soft: "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
  white: "bg-white text-primary shadow-lg hover:bg-orange-50",
  link: "text-primary underline-offset-4 hover:underline !px-0",
};

function Button({ b }: { b: FieldValues }) {
  const link = lnk(b.link);
  if (!hasLink(link)) return null;
  const size = str(b.size) === "l" ? "px-10 py-4 text-lg" : "px-7 py-3 text-base";
  return (
    <div className={`flex ${JUSTIFY[str(b.align)] ?? ""}`}>
      <SiteLink link={link} className={`group inline-flex items-center gap-2 rounded-full font-headline font-bold transition-all ${size} ${BUTTON[str(b.style)] ?? BUTTON.gradient}`}>
        {bool(b.arrow) && <Icon name="arrow_forward" className="text-[1.1em] transition-transform group-hover:translate-x-1" />}
      </SiteLink>
    </div>
  );
}

function Video({ b, id }: { b: FieldValues; id: string }) {
  const youtube = str(b.youtube);
  if (!youtube) return null;
  const poster = img(b.poster);
  return (
    <InlineVideo
      id={`${id}-video`}
      youtubeId={youtube}
      title={str(b.title) || "Video"}
      posterSrc={poster.src || `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`}
      posterAlt={poster.alt || "Press play to watch"}
      posterFrameClassName="aspect-video rounded-2xl shadow-xl bg-surface-container-low"
      playingFrameClassName="aspect-video rounded-2xl shadow-xl"
    />
  );
}

const MARKER_ICON: Record<string, string> = { check: "check_circle", dot: "fiber_manual_record" };

function List({ b }: { b: FieldValues }) {
  const marker = str(b.marker);
  const color = COLOR[str(b.color)] ?? COLOR.default;
  const entries = items(b.items).map((i) => str(i.text)).filter(Boolean);
  if (marker === "number") {
    return (
      <ol className={`list-decimal space-y-2 pl-6 text-left font-body text-base md:text-lg ${color}`}>
        {entries.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    );
  }
  return (
    <ul className={`space-y-3 text-left font-body text-base md:text-lg ${color}`}>
      {entries.map((t, i) => (
        <li key={i} className="flex items-start gap-3">
          <Icon name={MARKER_ICON[marker] ?? MARKER_ICON.check} className={`mt-0.5 shrink-0 text-primary ${marker === "dot" ? "text-[10px] mt-2" : "text-[22px]"}`} filled />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const TONE: Record<string, string> = { primary: "bg-primary-container/20 text-primary", secondary: "bg-secondary-container/40 text-secondary", tertiary: "bg-tertiary-container/30 text-tertiary" };

function Feature({ b }: { b: FieldValues }) {
  const align = str(b.align);
  const centered = align === "center" || align === "inherit";
  return (
    <div className={`${ALIGN[align] ?? ""}`}>
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${TONE[str(b.tone)] ?? TONE.primary} ${centered ? "mx-auto [.text-left_&]:mx-0" : align === "right" ? "ml-auto" : ""}`}>
        <Icon name={str(b.icon) || "star"} className="text-[28px]" />
      </div>
      <h3 className="mb-2 font-headline text-xl font-bold text-on-surface">{str(b.title)}</h3>
      <p className="font-body text-on-surface-variant">{str(b.text)}</p>
    </div>
  );
}

function Quote({ b }: { b: FieldValues }) {
  const author = str(b.author);
  if (str(b.style) === "large") {
    return (
      <figure>
        <blockquote className="font-headline text-2xl font-bold italic leading-snug text-on-surface md:text-3xl">&ldquo;{str(b.text)}&rdquo;</blockquote>
        {author && <figcaption className="mt-4 font-label text-sm font-bold uppercase tracking-widest text-primary">{author}</figcaption>}
      </figure>
    );
  }
  return (
    <figure className="rounded-2xl bg-secondary-container p-6 text-left shadow-lg">
      <blockquote className="font-headline font-bold italic text-on-secondary-container">&ldquo;{str(b.text)}&rdquo;</blockquote>
      {author && <figcaption className="mt-3 text-sm font-semibold text-on-secondary-container/80">— {author}</figcaption>}
    </figure>
  );
}

const SPACE: Record<string, string> = { s: "h-4", m: "h-10", l: "h-20" };

function Block({ b, id }: { b: FieldValues; id: string }) {
  switch (str(b.type)) {
    case "heading":
      return <Heading b={b} />;
    case "text":
      return <Text b={b} />;
    case "image":
      return <ImageBlock b={b} />;
    case "button":
      return <Button b={b} />;
    case "video":
      return <Video b={b} id={id} />;
    case "list":
      return <List b={b} />;
    case "feature":
      return <Feature b={b} />;
    case "quote":
      return <Quote b={b} />;
    case "spacer":
      return <div className={SPACE[str(b.size)] ?? SPACE.m} aria-hidden />;
    case "divider":
      return <hr className={`border-outline-variant/40 ${str(b.width) === "short" ? "mx-auto w-24 [.text-left_&]:mx-0" : "w-full"}`} />;
    default:
      return null;
  }
}

const WIDTH: Record<string, string> = { narrow: "max-w-3xl", normal: "max-w-5xl", wide: "max-w-7xl" };
const PADDING: Record<string, string> = { s: "py-10", m: "py-16 md:py-20", l: "py-24 md:py-32" };
const CARD_PADDING: Record<string, string> = { s: "p-8", m: "p-10 md:p-14", l: "p-12 md:p-20" };

function gridClass(count: number, layout: string): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return layout === "wide-left" ? "md:grid-cols-[2fr_1fr]" : layout === "wide-right" ? "md:grid-cols-[1fr_2fr]" : "md:grid-cols-2";
  return count === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4";
}

export function BlocksSection({ settings: s, id }: SectionProps) {
  const columns = items(s.columns);
  const card = bool(s.card);
  const bg = str(s.background) === "none" ? "" : (BACKGROUND_CLASS[str(s.background)] ?? "");
  const padding = str(s.padding);
  const grid = (
    <div className={`grid grid-cols-1 gap-10 md:gap-14 ${gridClass(columns.length, str(s.layout))} ${str(s.valign) === "top" ? "items-start" : "items-center"} ${str(s.textAlign) === "center" ? "text-center" : "text-left"}`}>
      {columns.map((col, c) => (
        <div key={c} className="flex min-w-0 flex-col gap-5">
          {items(col.blocks).map((b, i) => (
            <Block key={i} b={b} id={`${id}-${c}-${i}`} />
          ))}
        </div>
      ))}
    </div>
  );
  const width = WIDTH[str(s.width)] ?? WIDTH.wide;
  if (card) {
    return (
      <section className={`px-6 md:px-8 ${PADDING.s}`}>
        <div className={`${width} mx-auto rounded-[2rem] ${bg || "bg-surface-container-low"} ${CARD_PADDING[padding] ?? CARD_PADDING.m}`}>{grid}</div>
      </section>
    );
  }
  return (
    <section className={`${bg} px-6 md:px-8 ${PADDING[padding] ?? PADDING.m}`}>
      <div className={`${width} mx-auto`}>{grid}</div>
    </section>
  );
}

export const BLOCK_COMPONENTS = { blocks: BlocksSection };
