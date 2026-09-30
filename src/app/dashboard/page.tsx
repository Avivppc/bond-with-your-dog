import { redirect } from "next/navigation";

/** The member home moved to /home (Member App); keep old links and bookmarks working. */
export default function DashboardRedirect() {
  redirect("/home");
}
