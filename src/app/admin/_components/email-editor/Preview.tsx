"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { fillVars } from "@/lib/email-blocks/markup";
import { renderEmailDoc } from "@/lib/email-blocks/render";
import type { EmailDoc } from "@/lib/email-blocks/types";
import type { EmailArtKind } from "@/lib/email-art";
import { MUTED } from "../ui";
import { Segmented } from "./controls";

/**
 * Live preview: the real rendered email (example member values) in a sandboxed iframe, at desktop
 * or phone width, scaled down to fit the column. Links open in a new tab.
 */

const WIDTHS = { desktop: 600, mobile: 375 } as const;
type Device = keyof typeof WIDTHS;
const FRAME_HEIGHT = 640;

interface PreviewProps {
  doc: EmailDoc;
  siteUrl: string;
  exampleVars: Record<string, string>;
  /** The picture Settings → Email gives this kind of email, for when the email doesn't choose its own. */
  defaultArt?: EmailArtKind;
}

function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function Preview({ doc, siteUrl, exampleVars, defaultArt }: PreviewProps) {
  const headingId = useId();
  const [device, setDevice] = useState<Device>("desktop");
  const deferredDoc = useDeferredValue(doc);
  const rendered = useMemo(() => renderEmailDoc(deferredDoc, { siteUrl, vars: exampleVars, art: defaultArt }), [deferredDoc, siteUrl, exampleVars, defaultArt]);
  const srcDoc = useMemo(() => rendered.html.replace("<head>", '<head>\n<base target="_blank">'), [rendered.html]);
  const preheader = fillVars(deferredDoc.preheader, exampleVars).replace(/\s+/g, " ").trim();
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>();
  const frameWidth = WIDTHS[device];
  const scale = boxWidth > 0 ? Math.min(1, boxWidth / frameWidth) : 1;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-semibold text-[#1a1a19]">
          Preview
        </h3>
        <Segmented
          label="Preview width"
          hideLabel
          value={device}
          options={[
            { value: "desktop", label: "Desktop", icon: "desktop_windows" },
            { value: "mobile", label: "Mobile", icon: "smartphone" },
          ]}
          onChange={setDevice}
        />
      </div>
      <div className="rounded-[10px] border border-[#e7e6e4] bg-white px-3 py-2">
        <p className="truncate text-[14px] font-semibold text-[#1a1a19]" title={rendered.subject}>
          {rendered.subject || <span className={`font-normal ${MUTED}`}>No subject yet</span>}
        </p>
        <p className={`truncate text-xs ${MUTED}`}>{preheader || "No preview text"}</p>
      </div>
      <div ref={boxRef} className="w-full overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-[#eef6fb]">
        <div className="mx-auto" style={{ width: frameWidth * scale, height: FRAME_HEIGHT * scale }}>
          <iframe
            title={`Email preview, ${device} width`}
            srcDoc={srcDoc}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            style={{ width: frameWidth, height: FRAME_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}
            className="block border-0"
          />
        </div>
      </div>
      <p className={`text-xs ${MUTED}`}>Shown with example member details. Tags are filled in for each member when the email is sent.</p>
    </section>
  );
}
