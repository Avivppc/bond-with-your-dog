import type { MetadataRoute } from "next";

const SITE_URL = "https://www.bonded.dog";

const PUBLIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/courses", priority: 0.9 },
  { path: "/quiz", priority: 0.8 },
  { path: "/about", priority: 0.8 },
  { path: "/stories", priority: 0.5 },
  { path: "/chapter/foundations", priority: 0.7 },
  { path: "/chapter/moves", priority: 0.6 },
  { path: "/chapter/lets-dance", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
