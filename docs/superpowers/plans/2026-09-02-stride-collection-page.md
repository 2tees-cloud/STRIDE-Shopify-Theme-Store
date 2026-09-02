# STRIDE Collection Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the skeleton-theme's placeholder `sections/collection.liquid` (currently: a bare `<h1>`, an unstyled product grid with fixed 500px columns, no filtering/sorting) into the spec §5.2-compliant collection page — real product cards, faceted filtering, sorting, sale badges, unit pricing, and an accessible empty state.

**Environment note carried over from the immediately prior plan, still in effect:** the `shopify theme dev` session's OAuth token expired and could not be non-interactively restored; repeated re-attempts across that entire plan all hit the same device-code browser-login wall. Try it again at the start of this plan's first task — if it's recovered, do full live verification throughout (this would be the first live confirmation in two plans). If it's still blocked, continue the same disclosed-static-verification discipline that plan established: every implementer states explicitly, per claim, whether it's live-confirmed or reasoned statically — never blur the two, never fabricate a live result. That prior plan's final review found real bugs static reasoning alone missed (two Critical layout issues), so treat static-only verification as a real, acknowledged risk to carry forward and prioritize catching up on, not a formality.

**Architecture:** Shopify Liquid, native CSS, one JS-enhancement layer for filtering/sorting. Faceted filtering and sorting share ONE `<form>` (this is how Shopify's own `collection.filters`/`collection.sort_options` APIs are designed to work together — a single form submission carries both). The form works via a plain GET submission by default (fully functional, accessible, and indexable without JS — matching this project's established "server-correct-first, JS-enhances" pattern already used for drop-countdown, mobile-nav, and cart-drawer); Task 3 layers an AJAX enhancement on top using the Section Rendering API (`?sections=main`, the same mechanism already proven for `cart-drawer.js`'s drawer refresh) to update just the product grid without a full page reload, syncing the URL via `history.pushState`.

**Tech Stack:** Shopify Liquid, native CSS, vanilla JS (filter/sort form AJAX enhancement only — the base experience needs no JS at all).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §5.2 (Collection), relevant lines of §6 (faceted search filtering, unit pricing).

## Global Constraints

(Carried over from all prior plans; every task below implicitly inherits these.)

- **Every new piece must be verified with REAL, populated content (a real collection with several products spanning different prices/availability, at least one with a real compare-at price) at BOTH mobile (<750px) and desktop (≥750px) widths.** The "Викрутки" collection used in an earlier plan (80 real products) is a candidate — confirm it's still populated before reusing it, or find/create another real collection with enough product variety to actually exercise filtering and sorting (a collection with only 1-2 products can't meaningfully test faceted filters).
- **Live-verify with a genuinely populated collection AND confirm the empty-collection message actually renders correctly with a genuinely empty one** — don't only test the happy path.
- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never use `--color-accent-secondary` as small text. The prior plan found `--color-border` fails 3:1 on this theme's actual background token (1.30:1) — do not reuse `--color-border` for any new interactive element's boundary (filter checkboxes, sort dropdown, sale badge) without checking contrast first; use `--color-foreground-muted` where a subtle border is needed, matching the prior plan's established fix.
- Touch targets ≥24×24 CSS px on every interactive element (filter checkboxes/labels, sort dropdown, pagination links, product card links).
- `prefers-reduced-motion` respected wherever animation/transition is added.
- Any section-root element meant to span the full viewport needs the `.full-width` utility, with its own horizontal mobile padding (`padding-inline`) — checked fresh every time.
- **`{% stylesheet %}`, `{% javascript %}`, and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.** This exact mistake has occurred 4+ times across this project's plans.
- **Any new locale key must be added to the correct file**: `| t` in body markup → `locales/en.default.json`; `t:` inside `{% schema %}` → `locales/en.default.schema.json`.
- No Lorem Ipsum in default values; every setting has a `label`; every image needs accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, reuse `snippets/image.liquid` for product/collection images (already handles varying aspect ratios when no fixed `width`/`height`/`crop` is forced — don't force a crop on product card images, since spec requires the grid to handle varying image aspect ratios, not force-crop them all to a fixed square), reuse existing tokens/spacing scale.
- **Genuinely unconfirmed Shopify Liquid API shapes must be verified against real documentation before being treated as correct** — this plan flags several (`collection.filters`' exact object shape, `collection.sort_options`/`sort_by`'s exact shape) that were not confirmed at plan-writing time. A `shopify-liquid` skill with a documentation search tool has been used successfully for exactly this kind of verification in prior plans in this project — use it (or equivalent) before writing filter/sort code, don't guess from memory.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/collection.liquid` | rewrite | Collection header, product grid, empty state, pagination |
| `snippets/product-card.liquid` | create | Reusable product card (title, price, image, unit price, sale badge) — also usable by a future `collection-index`/related-products refresh, though this plan only wires it into the collection page |
| `snippets/collection-filters.liquid` | create | Faceted filter + sort form |
| `assets/collection-filters.js` | create | AJAX enhancement: intercept form submit, fetch via Section Rendering API, swap grid, sync URL |
| `templates/collection.json` | modify | Reference a real, populated collection for verification |
| `locales/en.default.json` | modify | Storefront-facing keys (sale badge, empty state, filter/sort labels) |
| `locales/en.default.schema.json` | modify | New `t:` keys for section settings |

No files are deleted. `sections/collection.liquid`'s current bare-bones content is fully replaced (same situation as the product page — the skeleton-theme scaffold was always a starting point).

---

## Task 1: Collection header, product card, grid, empty state, pagination

**Files:**
- Rewrite: `sections/collection.liquid`
- Create: `snippets/product-card.liquid`
- Modify: `templates/collection.json`, `locales/en.default.json`, `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-foreground`, `--color-foreground-muted`, `--color-urgency`, `--space-1`–`--space-8` (existing tokens), `snippets/image.liquid` (existing).
- Produces: the grid container and card markup Task 2's filter form will sit above, and Task 3's AJAX refresh will target via Section Rendering API — give the grid a stable `id`/data-hook now (`data-collection-grid` or similar) even though nothing reads it yet, so Task 2/3 don't need to touch this file again for that.

- [ ] **Step 1: Create the reusable product card snippet**

Create `snippets/product-card.liquid`:

```liquid
{% doc %}
  Renders one product card for a collection grid: image (natural aspect
  ratio, not force-cropped — the grid must handle varying image aspect
  ratios per spec), title, price, sale badge, unit price when
  configured, and a sold-out indicator when the product has no
  available variants.

  @param {product} product - The product to render

  @example
  {% render 'product-card', product: product %}
{% enddoc %}

<a href="{{ product.url }}" class="product-card">
  <div class="product-card__media">
    {% if product.featured_image %}
      {% render 'image', image: product.featured_image, class: 'product-card__image' %}
    {% else %}
      <div class="product-card__image product-card__image--placeholder"></div>
    {% endif %}

    {% if product.compare_at_price_max > product.price_max %}
      <span class="product-card__badge product-card__badge--sale">{{ 'product.on_sale' | t }}</span>
    {% elsif product.available == false %}
      <span class="product-card__badge product-card__badge--sold-out">{{ 'product.sold_out' | t }}</span>
    {% endif %}
  </div>

  <div class="product-card__content">
    <h3 class="product-card__title">{{ product.title }}</h3>

    <div class="product-card__price">
      {% if product.price_varies %}
        <span class="product-card__price-value">{{ 'product.price_from' | t: price: product.price_min | money }}</span>
      {% elsif product.compare_at_price_max > product.price_max %}
        <span class="product-card__price-compare-at">{{ product.compare_at_price_max | money }}</span>
        <span class="product-card__price-value product-card__price-value--sale">{{ product.price_max | money }}</span>
      {% else %}
        <span class="product-card__price-value">{{ product.price_max | money }}</span>
      {% endif %}
    </div>

    {% if product.selected_or_first_available_variant.unit_price_measurement %}
      {% assign unit_variant = product.selected_or_first_available_variant %}
      <span class="product-card__unit-price">
        {{ unit_variant.unit_price | money }}/{{ unit_variant.unit_price_measurement.reference_value }}{{ unit_variant.unit_price_measurement.reference_unit }}
      </span>
    {% endif %}
  </div>
</a>

{% stylesheet %}
  .product-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    text-decoration: none;
    color: var(--color-foreground);
  }
  .product-card__media {
    position: relative;
  }
  .product-card__image--placeholder {
    aspect-ratio: 1 / 1;
    background-color: var(--color-background-alt);
  }
  .product-card__badge {
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
    padding: var(--space-1) var(--space-2);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .product-card__badge--sale {
    background-color: var(--color-urgency);
    color: var(--color-on-accent);
  }
  .product-card__badge--sold-out {
    background-color: var(--color-foreground-muted);
    color: var(--color-background);
  }
  .product-card__title {
    font-size: 1rem;
    font-weight: 400;
    margin: 0;
  }
  .product-card__price {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }
  .product-card__price-compare-at {
    text-decoration: line-through;
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
  }
  .product-card__price-value--sale {
    color: var(--color-urgency);
    font-weight: 700;
  }
  .product-card__unit-price {
    color: var(--color-foreground-muted);
    font-size: 0.75rem;
  }
{% endstylesheet %}
```

Flagged for verification, not assumed correct: `product.price_varies`/`product.price_min`/`product.price_max`/`product.compare_at_price_max`/`product.available` are all real, documented Shopify Liquid `product` object properties — but confirm the exact semantics of `price_varies` (does it mean "min ≠ max across variants," triggering the "From $X" display?) against real documentation before relying on it, since getting this wrong would show a misleading price on a multi-variant product. Also confirm `'product.price_from' | t: price: ...` correctly composes with a `| money`-filtered value the way this project's established pattern handles similar cases (assign the formatted money value to a variable first, then interpolate into the translation — do NOT pipe `| money` after the `| t` filter, since translating a sentence and then trying to money-format the whole string was a real bug this project hit and fixed early on; check `sections/cart-drawer.liquid`'s free-shipping-remaining message if you want to see the established correct pattern).

- [ ] **Step 2: Rewrite the collection section**

Replace `sections/collection.liquid` entirely:

```liquid
{% comment %}
  Collection page: header (title/description/image), product grid,
  empty-collection message, pagination. Faceted filtering and sorting
  are added on top of this in Task 2 (a form above the grid) and
  Task 3 (AJAX enhancement) — this task ships the fully-functional
  base experience those build on.
{% endcomment %}

<div class="collection full-width">
  <div class="collection__header">
    {% if collection.image %}
      <div class="collection__image">
        {% render 'image', image: collection.image, class: 'collection__image-inner' %}
      </div>
    {% endif %}
    <h1 class="collection__title">{{ collection.title }}</h1>
    {% if collection.description != blank %}
      <div class="collection__description">{{ collection.description }}</div>
    {% endif %}
  </div>

  {% paginate collection.products by 24 %}
    {% if collection.products.size > 0 %}
      <div class="collection__grid" data-collection-grid>
        {% for product in collection.products %}
          {% render 'product-card', product: product %}
        {% endfor %}
      </div>

      {% if paginate.pages > 1 %}
        <nav class="collection__pagination" aria-label="{{ 'collection.pagination' | t }}">
          {{ paginate | default_pagination }}
        </nav>
      {% endif %}
    {% else %}
      <p class="collection__empty">{{ 'collection.empty' | t }}</p>
    {% endif %}
  {% endpaginate %}
</div>

{% stylesheet %}
  .collection {
    padding-block: var(--space-8);
    padding-inline: var(--space-4);
  }
  @media (min-width: 750px) {
    .collection {
      padding-inline: var(--space-6);
    }
  }
  .collection__header {
    text-align: center;
    max-width: 40rem;
    margin: 0 auto var(--space-6);
  }
  .collection__image {
    max-width: 20rem;
    margin: 0 auto var(--space-4);
  }
  .collection__title {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0 0 var(--space-2);
  }
  .collection__description {
    color: var(--color-foreground-muted);
  }
  .collection__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
  @media (min-width: 750px) {
    .collection__grid {
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-6);
    }
  }
  .collection__pagination {
    margin-top: var(--space-8);
    display: flex;
    justify-content: center;
  }
  .collection__pagination a {
    min-width: 24px;
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
  }
  .collection__empty {
    text-align: center;
    color: var(--color-foreground-muted);
    padding-block: var(--space-8);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.collection",
  "settings": []
}
{% endschema %}
```

- [ ] **Step 3: Add the storefront and schema locale keys**

In `locales/en.default.json`, add to the existing `product` object (from the product-page plan): `"on_sale": "Sale"` (check first — `product.on_sale` may already exist from the product page plan's price block; reuse it, don't duplicate), `"price_from": "From {{ price }}"`. Add a new top-level `collection` object (insert alphabetically): `"empty": "No products found in this collection.", "pagination": "Pagination"`.

In `locales/en.default.schema.json`, confirm `general.collection` already exists (it does, from the skeleton baseline) — no new schema keys needed for this task since the section has no settings.

- [ ] **Step 4: Point `templates/collection.json` at a real, populated collection for verification**

Read `templates/collection.json`'s current content first — it's the bare skeleton (`{"sections": {"main": {"type": "collection", "settings": {}}}, "order": ["main"]}`, no way to pin a specific collection since `collection.json` renders whatever collection URL is visited, not a fixed one). This template doesn't need editing to "point at" a collection — Shopify resolves `collection` dynamically from the visited URL. Instead: confirm a real collection with several products (varying prices, at least one with a real compare-at price, at least one sold-out if possible) exists in the connected dev store for live verification — the "Викрутки" collection used in an earlier plan (80 real products) is a strong candidate if it's still populated; verify this directly rather than assuming a prior plan's state still holds.

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser at BOTH breakpoints, with a real populated collection AND a real empty one**

```bash
shopify theme dev
```

(Re-attempt this first if the session was down at the end of the prior plan — report explicitly whether it's recovered.)

1. Visit the real populated collection's URL. Confirm the header (title, description if set, image if set) renders. Confirm the grid shows real product cards with real titles/prices/images. Confirm a product with a real compare-at price shows the sale badge and correct struck-through/sale pricing. Confirm image aspect ratios aren't force-cropped (if the test collection has products with differently-shaped images, confirm the grid doesn't break/overlap).
2. If the collection has more than 24 products, confirm pagination renders and works.
3. Visit or create a genuinely empty collection (0 products) and confirm the empty-collection message renders correctly (not a broken/blank grid).
4. Confirm both breakpoints (2-column grid <750px, 4-column ≥750px).
5. Check the browser console for errors.

- [ ] **Step 7: Commit**

```bash
git add sections/collection.liquid snippets/product-card.liquid templates/collection.json locales/en.default.json locales/en.default.schema.json
git commit -m "feat: rebuild collection page with real product cards, grid, and empty state"
```

---

## Task 2: Faceted filtering and sorting (server-rendered, fully functional without JS)

**Files:**
- Modify: `sections/collection.liquid` (mount point for the filter/sort form)
- Create: `snippets/collection-filters.liquid`
- Modify: `locales/en.default.json`, `locales/en.default.schema.json`

**Interfaces:**
- Consumes: Task 1's `.collection__grid[data-collection-grid]` and overall section structure.
- Produces: a real, working `<form>` that Task 3's JS will progressively enhance — the form must be fully functional via plain GET submission BEFORE Task 3 adds any JS, since that's the accessibility/no-JS-degradation baseline this whole plan is built around.

Before starting, re-read `sections/collection.liquid`'s actual current state (post-Task-1) rather than assuming the plan's literal text above is still exactly what's there.

**A genuine open question flagged for the implementer**: `collection.filters`' exact object shape (does each filter have `.type` as a string like `'list'`/`'price_range'`/`'boolean'`? what's the exact property name for a filter's display label — `.label`? what's each value's shape — does it have `.url_to_add`/`.url_to_remove` for building filter links, or does the theme need to hand-build query strings?) and `collection.sort_options`/`.sort_by`'s exact shape were NOT confirmed at plan-writing time. **Verify these against real Shopify Liquid documentation before writing this snippet** — use the `shopify-liquid` skill's documentation search tool (or equivalent) the way prior tasks in this project have for exactly this kind of verification. The code below is a reasonable starting structure based on Shopify's publicly documented filtering API, but treat every property access as unconfirmed until you've checked it against real docs.

- [ ] **Step 1: Create the filter/sort snippet**

Create `snippets/collection-filters.liquid` — this draft's exact property names need verification per the flag above:

```liquid
{% doc %}
  Faceted filter + sort form for the collection grid. Works via plain
  GET submission (fully functional, accessible, indexable without JS)
  — Task 3 layers an AJAX enhancement on top of this exact form, it
  does not replace it. If JS fails to load, this form still filters
  and sorts correctly via a full page reload.

  @example
  {% render 'collection-filters', collection: collection, results: results %}
{% enddoc %}

<form class="collection-filters" data-collection-filters method="get" action="{{ collection.url }}">
  <div class="collection-filters__sort">
    <label for="CollectionSortBy-{{ section.id }}">{{ 'collection.sort_by' | t }}</label>
    <select name="sort_by" id="CollectionSortBy-{{ section.id }}" data-collection-sort>
      {% for option in collection.sort_options %}
        <option value="{{ option.value }}" {% if option.value == collection.sort_by %}selected{% endif %}>
          {{ option.name }}
        </option>
      {% endfor %}
    </select>
  </div>

  {% if collection.filters.size > 0 %}
    <div class="collection-filters__facets">
      {% for filter in collection.filters %}
        <fieldset class="collection-filters__facet">
          <legend>{{ filter.label }}</legend>

          {% case filter.type %}
            {% when 'list' %}
              {% for value in filter.values %}
                <label class="collection-filters__value">
                  <input
                    type="checkbox"
                    name="{{ value.param_name }}"
                    value="{{ value.value }}"
                    {% if value.active %}checked{% endif %}
                    {% if value.count == 0 and value.active == false %}disabled{% endif %}
                  >
                  {{ value.label }} ({{ value.count }})
                </label>
              {% endfor %}
            {% when 'price_range' %}
              <div class="collection-filters__price-range">
                <label>
                  {{ 'collection.price_min' | t }}
                  <input type="number" name="{{ filter.min_value.param_name }}" value="{{ filter.min_value.value }}" placeholder="{{ filter.range_min | money }}">
                </label>
                <label>
                  {{ 'collection.price_max' | t }}
                  <input type="number" name="{{ filter.max_value.param_name }}" value="{{ filter.max_value.value }}" placeholder="{{ filter.range_max | money }}">
                </label>
              </div>
          {% endcase %}
        </fieldset>
      {% endfor %}

      <button type="submit" class="collection-filters__apply">{{ 'collection.apply_filters' | t }}</button>

      {% assign has_active_filters = false %}
      {% for filter in collection.filters %}
        {% if filter.active_values.size > 0 %}
          {% assign has_active_filters = true %}
        {% endif %}
      {% endfor %}
      {% if has_active_filters %}
        <a href="{{ collection.url }}" class="collection-filters__clear">{{ 'collection.clear_filters' | t }}</a>
      {% endif %}
    </div>
  {% endif %}
</form>
```

The `price_range` filter's exact property names (`.min_value`/`.max_value`/`.range_min`/`.range_max`, each with `.param_name`/`.value`) are the LEAST certain part of this draft — verify these most carefully, since a wrong property name here would silently render blank inputs rather than error loudly (Liquid doesn't error on accessing a nonexistent property on an object, it just returns nil).

- [ ] **Step 2: Mount the filters snippet in the collection section**

In `sections/collection.liquid`, render the filters snippet above the grid (inside the `{% paginate %}` block, since `collection.filters`/`collection.sort_options` need the paginate context — verify this requirement against documentation too, don't assume):

```liquid
{% render 'collection-filters', collection: collection %}
```

Add minimal layout CSS for `.collection-filters` (a simple flex/grid row of the sort dropdown + filter fieldsets — keep this task's styling functional, not polished; Task 3 doesn't add visual polish either, but if this task's basic layout is visually broken that would block Task 3's live verification, so make sure it at least doesn't overlap/clip on either breakpoint).

- [ ] **Step 3: Add the locale keys**

In `locales/en.default.json`, add a `collection` object entries (if the object doesn't exist yet from Task 1, create it; if it does, add to it, alphabetically): `"sort_by": "Sort by"`, `"apply_filters": "Apply filters"`, `"clear_filters": "Clear filters"`, `"price_min": "Min price"`, `"price_max": "Max price"`.

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 5: Verify in the browser — full page-reload flow, no JS shortcuts, at BOTH breakpoints**

```bash
shopify theme dev
```

Using the real populated collection from Task 1:
1. Change the sort dropdown and submit (or confirm it needs an explicit "Apply" — check what the actual UX requires given no JS exists yet at this point in the plan) — confirm the URL gets a `sort_by` query param and the grid re-renders in the new order via a full page reload.
2. Check a filter checkbox (color/size/whatever facets this collection's real products actually have) and submit — confirm the URL gets the correct filter query param(s) and the grid re-renders showing only matching products, via full page reload.
3. Confirm the "Clear filters" link appears only when a filter is active, and correctly clears back to the unfiltered URL.
4. Confirm filter option counts (`value.count`) are real numbers matching what's actually in the collection, not placeholder/always-zero.
5. Both breakpoints.
6. Confirm this ALL works correctly via full page navigation — this is the critical baseline Task 3's JS enhancement will build on top of; if the base form doesn't work correctly without JS, Task 3 will have nothing solid to enhance.

- [ ] **Step 6: Commit**

```bash
git add sections/collection.liquid snippets/collection-filters.liquid locales/en.default.json locales/en.default.schema.json
git commit -m "feat: add faceted filtering and sorting to collection page"
```

---

## Task 3: AJAX enhancement — filter/sort without a full page reload

**Files:**
- Create: `assets/collection-filters.js`
- Modify: `sections/collection.liquid` (script loading, following the established `{% if template == 'X' %}`-gated layout-load pattern from the product-page plan's own fix round — do NOT embed the script tag inside the section itself, that was a proven mistake in the immediately prior plan)
- Modify: `locales/en.default.json` (an `aria-live` result-count-changed announcement string)

**Interfaces:**
- Consumes: Task 2's `data-collection-filters` form and Task 1's `data-collection-grid` container.
- Produces: nothing else in this plan depends on Task 3.

- [ ] **Step 1: Create the AJAX enhancement script**

Create `assets/collection-filters.js`:

```js
(function () {
  var routeRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  function initCollectionFilters(root) {
    var form = root.querySelector('[data-collection-filters]');
    var grid = root.querySelector('[data-collection-grid]');
    if (!form || !grid) return;

    function announce(message) {
      var live = root.querySelector('[data-collection-live-region]');
      if (live) live.textContent = message;
    }

    function fetchAndSwap(url, pushState) {
      var sectionId = grid.closest('[id^="shopify-section-"]');
      var sectionParam = sectionId ? sectionId.id.replace('shopify-section-', '') : null;
      if (!sectionParam) return;

      var fetchUrl = new URL(url, window.location.origin);
      fetchUrl.searchParams.set('sections', sectionParam);

      fetch(fetchUrl.toString())
        .then(function (response) {
          return response.json();
        })
        .then(function (sections) {
          var html = sections[sectionParam];
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var newGrid = doc.querySelector('[data-collection-grid]');
          var newEmpty = doc.querySelector('.collection__empty');
          var newFiltersInner = doc.querySelector('[data-collection-filters]');

          if (newGrid) {
            grid.replaceWith(newGrid);
          } else if (newEmpty) {
            grid.replaceWith(newEmpty);
          }

          if (newFiltersInner) {
            form.innerHTML = newFiltersInner.innerHTML;
            initFormListeners();
          }

          if (pushState) {
            window.history.pushState({}, '', url);
          }

          var count = newGrid ? newGrid.querySelectorAll('.product-card').length : 0;
          announce(count + ' products found');
        })
        .catch(function (error) {
          console.error(error);
          window.location.href = url;
        });
    }

    function initFormListeners() {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var params = new URLSearchParams(new FormData(form));
        var url = form.action + '?' + params.toString();
        fetchAndSwap(url, true);
      });

      form.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
          form.requestSubmit();
        });
      });

      var sortSelect = form.querySelector('[data-collection-sort]');
      if (sortSelect) {
        sortSelect.addEventListener('change', function () {
          form.requestSubmit();
        });
      }
    }

    initFormListeners();

    window.addEventListener('popstate', function () {
      fetchAndSwap(window.location.href, false);
    });
  }

  initCollectionFilters(document);
  document.addEventListener('shopify:section:load', function (event) {
    initCollectionFilters(event.target);
  });
})();
```

Several things flagged for your own judgment, not blind transcription:

1. **Section-Rendering-API section-ID extraction**: `grid.closest('[id^="shopify-section-"]')` assumes the grid is a descendant of an element with that ID pattern (the auto-generated section wrapper). Verify this actually works for THIS section given how `templates/collection.json` renders it — a static (non-group) section like this one should get a predictable ID like `shopify-section-template--<id>__main` or similar, but confirm the exact ID Shopify actually generates and that the extraction logic correctly produces a valid `?sections=<id>` value. This is exactly the kind of thing that's easy to get subtly wrong — verify it live if you have a session, or trace it very carefully against Shopify's documented Section Rendering API behavior if you don't.
2. **Checkbox auto-submit vs explicit Apply button**: this draft auto-submits on every checkbox change (common modern UX) rather than requiring the Task 2 "Apply filters" button click. Confirm this doesn't create a jarring/inaccessible experience (rapid-fire submissions if a user is quickly checking multiple boxes) — if it feels wrong, keep the explicit Apply-button-triggers-submit behavior instead and only wire the sort dropdown to auto-submit. Use your judgment, document which you chose and why.
3. **`form.requestSubmit()` browser support**: confirm this is within this theme's stated browser support baseline (spec §7) — it's a relatively modern method; if unsupported anywhere in that baseline, dispatch a submit event manually instead (`form.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))` triggering the same listener).
4. **`popstate` full re-fetch**: confirm this correctly restores the grid state when a user navigates Back after filtering — trace through what `window.location.href` actually contains at that point and whether re-fetching it via the Section Rendering API produces the correct un-filtered-or-differently-filtered grid matching that URL's actual query params.

- [ ] **Step 2: Load the script, following the established layout-gated pattern**

Do NOT embed a `<script src>` tag inside `sections/collection.liquid` itself — the immediately prior plan found and fixed exactly this mistake for the product page (embedding a script inside section-rendered markup risks re-execution/listener-duplication on theme-editor hot-reload). Instead, add to `layout/theme.liquid`, gated to the collection template, following the exact same pattern already established there for `product-variant-picker.js`:

```liquid
{% if template == 'collection' %}
  <script src="{{ 'collection-filters.js' | asset_url }}" defer></script>
{% endif %}
```

Also add a visually-hidden `aria-live="polite"` region to `sections/collection.liquid` for the result-count announcement (`data-collection-live-region`) — reuse the `.visually-hidden` utility class already consolidated into `assets/critical.css` by the immediately prior plan's fix round, don't redefine it locally again.

- [ ] **Step 3: Add the locale key**

Add to `locales/en.default.json`'s `collection` object: nothing new needed if the JS's "N products found" string stays hardcoded in English within the JS file — but per this project's i18n discipline, it should go through translation instead. Add `"results_count": "{{ count }} products found"` and update the JS to fetch/interpolate this from a `data-` attribute on the live region (rendered server-side via `{{ 'collection.results_count' | t: count: 0 }}` as a template the JS substitutes into) rather than hardcoding English text in the `.js` file — follow the same pattern this project has used everywhere else to avoid hardcoding UI strings in JS (check how other JS files in this project read label text from `data-*` attributes rather than embedding `| t`-translated strings directly in `.js` files, e.g. `blocks/buy-buttons.liquid`'s `data-add-to-cart-text` pattern, and do the same here).

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 5: Verify in the browser — this is the task where JS-driven behavior must be proven, not assumed**

```bash
shopify theme dev
```

1. Confirm the script loads only on the collection template (check page source/network on a non-collection page, confirm it's absent).
2. Change the sort dropdown — confirm the grid updates WITHOUT a full page reload (watch the network tab: should see a `?sections=...` fetch, not a full document navigation), confirm the URL still updates (via `pushState`) even though there's no reload.
3. Check/uncheck a filter — confirm the same AJAX-swap behavior, confirm the filter's own UI (checkbox states, counts) refreshes correctly after the swap (since Task 3's fetch also replaces the filter form's inner HTML with the freshly-rendered version reflecting the new active filters/counts).
4. Click the browser Back button after filtering — confirm the grid correctly reflects the previous state (via the `popstate` handler), not left showing stale filtered/unfiltered results.
5. Confirm the `aria-live` region announces the new result count after each AJAX update (inspect the DOM/accessibility tree, don't just assume it wired up correctly).
6. Disable JS (or check via reading the code very carefully if you can't easily toggle JS in your test environment) and confirm the exact same filter/sort actions still work via full-page-reload, proving Task 2's base form genuinely still functions independently of this task's enhancement.
7. Both breakpoints.
8. Check the console for errors throughout, especially around the section-ID extraction logic flagged in Step 1.

- [ ] **Step 6: Commit**

```bash
git add assets/collection-filters.js layout/theme.liquid sections/collection.liquid locales/en.default.json
git commit -m "feat: add AJAX enhancement for collection filtering and sorting"
```

---

## Self-Review Notes

- **Spec coverage**: §5.2's untruncated title/description/image, varying-aspect-ratio grid, per-product title/price/images/unit-price, faceted filtering, sorting, sale badge + `compare_at_price_max`, empty-collection message, and pagination are all covered across the three tasks.
- **Progressive enhancement is the core architectural decision of Tasks 2/3, not incidental**: Task 2 ships a fully-functional, accessible, JS-free filter/sort experience; Task 3 only makes it faster/smoother, and Task 2's base form must keep working independently after Task 3 lands (verified explicitly in Task 3's own Step 5).
- **Multiple genuinely-unconfirmed-at-plan-writing-time API shapes carried into task execution rather than silently assumed correct**: `product.price_varies`/`.price_min`/`.price_max` semantics (Task 1), `collection.filters`'/`collection.sort_options`'s exact object shapes including the LEAST certain `price_range` filter property names (Task 2), and the Section Rendering API's section-ID extraction logic (Task 3) — all explicitly flagged for verification against real documentation rather than confident transcription.

## Outstanding: Deferred Scope and Live-Verification Punch-List

**This plan shipped under the same disclosed, user-accepted constraint as the immediately prior (product-page) plan**: the `shopify theme dev` browser-preview session has been down (OAuth device-code re-auth blocked non-interactively) across this entire plan, re-confirmed at the start of every single task and fix round. Every implementer and reviewer held to a "maximum static rigor" standard as a substitute, and the final whole-plan review found this discipline genuinely held — no fabricated verification claims anywhere across 6+ commits, and (unlike the prior plan's final review, which found 2 Critical bugs) this plan's final review found **zero Critical bugs**, only integration-level Important findings, all since fixed and re-verified.

**Deliberate, deferred scope gap — needs an owner before Theme Store submission:** Tasks 2 and 3 deliberately scoped their filter/sort UI as "functional, not polished" (native `<select>`, checkboxes, number inputs, submit button, raw `default_pagination` strip) — a correct per-task decision, but no later task ever redeemed it. The collection page is functionally complete but visibly rougher than the rest of the theme. This needs its own properly-scoped follow-up styling pass before this page is submission-ready — not a small fix-round addition, a real design/CSS task.

**Before this collection page is considered truly done (not just statically plausible), work through this list with a live `shopify theme dev` session, against the real "Викрутки" collection (80 products, price range $32–$633):**

1. **Highest priority — confirm pagination links survive an AJAX filter correctly.** The final whole-plan review flagged a specific, unverified risk: during an AJAX fetch, the request's own query string carries `?sections=<id>`; if Shopify's `default_pagination`/`paginate` link-building uses that same request's URL to construct page-2+ hrefs, a post-filter pagination click could return raw JSON instead of HTML. The reviewer's own assessment was "very likely already stripped by Shopify's own mechanism" (consistent with how Dawn and other reference themes work), but this was never confirmed. Filter or sort the collection via AJAX, then inspect a rendered page-2+ pagination link's actual href before clicking it.
2. **Full filter/sort/AJAX flow, live.** Change sort → confirm AJAX swap, no full reload, URL updates via `pushState`. Check a filter checkbox → click Apply → confirm swap, confirm keyboard focus lands correctly on the Apply button post-swap (the fix-round-1 fix for this needs its first live confirmation). Click "Clear filters" → confirm it clears filters but preserves the active sort. Click browser Back → confirm state consistency (same-document and cross-document cases).
3. **Result-count `aria-live` announcement.** Confirm it fires, confirm it announces the TRUE filtered total (not capped at the 24-item page size — this was a real bug found and fixed mid-plan), confirm a screen reader actually receives it.
4. **Zero-result filter combination.** Confirm the correct, filter-aware empty-state message renders (distinct from the genuinely-empty-collection message) — this is a fix-round-1 addition with no live confirmation yet.
5. **Real facet visibility.** Confirm this dev store actually has the Search & Discovery app configured with real filters (color/size/price) surfacing on this collection — Admin GraphQL couldn't confirm this, and the `{% when 'list' %}` filter branch (the one with the most moving parts: multi-value serialization, counts, disabled state) has never been exercised against real rendered output.
6. **Both breakpoints**, full pass of items 2–5.
7. **Genuinely empty collection** (0 products) — confirm the correct, non-filtered empty message renders.
8. **Sale-price and empty-state accessibility labels** — confirm the new visually-hidden "Regular price"/"Sale price" context and the filtered-vs-empty message distinction are both genuinely announced correctly by a screen reader, not just present in the DOM.
9. **Console clean** throughout all of the above, on every breakpoint and interaction path.
- **Environment risk carried over explicitly**: this plan may also ship under the same static-verification-only constraint as the immediately prior plan if the dev session hasn't recovered. Given that plan's final review caught 2 Critical bugs static reasoning alone missed, this plan's reviewers should hold an equally high bar and this plan's own final review should re-confirm whether the session has recovered before accepting another round of static-only verification as sufficient to call the plan done.
