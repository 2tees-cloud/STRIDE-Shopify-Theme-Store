# STRIDE Theme Homepage — Product Anatomy & Drop Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the third and fourth of spec §4's seven custom homepage sections: a numbered "anatomy" callout section over a single product image (spec §4.4) and a real-date-driven drop countdown (spec §4.5). Both append to `templates/index.json`'s existing `hero`/`marquee` order.

**Architecture:** Same conventions as all seven previous plans — Liquid + native CSS, tokens via `var(--token)` only, no build step. Product-anatomy is fully static (no JS at all — pins and legend are CSS-only, per spec §4.4's explicit "no JS needed for the base experience"). Drop-countdown is the one section in this plan with JS, and it follows a **server-computed-initial-state, client-ticks-live** pattern: Liquid computes the correct remaining time at render time (so the countdown is accurate even with JS disabled or slow to load), and JS then re-computes from the same target timestamp every second. If the target date is blank, unparseable, or already in the past, **no timer markup renders at all** — only a merchant-configurable fallback message — this is the mechanism that satisfies spec's hard "no fake or resettable urgency timer" requirement, not a design nicety.

**Tech Stack:** Shopify Liquid, native CSS (`scroll-snap-type` for the mobile anatomy legend, `position: absolute` pins for desktop), one small vanilla JS block (drop-countdown only).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §4.4 (Product anatomy) and §4.5 (Drop countdown).

## Global Constraints

(Carried over from all seven previous plans; every task below implicitly inherits these — and applies the single most expensive lesson from the most recent plan as a hard verification requirement, not a suggestion.)

- **Every new section must be verified with REAL, populated content at BOTH mobile (<750px) and desktop (≥750px) widths, via actual interaction (clicks, real keyboard input, real scroll) — not a screenshot, and not an empty/default state.** The mobile-nav plan's most severe bug (the entire desktop navigation being permanently non-interactive) went undetected for two full review rounds specifically because verification was screenshot-only AND used a store with no content configured. `templates/index.json` in this plan ships both sections with real, populated settings/blocks for exactly this reason — there is no excuse this time for testing against an empty section.
- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never use `--color-accent-secondary` as small text.
- Touch targets ≥24×24 CSS px on every interactive element.
- `prefers-reduced-motion` respected wherever animation is added (the countdown's JS has no continuous animation to gate, but double-check before assuming — verify, don't assume).
- Any section-root element meant to span the full viewport needs the `.full-width` utility.
- **`{% stylesheet %}`, `{% javascript %}`, and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.** Wrap only the HTML markup in a zero-content guard. This exact mistake has occurred four times across this project's plans (`theme-check` cannot catch it — only a live render does); check every new section file for it explicitly before considering a task done, don't rely on discovering it live again.
- **Any new locale key must be added to the correct file the first time**: keys consumed via `| t` in section/snippet body markup go in `locales/en.default.json`; keys consumed via `t:` inside a `{% schema %}` block go in `locales/en.default.schema.json`. This exact mistake has also occurred four times. Before adding a key, check which filter/prefix consumes it and pick the file accordingly — don't guess and let `theme-check` catch it after the fact, though it will if you get it wrong.
- `templates/index.json`: sections declared in a JSON template must carry their own real `blocks`/`block_order`/`settings` — **presets never apply to template-declared sections**, only to sections a merchant adds later via the theme editor. Every section this plan adds to that file must ship functional, non-empty content.
- No Lorem Ipsum in default values; every setting has a `label`; every image setting needs an accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, the `{% comment %}` section-header style, reuse existing tokens/spacing scale.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/product-anatomy.liquid` | create | Numbered callout pins over a product image (desktop) / horizontal scroll-snap legend cards (mobile) |
| `sections/drop-countdown.liquid` | create | Real-date-driven countdown with server-computed initial state and a mandatory non-fake-urgency fallback |
| `templates/index.json` | modify | Appends both new sections, with real populated settings/blocks, to the existing `hero`/`marquee` order |
| `locales/en.default.schema.json` | modify | New `t:` keys for both sections' settings/blocks |
| `locales/en.default.json` | modify | New storefront-facing keys for the countdown's unit labels and fallback message |

No files are deleted.

---

## Task 1: Product anatomy section

**Files:**
- Create: `sections/product-anatomy.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-accent`, `--color-on-accent`, `--color-foreground-muted`, `--color-background-alt`, `--space-1`–`--space-8` (all existing tokens, confirmed present in `snippets/css-variables.liquid` before writing this plan).
- Produces: nothing else in this plan depends on Task 1 — Task 2 (drop-countdown) is fully independent. Both tasks touch `templates/index.json` sequentially (Task 1 appends after `marquee`, Task 2 appends after Task 1's addition) — verify the exact append point matches what Task 1 actually leaves behind before starting Task 2, don't assume the plan text is still accurate if anything drifted.

- [ ] **Step 1: Create the section**

Create `sections/product-anatomy.liquid`:

```liquid
{% comment %}
  Numbered callout pins over a single product image. Desktop: pins
  positioned absolutely on the image, connected to a static legend list
  below. Mobile: pins are hidden (too small to tap reliably at that
  size) and the legend becomes a horizontal scroll-snap row of cards.
  Fully static CSS — no JS, per spec §4.4.
{% endcomment %}

{% if section.blocks.size > 0 and section.settings.image %}
  <div class="product-anatomy full-width">
    {% if section.settings.heading != blank %}
      <h2 class="product-anatomy__heading">{{ section.settings.heading }}</h2>
    {% endif %}

    <div class="product-anatomy__media">
      <img
        class="product-anatomy__image"
        src="{{ section.settings.image | image_url: width: 1600 }}"
        srcset="{{ section.settings.image | image_url: width: 800 }} 800w, {{ section.settings.image | image_url: width: 1600 }} 1600w, {{ section.settings.image | image_url: width: 2400 }} 2400w"
        sizes="(min-width: 750px) 60vw, 100vw"
        alt="{{ section.settings.image.alt | default: section.settings.heading | escape }}"
        width="{{ section.settings.image.width }}"
        height="{{ section.settings.image.height }}"
        loading="lazy"
      >

      {% for block in section.blocks %}
        <span
          class="product-anatomy__pin"
          style="left: {{ block.settings.position_x }}%; top: {{ block.settings.position_y }}%"
          aria-hidden="true"
          {{ block.shopify_attributes }}
        >{{ forloop.index }}</span>
      {% endfor %}
    </div>

    <ol class="product-anatomy__legend">
      {% for block in section.blocks %}
        <li class="product-anatomy__legend-item">
          <span class="product-anatomy__legend-number" aria-hidden="true">{{ forloop.index }}</span>
          <div class="product-anatomy__legend-copy">
            <h3 class="product-anatomy__legend-label">{{ block.settings.label }}</h3>
            {% if block.settings.text != blank %}
              <p class="product-anatomy__legend-text">{{ block.settings.text }}</p>
            {% endif %}
          </div>
        </li>
      {% endfor %}
    </ol>
  </div>
{% endif %}

{% stylesheet %}
  .product-anatomy {
    padding-block: var(--space-8);
  }
  .product-anatomy__heading {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0 0 var(--space-6);
    text-align: center;
  }
  .product-anatomy__media {
    position: relative;
    max-width: 60rem;
    margin-inline: auto;
  }
  .product-anatomy__image {
    width: 100%;
    height: auto;
  }
  .product-anatomy__pin {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 2rem;
    height: 2rem;
    min-width: 24px;
    min-height: 24px;
    border-radius: 50%;
    background-color: var(--color-accent);
    color: var(--color-on-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 700;
    box-shadow: 0 0 0 3px rgb(255 255 255 / 60%);
  }
  @media (max-width: 749px) {
    .product-anatomy__pin {
      display: none;
    }
  }
  .product-anatomy__legend {
    list-style: none;
    margin: var(--space-6) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 40rem;
    margin-inline: auto;
  }
  .product-anatomy__legend-item {
    display: flex;
    gap: var(--space-3);
  }
  .product-anatomy__legend-number {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: var(--color-accent);
    color: var(--color-on-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 700;
  }
  .product-anatomy__legend-label {
    font-size: 1rem;
    margin: 0 0 var(--space-1);
  }
  .product-anatomy__legend-text {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
    margin: 0;
  }
  @media (max-width: 749px) {
    .product-anatomy__legend {
      flex-direction: row;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      gap: var(--space-4);
      padding-bottom: var(--space-2);
      max-width: none;
      margin-inline: 0;
    }
    .product-anatomy__legend-item {
      flex-direction: column;
      flex-shrink: 0;
      width: 14rem;
      scroll-snap-align: start;
      background-color: var(--color-background-alt);
      padding: var(--space-4);
      border-radius: 4px;
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.product_anatomy",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading",
      "default": "Built for the long run"
    },
    {
      "type": "image_picker",
      "id": "image",
      "label": "t:labels.image"
    }
  ],
  "blocks": [
    {
      "type": "callout",
      "name": "t:general.callout",
      "settings": [
        {
          "type": "text",
          "id": "label",
          "label": "t:labels.label",
          "default": "Cushioning"
        },
        {
          "type": "textarea",
          "id": "text",
          "label": "t:labels.text"
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
      "name": "t:general.product_anatomy",
      "blocks": [
        { "type": "callout" },
        { "type": "callout" },
        { "type": "callout" }
      ]
    }
  ]
}
{% endschema %}
```

- [ ] **Step 2: Add the section to the homepage template with real content**

Read `templates/index.json`'s current content yourself first — it should have `hero` and `marquee` from prior plans. Add a `product-anatomy` entry after `marquee` in both `sections` and `order`. Since this section requires an `image` and this environment has no real product-photo asset available (a known, already-documented limitation from the hero-colorway section in an earlier plan), the section's zero-content guard (`section.blocks.size > 0 and section.settings.image`) means it will correctly render nothing until a real image is uploaded — populate the callout blocks with real settings anyway (label/text/position), so the only missing piece is the image itself, not the content:

```json
    "product-anatomy": {
      "type": "product-anatomy",
      "blocks": {
        "callout-1": {
          "type": "callout",
          "settings": {
            "label": "Cushioning",
            "text": "Responsive foam that absorbs impact without losing energy return.",
            "position_x": 30,
            "position_y": 70
          }
        },
        "callout-2": {
          "type": "callout",
          "settings": {
            "label": "Upper material",
            "text": "Breathable knit that moves with your foot, not against it.",
            "position_x": 50,
            "position_y": 25
          }
        },
        "callout-3": {
          "type": "callout",
          "settings": {
            "label": "Outsole",
            "text": "High-abrasion rubber for grip on wet and dry surfaces alike.",
            "position_x": 65,
            "position_y": 85
          }
        }
      },
      "block_order": ["callout-1", "callout-2", "callout-3"],
      "settings": {
        "heading": "Built for the long run"
      }
    }
```

Add `"product-anatomy"` to `order` right after `"marquee"`.

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "product_anatomy": "Product anatomy",
    "callout": "Callout",
```

Add to the `labels` object:

```json
    "label": "Label",
    "position_x": "Horizontal position",
    "position_y": "Vertical position",
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

Since no real image asset is available in this environment, temporarily upload any placeholder image to the `product-anatomy` block's `image` setting via the theme editor (or the equivalent local-testing approach used in prior plans) so the section actually renders — the section is otherwise correctly invisible per its zero-content guard, and that guard itself needs to be seen working (confirm it renders nothing with the image unset, then confirm it renders correctly once one is set).

With the image in place and the 3 real callout blocks from Step 2:
1. **Desktop (≥750px)**: confirm 3 numbered pins are positioned on the image at roughly the configured percentages, and the legend below lists all 3 callouts in a static vertical list with matching numbers.
2. **Mobile (<750px)**: confirm the pins are hidden (not just invisible-but-still-there — check `display: none` actually applies), and the legend becomes a horizontally scrollable row of cards; actually scroll it (not just read the CSS) and confirm snap points land cleanly on each card.
3. Check `alt` text renders correctly on the image.
4. Check the browser console for errors.

- [ ] **Step 6: Commit**

```bash
git add sections/product-anatomy.liquid templates/index.json locales/en.default.schema.json
git commit -m "feat: add homepage product anatomy section"
```

---

## Task 2: Drop countdown section

**Files:**
- Create: `sections/drop-countdown.liquid`
- Modify: `templates/index.json`
- Modify: `locales/en.default.schema.json`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: `--color-foreground`, `--color-background`, `--font-header--family`, `--space-1`/`--space-3`–`--space-8` (existing tokens).
- Produces: nothing else in this plan depends on Task 2.

Before starting, read `templates/index.json`'s current content (after Task 1's edit) to confirm the exact append point — don't assume Task 1's Step 2 text is still an accurate diff target if the file drifted.

- [ ] **Step 1: Create the section**

Create `sections/drop-countdown.liquid`:

```liquid
{% comment %}
  Countdown to a real, merchant-set date/time. Liquid computes the
  correct remaining time at render time (accurate even with JS disabled
  or slow to load); JS then re-computes from the same target timestamp
  every second. If the target date is blank, unparseable, or already
  passed, NO timer markup renders — only the fallback message. This is
  a hard requirement (spec: no fake or resettable urgency timer), not a
  design choice — do not change this to show a static "00:00:00:00" or
  any other placeholder timer state.
{% endcomment %}

{% liquid
  assign now_ts = 'now' | date: '%s' | times: 1
  assign target_ts = 0
  if section.settings.target_date != blank
    assign target_ts = section.settings.target_date | date: '%s' | times: 1
  endif
  assign remaining_seconds = target_ts | minus: now_ts
%}

{% if remaining_seconds > 0 %}
  {% liquid
    assign countdown_days = remaining_seconds | divided_by: 86400
    assign countdown_hours = remaining_seconds | modulo: 86400 | divided_by: 3600
    assign countdown_minutes = remaining_seconds | modulo: 3600 | divided_by: 60
    assign countdown_seconds_value = remaining_seconds | modulo: 60
    assign countdown_hours_padded = countdown_hours | prepend: '00' | slice: -2, 2
    assign countdown_minutes_padded = countdown_minutes | prepend: '00' | slice: -2, 2
    assign countdown_seconds_padded = countdown_seconds_value | prepend: '00' | slice: -2, 2
  %}
  <div class="drop-countdown full-width" data-drop-countdown data-target-timestamp="{{ target_ts }}">
    <div class="drop-countdown__content">
      {% if section.settings.heading != blank %}
        <h2 class="drop-countdown__heading">{{ section.settings.heading }}</h2>
      {% endif %}
      {% if section.settings.description != blank %}
        <p class="drop-countdown__description">{{ section.settings.description }}</p>
      {% endif %}

      <div class="drop-countdown__timer" role="timer" aria-live="off">
        <div class="drop-countdown__unit">
          <span class="drop-countdown__value" data-countdown-days>{{ countdown_days }}</span>
          <span class="drop-countdown__label">{{ 'countdown.days' | t }}</span>
        </div>
        <div class="drop-countdown__unit">
          <span class="drop-countdown__value" data-countdown-hours>{{ countdown_hours_padded }}</span>
          <span class="drop-countdown__label">{{ 'countdown.hours' | t }}</span>
        </div>
        <div class="drop-countdown__unit">
          <span class="drop-countdown__value" data-countdown-minutes>{{ countdown_minutes_padded }}</span>
          <span class="drop-countdown__label">{{ 'countdown.minutes' | t }}</span>
        </div>
        <div class="drop-countdown__unit">
          <span class="drop-countdown__value" data-countdown-seconds>{{ countdown_seconds_padded }}</span>
          <span class="drop-countdown__label">{{ 'countdown.seconds' | t }}</span>
        </div>
      </div>

      {% if section.settings.cta_text != blank and section.settings.cta_link != blank %}
        <a href="{{ section.settings.cta_link | escape }}" class="drop-countdown__cta">{{ section.settings.cta_text }}</a>
      {% endif %}
    </div>
  </div>
{% elsif section.settings.heading != blank or section.settings.fallback_text != blank %}
  <div class="drop-countdown drop-countdown--ended full-width">
    <div class="drop-countdown__content">
      {% if section.settings.heading != blank %}
        <h2 class="drop-countdown__heading">{{ section.settings.heading }}</h2>
      {% endif %}
      {% if section.settings.fallback_text != blank %}
        <p class="drop-countdown__description">{{ section.settings.fallback_text }}</p>
      {% else %}
        <p class="drop-countdown__description">{{ 'countdown.ended' | t }}</p>
      {% endif %}
      {% if section.settings.cta_text != blank and section.settings.cta_link != blank %}
        <a href="{{ section.settings.cta_link | escape }}" class="drop-countdown__cta">{{ section.settings.cta_text }}</a>
      {% endif %}
    </div>
  </div>
{% endif %}

{% stylesheet %}
  .drop-countdown {
    background-color: var(--color-foreground);
    color: var(--color-background);
    padding-block: var(--space-8);
  }
  .drop-countdown__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-4);
    max-width: 40rem;
    margin-inline: auto;
  }
  .drop-countdown__heading {
    font-family: var(--font-header--family);
    font-size: clamp(2rem, 6vw, 4rem);
    margin: 0;
  }
  .drop-countdown__description {
    margin: 0;
    font-size: 1.125rem;
  }
  .drop-countdown__timer {
    display: flex;
    gap: var(--space-4);
  }
  .drop-countdown__unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 4rem;
  }
  .drop-countdown__value {
    font-family: var(--font-header--family);
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .drop-countdown__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-background);
    opacity: 0.7;
    margin-top: var(--space-1);
  }
  .drop-countdown__cta {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: var(--space-3) var(--space-5);
    background-color: var(--color-background);
    color: var(--color-foreground);
    text-decoration: none;
    font-weight: 700;
  }
{% endstylesheet %}

{% javascript %}
  document.querySelectorAll('[data-drop-countdown]').forEach(function (countdown) {
    var targetTimestamp = parseInt(countdown.dataset.targetTimestamp, 10) * 1000;
    var daysEl = countdown.querySelector('[data-countdown-days]');
    var hoursEl = countdown.querySelector('[data-countdown-hours]');
    var minutesEl = countdown.querySelector('[data-countdown-minutes]');
    var secondsEl = countdown.querySelector('[data-countdown-seconds]');
    if (!targetTimestamp || !daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    var timer;

    function pad(value) {
      return String(value).padStart(2, '0');
    }

    function tick() {
      var remaining = Math.floor((targetTimestamp - Date.now()) / 1000);

      if (remaining <= 0) {
        clearInterval(timer);
        window.location.reload();
        return;
      }

      daysEl.textContent = Math.floor(remaining / 86400);
      hoursEl.textContent = pad(Math.floor((remaining % 86400) / 3600));
      minutesEl.textContent = pad(Math.floor((remaining % 3600) / 60));
      secondsEl.textContent = pad(remaining % 60);
    }

    tick();
    timer = setInterval(tick, 1000);
  });
{% endjavascript %}

{% schema %}
{
  "name": "t:general.drop_countdown",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading",
      "default": "Next drop"
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "t:labels.subtext"
    },
    {
      "type": "text",
      "id": "target_date",
      "label": "t:labels.target_date",
      "info": "t:labels.target_date_info"
    },
    {
      "type": "textarea",
      "id": "fallback_text",
      "label": "t:labels.fallback_text"
    },
    {
      "type": "text",
      "id": "cta_text",
      "label": "t:labels.cta_text",
      "default": "Get notified"
    },
    {
      "type": "url",
      "id": "cta_link",
      "label": "t:labels.cta_link"
    }
  ],
  "presets": [
    {
      "name": "t:general.drop_countdown"
    }
  ]
}
{% endschema %}
```

Verify live (this is flagged explicitly because Liquid's `date` filter's exact parsing behavior/timezone handling for a merchant-typed string like `"2026-12-25 09:00"` was not confirmed at plan-writing time): does `section.settings.target_date | date: '%s'` correctly parse a plain `YYYY-MM-DD HH:MM` string into a sane Unix timestamp? If it doesn't parse as expected, adjust the `info` text to specify whatever format actually works reliably, and report exactly what you found — don't leave the merchant-facing guidance mismatched with what the code actually accepts.

- [ ] **Step 2: Add the section to the homepage template with real content**

Add a `drop-countdown` entry to `templates/index.json`, after `product-anatomy`, with a real **future** target date (so the live-ticking timer path is what ships and gets tested by default, not the fallback path) — use a date far enough in the future that it won't have passed by the time this is reviewed, e.g. one year out from this plan's date:

```json
    "drop-countdown": {
      "type": "drop-countdown",
      "settings": {
        "heading": "Next drop",
        "description": "Sign up to be first in line when it lands.",
        "target_date": "2027-09-01 09:00",
        "cta_text": "Get notified",
        "cta_link": "/pages/contact"
      }
    }
```

Add `"drop-countdown"` to `order` right after `"product-anatomy"`.

- [ ] **Step 3: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "drop_countdown": "Drop countdown",
```

Add to the `labels` object:

```json
    "target_date": "Target date and time",
    "target_date_info": "Format: YYYY-MM-DD HH:MM (24-hour, store time zone).",
    "fallback_text": "Message after the countdown ends",
```

(If Step 1's live verification found the date format guidance needs to differ from what's written above, use the corrected wording here instead — keep the `info` text and the actual accepted format consistent.)

- [ ] **Step 4: Add the storefront locale keys**

In `locales/en.default.json`, add a new top-level `countdown` key (insert alphabetically — after `contact`, before `customers`):

```json
  "countdown": {
    "days": "Days",
    "hours": "Hours",
    "minutes": "Minutes",
    "seconds": "Seconds",
    "ended": "This drop has ended — check back soon for what's next."
  },
```

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser with REAL dates covering all three states — not just the happy path**

```bash
shopify theme dev
```

1. **Future date (the shipped default)**: confirm the timer renders with real, non-zero values matching the actual gap between now and the target date, and that it visibly ticks down second-by-second without a page reload. Let it run for several seconds and confirm the seconds digit actually decrements.
2. **Past date**: temporarily set `target_date` to a date in the past (e.g. yesterday) and confirm ONLY the fallback message renders — no timer markup, no "00:00:00:00", nothing that could read as a fake/broken countdown.
3. **Blank date**: temporarily clear `target_date` entirely — confirm the section renders nothing at all if `heading`/`fallback_text` are also blank, or just the fallback content if either is set (per the `{% elsif %}` branch).
4. **JS-disabled equivalent**: confirm the server-rendered initial digit values (view page source, or inspect before JS has had a chance to run) already show the mathematically correct remaining time — not zeros — proving the no-JS path is genuinely functional, not just theoretically covered by the code.
5. Restore the real future-date content from Step 2 before committing.
6. Check the browser console for errors throughout.

- [ ] **Step 7: Commit**

```bash
git add sections/drop-countdown.liquid templates/index.json locales/en.default.schema.json locales/en.default.json
git commit -m "feat: add homepage drop countdown section"
```

---

## Self-Review Notes

- **Spec coverage**: §4.4 (numbered pins over one image, legend list, scroll-snap on mobile, no JS needed for the base experience) → Task 1, fully covered. §4.5 (real merchant date, no fake/resettable urgency, large type treatment, graceful degradation without JS or after the date passes) → Task 2, fully covered — the server-computed-initial-state design is the concrete mechanism satisfying the "no fake timer" requirement, not just a stated intention.
- **Type/name consistency checked**: `data-drop-countdown`/`data-target-timestamp`/`data-countdown-days`/`-hours`/`-minutes`/`-seconds` are all defined in Task 2's own single section file — no cross-task dependency. Task 1 and Task 2 both append to `templates/index.json` sequentially; Task 2's brief explicitly instructs re-reading the file's actual state after Task 1 rather than trusting this plan's literal diff text if anything drifted.
- **No placeholders**: every step has literal code and a concrete, checkable expected result — including an explicit "verify this, the exact date-parsing behavior was not confirmed at plan-writing time" flag for the one place this plan is least certain about exact Liquid runtime behavior, and a mandatory three-state (future/past/blank date) verification requirement for Task 2 specifically so the "graceful degradation" claim is actually exercised, not just written into the code and never triggered.
