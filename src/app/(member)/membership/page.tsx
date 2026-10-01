import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { Ms, StateCard } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { accessKind, canCancelSubscription, formatMoney, orderStatusPill, subscriptionPhase } from "@/lib/feedback/membership";
import { loadMembership, type AvailableOffer, type OwnedCourse, type SubscriptionItem } from "@/lib/feedback/membership-queries";
import { CancelSubscription } from "./CancelSubscription";

export const metadata = { title: "Membership & purchases" };

function CourseMedia({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="media" style={{ aspectRatio: "16/9" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- course artwork */}
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <span className="media-ph" aria-hidden>
          <Ms name="school" />
        </span>
      )}
    </div>
  );
}

function AccessPill({ course, now }: { course: OwnedCourse; now: Date }) {
  const kind = accessKind(course, now);
  const style = { alignSelf: "flex-start" };
  if (kind === "expired") {
    return (
      <span className="pill neutral" style={style}>
        Access ended <LocalTime iso={course.expires_at as string} format="fullDate" />
      </span>
    );
  }
  const scope = course.access_level === "limited" ? "taster access" : kind === "lifetime" ? "lifetime access" : null;
  return (
    <span className="pill reliable" style={style}>
      Owned · {scope ?? <>access until <LocalTime iso={course.expires_at as string} format="fullDate" /></>}
    </span>
  );
}

function OwnedCard({ course, now }: { course: OwnedCourse; now: Date }) {
  const open = accessKind(course, now) !== "expired";
  return (
    <div className="card tight">
      <CourseMedia src={course.image} alt={course.image_alt ?? ""} />
      {open ? (
        <Link href={`/learn/${course.course_id}`}>
          <b>{course.title}</b>
        </Link>
      ) : (
        <b>{course.title}</b>
      )}
      <AccessPill course={course} now={now} />
    </div>
  );
}

function priceLabel(o: AvailableOffer): string {
  const price = formatMoney(o.price_cents, o.currency);
  return o.payment_type === "subscription" && o.interval ? `${price} / ${o.interval}` : price;
}

function OfferCard({ offer }: { offer: AvailableOffer }) {
  return (
    <div className="card tight">
      <CourseMedia src={offer.image} alt="" />
      <b>{offer.title}</b>
      <span className="faint">{priceLabel(offer)}</span>
      <Link className="btn btn-primary btn-sm" href={`/checkout/${offer.slug}`} style={{ alignSelf: "flex-start" }}>
        Get {offer.title}
        <Ms name="arrow_forward" size="sm" />
      </Link>
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: SubscriptionItem }) {
  const phase = subscriptionPhase(sub);
  const date = sub.current_period_end ? <LocalTime iso={sub.current_period_end} format="fullDate" /> : null;
  const line: Record<typeof phase, React.ReactNode> = {
    renews: date ? <>Renews {date}</> : "Active",
    ends: date ? <>Canceled · access until {date}</> : "Canceled at the end of this period",
    past_due: "Payment failed · Paddle will retry. Check the email from Paddle to update your card.",
    paused: "Paused",
    canceled: "Canceled",
  };
  return (
    <div className="list-row">
      <span className="ms" style={{ color: "var(--ink-3)" }} aria-hidden>
        autorenew
      </span>
      <div className="grow">
        <div className="title">{sub.offerTitle}</div>
        <div className="faint">{line[phase]}</div>
      </div>
      {canCancelSubscription(sub) && <CancelSubscription subscriptionId={sub.id} title={sub.offerTitle} />}
    </div>
  );
}

export default async function MembershipPage() {
  const viewer = await requireMember("/membership");
  const now = new Date();
  const { courses, orders, subscriptions, available } = await loadMembership(await createClient(), viewer.userId, now);

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Membership</span>
        <h1 className="h1">Membership &amp; purchases</h1>
        <p className="lede">Purchases happen right here in Bonded, with Paddle as our secure checkout. Your access shows here as soon as payment clears.</p>
      </div>
      {courses.length === 0 && available.length === 0 ? (
        <StateCard icon="school" eyebrow="No chapters yet" title="You don't have a chapter yet" action={<Link className="btn btn-ghost btn-sm" href="/courses">See the Bonded journey</Link>}>
          When you join a chapter it shows up here with your access.
        </StateCard>
      ) : (
        <div className="grid-3">
          {courses.map((c) => (
            <OwnedCard key={c.course_id} course={c} now={now} />
          ))}
          {available.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
      {subscriptions.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h2 className="h3">Subscriptions</h2>
          </div>
          <div className="list">
            {subscriptions.map((s) => (
              <SubscriptionRow key={s.id} sub={s} />
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <h2 className="h3">Order history</h2>
          <span className="faint">Paddle emails a receipt for every payment</span>
        </div>
        {orders.length === 0 ? (
          <p className="faint">No orders yet.</p>
        ) : (
          <div className="list">
            {orders.map((o) => {
              const pill = orderStatusPill(o.status);
              return (
                <div className="list-row" key={o.id}>
                  <span className="ms" style={{ color: "var(--ink-3)" }} aria-hidden>
                    receipt_long
                  </span>
                  <div className="grow">
                    <div className="title">{o.offerTitle}</div>
                    <div className="faint">
                      Order {o.id.slice(0, 8).toUpperCase()} · <LocalTime iso={o.paid_at ?? o.created_at} format="fullDate" />
                    </div>
                  </div>
                  <span className="num">{formatMoney(o.amount_cents, o.currency)}</span>
                  <span className={`pill ${pill.tone}`}>{pill.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
