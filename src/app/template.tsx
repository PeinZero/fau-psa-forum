import { ViewTransition } from "react";

/**
 * Cross-fades the page when the visitor moves to another section. Enter and exit only fire when
 * this template remounts on navigation; votes, bookmarks and other in-place updates also run as
 * transitions and must leave the page still, hence `default="none"`.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
