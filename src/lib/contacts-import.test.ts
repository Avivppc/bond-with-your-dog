import { describe, expect, test } from "vitest";
import { parseCsv } from "./csv";
import { buildImport, guessMapping, readConsent, splitTags, type ColumnMapping } from "./contacts-import";

describe("parseCsv", () => {
  test("reads quoted fields, escaped quotes, line breaks inside quotes and CRLF", () => {
    const text = '﻿Name,Email,Note\r\n"Doe, Jane",jane@x.dev,"said ""hi""\nthen left"\r\nBob,bob@x.dev,\r\n';
    expect(parseCsv(text)).toEqual([
      ["Name", "Email", "Note"],
      ["Doe, Jane", "jane@x.dev", 'said "hi"\nthen left'],
      ["Bob", "bob@x.dev", ""],
    ]);
  });

  test("uses semicolons when the header does (European Excel)", () => {
    expect(parseCsv("Email;Name\na@x.dev;A")).toEqual([
      ["Email", "Name"],
      ["a@x.dev", "A"],
    ]);
  });

  test("drops blank lines and keeps a last line without a newline", () => {
    expect(parseCsv("a,b\n\n,\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("guessMapping", () => {
  test("recognises a Kajabi people export", () => {
    const headers = ["ID", "Name", "Email", "Created At", "Products", "Tags", "Subscribed"];
    expect(guessMapping(headers)).toEqual({ email: 2, name: 1, firstName: null, lastName: null, tags: 5, subscribed: 6 });
  });

  test("handles first/last name columns and an opt-in column", () => {
    const headers = ["First Name", "Last_Name", "E-mail Address", "Accepts Marketing"];
    expect(guessMapping(headers)).toEqual({ email: 2, name: null, firstName: 0, lastName: 1, tags: null, subscribed: 3 });
  });

  test("never maps the same column twice", () => {
    const m = guessMapping(["Email", "Email marketing"]);
    expect(m.email).toBe(0);
    expect(m.subscribed).toBe(1);
  });
});

describe("readConsent", () => {
  test("reads yes/no words and leaves anything else unknown", () => {
    expect(readConsent("TRUE", "Subscribed")).toBe(true);
    expect(readConsent("yes", "Newsletter")).toBe(true);
    expect(readConsent("Unsubscribed", "Status")).toBe(false);
    expect(readConsent("", "Subscribed")).toBeNull();
    expect(readConsent("maybe", "Subscribed")).toBeNull();
  });

  test("flips for an Unsubscribed or opt-out column", () => {
    expect(readConsent("true", "Unsubscribed")).toBe(false);
    expect(readConsent("false", "Opted out")).toBe(true);
  });
});

test("splitTags normalises, de-duplicates and drops what can't be a tag", () => {
  expect(splitTags("Dog Dance, vip;VIP | !!!")).toEqual(["dog dance", "vip"]);
});

describe("buildImport", () => {
  const headers = ["Name", "Email", "Tags", "Subscribed"];
  const mapping: ColumnMapping = { email: 1, name: 0, firstName: null, lastName: null, tags: 2, subscribed: 3 };

  test("builds rows, adds the import tag, and reports bad and repeated emails by line", () => {
    const data = [
      ["Jane", " Jane@X.dev ", "puppy", "true"],
      ["No Email", "", "", ""],
      ["Again", "jane@x.dev", "", "false"],
      ["Bob", "bob@x.dev", "", ""],
    ];
    const built = buildImport(headers, data, mapping, ["Kajabi Import"]);
    expect(built.rows).toEqual([
      { email: "jane@x.dev", name: "Jane", subscribed: true, tags: ["puppy", "kajabi import"] },
      { email: "bob@x.dev", name: "Bob", subscribed: null, tags: ["kajabi import"] },
    ]);
    expect(built.invalidLines).toEqual([3]);
    expect(built.duplicates).toBe(1);
  });

  test("joins first and last name when there's no full name column", () => {
    const built = buildImport(["First", "Last", "Email"], [["Ana", "Li", "ana@x.dev"]], { email: 2, name: null, firstName: 0, lastName: 1, tags: null, subscribed: null }, []);
    expect(built.rows[0]).toMatchObject({ name: "Ana Li", subscribed: null, tags: [] });
  });

  test("is fast enough for a big export", () => {
    const data = Array.from({ length: 20_000 }, (_, i) => [`P${i}`, `p${i}@x.dev`, "a,b", "yes"]);
    const started = Date.now();
    expect(buildImport(headers, data, mapping, []).rows).toHaveLength(20_000);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
