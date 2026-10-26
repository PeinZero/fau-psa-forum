import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as string[]);

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  connection: async () => {
    calls.push("connection");
  },
}));

import { requestNow } from "./request-time";

describe("requestNow", () => {
  it("reads the clock only after connection(), so prerendering never sees Date.now()", async () => {
    const spy = vi.spyOn(Date, "now").mockImplementation(() => {
      calls.push("clock");
      return 1_790_000_000_000;
    });
    await expect(requestNow()).resolves.toBe(1_790_000_000_000);
    expect(calls).toEqual(["connection", "clock"]);
    spy.mockRestore();
  });
});
