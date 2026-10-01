import { redirect } from "next/navigation";
import { requireMember } from "@/lib/member/viewer";
import { loadMyCourses } from "@/lib/member/courses";
import { chapterChoices, defaultChoiceId, toCourseChoice } from "@/lib/member/course-choice";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ again?: string }> }) {
  const viewer = await requireMember("/welcome");
  const { again } = await searchParams;
  // Finished members go home, unless they chose to redo it from their profile.
  if (viewer.profile.onboarded_at && !again) redirect("/home");

  const { cards } = await loadMyCourses(viewer.userId);
  const courses = chapterChoices(cards.map(toCourseChoice));
  const dog = viewer.activeDog;

  return (
    <OnboardingWizard
      firstName={viewer.firstName}
      initial={{
        fullName: viewer.profile.full_name ?? "",
        avatarUrl: viewer.profile.avatar_url,
        dog: dog
          ? { id: dog.id, name: dog.name, breed: dog.breed ?? "", ageGroup: dog.age_group, limitations: dog.limitations as ("joints" | "injury" | "other")[], photoUrl: dog.photo_url }
          : null,
        goals: viewer.profile.goals,
        sessionMinutes: viewer.profile.session_minutes,
        practiceDays: viewer.profile.practice_days,
        courseId: defaultChoiceId(courses, viewer.profile.chosen_course_id),
      }}
      courses={courses}
    />
  );
}
