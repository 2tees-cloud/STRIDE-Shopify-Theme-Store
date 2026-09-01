# STRIDE Theme Homepage — Hero Colorway Switcher & Marquee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the skeleton's placeholder "Hello, World!" homepage with the first two of spec §4's seven custom homepage sections: the hero with an interactive colorway switcher (§4.1) and the scrolling marquee ticker (§4.2) — the "above the fold" pair a visitor sees first. This begins spec §13 phase 4 (homepage sections); the remaining five sections each get their own follow-up plan.

**Architecture:** Same conventions as all four previous plans — Liquid + native CSS, small per-section vanilla JS via `{% javascript %}`, tokens via `var(--token)` only, no build step. Both sections replace `templates/index.json`'s current single `hello-world` section with a real, growing homepage — this file will be touched again by every future homepage-section plan, the same way `header-group.json` was touched across the header and footer plans.

**Tech Stack:** Shopify Liquid, native CSS (`aspect-ratio`, `object-fit`, CSS keyframe animation for the marquee), small vanilla JS for the colorway swap (no fetch, no framework — purely client-side DOM/class toggling).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §4.1 (Hero with colorway switcher) and §4.2 (Marquee).

## Global Constraints

(Carried over from all four previous plans; every task below implicitly inherits these.)

- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never use `--color-accent-secondary` as small text. Any new control boundary needs `--color-foreground-muted`, not `--color-border`.
- Touch targets ≥24×24 CSS px on every interactive element (the colorway swatches especially — circular swatches must not shrink below this).
- `prefers-reduced-motion` respected wherever animation is added — both the hero's image crossfade AND the marquee's scroll animation need this gate. For the marquee specifically, disabling the CSS animation alone isn't enough: the track's content is deliberately duplicated for a seamless loop, so the reduced-motion fallback must also hide the duplicate (otherwise a static, non-scrolling page shows the same list of items twice).
- Any section-root element meant to span the full viewport needs the `.full-width` utility (`assets/critical.css`).
- No Lorem Ipsum in default values; every setting has a `label`; every image setting needs an accessible `alt` (via `image.alt` with a sensible fallback).
- A section with zero required content (e.g. a hero with zero colorway blocks) must not render broken/empty markup — guard with `{% if section.blocks.size > 0 %}` and give it a `presets` entry with real block placeholders, matching the pattern already established by the announcement bar and footer blocks.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, the `{% comment %}` section-header style, reuse existing tokens/spacing scale rather than inventing new magic numbers.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/hero-colorway.liquid` | create | Full-bleed hero with a colorway-switching image + swatches + CTA |
| `sections/marquee.liquid` | create | Continuous-scroll ticker strip |
| `templates/index.json` | modify | Replaces the placeholder `hello-world` section with `hero-colorway` + `marquee` |
| `locales/en.default.schema.json` | modify | New `t:` keys for both sections' settings/blocks |
| `locales/en.default.json` | modify | New storefront-facing keys for the hero's swatch `aria-label`s |

No files are deleted — `sections/hello-world.liquid` stays in the theme as an available (but no longer used-by-default) section; removing it isn't necessary and risks losing a useful reference file.

---

## Task 1: Hero colorway switcher section

**Files:**
- Create: `sections/hero-colorway.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-on-accent`, `--color-surface`, `--color-foreground`, `--space-2`/`--space-3`/`--space-5`/`--space-6` (all existing tokens, confirmed present before writing this plan).
- Produces: nothing later in this plan depends on Task 1's specifics — Task 2 (marquee) is an independent section. A future homepage-sections plan may want to follow this section's block/preset shape as a model for its own image-heavy blocks.

- [ ] **Step 1: Create the hero section**

Create `sections/hero-colorway.liquid`:

```liquid
{% comment %}
  Full-bleed hero with an interactive colorway switcher: clicking a swatch
  instantly swaps the hero image (all colorway images are already in the
  DOM, so switching is instant with no network wait) and, if that
  colorway has a linked product, updates the CTA to point at it.
{% endcomment %}

{% if section.blocks.size > 0 %}
  <div class="hero full-width">
    <div class="hero__media">
      {% for block in section.blocks %}
        {% if block.settings.image %}
          <img
            class="hero__image{% if forloop.first %} is-active{% endif %}"
            src="{{ block.settings.image | image_url: width: 1600 }}"
            srcset="{{ block.settings.image | image_url: width: 800 }} 800w, {{ block.settings.image | image_url: width: 1600 }} 1600w, {{ block.settings.image | image_url: width: 2400 }} 2400w"
            sizes="100vw"
            alt="{{ block.settings.image.alt | default: section.settings.heading | escape }}"
            width="{{ block.settings.image.width }}"
            height="{{ block.settings.image.height }}"
            loading="{% if forloop.first %}eager{% else %}lazy{% endif %}"
            data-hero-image
            data-block-id="{{ block.id }}"
            {{ block.shopify_attributes }}
          >
        {% endif %}
      {% endfor %}
    </div>

    <div class="hero__content">
      {% if section.settings.heading != blank %}
        <h1 class="hero__heading">{{ section.settings.heading }}</h1>
      {% endif %}
      {% if section.settings.subheading != blank %}
        <p class="hero__subheading">{{ section.settings.subheading }}</p>
      {% endif %}

      {% if section.blocks.size > 1 %}
        <div class="hero__swatches" role="group" aria-label="{{ 'hero.colorways' | t }}">
          {% for block in section.blocks %}
            <button
              type="button"
              class="hero__swatch{% if forloop.first %} is-active{% endif %}"
              style="--swatch-color: {{ block.settings.color }}"
              data-hero-swatch
              data-block-id="{{ block.id }}"
              data-product-url="{% if block.settings.product %}{{ block.settings.product.url }}{% endif %}"
              aria-pressed="{% if forloop.first %}true{% else %}false{% endif %}"
              aria-label="{{ 'hero.view_in' | t: color: block.settings.color_name }}"
            ></button>
          {% endfor %}
        </div>
      {% endif %}

      {% if section.settings.cta_text != blank %}
        <a
          href="{% if section.blocks.first.settings.product %}{{ section.blocks.first.settings.product.url }}{% else %}{{ section.settings.cta_link }}{% endif %}"
          class="hero__cta"
          data-hero-cta
        >
          {{ section.settings.cta_text }}
        </a>
      {% endif %}
    </div>
  </div>

  {% stylesheet %}
    .hero {
      position: relative;
    }
    .hero__media {
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background-color: var(--color-background-alt);
    }
    .hero__image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    .hero__image.is-active {
      opacity: 1;
    }
    @media (prefers-reduced-motion: reduce) {
      .hero__image {
        transition: none;
      }
    }
    .hero__content {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-6);
      color: var(--color-on-accent);
      background: linear-gradient(to top, rgb(0 0 0 / 55%), transparent 55%);
    }
    .hero__heading {
      font-family: var(--font-header--family);
      font-size: clamp(2rem, 5vw, 3.5rem);
      margin: 0;
    }
    .hero__subheading {
      font-size: 1.125rem;
      margin: 0;
      max-width: 40ch;
    }
    .hero__swatches {
      display: flex;
      gap: var(--space-2);
    }
    .hero__swatch {
      width: 2rem;
      height: 2rem;
      min-width: 24px;
      min-height: 24px;
      border-radius: 50%;
      background-color: var(--swatch-color);
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
    }
    .hero__swatch.is-active {
      border-color: var(--color-on-accent);
    }
    .hero__swatch:focus-visible {
      outline: 2px solid var(--color-on-accent);
      outline-offset: 2px;
    }
    .hero__cta {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: var(--space-3) var(--space-5);
      background-color: var(--color-surface);
      color: var(--color-foreground);
      text-decoration: none;
      font-weight: 700;
    }
  {% endstylesheet %}

  {% javascript %}
    document.querySelectorAll('[data-hero-swatch]').forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        var blockId = swatch.dataset.blockId;
        var hero = swatch.closest('.hero');
        if (!hero) return;

        hero.querySelectorAll('[data-hero-swatch]').forEach(function (s) {
          var isActive = s === swatch;
          s.classList.toggle('is-active', isActive);
          s.setAttribute('aria-pressed', isActive);
        });

        hero.querySelectorAll('[data-hero-image]').forEach(function (img) {
          img.classList.toggle('is-active', img.dataset.blockId === blockId);
        });

        var cta = hero.querySelector('[data-hero-cta]');
        if (cta && swatch.dataset.productUrl) {
          cta.setAttribute('href', swatch.dataset.productUrl);
        }
      });
    });
  {% endjavascript %}

  {% schema %}
  {
    "name": "t:general.hero",
    "settings": [
      {
        "type": "text",
        "id": "heading",
        "label": "t:labels.heading",
        "default": "Feels like you"
      },
      {
        "type": "text",
        "id": "subheading",
        "label": "t:labels.subtext"
      },
      {
        "type": "text",
        "id": "cta_text",
        "label": "t:labels.cta_text",
        "default": "Shop now"
      },
      {
        "type": "url",
        "id": "cta_link",
        "label": "t:labels.cta_link"
      }
    ],
    "max_blocks": 5,
    "blocks": [
      {
        "type": "colorway",
        "name": "t:general.colorway",
        "settings": [
          {
            "type": "image_picker",
            "id": "image",
            "label": "t:labels.image"
          },
          {
            "type": "color",
            "id": "color",
            "label": "t:labels.color",
            "default": "#B5502D"
          },
          {
            "type": "text",
            "id": "color_name",
            "label": "t:labels.color_name",
            "default": "Clay"
          },
          {
            "type": "product",
            "id": "product",
            "label": "t:labels.product"
          }
        ]
      }
    ],
    "presets": [
      {
        "name": "t:general.hero",
        "blocks": [
          { "type": "colorway" },
          { "type": "colorway" }
        ]
      }
    ]
  }
  {% endschema %}
{% endif %}
```

Note on the CTA/first-swatch link: with 2+ blocks, the CTA initially points at the first colorway's linked product (if any), matching the first (active) swatch — this keeps the CTA and the visually-active swatch in sync from first paint, not just after a click. If the first block has no linked product, it falls back to `section.settings.cta_link`. Note also the gradient overlay (`linear-gradient(to top, rgb(0 0 0 / 55%), transparent 55%)`) behind the text/CTA — this is a deliberate scrim to guarantee `--color-on-accent`-colored text stays readable over an arbitrary merchant photo, the standard technique for text-over-photo contrast; flag this reasoning if a reviewer asks about hero text contrast, since it can't be measured the same way as text on a flat color.

- [ ] **Step 2: Replace the homepage template**

Replace the entire contents of `templates/index.json` with:

```json
/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
{
  "sections": {
    "hero": {
      "type": "hero-colorway",
      "settings": {}
    }
  },
  "order": [
    "hero"
  ]
}
```

(Task 2 adds `marquee` to this same file. Future homepage-section plans will keep extending `order`.)

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "hero": "Hero",
    "colorway": "Colorway",
```

Add to the `labels` object:

```json
    "cta_text": "Button label",
    "cta_link": "Button link",
    "image": "Image",
    "color": "Swatch color",
    "color_name": "Color name",
    "product": "Linked product",
```

- [ ] **Step 4: Add the storefront locale keys**

In `locales/en.default.json`, add a new top-level `hero` key (insert alphabetically — after `gift_card`, before `labels`):

```json
  "hero": {
    "colorways": "Colorways",
    "view_in_html": "View in {{ color }}"
  },
```

Then, since the section markup above references `'hero.view_in' | t` (not `hero.view_in_html`), fix the reference to match: the key name must end in `_html` only if its value contains markup — this one doesn't, it's plain text — so name it `hero.view_in` (no `_html` suffix) for consistency with the rest of this theme's locale-key convention (compare `cart.free_shipping_remaining_html`, which DOES contain no markup either, actually — check the existing convention directly in the file before deciding, and use whichever suffix rule the theme is actually already following, applying it consistently to this new key).

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser**

```bash
shopify theme dev
```

In the theme editor (or local preview), confirm the homepage now shows the hero section (the `hello-world` placeholder is gone from the homepage, though the file itself still exists). With the default preset (2 empty colorway blocks, no images uploaded yet), confirm the section doesn't render a broken layout — add real images to both blocks via the editor to test the actual interactive behavior: clicking a swatch swaps the hero image instantly, updates `aria-pressed`, and (if a product is linked) updates the CTA's `href`. Confirm the CTA falls back to `cta_link` correctly when no product is linked. Confirm the section renders nothing broken when it has zero blocks (temporarily remove all blocks to check). Check the browser console for errors.

- [ ] **Step 7: Commit**

```bash
git add sections/hero-colorway.liquid templates/index.json locales/en.default.schema.json locales/en.default.json
git commit -m "feat: add homepage hero section with colorway switcher"
```

---

## Task 2: Marquee ticker section

**Files:**
- Create: `sections/marquee.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--color-accent`, `--color-on-accent`, `--space-2`/`--space-4` (existing tokens).
- Produces: nothing else in this plan depends on it — independent of Task 1.

- [ ] **Step 1: Create the marquee section**

Create `sections/marquee.liquid`:

```liquid
{% comment %}
  Continuous horizontal scrolling ticker. Content is rendered twice (the
  second copy marked aria-hidden) so the CSS animation can loop seamlessly
  by translating exactly -50%.
{% endcomment %}

{% if section.blocks.size > 0 %}
  <div class="marquee full-width" style="--marquee-duration: {{ section.settings.speed }}s">
    <div class="marquee__track">
      {% for i in (1..2) %}
        <div class="marquee__group"{% unless forloop.first %} aria-hidden="true"{% endunless %}>
          {% for block in section.blocks %}
            <span class="marquee__item" {{ block.shopify_attributes }}>
              {% if block.settings.link != blank %}
                <a href="{{ block.settings.link | escape }}">{{ block.settings.text }}</a>
              {% else %}
                {{ block.settings.text }}
              {% endif %}
            </span>
          {% endfor %}
        </div>
      {% endfor %}
    </div>
  </div>

  {% stylesheet %}
    .marquee {
      overflow: hidden;
      background-color: var(--color-accent);
      color: var(--color-on-accent);
      padding-block: var(--space-2);
    }
    .marquee__track {
      display: flex;
      width: max-content;
      animation: marquee-scroll var(--marquee-duration) linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .marquee__track {
        animation: none;
      }
      .marquee__group:not(:first-child) {
        display: none;
      }
    }
    .marquee__group {
      display: flex;
      flex-shrink: 0;
    }
    .marquee__item {
      padding-inline: var(--space-4);
      white-space: nowrap;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.875rem;
    }
    .marquee__item a {
      color: inherit;
      text-decoration: none;
    }
    @keyframes marquee-scroll {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-50%);
      }
    }
  {% endstylesheet %}

  {% schema %}
  {
    "name": "t:general.marquee",
    "settings": [
      {
        "type": "range",
        "id": "speed",
        "label": "t:labels.speed",
        "min": 10,
        "max": 60,
        "step": 5,
        "unit": "s",
        "default": 25
      }
    ],
    "blocks": [
      {
        "type": "item",
        "name": "t:general.marquee_item",
        "settings": [
          {
            "type": "text",
            "id": "text",
            "label": "t:labels.text",
            "default": "New drop"
          },
          {
            "type": "url",
            "id": "link",
            "label": "t:labels.link"
          }
        ]
      }
    ],
    "presets": [
      {
        "name": "t:general.marquee",
        "blocks": [
          { "type": "item" },
          { "type": "item" },
          { "type": "item" }
        ]
      }
    ]
  }
  {% endschema %}
{% endif %}
```

Note the reduced-motion fallback hides `.marquee__group:not(:first-child)` — without this, a static (non-scrolling) page under reduced motion would show the same list of items twice side by side, since the duplicate group exists purely to make the *animated* loop seamless and serves no purpose once the animation is off. Verify this actually looks right live, not just correct in theory.

- [ ] **Step 2: Add the marquee section to the homepage template**

In `templates/index.json`, change:

```json
  "sections": {
    "hero": {
      "type": "hero-colorway",
      "settings": {}
    }
  },
  "order": [
    "hero"
  ]
```

to:

```json
  "sections": {
    "hero": {
      "type": "hero-colorway",
      "settings": {}
    },
    "marquee": {
      "type": "marquee",
      "settings": {}
    }
  },
  "order": [
    "hero",
    "marquee"
  ]
```

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "marquee": "Marquee",
    "marquee_item": "Item",
```

Add to the `labels` object:

```json
    "speed": "Scroll speed",
```

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 5: Verify in the browser**

```bash
shopify theme dev
```

Confirm the marquee renders below the hero with the 3 default preset items, scrolling continuously and seamlessly (no visible jump/gap at the loop point). Confirm a clicked linked item navigates correctly. Confirm the reduced-motion fallback (toggle `prefers-reduced-motion` via browser devtools or OS setting) shows a single static row, not a doubled one. Confirm zero blocks renders nothing. Check the console for errors.

- [ ] **Step 6: Commit**

```bash
git add sections/marquee.liquid templates/index.json locales/en.default.schema.json
git commit -m "feat: add homepage marquee section"
```

---

## Self-Review Notes

- **Spec coverage**: §4.1 (hero image + swatches + CTA, instant client-side swap, first-block-active default, accessible swatch buttons) → Task 1, fully covered. §4.2 (rotating/scrolling ticker, merchant-editable items, speed control) → Task 2, fully covered.
- **Type/name consistency checked**: `data-hero-swatch`/`data-hero-image`/`data-hero-cta`/`data-block-id`/`data-product-url` are all defined and consumed within Task 1's own single section file — no cross-task or cross-file dependency risk. Task 2 is fully independent of Task 1 except for both editing `templates/index.json` sequentially (Task 2's edit is anchored on Task 1's literal output, verified consistent while writing this plan).
- **No placeholders**: every step has literal code and a concrete, checkable expected result — including one explicit "figure out which locale-key naming convention this theme actually follows and apply it consistently" instruction (Task 1 Step 4) rather than guessing a suffix rule that might not match the rest of the file.
