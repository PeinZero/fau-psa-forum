"use client";

import type { VoteValue } from "./actions";
import { castThreadVote } from "./thread-actions";
import { VoteControl } from "./vote-control";

type Props = {
  threadId: number;
  score: number;
  myVote: VoteValue;
  signedIn: boolean;
  /** Own threads and archived threads show the score without voting. */
  disabled?: boolean;
  disabledTitle?: string;
};

/** ▲ score ▼ beside the thread title: a column from sm up, a row on phones. */
export function ThreadVoteControl({ threadId, ...props }: Props) {
  return (
    <VoteControl
      {...props}
      orientation="responsive"
      onVote={(value) => castThreadVote({ threadId, value })}
    />
  );
}
