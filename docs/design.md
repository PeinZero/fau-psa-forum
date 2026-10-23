# Design system

Read before any UI work. Direction agreed with the owner: clean and minimal in the style of
linear.app, emerald as the single accent, light/dark following the system with a toggle,
smooth and subtle motion.

## Principles

- Restraint: neutral surfaces, hairline borders, one accent. Color carries meaning (accent =
  primary action/active state), never decoration.
- Typography does the hierarchy: Inter, tight tracking on headings (`tracking-tight`), body 15px,
  meta text 13px in `text-muted`. Weights 400/500/600, no bold 700 walls.
- Density with air: compact rows, generous section spacing, max content width ~`max-w-5xl`
  (reading column `max-w-3xl` on thread pages).
- Every interactive element has hover, focus-visible and active states.

## Tokens (CSS variables in `src/app/globals.css`, exposed as Tailwind colors)

| token | role |
|---|---|
| `background` | page |
| `surface` | cards, inputs, menus (slightly lifted from background) |
| `surface-hover` | hover fill for rows/cards/ghost buttons |
| `foreground` | primary text |
| `muted` | secondary text, icons |
| `subtle` | tertiary text, placeholders |
| `border` | hairline borders (dark: white ~8%, light: black ~8%) |
| `border-strong` | input borders, focus-adjacent (≥3:1 against background) |
| `accent` / `accent-foreground` | emerald primary action |
| `accent-soft` | tinted backgrounds for badges/highlights |
| `ring` | focus ring |
| `danger` / `warning` | destructive and outdated/pending states |

Dark: near-black background (`#08090a`-ish), surfaces a few steps lighter. Light: white
background, `#f7f8f8`-ish surfaces. Theme is set by `next-themes` on `<html data-theme>`;
`dark:` variants follow it.

## Components (`src/components/ui/`)

Use these instead of ad-hoc class strings: `Button` (primary / secondary / ghost / danger,
sizes sm/md, `min-h-11` on touch), `Input`, `Textarea`, `Select`, `Label`, `FieldError`,
`Card`, `Badge` (neutral / accent / warning / danger), `Kbd`, `Skeleton`, `EmptyState`,
`PageHeader`. Icons from `lucide-react`, 16px in text, `strokeWidth={1.75}`.

## Motion

- Durations 150–300ms, `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)` for entrances).
- Lists: fade-up with a small stagger (`animate-fade-up` + `--i` delay, capped at ~8 items).
- Cards/rows: border and background brighten on hover; no bouncing, no scale > 1.01.
- Page navigation: React/Next view transitions (cross-fade) where supported.
- Hero: one soft radial accent glow behind the heading; static, no looping animation.
- Everything respects `prefers-reduced-motion: reduce` (animations off, transitions ≤ 1ms).

## Accessibility

Contrast AA in both themes, visible focus ring on every control, ≥44px tap targets,
360px wide without horizontal scroll, motion never conveys information alone.
