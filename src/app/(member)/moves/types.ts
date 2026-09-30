import type { SkillLevel } from "@/lib/member/viewer";

/** What the Moves Library sends to the browser for each published move. */
export interface MoveView {
  id: string;
  slug: string;
  name: string;
  courseId: string | null;
  courseTitle: string | null;
  lessonId: string | null;
  lessonNumber: number | null;
  cue: string | null;
  summary: string | null;
  steps: string[];
  image: string;
  /** Vimeo player URL or a direct video file. */
  clip: { kind: "vimeo" | "video"; src: string } | null;
  loadsJoints: boolean;
  gentleAlternative: string | null;
  position: number;
  level: SkillLevel | null;
  setByCoach: boolean;
}

export interface ChipCourse {
  id: string;
  title: string;
}

export interface MovesDog {
  id: string;
  name: string;
  limitations: string[];
}
