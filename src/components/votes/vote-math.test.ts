import { describe, expect, it } from "vitest";

import type { VoteValue } from "./actions";
import { nextVote, scoreAfter } from "./vote-math";

describe("nextVote", () => {
  it.each<[VoteValue, 1 | -1, VoteValue]>([
    [0, 1, 1],
    [1, 1, 0],
    [1, -1, -1],
    [-1, -1, 0],
    [-1, 1, 1],
    [0, -1, -1],
  ])("from %i, clicking %i gives %i", (current, clicked, expected) => {
    expect(nextVote(current, clicked)).toBe(expected);
  });
});

describe("scoreAfter", () => {
  it.each<[number, VoteValue, VoteValue, number]>([
    [3, 0, 1, 4],
    [4, 1, 0, 3],
    [4, 1, -1, 2],
    [2, -1, 0, 3],
    [2, -1, 1, 4],
    [3, 0, -1, 2],
    [0, 0, -1, -1],
    [-1, -1, 1, 1],
    [5, 1, 1, 5],
    [5, 0, 0, 5],
  ])("score %i moving %i → %i is %i", (score, from, to, expected) => {
    expect(scoreAfter(score, from, to)).toBe(expected);
  });

  it("returns to the starting score after any round trip", () => {
    const votes: VoteValue[] = [-1, 0, 1];
    for (const from of votes) {
      for (const to of votes) {
        expect(scoreAfter(scoreAfter(7, from, to), to, from)).toBe(7);
      }
    }
  });

  it("follows a click sequence the way the control applies it", () => {
    let vote: VoteValue = 0;
    let score = 10;
    for (const [clicked, expectedVote, expectedScore] of [
      [1, 1, 11],
      [1, 0, 10],
      [-1, -1, 9],
      [1, 1, 11],
      [-1, -1, 9],
      [-1, 0, 10],
    ] as const) {
      const next = nextVote(vote, clicked);
      score = scoreAfter(score, vote, next);
      vote = next;
      expect([vote, score]).toEqual([expectedVote, expectedScore]);
    }
  });
});
