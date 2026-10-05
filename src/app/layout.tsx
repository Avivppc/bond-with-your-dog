import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import AnalyticsIdentity from "@/components/analytics/AnalyticsIdentity";
import { loadLiveTheme } from "@/lib/site/server";
import { themeCss, themeFontsHref } from "@/lib/site/theme";
import { StandaloneGuard } from "@/components/app/StandaloneGuard";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-headline",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const SITE_URL = "https://www.bonded.dog";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BONDED – Learn your dog's secret language",
    template: "%s | BONDED",
  },
  description:
    "Roni Sagi's step-by-step method for building trust, communication and joyful movement with your dog. From first steps to your first dance.",
  openGraph: {
    type: "website",
    siteName: "BONDED",
    title: "BONDED – Learn your dog's secret language",
    description:
      "Roni Sagi's step-by-step method for building trust, communication and joyful movement with your dog.",
    images: [
      {
        url: "/images/og.png",
        width: 1200,
        height: 630,
        alt: "BONDED – Learn your dog's secret language",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Website → Theme: colors and fonts override the design tokens (nothing when unchanged).
  const theme = await loadLiveTheme();
  const css = themeCss(theme);
  const fontsHref = themeFontsHref(theme);
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${beVietnamPro.variable} scroll-smooth`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout: applies to every page */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        {fontsHref && <link rel="stylesheet" href={fontsHref} />}
        {/* Built only from validated hex colors and a fixed font list. */}
        {css && <style id="site-theme" dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <AnalyticsIdentity />
        <StandaloneGuard />
        {children}
      </body>
    </html>
  );
}
