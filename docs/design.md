# Design system

Read before any UI work. Direction agreed with the owner: spacious and readable like Reddit, with
the restraint of linear.app. Emerald is the single accent, light/dark follows the system with a
toggle, motion is smooth and subtle.

## Principles

- Hierarchy through size, weight and color, not borders: `foreground` for titles, `muted` for
  meta, `subtle` for tertiary text and icons. Whitespace separates sections; a hairline only
  separates repeated items (feed rows, comments).
- One accent, used sparingly: primary actions, active/current states, links on hover, positive
  scores. Never decoration.
- Content first: one feed, one reading column. No boxes inside boxes: a list is one container
  with hairline dividers, never a card per row inside a card.
- Every interactive element has hover, active (pressed), focus-visible and disabled states,
  150ms `ease-out`, and no layout shift on hover.

## Type (Reddit Sans, `next/font/google`, variable font)

Tailwind utilities from `@theme static` in `src/app/globals.css`; each carries its line height.

| utility | size / line height | use |
|---|---|---|
| `text-meta` | 13 / 20px | meta lines, counts, timestamps, helper text, sidebar secondary lines |
| `text-small` | 14 / 22px | feed excerpts: readable, but a step below the title so it never competes |
| `text-body` | 15 / 24px desktop, 16 / 26px phones (≤640px) | UI text, excerpts, comments, sidebar rows |
| `text-reading` | 16px / 1.7 | the thread's own post (`<Markdown size="reading">`) |
| `text-title` | 17px / 1.4, `font-semibold` | thread titles in lists |
| `text-heading` | 18 / 26px, `font-semibold` | section headings, headings inside a reading post |
| `text-2xl` | 24 / 32px | landing section headings on Home (22px on phones) |
| `text-display` | 30 / 38px desktop, 26 / 32px phones | page h1 (`PageHeader`, thread title) |

Weights: 400 body, 500 labels/links/sidebar rows, 600 titles and headings (the `text-title`,
`text-heading` and `text-display` utilities carry no weight, so always pair them with
`font-semibold`). No 700 walls. Raw `text-sm` is `text-small`; `<time>` is tabular by default.
Section headings are real headings in `foreground`, never tiny muted labels. Counts, scores and
dates use `tabular-nums`.

## Spacing (4/8 scale)

Tailwind steps only: 1 (4px), 1.5 (6px, icon–text gap), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24),
8 (32), 10 (40), 12 (48).

- Page gutter: `px-4 sm:px-6`; page top `py-6 sm:py-8 lg:py-10` (root layout).
- Inside a card: `px-4 py-4 sm:px-5`; card-to-card `gap-4`.
- Feed rows: `py-4`, `gap-4` between score and content; title `mt-1`, excerpt `mt-1`, status pills `mt-2.5`
  (only when one applies).
- Between page sections: `gap-8` to `gap-12`; between feed and stacked sidebar on phones `gap-12`.

## Layout

- Container `max-w-6xl` (header, main, footer).
- `FeedLayout` (`src/components/sidebar/feed-layout.tsx`): `minmax(0,1fr)` feed + `19rem`
  sidebar from `lg`; below `lg` the sidebar stacks after the feed. `/browse`, `/c/[slug]`
  and thread pages use it. Wrap the last sidebar group in `SidebarSticky` (sticks under the header
  only on windows at least 48rem tall, so a short window can still scroll to the group's end).
- The first sidebar card never repeats the page headline: `/browse` and category pages open
  with `WelcomeCard` (visitors: "Have a question?" with Ask + Sign in; members: a greeting, Ask and
  links to their threads, saved threads and notifications). The thread page opens with the thread's
  category (`AboutCard`), which the page itself only names in the breadcrumb.
- Reading column on thread pages: `max-w-[45rem]` (~720px).
- Home (`src/components/landing/`) is a landing page, not a feed, and has no sidebar: centred hero
  (pill, 34/48/56px headline, Ask + Search ⌘K, trust line, `hero-spotlight` glow over a faint grid),
  then Start here (featured guides), Browse by topic, Popular questions (5 hot threads, topped up with
  the newest), How it works, Latest announcement (pinned first, hidden if none), the community strip
  and a closing Ask. Sections sit in a `max-w-5xl` column, 64/96/112px apart (phone/sm/lg); each data
  section has its own `<Suspense>` with a skeleton that keeps the real heading.

## Surfaces and depth

| token | light | dark | role |
|---|---|---|---|
| `background` | #fff | #08090a | page |
| `surface` | #f7f8f8 | #0f1012 | sidebar cards, inputs, segmented frames |
| `surface-hover` | #f0f1f2 | #16171a | hover fill for rows, links, ghost buttons |
| `raised` | #fff | #1a1b1e | the active segment, popovers on top of `surface` |
| `border` | black 8% | white 8% | hairlines: dividers, inputs, outlines that are really needed |
| `border-strong` | #8a8f98 | #5c6168 | input borders, ≥3:1 on background |

Depth comes from stepping surfaces (`background` < `surface` < `raised`), not from borders.
Sidebar cards are `rounded-xl bg-surface` with no border; their icon tiles are `raised`
(`RowIcon`), headings `text-body font-semibold` in a `min-h-7` row (`card-styles.tsx`). Every text token passes AA (4.5:1) on
`background`, `surface`, `surface-hover` and `raised` in both themes.

## Radii

`rounded-xl` cards and panels · `rounded-lg` feed rows, row hovers, segmented frames · `rounded-md`
buttons, inputs, icon tiles · `rounded-full` pills and avatars.

## Components

`src/components/ui/`: `Button` (primary / secondary / ghost / danger, sizes sm/md/icon, 44px on
touch), `Input`, `Textarea`, `Select`, `Label`, `FieldError`, `Card` (`outline` framed panels and
forms, `quiet` borderless `surface` for prompts and notes, `list` hairline-divided rows such as
moderation queues), `Badge` (neutral / accent / warning / danger), `Kbd`, `Skeleton`, `EmptyState`
(soft `surface` block, round quiet icon, title, one line of help, action; never dashed),
`PageHeader`, `SegmentedControl`, `SegmentedLinks`, `DropdownMenu` (on `raised`; an optional heading
line such as the account menu's name + @handle sits above a separator), `Dialog` (`DialogHeader`
title + one-line description + close button, body, `DialogActions` right-aligned with the main
action last, `DialogSuccess` check + thank-you + focused Done; Escape, a backdrop press and the close
button call `onClose`, Tab stays inside, focus returns to the opener; report, feedback, update
request and shortcuts dialogs use it). Interactive cards only step their fill on hover (no lift,
no shadow). Icons from `lucide-react`, 16px (`size-4`) beside text, `strokeWidth={1.75}`,
`text-subtle` when decorative.

`src/components/sidebar/`: `FeedLayout`, `SidebarSticky`, `SidebarCard` (title + optional
"See all"), `WelcomeCard`, `AboutCard`, `AnnouncementsCard`, `GuidesCard`, `CategoriesCard`,
`SidebarLinks`, `SidebarCardSkeleton`, `CommunitySidebar`, `ThreadSidebar`.

`ThreadRow` (`src/components/thread/thread-list.tsx`, listed by `ThreadList` or inside
`ThreadRows`) is the one feed row everywhere: score column from `sm` (display only; a new thread
shows only a faint arrow, never a column of zeros), meta line (category link with icon · city ·
author link · relative time) with the comment count trailing (left out at zero; phones also show a
non-zero score there), title, two-line `text-small` excerpt, status pills only when one applies.
Search passes `highlight` (marks the words) and its own `excerpt` snippet; lists without scores
drop the column; a category page passes `hideCategory`, a profile `hideAuthor`. Links inside a row sit above the title's stretched link (`relative z-10`).

Author names link to `/u/<username>` when the query loaded the handle (quiet until hover: underline
and `foreground`); "Deleted user" is never a link.

Thread page: breadcrumb, title (`text-display`), byline (36px avatar, name with role and
affiliation badges; date, edited and city below), status pills, then an action bar: vote pill
(`VoteControl appearance="pill"`, tinted once voted), comments pill linking to the comments,
Share and the ⋯ menu on the right. A hairline separates it from the post. Wrapping meta lines
use `metaFrame` / `metaLine` / `metaItem` (`src/components/thread/meta.ts`): separators sit before
each item and are clipped at a line start, so no line begins with "·". Comments: "Comments" heading
with a muted count, best answer as a soft accent panel, signed-out visitors get a quiet card with
a primary "Sign in to comment".

## Content rules

- Pills only for status: Answered, Pinned, Outdated, Verified, Waiting for review, Rejected,
  Archived. Category and city are plain text in meta lines.
- Truncation: list titles 2 lines (3 on phones), excerpts 2 lines, single-line names `truncate`
  with a `title` tooltip.
- Plurals through `countLabel(n, "comment")` ("1 comment", "2 comments"). Zero counts in feed rows
  and sidebar lists are left out rather than printed as "0 comments".
- Times: relative (`relativeTime`) in a `<time dateTime>` with the full date in `title`.
- Guides index: featured guides first as `surface` cards ("Start here" once other guides exist),
  the rest as hairline rows; each shows the step count, and members also see a progress bar and
  "3 of 8 steps done". Announcements list as `surface` cards (pinned pill, date, author, title,
  three-line excerpt; the whole card opens it); an announcement's own page reads like a thread.
- Members-only pages show signed-out visitors only the sign-in prompt (no search, tabs or filters).
- Empty states (`EmptyState`) say what is missing and offer the next action (usually Ask a
  question).
- Skeletons mirror the final layout (same frame, row count and heights) so nothing jumps.

## Motion

- Durations 150–300ms, `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)` for entrances).
- Lists: fade-up with a small stagger (`animate-fade-up` + `stagger(i)`, capped at 8 items).
- Rows and cards: background steps to `surface-hover` on hover; no bouncing, no scale.
- Page navigation: React/Next view transitions (cross-fade) where supported.
- About, 404 and error pages keep one soft radial glow (`hero-glow`); static. Home's hero uses
  `hero-spotlight` (glow plus a masked `--grid-line` grid) and its closing call to action `hero-glow`.
- Everything respects `prefers-reduced-motion: reduce` (animations off, transitions ≤ 1ms).

## Intro video

Home reserves a slot for an intro video directly under the hero, driven by `introVideo` in
`src/lib/site.ts` (`null` renders nothing, including the hero's "Watch the intro" link). A 16:9
poster frame with a play button; the player (native `<video>` with captions, or a
youtube-nocookie iframe) mounts only after the click, so nothing third-party loads before it.
Labelled "AI-generated video".

## Accessibility

Contrast AA in both themes, visible focus ring on every control (feed rows show it around the
whole row), ≥44px tap targets on touch, 360px wide without horizontal scroll, motion never
conveys information alone.
