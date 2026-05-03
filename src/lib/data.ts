export type Course = {
  id: string;
  title: string;
  description: string;
  price: number;
  lessons: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  category: "Foundations" | "Choreography" | "Trick Training";
  badge?: string;
  image: string;
  imageAlt: string;
};

export const courses: Course[] = [
  {
    id: "kinetic-basics",
    title: "The Kinetic Basics: First Steps to Rhythm",
    description:
      "Learn the fundamental movements that form the backbone of every dog dance routine, including focus and basic positioning.",
    price: 49,
    lessons: 12,
    level: "Beginner",
    category: "Foundations",
    badge: "Included in Pro",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDwXwgEQpqaf2YHDfk-I8RjVyi7frfIlbW8XCuPyuPAP_1U7lbaiDiX2KVyuYKjjlhzwU5z3A58ZLITFTDvf9Maae5Rsa7QcxLKkNSqDeq9ZCFg9LCztDB_CQi-Fb95taoRdQyxbh5erABtnIh8WxsJ_7lbW6YC9wRFdEurVSOqCuwvM3sd6yaknN-6uLYlO3eWNmjOnUyVXiEk2AEfkPs2UR2QcwVyl6sIibeAVWuby--9bPjH20K9_7wQd6NeBHIzqlUB6mKEq8Hj",
    imageAlt: "A joyful border collie performing a leg weave with its handler",
  },
  {
    id: "advanced-spins",
    title: "Advanced Spins & Vertical Transitions",
    description:
      "Elevate your performance with dynamic spins, jumps, and vertical elements that add flair to any routine.",
    price: 65,
    lessons: 10,
    level: "Intermediate",
    category: "Trick Training",
    badge: "Included in Pro",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDzTN5GM0Y2scir_OVjuFea6pgjKTIhREWtQdF8iPsmY5nI1UCS7pqRj8-cxIgkVeWyiEMI-M0v50QNspmgIrZItDQen732Q-z5ave15_Di7idN5TsuhAcJGPgGbW-eh8Kn3D3fiXm8t1j0YNF-gtAeem9OlgQ4xsLdXMtWE4hKov-9tSFlZMskpK5848X8cxPWipKMbkjvm7QGjsunHFHaH0ZxrXfHKSuq5ur_mIywBg9uu3b8MsuTR9C8H7LT2jTgNC8mgKcmaEGQ",
    imageAlt:
      "A golden retriever balancing on its hind legs while focusing on a trainer",
  },
  {
    id: "musical-mastery",
    title: "Musical Mastery: Syncing with the Beat",
    description:
      "A masterclass in musicality. Learn to analyze music and build a narrative routine that captures the audience's heart.",
    price: 89,
    lessons: 20,
    level: "Advanced",
    category: "Choreography",
    badge: "Mastery Series",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCHPiyg1p6nxiqT6Yx-E9Yfm6QqSRynra_Q7kRpMhWp6NO2jZ82YxMkBTwbd22yDrgx5jkMHnvL52Ka8Q4JoZr04rYB-whDvW9R6IV5T8woTnOQ7446BFYYsrX65ULs0TpGLClXwBvBjuO8BZJ-nyE-bdtWd4vQF46c5xxHBzlkovANPtn_KLp26qdZqAAMPy0VitACwaBIniINqWPoJj8ZXX-6LWl-9M0og1mwNV-V8JiKOCCbqYG0gFIDHEpQqBAF66a6JMPI9-HI",
    imageAlt:
      "An elegant poodle and its handler bowing together after a performance",
  },
  {
    id: "perfect-heelwork",
    title: "Perfect Heelwork: The Foundation of Flow",
    description:
      'Achieve a perfect "glue" heel that stays consistent through turns and speed changes.',
    price: 35,
    lessons: 8,
    level: "Beginner",
    category: "Foundations",
    badge: "Pro Only",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB0K5xCQgtNzKO029XBNQ7iFOsmoXTn9XIZ_XYCfy77GCCxHL7gkQq_1mwTzXI7UVfbUJHAk1tRUQRbYrIA8-VKYgG2lxOsgoAyUy4MLNSZee2Gr_h9zadyWJBuKAq9FNB7BwGHpJL55AAGZ9CY-X_OkwZTO8XUhA-2V5NFdtzbgtyL0LdWPTDdIcaumFvhsWXqoKW_Vrp4tS9cduCcVQ7fWLPcirHtkcAfNzoyZqRHTpQMEHqwOcXzBHD6dmYcANMsg-kgniuoqhoK",
    imageAlt:
      "A small terrier walking perfectly in sync beside a trainer's leg in a park",
  },
  {
    id: "puppy-prodigy",
    title: "Puppy Prodigy: Early Rhythmic Play",
    description:
      "Start them young! Fun games and focus exercises designed specifically for developing puppy minds and bodies.",
    price: 29,
    lessons: 6,
    level: "Beginner",
    category: "Foundations",
    badge: "Best Value",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDowXLuGvtnJTTeJkPKa6MZHm0t0YR9hDmaHdpleZtFfACeS4UGVPR4EDvKEXLh7xGzhFhRb8Y2dCwXgyWz7VVK88PEL1sFOB4qN50Yd0HY5M_a9nVWszIPcoqIgiuLklOAY1z9daN7EP3Iw8EQG9zBqx0SnxWpHoy96Z8SeFIFRvNe82k6PUCeaIEYvsxvedoovO0havB6BHBAkLcLI36L-jVL17vPWTTBLYQdDEz5AGpT2bf-_gMJZkcal9XEqFOfE2WIH2qRM4An",
    imageAlt:
      "A cute puppy sitting attentively and looking up at its handler with soft natural lighting",
  },
  {
    id: "prop-work",
    title: "Prop Work & Hoops: Stage Mechanics",
    description:
      "Incorporate props seamlessly into your dance. Learn safe jumping, hoop transitions, and weaving through objects.",
    price: 55,
    lessons: 9,
    level: "Intermediate",
    category: "Trick Training",
    badge: "Popular",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBymBPECCliSp6NuHYcafV2kJOiCGNqPBjKOpCz05md8tLJh-DuY08IXZN-JkzeRpjaSulY-lSLTOa5VEQBR-dtCtDMAWrI3gn8kYJMqDfloSsxm1TJ7RLJ5PD4y1_Xhk-G-QAaoOLpGNH7vWRyBwMIF2GGsJSmvfLpnvzNvkivdeWrrLLRBkE55KnT6gRMZjkdNjZR4PUP9s_sD0GPra-9QuX3iZVd4qntuezlxZ0bkmFh50s1cVQRuI8Gj-BHfsY3hZbiGyMthprj",
    imageAlt:
      "A dog jumping through a colorful hula hoop held by a trainer in a vibrant park",
  },
];

export type PricingTier = {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

export const pricingTiers: PricingTier[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: 49,
    period: "/mo",
    features: ["All basic courses", "Community Forum access", "Monthly Q&A"],
    cta: "Get Started",
  },
  {
    id: "yearly",
    name: "Yearly Academy",
    price: 480,
    period: "/yr",
    features: [
      "All Premium Content",
      "Personal Video Feedback",
      "Live Performance Reviews",
      "Expert Workshop Library",
    ],
    cta: "Join the Academy",
    highlighted: true,
  },
  {
    id: "sprint",
    name: "3-Month Sprint",
    price: 99,
    period: "/quarter",
    features: [
      "Intensive foundations",
      "Access to 3 mini-courses",
      "Peer review groups",
    ],
    cta: "Start Sprint",
  },
];
