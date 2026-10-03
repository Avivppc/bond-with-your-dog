import { describe, expect, it } from "vitest";
import { EXAMPLE_VARS, fillTags, renderFlowEmail } from "./template";

describe("fillTags", () => {
  it("fills known tags, tolerating spaces, and blanks unknown ones", () => {
    expect(fillTags("Hi {{ first_name }}, {{dog_name}} is ready{{nope}}!", EXAMPLE_VARS)).toBe("Hi Dana, Luna is ready!");
  });
});

describe("renderFlowEmail", () => {
  it("adds the call to action as a button line with the checkout link", () => {
    const email = renderFlowEmail({ subject: "{{next_chapter}} is waiting", preheader: "", body: "Use {{discount_code}}.", ctaLabel: "Get {{next_chapter}}" }, EXAMPLE_VARS);
    expect(email.subject).toBe("Bonded: Moves is waiting");
    expect(email.text).toBe("Use BOND-7KQ4-M2XD.\n\nGet Bonded: Moves: https://www.bonded.dog/checkout/moves?code=BOND-7KQ4-M2XD");
  });

  it("leaves the button out when there's no label", () => {
    expect(renderFlowEmail({ subject: "S", preheader: "", body: "Body", ctaLabel: " " }, EXAMPLE_VARS).text).toBe("Body");
  });
});
