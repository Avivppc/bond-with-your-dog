/** Guided tours (driver.js): which screen gets which walkthrough, anchored on data-tour attributes. */
export interface TourStep {
  target: string; // value of the element's data-tour attribute
  title: string;
  body: string;
}

export interface Tour {
  id: "home" | "lesson";
  /** Pages the tour runs on. */
  matches: (pathname: string) => boolean;
  steps: TourStep[];
}

export const TOURS: Tour[] = [
  {
    id: "home",
    matches: (p) => p === "/home",
    steps: [
      { target: "home-hero", title: "Your next step", body: "Everything starts here: continue your lesson, or start today's practice with your dog." },
      { target: "week", title: "Your week", body: "The days you picked for practice. Each session you log turns a day teal — open your plan to change days." },
      { target: "nav-school", title: "My Courses", body: "All your chapters, in order. Each one opens after you finish the one before." },
      { target: "nav-pets", title: "Practice mode", body: "Guided steps with a timer and a rep counter. Five to ten minutes is plenty." },
      { target: "nav-auto_stories", title: "Moves Library", body: "Every move with its cue and a short clip. Mark each one Learning, then Reliable." },
      { target: "ask-roni", title: "Ask Roni", body: "Film 30–90 seconds of a move and Roni replies with notes pinned to moments in your clip." },
      { target: "dog-chip", title: "Your dog", body: "Training more than one dog? Switch here — each keeps their own progress." },
      { target: "notifications", title: "Notifications", body: "Roni's replies, answers to your questions and new achievements land here." },
    ],
  },
  {
    id: "lesson",
    matches: (p) => /^\/learn\/[^/]+\/[0-9a-f-]{36}$/i.test(p),
    steps: [
      { target: "player", title: "Watch together", body: "Watch the lesson first — then try it with your dog while it's fresh." },
      { target: "complete", title: "Mark it complete", body: "When you're done, mark the lesson complete to move along your course." },
      { target: "practice-now", title: "Practice this now", body: "Short guided steps for this lesson, timed for you." },
      { target: "send-video", title: "Get Roni's eyes on it", body: "Stuck on something? Send Roni a short video of this lesson." },
    ],
  },
];

/** Steps whose element is on screen right now (phones hide the sidebar, some pages lack a section). */
export function visibleSteps(steps: TourStep[], find: (target: string) => Element | null): TourStep[] {
  return steps.filter((s) => {
    const el = find(s.target);
    return el !== null && (el as HTMLElement).offsetParent !== null;
  });
}
