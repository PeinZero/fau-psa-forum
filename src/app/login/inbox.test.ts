import { describe, expect, it } from "vitest";

import { inboxFor } from "./inbox";

describe("inboxFor", () => {
  it("links Gmail addresses, including googlemail", () => {
    expect(inboxFor("ali@gmail.com")?.name).toBe("Gmail");
    expect(inboxFor("ali@googlemail.com")?.name).toBe("Gmail");
  });

  it("covers the German providers students use", () => {
    expect(inboxFor("ali@gmx.de")?.name).toBe("GMX");
    expect(inboxFor("ali@web.de")?.name).toBe("WEB.DE");
  });

  it("ignores case and surrounding spaces", () => {
    expect(inboxFor("  Ali@Outlook.COM ")?.url).toBe("https://outlook.live.com/mail/");
  });

  it("returns null for unknown domains and malformed input", () => {
    expect(inboxFor("ali@fau.de")).toBeNull();
    expect(inboxFor("ali")).toBeNull();
    expect(inboxFor("")).toBeNull();
  });

  it("only offers https links", () => {
    for (const email of ["a@gmail.com", "a@outlook.com", "a@gmx.de", "a@web.de", "a@yahoo.com", "a@icloud.com", "a@proton.me"]) {
      expect(inboxFor(email)?.url).toMatch(/^https:\/\//);
    }
  });
});
