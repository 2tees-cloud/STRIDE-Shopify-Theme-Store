# STRIDE Cart Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the skeleton-theme's placeholder `sections/cart.liquid` (currently: a bare table, one shared quantity input per row with no distinct submit, no totals/discounts/notes/accelerated checkout) into the spec §5.3-compliant full-page cart. This is explicitly a **fallback that exists alongside the drawer, not a replacement** — the drawer (`sections/cart-drawer.liquid`) stays the primary UX; this page must independently satisfy every cart requirement on its own, for the case a customer lands on `/cart` directly (a shared link, a back button, JS disabled, etc.).

**Architecture — no AJAX needed here, and that's a deliberate difference from the drawer, not an oversight.** The drawer's whole reason to exist is instant, no-navigation feedback; the `/cart` page's job is the opposite — be a fully self-contained, standards-based page that works with a plain form POST and zero JS, exactly the "graceful degradation" baseline this project already applies elsewhere (collection filtering, product variant picking). Quantity changes and line removal go through native `<form method="post">` submission (`updates[]` array + a single "Update cart" submit, matching Shopify's own documented cart-page pattern), not the drawer's AJAX `/cart/change.js` calls. Do not add JS to replicate the drawer's AJAX behavior on this page — that would defeat the point of having a genuinely independent fallback.

**Tech Stack:** Shopify Liquid, native CSS. No new JS asset for this plan (Task 2's accelerated-checkout button is Shopify's own native `content_for_additional_checkout_buttons`/`content_for_additional_checkout_buttons`-rendered component, same mechanism already used in `sections/cart-drawer.liquid`, requiring no custom script).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §5.3 (Cart), relevant lines of §6 (discount display, accelerated checkout, unit pricing, selling plans on cart page — explicitly deferred from the earlier cart-drawer plan, picked up here for the full page specifically since spec requires them on the page even though the drawer plan didn't add them).

## Global Constraints

(Carried over from all prior plans; every task below implicitly inherits these.)

- **Live-verify with a real, populated cart at BOTH mobile (<750px) and desktop (≥750px) widths, via actual interaction — not a screenshot, not an empty cart only.** Also verify the genuinely-empty-cart state explicitly, not just the happy path — this project's history (both the product-page and collection-page plans) has repeatedly found real bugs specifically in states nobody bothered to check live.
- A `shopify theme dev` session is available in this environment (restored partway through the previous work session, after a long stretch where it wasn't) — use it. If it's down when this plan starts, re-attempt it first; if still blocked, fall back to the same disclosed static-verification discipline used throughout this project (explicit, honest, per-claim live-vs-static labeling, never fabricated).
- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. Do not reuse `--color-border` for any new interactive element's boundary without checking contrast first — this exact mistake has recurred multiple times across this project; use `--color-foreground-muted` where a subtle border is needed, matching every prior fix.
- Touch targets ≥24×24 CSS px on every interactive element (quantity inputs, remove links, update/checkout buttons).
- `prefers-reduced-motion` respected wherever animation/transition is added (likely minimal/none needed for this page).
- Any section-root element meant to span the full viewport needs the `.full-width` utility, with its own horizontal mobile padding (`padding-inline`) — checked fresh every time, this has been the single most common regression across recent plans.
- **`{% stylesheet %}` and `{% schema %}` must be at file root — never nested inside `{% if %}`/`{% for %}`.** This exact mistake has occurred 4+ times across this project's plans.
- **Any new locale key must be added to the correct file**: `| t` in body markup → `locales/en.default.json`; `t:` inside `{% schema %}` → `locales/en.default.schema.json`. Reuse existing `cart.*` keys already shipped for the drawer (`cart.title`, `cart.remove`, `cart.checkout`, `cart.subtotal`, `cart.taxes_included`, `cart.note`, `cart.empty`, `cart.continue_shopping`, etc. — check `locales/en.default.json`'s existing `cart` object before adding anything that might already exist there).
- **Genuinely-unconfirmed-at-plan-writing-time Liquid API shapes must be verified against real documentation before being treated as correct**: this plan flags `cart.cart_level_discount_applications`, `item.line_level_discount_allocations`, and `item.selling_plan_allocation`'s exact property shapes — none of these have been used anywhere in this project before. Use the `shopify-liquid` skill's documentation search tool (or equivalent, including a live WebFetch of shopify.dev if needed) the way prior tasks in this project have for exactly this kind of verification — Liquid silently returns nil for a wrong property name rather than erroring, so a wrong guess would ship a silently-broken feature.
- No Lorem Ipsum in default values; every setting has a `label`; every image needs accessible `alt`.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space indent, reuse `snippets/image.liquid` for line-item images, reuse the `.visually-hidden` utility in `assets/critical.css` where needed, reuse existing tokens/spacing scale, match `sections/cart-drawer.liquid`'s established class-naming/markup conventions where the two pages share the same concept (line item structure, quantity stepper, note field) — this page is a sibling of the drawer, not an unrelated design, so visual/structural consistency with the already-shipped drawer matters.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sections/cart.liquid` | rewrite | Full cart page: line items, quantities, totals, discounts, unit pricing, selling plans, notes, checkout |
| `templates/cart.json` | unchanged | No edit needed — `cart.json` renders whatever's actually in the visited customer's cart, same reasoning as `templates/collection.json` needing no fixed reference in the prior plan |
| `locales/en.default.json` | modify | New storefront-facing keys not already covered by the drawer's existing `cart.*` object |
| `locales/en.default.schema.json` | modify | New `t:` keys for this section's settings, if any are added |

No files are deleted. `sections/cart.liquid`'s current bare-bones content is fully replaced (same situation as the product and collection pages before their overhauls — the skeleton-theme scaffold was always a starting point).

---

## Task 1: Core cart page — line items, quantities, totals, notes, empty state

**Files:**
- Rewrite: `sections/cart.liquid`
- Modify: `locales/en.default.json`, `locales/en.default.schema.json`

**Interfaces:**
- Consumes: `snippets/image.liquid` (existing), existing `cart.*` locale keys already shipped for the drawer.
- Produces: the full line-item list structure and the page's single `<form>` — Task 2 adds discount/unit-price/selling-plan display and the accelerated checkout button inside this same structure, so keep line items in a clearly-scoped block Task 2 can extend without restructuring.

- [ ] **Step 1: Rewrite the cart section — core structure**

Replace `sections/cart.liquid` entirely:

```liquid
{% comment %}
  Full-page cart — a fallback that exists alongside the cart drawer
  (sections/cart-drawer.liquid), not a replacement for it. The drawer
  stays the primary UX; this page independently satisfies every cart
  requirement for the case a customer lands on /cart directly. No
  AJAX here — that's deliberate, this page's whole point is to work
  as a plain, native form-submission page with zero JS required.
{% endcomment %}

<div class="cart-page full-width">
  <h1 class="cart-page__title">{{ 'cart.title' | t }}</h1>

  {% if cart.item_count > 0 %}
    <form action="{{ routes.cart_url }}" method="post" class="cart-page__form">
      <ul class="cart-page__items" role="list">
        {% for item in cart.items %}
          <li class="cart-page__item">
            {% if item.image %}
              {% render 'image', class: 'cart-page__item-image', image: item.image, url: item.url, width: 200, height: 200, crop: 'center' %}
            {% endif %}

            <div class="cart-page__item-details">
              <a href="{{ item.url }}" class="cart-page__item-title">{{ item.product.title }}</a>
              {% if item.variant.title != 'Default Title' %}
                <p class="cart-page__item-variant">{{ item.variant.title }}</p>
              {% endif %}
              <p class="cart-page__item-price">{{ item.final_price | money }}</p>
            </div>

            <div class="cart-page__item-quantity">
              <label for="CartPageQuantity-{{ forloop.index }}" class="visually-hidden">{{ 'cart.quantity' | t }}</label>
              <input
                type="number"
                name="updates[]"
                id="CartPageQuantity-{{ forloop.index }}"
                class="cart-page__item-quantity-input"
                value="{{ item.quantity }}"
                min="0"
                inputmode="numeric"
              >
            </div>

            <p class="cart-page__item-line-total">{{ item.final_line_price | money }}</p>

            <a href="{{ item.url_to_remove }}" class="cart-page__item-remove">{{ 'cart.remove' | t }}</a>
          </li>
        {% endfor %}
      </ul>

      <div class="cart-page__note-field">
        <label for="CartPageNote">{{ 'cart.note' | t }}</label>
        <textarea name="note" id="CartPageNote" class="cart-page__note">{{ cart.note }}</textarea>
      </div>

      <div class="cart-page__totals">
        <div class="cart-page__subtotal">
          <span>{{ 'cart.subtotal' | t }}</span>
          <span>{{ cart.total_price | money }}</span>
        </div>
        {% if cart.taxes_included %}
          <p class="cart-page__tax-note">{{ 'cart.taxes_included' | t }}</p>
        {% endif %}
      </div>

      <div class="cart-page__actions">
        <button type="submit" name="update" class="cart-page__update">{{ 'cart.update' | t }}</button>
        <button type="submit" name="checkout" class="cart-page__checkout">{{ 'cart.checkout' | t }}</button>
      </div>
    </form>
  {% else %}
    <div class="cart-page__empty">
      <p>{{ 'cart.empty' | t }}</p>
      <a href="{{ routes.all_products_collection_url }}" class="cart-page__continue-shopping">{{ 'cart.continue_shopping' | t }}</a>
    </div>
  {% endif %}
</div>

{% stylesheet %}
  .cart-page {
    padding-block: var(--space-8);
    padding-inline: var(--space-4);
    max-width: 60rem;
    margin-inline: auto;
  }
  @media (min-width: 750px) {
    .cart-page {
      padding-inline: var(--space-6);
    }
  }
  .cart-page__title {
    font-family: var(--font-header--family);
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    margin: 0 0 var(--space-6);
  }
  .cart-page__items {
    list-style: none;
    margin: 0 0 var(--space-6);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .cart-page__item {
    display: grid;
    grid-template-columns: 5rem 1fr auto auto;
    gap: var(--space-3);
    align-items: start;
    padding-block: var(--space-3);
    border-bottom: 1px solid var(--color-foreground-muted);
  }
  .cart-page__item-image {
    width: 5rem;
  }
  .cart-page__item-title {
    color: var(--color-foreground);
    text-decoration: none;
    font-weight: 600;
  }
  .cart-page__item-variant,
  .cart-page__item-price {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
    margin: var(--space-1) 0 0;
  }
  .cart-page__item-quantity-input {
    width: 4rem;
    min-height: 24px;
    border: 1px solid var(--color-foreground-muted);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    padding: var(--space-2);
    text-align: center;
  }
  .cart-page__item-line-total {
    font-weight: 700;
    margin: 0;
  }
  .cart-page__item-remove {
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
    min-height: 24px;
    display: inline-flex;
    align-items: center;
  }
  .cart-page__note-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-6);
  }
  .cart-page__note {
    resize: vertical;
    min-height: 4rem;
    border: 1px solid var(--color-foreground-muted);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    padding: var(--space-2);
    font: inherit;
  }
  .cart-page__totals {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }
  .cart-page__subtotal {
    display: flex;
    gap: var(--space-4);
    font-size: 1.25rem;
    font-weight: 700;
  }
  .cart-page__tax-note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-foreground-muted);
  }
  .cart-page__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  @media (min-width: 480px) {
    .cart-page__actions {
      flex-direction: row-reverse;
      justify-content: flex-start;
    }
  }
  .cart-page__update,
  .cart-page__checkout {
    min-height: 24px;
    padding: var(--space-3) var(--space-5);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    border: none;
  }
  .cart-page__checkout {
    background-color: var(--color-foreground);
    color: var(--color-background);
  }
  .cart-page__update {
    background-color: var(--color-background);
    color: var(--color-foreground);
    border: 1px solid var(--color-foreground);
  }
  .cart-page__empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .cart-page__continue-shopping {
    color: var(--color-accent);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.cart",
  "settings": []
}
{% endschema %}
```

Two things to check, not assume:

1. `name="updates[]"` with each input positioned at the correct array index relies on ALL cart line inputs being submitted together in DOM order matching `cart.items`' order — confirm this is genuinely how Shopify's `/cart` endpoint interprets a bare `updates[]` array (index-positional, matching line order) versus needing an explicit `updates[{{ item.key }}]` keyed format instead. Verify against real Shopify documentation before trusting the positional-array assumption, since a wrong format here would silently update the wrong line or fail outright.
2. Two submit buttons in one form (`name="update"` and `name="checkout"`) — confirm which one Shopify's cart form actually expects to trigger checkout vs. just save quantity updates (the skeleton baseline's original code used `name="checkout"` alone for the checkout button, matching Shopify's documented convention — confirm your `update` button doesn't need special handling beyond just being a second submit button in the same form, and that clicking "Update cart" doesn't accidentally ALSO trigger checkout).

- [ ] **Step 2: Add the storefront locale keys**

Check `locales/en.default.json`'s existing `cart` object first (already has several keys from the drawer plan) — add only what's genuinely missing: `"quantity": "Quantity"` (if not already present under a different key you can reuse instead — check `product.quantity` isn't more appropriate to reuse, though cart and product quantity labels serving different forms are usually kept separate; use your judgment and document which you chose).

- [ ] **Step 3: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 4: Verify in the browser at BOTH breakpoints, with a real populated cart AND a genuinely empty one**

```bash
shopify theme dev
```

(Re-attempt if the session isn't already running from prior work.)

1. Add 2-3 real products to the cart (via the product page's add-to-cart, already shipped and working), then visit `/cart` directly. Confirm every line item shows correct image/title/variant/price/line-total.
2. Change a quantity input and click "Update cart" — confirm the page reloads with the updated quantity and recalculated totals (full page navigation, no AJAX — that's correct for this page).
3. Set a quantity to 0 and update — confirm the line is removed.
4. Click a "Remove" link directly — confirm the line is removed via `url_to_remove` without needing the Update button.
5. Enter cart notes, update, reload the page — confirm the note persisted (`cart.note` round-trips correctly).
6. Click "Checkout" — confirm it navigates toward Shopify's real checkout (don't complete a real purchase; confirming the navigation target is correct is sufficient).
7. Empty the cart completely and revisit `/cart` — confirm the empty-state message and continue-shopping link render correctly, not a broken/blank page.
8. Both breakpoints.
9. Check the browser console for errors.

- [ ] **Step 5: Commit**

```bash
git add sections/cart.liquid locales/en.default.json locales/en.default.schema.json
git commit -m "feat: rebuild cart page with real line items, quantities, and totals"
```

---

## Task 2: Discount display, unit pricing, selling plans, accelerated checkout

**Files:**
- Modify: `sections/cart.liquid`
- Modify: `locales/en.default.json`

**Interfaces:**
- Consumes: Task 1's line-item and totals structure.
- Produces: nothing else in this plan depends on Task 2.

Before starting, re-read `sections/cart.liquid`'s actual current state (post-Task-1) rather than assuming the plan's literal text above is still exactly what's there.

**Three genuine open questions flagged for the implementer, not assumed correct**: `cart.cart_level_discount_applications`, `item.line_level_discount_allocations`, and `item.selling_plan_allocation`'s exact property shapes were never confirmed at plan-writing time and have never been used anywhere in this project before. Verify each against real Shopify Liquid documentation (the `shopify-liquid` skill's search tool, or a live WebFetch of shopify.dev, has been used successfully for exactly this kind of verification in every recent plan) before writing this code — the draft below is a reasonable starting structure, not a guaranteed-correct final answer.

- [ ] **Step 1: Add cart-level and line-level discount display**

Inside the `<form>`, add cart-level discount display near the totals (verify `cart.cart_level_discount_applications`'s exact iteration shape and property names before finalizing — this draft assumes each entry has `.title` and `.total_allocated_amount`):

```liquid
{% if cart.cart_level_discount_applications.size > 0 %}
  <ul class="cart-page__discounts">
    {% for discount in cart.cart_level_discount_applications %}
      <li class="cart-page__discount">
        <span>{{ discount.title }}</span>
        <span>-{{ discount.total_allocated_amount | money }}</span>
      </li>
    {% endfor %}
  </ul>
{% endif %}
```

Add line-level discount display inside each line item (verify `item.line_level_discount_allocations`'s exact shape too — this draft assumes each allocation has `.discount_application.title` and `.amount`):

```liquid
{% if item.line_level_discount_allocations.size > 0 %}
  <ul class="cart-page__item-discounts">
    {% for allocation in item.line_level_discount_allocations %}
      <li>{{ allocation.discount_application.title }}: -{{ allocation.amount | money }}</li>
    {% endfor %}
  </ul>
{% endif %}
```

- [ ] **Step 2: Add unit pricing per line item**

Follows the exact same pattern already established on the product and collection pages — reuse it, don't invent a new one:

```liquid
{% if item.unit_price_measurement %}
  <p class="cart-page__item-unit-price">
    {{ item.unit_price | money }}/{{ item.unit_price_measurement.reference_value }}{{ item.unit_price_measurement.reference_unit }}
  </p>
{% endif %}
```

- [ ] **Step 3: Add selling plan display**

Verify `item.selling_plan_allocation`'s exact shape before finalizing (this draft assumes it's nilable, with `.selling_plan.name` and `.per_delivery_price`):

```liquid
{% if item.selling_plan_allocation %}
  <p class="cart-page__item-selling-plan">{{ item.selling_plan_allocation.selling_plan.name }}</p>
{% endif %}
```

Since this dev store's real product catalog almost certainly has no selling plans configured (confirm this rather than assuming), this code path may be unexercisable against real data in this environment — if so, document that clearly as a known verification gap (same category as other untestable-in-this-environment features earlier in this project), don't skip writing the correct code just because it can't be exercised live here.

- [ ] **Step 4: Add accelerated checkout**

Reuse the exact same mechanism already shipped in `sections/cart-drawer.liquid` — do not invent a different approach:

```liquid
{{ content_for_additional_checkout_buttons }}
```

Place it directly after the checkout button in the `.cart-page__actions` block.

- [ ] **Step 5: Add the storefront locale keys**

Check `locales/en.default.json`'s `cart` object for what's missing — likely nothing new needed if `cart.subtotal`/etc. already cover the totals area, but selling-plan/discount labels may need new keys if the draft above needs any beyond what's rendered directly from Shopify objects (the discount/selling-plan text above renders Shopify-provided strings directly, not custom copy, so this may need zero new keys — verify and only add what's genuinely necessary).

- [ ] **Step 6: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 7: Verify in the browser — discounts and unit pricing with real data, selling plans documented as untestable if no real data exists**

```bash
shopify theme dev
```

1. Apply a real discount code to a cart (via checkout, then return to cart, or via an admin-created automatic discount) and confirm it displays correctly at both cart-level and line-level as applicable.
2. If any product in this dev store has unit pricing configured (check the product/collection pages' earlier verification work for which products had `unit_price_measurement`), add it to cart and confirm the unit price displays correctly on the cart page too.
3. Confirm the accelerated checkout button renders (same native Shopify component already proven on the product page).
4. Both breakpoints.
5. Check the browser console for errors.

- [ ] **Step 8: Commit**

```bash
git add sections/cart.liquid locales/en.default.json
git commit -m "feat: add discount display, unit pricing, selling plans, and accelerated checkout to cart page"
```

---

## Self-Review Notes

- **Spec coverage**: §5.3's line items/total/checkout/notes/selling-plans/accelerated-checkout are all covered across the two tasks. §6's cross-cutting "Discount display on cart" and "Unit pricing — cart" requirements are covered in Task 2 — these were explicitly deferred from the earlier cart-drawer plan and are picked up here for the first time in this project.
- **No AJAX is a deliberate architectural choice for this specific page, not a scope gap**: the cart page's entire purpose is to be the non-JS-dependent fallback the drawer isn't. Don't let a future plan "improve" this page by adding AJAX — that would defeat its purpose.
- **Three genuinely-unconfirmed-at-plan-writing-time API shapes carried into Task 2 rather than silently assumed correct**: `cart.cart_level_discount_applications`, `item.line_level_discount_allocations`, and `item.selling_plan_allocation` have never been used anywhere in this project before this plan — all three explicitly flagged for real documentation verification.
- **Selling plans may be genuinely untestable in this dev store** (no subscription products configured) — Task 2 explicitly requires documenting this as a known gap rather than silently skipping verification, matching this project's established practice for other untestable-in-this-environment features (unit pricing on the product/collection pages, gift-card products, etc.).

## Outstanding: Two Minor Follow-Ups from the Final Whole-Plan Review

Both tasks passed their own review clean; the final whole-plan review (with real live browser access) found 4 Important cross-surface issues, all fixed and re-verified in one fix round. Two small, non-blocking items came out of that fix round's own re-review and are recorded here rather than silently dropped:

- **Screen-reader label asymmetry on line-level discount display**: `sections/cart.liquid`'s per-unit price block labels both the struck-through original AND the net price ("Regular price" / "Sale price"), but the line-total block only labels the struck-through original, leaving the net line-total unlabeled for assistive tech. Cheap follow-up: add the matching `product.sale_price` visually-hidden label to the line-total's net-price span, mirroring the per-unit block exactly.
- **The cart drawer still lacks line-level (product-scoped) discount display**: the final review's Important #3 fix brought the drawer's *cart-level* discount display to parity with the page, but a product-scoped discount would still render differently between the two surfaces (page shows the discount + struck-through original price; drawer shows only a bare net price). This is the same class of inconsistency Important #3 existed to eliminate, just for the line-level case instead of the cart-level one — worth a small follow-up plan/task rather than being silently left as a known gap.
