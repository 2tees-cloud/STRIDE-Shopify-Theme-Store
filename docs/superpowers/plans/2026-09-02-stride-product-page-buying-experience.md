# STRIDE Product Page — Buying Experience

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the skeleton-theme's placeholder `sections/product.liquid` (currently: unstyled images, a bare `<select>` variant picker, no live updates) into a fully spec-compliant product page per spec §5.1 and the relevant items of §6's mandatory feature checklist. This plan covers the **core buying experience** — blocks architecture, variant picker with live updates, quantity, buy buttons, accelerated checkout, sticky buy-box, size-chart modal, gift-card fields. A separate follow-up plan will cover rich media (3D/video), product recommendations, pickup availability, and the Shop Pay Installments banner — explicitly out of scope here (see Self-Review Notes).

**Architecture — a real architectural decision, not a stylistic default:** this theme already uses Shopify's modern **theme-blocks** system (`{% content_for 'blocks' %}` + standalone files in `/blocks/`), established by the already-shipped `sections/footer.liquid` (`{% content_for 'blocks' %}`, schema `"blocks": [{ "type": "@theme" }]`) and its sibling `blocks/group.liquid`/`blocks/text.liquid`/`blocks/footer-link-list.liquid`/`blocks/newsletter-signup.liquid`. This plan follows that SAME established convention for the main-product section, modeled on Dawn's main-product structure as a reference for WHAT blocks to offer (title, vendor, price, description, variant picker, quantity, buy buttons) — not copying Dawn's code, which still uses the older `{% for block in section.blocks %}{% case block.type %}` pattern. The main-product section's schema needs `"blocks": [{ "type": "@theme" }, { "type": "@app" }]` — the `@app` entry is a hard Theme Store requirement for the main product section specifically (spec §4, opening paragraph).

**Tech Stack:** Shopify Liquid, native CSS, vanilla JS (variant matching, quantity stepper). No AJAX round-trip needed for variant switching — variant data is embedded as JSON and matched client-side, which is both simpler and faster than a Section Rendering API round-trip for this specific interaction. Add-to-cart AJAX is **already fully implemented** by the already-shipped `assets/cart-drawer.js`, which listens document-wide for `submit` on any `[data-add-to-cart-form]` and handles the `/cart/add.js` call, drawer refresh, and drawer open — this plan's buy-buttons block only needs to produce a correctly-shaped form; it must NOT duplicate that logic.

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §5.1 (Product), relevant lines of §6 (accelerated checkout, unit pricing, variant images, gift card rendering).

## Global Constraints

(Carried over from all prior plans; every task below implicitly inherits these.)

- **Every new interactive piece must be verified with REAL, populated content (a real product with 2+ variants across at least 2 options, e.g. color × size) at BOTH mobile (<750px) and desktop (≥750px) widths, via actual interaction — not a screenshot, not an empty/single-variant product.** This project's worst historical bug (a permanently non-functional desktop nav) went undetected for two review rounds specifically because verification was screenshot-only against empty/trivial content.
- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never use `--color-accent-secondary` as small text.
- Touch targets ≥24×24 CSS px on every interactive element (variant swatches/pills, quantity stepper buttons, add-to-cart button).
- `prefers-reduced-motion` respected wherever animation/transition is added.
- Any section-root element meant to span the full viewport needs the `.full-width` utility, with its own horizontal mobile padding (`padding-inline`) — this has been the single most common regression across the last two plans; check it fresh every time, don't assume it's automatic.
- **`{% stylesheet %}`, `{% javascript %}`, and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.** This exact mistake has occurred 4+ times across this project's plans (`theme-check` cannot catch it — only a live render does).
- **Any new locale key must be added to the correct file**: `| t` in body markup → `locales/en.default.json`; `t:` inside `{% schema %}` → `locales/en.default.schema.json`.
- **`templates/product.json` must reference a real, populated product** for the demo/dev environment used to verify this plan — the product needs at least 2 real options (e.g. Color, Size) with at least 2 values each, so the variant-matching logic actually gets exercised, not just trivially confirmed against a single-variant product.
- No Lorem Ipsum in default values; every setting has a `label`; every image needs accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, the `{% comment %}`/`{% doc %}` header style (this project's `/blocks/*.liquid` files use `{% doc %}...{% enddoc %}`, matching `blocks/group.liquid` — use that style for new block files, not the `{% comment %}` style used in `/sections/*.liquid`), reuse existing tokens/spacing scale.
- **Do not duplicate `assets/cart-drawer.js`'s add-to-cart logic.** The buy-buttons block must render a `<form data-add-to-cart-form>` containing a `name="id"` input (the variant ID) and a `name="quantity"` input — that's the entire contract; the existing global script does the rest (AJAX POST, cart count update, drawer refresh, drawer open). Adding a second submit handler would cause a double-submission bug.
- This theme already has an established, ready-to-use **native `<dialog>` modal convention**: `assets/critical.css` already styles `dialog` globally and has `html:has(dialog[scroll-lock][open], details[scroll-lock][open]) { overflow: hidden; }` wired up — meaning any `<dialog scroll-lock>` element automatically gets body-scroll-lock while open, for free, with zero new CSS needed for that specific behavior. Use this convention (not a custom from-scratch modal/focus-trap) for anything in this plan that needs a modal — native `<dialog>` handles focus trapping and `Escape`-to-close automatically in all evergreen browsers, which is both less code and more robust than this project's earlier hand-rolled panel patterns (mobile-nav, cart-drawer) had to build for non-`<dialog>` elements.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/product.liquid` | rewrite | Main-product section shell: two-column layout (gallery + info), owns the single `{% form 'product' %}`, renders `{% content_for 'blocks' %}` inside it |
| `blocks/product-title.liquid` | create | `product.title`, untruncated |
| `blocks/product-vendor.liquid` | create | `product.vendor` |
| `blocks/product-price.liquid` | create | Price, compare-at, unit price — live-updated by variant JS |
| `blocks/product-description.liquid` | create | `product.description` |
| `blocks/variant-picker.liquid` | create | Options as swatches (if configured) or pill buttons; drives the live-update JS |
| `blocks/quantity-selector.liquid` | create | Quantity input with +/- stepper buttons |
| `blocks/buy-buttons.liquid` | create | Add-to-cart button + accelerated checkout (`payment_button`); sold-out/unavailable state |
| `assets/product-variant-picker.js` | create | Variant matching, live price/sold-out/gallery-image/URL updates |
| `templates/product.json` | modify | Populate with a real, multi-option/multi-variant product and full block order |
| `locales/en.default.json` | modify | Storefront-facing keys (sold out, unavailable, quantity label, etc.) |
| `locales/en.default.schema.json` | modify | New `t:` keys for all new blocks' settings |

Task 3 adds:

| File | Status | Responsibility |
|---|---|---|
| `snippets/size-chart-modal.liquid` | create | `<dialog scroll-lock>`-based size chart, triggered from the variant-picker block |
| `blocks/gift-card-recipient.liquid` | create | Recipient email/name/message fields for gift-card products |

No files are deleted. `sections/product.liquid`'s current bare-bones content is fully replaced (it was always meant to be — the skeleton-theme scaffold is explicitly a starting point, not shipped content).

---

## Task 1: Section shell, blocks architecture, and static content blocks

**Files:**
- Rewrite: `sections/product.liquid`
- Create: `blocks/product-title.liquid`, `blocks/product-vendor.liquid`, `blocks/product-price.liquid`, `blocks/product-description.liquid`
- Modify: `templates/product.json`, `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-foreground`, `--color-foreground-muted`, `--color-urgency`, `--space-1`–`--space-8` (existing tokens).
- Produces: `.product__gallery`/`.product__info` layout structure and the `{% form 'product' %}` wrapper that Task 2's blocks (variant-picker, quantity-selector, buy-buttons) render inside. Task 2 and Task 3 both depend on this task's section shell existing first — this task must land and be reviewed before Task 2 starts.
- The `product-price` block in this task renders the INITIAL server-side price state only (based on `product.selected_or_first_available_variant`); Task 2 adds the JS that keeps it live-updated on variant change. Give the price block's key elements `data-` attributes now (`data-product-price`, `data-product-compare-at-price`, `data-product-unit-price`) even though nothing reads them yet, so Task 2 doesn't need to touch this file again. Both the compare-at element and the price element must always exist in the DOM — Task 2's JS only mutates elements, it never creates them — so sale state is expressed via a toggleable `data-is-sale` attribute on the `[data-product-price-container]` wrapper (plus `hidden` on the compare-at/on-sale-label elements), not a Liquid `{% if %}/{% else %}` branch chosen once at render time. Task 2's `updatePrice` toggles `data-is-sale` alongside the price text on every variant change.

- [ ] **Step 1: Rewrite the main-product section shell**

Replace `sections/product.liquid` entirely:

```liquid
{% comment %}
  Main product section. Two-column layout: media gallery (left/top) and
  a scrollable info column (right/bottom) containing every block a
  merchant configures, all inside the ONE product form this section
  owns. Blocks render via {% content_for 'blocks' %} (this theme's
  established theme-blocks convention — see sections/footer.liquid for
  the sibling pattern) — do NOT reintroduce the older
  {% for block in section.blocks %}{% case block.type %} pattern.

  Gallery in this task is minimal (all media, first active) — Task 3
  adds zoom and sticky-buy-box layout polish. Variant-driven live
  updates (price, sold-out, gallery active image, URL) are Task 2.
{% endcomment %}

<div class="product full-width">
  <div class="product__gallery">
    {% if product.media.size > 0 %}
      {% for media in product.media %}
        <div class="product__gallery-item{% if forloop.first %} is-active{% endif %}" data-product-media-id="{{ media.id }}">
          {% if media.media_type == 'image' %}
            <img
              src="{{ media | image_url: width: 1600 }}"
              srcset="{{ media | image_url: width: 800 }} 800w, {{ media | image_url: width: 1600 }} 1600w"
              sizes="(min-width: 750px) 50vw, 100vw"
              width="{{ media.width }}"
              height="{{ media.height }}"
              alt="{{ media.alt | default: product.title | escape }}"
              loading="{% if forloop.first %}eager{% else %}lazy{% endif %}"
            >
          {% endif %}
        </div>
      {% endfor %}
    {% else %}
      <div class="product__gallery-item is-active product__gallery-item--placeholder"></div>
    {% endif %}
  </div>

  <div class="product__info">
    {% form 'product', product, data-add-to-cart-form: true %}
      {% content_for 'blocks' %}
    {% endform %}
  </div>
</div>

{% stylesheet %}
  .product {
    padding-block: var(--space-8);
    padding-inline: var(--space-4);
    display: grid;
    gap: var(--space-6);
  }
  @media (min-width: 750px) {
    .product {
      padding-inline: var(--space-6);
      grid-template-columns: 1fr 1fr;
      gap: var(--space-8);
      align-items: start;
    }
  }
  .product__gallery {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .product__gallery-item {
    display: none;
  }
  .product__gallery-item.is-active {
    display: block;
  }
  .product__gallery-item img {
    width: 100%;
    height: auto;
  }
  .product__gallery-item--placeholder {
    aspect-ratio: 1 / 1;
    background-color: var(--color-background-alt);
  }
  .product__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.product",
  "blocks": [{ "type": "@theme" }, { "type": "@app" }],
  "settings": [],
  "disabled_on": {
    "groups": ["header", "footer"]
  }
}
{% endschema %}
```

Note: `product.media` (not `product.images`) is used deliberately — `product.media` includes images AND (in the follow-up plan) video/3D models, so building the gallery against `media` now avoids a rework later. This task only actually renders `media_type == 'image'`; the `{% if %}` branch for other media types is added in the follow-up plan, not here — don't build it out now, just don't block it either.

- [ ] **Step 2: Create the static content blocks**

Create `blocks/product-title.liquid`:

```liquid
{% doc %}
  Renders the product's title as the page's h1.

  @example
  {% content_for 'block', type: 'product-title', id: 'product-title' %}
{% enddoc %}

<h1 class="product-title" {{ block.shopify_attributes }}>{{ product.title }}</h1>

{% stylesheet %}
  .product-title {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.product_title",
  "settings": []
}
{% endschema %}
```

Create `blocks/product-vendor.liquid`:

```liquid
{% doc %}
  Renders the product's vendor name.

  @example
  {% content_for 'block', type: 'product-vendor', id: 'product-vendor' %}
{% enddoc %}

{% if product.vendor != blank %}
  <p class="product-vendor" {{ block.shopify_attributes }}>{{ product.vendor }}</p>
{% endif %}

{% stylesheet %}
  .product-vendor {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.product_vendor",
  "settings": []
}
{% endschema %}
```

Create `blocks/product-price.liquid` — the settings-free content is fine since price data comes entirely from the product, not merchant configuration:

```liquid
{% doc %}
  Renders price, compare-at price, and unit price (when configured).
  The data-* hooks here are read and updated live by
  assets/product-variant-picker.js (added in Task 2) whenever the
  selected variant changes — this task only needs to render the
  correct INITIAL state from product.selected_or_first_available_variant.

  Both the compare-at element and the price element are ALWAYS present
  in the DOM, regardless of whether the initial variant is on sale.
  Task 2's JS only ever queries for and mutates existing elements — it
  never creates new ones — so a Liquid {% if %}/{% else %} that emits
  one shape or the other at render time would leave no compare-at
  element to reveal (or no way to fall back to the regular shape) once
  the shopper picks a different variant client-side. Sale state is
  therefore expressed as a toggleable data-is-sale attribute on the
  container plus hidden on the elements that shouldn't show initially;
  Task 2 flips both when the selected variant changes.

  @example
  {% content_for 'block', type: 'product-price', id: 'product-price' %}
{% enddoc %}

{% liquid
  assign current_variant = product.selected_or_first_available_variant
  assign is_sale = false
  if current_variant.compare_at_price > current_variant.price
    assign is_sale = true
  endif
%}

<div
  class="product-price"
  data-product-price-container
  {% if is_sale %}data-is-sale{% endif %}
  {{ block.shopify_attributes }}
>
  <span class="product-price__compare-at" data-product-compare-at-price {% unless is_sale %}hidden{% endunless %}>{{ current_variant.compare_at_price | money }}</span>
  <span class="product-price__value" data-product-price>{{ current_variant.price | money }}</span>
  <span class="visually-hidden" data-product-price-on-sale-label {% unless is_sale %}hidden{% endunless %}>{{ 'product.on_sale' | t }}</span>

  {% if current_variant.unit_price_measurement %}
    <span class="product-price__unit" data-product-unit-price>
      {{ current_variant.unit_price | money }}/{{ current_variant.unit_price_measurement.reference_value }}{{ current_variant.unit_price_measurement.reference_unit }}
    </span>
  {% endif %}
</div>

{% stylesheet %}
  .product-price {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex-wrap: wrap;
    font-size: 1.25rem;
  }
  .product-price__compare-at {
    text-decoration: line-through;
    color: var(--color-foreground-muted);
    font-size: 1rem;
  }
  .product-price[data-is-sale] .product-price__value {
    color: var(--color-urgency);
    font-weight: 700;
  }
  .product-price__unit {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.product_price",
  "settings": []
}
{% endschema %}
```

Add the new `product.on_sale` locale key to `locales/en.default.json` under a new top-level `product` object (insert alphabetically): `"on_sale": "On sale"`.

Create `blocks/product-description.liquid`:

```liquid
{% doc %}
  Renders the product's rich-text description. product.description is
  already sanitized HTML from the admin rich-text editor — output
  unescaped, matching how every Shopify reference theme handles it.

  @example
  {% content_for 'block', type: 'product-description', id: 'product-description' %}
{% enddoc %}

{% if product.description != blank %}
  <div class="product-description" {{ block.shopify_attributes }}>
    {{ product.description }}
  </div>
{% endif %}

{% stylesheet %}
  .product-description {
    color: var(--color-foreground);
    line-height: 1.6;
  }
  .product-description :is(h1, h2, h3, h4, h5, h6) {
    font-family: var(--font-header--family);
    margin: var(--space-4) 0 var(--space-2);
  }
  .product-description :is(ul, ol) {
    padding-inline-start: var(--space-5);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.product_description",
  "settings": []
}
{% endschema %}
```

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object (alphabetically — check neighbors):

```json
    "product_title": "Product title",
    "product_vendor": "Vendor",
    "product_price": "Price",
    "product_description": "Description",
```

- [ ] **Step 4: Populate `templates/product.json` with a real, multi-variant product**

Read `templates/product.json`'s current content first (it's the bare `{"sections": {"main": {"type": "product", "settings": {}}}, "order": ["main"]}` skeleton). Find or create (via the Admin GraphQL API, same pattern used repeatedly in prior plans) a real product in the connected dev store with **at least 2 options and at least 2 values each** (e.g. Color: Black/White, Size: 8/9/10) — this is required so Task 2's variant-matching JS actually gets exercised by real option combinations, not trivially passed against a single-variant product. Confirm the product's handle, and set:

```json
{
  "sections": {
    "main": {
      "type": "product",
      "blocks": {
        "title": { "type": "product-title" },
        "vendor": { "type": "product-vendor" },
        "price": { "type": "product-price" },
        "description": { "type": "product-description" }
      },
      "block_order": ["title", "vendor", "price", "description"],
      "settings": {}
    }
  },
  "order": ["main"]
}
```

Then confirm this template is actually being used to render the real product you found/created — Shopify serves `templates/product.json` for every product by default unless a product has a specific alternate template assigned, so viewing that product's storefront URL directly (`/products/<handle>`) should render it. Report the exact product handle/title used, since Task 2 and Task 3 will need the SAME product to test variant switching, sizing modal, etc.

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser at BOTH breakpoints, with the real product**

```bash
shopify theme dev
```

1. Load the real product's page. Confirm title/vendor/price/description all render with real data (not placeholder text), in the configured block order.
2. Confirm the gallery shows the product's real image(s), first one visible, others correctly hidden (`display: none`, not just visually absent — check computed style).
3. Confirm the layout is 2-column at ≥750px and stacks to 1-column at <750px.
4. Check the browser console for errors.
5. Confirm `theme-check` still passes after using the Admin API to create/find the test product (no leftover test artifacts needed here, unlike prior plans' temporary-image pattern — this product is meant to stay, since Task 2/3 need it too. Just don't leave any OTHER scratch data behind).

- [ ] **Step 7: Commit**

```bash
git add sections/product.liquid blocks/product-title.liquid blocks/product-vendor.liquid blocks/product-price.liquid blocks/product-description.liquid templates/product.json locales/en.default.json locales/en.default.schema.json
git commit -m "feat: rebuild main product section with theme-blocks architecture"
```

---

## Task 2: Variant picker, quantity selector, buy buttons — the live buying experience

**Files:**
- Create: `blocks/variant-picker.liquid`, `blocks/quantity-selector.liquid`, `blocks/buy-buttons.liquid`, `assets/product-variant-picker.js`
- Modify: `templates/product.json`, `locales/en.default.json`, `locales/en.default.schema.json`

**Interfaces:**
- Consumes: Task 1's section shell (the shared `{% form 'product' %}` and the `data-product-price-container`/`data-product-price`/`data-product-compare-at-price`/`data-product-price-on-sale-label`/`data-product-unit-price` hooks already present in `blocks/product-price.liquid`, where the compare-at and price elements always exist in the DOM and sale state toggles via the container's `data-is-sale` attribute plus `hidden` on the compare-at/label elements) and gallery markup (`data-product-media-id` on each `.product__gallery-item`).
- Produces: the fully interactive buying experience. Nothing in Task 3 depends on this task's JS internals, only on the same product/form existing.

Before starting, confirm Task 1's section shell actually renders these blocks correctly inside the shared form — re-read `sections/product.liquid` and `templates/product.json` as they now exist (post-Task-1), don't assume the plan's literal text is still exactly what's there if the implementer made any live-verified adjustment during Task 1.

**A genuine open question flagged for the implementer, not a trick:** Shopify's product-option "swatch" API shape (`product.options_with_values[].values[]` — is each value a plain string, or an object with a nilable `.swatch.color`/`.swatch.image`?) was not confirmed at plan-writing time. Before writing `variant-picker.liquid`'s swatch-detection logic, verify the actual current API shape (use whatever Shopify Liquid documentation search tool is available in this environment — a prior task in this project successfully used a `shopify-liquid` skill's search tool for exactly this kind of verification) and write the code to match reality, using the draft below as a starting structure rather than a guaranteed-correct final answer.

- [ ] **Step 1: Create the variant picker block**

Create `blocks/variant-picker.liquid`. This draft assumes `product.options_with_values[].values[]` returns objects with a `.value` (the display string) and a possibly-nil `.swatch` — **verify this against real Shopify Liquid documentation before treating it as correct**, and adjust the property-access chain in the code below if the actual shape differs (e.g. if values are plain strings without swatch support at all, drop the swatch branch and always render text pills):

```liquid
{% doc %}
  Renders one control per product option (Color, Size, etc.) — swatch
  buttons when the merchant has configured swatches for that option,
  plain text pill buttons otherwise. Selecting an option re-runs
  variant matching in assets/product-variant-picker.js, which updates
  price, sold-out state, the active gallery image, and the URL —
  entirely client-side, no network round-trip.

  @example
  {% content_for 'block', type: 'variant-picker', id: 'variant-picker' %}
{% enddoc %}

{% liquid
  assign current_variant = product.selected_or_first_available_variant
%}

{% if product.has_only_default_variant == false %}
  <div class="variant-picker" data-variant-picker {{ block.shopify_attributes }}>
    {% for option in product.options_with_values %}
      <fieldset class="variant-picker__option">
        <legend class="variant-picker__option-label">{{ option.name }}</legend>
        <div class="variant-picker__values" role="radiogroup" aria-label="{{ option.name }}">
          {% for value in option.values %}
            {% liquid
              assign is_selected = false
              if current_variant.options[option.position | minus: 1] == value.value
                assign is_selected = true
              endif
            %}
            <button
              type="button"
              class="variant-picker__value{% if value.swatch %} variant-picker__value--swatch{% endif %}{% if is_selected %} is-active{% endif %}"
              data-variant-option-value
              data-option-position="{{ option.position }}"
              data-option-value="{{ value.value | escape }}"
              aria-pressed="{{ is_selected }}"
              {% if value.swatch.color %}
                style="--swatch-color: {{ value.swatch.color }};"
              {% elsif value.swatch.image %}
                style="--swatch-image: url('{{ value.swatch.image | image_url: width: 64 }}');"
              {% endif %}
            >
              {% unless value.swatch %}{{ value.value }}{% endunless %}
              <span class="visually-hidden">{{ value.value }}</span>
            </button>
          {% endfor %}
        </div>
      </fieldset>
    {% endfor %}

    {% render 'size-chart-modal' %}
  </div>

  <script type="application/json" data-product-variants-json>
    {{ product.variants | json }}
  </script>
{% endif %}

{% stylesheet %}
  .variant-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .variant-picker__option {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .variant-picker__option-label {
    padding: 0;
    font-size: 0.875rem;
    font-weight: 700;
  }
  .variant-picker__values {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .variant-picker__value {
    min-width: 2.5rem;
    min-height: 2.5rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    background-color: var(--color-background);
    color: var(--color-foreground);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .variant-picker__value.is-active {
    border-color: var(--color-foreground);
    outline: 2px solid var(--color-foreground);
    outline-offset: -1px;
  }
  .variant-picker__value--swatch {
    min-width: 2.5rem;
    min-height: 2.5rem;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border-radius: 50%;
    background-color: var(--swatch-color, var(--color-background-alt));
    background-image: var(--swatch-image, none);
    background-size: cover;
    background-position: center;
    overflow: hidden;
    text-indent: -9999px;
  }
  .variant-picker__value[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.variant_picker",
  "settings": []
}
{% endschema %}
```

Note the `{% render 'size-chart-modal' %}` call — `snippets/size-chart-modal.liquid` doesn't exist yet (it's Task 3's job). For THIS task, either comment out that line with a clear `{% comment %}` marker to be re-enabled in Task 3, or create a trivial placeholder snippet that renders nothing (`{% comment %}Populated in a later task{% endcomment %}`) so `theme-check`/live rendering doesn't break on a missing-snippet error in the meantime — check which approach `theme-check` actually tolerates (a `{% render %}` of a genuinely nonexistent snippet file may be a hard error, not just a lint warning) and use whichever keeps this task shippable on its own without a broken reference.

- [ ] **Step 2: Create the quantity selector block**

Create `blocks/quantity-selector.liquid`:

```liquid
{% doc %}
  Quantity stepper: a number input plus +/- buttons. No network call —
  purely local DOM state until the form is submitted.

  @example
  {% content_for 'block', type: 'quantity-selector', id: 'quantity-selector' %}
{% enddoc %}

<div class="quantity-selector" data-quantity-selector {{ block.shopify_attributes }}>
  <label for="Quantity-{{ block.id }}" class="quantity-selector__label">{{ 'product.quantity' | t }}</label>
  <div class="quantity-selector__control">
    <button type="button" class="quantity-selector__step" data-quantity-decrease aria-label="{{ 'product.quantity_decrease' | t }}">&minus;</button>
    <input
      type="number"
      name="quantity"
      id="Quantity-{{ block.id }}"
      class="quantity-selector__input"
      min="1"
      value="1"
      inputmode="numeric"
      data-quantity-input
    >
    <button type="button" class="quantity-selector__step" data-quantity-increase aria-label="{{ 'product.quantity_increase' | t }}">&plus;</button>
  </div>
</div>

{% stylesheet %}
  .quantity-selector {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    align-items: flex-start;
  }
  .quantity-selector__label {
    font-size: 0.875rem;
    font-weight: 700;
  }
  .quantity-selector__control {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--color-border);
  }
  .quantity-selector__step {
    min-width: 24px;
    min-height: 24px;
    width: 2.5rem;
    background-color: var(--color-background);
    border: none;
    cursor: pointer;
    font-size: 1.125rem;
  }
  .quantity-selector__input {
    width: 3rem;
    min-height: 24px;
    border: none;
    border-inline: 1px solid var(--color-border);
    text-align: center;
    -moz-appearance: textfield;
  }
  .quantity-selector__input::-webkit-outer-spin-button,
  .quantity-selector__input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
{% endstylesheet %}

{% javascript %}
  function initQuantitySelector(root) {
    root.querySelectorAll('[data-quantity-selector]').forEach(function (widget) {
      var input = widget.querySelector('[data-quantity-input]');
      var decrease = widget.querySelector('[data-quantity-decrease]');
      var increase = widget.querySelector('[data-quantity-increase]');
      if (!input || !decrease || !increase) return;

      decrease.addEventListener('click', function () {
        var value = Math.max(1, parseInt(input.value, 10) - 1);
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      increase.addEventListener('click', function () {
        var value = Math.max(1, parseInt(input.value, 10) + 1);
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  initQuantitySelector(document);
  document.addEventListener('shopify:section:load', function (event) {
    initQuantitySelector(event.target);
  });
{% endjavascript %}

{% schema %}
{
  "name": "t:general.quantity_selector",
  "settings": []
}
{% endschema %}
```

Add `product.quantity`/`product.quantity_decrease`/`product.quantity_increase` to `locales/en.default.json`'s `product` object (created in Task 1): `"quantity": "Quantity"`, `"quantity_decrease": "Decrease quantity"`, `"quantity_increase": "Increase quantity"`.

- [ ] **Step 3: Create the buy buttons block**

Create `blocks/buy-buttons.liquid`:

```liquid
{% doc %}
  Add-to-cart button + accelerated checkout. Renders inside the
  section's shared {% form 'product' %} (see sections/product.liquid) —
  the hidden variant-id input here is the exact hook
  assets/product-variant-picker.js updates on every variant change.
  Add-to-cart AJAX itself is handled entirely by the already-shipped
  assets/cart-drawer.js (document-wide submit listener on
  [data-add-to-cart-form]) — this block must NOT add its own submit
  handler.

  @example
  {% content_for 'block', type: 'buy-buttons', id: 'buy-buttons' %}
{% enddoc %}

{% liquid
  assign current_variant = product.selected_or_first_available_variant
%}

<div class="buy-buttons" data-buy-buttons {{ block.shopify_attributes }}>
  <input type="hidden" name="id" value="{{ current_variant.id }}" data-buy-buttons-variant-id>

  <button
    type="submit"
    class="buy-buttons__add-to-cart"
    data-buy-buttons-submit
    {% unless current_variant.available %}disabled{% endunless %}
  >
    <span data-buy-buttons-label>
      {% if current_variant.available %}
        {{ 'product.add_to_cart' | t }}
      {% else %}
        {{ 'product.sold_out' | t }}
      {% endif %}
    </span>
  </button>

  {{ form | payment_button }}
</div>

{% stylesheet %}
  .buy-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .buy-buttons__add-to-cart {
    min-height: 24px;
    padding: var(--space-3) var(--space-5);
    background-color: var(--color-foreground);
    color: var(--color-background);
    border: none;
    font-weight: 700;
    cursor: pointer;
  }
  .buy-buttons__add-to-cart[disabled] {
    background-color: var(--color-foreground-muted);
    cursor: not-allowed;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.buy_buttons",
  "settings": []
}
{% endschema %}
```

**A genuine open question flagged for the implementer**: whether `form` (the `{% form 'product', product %}` tag's block-scoped forloop variable, opened in `sections/product.liquid`) remains accessible inside a theme-block file rendered via `{% content_for 'blocks' %}` nested inside that form tag. This project's established theme-blocks usage so far (`footer.liquid`/`group.liquid`) hasn't needed to test whether a PARENT TAG's block-scoped variable (as opposed to a global object like `product`) stays in scope across a `content_for 'blocks'` boundary. Verify this live — if `{{ form | payment_button }}` errors or renders nothing because `form` is out of scope, the working alternative is to call `{{ form | payment_button }}` directly in `sections/product.liquid` (inside the `{% form %}...{% endform %}` block, after `{% content_for 'blocks' %}`) rather than inside this block file, and adjust Task 1's section shell accordingly (a small, backward-compatible edit) — but confirm the actual failure mode first rather than pre-emptively avoiding the cleaner in-block approach.

Add `product.add_to_cart`/`product.sold_out`/`product.unavailable` to `locales/en.default.json`'s `product` object: `"add_to_cart": "Add to cart"`, `"sold_out": "Sold out"`, `"unavailable": "Unavailable"`.

- [ ] **Step 4: Create the variant-matching JS**

Create `assets/product-variant-picker.js`:

```js
(function () {
  function getVariants(root) {
    var script = root.querySelector('[data-product-variants-json]');
    if (!script) return [];
    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return [];
    }
  }

  function findMatchingVariant(variants, selectedOptions) {
    return variants.find(function (variant) {
      return selectedOptions.every(function (value, index) {
        return value == null || variant.options[index] === value;
      });
    });
  }

  function updatePrice(root, variant) {
    // Both the price and compare-at elements always exist in the DOM
    // (see blocks/product-price.liquid) — this function only ever
    // toggles hidden/data-is-sale and rewrites text, it never creates
    // or removes elements, so it works identically regardless of
    // whether the INITIAL server-rendered variant was on sale.
    var container = root.querySelector('[data-product-price-container]');
    var priceEl = root.querySelector('[data-product-price]');
    var compareAtEl = root.querySelector('[data-product-compare-at-price]');
    var saleLabelEl = root.querySelector('[data-product-price-on-sale-label]');

    if (priceEl) priceEl.textContent = variant.price_formatted || variant.price;

    var showCompareAt = !!(variant.compare_at_price_formatted && variant.compare_at_price > variant.price);
    if (compareAtEl) {
      compareAtEl.textContent = showCompareAt ? variant.compare_at_price_formatted : '';
      compareAtEl.hidden = !showCompareAt;
    }
    if (saleLabelEl) saleLabelEl.hidden = !showCompareAt;
    if (container) container.toggleAttribute('data-is-sale', showCompareAt);
  }

  function updateAvailability(root, variant) {
    var submit = root.querySelector('[data-buy-buttons-submit]');
    var label = root.querySelector('[data-buy-buttons-label]');
    if (!submit || !label) return;

    if (!variant) {
      submit.disabled = true;
      label.textContent = submit.dataset.unavailableText || 'Unavailable';
      return;
    }

    submit.disabled = !variant.available;
    label.textContent = variant.available
      ? submit.dataset.addToCartText
      : submit.dataset.soldOutText;
  }

  function updateVariantId(root, variant) {
    var input = root.querySelector('[data-buy-buttons-variant-id]');
    if (input) input.value = variant ? variant.id : '';
  }

  function updateGalleryImage(sectionRoot, variant) {
    if (!variant || !variant.featured_media) return;
    var items = sectionRoot.querySelectorAll('[data-product-media-id]');
    items.forEach(function (item) {
      var matches = String(item.dataset.productMediaId) === String(variant.featured_media.id);
      item.classList.toggle('is-active', matches);
    });
  }

  function updateUrl(variant) {
    if (!variant || !window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);
  }

  function updateActiveButtons(root, selectedOptions) {
    root.querySelectorAll('[data-variant-option-value]').forEach(function (button) {
      var position = parseInt(button.dataset.optionPosition, 10) - 1;
      var isActive = selectedOptions[position] === button.dataset.optionValue;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function initVariantPicker(root) {
    var picker = root.querySelector('[data-variant-picker]');
    if (!picker) return;

    var sectionRoot = root.closest('.shopify-section') || root;
    var variants = getVariants(picker);
    if (variants.length === 0) return;

    var selectedOptions = variants[0].options.map(function () {
      return null;
    });

    // Seed initial state from whichever buttons the server already
    // marked is-active (product.selected_or_first_available_variant).
    picker.querySelectorAll('[data-variant-option-value].is-active').forEach(function (button) {
      var position = parseInt(button.dataset.optionPosition, 10) - 1;
      selectedOptions[position] = button.dataset.optionValue;
    });

    picker.querySelectorAll('[data-variant-option-value]').forEach(function (button) {
      button.addEventListener('click', function () {
        var position = parseInt(button.dataset.optionPosition, 10) - 1;
        selectedOptions[position] = button.dataset.optionValue;

        var matchedVariant = findMatchingVariant(variants, selectedOptions);

        updateActiveButtons(picker, selectedOptions);
        updatePrice(sectionRoot, matchedVariant || {});
        updateAvailability(sectionRoot, matchedVariant);
        updateVariantId(sectionRoot, matchedVariant);
        updateGalleryImage(sectionRoot, matchedVariant);
        updateUrl(matchedVariant);
      });
    });
  }

  initVariantPicker(document);
  document.addEventListener('shopify:section:load', function (event) {
    initVariantPicker(event.target);
  });
})();
```

Two things flagged for your own judgment:

1. `updatePrice` references `variant.price_formatted`/`variant.compare_at_price_formatted` — confirm these are real properties on the JSON Shopify's `product.variants | json` filter actually produces (Shopify's REST-shaped variant JSON traditionally has `price`/`compare_at_price` as raw string/decimal values, NOT pre-formatted with currency symbols — there may be no `_formatted` variant at all). If these fields don't exist in the real JSON, you'll need to format the raw price client-side yourself (e.g. using `Shopify.formatMoney` if that helper is available/loaded in this theme, or a minimal manual formatter matching the store's currency format) — verify what's actually in the JSON by inspecting it live (log it to the console) before assuming either shape.
2. Load `assets/product-variant-picker.js` from `sections/product.liquid` (add a `<script src="{{ 'product-variant-picker.js' | asset_url }}" defer></script>` after the closing `</div>` of the section, following the same pattern `layout/theme.liquid` uses for `cart-drawer.js`) — confirm this is the right place vs. loading it globally from the layout; since this script is product-page-specific, scoping it to load only from `sections/product.liquid` (which only ever renders on the product template) is more correct than adding it to the global layout, but double check it actually executes correctly given Shopify's asset-loading/script-execution order on a section-rendered page.

Add `data-unavailable-text`/`data-add-to-cart-text`/`data-sold-out-text` attributes to `blocks/buy-buttons.liquid`'s submit button (values from the same `product.add_to_cart`/`product.sold_out`/`product.unavailable` locale keys), since the JS reads label text from those data attributes rather than re-implementing `| t` translation lookups in JavaScript — go back and add this to Task 3... actually add it now, in this task, since `buy-buttons.liquid` is being created in this same task (Step 3 above) and the JS in this step depends on it existing already. Update Step 3's code to include these three `data-*` attributes on `[data-buy-buttons-submit]` before finishing this step.

- [ ] **Step 5: Update `templates/product.json`'s block order**

Add `variant-picker`, `quantity-selector`, and `buy-buttons` blocks after `description` in the same product entry Task 1 created:

```json
"variant-picker": { "type": "variant-picker" },
"quantity-selector": { "type": "quantity-selector" },
"buy-buttons": { "type": "buy-buttons" }
```

Add all three to `block_order` after `"description"`.

- [ ] **Step 6: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object (alphabetically):

```json
    "variant_picker": "Variant picker",
    "quantity_selector": "Quantity selector",
    "buy_buttons": "Buy buttons",
```

- [ ] **Step 7: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 8: Verify in the browser at BOTH breakpoints, with REAL variant switching — this is the core of this task, test it thoroughly**

```bash
shopify theme dev
```

Using the same multi-option/multi-variant product from Task 1:
1. Confirm swatches or pill buttons render for each real option, with the correct value pre-selected on load (matching `product.selected_or_first_available_variant`).
2. Click through several different option combinations. For each: confirm price updates correctly (compare against the real variant's actual price in the Admin), confirm the hidden variant-id input updates to the correct variant ID (inspect the DOM, don't just trust visual price change), confirm the URL updates with `?variant=<id>` via `history.replaceState` (no page reload), confirm the add-to-cart button's disabled/label state correctly reflects that variant's real availability (test at least one variant you've deliberately set to "not available"/zero inventory with continue-selling-when-out-of-stock disabled, if the test product has one — if not, temporarily set one variant's inventory to sold-out via the Admin to test this specific path, then decide whether to revert it or leave it as real accurate stock data).
3. If the product has variant-specific images, confirm switching to a variant with a different image swaps the active gallery image (check `is-active` class moves to the correct `.product__gallery-item`, not just that SOME image is showing).
4. Test the quantity stepper: click + and -, confirm the number updates, confirm it doesn't go below 1.
5. Actually submit the add-to-cart form (click submit) and confirm the ALREADY-SHIPPED cart-drawer AJAX flow fires correctly (drawer opens with the correct variant/quantity in the cart) — this confirms the two systems integrate correctly, not just that each looks right in isolation.
6. Mobile (<750px): repeat the variant-switching and add-to-cart checks at this breakpoint.
7. Check the browser console for errors throughout, especially around the `variant.price_formatted` question flagged in Step 4 — if that field doesn't exist, you'll see either an error or a garbled price display, which is exactly what that flag was meant to catch.

- [ ] **Step 9: Commit**

```bash
git add blocks/variant-picker.liquid blocks/quantity-selector.liquid blocks/buy-buttons.liquid assets/product-variant-picker.js templates/product.json locales/en.default.json locales/en.default.schema.json sections/product.liquid
git commit -m "feat: add live variant picker, quantity selector, and buy buttons to product page"
```

---

## Task 3: Sticky buy-box, size-chart modal, gift-card recipient fields

**Files:**
- Modify: `sections/product.liquid` (sticky layout CSS only)
- Create: `snippets/size-chart-modal.liquid`, `blocks/gift-card-recipient.liquid`
- Modify: `templates/product.json`, `locales/en.default.json`, `locales/en.default.schema.json`

**Interfaces:**
- Consumes: Task 1's section shell, Task 2's `variant-picker.liquid` (which already has the `{% render 'size-chart-modal' %}` call site, currently commented out or pointing at a placeholder — re-read that file's actual current state first).
- Produces: nothing else in this plan depends on Task 3.

- [ ] **Step 1: Sticky buy-box layout**

In `sections/product.liquid`'s `{% stylesheet %}` block, add (inside the existing `@media (min-width: 750px)` block):

```css
.product__info {
  position: sticky;
  top: var(--space-4);
  align-self: start;
  max-height: calc(100svh - var(--space-8));
  overflow-y: auto;
}
```

Verify this doesn't fight with the header's own sticky behavior (`sections/header.liquid` uses `.shopify-section-group-header-group:has(header.header)` for its sticky mechanism) — confirm the info column sticks below the header, not underneath/behind it, by checking actual scroll behavior live, not just that the CSS property is present.

- [ ] **Step 2: Create the size-chart modal snippet**

Create `snippets/size-chart-modal.liquid`, using this theme's established native-`<dialog>` convention (see Global Constraints — `scroll-lock` attribute already wired up in `assets/critical.css`):

```liquid
{% comment %}
  Size chart modal, rendered from within blocks/variant-picker.liquid.
  Uses this theme's established native <dialog scroll-lock> convention
  (assets/critical.css already handles body-scroll-lock and the base
  dialog color tokens globally) rather than a hand-rolled focus trap —
  <dialog> gives us focus containment and Escape-to-close natively.
{% endcomment %}

<button type="button" class="size-chart-trigger" data-size-chart-trigger>
  {{ 'product.size_chart' | t }}
</button>

<dialog class="size-chart-modal" scroll-lock data-size-chart-modal aria-label="{{ 'product.size_chart' | t }}">
  <button type="button" class="size-chart-modal__close" data-size-chart-close aria-label="{{ 'product.close' | t }}">&times;</button>
  <div class="size-chart-modal__content">
    {{ 'product.size_chart_placeholder' | t }}
  </div>
</dialog>

{% stylesheet %}
  .size-chart-trigger {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline;
    color: var(--color-foreground);
    cursor: pointer;
    font-size: 0.875rem;
    min-height: 24px;
  }
  .size-chart-modal {
    max-width: 32rem;
    width: calc(100% - var(--space-6));
    border: none;
    padding: var(--space-6);
  }
  .size-chart-modal::backdrop {
    background: rgb(0 0 0 / 50%);
  }
  .size-chart-modal__close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    min-width: 24px;
    min-height: 24px;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
  }
{% endstylesheet %}

{% javascript %}
  function initSizeChartModal(root) {
    root.querySelectorAll('[data-size-chart-trigger]').forEach(function (trigger) {
      var wrapper = trigger.parentElement;
      var modal = wrapper ? wrapper.querySelector('[data-size-chart-modal]') : null;
      if (!modal) return;

      trigger.addEventListener('click', function () {
        modal.showModal();
      });

      var closeButton = modal.querySelector('[data-size-chart-close]');
      if (closeButton) {
        closeButton.addEventListener('click', function () {
          modal.close();
        });
      }
    });
  }

  initSizeChartModal(document);
  document.addEventListener('shopify:section:load', function (event) {
    initSizeChartModal(event.target);
  });
{% endjavascript %}
```

This is a snippet (not a section or block), so it has no `{% schema %}` — confirm `{% stylesheet %}`/`{% javascript %}` tags are actually valid inside a `{% render %}`-ed snippet in this Shopify theme architecture (they generally are — Shopify scopes/dedupes them by source file regardless of render depth — but verify this renders without error, since this project's established pattern so far has only used these tags directly in section/block files, never in a snippet).

Add to `locales/en.default.json`'s `product` object: `"size_chart": "Size chart"`, `"size_chart_placeholder": "Size chart content coming soon."`, `"close": "Close"` (check `close` doesn't already exist under a different object first — this project already has `labels.close_menu` for the mobile nav, which is a different, schema-side key; this is a new body-markup key for a different purpose, so verify there's no exact pre-existing `product.close` or general `close` key before adding a near-duplicate).

The placeholder copy (`size_chart_placeholder`) is a deliberate, documented interim state — this environment has no real sizing-chart content/data to populate (same category of limitation as missing product photography elsewhere in this project) — note this explicitly in your task report rather than treating it as silently acceptable.

- [ ] **Step 3: Re-enable the size-chart modal render in `variant-picker.liquid`**

Re-read `blocks/variant-picker.liquid`'s actual current state (Task 2 either commented out or stubbed the `{% render 'size-chart-modal' %}` line). Replace whatever placeholder is there with the real `{% render 'size-chart-modal' %}` call now that the snippet exists.

- [ ] **Step 4: Create the gift-card recipient fields block**

Create `blocks/gift-card-recipient.liquid`:

```liquid
{% doc %}
  Recipient email/name/message fields for gift-card products. Only
  renders when the product actually is a gift card
  (product.gift_card?) — a merchant adding this block to a regular
  product's template sees nothing, which is correct (this block has no
  meaning outside gift-card products).

  @example
  {% content_for 'block', type: 'gift-card-recipient', id: 'gift-card-recipient' %}
{% enddoc %}

{% if product.gift_card? %}
  <div class="gift-card-recipient" data-gift-card-recipient {{ block.shopify_attributes }}>
    <label class="gift-card-recipient__checkbox">
      <input type="checkbox" data-gift-card-recipient-toggle>
      {{ 'product.gift_card_send_as_gift' | t }}
    </label>

    <div class="gift-card-recipient__fields" data-gift-card-recipient-fields hidden>
      <div class="gift-card-recipient__field">
        <label for="GiftCardRecipientEmail-{{ block.id }}">{{ 'product.gift_card_recipient_email' | t }}</label>
        <input type="email" id="GiftCardRecipientEmail-{{ block.id }}" name="properties[Recipient email]">
      </div>
      <div class="gift-card-recipient__field">
        <label for="GiftCardRecipientName-{{ block.id }}">{{ 'product.gift_card_recipient_name' | t }}</label>
        <input type="text" id="GiftCardRecipientName-{{ block.id }}" name="properties[Recipient name]">
      </div>
      <div class="gift-card-recipient__field">
        <label for="GiftCardRecipientMessage-{{ block.id }}">{{ 'product.gift_card_recipient_message' | t }}</label>
        <textarea id="GiftCardRecipientMessage-{{ block.id }}" name="properties[Message]"></textarea>
      </div>
    </div>
  </div>
{% endif %}

{% stylesheet %}
  .gift-card-recipient {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .gift-card-recipient__checkbox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .gift-card-recipient__fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .gift-card-recipient__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .gift-card-recipient__field input,
  .gift-card-recipient__field textarea {
    border: 1px solid var(--color-border);
    padding: var(--space-2);
  }
{% endstylesheet %}

{% javascript %}
  function initGiftCardRecipient(root) {
    root.querySelectorAll('[data-gift-card-recipient]').forEach(function (widget) {
      var toggle = widget.querySelector('[data-gift-card-recipient-toggle]');
      var fields = widget.querySelector('[data-gift-card-recipient-fields]');
      if (!toggle || !fields) return;

      toggle.addEventListener('change', function () {
        fields.hidden = !toggle.checked;
      });
    });
  }

  initGiftCardRecipient(document);
  document.addEventListener('shopify:section:load', function (event) {
    initGiftCardRecipient(event.target);
  });
{% endjavascript %}

{% schema %}
{
  "name": "t:general.gift_card_recipient",
  "settings": []
}
{% endschema %}
```

Verify the `name="properties[...]"` convention is correct for Shopify's line-item properties on a cart-add form (it is, per Shopify's documented cart API — arbitrary `properties[X]` inputs inside the product form get attached to the cart line item) — but confirm live that a real add-to-cart with these fields filled in actually attaches the properties to the cart line (inspect the cart via `/cart.js` after adding), since this is the one part of this block that depends on an external contract rather than just local DOM behavior.

Add to `locales/en.default.json`'s `product` object: `"gift_card_send_as_gift": "Send as a gift"`, `"gift_card_recipient_email": "Recipient email"`, `"gift_card_recipient_name": "Recipient name (optional)"`, `"gift_card_recipient_message": "Message (optional)"`.

Add `"gift_card_recipient": "Gift card recipient"` to `locales/en.default.schema.json`'s `general` object.

- [ ] **Step 5: Add the gift-card block to a gift-card product's template (if one exists), or document why not**

Gift card products in Shopify use a **separate template** (`templates/gift_card.liquid`, per spec §5.7 — out of scope for this plan) for the actual redemption/balance-check page, but the STOREFRONT PRODUCT PAGE for a gift-card product (the page where a customer buys one) still renders through `templates/product.json`/`sections/product.liquid` like any other product. If this dev store has a real gift-card product, add the `gift-card-recipient` block to its block order (this may require a SEPARATE product-specific template override, or simply verifying the block's own `{% if product.gift_card? %}` guard means it's safe to add to the SAME default `templates/product.json` used by every product, rendering nothing for non-gift-card products). Verify which is actually correct for this theme before deciding, and document your reasoning in the task report. If no real gift-card product exists in this dev store and creating one is impractical, document this as a known limitation (matching this project's established practice) rather than skipping verification silently.

- [ ] **Step 6: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 7: Verify in the browser at BOTH breakpoints**

```bash
shopify theme dev
```

1. Desktop (≥750px): scroll the page and confirm the info column sticks correctly below the header (not overlapping it, not scrolling away independently in a broken way) while the gallery scrolls normally beside it.
2. Click the size-chart trigger, confirm the `<dialog>` opens (`showModal()`), confirm it traps focus (Tab doesn't escape to the page behind it — verify this is genuinely native browser behavior, not assumed), confirm Escape closes it, confirm the explicit close button also works, confirm body scroll is locked while open (try to scroll the page behind the dialog) and unlocked after closing.
3. Mobile (<750px): repeat the size-chart modal checks; confirm the sticky buy-box behavior gracefully doesn't apply (or is otherwise sensible) below the 750px breakpoint, matching how the sticky rule is scoped.
4. If a gift-card product test was possible: check the box, confirm the fields appear, fill them in, add to cart, and confirm via `/cart.js` that the line-item properties are actually attached.
5. Check the browser console for errors throughout.

- [ ] **Step 8: Commit**

```bash
git add sections/product.liquid snippets/size-chart-modal.liquid blocks/gift-card-recipient.liquid templates/product.json locales/en.default.json locales/en.default.schema.json
git commit -m "feat: add sticky buy-box, size-chart modal, and gift-card recipient fields"
```

---

## Self-Review Notes

- **Spec coverage for THIS plan**: §5.1's variant display/live-update requirements, buying mechanics (variants, quantity, disabled-when-unavailable, first-available-default, live callback), accelerated checkout, and the "extras kept" (gallery, swatch picker, size-chart modal, sticky buy-box) are all covered. Gift card recipient fields (§5.1's last bullet) covered in Task 3.
- **Explicitly NOT covered by this plan** (tracked for a follow-up plan, per spec §5.1/§6): product recommendations section (`sections/product-recommendations.liquid`, related + complementary), rich media beyond static images (3D models, embedded YouTube/Vimeo — the gallery's `media_type == 'image'`-only branch is a deliberate, temporary scope limit, not an oversight), pickup availability display, Shop Pay Installments banner, gallery zoom-on-click/hover (Task 3 only added the modal pattern and sticky layout, not image zoom itself — flagged here so it isn't mistaken for done). These map to real spec bullets that remain open after this plan.
- **Two flagged, genuinely-unverified-at-plan-writing-time risks carried into task execution rather than silently assumed correct**: the `options_with_values[].values[]` swatch API shape (Task 2, Step 1) and whether a parent `{% form %}` tag's block-scoped `form` variable stays in scope across a `content_for 'blocks'` boundary (Task 2, Step 3) — both are exactly the kind of "looks right, might not be" assumption this project's history has repeatedly shown needs live verification, not confident transcription.
- **`templates/product.json` real-content requirement**: unlike most prior plans (which could accept a documented missing-image gap), this plan's core value IS the variant-switching experience, so Task 1 requires finding/creating a real multi-option/multi-variant product up front — every subsequent task's live verification depends on that product actually existing and having real option combinations to exercise.

## Outstanding: Live-Verification Punch-List

**This plan shipped under a disclosed, user-accepted constraint.** From partway through Task 2's fix round onward, the `shopify theme dev` session's OAuth token expired and could not be non-interactively restored (repeated re-authentication attempts across every subsequent task and fix round all hit the same device-code browser-login wall). Every implementer and reviewer from that point forward held to a "maximum static rigor" standard as a substitute — no live-test result was ever fabricated, and the final whole-plan review independently confirmed this discipline held across all 6+ commits. But static reasoning alone still missed two real Critical bugs that a single live page load would have caught instantly (a sticky-header measurement targeting the wrong wrapper element; a `<form>` tag intercepting a flex `gap` so every block on the page rendered with zero spacing) — both since fixed and re-verified, but their existence is proof that this plan's code has never actually been seen running in a browser end-to-end.

**Before this product page is considered truly done (not just statically plausible), work through this list with a live `shopify theme dev` session, against the real `stride-apex-runner` product** (Color × Size, 6 variants, one with a real compare-at price):

1. **Sticky header offset.** Confirm `--sticky-header-height` measures the header's wrapper specifically (not the announcement bar's) in both empty and populated announcement-bar states, and confirm `.product__info` never tucks under the header when scrolled — at rest, mid-scroll (condensed), and with an announcement-bar message configured.
2. **Block spacing.** Confirm visible spacing now exists between every block in the info column, and between each variant option's label and its pill row.
3. **Full variant matrix.** For every color × size combination: price text, compare-at visibility, `data-is-sale`, the hidden variant-id input's value cross-checked against the Admin's real variant IDs, button disabled state/label, and `?variant=` URL updates with no reload. Include a deliberately sold-out variant and a combination that maps to no variant at all (confirm the "Unavailable" path).
4. **Add-to-cart integration, including line-item properties.** Submit with quantity > 1 and confirm via `/cart.js` that `id`/`quantity` land correctly; on a real gift-card product (none currently exist in the dev store — create one), confirm `properties["Recipient email"|"Recipient name"|"Message"]` attach when checked and are absent when unchecked. Confirm a non-gift-card product's add-to-cart has no stray empty `properties`.
5. **Accelerated checkout.** Switch variants, confirm the `payment_button` reflects the newly selected variant (not the server-rendered initial one), and observe its behavior when the selected variant is sold out.
6. **Variant-image switching.** Confirm the correct gallery image activates (matched against real media IDs, not just "some image changed"), and confirm every product photo is reachable via the new thumbnail strip.
7. **Size-chart modal.** Confirm the merchant-facing toggle correctly shows/hides the trigger (defaults off); when enabled, confirm `showModal()`/focus-trap/Escape/close-button/scroll-lock all work as expected for this theme's first real use of the native `<dialog>` convention.
8. **Unit pricing.** Confirm the unit-price element correctly appears/updates/disappears across variant switches, including starting from a variant with NO unit pricing and switching to one that has it (the specific direction a fix-round bug once broke).
9. **Accessibility audit.** Verify the selected-pill focus ring is visible on Tab, confirm how a screen reader announces the (corrected) pill group semantics, and run Lighthouse a11y on the product page at both breakpoints (spec requires ≥90).
10. **Both breakpoints, full pass.** Repeat items 3–8 at <750px, including confirming the sticky rule correctly doesn't apply on mobile.
11. **Theme-editor behavior.** Add/remove/reorder each of the 8 blocks in the customizer; confirm `shopify:section:load` re-initialization never double-registers listeners or leaves any interactive piece dead after a hot reload.
12. **Contrast, in situ.** Visually confirm the replaced border colors (variant pills, quantity stepper, gift-card inputs) read as clearly interactive against the page background.
13. **Console clean** throughout all of the above, on every breakpoint and interaction path.
