import type { MetadataRoute } from "next";

/**
 * The installed member app's manifest. Linked only from member pages (see the (member) and
 * (onboarding) layouts), so the public website is never offered as an app; StandaloneGuard sends
 * the installed app to /home if it lands on the website's front page.
 */
const MANIFEST: MetadataRoute.Manifest = {
  id: "/home",
  name: "Bonded",
  short_name: "Bonded",
  description: "Dance with your dog: lessons, practice and Roni's feedback.",
  start_url: "/home?source=pwa",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#edf8ff",
  theme_color: "#edf8ff",
  lang: "en",
  categories: ["education", "lifestyle"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [
    { name: "Practice", url: "/practice", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    { name: "My chapters", url: "/my-courses", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    { name: "Feedback", url: "/feedback", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
  ],
};

export function GET(): Response {
  return new Response(JSON.stringify(MANIFEST), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
