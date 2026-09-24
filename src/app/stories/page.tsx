import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer, { CONTACT_EMAIL } from "@/components/Footer";

export const metadata = {
  title: "Student Stories",
  description: "Real BONDED students, in their own words.",
};

// Only quotes we can stand behind. Add new ones here as students send them in.
const stories = [
  {
    quote:
      "I love the program! I am very much a beginner and I worried that the online format wouldn't work for me. I was WRONG. The courses are well planned and the videos are clear.",
    name: "Shari Divone & Linus",
    detail: "Bonded: Foundations",
  },
  {
    quote:
      "I was working on the first lesson from your site and couldn't believe how quickly my dog responded. This method is unlike anything I've tried before.",
    name: "Marcus & Toby",
    detail: "BONDED student",
  },
];

const shareMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Our BONDED story"
)}&body=${encodeURIComponent(
  "Hi Roni,\n\nOur names: \nOur dog: \nWhich chapter we did: \nOur story (a few sentences): \n\nWe're attaching a photo or a short video. You're welcome to share it on bonded.dog.\n"
)}`;

export default function StoriesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">

        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src="/images/photos/borderonis-09.jpg"
            alt="Roni walking through a corridor with a dog on each side"
            className="w-full h-[55vh] min-h-[360px] object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center">
            <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05] mb-4">
              Every bond has a story.
            </h1>
            <p className="font-body text-lg md:text-xl text-on-surface-variant max-w-xl mx-auto">
              Real people, real dogs, in their own words.
            </p>
          </div>
        </section>

        {/* Quotes */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {stories.map(({ quote, name, detail }) => (
              <figure
                key={name}
                className="bg-surface-container-lowest p-8 md:p-12 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <blockquote className="text-lg md:text-xl font-light leading-relaxed mb-8 italic">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption>
                  <p className="font-bold text-lg text-primary">{name}</p>
                  <p className="text-sm text-outline">{detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Share your story */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="bg-secondary-container rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-lg">
            <div className="md:w-1/2 p-10 lg:p-20 flex flex-col justify-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-on-secondary-container mb-4">
                Share your story.
              </h2>
              <p className="font-body text-lg text-on-secondary-container/80 mb-8">
                Did BONDED change something between you and your dog? Send Roni
                a few sentences and a photo or short video, and your story could
                be featured here.
              </p>
              <a
                href={shareMailto}
                className="bg-on-secondary-container text-secondary-container font-label text-base font-bold px-8 py-4 rounded-full w-full sm:w-max text-center hover:bg-secondary transition-colors shadow-md"
              >
                Send your story
              </a>
            </div>
            <div className="md:w-1/2 h-64 md:h-auto relative">
              <img
                className="absolute inset-0 w-full h-full object-cover"
                alt="Roni sitting on a staircase with her five dogs"
                src="/images/photos/borderonis-17.jpg"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-12 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-on-background mb-6">
            The next story could be yours.
          </h2>
          <p className="font-body text-lg md:text-xl text-on-surface-variant mb-10">
            Begin with Foundations and build the relationship you&apos;ve always
            wanted with your dog.
          </p>
          <Link
            href="/chapter/foundations"
            className="inline-block bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-lg font-bold px-10 py-5 rounded-full shadow-xl hover:scale-105 transition-transform w-full sm:w-auto"
          >
            Start with Foundations
          </Link>
        </section>

      </main>
      <Footer />
    </>
  );
}
