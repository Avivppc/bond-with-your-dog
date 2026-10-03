import type { MetadataRoute } from "next";

/** Installing Bonded on a phone ("Add to Home Screen") opens straight into the member app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bonded",
    short_name: "Bonded",
    description: "Dance with your dog: lessons, practice and Roni's feedback.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#edf8ff",
    theme_color: "#edf8ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
