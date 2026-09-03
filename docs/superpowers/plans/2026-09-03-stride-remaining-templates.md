# STRIDE — 404, Password, Gift Card, Collection List, Generic Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the five remaining required templates up from their untouched Phase-1 scaffolding stubs to spec §5.6–§5.11 compliance. `templates/page.contact.json` (§5.9) already shipped in an earlier plan; this plan covers everything else in that range: 404 (§5.6), gift card (§5.7), password (§5.8), collection list (§5.10), generic page (§5.11). This is Phase 9 of the spec's own §13 roadmap — the last set of *required templates*; only the accessibility/performance/QA/docs phases (10–12) remain after this.

**Current state, confirmed by direct read, not assumed:** all five are still exactly the skeleton-theme/Dawn-baseline stubs from Phase 1's compliance scaffolding — functional but minimal, unstyled (no theme design tokens applied), and missing specific spec-required features:
- `sections/404.liquid` — message + homepage link, but **no search bar** (spec requires one).
- `sections/password.liquid` — title + `shop.password_message` + form, but **no logo/shop.name** (spec requires one).
- `templates/gift_card.liquid` — already has Apple Wallet button + code display + logo-or-shop.name (further along than the others), but **no QR code** (spec requires ≥120×120px) and is entirely unstyled (raw `{% style %}`, no design tokens).
- `sections/collections.liquid` (list-collections) — has a working grid + untruncated title, but **no pagination**, **no featured-image fallback to a member product's image**, and is unstyled.
- `sections/page.liquid` — renders `page.title`/`page.content` completely unstyled, no RTE typography at all for h1–h6/blockquotes/lists.

**Tech Stack:** Shopify Liquid, native CSS, no new JS except the gift card page's QR code library (see Task 3 — this is the one genuinely new piece of client-side code in this plan).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §5.6–§5.8, §5.10–§5.11.

## Global Constraints

(Carried over from all prior plans; every task below implicitly inherits these.)

- **Live-verify with a real `shopify theme dev` session** — restore/reconnect it if down before starting. 404 and password are the two templates in this project that are structurally hardest to reach by normal navigation (a password-protected storefront's password page, and a genuinely nonexistent URL) — don't skip live verification just because they're awkward to reach; a real dev store still serves both (`/password` directly works even when the store isn't actually password-protected; any nonsense URL hits 404).
- No Sass; native CSS only; no pre-minified `.css`/`.js`; any third-party script must be self-hosted on Shopify's own servers (see Task 3's QR code library — verify it's genuinely Shopify-hosted before using it, don't bundle a copy into `assets/` unless verification shows that's actually required).
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Do not reuse `--color-border` for any interactive element's boundary without checking contrast — use `--color-foreground-muted` instead, matching every prior fix in this project.
- Touch targets ≥24×24 CSS px on every interactive element (password form's submit button, 404's search bar, collection-list pagination links).
- `prefers-reduced-motion` respected wherever animation/transition is added.
- Any section-root element meant to span the full viewport needs the `.full-width` utility with its own `padding-inline` — checked fresh every time; this has been the most common regression across this project's recent plans.
- **`{% stylesheet %}` and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.**
- **No literal Liquid tags (`{%`/`%}`) written as prose inside any `{% comment %}` block** — this project has hit this exact theme-check-breaking bug 4+ times; phrase any in-comment mention of a tag as plain prose ("the javascript tag"), never the literal characters.
- **Any new locale key must be added to the correct file**: `| t` in body markup → `locales/en.default.json`; `t:` inside `{% schema %}` → `locales/en.default.schema.json`. Re-read each file's actual current state before adding — reuse existing `404.*`, `password.*`, `gift_card.*`, `collections.*`, `general.*` keys before adding new ones (see current contents quoted in each task below).
- No Lorem Ipsum in default values; every setting has a `label`; every image needs accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, reuse `snippets/image.liquid` for any product/collection image, reuse the `.visually-hidden` utility, reuse existing design tokens (`--space-*`, `--color-*`, `--font-*`) — none of these five pages need new tokens.
- **`snippets/predictive-search.liquid` already exists and is exactly what §5.6 asks for on the 404 page** (a real search bar) — reuse it directly (`{% render 'predictive-search', id_prefix: '404Search' %}`), don't build a separate one-off search form. This was flagged as a known gap during the blog-search plan's own review specifically because this snippet would make it a one-line fix.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/404.liquid` | rewrite | Styled 404 message + reused predictive-search bar + homepage link |
| `sections/password.liquid` | rewrite | Styled password-entry page with logo/shop.name |
| `templates/gift_card.liquid` | rewrite | Styled standalone gift-card page with QR code |
| `sections/collections.liquid` | rewrite | Styled collection-list grid with pagination + image fallback |
| `sections/page.liquid` | rewrite | Styled generic page with RTE typography |
| `locales/en.default.json` | modify | New keys only where no existing key already covers the meaning |
| `locales/en.default.schema.json` | modify | New `t:` keys for any new settings |

No files are deleted. `templates/*.json` for 404/password/list-collections/page need no edits — they already reference the right section `type` with empty settings, same reasoning as `templates/cart.json` and `templates/collection.json` in prior plans.

---

## Task 1: 404 and password pages

**Files:**
- Rewrite: `sections/404.liquid`, `sections/password.liquid`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `snippets/predictive-search.liquid` (existing, from the blog-search plan — pass `id_prefix: '404Search'`), `shop.password_message`, `settings.logo`.
- Produces: nothing other tasks in this plan depend on.

Existing locale keys already available (re-read the file before editing, but as of plan-writing time):
```json
"404": {
  "title": "404",
  "not_found": "Page not found.",
  "back_to_shopping": "Back to shopping"
},
"password": {
  "title": "This shop is private",
  "password": "Password",
  "enter": "Enter"
}
```

- [ ] **Step 1: Rewrite the 404 page**

Replace `sections/404.liquid`. Keep the existing `404.title`/`404.not_found`/`404.back_to_shopping` keys (reuse verbatim — the copy is already fine, just unstyled). Structure: centered message block, the reused predictive-search bar below it (`{% render 'predictive-search', id_prefix: '404Search' %}`), then the homepage/shopping link. This is a `.full-width` section root with its own mobile padding, vertically centered with generous `padding-block` (this page has no other content on it, unlike most sections).

- [ ] **Step 2: Rewrite the password page**

Replace `sections/password.liquid`. Add the logo-or-shop.name block spec §5.8 requires (mirror the exact `{% if settings.logo %}...{% else %}...{% endif %}` pattern already used in `templates/gift_card.liquid` — don't invent a new pattern for the same thing). Style the form (label, input, submit button) using the theme's existing form-control conventions (compare against `snippets/predictive-search.liquid`'s own input/button styling, or the newsletter section's form, for the established look). This is also a `.full-width`, vertically-centered, no-other-content page.

- [ ] **Step 3: Add any genuinely new locale keys**

Only if something isn't already covered — check `general.*` for an existing shop-name/logo alt-text pattern before adding a new one (product/collection pages likely already have a `{{ shop.name }}`-as-alt convention somewhere; reuse it).

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```
Expected: 0 offenses.

- [ ] **Step 5: Verify live**

```bash
shopify theme dev
```
1. Navigate directly to a nonsense path (e.g. `/this-page-does-not-exist`) — confirm the 404 page renders, the message is clear, the predictive-search bar works exactly like it does on the header/search page (type a real query, confirm results, confirm keyboard nav, confirm it degrades to a real full-page search submission), and the homepage link works.
2. Navigate directly to `/password` — confirm it renders (this works even on a non-password-protected dev store; Shopify always serves this template at this path). Confirm the logo/shop-name block renders, the form is stylistically consistent with the rest of the theme, and — if you can actually enable password protection on this dev store's admin settings temporarily, or reason through it carefully if you can't — confirm submitting the correct password does let a visitor through (if you can't test the actual auth flow, disclose that honestly rather than fabricating a result; static review of the `{% form 'storefront_password' %}` tag usage is an acceptable fallback here, matching this project's established practice for genuinely hard-to-test flows).
3. Both breakpoints, keyboard access, contrast on both pages.

- [ ] **Step 6: Commit**

```bash
git add sections/404.liquid sections/password.liquid locales/en.default.json
git commit -m "feat: style 404 page with predictive search and password page with logo"
```

---

## Task 2: Generic page and collection list

**Files:**
- Rewrite: `sections/page.liquid`, `sections/collections.liquid`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `snippets/image.liquid` (existing), `collection.featured_image`, `collection.products.first.featured_image` (fallback — verify this exact property path against real documentation before using it, see below), `paginate` tag (already used identically in `sections/blog.liquid`/`sections/search.liquid` — follow that same established pattern).
- Produces: nothing other tasks in this plan depend on.

Existing locale keys already available:
```json
"collections": {
  "title": "Collections"
}
```

- [ ] **Step 1: Rewrite the generic page section — RTE typography**

Replace `sections/page.liquid`. `sections/article.liquid` already has an established RTE-content CSS pattern (`.article__content` — headings via `--font-header--family`, list indent, paragraph spacing, responsive images) at `sections/article.liquid:145-162` — mirror that same approach for a new `.page__content` class, but **also add blockquote styling**, which spec §5.11 explicitly requires and the article page's own pattern doesn't currently have (don't go back and edit `article.liquid` for this — out of scope for this task, just don't repeat the omission here). `.full-width` root, generous `padding-block`, reasonable `max-width` + `margin-inline: auto` on the content column so long-form text doesn't stretch edge-to-edge on wide screens (compare against `sections/article.liquid`'s own content-width constraint for the established value).

- [ ] **Step 2: Rewrite the collection-list section**

Replace `sections/collections.liquid`. Three real gaps to close, not just a style pass:

1. **Pagination.** There is currently no `{% paginate %}` tag at all — a store with many collections would render them all in one unpaginated page load. Wrap the loop in `{% paginate collections by 24 %}` (match the numeric convention already used elsewhere — `blog.liquid` uses `by 12`, `search.liquid` uses `by 20`; 24 is reasonable for a grid of small cards, adjust if you find a better-fitting existing convention) and add the same pagination-link markup/CSS pattern already established in `sections/blog.liquid`/`sections/collection.liquid`/`sections/search.liquid` — don't invent a new pagination component.
2. **Featured-image fallback.** Spec: "falls back to first product's featured image" when `collection.featured_image` is blank. Verify the exact property path before writing it — `collection.products` is a real, documented array of the collection's products (already used elsewhere in this codebase? check), so the fallback is almost certainly `collection.products.first.featured_image`, but confirm this against real Shopify documentation (WebFetch shopify.dev's `collection` object page) rather than assuming — this is exactly the kind of "looks right, might not be" property-path guess this project's history has been burned by before (wrong guesses silently return nil, not an error).
3. **Untruncated title** — already correct (no `truncate` filter currently applied to `collection.title`), just carry it forward unchanged into the restyled markup.

Style the grid using the theme's established card-grid conventions (compare against `sections/collection.liquid`'s or the homepage's `collection-index.liquid`'s grid for the established look — this page shouldn't look like an unstyled generic Dawn grid next to those).

- [ ] **Step 3: Add any genuinely new locale keys**

Check `collections.*` and `general.*` before adding (a `collections.pagination` aria-label key, matching `blog.pagination`/`search.pagination`'s existing naming convention, is likely needed and likely not yet present).

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```
Expected: 0 offenses.

- [ ] **Step 5: Verify live**

```bash
shopify theme dev
```
1. Navigate to a real page (e.g. an existing About/Privacy page from earlier test content) — confirm heading, paragraph, list, and — if the page's content includes one, or after temporarily adding one to real test content — blockquote styling all render correctly and match the theme's typography.
2. Navigate to `/collections` — confirm the grid renders with real collections, confirm at least one collection with a featured image and (if this dev store has one) at least one collection WITHOUT a featured image whose first product's image is genuinely displayed instead — don't just confirm the code looks right, find or create a real test case. Confirm pagination appears if there are enough collections, or reason honestly about why it couldn't be tested if this store doesn't have enough collections to trigger it (temporarily creating extra test collections and reverting, the same technique already used for blog pagination in the blog-search plan, is a reasonable way to force this state).
3. Both breakpoints, keyboard access (pagination links, collection card links), contrast.

- [ ] **Step 6: Commit**

```bash
git add sections/page.liquid sections/collections.liquid locales/en.default.json
git commit -m "feat: add RTE typography to generic page and pagination/image-fallback to collection list"
```

---

## Task 3: Gift card page — QR code

**Files:**
- Rewrite: `templates/gift_card.liquid`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `gift_card.qr_identifier` (confirmed real via shopify.dev — "a string used to generate a QR code for the gift card"; this is the ONLY documented property meant for this purpose, there is no pre-rendered QR image URL).
- Produces: nothing else in this plan depends on this task.

**The genuinely unconfirmed piece, flagged prominently — do not guess further than what's written here, verify the specifics yourself before shipping:**

Research already done at plan-writing time found that Shopify's own official Dawn reference theme renders its gift-card QR code via:
```liquid
<script src="{{ 'vendor/qrcode.js' | shopify_asset_url }}" defer></script>
```
and a container `<div class="gift-card__qr-code" data-identifier="{{ gift_card.qr_identifier }}"></div>`, initialized client-side by reading `dataset.identifier` and instantiating a QR library against it at roughly 72×72px in Dawn's own default (spec here requires **≥120×120px**, so don't just copy Dawn's exact pixel size — size it up).

**This is a real inconsistency worth resolving before writing code, not glossing over**: `shopify_asset_url`'s own documented filter reference lists only six specific globally-hosted files (`option_selection.js`, `api.jquery.js`, `shopify_common.js`, `customer_area.js`, `currencies.js`, `customer.css`) and does not mention `vendor/qrcode.js`. Dawn's actual shipped source nonetheless uses exactly that filter+path combination, and no `qrcode.js`-named file exists anywhere in Dawn's own `assets/` folder (confirmed via GitHub's contents API at plan-writing time) — meaning Dawn is NOT bundling its own copy, it's relying on `vendor/qrcode.js` being served from somewhere. Before writing this task's code:
1. Re-verify directly against Dawn's current live source (`https://raw.githubusercontent.com/Shopify/dawn/main/templates/gift_card.liquid`) that this is still the real, current pattern — themes evolve, confirm this hasn't changed.
2. Find and read whatever Dawn file actually contains the QR-rendering JS (likely a small dedicated file, e.g. something like `assets/qr-code.js` defining a custom element, separate from the `vendor/qrcode.js` library script itself) to get the exact instantiation code (constructor name, options shape, container-query logic) rather than guessing at the public API of whatever library `vendor/qrcode.js` turns out to be.
3. If, after real verification, `shopify_asset_url` + `vendor/qrcode.js` genuinely doesn't work in this project's actual `shopify theme dev` environment (test it — don't assume from documentation alone either way), fall back to self-hosting a small, well-known, MIT/BSD-licensed QR generation library as a real file in `assets/` instead (this theme's own `--no external CDN--` constraint from §7 permits this — "self-hosted on Shopify's servers" covers a file living in this theme's own `assets/` folder just as much as a Shopify-global vendor file). Document whichever path you actually took and why in your task report — this is exactly the kind of "verify before writing the fetch/render logic" risk this project's predictive-search task handled well; apply the same discipline here.

- [ ] **Step 1: Confirm the QR approach (see above), then rewrite the gift card page**

Replace `templates/gift_card.liquid`. This file is a standalone document (`{% layout none %}`, its own `<html>`) — keep that structure, but bring its styling up to the theme's actual design tokens instead of the current raw inline `{% style %}` block (load `css-variables.liquid` — it already does — and use `var(--color-*)`/`var(--space-*)`/`var(--font-*)` throughout instead of unstyled browser defaults). Keep the existing balance/expiry/logo/code/Apple-Wallet logic (it's already functionally correct per spec, just unstyled) and add the QR code element sized to genuinely render at ≥120×120px, with appropriate `alt`/accessible-name handling (a QR code image needs alt text describing its purpose, e.g. "QR code for this gift card", not empty alt — the code itself isn't meaningfully describable, but its purpose is).

- [ ] **Step 2: Add any genuinely new locale keys**

Check `gift_card.*` before adding (an alt-text key for the QR code image is likely needed and not yet present: `gift_card.qr_code_alt` or similar — check the exact existing key names first, e.g. `gift_card.card` already exists for the placeholder-image alt, don't duplicate that meaning).

- [ ] **Step 3: Run theme-check**

```bash
shopify theme check
```
Expected: 0 offenses.

- [ ] **Step 4: Verify live**

```bash
shopify theme dev
```
1. Find or create a real test gift card (Shopify admin → Products → Gift cards, or generate one via a test order if this dev store supports it) and view its actual customer-facing gift-card page URL. Confirm the QR code genuinely renders (not a broken image/empty container), confirm it's visually ≥120×120px, confirm it's scannable if you have any way to verify that (even a rough visual sanity check that it's a real, dense QR pattern and not a blank/placeholder box is meaningfully better than assuming).
2. Confirm balance, code, Apple Wallet button (if `pass_url` is present for this test card), and logo/shop-name all still render correctly with the new styling.
3. Confirm the expired-gift-card branch (`gift_card.enabled == false or gift_card.expired`) renders sensibly — test with an expired/disabled test card if you can create one, otherwise reason through the Liquid conditions carefully and disclose that this branch specifically wasn't live-tested.
4. Both breakpoints, contrast, `alt` text on both the QR code and the logo/placeholder image.

- [ ] **Step 5: Commit**

```bash
git add templates/gift_card.liquid locales/en.default.json
git commit -m "feat: style gift card page and add QR code"
```

---

## Self-Review Notes

- **Spec coverage**: this plan closes out §5.6, §5.7, §5.8, §5.10, §5.11 — combined with the already-shipped §5.9 (contact page), this completes ALL of §5's required templates. After this plan, every template listed in the spec's §5 exists in a real, styled, feature-complete state; only §13 phases 10–12 (accessibility/performance audit, full manual QA, submission docs) remain in the entire project.
- **Task 3 is the highest-risk task in this plan**, by the same pattern as predictive search in the blog-search plan: it's the one place where this plan's own research (done at plan-writing time, not guessed) found a real gap between documented filter behavior and Shopify's own official reference theme's actual shipped code. The task brief deliberately front-loads Tasks 1–2 (lower-risk, more mechanical restyling work) so schedule pressure doesn't rush Task 3's verification, and explicitly requires re-verification against Dawn's *current* live source rather than trusting this plan's own point-in-time research as final.
- **Both 404 and password are awkward to live-verify** (a working store isn't naturally 404'd or password-gated) — Task 1's own verification steps address this directly (a nonsense URL always 404s; `/password` is always reachable regardless of whether protection is actually enabled) rather than skipping live verification for these two pages.
- **No new JS beyond Task 3's QR library** — 404's search bar reuses the already-shipped, already-tested `predictive-search.js`/`predictive-search.liquid` snippet pair verbatim; nothing else in this plan needs new client-side behavior.
- **Collection-list's featured-image-fallback property path is flagged, not assumed** — `collection.products.first.featured_image` is very likely correct (it follows the same pattern as everywhere else `.first` is used on a paginated/array object in this theme) but Task 2 explicitly requires a real doc check before shipping it, consistent with this project's repeated experience that a wrong Liquid property guess fails silently rather than loudly.
