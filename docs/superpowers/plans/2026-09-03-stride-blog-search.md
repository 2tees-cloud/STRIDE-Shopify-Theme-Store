# STRIDE Blog, Article, Search & Predictive Search

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the skeleton-theme's placeholder blog/article/search templates (currently: unstyled but structurally present — this baseline is more complete than the product/collection/cart pages were before their own overhauls) into the spec §5.4/§5.5-compliant pages, and build the **predictive search** component this project has deferred twice already (flagged in both the header-layout plan and the collection-page plan as un-scheduled future work). This is phase 8 of spec §13's roadmap, continuing straight after the cart-page plan.

**Scope note on the existing baseline**: unlike product/collection/cart, `sections/blog.liquid`/`article.liquid`/`search.liquid` already have real structural logic (pagination, comment forms, mixed-result-type search) from the skeleton-theme scaffold — they're unstyled and missing a few spec-required pieces (comment success messaging, untruncated-content confirmation, real styling matching the rest of the theme), not architecturally empty. Don't rewrite what's already structurally correct; extend and style it.

**Predictive search is the one genuinely new, substantial feature in this plan.** It has never been built in this project before. It needs to be a SHARED component — the same snippet/JS rendered from both the header's search icon (currently a bare link to `/search`, no dropdown at all) and the search results page's own search box (currently a plain `<input>` + submit). Task 3 is scoped separately from Tasks 1-2 specifically because it touches `sections/header.liquid` — this project's highest-risk file, site of its worst historical bug (a permanently non-functional desktop nav that went undetected for two review rounds) — so it gets its own task, its own careful review, and explicit instructions not to disturb anything else in that file.

**Tech Stack:** Shopify Liquid, native CSS, vanilla JS (predictive search only — blog/article/search pages need no JS, matching this project's established "JS only where the feature genuinely requires it" discipline).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §5.4 (Blog/Article), §5.5 (Search), relevant lines of §3.2 (predictive search as a header component) and §6 (predictive search — header + search page).

## Global Constraints

(Carried over from all prior plans; every task below implicitly inherits these.)

- A `shopify theme dev` session should be available in this environment — use it for real live verification, not static reasoning. Re-attempt if it's down; this project has had genuine live-browser capability for the last two plans, use it fully.
- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never reuse `--color-border` for a new interactive element's boundary without checking contrast first — use `--color-foreground-muted`, matching every prior fix in this project (this exact mistake has recurred on nearly every plan that added new bordered UI).
- Touch targets ≥24×24 CSS px on every interactive element.
- `prefers-reduced-motion` respected wherever animation/transition is added (the predictive search dropdown's open/close transition, if any).
- Any section-root element meant to span the full viewport needs the `.full-width` utility, with its own horizontal mobile padding — checked fresh every time, this has been the single most common regression across recent plans.
- **`{% stylesheet %}`, `{% javascript %}`, and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.** This exact mistake has occurred 5+ times across this project's plans (`theme-check` cannot catch it — only a live render does).
- **`{% javascript %}` inside a snippet (not a section/block) has a confirmed, real bug in this project's `shopify theme dev` local asset bundler** — it does NOT correctly extract just the javascript-tag content, instead dumping the whole file's other text ahead of the actual function body, producing a silent `SyntaxError` (found and fixed in the immediately-recent live-verification pass on the product page's size-chart modal). If Task 3's predictive-search snippet needs JS, do NOT put it in the snippet's own `{% javascript %}` block — put it in a proper `assets/*.js` file loaded via `<script src>`, the same fix pattern already established.
- **Any new locale key must be added to the correct file**: `| t` in body markup → `locales/en.default.json`; `t:` inside `{% schema %}` → `locales/en.default.schema.json`. Reuse existing keys where they already cover the exact same meaning (`search.title`/`search.placeholder`/`search.submit`/`search.no_results_html`/`search.results_for_html` already exist from the skeleton baseline — check before adding near-duplicates).
- **Genuinely-unconfirmed-at-plan-writing-time Liquid/API shapes must be verified against real documentation before being treated as correct**: this plan flags `article.excerpt_or_content` (vs. the skeleton baseline's `article.excerpt`), `form.posted_successfully?` on the comment form, and — the biggest one — Shopify's predictive search endpoint/response shape, which has never been used anywhere in this project. Use the `shopify-liquid` skill's documentation search tool (or a live WebFetch of shopify.dev) the way every recent plan in this project has for exactly this kind of verification.
- No Lorem Ipsum in default values; every setting has a `label`; every image needs accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, reuse `snippets/image.liquid` for article/result images, reuse `.visually-hidden` from `assets/critical.css`, reuse existing tokens/spacing scale.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/blog.liquid` | rewrite | Blog listing: title, article cards (image/title/excerpt/date/author), pagination |
| `sections/article.liquid` | rewrite | Article detail: content, date/author, paginated comments, working comment form with success/error messaging |
| `sections/search.liquid` | rewrite | Search results: mixed result types labeled distinctly, no-results state, pagination |
| `snippets/predictive-search.liquid` | create | Shared search input + results dropdown markup, rendered from both the header and the search page |
| `assets/predictive-search.js` | create | Debounced fetch-as-you-type, results rendering, keyboard navigation |
| `sections/header.liquid` | modify | Replace the bare search icon-link with the predictive-search trigger — minimal, careful edit only |
| `locales/en.default.json` | modify | New storefront-facing keys (comment success/error, predictive search labels) |
| `locales/en.default.schema.json` | modify | New `t:` keys if any settings are added |

No files are deleted.

---

## Task 1: Blog and article pages

**Files:**
- Rewrite: `sections/blog.liquid`, `sections/article.liquid`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `snippets/image.liquid`, existing `blog.*` locale keys from the skeleton baseline.
- Produces: nothing else in this plan depends on Task 1.

- [ ] **Step 1: Verify `article.excerpt_or_content` before using it**

The skeleton baseline uses `article.excerpt` (falls back to nothing if the merchant hasn't written a manual excerpt). Spec §5.4 explicitly asks for `article.excerpt_or_content` — confirm this is a real Shopify Liquid property (it should automatically fall back to a truncated version of the full content when no manual excerpt exists, which is exactly the untruncated-content-with-a-sane-fallback behavior the spec wants) against real documentation before using it. If it doesn't exist or behaves differently than expected, use the correct real mechanism instead and document what you found.

- [ ] **Step 2: Rewrite the blog listing section**

Rewrite `sections/blog.liquid` with real styling — a card grid (image, title, excerpt, date, author), matching the visual language already established on the collection page's product-card grid (`snippets/product-card.liquid`) for consistency, not inventing a new card style from scratch. Keep the existing pagination structure (`{% paginate blog.articles by N %}`), verify the `by` count is a sane default (the skeleton's `by 5` is very low for a real blog — consider raising it, e.g. to 12, matching the collection page's convention). Add a `.full-width` root with its own mobile padding, per the Global Constraints. Confirm `article.title`/`article.image` render untruncated (no `| truncate` anywhere).

- [ ] **Step 3: Rewrite the article detail section — the comment flow is the part that needs real work**

Rewrite `sections/article.liquid`. The skeleton baseline's comment form has NO success-state handling at all — it always renders the form, even right after a successful submission, with no confirmation the comment was received. Spec §5.4 explicitly requires "a working comment submit flow (success/error messaging) without requiring moderation to function." Fix this:

```liquid
{% form 'new_comment', article %}
  {% if form.posted_successfully? %}
    <p class="article-comments__success">{{ 'blog.comment_success' | t }}</p>
  {% else %}
    {% if form.errors %}
      <div class="article-comments__errors">
        {{ form.errors | default_errors }}
      </div>
    {% endif %}
    {% comment %} ...existing name/email/body fields... {% endcomment %}
  {% endif %}
{% endform %}
```

Verify `form.posted_successfully?` is the correct real property for the `new_comment` form type (it's used elsewhere in this theme's convention for other forms — e.g. the gift-card/newsletter forms use `form.posted_successfully?` already, so this should be a safe, already-proven pattern in this codebase, but confirm the `new_comment` form specifically supports it the same way before assuming). Also handle the "comment posted but pending moderation" case if `blog.moderated?` is true and the comment isn't immediately visible — check whether `form.posted_successfully?` alone is sufficient messaging for that case or whether the copy needs to account for possible moderation delay (the spec's "without requiring moderation to function" phrase means the FORM must work regardless of moderation settings, not that moderation is disabled — don't accidentally imply comments always appear immediately if this store/theme doesn't control that setting).

Style to match the theme (article header, content typography reusing `product-description`'s rich-text CSS conventions where applicable, comment list, comment form). Add `.full-width` + mobile padding per Global Constraints.

- [ ] **Step 4: Add the storefront locale keys**

Check `locales/en.default.json`'s existing `blog` object first (has several keys from the skeleton baseline already) — add only what's missing: `"comment_success": "Your comment has been posted."` (or similar — write real copy, no Lorem Ipsum).

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser at BOTH breakpoints, with real content**

```bash
shopify theme dev
```

You'll need a real blog with real articles in the connected dev store — check whether one already exists (this project's dev store has had various content added across prior plans); if not, create one via the Admin API with at least 2-3 real articles, at least one with a real featured image, at least one with `blog.comments_enabled?` on.

1. Visit the blog listing — confirm real article cards render with images/titles/excerpts/dates/authors, untruncated.
2. Click into an article — confirm full content renders, date/author correct.
3. If comments are enabled: submit a real comment, confirm success messaging renders (not just a page reload back to a blank form). Submit an invalid comment (e.g. missing required field) and confirm error messaging renders.
4. Confirm pagination works if you have enough articles/comments to trigger it.
5. Both breakpoints.
6. Check the browser console for errors.

- [ ] **Step 7: Commit**

```bash
git add sections/blog.liquid sections/article.liquid locales/en.default.json
git commit -m "feat: rebuild blog and article pages with real styling and working comment flow"
```

---

## Task 2: Search results page

**Files:**
- Rewrite: `sections/search.liquid`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `snippets/image.liquid`, existing `search.*` locale keys.
- Produces: nothing else in this plan depends on Task 2. Task 3 adds predictive search as a SEPARATE, progressive enhancement layered on top of this page's existing plain search form — it does not require this task's output to exist first, but re-read this section's actual state before Task 3 touches it.

- [ ] **Step 1: Rewrite the search results section**

Rewrite `sections/search.liquid` with real styling. The skeleton baseline already correctly handles mixed result types generically (`result.title`/`result.url`/`result.price` work across products/articles/pages via Liquid's polymorphic result object) — spec §5.5 wants these labeled DISTINCTLY, which the baseline does NOT currently do. Add a visible (or at minimum screen-reader-accessible) label distinguishing what kind of result each item is:

```liquid
{% for result in search.results %}
  <div class="search-result">
    <span class="search-result__type">{{ result.object_type | capitalize }}</span>
    {% comment %} ...existing image/title/price... {% endcomment %}
  </div>
{% endfor %}
```

Verify `result.object_type` is the correct real property (spec explicitly names it) and returns a sensible distinct value per type (`product`, `article`, `page` or similar) before finalizing — check real documentation.

Style the result grid to match the collection page's product-card grid where results ARE products (reuse `snippets/product-card.liquid` for product-type results specifically if practical — check whether `result` for a product-type search result exposes the same properties `product-card.liquid` needs, e.g. `.featured_image`/`.price_min`/`.compare_at_price_max`/`.available`; if not fully compatible, style a simpler unified result card instead rather than forcing an awkward reuse). Add `.full-width` + mobile padding.

- [ ] **Step 2: Add the storefront locale keys**

Check `locales/en.default.json`'s existing `search` object — likely no new keys needed if `result.object_type | capitalize` is used directly rather than custom copy, but add a locale key for the type label if you want translatable/customized wording instead of the raw capitalized Shopify value (e.g. `search.result_type_product`/`_article`/`_page`) — use your judgment on whether the raw value is acceptable or whether custom labels read better; document which you chose.

- [ ] **Step 3: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 4: Verify in the browser at BOTH breakpoints, with real mixed-type results**

```bash
shopify theme dev
```

1. Search for a term that matches real products in this dev store (e.g. part of "Stride Apex Runner" or a term from the Викрутки catalog) — confirm product results render with correct type labeling, image, title, price.
2. Search for a term matching a real blog article (from Task 1's test content) — confirm article results render with correct type labeling.
3. Search for something that matches nothing — confirm the no-results message renders correctly, not a blank/broken page.
4. Confirm pagination works if enough results exist.
5. Both breakpoints.
6. Check the browser console for errors.

- [ ] **Step 5: Commit**

```bash
git add sections/search.liquid locales/en.default.json
git commit -m "feat: rebuild search results page with distinct result-type labeling"
```

---

## Task 3: Predictive search — the new shared component

**Files:**
- Create: `snippets/predictive-search.liquid`, `assets/predictive-search.js`
- Modify: `sections/header.liquid` (minimal, careful edit — see below)
- Modify: `sections/search.liquid` (progressive enhancement only — the existing plain form must keep working exactly as Task 2 left it if JS fails)
- Modify: `layout/theme.liquid` (script loading, following the established `{% if template == 'X' %}`-gated pattern — except this component is needed on EVERY page since the header renders everywhere, so this load is NOT template-gated the way `product-variant-picker.js`/`collection-filters.js` were; load it globally, matching how `cart-drawer.js` is loaded, since the header (and therefore the predictive search trigger) is global too)
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `routes.search_url`, `routes.predictive_search_url` (verify this exact route object exists — flagged below).
- Produces: nothing else in this plan depends on Task 3. This is the last task.

Before starting, re-read `sections/header.liquid`'s and `sections/search.liquid`'s actual current state (post-Task-1/2) rather than assuming the plan's literal text is still exactly what's there.

**The genuinely unconfirmed core of this task, flagged prominently — do not guess, verify against real documentation first**: Shopify's predictive search mechanism. At minimum, confirm:
1. The exact endpoint/route (`routes.predictive_search_url`, or a hand-built `/search/suggest` URL — check which is the documented, correct approach).
2. The exact request format (query params for the search term, resource types to include — products/articles/pages — and any result limit).
3. The exact response format: does Shopify return pre-rendered HTML for a `predictive-search` section (i.e., a Section-Rendering-API-style JSON response with an HTML string per requested resource type, similar to how `sections=` works elsewhere in this theme), or a raw structured JSON payload you need to build result markup from client-side? This fundamentally changes how `assets/predictive-search.js` needs to be written — verify this BEFORE writing the fetch/render logic, not after.
4. Whether Shopify has a native `predictive-search` section type your theme needs to register a schema for (similar to how `main`/`cart`/`product`/`collection` are registered section types) or whether this is purely a theme-authored snippet+JS with no special Shopify-side section type involved.

This is exactly the kind of "looks right, might not be" risk this project's history has repeatedly shown needs real verification — a wrong assumption here wouldn't just silently misrender, it could mean the whole feature never works at all despite looking complete in the code.

- [ ] **Step 1: Build the shared predictive-search snippet**

Create `snippets/predictive-search.liquid` — this needs a real `<form>` (falls back to a normal full-page search submission if JS never loads or the fetch fails — progressive enhancement is mandatory here, matching this project's established pattern everywhere else) plus a results container for the JS to populate:

```liquid
{% doc %}
  Predictive search: a text input that becomes a live, keyboard-navigable
  results dropdown once assets/predictive-search.js loads. Falls back to
  a plain full-page search submission (routes.search_url) if JS never
  loads or a fetch fails — this form must be fully functional without
  JS, same discipline as every other form in this theme.

  Rendered from BOTH sections/header.liquid (as a trigger + panel) and
  sections/search.liquid (as a progressive enhancement over the page's
  own search box) — one snippet, one JS file, no duplicated logic.

  @param {string} [id_prefix] - Unique prefix for this instance's element IDs, since this snippet may render more than once per page (header + search page)

  @example
  {% render 'predictive-search', id_prefix: 'HeaderSearch' %}
{% enddoc %}

<div class="predictive-search" data-predictive-search>
  <form action="{{ routes.search_url }}" method="get" role="search" class="predictive-search__form">
    <label for="{{ id_prefix }}-Input" class="visually-hidden">{{ 'search.title' | t }}</label>
    <input
      type="search"
      name="q"
      id="{{ id_prefix }}-Input"
      class="predictive-search__input"
      value="{{ search.terms | escape }}"
      placeholder="{{ 'search.placeholder' | t }}"
      autocomplete="off"
      role="combobox"
      aria-expanded="false"
      aria-controls="{{ id_prefix }}-Results"
      data-predictive-search-input
    >
    <button type="submit" class="predictive-search__submit">
      <span class="visually-hidden">{{ 'search.submit' | t }}</span>
      {{ 'icon-search.svg' | inline_asset_content }}
    </button>
  </form>

  <div id="{{ id_prefix }}-Results" class="predictive-search__results" data-predictive-search-results hidden role="listbox"></div>
</div>

{% stylesheet %}
  .predictive-search {
    position: relative;
  }
  .predictive-search__form {
    display: flex;
    align-items: center;
    border: 1px solid var(--color-foreground-muted);
  }
  .predictive-search__input {
    flex: 1;
    border: none;
    background: none;
    padding: var(--space-2) var(--space-3);
    font: inherit;
    color: var(--color-foreground);
    min-height: 24px;
  }
  .predictive-search__submit {
    background: none;
    border: none;
    cursor: pointer;
    min-width: 24px;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-foreground);
    padding: var(--space-2);
  }
  .predictive-search__results {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    right: 0;
    background-color: var(--color-surface);
    border: 1px solid var(--color-foreground-muted);
    max-height: 24rem;
    overflow-y: auto;
    z-index: 15;
  }
  .predictive-search__results[hidden] {
    display: none;
  }
{% endstylesheet %}
```

The `z-index: 15` is deliberately below the header's own sticky z-index (10 is the HEADER's z-index, so 15 for a results dropdown that needs to sit above nearby page content but doesn't need to compete with the header itself since it's rendered WITHIN the header when used there — verify this actually looks right live, adjust if the dropdown needs to appear above/below the header's own stacking differently than assumed here, and don't let it conflict with the cart-drawer/mobile-nav's 20/21 z-index values).

- [ ] **Step 2: Build the JS — after verifying the actual API shape from Step-0's documentation research**

Create `assets/predictive-search.js`. The exact fetch/render logic depends entirely on what you found verifying the API shape — do not treat this as a fill-in-the-blank template, write it to match reality. At minimum it needs: debounced input handling (don't fetch on every keystroke), a fetch to the correct real endpoint, rendering results into the `[data-predictive-search-results]` container (grouped by type — products/articles/pages, matching Task 2's distinct-labeling approach for consistency), keyboard navigation (Arrow Up/Down to move through results, Enter to navigate, Escape to close), click-outside-to-close, and correct `aria-expanded`/`role="option"` ARIA state management for the `combobox` pattern on the input. Follow this project's established `initX(root)` + `shopify:section:load` re-init convention.

Since this snippet renders from BOTH the header (loaded globally, present on every page) and potentially the search page, make sure `initPredictiveSearch` correctly handles MULTIPLE instances on the same page without them interfering with each other (each instance's results container/input pair must be scoped independently — don't let opening one instance's dropdown affect the other's state).

- [ ] **Step 3: Wire the header — minimal, careful edit only**

Re-read `sections/header.liquid`'s actual current header-icons markup first. Replace the bare search `<a href="{{ routes.search_url }}">` link with a trigger that opens the predictive-search panel (a `<button>` toggling visibility of a `{% render 'predictive-search', id_prefix: 'HeaderSearch' %}` panel, similar in spirit to how the mobile nav trigger/panel pattern already works in this same file — reuse that established interaction pattern rather than inventing a new one, but keep this specific change as narrowly scoped as possible: do not touch the sticky header logic, the mobile nav logic, the localization forms, or the account/cart icons in this same file). Confirm this doesn't regress ANYTHING else in this file — this is the highest-risk edit in this whole plan given this file's history.

- [ ] **Step 4: Layer predictive search onto the search page**

Re-read `sections/search.liquid`'s actual current state (post-Task-2). Replace its plain search form with `{% render 'predictive-search', id_prefix: 'SearchPageSearch' %}` — confirm the existing full-page search RESULTS rendering (Task 2's work) is untouched; only the search INPUT at the top of the page becomes the shared predictive component, everything below it stays exactly as Task 2 built it.

- [ ] **Step 5: Load the script globally**

Add to `layout/theme.liquid`, unconditional (not template-gated, since the header — and therefore this trigger — renders on every page):

```liquid
<script src="{{ 'predictive-search.js' | asset_url }}" defer></script>
```

Place it near the existing `cart-drawer.js` load, matching that file's global-loading convention.

- [ ] **Step 6: Add the locale keys**

Add whatever new keys your implementation needs (e.g. `search.predictive_no_results`, `search.view_all_results`) — check existing `search.*` keys first, reuse where the meaning already matches.

- [ ] **Step 7: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 8: Verify in the browser at BOTH breakpoints — this is the highest-stakes verification in this plan**

```bash
shopify theme dev
```

1. From the header (on any page), click the search trigger, type a real search term matching a real product — confirm results appear in the dropdown WITHOUT a page navigation, confirm they're correctly grouped/labeled by type if multiple types match.
2. Test keyboard navigation: Tab to the input, type, Arrow Down through results, Enter to navigate to a result.
3. Test Escape closes the dropdown, test clicking outside closes it.
4. Test with JS effectively unavailable (or reason through it very carefully if you can't easily disable JS in your test environment): confirm the form still submits to a real full-page search results page (Task 2's work) correctly.
5. On the search results page itself, confirm the SAME predictive dropdown works from that page's own search box, and confirm it doesn't interfere with the page's own already-rendered results below it.
6. **Explicitly re-verify the header's EXISTING functionality is undisturbed**: sticky header behavior, mobile nav open/close, localization forms, account/cart icons — this file's history means this check is not optional.
7. Both breakpoints — the mobile experience for a search dropdown needs particular attention (does it take over the full screen, or overlay awkwardly in a small viewport?).
8. Check the browser console for errors throughout, especially around whatever the actual predictive search API response shape turned out to be.

- [ ] **Step 9: Commit**

```bash
git add snippets/predictive-search.liquid assets/predictive-search.js sections/header.liquid sections/search.liquid layout/theme.liquid locales/en.default.json
git commit -m "feat: add predictive search shared between header and search page"
```

---

## Self-Review Notes

- **Spec coverage**: §5.4's blog/article requirements (untruncated content, working comment flow with success/error messaging) covered in Task 1. §5.5's search requirements (distinct result-type labeling, no-results state, predictive search) covered across Tasks 2-3. This closes out the last two explicitly-deferred items from earlier plans in this project (predictive search from the header-layout plan; the general "search/blog polish" implied but not detailed in the collection-page plan's own scope boundaries).
- **Task 3 is the highest-risk task in this plan, by a wide margin** — it's the first genuinely new JS feature built in this project since the AJAX cart/variant-picker/collection-filter work, it touches `sections/header.liquid` (this project's historically most bug-prone file), and its core mechanism (Shopify's predictive search API) has never been used anywhere in this codebase before. The plan deliberately front-loads Tasks 1-2 (lower-risk, more mechanical work) so any schedule pressure doesn't rush Task 3's verification.
- **Progressive enhancement is non-negotiable for Task 3**: the predictive search trigger must degrade to a normal full-page search submission if JS fails, matching every other interactive feature this project has built (variant picker, collection filters, cart page). Do not ship a predictive-search-only search experience with no fallback.
- **The snippet-level `{% javascript %}` bug this project already found and fixed once (on the product page's size-chart modal) is explicitly called out in the Global Constraints** specifically so Task 3 doesn't reintroduce it — `assets/predictive-search.js` is a real asset file from the start, not a snippet-embedded script, precisely to avoid that already-diagnosed failure mode.
