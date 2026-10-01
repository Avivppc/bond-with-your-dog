import type { Stage } from "./stages";

interface ChapterCardProps {
  stage: Stage;
  cta: React.ReactNode;
  /** A small line under the title, e.g. "Best after Bonded: Foundations". */
  note?: string;
}

/** A compact chapter card in the website's style: photo, chapter badge, title, one-line pitch, action. */
export function ChapterCard({ stage, cta, note }: ChapterCardProps) {
  return (
    <article className={`${stage.sectionBg} rounded-[1.75rem] overflow-hidden flex flex-col shadow-sm border border-surface-variant/40`}>
      <div className="relative aspect-[16/10]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static site photo */}
        <img className={`absolute inset-0 w-full h-full object-cover ${stage.cardImgPosition}`} alt={stage.imgAlt} src={stage.img} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <span className={`inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full ${stage.badgeBg} font-label text-xs font-bold`}>
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
            {stage.badgeIcon}
          </span>
          {stage.badge}
        </span>
        <h2 className="font-display text-xl font-bold leading-snug text-on-background">{stage.title}</h2>
        <p className="font-body text-sm text-on-surface-variant">{stage.outcome}</p>
        {note && <p className="font-label text-xs text-on-surface-variant/80">{note}</p>}
        <div className="mt-auto pt-2">{cta}</div>
      </div>
    </article>
  );
}
