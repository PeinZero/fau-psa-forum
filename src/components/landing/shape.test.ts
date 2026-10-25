import { describe, expect, it } from "vitest";

import {
  avatarOverflow,
  countDone,
  fillPopular,
  howItWorksSteps,
  moderatorApplyHref,
  orderByIds,
  popularStatus,
  toHomeGuides,
  topicCountLabel,
  toTopics,
} from "./shape";

const thread = (id: number) => ({ id, title: `Thread ${id}` });

describe("fillPopular", () => {
  it("keeps a full hot list as it is", () => {
    const hot = [1, 2, 3, 4, 5].map(thread);
    expect(fillPopular(hot, [6, 7].map(thread)).map((t) => t.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("tops a short hot list up with the newest threads it does not already show", () => {
    const hot = [3, 1].map(thread);
    const newest = [9, 3, 8, 1, 7, 6].map(thread);
    expect(fillPopular(hot, newest).map((t) => t.id)).toEqual([3, 1, 9, 8, 7]);
  });

  it("falls back to the newest threads when nothing is hot", () => {
    expect(fillPopular([], [4, 5].map(thread)).map((t) => t.id)).toEqual([4, 5]);
  });

  it("returns nothing for an empty forum and honours a custom limit", () => {
    expect(fillPopular([], [])).toEqual([]);
    expect(fillPopular([1, 2].map(thread), [3, 4].map(thread), 3).map((t) => t.id)).toEqual([1, 2, 3]);
  });
});

describe("popularStatus", () => {
  it("says Answered once a best answer is picked, whatever the comment count", () => {
    expect(popularStatus({ best_comment_id: 12, comment_count: 4 })).toEqual({ answered: true, label: "Answered" });
  });

  it("falls back to the comment count", () => {
    expect(popularStatus({ best_comment_id: null, comment_count: 1 })).toEqual({ answered: false, label: "1 comment" });
    expect(popularStatus({ best_comment_id: null, comment_count: 7 })).toEqual({ answered: false, label: "7 comments" });
  });

  it("leaves an unanswered thread without comments blank instead of printing zero", () => {
    expect(popularStatus({ best_comment_id: null, comment_count: 0 })).toBeNull();
  });
});

describe("topicCountLabel", () => {
  it("counts threads with the right plural", () => {
    expect(topicCountLabel(1)).toBe("1 thread");
    expect(topicCountLabel(24)).toBe("24 threads");
  });

  it("hides the count of an empty category", () => {
    expect(topicCountLabel(0)).toBeNull();
  });
});

describe("moderatorApplyHref", () => {
  it("sends members straight to their account page", () => {
    expect(moderatorApplyHref(true)).toBe("/account");
  });

  it("sends visitors through sign-in and back to the account page", () => {
    expect(moderatorApplyHref(false)).toBe("/login?next=%2Faccount");
  });
});

describe("avatarOverflow", () => {
  it("counts the moderators beyond the shown faces", () => {
    expect(avatarOverflow(9, 6)).toBe(3);
  });

  it("is zero when every moderator is shown", () => {
    expect(avatarOverflow(4, 4)).toBe(0);
    expect(avatarOverflow(0, 0)).toBe(0);
  });
});

describe("howItWorksSteps", () => {
  it("walks from asking, through community answers, to moderator review", () => {
    expect(howItWorksSteps.map((step) => step.title)).toEqual([
      "Ask",
      "Community answers & votes",
      "Moderators review & verify",
    ]);
  });

  it("gives every step one line of explanation and an icon", () => {
    for (const step of howItWorksSteps) {
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.body).not.toContain("\n");
      expect(step.icon).toBeTruthy();
    }
  });
});

describe("toHomeGuides", () => {
  it("keeps the guides in order and lists each one's step ids", () => {
    const rows = [
      { id: 2, slug: "first-weeks-in-erlangen", title: "First weeks in Erlangen", summary: "Anmeldung first.", guide_steps: [{ id: 21 }, { id: 22 }] },
      { id: 1, slug: "finding-a-student-job", title: "Finding a student job", summary: null, guide_steps: [] },
    ];
    expect(toHomeGuides(rows)).toEqual([
      { id: 2, slug: "first-weeks-in-erlangen", title: "First weeks in Erlangen", summary: "Anmeldung first.", stepIds: [21, 22] },
      { id: 1, slug: "finding-a-student-job", title: "Finding a student job", summary: null, stepIds: [] },
    ]);
  });
});

describe("countDone", () => {
  it("counts only this guide's finished steps", () => {
    expect(countDone([21, 22, 23], new Set([22, 23, 99]))).toBe(2);
  });

  it("is zero with no progress or no steps", () => {
    expect(countDone([21, 22], new Set())).toBe(0);
    expect(countDone([], new Set([21]))).toBe(0);
  });
});

describe("toTopics", () => {
  it("turns the embedded published count into a thread count", () => {
    const rows = [
      { id: 1, slug: "rp-visa", name: "RP & Visa", description: "Residence permits", threads: [{ count: 12 }] },
      { id: 2, slug: "jobs", name: "Jobs", description: null, threads: [] },
    ];
    expect(toTopics(rows)).toEqual([
      { id: 1, slug: "rp-visa", name: "RP & Visa", description: "Residence permits", threadCount: 12 },
      { id: 2, slug: "jobs", name: "Jobs", description: null, threadCount: 0 },
    ]);
  });
});

describe("orderByIds", () => {
  it("restores the ranking of rows loaded by id", () => {
    expect(orderByIds([3, 1, 2], [1, 2, 3].map(thread)).map((t) => t.id)).toEqual([3, 1, 2]);
  });

  it("drops ids whose row is gone, such as a thread unpublished since the ranking", () => {
    expect(orderByIds([3, 4, 1], [1, 3].map(thread)).map((t) => t.id)).toEqual([3, 1]);
    expect(orderByIds([], [1].map(thread))).toEqual([]);
  });
});
