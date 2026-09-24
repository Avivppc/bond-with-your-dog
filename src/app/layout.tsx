import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

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
        url: "/images/photos/roni-serafina.jpg",
        width: 1600,
        height: 1067,
        alt: "Roni and her dog playing together in a city square",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${beVietnamPro.variable} scroll-smooth`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
