import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * Legal entity shown in Terms/Refund/Privacy (required by the payment provider's review).
 * Set NEXT_PUBLIC_LEGAL_NAME to the exact registered business name before launch.
 */
export const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME ?? "Bonded";
export const LEGAL_UPDATED = "October 1, 2026";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 max-w-3xl mx-auto px-5 min-h-screen" style={{ backgroundColor: "#edf8ff" }}>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-2" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
          {title}
        </h1>
        <p className="text-sm mb-8" style={{ color: "#515d64" }}>
          Last updated: {LEGAL_UPDATED}
        </p>
        <div className="lesson-prose bg-white rounded-2xl p-6 md:p-8" style={{ color: "#243036" }}>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
