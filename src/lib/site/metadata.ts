import type { Metadata } from "next";
import type { LivePage } from "./server";

const DEFAULT_SHARE_IMAGE = "/images/og.png";
/** The layout's share text, for pages without their own description. */
const DEFAULT_SHARE_TEXT = "Roni Sagi's step-by-step method for building trust, communication and joyful movement with your dog.";

/** A website page's search and link-preview details (the root layout adds " | BONDED" to titles). */
export function pageMetadata(page: Pick<LivePage, "title" | "seo" | "slug">): Metadata {
  const title = page.seo.title.trim() || page.title;
  const description = page.seo.description.trim() || undefined;
  const image = page.seo.image.trim();
  return {
    // The home page's title is the full brand line, without the suffix.
    title: page.slug === "" ? { absolute: title } : title,
    description,
    alternates: { canonical: page.slug === "" ? "/" : `/${page.slug}` },
    // openGraph replaces the layout's whole object, so the site defaults are repeated here.
    openGraph: {
      type: "website",
      siteName: "BONDED",
      title,
      description: description ?? DEFAULT_SHARE_TEXT,
      images: [image ? { url: image } : { url: DEFAULT_SHARE_IMAGE, width: 1200, height: 630 }],
    },
  };
}
