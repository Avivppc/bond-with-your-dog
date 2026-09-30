import { redirect } from "next/navigation";

/** Students became Kajabi's Contacts. */
export default function StudentsPage() {
  redirect("/admin/people");
}
