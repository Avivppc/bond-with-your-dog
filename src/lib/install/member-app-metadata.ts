import type { Metadata } from "next";

/** Shared by the member app's layouts: its manifest and the iPhone home-screen settings. */
export const MEMBER_APP_METADATA: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/app.webmanifest",
  appleWebApp: { capable: true, title: "Bonded", statusBarStyle: "default" },
};
