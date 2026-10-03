import type { Metadata } from "next";
import type { LivePage } from "./server";

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
    ...(image || description
      ? { openGraph: { title, ...(description ? { description } : {}), ...(image ? { images: [{ url: image }] } : {}) } }
      : {}),
  };
}
