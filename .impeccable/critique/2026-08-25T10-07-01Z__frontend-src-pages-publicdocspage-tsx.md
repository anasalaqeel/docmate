---
target: docs view
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-25T10-07-01Z
slug: frontend-src-pages-publicdocspage-tsx
---
# Design Critique — Grud Public Docs View

Method: dual-agent (A: design review sub-agent · B: detector sub-agent). Browser visualization skipped: no browser automation available.

## Heuristic Scores
1. Visibility of System Status: 2 — bare spinner in viewer; operation blocks pulse forever on error
2. Match System / Real World: 3 — non-clickable breadcrumb; "mixed" taxonomy leak
3. User Control and Freedom: 3 — no in-doc search or on-page TOC
4. Consistency and Standards: 2 — markdownRenderer hard-codes Tailwind grays, bypasses --grud-* tokens
5. Error Prevention: 2 — silent redirect to /docs on load failure
6. Recognition Rather than Recall: 3 — no search within doc pages
7. Flexibility and Efficiency: 2 — no cmd+K, no keyboard paging, middle-click broken
8. Aesthetic and Minimalist Design: 3 — filler copy, decorative version info
9. Error Recovery: 1 — console.error + silent redirect, no retry
10. Help and Documentation: 2 — no getting-started affordance or cross-doc search
Total: 22/40 (Acceptable)

## Design Specificity
Category-interchangeable. DESIGN.md "Technical Blueprint" identity (0-2px radii, mono labels, Space Grotesk) not implemented on this surface. Product-specific wins: card→page view-transition morph, api/traditional/mixed icons, in-content operation embedding. Detector: 0 findings in the 5 redesigned docs files; 2 in-scope hits in markdownRenderer.tsx (blockquote border-l-4 = conventional, likely fine; broken-image = false positive on spread props). Full-src scan: 24 findings, all outside docs view.

## Strengths
1. View-transition title morph with prefers-reduced-motion handling
2. Search state design: highlight, result count, Escape, "/" shortcut, distinct empty states
3. Prev/next footer with destination titles

## Priority Issues
- [P1] markdownRenderer bypasses theming (text-gray-800, bg-gray-900, github-dark.css) — fix via /impeccable colorize
- [P1] Silent failure on doc load (navigate /docs on any error) — inline error + Retry — /impeccable harden
- [P2] Middle-click/Cmd+Click broken on cards (unconditional preventDefault) — /impeccable harden
- [P2] Full doc refetch on every page turn (loadDoc deps include pageId/endpointId) — /impeccable optimize
- [P2] Unbounded decision points: no type filter on /docs; endpoint sidebar never collapses — /impeccable layout

## Persona Red Flags
- Alex: middle-click same-tab; refetch+spinner per page turn; no in-doc search; no arrow-key paging; first-occurrence-only highlight
- Sam: Breadcrumb landmark has zero links; no skip-link; silent redirect without aria-live; opacity-only deprecated state
- Jordan: breadcrumb root false affordance; mixed vs traditional icons indistinguishable; zero-page doc = contradictory dead end; last page Next vanishes with no closure

## Minor Observations
DESIGN.md vs code drift (radii, sidebar width); en-US date hard-code; stagger stops at nth-child(6); dead code (selectedIndicator, expandButton CSS); "Unknown" author fallback; mobile 40/60vh split panes.

## Questions
1. Why is polish inverted (landing page polished, reading surface generic)?
2. Is the Technical Blueprint identity dead or in debt?
3. What is the plan for 150-endpoint/40-page docs — search-within-doc is load-bearing for the unified positioning?
