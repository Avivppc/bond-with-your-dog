import Link from "next/link";

const programLinks = [
  "Foundations",
  "Advanced Choreography",
  "Mini-Courses",
  "Growth Tracks",
];
const academyLinks = ["About Roni", "Success Stories", "Blog", "Instagram"];
const supportLinks = [
  "Contact Us",
  "Privacy Policy",
  "Terms of Service",
  "Newsletter Signup",
];

export default function Footer() {
  return (
    <footer
      className="w-full mt-20 text-sm leading-relaxed"
      style={{
        fontFamily: "var(--font-body), Be Vietnam Pro, sans-serif",
        borderRadius: "2rem 2rem 0 0",
        backgroundColor: "#f5f0eb",
      }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 px-6 md:px-12 py-12 md:py-16 max-w-7xl mx-auto">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
          <div
            className="text-xl font-bold"
            style={{
              fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif",
              color: "#7c3900",
            }}
          >
            bond with your dog
          </div>
          <p className="text-stone-500">
            Professional Dog Dance Academy teaching connection through
            choreography.
          </p>
          <div className="flex gap-4 mt-2">
            <a
              href="#"
              className="text-stone-400 hover:text-orange-600 transition-colors"
            >
              <span className="material-symbols-outlined">star</span>
            </a>
            <a
              href="#"
              className="text-stone-400 hover:text-orange-600 transition-colors"
            >
              <span className="material-symbols-outlined">play_circle</span>
            </a>
            <a
              href="#"
              className="text-stone-400 hover:text-orange-600 transition-colors"
            >
              <span className="material-symbols-outlined">mail</span>
            </a>
          </div>
        </div>

        {/* Programs */}
        <div>
          <h5
            className="font-bold mb-5 uppercase tracking-widest text-xs"
            style={{ color: "#0e666a" }}
          >
            Programs
          </h5>
          <ul className="space-y-3">
            {programLinks.map((l) => (
              <li key={l}>
                <Link
                  href="/courses"
                  className="text-stone-500 hover:text-orange-600 transition-colors underline-offset-4 hover:underline"
                  style={{ textDecorationColor: "rgba(14,102,106,0.3)" }}
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Academy */}
        <div>
          <h5
            className="font-bold mb-5 uppercase tracking-widest text-xs"
            style={{ color: "#0e666a" }}
          >
            Academy
          </h5>
          <ul className="space-y-3">
            {academyLinks.map((l) => (
              <li key={l}>
                <a
                  href="#"
                  className="text-stone-500 hover:text-orange-600 transition-colors underline-offset-4 hover:underline"
                  style={{ textDecorationColor: "rgba(14,102,106,0.3)" }}
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h5
            className="font-bold mb-5 uppercase tracking-widest text-xs"
            style={{ color: "#0e666a" }}
          >
            Support
          </h5>
          <ul className="space-y-3">
            {supportLinks.map((l) => (
              <li key={l}>
                <a
                  href="#"
                  className="text-stone-500 hover:text-orange-600 transition-colors underline-offset-4 hover:underline"
                  style={{ textDecorationColor: "rgba(14,102,106,0.3)" }}
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-stone-400"
        style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
      >
        <p>© 2024 Keta Tov Dog Dance Academy. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <span style={{ color: "#0e666a", fontWeight: 600 }}>
            Ready to dance?
          </span>
          <span className="material-symbols-outlined text-sm">pets</span>
        </div>
      </div>
    </footer>
  );
}
