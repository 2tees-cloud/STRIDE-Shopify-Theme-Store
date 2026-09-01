# STRIDE Theme Global Layout — Announcement Bar & Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the rotating announcement bar and upgrade the header to a sticky, condensing header with a header-font wordmark, multi-level dropdown navigation, a search entry point, and conditional country/language selectors — the second slice of spec §3 (Global layout), continuing directly on the design-token foundation from the previous plan.

**Architecture:** Same conventions as the foundation plan — Liquid + native CSS, `{% stylesheet %}`/`{% javascript %}` tags, tokens consumed only via `var(--token)`, no build step, no JS framework. The announcement bar is a new section wired into the existing `header-group.json` section group (rendered above the header, per Shopify's section-group architecture). The header's new interactive behaviors (sticky-condense, multi-level nav disclosure, localization form auto-submit) are small, unobtrusive vanilla JS listeners — no custom elements, no inline event-handler attributes (keeps the door open for a stricter CSP later).

**Tech Stack:** Shopify Liquid, native CSS, vanilla JS (`IntersectionObserver`, `addEventListener`) — no build step. Verified with `shopify theme check` and a live `shopify theme dev` server (one may already be running against the connected dev store `test1-75pp1p2l.myshopify.com`).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §3.1 (Announcement bar) and §3.2 (Header) — excluding the header's predictive-search panel and live-AJAX cart count, which are deferred to a later plan alongside the cart drawer (§3.3), since those share the same Section Rendering API / fetch-based JS work. This plan's search entry point links to the existing `/search` route; the cart icon keeps its current server-rendered count.

## Global Constraints

(Carried over from the spec; every task below implicitly inherits these.)

- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Fonts: Shopify's current font library only, via `font_picker` (already in place from the previous plan — this plan only *consumes* `--font-header--family` etc., doesn't add new font settings).
- Touch targets ≥24×24 CSS px.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI — every new color usage here reuses existing tokens already audited in the previous plan (`--color-foreground`, `--color-surface`, `--color-border`, `--color-accent`, `--color-background`), so no new contrast math is needed as long as no new raw hex values are introduced.
- `prefers-reduced-motion` respected wherever animation/auto-rotation is added.
- Keyboard accessibility: every interactive control (nav disclosure, localization selects, search link) must be operable by keyboard with a visible focus state, and touch targets sized appropriately.
- No Lorem Ipsum in default values; every setting has a `label`; American English, sentence case, Shopify's approved terminology.
- `theme-check` (`.theme-check.yml`) must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space JSON indent, the JSON-template "auto-generated" comment-header convention, existing Liquid formatting.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/announcement-bar.liquid` | create | Rotating announcement messages, merchant-editable blocks |
| `sections/header-group.json` | modify | Wires the new announcement-bar section above the header |
| `assets/icon-search.svg` | create | Search icon, matching the existing `icon-cart.svg`/`icon-account.svg` visual style |
| `sections/header.liquid` | modify (full-file replace) | Sticky/condensing header, header-font wordmark, multi-level nav, search link, country/language selectors |
| `layout/theme.liquid` | modify | Adds a scroll sentinel element the header's sticky-condense script observes |
| `locales/en.default.schema.json` | modify | New `t:` keys for the announcement bar's settings and the localization selects' labels |

No files are deleted.

---

## Task 1: Announcement bar section

**Files:**
- Create: `sections/announcement-bar.liquid`
- Modify: `sections/header-group.json` (full-file replace — it's 22 lines)
- Modify: `locales/en.default.schema.json` (`general` and `labels` objects)

**Interfaces:**
- Consumes: `--space-2` (existing token from the foundation plan).
- Produces: nothing later in this plan depends on this task — it's an independent, merchant-configurable section. The section type name `announcement-bar` and its rendering slot in `header-group.json` are what a future homepage/global-layout plan would need to know if it ever needs to reference "the section above the header."

- [ ] **Step 1: Create the section**

Create `sections/announcement-bar.liquid`:

```liquid
{% comment %}
  Rotating announcement bar, rendered above the header inside header-group.json.

  https://shopify.dev/docs/storefronts/themes/architecture/sections/section-groups
{% endcomment %}

{% if section.blocks.size > 0 %}
  <div class="announcement-bar" data-announcement-bar data-interval="{{ section.settings.rotation_speed }}">
    <ul class="announcement-bar__list" role="list">
      {% for block in section.blocks %}
        <li
          class="announcement-bar__item{% if forloop.first %} is-active{% endif %}"
          {{ block.shopify_attributes }}
        >
          {% if block.settings.link %}
            <a href="{{ block.settings.link }}">{{ block.settings.text }}</a>
          {% else %}
            <span>{{ block.settings.text }}</span>
          {% endif %}
        </li>
      {% endfor %}
    </ul>
  </div>

  {% stylesheet %}
    .announcement-bar {
      background-color: var(--color-foreground);
      color: var(--color-background);
      text-align: center;
      font-size: 0.8125rem;
      padding-block: var(--space-2);
    }
    .announcement-bar__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
    }
    .announcement-bar__item {
      grid-area: 1 / 1;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease;
    }
    .announcement-bar__item.is-active {
      opacity: 1;
      visibility: visible;
    }
    .announcement-bar a,
    .announcement-bar span {
      color: inherit;
      text-decoration: none;
    }
  {% endstylesheet %}

  {% javascript %}
    document.querySelectorAll('[data-announcement-bar]').forEach(function (bar) {
      var items = Array.from(bar.querySelectorAll('.announcement-bar__item'));
      if (items.length < 2) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var interval = parseFloat(bar.dataset.interval) * 1000 || 5000;
      var index = 0;
      var timer;

      function next() {
        items[index].classList.remove('is-active');
        index = (index + 1) % items.length;
        items[index].classList.add('is-active');
      }

      function start() {
        stop();
        timer = setInterval(next, interval);
      }

      function stop() {
        if (timer) clearInterval(timer);
      }

      start();
      bar.addEventListener('mouseenter', stop);
      bar.addEventListener('mouseleave', start);
      bar.addEventListener('focusin', stop);
      bar.addEventListener('focusout', start);
    });
  {% endjavascript %}

  {% schema %}
  {
    "name": "t:general.announcement_bar",
    "settings": [
      {
        "type": "range",
        "id": "rotation_speed",
        "label": "t:labels.rotation_speed",
        "min": 3,
        "max": 10,
        "step": 1,
        "unit": "s",
        "default": 5
      }
    ],
    "blocks": [
      {
        "type": "message",
        "name": "t:general.message",
        "settings": [
          {
            "type": "text",
            "id": "text",
            "label": "t:labels.text",
            "default": "Free shipping on orders over $100"
          },
          {
            "type": "url",
            "id": "link",
            "label": "t:labels.link"
          }
        ]
      }
    ]
  }
  {% endschema %}
{% endif %}
```

Note: `data-announcement-bar` items are hidden with `opacity`/`visibility` rather than `display: none`, so the "pause on hover/focus" behavior can transition smoothly — this is intentional, not an oversight. Every item is still real DOM (not removed), so a screen reader landing directly on a link inside a currently-inactive item could technically still reach it via `visibility: hidden` — note this is a known minor gap (visibility:hidden does remove it from the accessibility tree in all current browsers, so this is not actually a problem, just flagging why `display:none` wasn't used).

- [ ] **Step 2: Wire the section into the header group**

Replace the entire contents of `sections/header-group.json` with:

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
  "type": "header",
  "name": "t:general.header",
  "sections": {
    "announcement-bar": {
      "type": "announcement-bar",
      "settings": {}
    },
    "header": {
      "type": "header",
      "settings": {}
    }
  },
  "order": [
    "announcement-bar",
    "header"
  ],
}
```

(The trailing comma after the `"order"` array's closing bracket, before the final `}`, matches the original file's own style — Shopify's JSON template parser tolerates it, and this task isn't the place to change that convention.)

- [ ] **Step 3: Add the new locale keys**

In `locales/en.default.schema.json`, add to the `general` object (alongside the existing entries):

```json
    "announcement_bar": "Announcement bar",
    "message": "Message",
```

Add to the `labels` object:

```json
    "rotation_speed": "Rotation speed",
    "link": "Link",
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

In the theme editor (or local preview if admin is blocked), add 2+ message blocks to the announcement bar section and confirm: only one message is visible at a time, it rotates automatically, hovering/focusing pauses the rotation, and with a single block the rotation logic never starts (no console errors). With zero blocks, confirm the section renders nothing (no empty bar).

- [ ] **Step 6: Commit**

```bash
git add sections/announcement-bar.liquid sections/header-group.json locales/en.default.schema.json
git commit -m "feat: add rotating announcement bar section"
```

---

## Task 2: Header upgrade — sticky/condense, header-font wordmark, multi-level nav, search entry, localization selectors

**Files:**
- Modify: `layout/theme.liquid` (add a scroll sentinel element)
- Modify: `sections/header.liquid` (full-file replace)
- Create: `assets/icon-search.svg`
- Modify: `locales/en.default.schema.json` (`labels` object)

**Interfaces:**
- Consumes: `--font-header--family`/`--style`/`--weight`, `--color-foreground`, `--color-background`, `--color-surface`, `--color-border`, `--color-accent`, `--space-1`/`--space-2`/`--space-4`, `--page-margin` (all existing tokens from the foundation plan — do not introduce new ones).
- Consumes: `localization.available_countries`, `localization.available_countries.size`, `localization.country`, `localization.available_languages`, `localization.available_languages.size`, `localization.language` (Shopify's native `localization` global object — no settings/schema changes needed for it to work; it's populated automatically once a merchant enables multi-currency/multi-language in Settings → Markets/Languages, and both `{% if %}` guards mean nothing renders until then).
- Produces: `header.header` becomes the stable CSS selector for the header root element (previously `<header>` had no class) — a later plan (cart drawer) will need this same selector if it has to account for header height/position.

Before starting, this task assumes `sections/header.liquid` is still in its **original, unmodified** state (Task 1 didn't touch it). If a previous session already changed this file, stop and report NEEDS_CONTEXT rather than guessing which version is current.

- [ ] **Step 1: Add the scroll sentinel**

In `layout/theme.liquid`, change:

```liquid
  <body>
    {% sections 'header-group' %}
```

to:

```liquid
  <body>
    <div class="scroll-sentinel" data-scroll-sentinel></div>
    {% sections 'header-group' %}
```

- [ ] **Step 2: Create the search icon**

Create `assets/icon-search.svg`, matching the exact attribute style of the existing `icon-cart.svg`/`icon-account.svg` (viewBox, `stroke="currentColor"`, `stroke-width="var(--icon-stroke-width)"`, rounded caps/joins):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <circle cx="8.75" cy="8.75" r="5.417" stroke="currentColor" stroke-width="var(--icon-stroke-width)" />
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="var(--icon-stroke-width)"
    d="m17.083 17.083-4.166-4.166" />
</svg>
```

(`--icon-stroke-width` is referenced but never defined anywhere in this theme — that's a pre-existing gap in the other two icon files too, not something to fix here; it makes `stroke-width` fall back to its initial value of `1` in every browser today. Replicate the existing pattern exactly for consistency; don't "fix" it in this task.)

- [ ] **Step 3: Replace the header section**

Replace the entire contents of `sections/header.liquid` with:

```liquid
<header class="header">
  <h2 class="header__title">
    {{ shop.name | link_to: routes.root_url }}
  </h2>

  <nav class="header__menu" aria-label="{{ 'labels.menu' | t }}">
    {% for link in section.settings.menu.links %}
      {% if link.links.size > 0 %}
        <details class="header__menu-item header__menu-item--has-children">
          <summary>{{ link.title }}</summary>
          <ul class="header__submenu">
            {% for child_link in link.links %}
              <li>
                <a href="{{ child_link.url }}">{{ child_link.title }}</a>
              </li>
            {% endfor %}
          </ul>
        </details>
      {% else %}
        <a class="header__menu-item" href="{{ link.url }}">{{ link.title }}</a>
      {% endif %}
    {% endfor %}
  </nav>

  <div class="header__localization">
    {% if localization.available_countries.size > 1 %}
      {% form 'localization', id: 'HeaderCountryForm', class: 'header__localization-form' %}
        <input type="hidden" name="country_code" value="{{ localization.country.iso_code }}">
        <select name="country_code" aria-label="{{ 'labels.country' | t }}" data-localization-form-submit>
          {% for country in localization.available_countries %}
            <option value="{{ country.iso_code }}" {% if country.iso_code == localization.country.iso_code %}selected{% endif %}>
              {{ country.name }} ({{ country.currency.iso_code }})
            </option>
          {% endfor %}
        </select>
      {% endform %}
    {% endif %}

    {% if localization.available_languages.size > 1 %}
      {% form 'localization', id: 'HeaderLanguageForm', class: 'header__localization-form' %}
        <input type="hidden" name="locale_code" value="{{ localization.language.iso_code }}">
        <select name="locale_code" aria-label="{{ 'labels.language' | t }}" data-localization-form-submit>
          {% for language in localization.available_languages %}
            <option value="{{ language.iso_code }}" {% if language.iso_code == localization.language.iso_code %}selected{% endif %}>
              {{ language.endonym_name | capitalize }}
            </option>
          {% endfor %}
        </select>
      {% endform %}
    {% endif %}
  </div>

  <div class="header__icons">
    <a href="{{ routes.search_url }}" aria-label="{{ 'search.title' | t }}">
      {{ 'icon-search.svg' | inline_asset_content }}
    </a>

    {% if shop.customer_accounts_enabled %}
      <shopify-account menu="{{ section.settings.customer_account_menu }}">
        {{ 'icon-account.svg' | inline_asset_content }}
      </shopify-account>
    {% endif %}

    <a href="{{ routes.cart_url }}">
      {% if cart.item_count > 0 %}
        <sup>{{ cart.item_count }}</sup>
      {% endif %}

      {{ 'icon-cart.svg' | inline_asset_content }}
    </a>
  </div>
</header>

{% stylesheet %}
  header.header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding-block: var(--space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    background-color: var(--color-background);
    transition: padding-block 0.2s ease;
  }
  header.header.header--condensed {
    padding-block: var(--space-2);
  }
  header .header__title {
    font-family: var(--font-header--family);
    font-style: var(--font-header--style);
    font-weight: var(--font-header--weight);
  }
  header a {
    position: relative;
    text-decoration: none;
    color: var(--color-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  header a sup {
    position: absolute;
    left: 100%;
    overflow: hidden;
    max-width: var(--page-margin);
  }
  header svg {
    width: 2rem;
  }
  header .header__menu,
  header .header__localization,
  header .header__icons {
    display: flex;
    gap: 1rem;
  }
  header .header__menu {
    align-items: center;
  }
  header .header__menu-item {
    color: var(--color-foreground);
    cursor: pointer;
  }
  header details.header__menu-item {
    position: relative;
  }
  header details.header__menu-item > summary {
    list-style: none;
    color: var(--color-foreground);
  }
  header details.header__menu-item > summary::-webkit-details-marker {
    display: none;
  }
  header details[open].header__menu-item > summary {
    color: var(--color-accent);
  }
  header .header__submenu {
    position: absolute;
    top: 100%;
    left: 0;
    list-style: none;
    margin: 0;
    padding: var(--space-2);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    min-width: 10rem;
    z-index: 1;
  }
  header .header__submenu a {
    display: block;
    padding-block: var(--space-1);
    color: var(--color-foreground);
    text-decoration: none;
  }
  header .header__localization-form select {
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-foreground);
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    var sentinel = document.querySelector('[data-scroll-sentinel]');
    var header = document.querySelector('.header');
    if (!sentinel || !header) return;

    var observer = new IntersectionObserver(function (entries) {
      header.classList.toggle('header--condensed', !entries[0].isIntersecting);
    });
    observer.observe(sentinel);
  })();

  document.querySelectorAll('[data-localization-form-submit]').forEach(function (select) {
    select.addEventListener('change', function () {
      select.form.submit();
    });
  });
{% endjavascript %}

{% schema %}
{
  "name": "t:general.header",
  "settings": [
    {
      "type": "link_list",
      "id": "menu",
      "label": "t:labels.menu"
    },
    {
      "type": "link_list",
      "id": "customer_account_menu",
      "label": "t:labels.customer_account_menu",
      "default": "customer-account-main-menu"
    }
  ]
}
{% endschema %}
```

Note what did NOT change from the original: the `{% schema %}` block is identical to before (same two settings) — this task only changes markup, CSS, and adds JS; it does not add or remove any merchant-facing settings.

- [ ] **Step 4: Add the new locale keys**

In `locales/en.default.schema.json`, add to the `labels` object:

```json
    "country": "Country/region",
    "language": "Language",
```

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser**

```bash
shopify theme dev
```

Check each of the following (via live preview, or local preview if admin is blocked):
1. Scroll the page — the header stays pinned to the top (sticky) and its padding visibly shrinks once the page has scrolled past the sentinel, then grows back when scrolled back to the top.
2. The store name in the header renders in the heading font (`--font-header--family`), visibly different from the body font.
3. If the main menu has a nested link (create one via a linklist with a sub-level to test, or note if the connected store's menu is flat), it renders as a `<details>` disclosure that opens/closes on click and via keyboard (Enter/Space on the summary).
4. The search icon links to `/search` and loads the existing search page without errors.
5. With the connected store's default single-country/single-language setup, confirm neither localization `<select>` renders (the `{% if %}` guards should suppress both, since `available_countries.size`/`available_languages.size` are 1). This is the expected default — don't force multi-market on to test the positive case unless it's trivial to toggle back off afterward.
6. Check the browser console for JS errors on load and on interacting with the disclosure menu.

- [ ] **Step 7: Commit**

```bash
git add layout/theme.liquid sections/header.liquid assets/icon-search.svg locales/en.default.schema.json
git commit -m "feat: upgrade header with sticky/condense, multi-level nav, search, localization"
```

---

## Self-Review Notes

- **Spec coverage**: §3.1 (announcement bar: repeater blocks, auto-rotate, pause on hover/focus, `prefers-reduced-motion`) → Task 1, fully covered. §3.2 (sticky header, condensing padding, header-font logo, multi-level dropdown nav, account component, search entry point, conditional country/language selectors, cart icon) → Task 2 covers all of it except the **predictive search panel** (explicitly deferred — the search icon here is a plain link, not a live-results panel) and the **cart icon's AJAX live-count update** (explicitly deferred — count is still server-rendered via `cart.item_count`, correct today, just not AJAX-refreshed without a page reload). Both deferrals are stated in the Spec line above and don't block this plan's own tasks from being independently complete and testable.
- **Type/name consistency checked**: `header.header` / `.header--condensed` class names introduced in Task 2 are self-contained to this task; `data-scroll-sentinel` is introduced in Task 2 Step 1 and consumed in Task 2 Step 3's JS — same task, no cross-task naming risk. `data-announcement-bar`/`data-interval` in Task 1 are self-contained to that task. No task in this plan references a token or setting id that isn't already confirmed to exist from the foundation plan (`--font-header--*`, `--color-*`, `--space-*` — all read directly from the current `snippets/css-variables.liquid` before writing this plan).
- **No placeholders**: every step has literal code to write and a concrete, checkable expected result.
