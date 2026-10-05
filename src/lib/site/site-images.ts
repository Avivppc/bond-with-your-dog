/** Images that ship with the site (public/), offered in the editor's image library. Kept in sync by a test. */

export interface LibraryImage {
  src: string;
  name: string;
}

export const SITE_IMAGE_GROUPS: readonly { label: string; images: readonly LibraryImage[] }[] = [
  {
    label: "Photos",
    images: [
      { src: "/images/photos/agt-spotlight.jpg", name: "agt spotlight" },
      { src: "/images/photos/borderonis-01.jpg", name: "borderonis 01" },
      { src: "/images/photos/borderonis-02.jpg", name: "borderonis 02" },
      { src: "/images/photos/borderonis-03.jpg", name: "borderonis 03" },
      { src: "/images/photos/borderonis-04.jpg", name: "borderonis 04" },
      { src: "/images/photos/borderonis-06.jpg", name: "borderonis 06" },
      { src: "/images/photos/borderonis-08.jpg", name: "borderonis 08" },
      { src: "/images/photos/borderonis-09.jpg", name: "borderonis 09" },
      { src: "/images/photos/borderonis-10.jpg", name: "borderonis 10" },
      { src: "/images/photos/borderonis-11.jpg", name: "borderonis 11" },
      { src: "/images/photos/borderonis-12.jpg", name: "borderonis 12" },
      { src: "/images/photos/borderonis-15.jpg", name: "borderonis 15" },
      { src: "/images/photos/borderonis-16.jpg", name: "borderonis 16" },
      { src: "/images/photos/borderonis-17.jpg", name: "borderonis 17" },
      { src: "/images/photos/borderonis-18.jpg", name: "borderonis 18" },
      { src: "/images/photos/borderonis-19.jpg", name: "borderonis 19" },
      { src: "/images/photos/borderonis-21.jpg", name: "borderonis 21" },
      { src: "/images/photos/borderonis-24.jpg", name: "borderonis 24" },
      { src: "/images/photos/borderonis-25.jpg", name: "borderonis 25" },
      { src: "/images/photos/borderonis-27.jpg", name: "borderonis 27" },
      { src: "/images/photos/real-life.jpg", name: "real life" },
      { src: "/images/photos/roni-serafina.jpg", name: "roni serafina" },
    ],
  },
  {
    label: "Sketches",
    images: [
      { src: "/sketches/artistic-impressions.jpg", name: "artistic impressions" },
      { src: "/sketches/basic-foundations.jpg", name: "basic foundations" },
      { src: "/sketches/basic-skills.jpg", name: "basic skills" },
      { src: "/sketches/basic-tricks.jpg", name: "basic tricks" },
      { src: "/sketches/dancing-skills.jpg", name: "dancing skills" },
      { src: "/sketches/drunk-bunny.jpg", name: "drunk bunny" },
      { src: "/sketches/fun-tricks.jpg", name: "fun tricks" },
      { src: "/sketches/give-a-hug.jpg", name: "give a hug" },
      { src: "/sketches/hoop-jumps.jpg", name: "hoop jumps" },
      { src: "/sketches/intro.jpg", name: "intro" },
      { src: "/sketches/jump-basics.jpg", name: "jump basics" },
      { src: "/sketches/leash-walking.jpg", name: "leash walking" },
      { src: "/sketches/model-walk.jpg", name: "model walk" },
      { src: "/sketches/moving-together.jpg", name: "moving together" },
      { src: "/sketches/take-a-selfie.jpg", name: "take a selfie" },
    ],
  },
];
