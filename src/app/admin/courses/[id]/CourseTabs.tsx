import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { deleteCourse } from "@/app/admin/actions";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { isEnrollmentActive } from "@/lib/enrollment";
import { BTN_DANGER, BTN_PRIMARY, Card, EmptyState, StatusPill } from "@/app/admin/_components/ui";
import { ConfirmSubmit } from "@/app/admin/_components/ConfirmSubmit";

const STUDENTS_SHOWN = 100;

type CourseOffer = PricedOffer & { id: string; title: string; status: string };

/** Offers that sell this course (Kajabi: Product ↔ Offer). */
export async function CourseOffersTab({ courseId }: { courseId: string }) {
  const { data, error } = await createServiceClient()
    .from("offer_courses")
    .select("offers(id, title, payment_type, price_cents, currency, interval, status)")
    .eq("course_id", courseId);
  if (error) console.error("[course] offers load failed", { courseId, error: error.message });
  const offers = (data ?? []).flatMap((row) => (row.offers ? [row.offers as unknown as CourseOffer] : []));

  return (
    <Card
      flush
      title="Offers"
      description="Students get this course by buying (or being granted) one of these offers."
      actions={
        <Link href="/admin/offers/new" className={BTN_PRIMARY}>
          <span aria-hidden>+</span> New offer
        </Link>
      }
    >
      {offers.length === 0 ? (
        <EmptyState title="This course isn't in any offer yet.">Create an offer to start selling it.</EmptyState>
      ) : (
        <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/admin/offers/${o.id}`} className="font-medium hover:underline">
                {o.title}
              </Link>
              <span className="flex items-center gap-3 text-sm text-[#6c6a69]">
                {formatOfferPrice(o)}
                <StatusPill tone={o.status === "published" ? "published" : "draft"}>{o.status === "published" ? "Published" : "Draft"}</StatusPill>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface EnrollmentRow {
  user_id: string;
  source: string;
  enrolled_at: string;
  expires_at: string | null;
}

/** Who has (or had) access to this course. */
export async function CourseStudentsTab({ courseId }: { courseId: string }) {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("enrollments")
    .select("user_id, source, enrolled_at, expires_at")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false })
    .limit(STUDENTS_SHOWN);
  if (error) console.error("[course] students load failed", { courseId, error: error.message });
  const rows = (data ?? []) as EnrollmentRow[];
  const emailsRes = rows.length ? await sb.rpc("admin_user_emails", { p_user_ids: rows.map((r) => r.user_id) }) : null;
  const emailOf = new Map(((emailsRes?.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, u.email]));

  return (
    <Card
      flush
      title="Students"
      description={`Most recent ${STUDENTS_SHOWN}. Grant or revoke access from the Students page.`}
      actions={
        <Link href="/admin/students" className="text-sm font-medium hover:underline">
          Manage students
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="No students yet." />
      ) : (
        <table className="w-full text-sm">
          <thead className="border-y border-[#efeeed] text-left text-[#6c6a69]">
            <tr>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Source</th>
              <th className="px-3 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efeeed]">
            {rows.map((r) => {
              const active = isEnrollmentActive(r);
              return (
                <tr key={r.user_id}>
                  <td className="px-5 py-3 font-medium">{emailOf.get(r.user_id) ?? r.user_id}</td>
                  <td className="px-3 py-3 capitalize text-[#6c6a69]">{r.source}</td>
                  <td className="px-3 py-3 text-[#6c6a69]">{new Date(r.enrolled_at).toLocaleDateString("en-US")}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={active ? "published" : "draft"}>
                      {!r.expires_at ? "Lifetime" : `${active ? "Until" : "Ended"} ${new Date(r.expires_at).toLocaleDateString("en-US")}`}
                    </StatusPill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export function CourseSettingsTab({ courseId }: { courseId: string }) {
  return (
    <Card title="Delete course" description="Removes the course with all its modules, lessons and student progress. This can't be undone.">
      <form action={deleteCourse}>
        <input type="hidden" name="id" value={courseId} />
        <ConfirmSubmit className={BTN_DANGER} message="Delete this course with all its modules, lessons and student progress? This can't be undone.">
          Delete course
        </ConfirmSubmit>
      </form>
    </Card>
  );
}
