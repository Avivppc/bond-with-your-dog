import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/member/viewer";
import { loadEnrolled } from "@/lib/member/home";
import { loadStudentCourse } from "@/lib/student-course-server";
import { formatMinutes } from "@/components/app/ui";
import { TimeZoneCapture } from "@/components/app/TimeZoneCapture";
import { OnboardingWizard, type FirstLesson } from "./OnboardingWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ again?: string }> }) {
  const viewer = await requireMember("/welcome");
  const { again } = await searchParams;
  // Finished members go home, unless they chose to redo it from their profile.
  if (viewer.profile.onboarded_at && !again) redirect("/home");

  const supabase = await createClient();
  const enrolled = await loadEnrolled(supabase);
  const course = enrolled[0] ? await loadStudentCourse(supabase, enrolled[0].courseId, viewer.userId) : null;
  const lesson = course ? (course.progress.next ?? course.lessons[0] ?? null) : null;
  const first: FirstLesson | null =
    course && lesson
      ? {
          courseTitle: course.course.title,
          title: lesson.title,
          href: `/learn/${course.course.id}/${lesson.id}`,
          minutes: formatMinutes(lesson.duration_seconds),
          image: lesson.thumbnail_url || course.course.image,
          number: course.lessons.findIndex((l) => l.id === lesson.id) + 1,
        }
      : null;
  const dog = viewer.activeDog;

  return (
    <>
      {!viewer.profile.timezone && <TimeZoneCapture />}
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
        }}
        firstLesson={first}
      />
    </>
  );
}
