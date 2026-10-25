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

/** ▲ score ▼ as a pill in the action bar under the thread title. */
export function ThreadVoteControl({ threadId, ...props }: Props) {
  return (
    <VoteControl
      {...props}
      appearance="pill"
      onVote={(value) => castThreadVote({ threadId, value })}
    />
  );
}
