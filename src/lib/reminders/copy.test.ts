import { describe, expect, test } from "vitest";
import { lessonNotice, memberReminderEmail, overdueDigestEmail, overdueNotice, practiceNotice, sessionNotice } from "./copy";

const NOW = new Date("2026-10-01T06:00:00Z");
const SITE = "https://www.bonded.dog";

describe("notices", () => {
  test("practice", () => {
    expect(practiceNotice({ date: "2026-10-01", when: "today" }, 10)).toEqual({
      title: "Today is a practice day",
      body: "10 minutes with your dog is all it takes. Your plan is ready.",
      href: "/plan",
    });
    expect(practiceNotice({ date: "2026-10-02", when: "tomorrow" }, 5).title).toBe("Tomorrow is a practice day");
  });

  test("lesson links straight to the lesson", () => {
    const n = lessonNotice({ lessonId: "l1", lessonTitle: "The Spin", courseId: "lets dance", courseTitle: "Let's Dance" });
    expect(n).toEqual({ title: "A new lesson is open: The Spin", body: "Let's Dance", href: "/learn/lets%20dance/l1" });
  });

  test("live sessions say when, in the member's zone", () => {
    const qa = { id: "m1", kind: "live_qa" as const, title: "October Q&A", startsAt: new Date("2026-10-01T17:00:00Z") };
    expect(sessionNotice(qa, "day_of", NOW, "Asia/Jerusalem")).toEqual({
      title: "Live Q&A with Roni today at 8:00 PM GMT+3",
      body: "October Q&A. Bring your questions!",
      href: "/community/meetups/m1",
    });
    expect(sessionNotice(qa, "day_before", NOW, "America/Los_Angeles").title).toBe("Live Q&A with Roni tomorrow at 10:00 AM PDT");
    const meetup = { ...qa, kind: "meetup" as const, title: "Park walk" };
    expect(sessionNotice(meetup, "day_before", NOW, "UTC")).toMatchObject({ title: "Park walk today at 5:00 PM UTC", body: "You said you're coming." });
  });

  test("overdue feedback points staff at the video in the Studio", () => {
    expect(overdueNotice("v1", 6)).toEqual({ title: "A feedback video has waited 6 days", body: "Open Roni's Studio to reply.", href: "/studio?id=v1" });
  });
});

describe("emails", () => {
  test("member reminder email greets by first name and links into the app", () => {
    const email = memberReminderEmail("Dana", practiceNotice({ date: "2026-10-01", when: "today" }, 10), SITE);
    expect(email.subject).toBe("Today is a practice day");
    expect(email.text).toContain("Hi Dana,");
    expect(email.text).toContain(`${SITE}/plan`);
    expect(email.text).toContain("turn reminder emails off in Settings");
    expect(memberReminderEmail(null, overdueNotice("v", 1), SITE).text).toContain("Hi there,");
  });

  test("the team digest lists only links and ages", () => {
    const one = overdueDigestEmail([{ id: "v1", days: 6 }], SITE);
    expect(one.subject).toBe("A feedback video is waiting for a reply");
    const two = overdueDigestEmail([{ id: "v1", days: 6 }, { id: "v2", days: 9 }], SITE);
    expect(two.subject).toBe("2 feedback videos are waiting for a reply");
    expect(two.text).toContain(`• 9 days: ${SITE}/studio?id=v2`);
  });
});
