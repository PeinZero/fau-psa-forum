import type { CommentDetail, CommentSort } from "@/components/thread/thread-data";

export type CommentGroup = { id: number; comment: CommentDetail | null; replies: CommentDetail[] };

/**
 * Top-level comments with their replies, in the order the comments arrive (chronological).
 * A parent is always older than its replies; replies of a parent the viewer cannot see (hidden by
 * a moderator) stay visible as a group of their own.
 */
export function groupComments(comments: CommentDetail[]): CommentGroup[] {
  const groups = new Map<number, CommentGroup>();
  for (const comment of comments) {
    const id = comment.parent_id ?? comment.id;
    const group = groups.get(id) ?? { id, comment: null, replies: [] };
    groups.set(id, group);
    if (comment.parent_id === null) group.comment = comment;
    else group.replies.push(comment);
  }
  return [...groups.values()];
}

/**
 * Top: highest score first, older first on ties. Newest: latest first. Replies stay chronological
 * under their parent; a group whose parent is hidden sorts by its first reply with no score.
 */
export function sortGroups(groups: CommentGroup[], sort: CommentSort): CommentGroup[] {
  const time = (g: CommentGroup) => Date.parse((g.comment ?? g.replies[0]).created_at);
  const score = (g: CommentGroup) => g.comment?.score ?? 0;
  return [...groups].sort((a, b) =>
    sort === "new" ? time(b) - time(a) : score(b) - score(a) || time(a) - time(b),
  );
}
