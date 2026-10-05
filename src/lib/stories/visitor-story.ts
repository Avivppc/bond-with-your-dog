/**
 * The public "Share your story" form (/stories/share): what a visitor may send and how it shows in
 * Admin → Inbox → Stories. Pure — shared by the form, its server actions and their tests.
 */
import { z } from "zod";
import { MAX_STORY_PHOTOS } from "../community/story-media";

export const STORY_CHAPTERS = ["Foundations", "Moves", "Let's Dance"] as const;

/** A name can't carry a link (the team's email shows it), same rule as the quiz. */
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{0,79}$/u;
const DOG = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}' .&-]{0,39}$/u;

export const MIN_STORY_LENGTH = 20;

export const visitorStorySchema = z.object({
  name: z.string().trim().regex(NAME, "Please enter your name."),
  email: z.string().trim().max(254).email("Please enter a valid email."),
  dogName: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || DOG.test(v), "Please check your dog's name.")
    .default(""),
  chapter: z.enum(STORY_CHAPTERS).nullable().default(null),
  story: z.string().trim().min(MIN_STORY_LENGTH, "Tell us a little more — a few sentences is perfect.").max(5000),
  consent: z.literal(true, { error: "Please let Roni share your story — that's what this form is for." }),
  mediaPaths: z
    .array(z.string().max(300))
    .max(MAX_STORY_PHOTOS, `Up to ${MAX_STORY_PHOTOS} photos.`)
    .refine((paths) => new Set(paths).size === paths.length, "Each photo can be added once.")
    .default([]),
  captcha: z.string().max(2048).nullish(),
});

export type VisitorStoryInput = z.input<typeof visitorStorySchema>;
export type VisitorStory = z.output<typeof visitorStorySchema>;

/** The Inbox headline: "Dana & Rhythm · Foundations". */
export function visitorStorySubject(story: Pick<VisitorStory, "name" | "dogName" | "chapter">): string {
  const who = story.dogName ? `${story.name} & ${story.dogName}` : story.name;
  return (story.chapter ? `${who} · ${story.chapter}` : who).slice(0, 200);
}
