# STRIDE — Accessibility & Performance Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 10 of the spec's own §13 roadmap. Every prior phase in this project has built and shipped real features across ~28 section/snippet files, each individually reviewed for contrast/touch-targets/`.full-width` regressions at the time it was written — but no single pass has ever looked at the theme as a whole, against real Lighthouse numbers, or with a dedicated keyboard-only sweep of the specific flows spec §11 names. This plan is that pass. Per spec §11: **"treat a miss as a bug to fix, not a note to defer."**

**Tech Stack:** No new features. Fixes only, driven by real tool output (Lighthouse CLI, live browser contrast/keyboard testing) — not guesses.

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §7 (thresholds), §11 (validation approach — this plan follows its bullet list directly), §2.1 (color token table, for the contrast audit).

## Global Constraints

(Carried over from all prior plans; every task below implicitly inherits these.)

- A real `shopify theme dev` session is available in this environment (confirmed running at `http://127.0.0.1:9292` throughout this project). Use it for every live check in this plan.
- **`npx lighthouse` is confirmed working in this environment** (verified at plan-writing time: a real run against the live dev server produced genuine performance/accessibility scores from a real headless Chrome instance). A cosmetic `EPERM` cleanup error sometimes appears in stderr after the JSON report is already written (a Windows temp-directory permission quirk in `chrome-launcher`'s post-run cleanup, unrelated to the audit itself) — ignore it, the JSON output is valid regardless; confirm this on your own first run before relying on it further.
- Default `npx lighthouse` invocation emulates **mobile** (throttled CPU/network). Pass `--preset=desktop` for the desktop runs spec §11 also requires. Both are needed for every page in Task 1.
- Fix real theme-code issues found; do not chase pure dev-server-environment artifacts (e.g., `shopify theme dev`'s local proxy/HMR overhead inflating a metric that would not exist on Shopify's actual CDN) — but do not use that distinction as an excuse to dismiss a real finding either. If a metric looks environment-skewed, say so explicitly with reasoning, don't just discard it.
- Color contrast: 4.5:1 body text, 3:1 large text (≥18pt/24px)/non-text UI (icons, focus outlines). Never use `--color-border` for an interactive element's boundary — use `--color-foreground-muted`. This is now a hard, repeatedly-enforced rule in this project; any remaining violation found in this audit must be fixed, not just noted.
- Touch targets ≥24×24 CSS px on every interactive element.
- `theme-check` must pass with zero new errors after every task.
- No literal Liquid tags (`{%`/`%}`) written as prose inside any `{% comment %}` block.
- Any fix must not regress the extensive existing live-verification work already on record for the files it touches (check `.superpowers/sdd/` history is gone, but git log / this plan's own task reports are the record going forward) — a fix here should be the narrowest change that resolves the actual finding.

## Known state going in

Every section/snippet file in this theme, for reference (audit scope is the whole list, but Task 2 should weight its manual effort toward the files in the **left** column — built in early phases of this project, before per-task contrast/touch-target review became this rigorous, and never revisited since):

| Never revisited this rigorously (Phase 1-4 era) | Rebuilt/reviewed this session (Phase 5-9) |
|---|---|
| `sections/announcement-bar.liquid` | `sections/product.liquid` + product blocks |
| `sections/header.liquid` (partially — Task 3 of the blog-search plan added a narrow, reviewed change; the rest of the file predates that) | `sections/collection.liquid`, `snippets/collection-filters.liquid` |
| `sections/footer.liquid`, `footer-group.json`, `header-group.json` | `sections/cart.liquid`, `sections/cart-drawer.liquid` |
| `sections/hero-colorway.liquid` | `sections/blog.liquid`, `sections/article.liquid` |
| `sections/marquee.liquid` | `sections/search.liquid`, `snippets/predictive-search.liquid` |
| `sections/collection-index.liquid` | `sections/404.liquid`, `sections/password.liquid` |
| `sections/product-anatomy.liquid` | `sections/page.liquid`, `sections/collections.liquid` |
| `sections/drop-countdown.liquid` | `templates/gift_card.liquid` |
| `sections/shoppable-lookbook.liquid` | `sections/page-contact.liquid` |
| `sections/newsletter-band.liquid` | |
| `sections/custom-section.liquid` | |
| `snippets/social-icons.liquid`, `snippets/meta-tags.liquid` | |

**One known finding already diagnosed, not yet fixed**: `sections/header.liquid:376` and `:388` (the localization/country-language `<select>` elements) use `border: 1px solid var(--color-border)` — an interactive element's boundary on the low-contrast decorative token, the exact anti-pattern this project's convention forbids. Fix this as part of Task 2's contrast sweep (don't treat it as already-handled by a background task — it was folded into this plan instead).

---

## File Structure

No new files. This plan only edits existing section/snippet/locale files wherever a real finding requires a fix. A findings log is kept in the SDD workspace (`.superpowers/sdd/2026-09-03-stride-accessibility-performance-audit/`), not in the repo itself.

---

## Task 1: Lighthouse performance + accessibility audit

**Files:** Whatever specific files a real finding points to — cannot be known until the audit runs. Likely candidates: `assets/critical.css` (render-blocking/above-the-fold rules), image-rendering snippets (`snippets/image.liquid`, `snippets/product-card.liquid`) if oversized/unlazy images show up, any section with heavy inline SVG or unbounded layout shift.

**Interfaces:**
- Consumes: the live `shopify theme dev` server, `npx lighthouse`.
- Produces: a findings log other tasks don't depend on (Task 2 is independent).

- [ ] **Step 1: Run Lighthouse on the 3 required page types, both form factors — 6 runs total**

Spec §11: "Lighthouse runs (product/collection/home, mobile+desktop) against the performance (≥60) and accessibility (≥90) thresholds." Pick one real product URL, one real collection URL, and `/` for home. Run:

```bash
npx lighthouse <url> --only-categories=performance,accessibility --output=json --output-path=<path>.json --chrome-flags="--headless --no-sandbox" --quiet
npx lighthouse <url> --preset=desktop --only-categories=performance,accessibility --output=json --output-path=<path>.json --chrome-flags="--headless --no-sandbox" --quiet
```

Extract `categories.performance.score` and `categories.accessibility.score` from each JSON (×100 for the 0-100 scale spec §11 uses) via a small Node script (`JSON.parse(fs.readFileSync(...))` — `require()` on an absolute path had path-translation issues between Git Bash and Windows `node` in this environment at plan-writing time; use `fs.readFileSync` in a real `.mjs`/`.js` file instead, not `node -e` with inline backslash paths).

- [ ] **Step 2: For every score below threshold, read the report's own `audits` object for the specific opportunities/diagnostics driving that score down — don't guess**

Lighthouse's JSON report names the exact failing audits (e.g. `largest-contentful-paint`, `render-blocking-resources`, `color-contrast`, `image-alt`, `tap-targets`) with element-level detail in most cases. Cross-reference against this theme's actual source before changing anything — a low score can come from genuine theme issues (unoptimized critical CSS, missing `width`/`height` causing layout shift, oversized hero images) or from environment noise (local dev-server proxy overhead that would not exist on Shopify's production CDN) — call out explicitly which is which per finding, don't lump them together.

- [ ] **Step 3: Fix real findings, re-run to confirm**

Fix whatever's genuinely fixable in the theme's own code. Re-run the specific failing page/form-factor combination after each fix to confirm the score actually moved, not just that the specific flagged element changed.

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```
Expected: 0 offenses.

- [ ] **Step 5: Commit**

Commit whatever files were actually touched, with a message describing the specific Lighthouse findings fixed. If genuinely nothing needed fixing (all 6 runs already clear threshold), no commit is needed for this task — say so plainly rather than fabricating a change.

---

## Task 2: Manual accessibility audit — contrast, keyboard, touch-targets

**Files:** Whatever specific files a real finding points to. Weight effort toward the "never revisited" column in this plan's Known State table above — the "rebuilt/reviewed this session" column has already had this exact kind of check applied per-task, so a quick confirmation pass there is enough; don't re-litigate settled work without cause.

**Interfaces:**
- Consumes: the live `shopify theme dev` server, `snippets/css-variables.liquid`'s actual current token values (re-read fresh — don't assume the §2.1 table's defaults weren't adjusted somewhere along the way).
- Produces: nothing Task 1 depends on (independent).

- [ ] **Step 1: Contrast sweep**

For every color-token pairing actually used in the theme (not just the ones §2.1 explicitly calls out), compute real contrast ratios from the current live token values, not the spec table's defaults (settings can drift from spec defaults over 15 plans of iteration — verify fresh). Specifically:
1. Fix the already-diagnosed `sections/header.liquid:376,388` `--color-border`-on-interactive-select finding (see Known State above).
2. Sweep every file in the "never revisited" column for the same `--color-border`-on-interactive-boundary anti-pattern (`grep -rn "color-border" sections/ snippets/` as a starting point, then judge each hit: decorative divider = fine, interactive boundary = fix).
3. Check every text/background pairing in those same files against 4.5:1 (body) / 3:1 (large text ≥18pt/24px, non-text UI/icons/focus outlines) — pay particular attention to `sections/drop-countdown.liquid` (countdown numerals are often styled large/bold with tighter color choices), `sections/shoppable-lookbook.liquid` (hotspot markers/badges over photo backgrounds are a common contrast failure point), and `sections/announcement-bar.liquid` (frequently styled with an accent background where on-accent text contrast needs explicit checking).

- [ ] **Step 2: Keyboard-only pass over the exact flows spec §11 names**

"Header nav, cart drawer, variant picker, filters, lookbook hotspots, every form." Tab through each with no mouse, confirm: visible focus state at every stop, logical focus order matching DOM order, no keyboard trap, every actionable element reachable and operable (Enter/Space activates buttons and links correctly), Escape closes anything that should close (drawer, modals, dropdowns — cross-check against the predictive-search/cart-drawer/mobile-nav fixes already made in prior plans, confirm they still hold in combination with each other, not just individually). Specifically:
1. Header nav — including any multi-level dropdown menus (spec §6 requires them) — full keyboard traversal.
2. Cart drawer — open via keyboard, tab through line items/quantity/checkout, close via Escape and via keyboard-activating the close control.
3. Variant picker (product page) — including the size-chart modal.
4. Collection filters.
5. Lookbook hotspots (`sections/shoppable-lookbook.liquid`) — this file is in the "never revisited" column; hotspots are a common keyboard-accessibility failure point (mouse-hover-only tooltips/reveals with no keyboard equivalent) — check carefully.
6. Every form: newsletter signup, contact form, password form, comment form, search (predictive + full-page fallback).

- [ ] **Step 3: Touch-target sweep**

24×24 CSS px minimum on every interactive element. Spot-check the "never revisited" column's files specifically — `sections/announcement-bar.liquid` (any dismiss/close control), `sections/hero-colorway.liquid` (colorway swatch buttons), `sections/marquee.liquid` (if it has any interactive pause/link elements), `sections/drop-countdown.liquid` (any CTA), `snippets/social-icons.liquid` (icon links are a classic under-sized-target pattern).

- [ ] **Step 4: Fix every real finding, live-reverify each fix**

Same discipline as every prior plan in this project: live-verify each fix actually resolves the issue (not just "the code looks right"), at both mobile and desktop breakpoints where relevant.

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```
Expected: 0 offenses.

- [ ] **Step 6: Commit**

Commit whatever files were actually touched, with a message describing the specific findings fixed.

---

## Self-Review Notes

- **This is an audit-and-fix phase, not a feature-build phase** — task success is measured by real tool output (Lighthouse JSON scores, live keyboard/contrast verification) crossing spec §7's thresholds, not by a fixed feature checklist. Both tasks must report their actual before/after numbers, not just "looks better now."
- **Task 1 and Task 2 are independent** (different concern, largely different files) and could in principle run in parallel, but this project's established practice has been strictly sequential single-task dispatch with a review gate between each — that discipline is kept here too rather than parallelizing for speed.
- **The header.liquid `--color-border` finding was already diagnosed in the remaining-templates plan's whole-plan review** and deliberately folded into this plan (its own background-task chip was withdrawn) rather than fixed as a disconnected one-off, since Task 2 here is doing a systematic pass of exactly this pattern anyway.
- **"Fix, don't defer" is a direct spec quote (§11)** — a below-threshold Lighthouse score or a real contrast/keyboard/touch-target failure found in this plan must be fixed within this plan, not logged as a future TODO, unless it's genuinely outside this codebase's control (e.g., an environment-only artifact, which must be explicitly justified as such, not just asserted).
