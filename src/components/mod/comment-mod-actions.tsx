import { ActionButton } from "./action-button";
import { moderateComment } from "./actions";

type CommentModActionsProps = {
  threadId: number;
  commentId: number;
  isBest: boolean;
  isHidden: boolean;
};

export function CommentModActions({ threadId, commentId, isBest, isHidden }: CommentModActionsProps) {
  const base = { threadId, commentId };

  return (
    <div className="flex flex-wrap items-start gap-1">
      {!isHidden && (
        <ActionButton
          action={moderateComment}
          fields={{ ...base, op: isBest ? "unbest" : "best" }}
          label={isBest ? "Unmark best answer" : "Mark best answer"}
          variant="ghost"
        />
      )}
      <ActionButton
        action={moderateComment}
        fields={{ ...base, op: isHidden ? "unhide" : "hide" }}
        label={isHidden ? "Unhide" : "Hide"}
        variant={isHidden ? "ghost" : "danger"}
        confirm={isHidden ? undefined : "Hide this comment from the public?"}
      />
    </div>
  );
}
