/** Help centre FAQ: accurate answers about this app, plus the search filter. Pure. */

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ: readonly FaqItem[] = [
  {
    id: "session-length",
    question: "How long should a practice session be?",
    answer: "Five to ten minutes is ideal. Two short sessions beat one long one. Stop while your dog still wants more. You can set 5, 10 or 15 minutes for your plan when you start.",
  },
  {
    id: "lessons-open",
    question: "When do new lessons open?",
    answer: "Some lessons open a few days after you join a course, so each skill has time to settle. A locked lesson shows the day it opens. You can rewatch any open lesson at any time.",
  },
  {
    id: "two-dogs",
    question: "Can I train two dogs on one account?",
    answer: "Yes. Add each dog under Your dogs and switch between them from the dog button at the top. Each dog keeps its own progress, practice and feedback.",
  },
  {
    id: "puppy",
    question: "My dog is a puppy. Is Bonded safe?",
    answer: "Foundations is gentle, but for puppies under 12 months skip jumps and paws-up moves, and check with your vet first. Moves that load the joints are marked in the Moves Library with a gentler alternative.",
  },
  {
    id: "filming",
    question: "How do I film a good video for Roni?",
    answer: "Film landscape from the side, keep the whole dog in frame and aim for 30 to 90 seconds in daylight. Videos can be MP4 or MOV and up to 2 minutes long.",
  },
  {
    id: "feedback-time",
    question: "When will Roni reply to my video?",
    answer: "Roni's team reviews videos in the order they arrive. You'll get a notification (and an email, if you keep that switched on in Settings) as soon as her notes are ready.",
  },
  {
    id: "purchases",
    question: "Where do I manage my purchase?",
    answer: "Purchases are made right here in Bonded, with Paddle as our secure payment provider. Open Membership & purchases to see your courses, order history and any subscription, and to cancel a subscription.",
  },
  {
    id: "refunds",
    question: "How do refunds work?",
    answer: "Ask us from this page with Ask a question and include your order date. Refunds follow our refund policy; a refunded order shows as Refunded in your order history.",
  },
  {
    id: "password",
    question: "How do I change my password?",
    answer: "Go to Settings, then Sign-in, and choose Reset. We'll email you a link to set a new password.",
  },
  {
    id: "my-data",
    question: "Can I download or delete my data?",
    answer: "Yes. In Settings under Your data you can download everything we store about you as a file, or delete your account permanently.",
  },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Items matching every word of the query (in the question or the answer). Empty query → all. */
export function filterFaq(items: readonly FaqItem[], query: string): FaqItem[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const haystack = normalize(`${item.question} ${item.answer}`);
    return words.every((w) => haystack.includes(w));
  });
}
