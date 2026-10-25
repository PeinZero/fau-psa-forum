import type { VoteValue } from "./actions";

/** Clicking the arrow you already chose withdraws the vote; clicking the other one switches to it. */
export function nextVote(current: VoteValue, clicked: 1 | -1): VoteValue {
  return current === clicked ? 0 : clicked;
}

/** The score once the viewer's own vote moves from `from` to `to`; everyone else's votes stay put. */
export function scoreAfter(score: number, from: VoteValue, to: VoteValue): number {
  return score - from + to;
}
