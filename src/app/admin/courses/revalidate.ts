import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Every page that shows course content: the admin course/lesson editors and the member pages
 * that list or play it (course overview, lesson player, My Courses, Home, search, catalog).
 */
export function revalidateCourseContent(courseId: string, lessonId?: string): void {
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  if (lessonId) revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/learn/${courseId}`);
  revalidatePath("/(member)/learn/[courseId]/[lessonId]", "page");
  revalidatePath("/my-courses");
  revalidatePath("/home");
  revalidatePath("/search");
  revalidatePath("/courses");
}
