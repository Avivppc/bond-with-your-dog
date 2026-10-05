import type { Metadata } from "next";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { ShareStoryForm } from "./ShareStoryForm";

export const metadata: Metadata = {
  title: "Share your story",
  description: "Did BONDED change something between you and your dog? Tell Roni, and your story could be featured on bonded.dog.",
};

/** The public "Share your story" form; stories land in Admin → Inbox → Stories. */
export default function ShareStoryPage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-hidden px-4 pb-8 pt-28 md:pt-32">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <p className="mb-4 font-label text-sm font-semibold uppercase tracking-widest text-secondary">Bonded stories</p>
            <h1 className="font-display text-4xl font-bold md:text-5xl">Share your story.</h1>
            <p className="mx-auto mt-4 max-w-xl font-body text-lg text-on-surface-variant">
              Did BONDED change something between you and your dog? Tell Roni about it, add a photo or two, and your story could be featured on
              bonded.dog.
            </p>
          </div>
          <ShareStoryForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
