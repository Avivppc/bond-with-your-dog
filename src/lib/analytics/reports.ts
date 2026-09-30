/** The Reports catalog (Kajabi Analytics → Reports). Pure metadata; data builders live server-side. */
export type ReportCategory = "Payments" | "Sales" | "Subscriptions" | "Contacts" | "Courses";

export interface ReportMeta {
  slug: string;
  name: string;
  category: ReportCategory;
  description: string;
}

export const REPORTS: readonly ReportMeta[] = [
  {
    slug: "gross-revenue",
    name: "Gross revenue",
    category: "Payments",
    description: "Total gross revenue over time, including first purchases and subscription renewals. Does not account for refunds.",
  },
  { slug: "refunds", name: "Refunds", category: "Payments", description: "The total value of refunds issued over time, including full and partial refunds." },
  { slug: "net-revenue", name: "Net revenue", category: "Payments", description: "Gross revenue minus refunds over time." },
  {
    slug: "payments-by-method",
    name: "Payments by payment method",
    category: "Payments",
    description: "How customers paid for their purchases (card, PayPal, Apple Pay, …).",
  },
  { slug: "payments-by-offer", name: "Payments by offer", category: "Payments", description: "Gross revenue, refunds and purchases for each offer." },
  {
    slug: "offer-purchases",
    name: "Offer purchases over time",
    category: "Sales",
    description: "New paid purchases over time (renewals excluded), with the revenue they brought in.",
  },
  { slug: "free-offers", name: "Free offers over time", category: "Sales", description: "The number of free offers claimed over time." },
  { slug: "new-subscriptions", name: "New subscriptions over time", category: "Subscriptions", description: "Subscriptions started over time." },
  { slug: "subscription-cancellations", name: "Subscription cancellations", category: "Subscriptions", description: "Subscriptions canceled over time." },
  {
    slug: "subscription-retention",
    name: "Subscription retention",
    category: "Subscriptions",
    description: "Monthly cohorts: of the members who subscribed each month, how many were still subscribed in the months after.",
  },
  { slug: "new-contacts", name: "New contacts over time", category: "Contacts", description: "New accounts and quiz leads over time." },
  { slug: "top-customers", name: "Top customers", category: "Contacts", description: "Customers ranked by total spend, net of full and partial refunds." },
  { slug: "lesson-completions", name: "Lesson completions over time", category: "Courses", description: "Lessons completed and active learners over time." },
  {
    slug: "course-progress",
    name: "Course progress",
    category: "Courses",
    description: "For each course: active students, how many started, how many finished, and average progress.",
  },
];

export function findReport(slug: string): ReportMeta | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
