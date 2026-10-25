import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { introVideo } from "./site";

const inPublic = (path: string) => existsSync(join(process.cwd(), "public", path));

describe("site config", () => {
  it("points the intro video at files that ship in /public", () => {
    expect(introVideo).not.toBeNull();
    if (!introVideo || introVideo.source.kind !== "file") throw new Error("expected a self-hosted video");

    const files = [introVideo.poster, introVideo.captions, introVideo.source.mp4, introVideo.source.webm];
    for (const file of files) {
      expect(file, "every file is set").toBeDefined();
      expect(inPublic(file!), `${file} exists`).toBe(true);
    }
  });

  it("labels the video with a m:ss duration", () => {
    expect(introVideo?.durationLabel).toMatch(/^\d+:\d{2}$/);
  });
});
