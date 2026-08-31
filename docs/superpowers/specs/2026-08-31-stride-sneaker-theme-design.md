# STRIDE — Shopify Theme Store–ready sneaker-brand theme

Status: approved for planning (revised after Theme Store requirement scoping)
Date: 2026-08-31
Base: Shopify `skeleton-theme` (this repo, as of this date — bare layout/header/footer, no design system, no homepage sections beyond a placeholder)

## 0. Target: Shopify Theme Store submission

This theme is being built to be **submitted to the Shopify Theme Store**, not just used on one merchant's store. That changes the bar significantly from a typical custom build — every requirement in Shopify's official checklist (verified against [shopify.dev/docs/storefronts/themes/store/requirements](https://shopify.dev/docs/storefronts/themes/store/requirements) on 2026-08-31) is in scope, not just "nice to have." Key implications baked into every section below:

- **Codebase**: only `skeleton-theme` is an approved starting point for submission (themes derived from Dawn/Horizon are ineligible) — confirmed we're already on the right base.
- **Uniqueness**: Shopify requires "architectural-level differentiation," not reproducible via settings tweaks alone — the non-standard homepage sections (§4) satisfy this by design, not as decoration.
- **Every required template/page must be fully functional** (§5), not left on skeleton defaults.
- **A large mandatory feature list** (§6) must be present regardless of whether this specific "sneaker brand" niche would naturally want it.
- **Fonts**: Shopify's font library only, via `font_picker` — no custom/Google Fonts uploads.
- **No fake urgency**: countdown/scarcity UI must reflect real merchant data, never simulated deadlines.
- **What this project cannot cover**: a Shopify Partner account, real product photography, Bogus Gateway store configuration, hosted support/contact documentation, trademark clearance for the "STRIDE" name, and Shopify's actual review process are business/legal steps outside this codebase — called out explicitly in §12 so nothing here implies they're handled.

Content language: English (locale files, demo copy). Country/language selector *components* are built (per §6) so the theme is ready if a merchant enables multi-currency/multi-language, but only English locale files ship by default.

## 1. Purpose & reference

Build a full, original Shopify theme for a sneaker brand (placeholder brand name **STRIDE**), inspired by the visual language of Taiga's "Meadow" preset (themes.shopify.com) — minimalist fashion e-commerce aesthetic, serif wordmark, light neutral background, editorial photography, slide-out cart — but **not a clone**: Meadow is a $500 commercial theme and its code/design are not to be reproduced. Built from scratch on the `skeleton-theme` scaffold, using its documented conventions (`{% stylesheet %}` / `{% javascript %}` tags, CSS variables for single-property settings, CSS classes for multi-property settings, no build step).

## 2. Design system

### 2.1 Color tokens

Defined as CSS custom properties in `snippets/css-variables.liquid`, driven by `settings_schema.json` color pickers (`type: color`) so merchants can adjust in the theme editor. Minimum 4 colors required by the Theme Store checklist — we exceed that — and every background gets a paired foreground color.

| Token | Default | Usage |
|---|---|---|
| `--color-background` | `#F7F5F1` (warm off-white) | page background |
| `--color-background-alt` | `#EFEBE4` | section alternation, cards |
| `--color-foreground` | `#141311` (near-black) | body text |
| `--color-foreground-muted` | `#6B665D` | secondary text, captions |
| `--color-accent` | `#A84A29` (clay/terracotta) | primary CTA, links, active states |
| `--color-on-accent` | `#FFFFFF` | text/icons on accent-filled surfaces |
| `--color-accent-secondary` | `#7C8471` (sage) | "new"/"eco" badges, secondary accents |
| `--color-urgency` | `#B23A1F` | Sale price, low-stock badges, real countdown |
| `--color-border` | `#DDD8CE` | dividers, input borders |
| `--color-surface` | `#FFFFFF` | cards, drawers, popovers |

All pairs must pass WCAG contrast per §7: 4.5:1 for body text, 3:1 for large text (≥18pt/24px) and non-text UI elements (icons, focus outlines). Verify `--color-foreground` on `--color-background`/`--color-surface`, `--color-on-accent` on `--color-accent`/`--color-urgency`.

**Sage color usage constraint**: Never use `--color-accent-secondary` as the text color of small body-sized copy; use it as a badge/chip background or icon/border color, with `--color-foreground` as the actual text color on top of it.

**Background-surface audit note**: the contrast audit also covers `--color-background-alt` (the darkest of the three background surfaces these tokens can sit under as text) — `--color-accent` and `--color-urgency` were darkened from their original values specifically so both still pass 4.5:1 against `--color-background-alt`, not just `--color-background`/`--color-surface`.

### 2.2 Typography

Two `font_picker` settings in `settings_schema.json`, **restricted to fonts in Shopify's current font library** (no custom uploads, no Google Fonts `<link>` tags — this is a hard Theme Store rule):

- `type_header_font` — a serif display face from Shopify's library, used for the wordmark, hero headlines, section titles. Exact family confirmed against the live `font_picker` list at implementation time (candidates: `"fraunces_n4"` or nearest available serif; `"playfair_display_n4"` shipped as the default since `"forum_n4"` was not present in the live font library at implementation time).
- `type_primary_font` — a sans-serif grotesque from Shopify's library (shipped default: `"work_sans_n4"`), used for body copy, nav, buttons, form inputs.

Rendered via `{{ settings.type_header_font | font_face: font_display: 'swap' }}` in `theme.liquid`; bold/italic/bold-italic variants loaded through `font_modify` per the checklist. Exposed as `--font-header--family` (plus `--font-header--style` / `--font-header--weight`) and `--font-body--family` (plus `--font-body--style` / `--font-body--weight`) custom properties. A modular type scale (CSS `clamp()`) covers display, h1–h4, body, small/caption, button label — headings h1–h6 are visually distinct from one another (size/weight/spacing), per §7.

### 2.3 Spacing & layout

Standard spacing scale as CSS variables (`--space-1` … `--space-8`, 4px base). Container max-width `--page-width: 1440px` with responsive gutters. Section vertical rhythm controlled per-section via `padding-top`/`padding-bottom` range settings (existing skeleton pattern, reused).

## 3. Global layout

### 3.1 Announcement bar

New `sections/announcement-bar.liquid`, rendered inside the header section group. Repeater block (text + optional link), auto-rotates, pauses on hover/focus, respects `prefers-reduced-motion`.

### 3.2 Header (`sections/header.liquid`)

- Sticky on scroll, condenses padding after a scroll threshold (IntersectionObserver, no scroll-jank).
- Logo: text wordmark using `--font-header--family` by default, image-logo override supporting multiple aspect ratios (checklist requirement).
- Primary nav from `main-menu` linklist with **multi-level dropdown** support (`<details>`-based disclosure, keyboard accessible) — multi-level nav is a mandatory feature (§6), not just one level as originally scoped.
- **Account component** in the header, desktop and mobile (mandatory feature) — login/account link that reflects logged-in state.
- Search entry point opening a **predictive search** panel (mandatory feature — live results as you type, via Shopify's predictive search API).
- **Country/language selectors**: rendered conditionally (`localization.available_countries.size > 1` / `available_languages.size > 1`) so they appear automatically if the merchant enables multi-currency/multi-language — required "when enabled" per the checklist.
- Cart icon with live item-count bubble, updated via cart AJAX (no full reload).

### 3.3 Cart drawer (`snippets/cart-drawer.liquid`, driven by cart AJAX API)

- Slide-out overlay with focus-trap/`inert`, triggered by the header cart icon and every "add to cart" action.
- Line items: `title`, `unit_price` (unit pricing is mandatory — §6), `image`, `final_price`, `quantity`, `options_with_values`; qty stepper; remove.
- `cart.total_price` visible; tax-inclusive indicator when `cart.taxes_included`; support for cart notes, selling plans, and automatic discount codes (all mandatory, §6).
- Free-shipping progress bar (settings-driven threshold); complementary-product block (`product_recommendations?intent=complementary`).
- **Accelerated checkout buttons** (Shop Pay etc.) enabled by default alongside the standard checkout button (mandatory, on by default per checklist).
- Add/update/remove via `/cart/change.js` + `/cart/add.js` (fetch), re-rendering via the Section Rendering API (`?sections=cart-drawer`) — no full reload.
- Empty-cart state with a clear message and a link back to shopping.

### 3.4 Footer (`sections/footer.liquid`)

Column blocks (linklists), social icon block (icon set to choose from, Open Graph/Twitter meta handled separately in `<head>`), newsletter signup block (§4.7), payment method logos (`enabled_payment_types` + full-color `payment_type_svg_tag`), copyright.

## 4. Homepage sections

Each ships as its own section file under `sections/`, added to `templates/index.json`. Every homepage (and other section-supporting template) also gets a **Custom Liquid section** (raw `liquid` setting type) available in the section picker, and **app blocks** (`type: "@app"`) enabled in the main product and featured-product sections — both are hard Theme Store requirements (§6), independent of the custom sections below.

### 4.1 `sections/hero-colorway.liquid` — Hero with colorway switcher

Settings: heading, subheading, CTA; **block** type `colorway` (image + swatch color + optional product link), 2–5 allowed. Clicking a swatch swaps the hero image (CSS crossfade), updates `aria-pressed` on swatch buttons; first block active by default; all images preloaded so switching is instant. Swatches are real `<button>`s with `aria-label="View in {{ color }}"` — state isn't color-only.

### 4.2 `sections/marquee.liquid` — Scrolling ticker

Settings: text/link items (blocks), speed. Pure CSS `@keyframes` loop, duplicated content for seamless wrap; disabled under `prefers-reduced-motion: reduce`, falling back to a static row.

### 4.3 `sections/collection-index.liquid` — Editorial index list (homepage teaser)

Settings: collection picker, heading, item limit. Desktop: numbered list rows (`01`, `02`, …) with hover-reveal large product image; mobile: standard responsive grid (same markup, CSS-driven layout switch). This is a **teaser/entry point** on the homepage — the full `/collections/[handle]` page (§5.2) carries the actual required filtering/sorting/pagination.

### 4.4 `sections/product-anatomy.liquid` — Horizontal spec/craft section

Settings: product image, heading; **blocks**: numbered callout (label, text, x/y position). Scroll-snap on mobile; absolutely-positioned numbered pins over one image on desktop, tied to a legend list — pins work with plain CSS, no JS required for the base experience.

### 4.5 `sections/drop-countdown.liquid` — Countdown section

Settings: target date/time, heading, description, CTA. **Must be wired to a real, merchant-controlled date** (e.g. an actual scheduled product-availability date/metafield) — never a fake or resettable "ends soon" timer; this is a direct Theme Store legal requirement (§7), not just a UX nicety. Vanilla JS `setInterval` tick computing `days:hours:min:sec`; degrades to a server-rendered static message if the date has passed or JS fails to load. Large full-bleed type treatment.

### 4.6 `sections/shoppable-lookbook.liquid` — Tagged lookbook grid

Settings: heading; **blocks**: image + product-tag hotspots (x%, y% + product picker). Asymmetric CSS grid; hotspots are `<button>`s opening a popover (image/title/price/"View product") — CSS `:hover`/`:focus` with a JS click-toggle fallback for touch.

### 4.7 `sections/newsletter-band.liquid` — Signup band

Settings: heading, subtext, success message; uses Shopify's native `{% form 'customer' %}` newsletter form — no custom backend.

## 5. Required templates & pages

Every template below ships as JSON (except `gift_card.liquid`, which stays Liquid), supports sections (except checkout/customer-account/gift-card, per Shopify's own exception list), and is fully functional — none are left as skeleton placeholders.

### 5.1 Product (`templates/product.json` / `sections/product.liquid`)

- Displays untruncated `product.title`, `variant.price`, `variant.unit_price`, variant compare-at price, `product.description`, all option names/values; all product images viewable without breaking layout; variant images shown when a matching variant is selected.
- Buying: variants as separate selectable options, quantity selector, add-to-cart button disabled for unavailable variants, first available variant loads by default, live callback updates price/compare-at/sold-out messaging without a page reload.
- Mandatory features: product recommendations (`sections/product-recommendations.liquid`, related **and** complementary), rich media (3D models, embedded YouTube/Vimeo), accelerated checkout (on by default), pickup availability display, Shop Pay Installments banner.
- Main product section supports **blocks** for individual elements (price, vendor, description, etc.) and an **`@app`** block slot, modeled on Dawn's main-product section structure (reference only — not copied).
- Extras from the original design kept: gallery zoom, color-swatch variant picker, size-chart modal (`snippets/size-chart-modal.liquid`), sticky buy-box.
- Gift card products: recipient option (`form.email`, `form.name`, `form.message`), swatch support (`swatch.image`/`swatch.color`).

### 5.2 Collection (`templates/collection.json` / `sections/collection.liquid`)

- Displays untruncated `collection.title`, `collection.description`, `collection.image`; products in a grid handling varying image aspect ratios; per product: `product.title`, `product.price`, `product.images`, `variant.unit_price`, at least one media piece.
- **Faceted filtering** (color/size/price via `collection.filters`) and sorting; sale badge + `product.compare_at_price_max`; empty-collection message; pagination or lazy loading.

### 5.3 Cart (`templates/cart.json`) — full page fallback

Even with the drawer as primary UX (§3.3), the `/cart` page template itself must independently satisfy every cart requirement in §6/§3.3 (line items, total, checkout button, notes, selling plans, accelerated checkout) — the drawer doesn't replace it, both exist.

### 5.4 Blog (`templates/blog.json`) & Article (`templates/article.json`)

- Blog: `blog.title`, article items with untruncated linked `article.title`, `article.image`, `article.excerpt_or_content`; pagination/lazy loading.
- Article: untruncated `article.title`, `article.published_at` (not `created_at`), paginated comments, a working comment submit flow (success/error messaging) without requiring moderation to function.

### 5.5 Search (`templates/search.json`)

Returns and labels mixed result types (`object_type`: products, blogs, pages) distinctly; no-results message; pagination/lazy loading. Search box uses predictive search (shared component with header, §3.2).

### 5.6 404 (`templates/404.json`)

Clear "page not found" message, search bar, homepage link.

### 5.7 Gift card (`templates/gift_card.liquid`)

Apple Wallet button, gift card code display, QR code (≥120×120px), logo or `shop.name`.

### 5.8 Password (`templates/password.json`)

Logo or `shop.name`, `shop.password_message`, password entry form.

### 5.9 Contact page (`templates/page.contact.json`)

Alternate page template (distinct from the generic `page.json`) with a working contact form.

### 5.10 Collection list (`templates/list-collections.json`)

Untruncated `collection.title`, `collection.featured_image` (falls back to first product's featured image), pagination/lazy loading.

### 5.11 Generic page (`templates/page.json`)

Displays `page.title` and `page.content`, with rich-text (RTE) styling for h1–h6/blockquotes/lists consistent with the rest of the theme.

## 6. Mandatory feature checklist (cross-cutting)

These are required regardless of niche fit; each maps to a concrete implementation location above:

- Sections Everywhere / Online Store 2.0 (all templates in §5) — ✅ by construction.
- Discount display on cart, checkout, order templates.
- Accelerated checkout buttons on product and cart, enabled by default.
- Faceted search filtering (collection §5.2, search §5.5).
- Gift card rendering (§5.7).
- Image focal point support (all `image_picker`/media settings use Shopify's native focal-point cropping).
- Social sharing image (`page_image` object) + Open Graph/Twitter card tags in `<head>`.
- Country selector (when multi-currency enabled) / language selector (when multi-language enabled) — header, §3.2.
- Multi-level dropdown menus — header nav, §3.2.
- Newsletter signup — §4.7 and footer.
- Pickup availability — product page, §5.1.
- Related **and** complementary product recommendations — product page and cart drawer.
- Rich product media (3D, video) — product page, §5.1.
- Predictive search — header + search page.
- Selling plans on cart page.
- Shop Pay Installments banner — product page.
- Unit pricing — collection, product, cart.
- Variant images — product page.
- Follow on Shop button (unmodified branded styling).
- Account component in header, desktop and mobile.

## 7. Non-functional requirements

- **No build step / no framework** — vanilla JS/CSS, matching skeleton-theme conventions; interactive sections degrade gracefully without JS where feasible.
- **No Sass**; native CSS only (`.css`/`.css.liquid`); no pre-minified `.css`/`.js` (Shopify auto-minifies); any third-party script must be self-hosted on Shopify's servers or be an approved library, and must not interfere with native Shopify features or admin.
- **Accessibility** (Lighthouse a11y ≥90 desktop+mobile on product/collection/home): keyboard access to every interactive part including dropdown nav; visible focus states; `alt` on every image via `image.alt`/`image_tag`; form inputs with unique `id` + matching `for` labels; valid HTML; contrast 4.5:1 body / 3:1 large text & non-text UI; keyboard focus order matches DOM order; touch targets ≥24×24 CSS px; `prefers-reduced-motion` respected; headings h1–h6 visually distinct.
- **Performance** (Lighthouse performance ≥60 desktop+mobile on product/collection/home): `critical.css` limited to true above-the-fold rules; section CSS/JS scoped via `{% stylesheet %}`/`{% javascript %}`; responsive images (`srcset`/`sizes`), native lazy-loading except the hero; sections tested with real images/content, never empty.
- **SEO**: meta title/description/canonical snippet, Google rich product snippets (JSON-LD), no `robots.txt.liquid` included.
- **URLs/protocol**: protocol-relative or HTTPS-only URLs, no hard-coded `http://`; links to Shopify domains use `rel="nofollow"`.
- **No misleading UX**: no fake timers/scarcity/false urgency (§4.5 constraint), no app-dependent functionality baked into core features, no wishlists/scheduling/API-dependent features that assume an app is installed.
- **Browser/device support**: Safari (latest 2, Mac), Chrome (latest 3, Mac/PC/Android/iOS), Firefox (latest 3, Mac/PC), Edge (latest 2, PC), Mobile Safari (latest 2, iOS), Samsung Internet (latest 2, Android), and Instagram/Facebook/Pinterest webviews (latest, Android/iOS). Fully responsive at all breakpoints.
- **Theme-check**: must pass the repo's `.theme-check.yml` with no new errors.

## 8. Settings, terminology & content rules

- Every setting has a `label`; `link_list` settings in header/footer default to `main-menu`/`footer`; default resource-based settings reference real, existing resources; metaobject settings use only standard (non-custom, non-app-owned) definitions.
- `theme_info` section present in `settings_schema.json`; favicon setting mandatory; logo upload supports multiple aspect ratios.
- No Lorem Ipsum anywhere in default setting values or demo content — write real-sounding sneaker-brand copy instead.
- Text style: sentence case for section/preset names; descriptive (non-numbered) setting names in plain merchant language (e.g. "Horizontal position," not "X position"); American English spelling; no ampersands; active voice, verb-led button labels; Shopify's approved terminology exactly (e.g. "homepage," "slideshow" not "slider," "checkout," "social media icons" not "social media buttons").
- `<html lang="{{ request.locale.iso_code }}">`; `routes` object used for all dynamic URLs; `content_for_header` left unmodified/unparsed; social placeholder text left empty (not filled with dummy handles).

## 9. Naming & presets

"STRIDE" is a **working placeholder**: 1–2 words, under 30 characters, satisfies the format rule — but Shopify also requires it be distinct from existing Theme Store listings, Shopify products/branding, and any third-party trademarks. That check is outside this codebase's scope; flagged in §12 as a pre-submission task. Single-preset theme for v1 (matches "one preset must match the parent theme name"), so no `/listings` folder is needed unless a second preset is added later.

## 10. Demo store content policy

Applies to the demo store used for the actual Theme Store submission (not fully buildable inside this repo, since it requires a live store — see §12), but the **theme's default/demo section content** we author here must already comply: authentic-sounding sneaker product/brand copy (no Lorem Ipsum, no placeholder onboarding text), no embedded text/buttons baked into images, no misleading claims. `powered_by_link` left unaltered if present; no affiliate links; Shopify-domain links carry `rel="nofollow"`.

## 11. Testing / validation approach

No automated test framework exists for Liquid themes here beyond `theme-check`. Validation plan:

- `shopify theme check` after each phase — schema errors, deprecated tags, its built-in a11y lint rules.
- Manual `shopify theme dev` + browser pass per phase: theme-editor round-trip for every new section (settings panel, block add/remove/reorder), full shopping flow (browse → PDP → add to cart → drawer → checkout handoff).
- Responsive check at mobile/tablet/desktop for every new section.
- Keyboard-only pass over header nav, cart drawer, variant picker, filters, lookbook hotspots, every form.
- Lighthouse runs (product/collection/home, mobile+desktop) against the performance (≥60) and accessibility (≥90) thresholds before considering a phase done; treat a miss as a bug to fix, not a note to defer.
- Manual contrast-ratio spot check on every color-token pairing in §2.1 whenever a token's default changes.

## 12. Explicitly out of this codebase's scope

These are real prerequisites for an actual Theme Store submission that no amount of code in this repo satisfies — called out so nothing here is mistaken for "done":

- Shopify Partner account / theme submission itself, and Shopify's review process (can take weeks, possibly multiple rounds).
- Trademark clearance for the "STRIDE" name (and final naming decision).
- Real product photography and a populated demo store (this repo can ship realistic *copy*, but not real photos of real shoes).
- Live demo store configuration: Bogus Gateway / Shopify Payments test mode, disabling other checkout methods, populating a full realistic catalog.
- Hosted theme documentation page and public support contact form (content can be drafted here; hosting/publishing is a separate step).
- Ongoing merchant support commitment (2-business-day reply SLA, timely bug fixes) — an operational commitment, not a build artifact.
- Actual translated locale files beyond English, if the merchant wants true multi-language content (the *code* for language switching is built either way, per §3.2/§6).

## 13. Implementation phases (for the plan)

Given the expanded scope, this is now a large build. Phased so each phase ends in a working, checkable state:

1. **Compliance scaffolding**: every required template file present as JSON/Liquid per §5 (even if a phase's content is still basic Dawn-reference-level rather than final), `theme_info`, favicon setting, base meta/SEO snippet, `<html lang>`, base a11y scaffolding.
2. **Design tokens**: color/type/spacing settings, `css-variables.liquid`, font loading (§2).
3. **Global layout**: announcement bar, header (sticky, multi-level nav, account component, predictive search entry, country/language selectors, cart icon), cart drawer, footer (§3).
4. **Homepage sections** 4.1–4.7, wired into `templates/index.json` with realistic demo content, plus the Custom Liquid section and `@app` block slots (§4).
5. **Product page** full feature set (§5.1, §6 product-related items).
6. **Collection page** full feature set (§5.2, §6 collection-related items) — including the editorial-index/full-grid split from the original design.
7. **Cart page** full-page fallback parity with the drawer (§5.3).
8. **Blog, article, search** (§5.4, §5.5).
9. **404, gift card, password, contact page, collection list, generic page** (§5.6–§5.11).
10. **Accessibility & performance pass**: Lighthouse runs, contrast audit, keyboard audit, touch-target audit against §7/§11 thresholds — fix, don't defer.
11. **Theme-check + full manual QA pass** across browsers/devices in §7, end-to-end shopping flow, settings/terminology copy pass against §8.
12. **Submission-readiness docs**: draft theme documentation + support contact form content, release notes, version number — content only, per the §12 boundary.
