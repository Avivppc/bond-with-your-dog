import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { canPerform } from "@/lib/staff";
import { BTN_SECONDARY, Breadcrumbs, Card, Notice } from "../../_components/ui";
import { PasswordResetButton } from "../PasswordResetButton";
import { loadOfferOptions, loadPerson } from "../_lib/person-data";
import { ActivitySection, DogsAndOnboarding, PersonHeader } from "./ProfileSections";
import { loadContactNotes } from "../_lib/notes-data";
import { CoursesSection, OrdersSection, TeamSection } from "./AccessSections";
import { NotesSection } from "./NotesSection";

export const dynamic = "force-dynamic";

const UserId = z.string().uuid();

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { user, role } = await requireStaff("sales");
  const [{ id }, { ok, error }] = await Promise.all([params, searchParams]);
  const userId = UserId.safeParse(id);
  if (!userId.success) notFound();
  const [person, offers, notes] = await Promise.all([loadPerson(userId.data), loadOfferOptions(), loadContactNotes(userId.data)]);
  if (!person) notFound();

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Contacts", href: "/admin/people" }, { label: person.profile.fullName || person.email }]} />
      <PersonHeader person={person} />
      {typeof ok === "string" && <Notice tone="success">{ok}</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <CoursesSection person={person} offers={offers} />
          <OrdersSection person={person} />
          <ActivitySection person={person} />
        </div>
        <div className="space-y-5">
          <NotesSection contactId={person.userId} notes={notes} />
          <DogsAndOnboarding person={person} />
          <Card title="Account" description="Sends a one-time link to choose a new password.">
            <PasswordResetButton userId={person.userId} className={BTN_SECONDARY} />
          </Card>
          <TeamSection person={person} canManage={canPerform(role, "staff")} isSelf={person.userId === user.id} />
        </div>
      </div>
    </div>
  );
}
