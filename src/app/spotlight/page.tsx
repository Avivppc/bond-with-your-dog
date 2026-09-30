import { redirect } from "next/navigation";

/**
 * The old Spotlight page (placeholder copy and made-up numbers) is replaced by the community hub:
 * members share videos with Roni under Feedback and their stories under Bonded Stories.
 */
export default function SpotlightRedirect() {
  redirect("/community");
}
