# STRIDE Theme Homepage — Collection Index, Shoppable Lookbook & Newsletter Band

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the last three of spec §4's seven custom homepage sections: an editorial collection teaser (§4.3), a tagged shoppable lookbook grid (§4.6), and a newsletter signup band (§4.7). This completes spec §4 in full — after this plan, all seven homepage sections exist. All three append to `templates/index.json`'s existing `hero`/`marquee`/`product-anatomy`/`drop-countdown` order.

**Architecture:** Same conventions as all eight previous plans — Liquid + native CSS, tokens via `var(--token)` only, no build step. Collection-index and newsletter-band are static/no-JS (collection-index's hover-reveal is pure CSS; newsletter-band is a native `{% form 'customer' %}`). Shoppable-lookbook is the one section in this plan with JS — a click-toggle fallback for the CSS `:hover`/`:focus-within` popover, needed specifically because touch devices don't reliably support `:hover`. It follows the established `initX(root)` + `shopify:section:load` re-init convention used by `hero-colorway.liquid` and `drop-countdown.liquid`.

**Tech Stack:** Shopify Liquid, native CSS (CSS grid for the lookbook's asymmetric layout, `clamp()` for popover horizontal clamping), one small vanilla JS block (shoppable-lookbook only).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §4.3 (Collection index), §4.6 (Shoppable lookbook), §4.7 (Newsletter band).

## Global Constraints

(Carried over from all eight previous plans; every task below implicitly inherits these.)

- **Every new section must be verified with REAL, populated content at BOTH mobile (<750px) and desktop (≥750px) widths, via actual interaction (clicks, real keyboard input, real hover/focus, real touch-equivalent click) — not a screenshot, and not an empty/default state.** For Task 2 specifically, "real interaction" means actually clicking a hotspot to open its popover via JS, clicking elsewhere to confirm it closes, and pressing Escape to confirm it closes and returns focus — not just reading the CSS `:hover` rule and assuming the JS fallback works.
- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never use `--color-accent-secondary` as small text. Any new color combination (e.g. the lookbook popover's background/text, the hotspot button against `--color-accent`) must be checked against the actual token hex defaults in `config/settings_schema.json`, not assumed compliant by inheritance.
- Touch targets ≥24×24 CSS px on every interactive element (hotspot buttons, collection-index row links, newsletter submit button).
- `prefers-reduced-motion` respected wherever animation/transition is added (collection-index's hover-reveal transform, the lookbook popover's fade/scale-in) — provide an instant-toggle fallback (opacity only, no transform) under `prefers-reduced-motion: reduce`.
- Any section-root element meant to span the full viewport needs the `.full-width` utility, and must add its own horizontal padding (`padding-inline`) since `.full-width` spans past the page margins — this exact gap was found and fixed in the immediately prior plan (drop-countdown, product-anatomy) and must not recur.
- **`{% stylesheet %}`, `{% javascript %}`, and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.** This exact mistake has occurred four times across this project's plans (`theme-check` cannot catch it — only a live render does); check every new section file for it explicitly before considering a task done.
- **Any new locale key must be added to the correct file the first time**: keys consumed via `| t` in section/snippet body markup go in `locales/en.default.json`; keys consumed via `t:` inside a `{% schema %}` block go in `locales/en.default.schema.json`. This exact mistake has also occurred four times.
- **Reuse existing locale/schema keys where the meaning is identical** rather than creating near-duplicates: `t:labels.position_x`/`t:labels.position_y` (from product-anatomy) apply unchanged to the lookbook's hotspot coordinates; `t:labels.product` (from hero-colorway's block) applies unchanged to the lookbook's product picker; `newsletter.email`/`newsletter.submit`/`newsletter.success` (from the footer's newsletter-signup block) apply unchanged to the newsletter-band section's form. Only add a genuinely new key when nothing existing already covers the exact same meaning.
- `templates/index.json`: sections declared in a JSON template must carry their own real `blocks`/`block_order`/`settings` — **presets never apply to template-declared sections**. Every section this plan adds to that file must ship functional, non-empty content wherever an image asset isn't the blocker (collection-index and newsletter-band need no image; the lookbook needs product-photo images, which this environment doesn't have — see Task 2's note on this, matching the documented `hero-colorway`/`product-anatomy` limitation).
- No Lorem Ipsum in default values; every setting has a `label`; every image setting needs an accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, the `{% comment %}` section-header style, reuse existing tokens/spacing scale, z-index below the header's sticky value (`10`) and cart-drawer/mobile-nav's overlay values (`20`/`21`) for any new stacking-context element (use `z-index: 1`–`2` at most).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/collection-index.liquid` | create | Numbered editorial list (desktop hover-reveal image) / responsive grid (mobile), same markup |
| `sections/shoppable-lookbook.liquid` | create | Asymmetric grid of tagged product photos with hover/click-toggle popovers |
| `sections/newsletter-band.liquid` | create | Full-bleed homepage newsletter signup band using the native customer form |
| `templates/index.json` | modify | Appends all three sections, with real populated settings/blocks, after `drop-countdown` |
| `locales/en.default.schema.json` | modify | New `t:` keys for all three sections' settings (reusing existing keys where possible) |
| `locales/en.default.json` | modify | New storefront-facing key for the lookbook popover's "View product" link |

No files are deleted.

---

## Task 1: Collection index section

**Files:**
- Create: `sections/collection-index.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-foreground`, `--color-foreground-muted`, `--color-border`, `--space-1`–`--space-8` (all existing tokens).
- Produces: nothing else in this plan depends on Task 1. All three tasks append to `templates/index.json` sequentially (Task 1 after `drop-countdown`, Task 2 after Task 1's addition, Task 3 after Task 2's) — each task's brief instructs re-reading the file's actual current state before editing, not trusting this plan's literal diff target if anything drifted.

- [ ] **Step 1: Create the section**

Create `sections/collection-index.liquid`:

```liquid
{% comment %}
  Editorial collection teaser. Desktop: numbered list rows with a
  hover-reveal large product image (pure CSS, no JS — each row owns a
  fixed-position preview image shown via :hover/:focus-within on that
  row only, so only one is visible at a time since only one row can be
  :hover/:focus-within at once). Mobile: same markup becomes a standard
  responsive grid via CSS only — hover isn't meaningful on touch, so
  the preview mechanism is simply switched off below 750px in favor of
  an always-visible inline image per spec §4.3.

  This is a homepage TEASER only — the full /collections/[handle] page
  (spec §5.2) carries the actual required filtering/sorting/pagination.
{% endcomment %}

{% if section.settings.collection != blank %}
  {% assign featured_collection = collections[section.settings.collection] %}
  <div class="collection-index full-width">
    {% if section.settings.heading != blank %}
      <h2 class="collection-index__heading">{{ section.settings.heading }}</h2>
    {% endif %}

    <ol class="collection-index__list">
      {% for product in featured_collection.products limit: section.settings.item_limit %}
        <li class="collection-index__row">
          <a href="{{ product.url }}" class="collection-index__link">
            <span class="collection-index__index" aria-hidden="true">{{ forloop.index | prepend: '00' | slice: -2, 2 }}</span>
            <span class="collection-index__title">{{ product.title }}</span>
            <span class="collection-index__price">{{ product.price | money }}</span>
          </a>
          {% if product.featured_image %}
            <span class="collection-index__preview" aria-hidden="true">
              <img
                src="{{ product.featured_image | image_url: width: 800 }}"
                srcset="{{ product.featured_image | image_url: width: 400 }} 400w, {{ product.featured_image | image_url: width: 800 }} 800w"
                sizes="(min-width: 750px) 30vw, 45vw"
                width="{{ product.featured_image.width }}"
                height="{{ product.featured_image.height }}"
                loading="lazy"
                alt=""
              >
            </span>
          {% endif %}
        </li>
      {% endfor %}
    </ol>
  </div>
{% endif %}

{% stylesheet %}
  .collection-index {
    padding-block: var(--space-8);
    padding-inline: var(--space-4);
  }
  @media (min-width: 750px) {
    .collection-index {
      padding-inline: var(--space-6);
    }
  }
  .collection-index__heading {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0 0 var(--space-6);
  }
  .collection-index__list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-width: 60rem;
    margin-inline: auto;
  }
  .collection-index__row {
    position: relative;
    border-bottom: 1px solid var(--color-border);
  }
  .collection-index__link {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    padding-block: var(--space-4);
    text-decoration: none;
    color: var(--color-foreground);
    min-height: 24px;
  }
  .collection-index__index {
    font-family: var(--font-header--family);
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
    flex-shrink: 0;
  }
  .collection-index__title {
    font-family: var(--font-header--family);
    font-size: clamp(1.25rem, 3vw, 2rem);
    flex-grow: 1;
  }
  .collection-index__price {
    color: var(--color-foreground-muted);
    flex-shrink: 0;
  }
  .collection-index__preview {
    display: none;
  }
  @media (min-width: 750px) {
    .collection-index__preview {
      display: block;
      position: fixed;
      top: 50%;
      right: var(--space-8);
      width: min(28vw, 22rem);
      z-index: 1;
      opacity: 0;
      transform: translateY(-50%) scale(0.96);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }
    .collection-index__preview img {
      width: 100%;
      height: auto;
      display: block;
    }
    .collection-index__row:hover .collection-index__preview,
    .collection-index__row:focus-within .collection-index__preview {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }
    @media (prefers-reduced-motion: reduce) {
      .collection-index__preview {
        transition: opacity 0.01ms;
        transform: translateY(-50%);
      }
      .collection-index__row:hover .collection-index__preview,
      .collection-index__row:focus-within .collection-index__preview {
        transform: translateY(-50%);
      }
    }
  }
  @media (max-width: 749px) {
    .collection-index__list {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }
    .collection-index__row {
      border-bottom: none;
    }
    .collection-index__link {
      flex-wrap: wrap;
    }
    .collection-index__preview {
      display: block;
      margin-top: var(--space-2);
    }
    .collection-index__preview img {
      width: 100%;
      height: auto;
      display: block;
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.collection_index",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading",
      "default": "Shop the edit"
    },
    {
      "type": "collection",
      "id": "collection",
      "label": "t:labels.collection"
    },
    {
      "type": "range",
      "id": "item_limit",
      "label": "t:labels.item_limit",
      "min": 3,
      "max": 8,
      "step": 1,
      "default": 5
    }
  ],
  "presets": [
    {
      "name": "t:general.collection_index"
    }
  ]
}
{% endschema %}
```

Note the mobile preview image is NOT hover-gated (`display: block` unconditionally inside the `max-width: 749px` block, no opacity/transform gating) — it's always visible inline, matching spec §4.3's "mobile: standard responsive grid" requirement, same markup as desktop.

- [ ] **Step 2: Add the section to the homepage template with real content**

Read `templates/index.json`'s current content yourself first — it should have `hero`, `marquee`, `product-anatomy`, `drop-countdown` in that order. This section needs a real collection to reference; if this environment's connected dev store has no collections, create one via the Admin GraphQL API (or note if one already exists from a prior task) with a handle you can reference here — check what's actually available before writing the literal `"collection"` value below, since a nonexistent handle means the section's `{% if section.settings.collection != blank %}` guard passes (a value IS set) but `collections[handle]` resolves to nil and no products render, which is a subtly different empty-content bug than the ones this project has hit before (guard passes, content still empty) — confirm the handle you use actually resolves to a collection with products before committing.

Add a `collection-index` entry after `drop-countdown` in both `sections` and `order`:

```json
    "collection-index": {
      "type": "collection-index",
      "settings": {
        "heading": "Shop the edit",
        "collection": "<a real collection handle confirmed to exist and have products>",
        "item_limit": 5
      }
    }
```

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object (in alphabetical order — check neighbors, don't guess):

```json
    "collection_index": "Collection index",
```

Add to the `labels` object:

```json
    "collection": "Collection",
    "item_limit": "Number of products",
```

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 5: Verify in the browser at BOTH breakpoints, with real content**

```bash
shopify theme dev
```

1. **Desktop (≥750px)**: confirm the numbered list renders with real product titles/prices from the configured collection; hover over a row (real mouse hover, not just CSS inspection) and confirm that row's preview image fades/scales in near the right edge of the viewport, and that hovering a DIFFERENT row swaps to that row's own image with no overlap or stacking glitch. Also Tab to a row's link via keyboard and confirm `:focus-within` shows the same preview (keyboard-equivalent to hover).
2. **Mobile (<750px)**: confirm the same markup now renders as a single-column stacked grid with each product's image always visible beneath its title/price (not hover-gated).
3. Confirm the fixed-position preview never visually collides with the sticky header when scrolled (z-index and vertical centering should keep it clear, but verify at least once with the page scrolled partway).
4. Check the browser console for errors.

- [ ] **Step 6: Commit**

```bash
git add sections/collection-index.liquid templates/index.json locales/en.default.schema.json
git commit -m "feat: add homepage collection index section"
```

---

## Task 2: Shoppable lookbook section

**Files:**
- Create: `sections/shoppable-lookbook.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `--color-accent`, `--color-on-accent`, `--color-surface`, `--color-foreground`, `--color-foreground-muted`, `--space-1`–`--space-6` (existing tokens), `t:labels.position_x`/`t:labels.position_y`/`t:labels.product` (reused, not duplicated, from `product-anatomy`/`hero-colorway`).
- Produces: nothing else in this plan depends on Task 2. Read `templates/index.json`'s actual state after Task 1 before editing (don't trust this plan's literal diff target if anything drifted).

Nested repeater blocks (one photo with multiple independent hotspots) are not supported by classic Shopify section/block schema. This plan's block design is therefore **one block = one photo tile with exactly one product hotspot** (image, hotspot x/y, linked product) — matching how the spec's "asymmetric grid" reads visually: a merchant adds multiple `look` blocks, each becoming one grid tile with its own single tagged point. This is a deliberate schema-shape decision, not a simplification of the spec's intent.

- [ ] **Step 1: Create the section**

Create `sections/shoppable-lookbook.liquid`:

```liquid
{% comment %}
  Asymmetric grid of tagged lookbook photos. Each block is one photo
  tile with exactly one product hotspot (a repeater of "one photo, many
  hotspots" isn't representable in classic section/block schema, so the
  grid itself provides the "many photos, many tags" effect instead).
  Hotspot popovers show via CSS :hover/:focus-within for mouse/keyboard
  (no JS required for that base experience) — the JS in this file is
  ONLY a click-toggle fallback for touch devices, which don't reliably
  support :hover. No separate close button: the popover dismisses via
  re-clicking the same hotspot, clicking elsewhere, or Escape.
{% endcomment %}

{% if section.blocks.size > 0 %}
  <div class="shoppable-lookbook full-width">
    {% if section.settings.heading != blank %}
      <h2 class="shoppable-lookbook__heading">{{ section.settings.heading }}</h2>
    {% endif %}

    <div class="shoppable-lookbook__grid">
      {% for block in section.blocks %}
        <div class="shoppable-lookbook__item" {{ block.shopify_attributes }}>
          {% if block.settings.image != blank %}
            <img
              class="shoppable-lookbook__image"
              src="{{ block.settings.image | image_url: width: 1200 }}"
              srcset="{{ block.settings.image | image_url: width: 600 }} 600w, {{ block.settings.image | image_url: width: 1200 }} 1200w"
              sizes="(min-width: 750px) 40vw, 90vw"
              width="{{ block.settings.image.width }}"
              height="{{ block.settings.image.height }}"
              loading="lazy"
              alt="{{ block.settings.image.alt | escape }}"
            >
          {% endif %}

          {% if block.settings.product != blank %}
            {% assign tagged_product = block.settings.product %}
            <button
              type="button"
              class="shoppable-lookbook__hotspot"
              style="left: {{ block.settings.position_x }}%; top: {{ block.settings.position_y }}%"
              aria-expanded="false"
              aria-controls="LookbookPopover-{{ block.id }}"
              aria-label="{{ 'lookbook.view_product_named' | t: product: tagged_product.title }}"
              data-lookbook-hotspot
            >
              <span aria-hidden="true">+</span>
            </button>
            <div class="shoppable-lookbook__popover" id="LookbookPopover-{{ block.id }}" style="left: {{ block.settings.position_x }}%; top: {{ block.settings.position_y }}%">
              {% if tagged_product.featured_image %}
                <img
                  class="shoppable-lookbook__popover-image"
                  src="{{ tagged_product.featured_image | image_url: width: 200 }}"
                  width="{{ tagged_product.featured_image.width }}"
                  height="{{ tagged_product.featured_image.height }}"
                  loading="lazy"
                  alt=""
                >
              {% endif %}
              <span class="shoppable-lookbook__popover-title">{{ tagged_product.title }}</span>
              <span class="shoppable-lookbook__popover-price">{{ tagged_product.price | money }}</span>
              <a href="{{ tagged_product.url }}" class="shoppable-lookbook__popover-link">{{ 'lookbook.view_product' | t }}</a>
            </div>
          {% endif %}
        </div>
      {% endfor %}
    </div>
  </div>
{% endif %}

{% stylesheet %}
  .shoppable-lookbook {
    padding-block: var(--space-8);
    padding-inline: var(--space-4);
  }
  @media (min-width: 750px) {
    .shoppable-lookbook {
      padding-inline: var(--space-6);
    }
  }
  .shoppable-lookbook__heading {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0 0 var(--space-6);
    text-align: center;
  }
  .shoppable-lookbook__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 16rem;
    gap: var(--space-3);
  }
  @media (min-width: 750px) {
    .shoppable-lookbook__grid {
      grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: 14rem;
      gap: var(--space-4);
    }
    .shoppable-lookbook__item:nth-child(3n+1) {
      grid-column: span 2;
      grid-row: span 2;
    }
  }
  .shoppable-lookbook__item {
    position: relative;
    overflow: hidden;
    background-color: var(--color-background-alt);
  }
  .shoppable-lookbook__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .shoppable-lookbook__hotspot {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 2rem;
    height: 2rem;
    min-width: 24px;
    min-height: 24px;
    border-radius: 50%;
    border: none;
    background-color: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 1.125rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 0 0 3px rgb(255 255 255 / 60%);
    z-index: 1;
  }
  .shoppable-lookbook__hotspot:focus-visible {
    outline: 2px solid var(--color-on-accent);
    outline-offset: 2px;
  }
  .shoppable-lookbook__popover {
    position: absolute;
    left: clamp(8%, var(--hx, 50%), 92%);
    transform: translate(-50%, calc(-100% - var(--space-4)));
    width: 12rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: var(--space-3);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    box-shadow: 0 4px 16px rgb(0 0 0 / 20%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    z-index: 2;
  }
  .shoppable-lookbook__item:hover .shoppable-lookbook__popover,
  .shoppable-lookbook__item:focus-within .shoppable-lookbook__popover,
  .shoppable-lookbook__popover.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .shoppable-lookbook__popover {
      transition: opacity 0.01ms;
    }
  }
  .shoppable-lookbook__popover-image {
    width: 100%;
    height: auto;
    display: block;
  }
  .shoppable-lookbook__popover-title {
    font-weight: 700;
    font-size: 0.875rem;
  }
  .shoppable-lookbook__popover-price {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
  }
  .shoppable-lookbook__popover-link {
    font-size: 0.875rem;
    text-decoration: underline;
    color: var(--color-foreground);
    min-height: 24px;
    display: inline-flex;
    align-items: center;
  }
{% endstylesheet %}

{% javascript %}
  function initLookbook(root) {
    var hotspots = root.matches && root.matches('[data-lookbook-hotspot]')
      ? [root]
      : Array.prototype.slice.call(root.querySelectorAll('[data-lookbook-hotspot]'));

    function closeAll(exceptButton) {
      hotspots.forEach(function (button) {
        if (button === exceptButton) return;
        var popover = document.getElementById(button.getAttribute('aria-controls'));
        button.setAttribute('aria-expanded', 'false');
        if (popover) popover.classList.remove('is-open');
      });
    }

    hotspots.forEach(function (button) {
      var popover = document.getElementById(button.getAttribute('aria-controls'));
      if (!popover) return;

      button.addEventListener('click', function () {
        var isOpen = popover.classList.contains('is-open');
        closeAll(button);
        popover.classList.toggle('is-open', !isOpen);
        button.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.shoppable-lookbook__item')) {
        closeAll(null);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var openButton = hotspots.find(function (button) {
        return button.getAttribute('aria-expanded') === 'true';
      });
      if (openButton) {
        closeAll(null);
        openButton.focus();
      }
    });
  }

  initLookbook(document);
  document.addEventListener('shopify:section:load', function (event) {
    initLookbook(event.target);
  });
{% endjavascript %}

{% schema %}
{
  "name": "t:general.shoppable_lookbook",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading",
      "default": "Shop the look"
    }
  ],
  "blocks": [
    {
      "type": "look",
      "name": "t:general.look",
      "settings": [
        {
          "type": "image_picker",
          "id": "image",
          "label": "t:labels.image"
        },
        {
          "type": "product",
          "id": "product",
          "label": "t:labels.product"
        },
        {
          "type": "range",
          "id": "position_x",
          "label": "t:labels.position_x",
          "min": 0,
          "max": 100,
          "step": 1,
          "unit": "%",
          "default": 50
        },
        {
          "type": "range",
          "id": "position_y",
          "label": "t:labels.position_y",
          "min": 0,
          "max": 100,
          "step": 1,
          "unit": "%",
          "default": 50
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "t:general.shoppable_lookbook",
      "blocks": [
        { "type": "look" },
        { "type": "look" },
        { "type": "look" }
      ]
    }
  ]
}
{% endschema %}
```

Two things flagged for your own judgment, not just transcription:

1. The popover's `left: clamp(8%, var(--hx, 50%), 92%)` references a CSS custom property `--hx` that is never actually set anywhere in this brief's markup (this was written assuming a `style="--hx: {{ position_x }}%"` inline declaration that got dropped when simplifying — a real gap, not a trick). Fix it: either add `--hx: {{ block.settings.position_x }}%;` to the popover's inline `style` attribute (alongside the existing `left`/`top`), or replace the `clamp()` reference with the same literal `{{ block.settings.position_x }}%` pattern the `.shoppable-lookbook__hotspot` uses and drop the custom-property indirection entirely if that's simpler. Verify the popover doesn't render at a hardcoded 50% for every hotspot regardless of configured position — that would be a real, live-visible bug if left unfixed.
2. Verify the touch/click-toggle and CSS `:hover`/`:focus-within` mechanisms don't fight each other on an actual touch device (or touch-emulated browser testing) — e.g., does a tap that triggers `:hover`-like state on some mobile browsers ALSO fire the click listener, causing an immediate open-then-close double-toggle? Test this specifically, don't assume it's fine.

- [ ] **Step 2: Add the section to the homepage template with real content**

Read `templates/index.json`'s current content after Task 1's edit first. This section needs both real product references (a `product` block setting) and real photo images (an `image` block setting) to render meaningfully. As with `hero-colorway`/`product-anatomy`, this environment has no real product-photography assets — populate the `product` picker settings with real product handles from the connected dev store's catalog (confirm at least 3 real products exist and get their handles/IDs the same way prior tasks resolved products), but the `image` setting will remain unset in the committed file for the same documented reason as before. Since this section's zero-content guard is only `section.blocks.size > 0` (not gated on image, unlike product-anatomy) — confirm what this actually renders as with blocks present but no images: each tile will show its background-color placeholder (`--color-background-alt`) plus a fully-functional hotspot/popover (since those don't depend on the image). This is different from product-anatomy's all-or-nothing gate — document this real difference in your task report, and confirm it's an acceptable degraded-but-not-broken state (no broken image icons, no layout collapse) rather than treating it as equivalent to product-anatomy's clean invisibility.

Add a `shoppable-lookbook` entry after `collection-index` with 3 real `look` blocks (real linked products, real position_x/position_y spread across different tiles, no image):

```json
    "shoppable-lookbook": {
      "type": "shoppable-lookbook",
      "blocks": {
        "look-1": {
          "type": "look",
          "settings": {
            "product": "<a real product handle>",
            "position_x": 50,
            "position_y": 60
          }
        },
        "look-2": {
          "type": "look",
          "settings": {
            "product": "<a real product handle>",
            "position_x": 40,
            "position_y": 45
          }
        },
        "look-3": {
          "type": "look",
          "settings": {
            "product": "<a real product handle>",
            "position_x": 55,
            "position_y": 50
          }
        }
      },
      "block_order": ["look-1", "look-2", "look-3"],
      "settings": {
        "heading": "Shop the look"
      }
    }
```

Add `"shoppable-lookbook"` to `order` right after `"collection-index"`.

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object (alphabetically):

```json
    "shoppable_lookbook": "Shoppable lookbook",
    "look": "Look",
```

No new `labels` keys needed — `position_x`/`position_y`/`product`/`image`/`heading` all already exist and are being reused verbatim.

- [ ] **Step 4: Add the storefront locale keys**

In `locales/en.default.json`, add a new top-level `lookbook` key (insert alphabetically):

```json
  "lookbook": {
    "view_product": "View product",
    "view_product_named": "View {{ product }}"
  },
```

(`view_product_named` is used for the hotspot button's `aria-label` via `| t: product: tagged_product.title` — confirm Shopify's translation interpolation syntax for a variable named `product` works as expected; if `product` collides with a reserved interpolation name or behaves unexpectedly, adjust the placeholder name, e.g. `product_title`, and update both the locale value and the Liquid call site consistently.)

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser at BOTH breakpoints, with real interaction**

```bash
shopify theme dev
```

1. **Desktop (≥750px)**: confirm the asymmetric grid renders (some tiles visibly larger via the `nth-child(3n+1)` span rule). Hover a hotspot's parent tile (real mouse hover) and confirm the popover appears with the CORRECT product's title/price (not a different tile's) at roughly the configured x/y position — this directly tests the `--hx`/position bug flagged in Step 1. Tab to a hotspot via keyboard and confirm `:focus-within` shows the same popover.
2. **Click-toggle (the actual JS path)**: click a hotspot directly (simulating touch) — confirm the popover opens, `aria-expanded` becomes `"true"`. Click a DIFFERENT hotspot — confirm the first popover closes and the second opens (only one open at a time). Click elsewhere on the page (not any hotspot) — confirm the open popover closes. Re-open one, press Escape — confirm it closes AND focus returns to that hotspot button.
3. **Mobile (<750px)**: confirm the grid becomes 2 columns (no asymmetric spans, since the `nth-child` rule is inside the `min-width: 750px` query) and hotspots/popovers still function via click-toggle.
4. Check the browser console for errors throughout, including during rapid open/close toggling.

- [ ] **Step 7: Commit**

```bash
git add sections/shoppable-lookbook.liquid templates/index.json locales/en.default.schema.json locales/en.default.json
git commit -m "feat: add homepage shoppable lookbook section"
```

---

## Task 3: Newsletter band section

**Files:**
- Create: `sections/newsletter-band.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-background-alt`, `--color-foreground`, `--color-foreground-muted`, `--color-surface`, `--space-1`–`--space-8` (existing tokens), `newsletter.email`/`newsletter.submit`/`newsletter.success` (reused, not duplicated, from the footer's `blocks/newsletter-signup.liquid`).
- Produces: nothing else in this plan depends on Task 3. Read `templates/index.json`'s actual state after Task 2 before editing.

This section is deliberately similar in form-handling to the existing `blocks/newsletter-signup.liquid` footer block (same native `{% form 'customer' %}`, same `contact[tags]` segmentation, same locale keys) but is a distinct, larger, full-bleed homepage band — not a refactor of the footer block into a shared snippet. Keep them separate; do not attempt to extract a shared snippet in this task (out of scope, not requested by the spec, and would touch the already-shipped/reviewed footer).

- [ ] **Step 1: Create the section**

Create `sections/newsletter-band.liquid`:

```liquid
{% comment %}
  Full-bleed homepage newsletter signup band. Uses Shopify's native
  customer form (no custom backend) — same mechanism as the footer's
  newsletter-signup block, reusing its locale keys, but presented at
  homepage-band scale rather than the footer's compact block size.
{% endcomment %}

<div class="newsletter-band full-width">
  <div class="newsletter-band__content">
    {% if section.settings.heading != blank %}
      <h2 class="newsletter-band__heading">{{ section.settings.heading }}</h2>
    {% endif %}
    {% if section.settings.subtext != blank %}
      <p class="newsletter-band__subtext">{{ section.settings.subtext }}</p>
    {% endif %}

    {% form 'customer', class: 'newsletter-band__form' %}
      <input type="hidden" name="contact[tags]" value="newsletter">

      {% if form.posted_successfully? %}
        <p class="newsletter-band__success">
          {% if section.settings.success_message != blank %}
            {{ section.settings.success_message }}
          {% else %}
            {{ 'newsletter.success' | t }}
          {% endif %}
        </p>
      {% else %}
        {% if form.errors %}
          <div class="newsletter-band__error">
            {{ form.errors | default_errors }}
          </div>
        {% endif %}

        <div class="newsletter-band__field">
          <label for="NewsletterBandEmail-{{ section.id }}" class="visually-hidden">{{ 'newsletter.email' | t }}</label>
          <input
            type="email"
            name="contact[email]"
            id="NewsletterBandEmail-{{ section.id }}"
            placeholder="{{ 'newsletter.email' | t }}"
            autocomplete="email"
            value="{% if form.email %}{{ form.email | escape }}{% endif %}"
            required
          >
          <button type="submit">{{ 'newsletter.submit' | t }}</button>
        </div>
      {% endif %}
    {% endform %}
  </div>
</div>

{% stylesheet %}
  .newsletter-band {
    background-color: var(--color-background-alt);
    padding-block: var(--space-8);
    padding-inline: var(--space-4);
  }
  @media (min-width: 750px) {
    .newsletter-band {
      padding-inline: var(--space-6);
    }
  }
  .newsletter-band__content {
    max-width: 32rem;
    margin-inline: auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }
  .newsletter-band__heading {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0;
  }
  .newsletter-band__subtext {
    color: var(--color-foreground-muted);
    margin: 0;
  }
  .newsletter-band__form {
    width: 100%;
  }
  .newsletter-band__field {
    display: flex;
    gap: var(--space-2);
  }
  .newsletter-band__field input {
    flex-grow: 1;
    min-height: 24px;
    border: 1px solid var(--color-foreground-muted);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    padding: var(--space-3);
    border-radius: var(--style-border-radius-inputs);
  }
  .newsletter-band__field button {
    flex-shrink: 0;
    min-height: 24px;
    border: 1px solid var(--color-foreground);
    background-color: var(--color-foreground);
    color: var(--color-background);
    padding: var(--space-3) var(--space-5);
    cursor: pointer;
    font-weight: 700;
    border-radius: var(--style-border-radius-inputs);
  }
  .newsletter-band__success {
    font-weight: 700;
    color: var(--color-foreground);
    margin: 0;
  }
  .newsletter-band__error {
    color: var(--color-urgency);
  }
  @media (max-width: 480px) {
    .newsletter-band__field {
      flex-direction: column;
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.newsletter_band",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading",
      "default": "Be first to know"
    },
    {
      "type": "textarea",
      "id": "subtext",
      "label": "t:labels.subtext",
      "default": "New drops, restocks, and members-only access — straight to your inbox."
    },
    {
      "type": "textarea",
      "id": "success_message",
      "label": "t:labels.success_message"
    }
  ],
  "presets": [
    {
      "name": "t:general.newsletter_band"
    }
  ]
}
{% endschema %}
```

Confirm the `.visually-hidden` utility class already exists in the theme's base CSS (used elsewhere in this project for visually-hidden-but-accessible labels — check `assets/critical.css` or equivalent before assuming it's available; if it doesn't exist, add the standard clip-based visually-hidden rule to this section's own stylesheet instead of assuming a shared utility that isn't actually there).

- [ ] **Step 2: Add the section to the homepage template with real content**

Read `templates/index.json`'s current content after Task 2's edit first. Add a `newsletter-band` entry after `shoppable-lookbook`:

```json
    "newsletter-band": {
      "type": "newsletter-band",
      "settings": {
        "heading": "Be first to know",
        "subtext": "New drops, restocks, and members-only access — straight to your inbox.",
        "success_message": "Thanks — you're on the list."
      }
    }
```

Add `"newsletter-band"` to `order` right after `"shoppable-lookbook"`. This is the natural final section of the homepage (after it, only the footer follows, which is a section group, not part of this template).

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object (alphabetically):

```json
    "newsletter_band": "Newsletter band",
```

Add to the `labels` object:

```json
    "success_message": "Success message",
```

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 5: Verify in the browser at BOTH breakpoints, with real interaction**

```bash
shopify theme dev
```

1. **Desktop (≥750px) and Mobile (<750px)**: confirm the band renders with heading/subtext, the email field and submit button are both visible and usable, and at very narrow widths (≤480px) the field/button stack vertically instead of overflowing.
2. **Real form submission**: actually submit the form with a real (test) email address and confirm either the configured success message renders (if the store's customer-form settings allow immediate posting in dev) or that Shopify's expected redirect/behavior occurs without a JS error — check what actually happens in this dev environment (native forms may behave differently locally vs a live store; report exactly what you observe rather than assuming the happy path based on the code alone).
3. Submit with an invalid email (or trigger a validation error some other way) and confirm `form.errors` renders visibly, not silently swallowed.
4. Check touch target sizes on the email input and submit button (both should clear 24×24 CSS px).
5. Check the browser console for errors.

- [ ] **Step 6: Commit**

```bash
git add sections/newsletter-band.liquid templates/index.json locales/en.default.schema.json
git commit -m "feat: add homepage newsletter band section"
```

---

## Self-Review Notes

- **Spec coverage**: §4.3 (numbered list, hover-reveal image desktop, responsive grid mobile, homepage-teaser-only framing) → Task 1, fully covered. §4.6 (image + product-tag hotspots, asymmetric grid, CSS hover/focus popover with JS click-toggle touch fallback) → Task 2, fully covered, with the block-schema-shape deviation (one photo = one hotspot, not one photo with many) explicitly called out and justified rather than silently simplified. §4.7 (heading/subtext/success message, native customer form) → Task 3, fully covered.
- **Two flagged, not-fully-resolved risks carried into task execution rather than silently assumed correct**: Task 2's popover position custom-property gap (a real, plausible copy-paste-style bug baked into this plan's own draft code — flagged explicitly so the implementer fixes it rather than shipping broken hotspot-to-popover position mapping), and Task 2's touch/hover double-toggle interaction risk (flagged for explicit live testing, not assumed fine by inspection).
- **`templates/index.json` real-content requirement met differently per task**: Task 1 needs a real collection (verified to actually have products, not just a non-blank handle). Task 2 ships real product references but knowingly no images (documented, non-blocking degraded state — different from product-anatomy's all-or-nothing gate, and that difference is explicitly flagged for the implementer to verify and report on rather than assume equivalent). Task 3 needs no external asset at all.
- **After this plan**: all seven spec §4 homepage sections exist. Per spec §13's phase order, remaining work moves to the product page (§5.1/phase 5), collection page (§5.2/phase 6), and onward — not more homepage sections.
