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
| `text-body` | 15 / 24px desktop, 16 / 26px phones (≤640px) | UI text, excerpts, comments, sidebar rows |
| `text-reading` | 16px / 1.7 | the thread's own post (`<Markdown size="reading">`) |
| `text-title` | 17px / 1.4, `font-semibold` | thread titles in lists |
| `text-heading` | 18 / 26px, `font-semibold` | section headings, headings inside a reading post |
| `text-2xl` | 24 / 32px | the compact welcome headline on Home |
| `text-display` | 30 / 38px desktop, 26 / 32px phones | page h1 (`PageHeader`, thread title) |

Weights: 400 body, 500 labels/links/sidebar rows, 600 titles and headings. No 700 walls.
Section headings are real headings in `foreground`, never tiny muted labels. Counts, scores and
dates use `tabular-nums`.

## Spacing (4/8 scale)

Tailwind steps only: 1 (4px), 1.5 (6px, icon–text gap), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24),
8 (32), 10 (40), 12 (48).

- Page gutter: `px-4 sm:px-6`; page top `py-6 sm:py-8 lg:py-10` (root layout).
- Inside a card: `px-4 py-4 sm:px-5`; card-to-card `gap-4`.
- Feed rows: `py-4`, `gap-4` between score and content; title `mt-1`, excerpt `mt-1`, footer `mt-3`.
- Between page sections: `gap-8` to `gap-12`; between feed and stacked sidebar on phones `gap-12`.

## Layout

- Container `max-w-6xl` (header, main, footer).
- `FeedLayout` (`src/components/sidebar/feed-layout.tsx`): `minmax(0,1fr)` feed + `19rem`
  sidebar from `lg`; below `lg` the sidebar stacks after the feed. Home, `/browse`, `/c/[slug]`
  and thread pages use it. Wrap the last sidebar group in `SidebarSticky` (sticks under the header).
- Reading column on thread pages: `max-w-[45rem]` (~720px).
- Phones: Home shows the welcome strip with Ask + Guides buttons and the pinned announcement
  above the feed, because the sidebar only follows the feed there.

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
Sidebar cards are `rounded-xl bg-surface` with no border. Every text token passes AA (4.5:1) on
`background`, `surface`, `surface-hover` and `raised` in both themes.

## Radii

`rounded-xl` cards and panels · `rounded-lg` feed rows, row hovers, segmented frames · `rounded-md`
buttons, inputs, icon tiles · `rounded-full` pills and avatars.

## Components

`src/components/ui/`: `Button` (primary / secondary / ghost / danger, sizes sm/md/icon, 44px on
touch), `Input`, `Textarea`, `Select`, `Label`, `FieldError`, `Card`, `Badge` (neutral / accent /
warning / danger), `Kbd`, `Skeleton`, `EmptyState`, `PageHeader`, `SegmentedControl`,
`SegmentedLinks`. Icons from `lucide-react`, 16px (`size-4`) beside text, `strokeWidth={1.75}`,
`text-subtle` when decorative.

`src/components/sidebar/`: `FeedLayout`, `SidebarSticky`, `SidebarCard` (title + optional
"See all"), `AboutCard`, `AnnouncementsCard`, `GuidesCard`, `CategoriesCard`, `SidebarLinks`,
`SidebarCardSkeleton`, `CommunitySidebar`, `ThreadSidebar`.

`ThreadList` (`src/components/thread/thread-list.tsx`) is the one feed row everywhere: score
column (display only), meta line (category link with icon · city · author · relative time),
title, two-line excerpt, footer with comment count and status pills.

## Content rules

- Pills only for status: Answered, Pinned, Outdated, Verified, Waiting for review, Rejected,
  Archived. Category and city are plain text in meta lines.
- Truncation: list titles 2 lines (3 on phones), excerpts 2 lines, single-line names `truncate`
  with a `title` tooltip.
- Plurals through `countLabel(n, "comment")` ("1 comment", "2 comments").
- Times: relative (`relativeTime`) in a `<time dateTime>` with the full date in `title`.
- Empty states (`EmptyState`) say what is missing and offer the next action (usually Ask a
  question).
- Skeletons mirror the final layout (same frame, row count and heights) so nothing jumps.

## Motion

- Durations 150–300ms, `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)` for entrances).
- Lists: fade-up with a small stagger (`animate-fade-up` + `stagger(i)`, capped at 8 items).
- Rows and cards: background steps to `surface-hover` on hover; no bouncing, no scale.
- Page navigation: React/Next view transitions (cross-fade) where supported.
- About, 404 and error pages keep one soft radial glow (`hero-glow`); static.
- Everything respects `prefers-reduced-motion: reduce` (animations off, transitions ≤ 1ms).

## Accessibility

Contrast AA in both themes, visible focus ring on every control (feed rows show it around the
whole row), ≥44px tap targets on touch, 360px wide without horizontal scroll, motion never
conveys information alone.
