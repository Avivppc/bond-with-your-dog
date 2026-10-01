"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BTN_PRIMARY, Card, INPUT, LABEL, Notice } from "@/app/admin/_components/ui";
import type { OfferFormState } from "@/lib/admin-helpers/offer-form";
import { saveOffer } from "../actions";

export interface OfferCourseOption {
  id: string;
  title: string;
  hasPaywall: boolean;
}

interface OfferFormProps {
  id: string;
  courses: readonly OfferCourseOption[];
  initial: OfferFormState;
}

const HINT = "text-[12px] text-[#6c6a69]";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className={HINT}>{hint}</span>}
    </label>
  );
}

function CourseRow({ course, state }: { course: OfferCourseOption; state: OfferFormState }) {
  const { values } = state;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#efeeed] px-3 py-2">
      <label className="flex items-center gap-3 text-[14px]">
        <input type="checkbox" name="course_ids" value={course.id} defaultChecked={values.course_ids.includes(course.id)} className="h-4 w-4 accent-[#343332]" />
        {course.title}
      </label>
      {course.hasPaywall ? (
        <select
          name={`access_level:${course.id}`}
          defaultValue={values.access_levels[course.id] ?? "full"}
          aria-label={`Access to ${course.title}`}
          className="rounded-[8px] border border-[#d9d8d6] bg-white px-2 py-1 text-[12px]"
        >
          <option value="full">Full access</option>
          <option value="limited">Limited — above the paywall only</option>
        </select>
      ) : (
        <span className="text-[12px] text-[#9b9997]">Full access</span>
      )}
    </div>
  );
}

/** Kajabi's offer editor. A failed save keeps everything typed and shows why. */
export function OfferForm({ id, courses, initial }: OfferFormProps) {
  const [state, action, pending] = useActionState(saveOffer, initial);
  const { values } = state;
  return (
    // Keyed by the result so React's post-submit form reset lands on the values handed back.
    <form key={`${state.error ?? ""}:${JSON.stringify(values)}`} action={action} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <Card title="Details">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Title">
              <input name="title" required maxLength={200} defaultValue={values.title} className={INPUT} />
            </Field>
            <Field label="Slug (checkout URL)" hint="Lowercase letters, numbers and dashes.">
              <input name="slug" required maxLength={80} defaultValue={values.slug} placeholder="foundations" className={INPUT} />
            </Field>
          </div>
          <Field label="Description">
            <textarea name="description" rows={2} maxLength={2000} defaultValue={values.description} className={INPUT} />
          </Field>
        </div>
      </Card>

      <Card title="Pricing">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <Field label="Type">
            <select name="payment_type" defaultValue={values.payment_type} className={INPUT}>
              <option value="one_time">One-time payment</option>
              <option value="subscription">Subscription</option>
              <option value="free">Free</option>
            </select>
          </Field>
          <Field label="Price">
            <input name="price" inputMode="decimal" defaultValue={values.price} placeholder="49" className={INPUT} />
          </Field>
          <Field label="Currency">
            <input name="currency" required maxLength={3} defaultValue={values.currency} placeholder="USD" className={`${INPUT} uppercase`} />
          </Field>
          <Field label="Billing (subscriptions)">
            <select name="interval" defaultValue={values.interval} className={INPUT}>
              <option value="">—</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </Field>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Access length in days (one-time)" hint="Blank = lifetime access">
            <input name="days_of_access" type="number" min={1} max={36500} step={1} defaultValue={values.days_of_access} className={INPUT} />
          </Field>
          <Field label="Paddle price id" hint="Create the product/price in Paddle, then paste its id here">
            <input name="provider_price_id" maxLength={100} defaultValue={values.provider_price_id} placeholder="pri_…" className={INPUT} />
          </Field>
        </div>
      </Card>

      <Card title="Products" description="Limited access is available for courses with a paywall (set it in the course outline).">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Courses unlocked by this offer</legend>
          {courses.length === 0 ? (
            <p className="text-[14px] text-[#6c6a69]">
              No courses yet.{" "}
              <Link href="/admin/courses/new" className="font-medium text-[#1a1a19] hover:underline">
                Create a course
              </Link>{" "}
              first.
            </p>
          ) : (
            courses.map((c) => <CourseRow key={c.id} course={c} state={state} />)
          )}
          <label className="mt-2 flex items-start gap-3 rounded-[8px] border border-[#efeeed] px-3 py-2 text-[14px]">
            <input type="checkbox" name="includes_community" defaultChecked={values.includes_community} className="mt-0.5 h-4 w-4 accent-[#343332]" />
            <span>
              Includes community access
              <span className={`block ${HINT}`}>Buyers join the community even if it isn&apos;t open to all students.</span>
            </span>
          </label>
        </fieldset>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-48">
          <Field label="Status">
            <select name="status" defaultValue={values.status} className={INPUT}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Saving…" : "Save offer"}
        </button>
      </div>
    </form>
  );
}
