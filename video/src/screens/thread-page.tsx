import { BellRing, Bookmark, BookmarkCheck, Check, ChevronRight, Clock, MapPin, MessageSquare, MoreHorizontal, Share2 } from "lucide-react";
import { type ReactNode, useRef } from "react";

import { clamp01 } from "../lib/motion";
import { AuthorName, Avatar } from "../ui/avatar";
import { StatusPill } from "../ui/badge";
import { buttonClasses } from "../ui/button";
import { cn } from "../ui/cn";
import { VoteControl } from "../ui/vote-control";
import { anmeldungThread, cityLabels, type DemoComment, type DemoThread, type DemoUser, users } from "./demo-data";
import { AnnouncementBar } from "./announcement-bar";
import { SITE_HEADER_HEIGHT, SiteHeader, type SiteHeaderProps, siteHeaderHeight } from "./site-header";
import { CommentsSection } from "./thread/comments";
import { Markdown } from "./thread/markdown";
import { resolveScroll, stickyShift, usePageLayout } from "./thread/page-layout";
import { FeedLayout, ThreadSidebar } from "./thread/sidebar";

/** Who looks at the page: decides the vote state, the menu buttons, the pending note and the comment box. */
export type ThreadViewer = "visitor" | "member" | "author" | "moderator";

/** Elements a scene can scroll to (`scrollAnchor`); each carries the matching `data-anchor`. */
export type ThreadAnchor = "title" | "status-pills" | "action-bar" | "body" | "comments" | "best-answer";

export type ThreadPageProps = {
  /** Demo thread to show (defaults to the Anmeldung thread). */
  thread?: DemoThread;
  /** Score in the vote pill (defaults to `thread.score`). */
  score?: number;
  /** Replaces the score digits, e.g. with rolling digits during the vote. */
  scoreNode?: ReactNode;
  /** The viewer's upvote: filled emerald arrow, emerald score, tinted pill. */
  voted?: boolean;
  /** Upvote arrow under the film's cursor. */
  voteHover?: boolean;
  /** `pending` shows "Waiting for review" and the author's note instead of the vote and comment pills. */
  status?: "pending" | "published";
  /** Shows the "Verified Oct 2026" pill (defaults to whether the thread has a verified month). */
  verified?: boolean;
  /** Best answer pinned above the comments (also adds the Answered pill); null hides both. */
  bestAnswerId?: number | null;
  /** Comments to list (defaults to `thread.comments`). */
  comments?: DemoComment[];
  viewer?: ThreadViewer;
  /** Signed-in viewers see a bookmark button; true shows it filled emerald. */
  bookmarked?: boolean;
  /** "Following" beside the bookmark (authors follow their own threads). */
  following?: boolean;
  /** Share button in its "Copied" state. */
  copied?: boolean;
  /** Right column with the category card, more in the category and the guides. */
  showSidebar?: boolean;
  /** Guide progress in the sidebar, e.g. [3, null] → "3 of 8 steps done" for the first guide. */
  guidesDone?: (number | null)[];
  /**
   * Renders the site header above the page (sticky, like the site; with `announcement` the bar sits
   * above it and scrolls away). Signed-in state and initials follow `viewer` unless given here.
   */
  header?: Omit<SiteHeaderProps, "device" | "backgroundOpacity"> | false;
  /** Page scroll in site px. */
  scrollY?: number;
  /** Scroll target: with `scrollAnchorMix` 0 → 1 the page eases from `scrollY` to that element. */
  scrollAnchor?: ThreadAnchor;
  scrollAnchorMix?: number;
  /** Space kept above the anchor when scrolled to it (below the sticky header), site px. */
  scrollAnchorMargin?: number;
  /** Renders only the first N blocks of the post. */
  bodyLimit?: number;
  /** `phone` renders the page as below 400px wide (no sidebar, touch sizes, compact header). */
  device?: "desktop" | "phone";
  /** Window width in site px; below 1280 the sidebar gap is the narrower lg gap. */
  viewportWidth?: number;
};

/**
 * Centre of a control near the top of a desktop thread page, in site px from the page's top-left
 * at scroll 0 (subtract `scrollY` when scrolled). `width` is the window width in site px; the Anmeldung
 * title wraps to 2 lines, the scene 5 question to 1; `pills` is whether a status pill row shows.
 */
export function threadPageAnchor(
  target: "title" | "vote-up" | "vote-score" | "comments-pill" | "share" | "bookmark" | "menu" | "body",
  {
    width,
    header = true,
    announcement = false,
    titleLines = 2,
    pills = true,
    signedIn = true,
    sidebar = true,
  }: {
    width: number;
    header?: boolean;
    announcement?: boolean;
    titleLines?: number;
    pills?: boolean;
    signedIn?: boolean;
    sidebar?: boolean;
  },
): { x: number; y: number } {
  const inner = Math.min(width, 1152) - 48;
  const left = (width - Math.min(width, 1152)) / 2 + 24;
  const column = sidebar ? inner - 304 - (width >= 1280 ? 56 : 40) : inner;
  const right = left + Math.min(720, column);
  const titleTop = (header ? siteHeaderHeight({ announcement }) : 0) + 40 + 20 + 16;
  const bylineBottom = titleTop + 38 * titleLines + 16 + 40;
  const actionY = bylineBottom + (pills ? 36 : 0) + 20 + 18;
  const menuX = right - 10;
  const shareX = menuX - 18 - (signedIn ? 40 : 0) - 4 - 43;
  const points = {
    title: { x: left, y: titleTop + 19 },
    "vote-up": { x: left + 18, y: actionY },
    "vote-score": { x: left + 45, y: actionY },
    "comments-pill": { x: left + 92 + 8 + 52, y: actionY },
    share: { x: shareX, y: actionY },
    bookmark: { x: menuX - 40, y: actionY },
    menu: { x: menuX, y: actionY },
    body: { x: left, y: actionY + 18 + 24 },
  };
  return points[target];
}

const viewerUser: Record<ThreadViewer, DemoUser | null> = {
  visitor: null,
  member: users.newStudent,
  author: null,
  moderator: users.psaTeam,
};

/**
 * The thread page as on the live site (src/app/t/[slug]/page.tsx): breadcrumb, display title, byline,
 * status pills, action bar, hairline, the post in reading type, and the comments with the best
 * answer pinned on top; the thread sidebar sits beside it. Fills its positioned parent and scrolls
 * like the page does (sticky header, sticky sidebar group).
 */
export function ThreadPage({
  thread = anmeldungThread,
  score,
  scoreNode,
  voted = false,
  voteHover = false,
  status = "published",
  verified,
  bestAnswerId,
  comments,
  viewer = "member",
  bookmarked = false,
  following,
  copied = false,
  showSidebar = true,
  guidesDone,
  header = false,
  scrollY = 0,
  scrollAnchor,
  scrollAnchorMix = 0,
  scrollAnchorMargin = 24,
  bodyLimit,
  device = "desktop",
  viewportWidth = 1280,
}: ThreadPageProps) {
  const phone = device === "phone";
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const layout = usePageLayout(rootRef, contentRef);
  const signedIn = viewer !== "visitor";
  const user = viewer === "author" ? thread.author : viewerUser[viewer];
  const best = bestAnswerId === undefined ? thread.bestCommentId : bestAnswerId;
  const list = comments ?? thread.comments;
  const isPublic = status === "published";
  const isVerified = verified ?? thread.verifiedMonth !== null;

  const { announcement, ...headerProps } = header || {};
  const barHeight = header && announcement ? siteHeaderHeight({ announcement: true, device }) - SITE_HEADER_HEIGHT : 0;
  const s = resolveScroll({
    layout,
    scrollY,
    anchor: scrollAnchor,
    mix: scrollAnchorMix,
    topInset: (header ? SITE_HEADER_HEIGHT : 0) + scrollAnchorMargin,
  });
  // The bar scrolls away; the header then sticks to the top with what scrolls beneath it showing faintly.
  const headerTop = Math.max(0, barHeight - s);
  const under = clamp01((s - barHeight) / 48);

  return (
    <div ref={rootRef} className={cn("absolute inset-0 overflow-hidden bg-background", phone && "phone-type")}>
      <div ref={contentRef} className="relative" style={{ transform: `translateY(${-s}px)` }}>
        {header && announcement ? <AnnouncementBar {...announcement} device={device} /> : null}
        {header && <div style={{ height: SITE_HEADER_HEIGHT }} />}
        <main className={cn("mx-auto w-full max-w-6xl", phone ? "px-4 py-6" : "px-6 py-10")}>
          <FeedLayout
            wide={viewportWidth >= 1280}
            sidebar={
              showSidebar && !phone ? (
                <ThreadSidebar thread={thread} guidesDone={guidesDone} stickyShift={stickyShift(layout, s)} />
              ) : undefined
            }
          >
            <article className="flex max-w-[45rem] flex-col">
              <Breadcrumbs thread={thread} touch={phone} />

              <header className="mt-4">
                <h1 data-anchor="title" className="text-display font-semibold tracking-[-0.02em] break-words text-foreground">
                  {thread.title}
                </h1>
                <Byline thread={thread} />
                <div data-anchor="status-pills" className="mt-4 flex flex-wrap items-center gap-1.5 empty:hidden">
                  {thread.pinned && <StatusPill kind="pinned" />}
                  {status === "pending" && <StatusPill kind="pending" />}
                  {best !== null && <StatusPill kind="answered" />}
                  {thread.outdated && <StatusPill kind="outdated" />}
                  {isVerified && <StatusPill kind="verified" verifiedMonth={thread.verifiedMonth ?? "Oct 2026"} />}
                </div>
                <div data-anchor="action-bar" className={cn("mt-5 flex min-w-0 items-center", phone ? "gap-1.5" : "gap-2")}>
                  {isPublic && (
                    <>
                      <span data-anchor="vote-pill">
                        <VoteControl
                          appearance="pill"
                          score={score ?? thread.score}
                          scoreNode={scoreNode}
                          myVote={voted ? 1 : 0}
                          disabled={viewer === "author"}
                          hover={voteHover ? "up" : null}
                          touch={phone}
                        />
                      </span>
                      <CommentsPill count={list.length} touch={phone} />
                    </>
                  )}
                  <div className={cn("ml-auto flex shrink-0 items-center", phone ? "gap-0.5" : "gap-1")}>
                    {isPublic && <ShareButton copied={copied} touch={phone} />}
                    <div className="-my-1.5 -mr-2 flex items-center gap-1">
                      {signedIn && (following ?? viewer === "author") && (
                        <span className="inline-flex items-center gap-1 px-1 text-meta whitespace-nowrap text-muted">
                          <BellRing aria-hidden strokeWidth={1.75} className="size-3.5" />
                          Following
                        </span>
                      )}
                      {signedIn && (
                        <span
                          className={buttonClasses({
                            variant: "ghost",
                            size: "icon",
                            touch: phone,
                            className: bookmarked ? "text-accent" : undefined,
                          })}
                        >
                          {bookmarked ? <BookmarkCheck strokeWidth={1.75} /> : <Bookmark strokeWidth={1.75} />}
                        </span>
                      )}
                      <span className={buttonClasses({ variant: "ghost", size: "icon", touch: phone })}>
                        <MoreHorizontal aria-hidden strokeWidth={1.75} />
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              {status === "pending" && (
                <div className="mt-6 flex flex-col gap-3">
                  <PendingCallout isAuthor={viewer === "author"} />
                </div>
              )}

              <div data-anchor="body" className={cn("mt-6 border-t border-border", phone ? "pt-6" : "pt-8")}>
                <Markdown blocks={thread.body} size="reading" limit={bodyLimit} />
              </div>

              <div className={phone ? "mt-12" : "mt-14"}>
                <CommentsSection
                  comments={isPublic ? list : []}
                  bestAnswerId={isPublic ? best : null}
                  canComment={isPublic}
                  viewer={{ signedIn, user }}
                  device={device}
                />
              </div>
            </article>
          </FeedLayout>
        </main>
      </div>
      {header && (
        <div className="absolute inset-x-0 z-40" style={{ top: headerTop }}>
          <SiteHeader
            signedIn={signedIn}
            userName={user?.displayName}
            {...headerProps}
            device={device}
            backgroundOpacity={0.7 + 0.25 * under}
          />
        </div>
      )}
    </div>
  );
}

function Breadcrumbs({ thread, touch }: { thread: DemoThread; touch: boolean }) {
  const crumb = cn("inline-flex items-center rounded-sm", touch && "min-h-11");
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
        <li className="shrink-0">
          <span className={crumb}>Home</span>
        </li>
        <ChevronRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-subtle" />
        <li className="shrink-0">
          <span className={crumb}>{thread.category.name}</span>
        </li>
        <ChevronRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-subtle" />
        <li className="min-w-0 truncate text-subtle">{thread.title}</li>
      </ol>
    </nav>
  );
}

const metaItem =
  "relative inline-flex items-center pl-4 whitespace-nowrap before:absolute before:left-1.5 before:text-subtle before:content-['·']";

/** Author with role and affiliation badges on the first line; date and city below. */
function Byline({ thread }: { thread: DemoThread }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <Avatar name={thread.author.displayName} className="size-9 text-xs" />
      <div className="min-w-0 text-meta text-muted">
        <AuthorName name={thread.author.displayName} role={thread.author.role} affiliation={thread.author.affiliation} />
        <div className="min-w-0 overflow-hidden">
          <p className="-ml-4 flex flex-wrap items-center gap-y-1">
            <span className={metaItem}>
              <time>{thread.date}</time>
            </span>
            {thread.city && (
              <span className={cn(metaItem, "gap-1")}>
                <MapPin aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
                {cityLabels[thread.city]}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function CommentsPill({ count, touch }: { count: number; touch: boolean }) {
  return (
    <span
      data-anchor="comments-pill"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 text-meta font-medium text-muted tabular-nums",
        touch ? "h-11" : "h-9",
      )}
    >
      <MessageSquare aria-hidden strokeWidth={1.75} className="size-4" />
      {/* Phones under 400px keep only the icon and count. */}
      {count > 0 ? (
        <>
          {count}
          {!touch && <span>{count === 1 ? "comment" : "comments"}</span>}
        </>
      ) : (
        !touch && <span>Comment</span>
      )}
    </span>
  );
}

function ShareButton({ copied, touch }: { copied: boolean; touch: boolean }) {
  return (
    <span data-anchor="share" className={buttonClasses({ variant: "ghost", size: "sm", touch, className: cn(copied && "text-foreground") })}>
      {copied ? <Check aria-hidden strokeWidth={1.75} className="text-accent" /> : <Share2 aria-hidden strokeWidth={1.75} />}
      <span className="grid text-left">
        <span className={cn("col-start-1 row-start-1", copied && "opacity-0")}>Share</span>
        <span className={cn("col-start-1 row-start-1", !copied && "opacity-0")}>Copied</span>
      </span>
    </span>
  );
}

function PendingCallout({ isAuthor }: { isAuthor: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-warning/25 bg-warning/[0.06] px-4 py-3 text-meta [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-warning">
      <Clock strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="font-medium text-foreground">Waiting for review</p>
        <div className="mt-0.5 text-muted">
          {isAuthor ? (
            <>
              Waiting for review — usually within a day. You&apos;ll get a bell notification when it&apos;s approved.{" "}
              <span className="font-medium text-accent">See your threads</span>
            </>
          ) : (
            "Only the author and the moderators can see this thread until it is approved."
          )}
        </div>
      </div>
    </div>
  );
}
