# STRIDE Theme Global Layout — Cart Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the slide-out cart drawer (spec §3.3) — the last remaining piece of spec §3 Global layout. Line items, quantity/remove controls, a free-shipping progress bar, and a checkout CTA, all AJAX-driven site-wide (add-to-cart never navigates away from the page the shopper is on), on top of the header/footer/announcement-bar work already merged.

**Architecture:** Same conventions as the three previous plans — Liquid + native CSS, tokens via `var(--token)` only, no build step. The drawer is rendered as its own **static section** (`{% section 'cart-drawer' %}` directly in `layout/theme.liquid`, not part of a section group) specifically so it gets a simple, predictable presence in the DOM — a lesson carried forward from the header plan, where section-*group* wrappers turned out to carry dynamic, per-store-instance ids (`shopify-section-sections--{id}__header`) that couldn't be hardcoded in CSS/JS. This plan gives the drawer's own root element a fixed `id="cart-drawer"` in the Liquid itself, so JS never needs to know or guess Shopify's wrapper id at all — only Shopify's **Section Rendering API** (`?sections=cart-drawer`) needs the section's registered name, which is static and known ahead of time. All cart mutations go through Shopify's native AJAX Cart API (`/cart/add.js`, `/cart/change.js`, both public, documented, and already used by essentially every modern Shopify theme) — no custom backend.

**Tech Stack:** Shopify Liquid, native CSS, vanilla JS (`fetch`, no framework). One new site-wide JS asset (`assets/cart-drawer.js`, loaded via `{% javascript %}`... actually via a `<script>` tag in `theme.liquid` since it must run on every page, not just inside one section — see Task 2).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §3.3 (Cart drawer). Deliberately **out of scope for this plan** (each is a real requirement from spec §5.1/§6, but belongs to a later, more natural plan):
- The "you might also like" complementary-product block inside the drawer (spec §3.3) — this needs Shopify's product-recommendations API keyed off a reference product, which only makes sense once the product-page plan (spec §13 phase 5) establishes how recommendations are fetched elsewhere in the theme. Building it twice, differently, would be wasted work.
- Predictive search (spec §3.2) — a separate AJAX feature with its own fetch/debounce/results-panel logic; gets its own plan immediately after this one.
- Cart page (`/cart`, spec §5.3) full-page parity — `sections/cart.liquid` (the existing `/cart` route) is untouched by this plan. The drawer is the *primary* cart UX per spec §3.3, but the full page must independently satisfy every cart requirement too; that's its own later task (spec §13 phase 7).

## Global Constraints

(Carried over from all three previous plans; every task below implicitly inherits these — and folds in the concrete lessons already learned rather than repeating them as fresh findings.)

- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Never use `--color-accent-secondary` (sage) as small body-text color. Any new interactive element's border/boundary needs ≥3:1 against its background — use `--color-foreground-muted` (5.70:1 on white), not `--color-border` (1.42:1 on white, fails), for anything that needs to read as a control boundary.
- Touch targets ≥24×24 CSS px on every interactive element — apply `min-width`/`min-height: 24px` proactively.
- `prefers-reduced-motion` respected wherever animation/transition is added (the drawer's slide-in transition needs this gate).
- Section-root elements meant to span the full viewport need the `.full-width` utility (`assets/critical.css`) — the drawer's own root is `position: fixed`, so it's exempt from the grid-column layout system entirely (not a `.full-width` candidate — flag this explicitly in Task 1 so a reviewer doesn't ask for it incorrectly).
- Never hardcode a Shopify section-*group* wrapper id in CSS/JS (they're dynamic per store instance) — this plan avoids the problem entirely by using a static section with a self-controlled fixed id instead of a group.
- Form inputs need a unique `id` with a `<label for="...">`; icon-only buttons need `aria-label`.
- No Lorem Ipsum in default values; every setting has a `label`; American English, sentence case, Shopify's approved terminology.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, the `{% comment %}` section-header style already used in `sections/product.liquid`/`sections/cart.liquid`, reuse `assets/icon-x.svg` for any "close"/"remove" icon need rather than creating a near-duplicate asset.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/cart-drawer.liquid` | create | Drawer markup: line items, quantity/remove controls, free-shipping bar, subtotal, checkout CTA, empty state |
| `layout/theme.liquid` | modify | Renders `{% section 'cart-drawer' %}` and loads `assets/cart-drawer.js` on every page |
| `sections/header.liquid` | modify | Cart icon becomes a drawer-open trigger (with a real-link no-JS fallback); cart count badge gets a stable `data-cart-count` hook |
| `sections/product.liquid` | modify | Add-to-cart form gets a `data-add-to-cart-form` hook so site-wide JS can intercept it |
| `assets/cart-drawer.js` | create | Open/close, focus trap, add-to-cart interception, quantity/remove via the AJAX Cart API, Section Rendering API refresh |
| `locales/en.default.json` | modify | New `cart.*` storefront copy (close, empty state, shipping messages, quantity controls) |
| `locales/en.default.schema.json` | modify | New `t:` keys for the drawer section's name/settings |

No files are deleted.

---

## Task 1: Static cart drawer markup

**Files:**
- Create: `sections/cart-drawer.liquid`
- Modify: `layout/theme.liquid`
- Modify: `locales/en.default.json`
- Modify: `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `--font-header--family`, `--color-foreground`, `--color-foreground-muted`, `--color-background`, `--color-background-alt`, `--color-surface`, `--color-border`, `--color-accent`, `--space-1`–`--space-4` (all existing tokens, confirmed present in `snippets/css-variables.liquid` before writing this plan). Reuses `assets/icon-x.svg` (existing asset) for the close button and remove-item icon.
- Produces: a fixed `id="cart-drawer"` root element and a fixed section name `cart-drawer` — Task 2's JS opens/closes this by id and refreshes it via `?sections=cart-drawer`. A `data-cart-drawer-overlay` element for click-outside-to-close. `data-cart-quantity-change="1|-1"` / `data-cart-remove` / `data-line="{{ forloop.index }}"` attributes on the per-item controls — Task 2's JS reads these to know which cart line to mutate.

This task is deliberately **non-interactive**: the quantity +/- buttons render but do nothing yet (no JS exists until Task 2) — note this clearly when verifying so it isn't mistaken for a bug. The remove control is a real `<a href="{{ item.url_to_remove }}">` link, which already works via a full page reload even before Task 2's JS exists (Shopify's native no-JS cart-removal route) — this is intentional progressive enhancement, not an oversight.

- [ ] **Step 1: Create the drawer section**

Create `sections/cart-drawer.liquid`:

```liquid
{% comment %}
  Renders the slide-out cart drawer. Included globally via a static
  {% section %} tag in layout/theme.liquid (not a section group), so its
  root element gets a fixed id="cart-drawer" instead of a dynamic
  per-store-instance wrapper id — JS never needs to guess or hardcode
  Shopify's own wrapper id, only the section's registered name
  ("cart-drawer") for the Section Rendering API.

  https://shopify.dev/docs/storefronts/themes/architecture/sections
{% endcomment %}

<aside id="cart-drawer" class="cart-drawer" aria-hidden="true" aria-label="{{ 'cart.title' | t }}">
  <div class="cart-drawer__header">
    <h2 class="cart-drawer__title">{{ 'cart.title' | t }}</h2>
    <button type="button" class="cart-drawer__close" data-cart-drawer-close aria-label="{{ 'cart.close' | t }}">
      {{ 'icon-x.svg' | inline_asset_content }}
    </button>
  </div>

  {% if section.settings.free_shipping_threshold > 0 %}
    {% liquid
      assign threshold_cents = section.settings.free_shipping_threshold | times: 100
      assign remaining = threshold_cents | minus: cart.total_price
    %}
    <div class="cart-drawer__shipping-bar">
      {% if remaining > 0 %}
        <p class="cart-drawer__shipping-message">
          {{ 'cart.free_shipping_remaining_html' | t: amount: remaining | money }}
        </p>
      {% else %}
        <p class="cart-drawer__shipping-message">{{ 'cart.free_shipping_unlocked' | t }}</p>
      {% endif %}
      <div class="cart-drawer__shipping-track">
        {% liquid
          assign progress = cart.total_price | times: 1.0 | divided_by: threshold_cents
          if progress > 1
            assign progress = 1
          endif
        %}
        <div class="cart-drawer__shipping-fill" style="--progress: {{ progress }}"></div>
      </div>
    </div>
  {% endif %}

  <div class="cart-drawer__body" data-cart-drawer-body>
    {% if cart.item_count > 0 %}
      <ul class="cart-drawer__items" role="list">
        {% for item in cart.items %}
          <li class="cart-drawer__item" data-cart-item data-line="{{ forloop.index }}">
            {% render 'image', class: 'cart-drawer__item-image', image: item.image, url: item.url, width: 160, height: 160, crop: 'center' %}

            <div class="cart-drawer__item-details">
              <a href="{{ item.url }}" class="cart-drawer__item-title">{{ item.product.title }}</a>
              {% if item.variant.title != 'Default Title' %}
                <p class="cart-drawer__item-variant">{{ item.variant.title }}</p>
              {% endif %}
              <p class="cart-drawer__item-price">{{ item.final_price | money }}</p>

              <div class="cart-drawer__item-quantity">
                <button type="button" data-cart-quantity-change="-1" data-line="{{ forloop.index }}" aria-label="{{ 'cart.decrease_quantity' | t }}">&minus;</button>
                <span data-cart-quantity-value>{{ item.quantity }}</span>
                <button type="button" data-cart-quantity-change="1" data-line="{{ forloop.index }}" aria-label="{{ 'cart.increase_quantity' | t }}">&plus;</button>
              </div>
            </div>

            <a href="{{ item.url_to_remove }}" class="cart-drawer__item-remove" data-cart-remove data-line="{{ forloop.index }}" aria-label="{{ 'cart.remove' | t }}">
              {{ 'icon-x.svg' | inline_asset_content }}
            </a>
          </li>
        {% endfor %}
      </ul>
    {% else %}
      <div class="cart-drawer__empty">
        <p>{{ 'cart.empty' | t }}</p>
        <a href="{{ routes.all_products_collection_url }}" class="cart-drawer__continue-shopping">{{ 'cart.continue_shopping' | t }}</a>
      </div>
    {% endif %}
  </div>

  {% if cart.item_count > 0 %}
    <div class="cart-drawer__footer">
      <div class="cart-drawer__subtotal">
        <span>{{ 'cart.subtotal' | t }}</span>
        <span data-cart-subtotal>{{ cart.total_price | money }}</span>
      </div>
      <a href="{{ routes.cart_url }}" class="cart-drawer__checkout">{{ 'cart.checkout' | t }}</a>
    </div>
  {% endif %}
</aside>

<div class="cart-drawer-overlay" data-cart-drawer-overlay hidden></div>

{% stylesheet %}
  .cart-drawer-overlay {
    position: fixed;
    inset: 0;
    background-color: rgb(0 0 0 / 40%);
    z-index: 20;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease;
  }
  .cart-drawer-overlay.is-open {
    opacity: 1;
    visibility: visible;
  }
  .cart-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(28rem, 100vw);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    z-index: 21;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: -2px 0 12px rgb(0 0 0 / 15%);
  }
  .cart-drawer.is-open {
    transform: translateX(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .cart-drawer,
    .cart-drawer-overlay {
      transition: none;
    }
  }
  .cart-drawer__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
  .cart-drawer__title {
    font-family: var(--font-header--family);
    font-size: 1.25rem;
    margin: 0;
  }
  .cart-drawer__close {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    color: var(--color-foreground);
  }
  .cart-drawer__close svg {
    width: 1.25rem;
  }
  .cart-drawer__shipping-bar {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
  .cart-drawer__shipping-message {
    margin: 0 0 var(--space-2);
    font-size: 0.875rem;
  }
  .cart-drawer__shipping-track {
    height: 4px;
    background-color: var(--color-background-alt);
    border-radius: 2px;
    overflow: hidden;
  }
  .cart-drawer__shipping-fill {
    height: 100%;
    width: calc(var(--progress, 0) * 100%);
    background-color: var(--color-accent);
    transition: width 0.3s ease;
  }
  .cart-drawer__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }
  .cart-drawer__items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .cart-drawer__item {
    display: grid;
    grid-template-columns: 5rem 1fr auto;
    gap: var(--space-3);
  }
  .cart-drawer__item-image {
    width: 5rem;
  }
  .cart-drawer__item-title {
    color: var(--color-foreground);
    text-decoration: none;
    font-weight: 600;
  }
  .cart-drawer__item-variant,
  .cart-drawer__item-price {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
    margin: var(--space-1) 0 0;
  }
  .cart-drawer__item-quantity {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .cart-drawer__item-quantity button {
    min-width: 24px;
    min-height: 24px;
    border: 1px solid var(--color-foreground-muted);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    cursor: pointer;
  }
  .cart-drawer__item-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    color: var(--color-foreground-muted);
  }
  .cart-drawer__item-remove svg {
    width: 1rem;
  }
  .cart-drawer__empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .cart-drawer__continue-shopping {
    color: var(--color-accent);
  }
  .cart-drawer__footer {
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .cart-drawer__subtotal {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
  }
  .cart-drawer__checkout {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: var(--space-3);
    background-color: var(--color-foreground);
    color: var(--color-background);
    text-decoration: none;
    font-weight: 700;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.cart_drawer",
  "settings": [
    {
      "type": "number",
      "id": "free_shipping_threshold",
      "label": "t:labels.free_shipping_threshold",
      "info": "t:labels.free_shipping_threshold_info",
      "default": 100
    }
  ]
}
{% endschema %}
```

Note: `assign progress = cart.total_price | times: 1.0 | divided_by: threshold_cents` — `cart.total_price` is already in cents (Shopify convention), matching `threshold_cents`, so this ratio is dimensionless (0–1) regardless of currency; the `times: 1.0` forces floating-point division (Liquid's `divided_by` truncates to an integer otherwise, which would make the progress bar always show 0% or 100%). Verify this actually produces a sane fractional value once you can test it live — if Liquid's math filters behave differently than expected here, fix the calculation and report the deviation.

- [ ] **Step 2: Wire the drawer into the layout**

In `layout/theme.liquid`, change:

```liquid
    {% sections 'footer-group' %}
  </body>
```

to:

```liquid
    {% sections 'footer-group' %}

    {% section 'cart-drawer' %}
  </body>
```

(Loading the drawer's JS asset is Task 2's responsibility, not this one — this step only adds the markup.)

- [ ] **Step 3: Add the storefront-facing locale keys**

In `locales/en.default.json`, extend the existing `cart` object:

```json
  "cart": {
    "checkout": "Checkout",
    "title": "Cart",
    "update": "Update",
    "remove": "Remove",
    "close": "Close cart",
    "empty": "Your cart is empty",
    "continue_shopping": "Continue shopping",
    "subtotal": "Subtotal",
    "decrease_quantity": "Decrease quantity",
    "increase_quantity": "Increase quantity",
    "free_shipping_remaining_html": "You're {{ amount }} away from free shipping",
    "free_shipping_unlocked": "You've unlocked free shipping!"
  },
```

- [ ] **Step 4: Add the schema locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "cart_drawer": "Cart drawer",
```

Add to the `labels` object:

```json
    "free_shipping_threshold": "Free shipping threshold",
    "free_shipping_threshold_info": "Amount a cart must reach to unlock free-shipping messaging, in your store's currency. Set to 0 to hide this feature.",
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

Since there's no JS yet to open the drawer, verify it by temporarily editing the live DOM (via browser devtools — remove `aria-hidden="true"` and add class `is-open` to `#cart-drawer`, and class `is-open` to `[data-cart-drawer-overlay]`, then remove `hidden` from the overlay) to see it rendered in its open state. Add at least one item to the cart first (via a normal product-page add-to-cart, since there's no drawer-based add yet) so the populated state (not just empty state) is visible. Confirm: line item image/title/variant/price/quantity render correctly, the free-shipping bar shows a sensible message and a partially-filled bar (not stuck at 0% or 100% — this validates the Liquid math from Step 1's note), subtotal and checkout link are correct, and the empty state (test with an empty cart) shows the right message and link. Confirm remove links work via a real click (full page reload, no JS needed yet). Check `shopify theme check` again after any fixes.

- [ ] **Step 7: Commit**

```bash
git add sections/cart-drawer.liquid layout/theme.liquid locales/en.default.json locales/en.default.schema.json
git commit -m "feat: add static cart drawer markup"
```

---

## Task 2: Cart drawer interactivity

**Files:**
- Create: `assets/cart-drawer.js`
- Modify: `layout/theme.liquid` (load the script)
- Modify: `sections/header.liquid` (cart icon becomes a drawer trigger; count badge gets a stable hook)
- Modify: `sections/product.liquid` (add-to-cart form gets an interception hook)

**Interfaces:**
- Consumes: `#cart-drawer`, `[data-cart-drawer-overlay]`, `[data-cart-drawer-close]`, `[data-cart-drawer-body]`, `[data-cart-item]`/`[data-line]`, `[data-cart-quantity-change]`, `[data-cart-quantity-value]`, `[data-cart-remove]`, `[data-cart-subtotal]` — all from Task 1's markup, already confirmed present.
- Produces: `window` click/keydown listeners are set up once at load; no other file depends on anything this task exports, since this is the last task in the plan.

Before starting, read `sections/header.liquid` and `sections/product.liquid` yourself to confirm they still match what this task assumes (the header's cart link and the product form) — if either has changed since the last plan touched it, stop and report NEEDS_CONTEXT rather than guessing.

- [ ] **Step 1: Create the cart drawer JS**

Create `assets/cart-drawer.js`:

```js
(function () {
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.querySelector('[data-cart-drawer-overlay]');
  if (!drawer || !overlay) return;

  var body = drawer.querySelector('[data-cart-drawer-body]');
  var lastFocusedElement = null;

  function getFocusableElements() {
    return Array.from(
      drawer.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
    );
  }

  function openDrawer() {
    lastFocusedElement = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';

    var focusable = getFocusableElements();
    if (focusable.length > 0) focusable[0].focus();

    document.addEventListener('keydown', onKeydown);
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
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
      closeDrawer();
      return;
    }

    if (event.key !== 'Tab') return;

    var focusable = getFocusableElements();
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function updateCartCount(count) {
    var badges = document.querySelectorAll('[data-cart-count]');
    badges.forEach(function (badge) {
      badge.textContent = count;
      badge.classList.toggle('is-hidden', count === 0);
    });
  }

  function refreshDrawer() {
    return fetch('/?sections=cart-drawer')
      .then(function (response) {
        return response.json();
      })
      .then(function (sections) {
        var html = sections['cart-drawer'];
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newDrawer = doc.getElementById('cart-drawer');
        if (!newDrawer) return;

        drawer.innerHTML = newDrawer.innerHTML;
        body = drawer.querySelector('[data-cart-drawer-body]');
      });
  }

  function addToCart(form) {
    var formData = new FormData(form);
    var body = JSON.stringify({
      items: [
        {
          id: formData.get('id'),
          quantity: formData.get('quantity') || 1
        }
      ]
    });

    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Add to cart failed');
        return response.json();
      })
      .then(function () {
        return fetch('/cart.js');
      })
      .then(function (response) {
        return response.json();
      })
      .then(function (cart) {
        updateCartCount(cart.item_count);
        return refreshDrawer();
      })
      .then(function () {
        openDrawer();
      });
  }

  function changeCartLine(line, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity })
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (cart) {
        updateCartCount(cart.item_count);
        return refreshDrawer();
      });
  }

  overlay.addEventListener('click', closeDrawer);

  drawer.addEventListener('click', function (event) {
    if (event.target.closest('[data-cart-drawer-close]')) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    var removeLink = event.target.closest('[data-cart-remove]');
    if (removeLink) {
      event.preventDefault();
      var line = parseInt(removeLink.dataset.line, 10);
      changeCartLine(line, 0);
      return;
    }

    var quantityButton = event.target.closest('[data-cart-quantity-change]');
    if (quantityButton) {
      event.preventDefault();
      var itemEl = quantityButton.closest('[data-cart-item]');
      var valueEl = itemEl.querySelector('[data-cart-quantity-value]');
      var currentQuantity = parseInt(valueEl.textContent, 10);
      var delta = parseInt(quantityButton.dataset.cartQuantityChange, 10);
      var newQuantity = Math.max(0, currentQuantity + delta);
      changeCartLine(parseInt(quantityButton.dataset.line, 10), newQuantity);
    }
  });

  document.querySelectorAll('[data-cart-drawer-trigger]').forEach(function (trigger) {
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      openDrawer();
    });
  });

  document.querySelectorAll('[data-add-to-cart-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      addToCart(form);
    });
  });
})();
```

- [ ] **Step 2: Load the script**

In `layout/theme.liquid`, change:

```liquid
    {% section 'cart-drawer' %}
  </body>
```

to:

```liquid
    {% section 'cart-drawer' %}

    <script src="{{ 'cart-drawer.js' | asset_url }}" defer></script>
  </body>
```

- [ ] **Step 3: Make the header cart icon a drawer trigger**

In `sections/header.liquid`, find:

```liquid
    <a href="{{ routes.cart_url }}">
      {% if cart.item_count > 0 %}
        <sup>{{ cart.item_count }}</sup>
      {% endif %}

      {{ 'icon-cart.svg' | inline_asset_content }}
    </a>
```

Replace with:

```liquid
    <a href="{{ routes.cart_url }}" data-cart-drawer-trigger>
      <sup data-cart-count class="{% if cart.item_count == 0 %}is-hidden{% endif %}">{{ cart.item_count }}</sup>

      {{ 'icon-cart.svg' | inline_asset_content }}
    </a>
```

(The `href` stays pointing at the real `/cart` page — if JS fails to load, this is still a working link, just without the drawer intercepting the click. `data-cart-drawer-trigger` is what `cart-drawer.js` listens for. The `<sup>` is now always rendered, with an `is-hidden` class toggled by both server-render — for the initial page load — and by `cart-drawer.js`'s `updateCartCount` after any AJAX mutation, so the same element serves both the no-JS-yet-loaded and the post-interaction states without a markup mismatch.)

Add the `is-hidden` utility to the same section's `{% stylesheet %}` block — find:

```css
  header a sup {
    position: absolute;
    left: 100%;
    overflow: hidden;
    max-width: var(--page-margin);
  }
```

Change to:

```css
  header a sup {
    position: absolute;
    left: 100%;
    overflow: hidden;
    max-width: var(--page-margin);
  }
  header a sup.is-hidden {
    display: none;
  }
```

- [ ] **Step 4: Hook up the product add-to-cart form**

In `sections/product.liquid`, find:

```liquid
  {% form 'product', product %}
```

Change to:

```liquid
  {% form 'product', product, data-add-to-cart-form: true %}
```

Verify live that Liquid's `{% form %}` tag actually accepts arbitrary `data-*` attributes this way (most Shopify form tags do pass through extra key-value pairs as HTML attributes on the rendered `<form>`, but confirm rather than assume) — if it doesn't render the attribute correctly, add it a different way (e.g. wrap the existing `<select>`/`<input>`/submit block in a plain `<form data-add-to-cart-form>` remains inside the `{% form %}` tag's own form — check what actually works and report which approach you used).

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser**

```bash
shopify theme dev
```

Test the full flow live:
1. From a product page, submit the add-to-cart form. Confirm: no page navigation occurs, the drawer opens automatically, the new item appears in it, the header's cart count badge updates without a page reload.
2. Click the header cart icon when the drawer is closed — confirm it opens (does NOT navigate to `/cart`).
3. Inside the open drawer: click a quantity `+`/`-` button, confirm the line's quantity and the subtotal update without a page reload, and the free-shipping bar's fill/message updates accordingly. Click remove, confirm the item disappears without a page reload.
4. Press Escape while the drawer is open — confirm it closes. Click the overlay — confirm it closes. Click the explicit close button — confirm it closes.
5. Tab through the open drawer's focusable elements — confirm focus stays trapped inside (Tab from the last element wraps to the first, Shift+Tab from the first wraps to the last).
6. Confirm closing the drawer returns focus to whatever triggered it (the cart icon, or the add-to-cart button).
7. With JS disabled (or by directly testing the fallback path), confirm the cart icon's `href` and each item's remove link still work as plain navigations.
8. Check the browser console for errors throughout.

- [ ] **Step 7: Commit**

```bash
git add assets/cart-drawer.js layout/theme.liquid sections/header.liquid sections/product.liquid
git commit -m "feat: add cart drawer interactivity (AJAX add/update/remove, focus trap)"
```

---

## Self-Review Notes

- **Spec coverage**: §3.3 (slide-out drawer, focus-trap/overlay, line items with `title`/`unit_price`(via `final_price`)/`image`/`final_price`/`quantity`/`options_with_values` (via variant title), remove, free-shipping progress bar, add/update/remove via fetch with no full reload, checkout CTA + accelerated checkout, cart notes, tax-inclusive indicator, empty-cart state) → Tasks 1 and 2, plus the final review's fix round (which added the real `<form>`/checkout button, `content_for_additional_checkout_buttons`, cart notes, and the tax-inclusive indicator — none of that was in the tasks as originally written), together cover all of it except: unit pricing (`variant.unit_price`, only relevant for items sold by weight/volume — deferred as a display-only addition to a later a11y/completeness pass since it's a conditional `{% if item.unit_price_measurement %}` add-on, not core drawer mechanics), selling plans and automatic discount codes (spec §3.3 also lists these as mandatory cart features — deliberately deferred to spec §13 phase 7 alongside the full `/cart` page, since both need the same discount/selling-plan rendering logic and building it once for both surfaces is better than building it twice), and the complementary-product "you might also like" block (explicitly named in this plan's own scope-boundary section above). **Correction**: an earlier version of this note incorrectly claimed the accelerated checkout button was also named in that scope-boundary section — it was not; that was a real gap in the tasks as originally written, caught by the plan's own final whole-branch review and closed in the fix round, not a deliberate deferral. Recorded here accurately rather than left as a false claim.
- **Type/name consistency checked**: every `data-*` hook Task 2's JS reads (`data-cart-drawer-trigger`, `data-cart-drawer-close`, `data-cart-drawer-overlay`, `data-cart-drawer-body`, `data-cart-item`/`data-line`, `data-cart-quantity-change`, `data-cart-quantity-value`, `data-cart-remove`, `data-cart-subtotal`, `data-cart-count`, `data-add-to-cart-form`) is defined in Task 1's markup or Task 2's own header/product edits — none are referenced before they're created. The fixed `id="cart-drawer"` from Task 1 is what both `getElementById` (JS) and `?sections=cart-drawer` (Section Rendering API) rely on — verified this is a static section (not a group), so unlike the header/footer plans, no dynamic-id risk exists here.
- **No placeholders**: every step has literal code and a concrete, checkable expected result — including two explicit "verify this actually works live, fix and report if not" call-outs (the free-shipping progress math, and the `{% form %}` tag's `data-*` attribute pass-through) for the two places this plan is least certain about exact Shopify/Liquid runtime behavior, rather than asserting confidence it doesn't have.
