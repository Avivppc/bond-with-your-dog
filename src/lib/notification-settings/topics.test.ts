import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { DEFAULT_NOTIFICATION_SETTINGS, fillTemplate, noticeText, notificationSettingsSchema, readNotificationSettings, TOPIC_DEFS, TOPICS, unknownTags } from "./topics";

describe("fillTemplate", () => {
  test("fills tags, drops ones without a value and tidies the spacing", () => {
    expect(fillTemplate("Hi {{first_name}}, {{dog_name}} did great", { first_name: "Dana" })).toBe("Hi Dana, did great");
    expect(fillTemplate("{{day}} is a practice day", { day: "Today" })).toBe("Today is a practice day");
    expect(fillTemplate("Odd {{ spaced }} and {{unknown}} tags", {})).toBe("Odd and tags");
  });
});

describe("unknownTags", () => {
  test("names tags the topic doesn't offer", () => {
    expect(unknownTags("Hi {{first_name}} about {{video_title}}", "feedback_reply")).toEqual([]);
    expect(unknownTags("{{lesson_title}} for {{dog_name}}", "feedback_reply")).toEqual(["lesson_title", "dog_name"]);
  });
});

describe("notificationSettingsSchema", () => {
  test("the defaults are valid", () => {
    expect(notificationSettingsSchema.safeParse(DEFAULT_NOTIFICATION_SETTINGS).success).toBe(true);
  });

  test("refuses an empty title, a foreign tag and an impossible hour", () => {
    const withTopic = (patch: object) => ({ ...DEFAULT_NOTIFICATION_SETTINGS, topics: { ...DEFAULT_NOTIFICATION_SETTINGS.topics, practice: { ...DEFAULT_NOTIFICATION_SETTINGS.topics.practice, ...patch } } });
    expect(notificationSettingsSchema.safeParse(withTopic({ title: " " })).success).toBe(false);
    expect(notificationSettingsSchema.safeParse(withTopic({ body: "Watch {{video_title}}" })).success).toBe(false);
    expect(notificationSettingsSchema.safeParse({ ...DEFAULT_NOTIFICATION_SETTINGS, practice: { when: "day_of", hour: 24 } }).success).toBe(false);
  });
});

describe("readNotificationSettings", () => {
  test("keeps saved fields and fills the rest from the defaults", () => {
    const read = readNotificationSettings({ topics: { practice: { title: "Time to dance, {{first_name}}!" } }, practice: { hour: 7 } });
    expect(read.topics.practice.title).toBe("Time to dance, {{first_name}}!");
    expect(read.topics.practice.enabled).toBe(true);
    expect(read.practice).toEqual({ when: "day_of", hour: 7 });
    expect(read.topics.feedback_reply).toEqual(DEFAULT_NOTIFICATION_SETTINGS.topics.feedback_reply);
  });

  test("anything broken falls back to the defaults", () => {
    expect(readNotificationSettings(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(readNotificationSettings({ practice: { hour: 99 } })).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });
});

describe("noticeText", () => {
  test("an all-tags title that comes out empty falls back to the label", () => {
    const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, topics: { ...DEFAULT_NOTIFICATION_SETTINGS.topics, practice: { ...DEFAULT_NOTIFICATION_SETTINGS.topics.practice, title: "{{day}}" } } };
    expect(noticeText(settings, "practice", {}).title).toBe("Practice reminder");
  });
});

describe("definitions", () => {
  test("every topic has a definition and default settings", () => {
    expect(TOPIC_DEFS.map((d) => d.topic)).toEqual([...TOPICS]);
    for (const topic of TOPICS) expect(unknownTags(`${DEFAULT_NOTIFICATION_SETTINGS.topics[topic].title} ${DEFAULT_NOTIFICATION_SETTINGS.topics[topic].body}`, topic)).toEqual([]);
  });

  test("the database seeds the same defaults", () => {
    const sql = readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20261111000000_notification_settings.sql"), "utf8");
    const seed = sql.match(/-- seed:start\s*'([\s\S]*?)'::jsonb\s*-- seed:end/);
    expect(seed).not.toBeNull();
    expect(JSON.parse((seed as RegExpMatchArray)[1].replace(/''/g, "'"))).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });
});
