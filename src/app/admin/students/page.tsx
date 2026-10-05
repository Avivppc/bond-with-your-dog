import { redirect } from "next/navigation";

export const metadata = { title: "Contacts" };

/** Students became Kajabi's Contacts. */
export default function StudentsPage() {
  redirect("/admin/people");
}
