# STRIDE Theme — Mobile Header Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the mobile header overflow first flagged (predicted) in the header-layout plan's final review and then confirmed concretely (measured ~200px of horizontal page overflow at 375px) by the homepage-hero plan's fix round. The primary nav and country/language selectors move into a slide-out off-canvas panel behind a hamburger toggle below 750px; above 750px the header renders exactly as it does today (same markup, no duplication — CSS repositions the same elements rather than showing/hiding two copies).

**Architecture:** Same conventions as all prior plans — Liquid + native CSS, no build step. The off-canvas panel reuses the exact focus-trap/`inert`/overlay/Escape-to-close pattern already proven in `sections/cart-drawer.liquid`/`assets/cart-drawer.js`, adapted for a left-sliding nav panel instead of a right-sliding cart. This is the second occurrence of that pattern in the theme (not yet worth extracting into a shared module per this project's own "three strikes" convention, but the second implementation should mirror the first closely rather than reinvent it). This plan also applies the `shopify:section:load` re-init convention (established in the homepage-hero plan's final fix round) to all three of this section's JS behaviors from the start, rather than retrofitting it later.

**Tech Stack:** Shopify Liquid, native CSS (`position: fixed` off-canvas panel on mobile, `position: static` normal flow on desktop via one breakpoint), vanilla JS (focus trap, matching `cart-drawer.js`'s proven implementation).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §7 ("fully responsive at all breakpoints" — a hard Theme Store requirement) and §3.2 (header nav/localization, already built desktop-only in an earlier plan). No new spec section — this closes a gap in already-shipped work rather than building new functionality.

## Global Constraints

(Carried over from all six previous plans; every task below implicitly inherits these — and applies several as day-one requirements rather than post-hoc fixes, since they're now well-established.)

- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Touch targets ≥24×24 CSS px (the hamburger and close buttons especially).
- `prefers-reduced-motion` respected for the panel's slide transition and the overlay's fade.
- Focus trap must be genuinely bidirectional (Tab/Shift+Tab), with a `!panel.contains(document.activeElement)` re-containment guard (the exact hardening the cart drawer needed after its own final review), and focus must return to the trigger element on close.
- The closed panel must be `inert` (not just `aria-hidden`) so its contents are genuinely out of the tab order — the cart drawer's own Critical finding from an earlier plan.
- Every icon-only button needs `aria-label`.
- No new design tokens, no raw hex/px introduced where a token exists.
- All JS must be wrapped in named `initX(root)` functions, called once on `document` at load and again via a `shopify:section:load` listener passing `event.target` — apply this from the start, not as a follow-up fix.
- `theme-check` must pass with zero new errors after the task.
- Follow existing codebase conventions: 2-space indent, existing icon-SVG attribute conventions (viewBox `0 0 20 20`, `stroke="currentColor"`, `stroke-width="var(--icon-stroke-width)"`, rounded caps/joins), reuse `assets/icon-x.svg` for the panel's close button rather than creating a near-duplicate asset.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/header.liquid` | modify (full-file replace) | Adds the hamburger trigger and off-canvas panel wrapper around the existing nav/localization markup; CSS repositions the same elements per breakpoint instead of duplicating them; JS adds the panel's open/close/focus-trap behavior and applies the `shopify:section:load` convention to all three of the section's JS behaviors |
| `assets/icon-menu.svg` | create | Hamburger icon, matching existing icon conventions |
| `locales/en.default.schema.json` | modify | One new `t:` key for the panel's close-button label |

No files are deleted. No settings are added or removed — this is a presentation-layer change to the header's existing content, not new merchant-facing configuration.

---

## Task 1: Mobile off-canvas navigation panel

**Files:**
- Modify: `sections/header.liquid` (full-file replace)
- Create: `assets/icon-menu.svg`
- Modify: `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--color-foreground`, `--color-surface`, `--color-border`, `--color-accent`, `--font-header--family`/`--style`/`--weight`, `--space-1`–`--space-6` (all existing tokens, confirmed present in `snippets/css-variables.liquid` before writing this plan). Reuses `assets/icon-x.svg` (existing) for the panel's close button.
- Produces: nothing else in the theme depends on this section's internals — this is a self-contained fix to an already-shipped section, not new shared infrastructure.

Before starting, read `sections/header.liquid` yourself and confirm it still matches what this task assumes (the current desktop-only header with a plain flex row containing title/nav/localization/icons, sticky/condense behavior, and the existing `data-localization-form-submit` JS) — if it's drifted, stop and report NEEDS_CONTEXT rather than guessing which version is current.

- [ ] **Step 1: Create the hamburger icon**

Create `assets/icon-menu.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="var(--icon-stroke-width)"
    d="M3 6h14M3 10h14M3 14h14" />
</svg>
```

- [ ] **Step 2: Replace the header section**

Replace the entire contents of `sections/header.liquid` with:

```liquid
<header class="header">
  <button
    type="button"
    class="header__nav-toggle"
    data-mobile-nav-trigger
    aria-expanded="false"
    aria-controls="MobileNavPanel"
    aria-label="{{ 'labels.menu' | t }}"
  >
    {{ 'icon-menu.svg' | inline_asset_content }}
  </button>

  <h2 class="header__title">
    {{ shop.name | link_to: routes.root_url }}
  </h2>

  <div class="header__panel" id="MobileNavPanel" inert aria-hidden="true">
    <div class="header__panel-header">
      <button type="button" class="header__panel-close" data-mobile-nav-close aria-label="{{ 'labels.close_menu' | t }}">
        {{ 'icon-x.svg' | inline_asset_content }}
      </button>
    </div>

    <nav class="header__menu" aria-label="{{ 'labels.menu' | t }}">
      {% for link in section.settings.menu.links %}
        {% if link.links.size > 0 %}
          <details class="header__menu-item">
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
          <select name="country_code" aria-label="{{ 'labels.country' | t }}" data-localization-form-submit>
            {% for country in localization.available_countries %}
              <option value="{{ country.iso_code }}" {% if country.iso_code == localization.country.iso_code %}selected{% endif %}>
                {{ country.name }} ({{ country.currency.iso_code }})
              </option>
            {% endfor %}
          </select>
          <noscript>
            <button type="submit">{{ 'labels.update' | t }}</button>
          </noscript>
        {% endform %}
      {% endif %}

      {% if localization.available_languages.size > 1 %}
        {% form 'localization', id: 'HeaderLanguageForm', class: 'header__localization-form' %}
          <select name="language_code" aria-label="{{ 'labels.language' | t }}" data-localization-form-submit>
            {% for language in localization.available_languages %}
              <option value="{{ language.iso_code }}" {% if language.iso_code == localization.language.iso_code %}selected{% endif %}>
                {{ language.endonym_name | capitalize }}
              </option>
            {% endfor %}
          </select>
          <noscript>
            <button type="submit">{{ 'labels.update' | t }}</button>
          </noscript>
        {% endform %}
      {% endif %}
    </div>
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

    <a href="{{ routes.cart_url }}" data-cart-drawer-trigger aria-label="{{ 'cart.title' | t }}">
      <sup data-cart-count class="{% if cart.item_count == 0 %}is-hidden{% endif %}">{{ cart.item_count }}</sup>

      {{ 'icon-cart.svg' | inline_asset_content }}
    </a>
  </div>
</header>

<div class="header__panel-overlay" data-mobile-nav-overlay hidden></div>

{% stylesheet %}
  .shopify-section-group-header-group:has(header.header) {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--color-background);
  }
  header.header {
    padding-block: var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-4);
    background-color: var(--color-background);
    transition: padding-block 0.2s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    header.header {
      transition: none;
    }
  }
  header.header.header--condensed {
    padding-block: var(--space-2);
  }
  header .header__title {
    font-family: var(--font-header--family);
    font-style: var(--font-header--style);
    font-weight: var(--font-header--weight);
    flex: 1;
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
  header a sup.is-hidden {
    display: none;
  }
  header svg {
    width: 2rem;
    flex-shrink: 0;
  }
  header .header__icons {
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
  }

  header .header__nav-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-foreground);
    flex-shrink: 0;
  }
  header .header__nav-toggle svg {
    width: 1.5rem;
  }
  header .header__panel-header {
    display: flex;
    justify-content: flex-end;
  }
  header .header__panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-foreground);
  }

  header .header__panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(20rem, 85vw);
    background-color: var(--color-surface);
    z-index: 21;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
  }
  header .header__panel.is-open {
    transform: translateX(0);
  }
  @media (prefers-reduced-motion: reduce) {
    header .header__panel {
      transition: none;
    }
  }
  .header__panel-overlay {
    position: fixed;
    inset: 0;
    background-color: rgb(0 0 0 / 40%);
    z-index: 20;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease;
  }
  .header__panel-overlay.is-open {
    opacity: 1;
    visibility: visible;
  }
  @media (prefers-reduced-motion: reduce) {
    .header__panel-overlay {
      transition: none;
    }
  }

  header .header__menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  header .header__localization {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  @media (min-width: 750px) {
    header .header__nav-toggle {
      display: none;
    }
    header .header__panel {
      position: static;
      width: auto;
      transform: none;
      transition: none;
      padding: 0;
      flex-direction: row;
      align-items: center;
      gap: var(--space-6);
      overflow: visible;
    }
    header .header__panel-header {
      display: none;
    }
    header .header__menu {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
    header .header__localization {
      flex-direction: row;
      gap: 1rem;
    }
    .header__panel-overlay {
      display: none;
    }
  }

  header .header__menu-item {
    color: var(--color-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    min-height: 24px;
  }
  header details.header__menu-item {
    position: relative;
  }
  header details.header__menu-item > summary {
    list-style: none;
    color: var(--color-foreground);
    display: flex;
    align-items: center;
    min-height: 24px;
  }
  header details.header__menu-item > summary::-webkit-details-marker {
    display: none;
  }
  header details[open].header__menu-item > summary {
    color: var(--color-accent);
  }
  header .header__submenu {
    position: static;
    list-style: none;
    margin: 0;
    padding: var(--space-2) 0 0 var(--space-4);
    background-color: transparent;
    border: none;
    min-width: 0;
  }
  @media (min-width: 750px) {
    header .header__submenu {
      position: absolute;
      top: 100%;
      left: 0;
      padding: var(--space-2);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      min-width: 10rem;
      z-index: 1;
    }
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
  function initStickyHeader(root) {
    var sentinel = document.querySelector('[data-scroll-sentinel]');
    var header = root.querySelector('.header');
    if (!sentinel || !header) return;

    var observer = new IntersectionObserver(function (entries) {
      header.classList.toggle('header--condensed', !entries[0].isIntersecting);
    });
    observer.observe(sentinel);
  }

  function initLocalizationForms(root) {
    root.querySelectorAll('[data-localization-form-submit]').forEach(function (select) {
      select.addEventListener('change', function () {
        select.form.submit();
      });
    });
  }

  function initMobileNav(root) {
    var trigger = root.querySelector('[data-mobile-nav-trigger]');
    var panel = root.querySelector('#MobileNavPanel');
    var overlay = root.querySelector('[data-mobile-nav-overlay]');
    var closeButton = root.querySelector('[data-mobile-nav-close]');
    if (!trigger || !panel || !overlay) return;

    var lastFocusedElement = null;

    function getFocusableElements() {
      return Array.from(
        panel.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );
    }

    function openPanel() {
      lastFocusedElement = document.activeElement;
      panel.classList.add('is-open');
      panel.removeAttribute('inert');
      panel.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      overlay.hidden = false;
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
      });
      document.body.style.overflow = 'hidden';

      var focusable = getFocusableElements();
      if (focusable.length > 0) focusable[0].focus();

      document.addEventListener('keydown', onKeydown);
    }

    function closePanel() {
      panel.classList.remove('is-open');
      panel.setAttribute('inert', '');
      panel.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);

      setTimeout(function () {
        overlay.hidden = true;
      }, 300);

      if (lastFocusedElement) lastFocusedElement.focus();
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        closePanel();
        return;
      }

      if (event.key !== 'Tab') return;

      var focusable = getFocusableElements();
      if (focusable.length === 0) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    trigger.addEventListener('click', openPanel);
    overlay.addEventListener('click', closePanel);
    if (closeButton) closeButton.addEventListener('click', closePanel);

    var desktopQuery = window.matchMedia('(min-width: 750px)');
    desktopQuery.addEventListener('change', function (event) {
      if (event.matches) closePanel();
    });
  }

  initStickyHeader(document);
  initLocalizationForms(document);
  initMobileNav(document);

  document.addEventListener('shopify:section:load', function (event) {
    initStickyHeader(event.target);
    initLocalizationForms(event.target);
    initMobileNav(event.target);
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

Note what did NOT change: the `{% schema %}` block is byte-for-byte identical to before — this task only changes markup structure, CSS, and JS; no merchant-facing settings are added or removed. Note the `desktopQuery.addEventListener('change', ...)` auto-close: without it, a shopper who opens the mobile panel on a phone, then rotates to landscape or resizes past 750px (or the merchant previews at different breakpoints in the theme editor), would be left with a `position: static` panel still carrying `is-open`/`inert`-removed state — harmless visually at desktop width since the CSS override takes over, but worth closing cleanly rather than leaving a stale open/inert state hanging.

- [ ] **Step 3: Add the new locale key**

In `locales/en.default.schema.json`, add to the `labels` object:

```json
    "close_menu": "Close menu",
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

Test at both a mobile viewport (375px) and desktop width:

1. **Desktop (≥750px)**: confirm the header renders exactly as before this change — logo, inline nav with dropdown submenus, localization selects (if the store has them), search/account/cart icons, all in one row, no hamburger button visible, no visible panel/overlay artifacts.
2. **Mobile (<750px)**: confirm the header no longer causes horizontal page overflow (this is the actual bug being fixed — check `document.documentElement.scrollWidth` vs `window.innerWidth`, or simply confirm no horizontal scrollbar). Confirm the hamburger button is visible and the nav/localization are NOT visible inline.
3. Click the hamburger: panel slides in from the left, overlay appears, focus moves to the first focusable element inside (the close button), `aria-expanded` becomes `"true"`, `inert` is removed, `aria-hidden` becomes `"false"`.
4. Inside the open panel: confirm nav links and (if present) localization selects are all reachable and functional, submenu `<details>` still expand/collapse correctly in the vertical mobile layout.
5. Close via: the explicit close button, clicking the overlay, and pressing Escape — confirm all three work and each returns focus to the hamburger trigger.
6. Tab through the open panel: confirm focus wraps both directions (Tab from last element back to first, Shift+Tab from first back to last) and stays trapped inside.
7. With the panel open, resize the viewport past 750px (or use responsive mode to simulate it) — confirm the panel auto-closes cleanly rather than staying stuck in an open/inert-removed state.
8. Check the browser console for errors throughout.
9. If reachable, edit a header setting in the theme editor and confirm the mobile nav still works after the section reloads (tests the `shopify:section:load` re-init).

- [ ] **Step 6: Commit**

```bash
git add sections/header.liquid assets/icon-menu.svg locales/en.default.schema.json
git commit -m "feat: add mobile off-canvas navigation panel"
```

---

## Self-Review Notes

- **Spec coverage**: closes the "fully responsive at all breakpoints" gap (spec §7) that was explicitly named as a deferral in the header-layout plan's final review and then concretely confirmed by the homepage-hero plan's fix round. Does not touch any other open item from either of those plans' deferred-item lists (cart icon aria-label — already fixed in the header-layout plan's own fix round; silent cart-error UI; announcement-bar hover/focus race; `<details>` close-on-outside-click; demo content authoring; label copy wording) — those remain separately tracked, not silently folded into or dropped by this plan.
- **Type/name consistency checked**: `data-mobile-nav-trigger`/`data-mobile-nav-close`/`data-mobile-nav-overlay`/`#MobileNavPanel` are all defined and consumed within this single task's one file — no cross-task or cross-file dependency risk (single-task plan). The focus-trap function shape (`getFocusableElements`/`openPanel`/`closePanel`/`onKeydown` with the `!panel.contains(document.activeElement)` guard) deliberately mirrors `assets/cart-drawer.js`'s already-reviewed, already-hardened implementation rather than being written from scratch — reduces the chance of reintroducing a bug that pattern already had fixed once.
- **No placeholders**: every step has literal code and a concrete, checkable expected result, including an explicit test for the exact failure mode this plan exists to fix (horizontal page overflow at 375px) rather than only testing the new feature in isolation.
