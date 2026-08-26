# Docmate Design System

> Recorded from the shipped implementation (public docs view) via `/impeccable document`.
> Previous "Technical Blueprint" spec described an identity that was never implemented;
> it has been replaced by this record of the committed system.

## Design Principles

**Quiet authority**: the content is the interface. Structure comes from typographic
hierarchy and hairline borders, not decorative accents. No gradient text, no thick
one-sided accent borders, no offset block shadows, no monospace-as-costume.

**Runtime-token theming**: every color flows through `--docmate-*` CSS custom properties
set by the admin theme system (`themeContext.tsx`) with fallbacks in
`frontend/src/styles/theme.css`. No hard-coded palette colors in components.

**Read mode**: docs surfaces are built for comprehension — generous whitespace,
bounded decision points, real navigation (breadcrumbs that link, prev/next with
destination titles).

## Color System

All colors are tokens (light defaults in `theme.css`, remapped by `.dark` and by
admin branding):

| Role | Token | Light fallback |
|---|---|---|
| Page background | `--docmate-bg` | `#f8f7fb` |
| Surface | `--docmate-surface` | `#ffffff` |
| Surface alt | `--docmate-surface-alt` | `#f5f3fa` |
| Text | `--docmate-text` | `#1f1832` |
| Text secondary | `--docmate-text-secondary` | `#5d5573` |
| Border | `--docmate-border-color` | `rgba(30,20,50,0.1)` |
| Primary / brand | `--docmate-primary` | `#6d28d9` (refined violet) |
| Secondary | `--docmate-secondary` | `#4c1d95` |
| Semantic | `--docmate-success` / `--docmate-warning` / `--docmate-error` | `#12805c` / `#b45309` / `#b91c1c` |

The default (unbranded) palette is **Refined Violet**: violet primary on
violet-tinted neutrals — premium developer-brand register. Dark mode uses a
violet-tinted near-black (`#131022` family), not mechanically inverted slate.

Code blocks are intentionally dark in both modes: `--docmate-code-bg: #161b22`,
`--docmate-code-border: #30363d`, text `#e6edf3`, with the `github-dark` highlight theme.

Tints derive via `color-mix(in srgb, var(--docmate-primary) N%, transparent)` so custom
branding flows through hover/active states automatically.

## Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | `--font-docs-display` → Outfit | weights 600–800, tracking −0.015 to −0.035em, `text-wrap: balance` |
| Body | `--font-body` → Inter | 1.05–1.125rem, line-height 1.6–1.7 |
| Data / code | `--font-docs-mono` → JetBrains Mono | HTTP methods, endpoint paths, code blocks only |

Page titles use `clamp()` (e.g. `clamp(1.875rem, 3.5vw, 2.625rem)`). Mono is reserved
for real data — never for decorative "technical" labels.

## Spacing & Layout

- Docs listing: max-width 1120px, card grid `repeat(auto-fill, minmax(320px, 1fr))`, gap 1.25rem
- Reading content: max-width 1080px outer, comfortable measure inside
- Docs sidebar: 300px, 1px right border, thin tinted scrollbar
- Mobile (≤768px): single-column grid, sidebar becomes top pane, search kbd hint hidden

## Border Radius & Depth

- Radius scale: 8px (controls/sidebar items) to 12px (cards/panels); pills (99px) for filter chips
- Depth: soft offset shadows only (`0 1px 2px` resting → `0 4px 16px` hover) plus a
  2px `translateY` lift. No zero-blur block shadows.

## Component Patterns

### Documentation cards (listing)
Surface + 1px border + 12px radius; doc-type SVG icon in a 36px tinted tile
(becomes solid primary on hover); `h2` title in Outfit 700; author + "Updated {date}"
footer. Entrance: staggered `@starting-style` rise (inline `transitionDelay`,
capped at 8×40ms). Whole card is one `<Link>`; middle-click/Cmd+Click pass through,
plain clicks navigate inside a View Transition (`viewTransitionName: doc-title-{id}`)
that morphs the card title into the page title.

### Search
Bordered 10px-radius field with soft resting shadow; focus = primary border + 3px
tinted ring; `/` focuses globally, Escape clears; live result count and `<mark>`
match highlighting.

### Type filter
Pill chips (All / Guides / API / Mixed), `aria-pressed`, tinted active state.

### Sidebar
Header shows doc title + version · author. Tree items: 44px min-height, 8px radius,
tinted hover, selected = 12% primary tint + primary text (no accent bars).
Endpoint groups: collapsible with chevron; text filter appears above 8 endpoints;
method badges in mono with per-verb colors; deprecated gets an explicit text tag
(never opacity alone).

### Page content
Ruled header (1px bottom border) with linked breadcrumb (`docs / {doc} / {page}`,
current crumb `aria-current="page"`); prev/next cards with destination titles;
"You've reached the end" closure note on the last page.

### Markdown content
All renderer classes use `--docmate-*` tokens (text, borders, table headers, inline
code, blockquote with 2px primary left rule). Skip link to `<main id="docs-main">`.

## Interaction States

- Hover: border tint toward primary + shadow step + 2px lift (cards/links)
- Focus: 2px primary outline, 2px offset, on every interactive element
- Selected (sidebar/endpoints): primary-tinted background + primary text
- Motion: one authored moment per surface (card entrance stagger, view-transition
  morph); everything else 0.15–0.2s ease; `prefers-reduced-motion` disables the morph

## Accessibility Floor

- Contrast ≥4.5:1 body text, placeholders ≥0.7 opacity secondary
- Breadcrumbs are real links; skip link on the viewer; `role="status"`/`role="alert"`
  on loading and error states; error recovery offers Retry (network) vs Not Found copy
- Dates use `toLocaleDateString(undefined, …)` (locale-aware)
- Touch targets ≥44px on sidebar items and endpoint rows

## Icons

Authored inline SVG, 1.5–1.75 stroke, consistent 14–18px sizing: doc-type marks
(api = plug/brackets, mixed = file+lines, traditional = file), folder/file sidebar
marks, lightning for API reference, chevrons for group toggles. No emoji.
