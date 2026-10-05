import { describe, expect, test } from "vitest";
import { DEFAULT_NOTIFICATION_SETTINGS as S } from "../notification-settings/topics";
import { lessonNotice, memberReminderEmail, overdueDigestEmail, overdueNotice, practiceNotice, sessionNotice } from "./copy";

const NOW = new Date("2026-10-01T06:00:00Z");
const SITE = "https://www.bonded.dog";
const DANA = { firstName: "Dana", sessionMinutes: 10 };

describe("notices (default wording)", () => {
  test("practice", () => {
    expect(practiceNotice(S, { date: "2026-10-01", when: "today" }, DANA)).toEqual({
      title: "Today is a practice day",
      body: "10 minutes with your dog is all it takes. Your plan is ready.",
      href: "/plan",
    });
    expect(practiceNotice(S, { date: "2026-10-02", when: "tomorrow" }, DANA).title).toBe("Tomorrow is a practice day");
  });

  test("the team's own wording, with the member's name", () => {
    const custom = { ...S, topics: { ...S.topics, practice: { ...S.topics.practice, title: "{{first_name}}, {{day}} we dance" } } };
    expect(practiceNotice(custom, { date: "2026-10-01", when: "today" }, DANA).title).toBe("Dana, Today we dance");
  });

  test("lesson links straight to the lesson", () => {
    const n = lessonNotice(S, { lessonId: "l1", lessonTitle: "The Spin", courseId: "lets dance", courseTitle: "Let's Dance" }, "Dana");
    expect(n).toEqual({ title: "A new lesson is open: The Spin", body: "Let's Dance", href: "/learn/lets%20dance/l1" });
  });

  test("live sessions say when, in the member's zone", () => {
    const qa = { id: "m1", kind: "live_qa" as const, title: "October Q&A", startsAt: new Date("2026-10-01T17:00:00Z") };
    expect(sessionNotice(S, qa, "day_of", NOW, "Asia/Jerusalem", "Dana")).toEqual({
      title: "Live Q&A with Roni today at 8:00 PM GMT+3",
      body: "October Q&A. Bring your questions!",
      href: "/community/meetups/m1",
    });
    const meetup = { ...qa, kind: "meetup" as const, title: "Park walk" };
    expect(sessionNotice(S, meetup, "day_before", NOW, "UTC", null)).toMatchObject({ title: "Park walk today at 5:00 PM UTC", body: "You said you're coming." });
  });

  test("overdue feedback points staff at the video in the Studio", () => {
    expect(overdueNotice(S, "v1", 6)).toEqual({ title: "A feedback video has waited 6 days", body: "Open Roni's Studio to reply.", href: "/studio?id=v1" });
  });
});

describe("emails", () => {
  test("member reminder email greets by first name and links into the app", () => {
    const email = memberReminderEmail("Dana", practiceNotice(S, { date: "2026-10-01", when: "today" }, DANA), SITE);
    expect(email.subject).toBe("Today is a practice day");
    expect(email.text).toContain("Hi Dana,");
    expect(email.text).toContain(`${SITE}/plan`);
    expect(memberReminderEmail(null, overdueNotice(S, "v", 1), SITE).text).toContain("Hi there,");
  });

  test("the team digest lists only links and ages", () => {
    expect(overdueDigestEmail([{ id: "v1", days: 6 }], SITE, 5).subject).toBe("A feedback video is waiting for a reply");
    const two = overdueDigestEmail([{ id: "v1", days: 6 }, { id: "v2", days: 9 }], SITE, 5);
    expect(two.subject).toBe("2 feedback videos are waiting for a reply");
    expect(two.text).toContain("more than 5 days");
    expect(two.text).toContain(`• 9 days: ${SITE}/studio?id=v2`);
  });
});
