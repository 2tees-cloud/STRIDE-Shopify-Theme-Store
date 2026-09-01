# STRIDE Theme Global Layout — Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish spec §3 (Global layout) by upgrading the footer from a single hardcoded link row into a merchant-configurable, blocks-based footer (link-list columns + newsletter signup block), and add theme-wide social media icon settings — the last piece of the global layout before moving on to homepage sections.

**Architecture:** Same conventions as the two previous plans — Liquid + native CSS, tokens via `var(--token)` only, no build step. Footer columns and the newsletter form become standalone **theme blocks** (files in `/blocks/`, the pattern this repo already uses for `blocks/text.liquid` and `blocks/group.liquid`), referenced from `footer.liquid`'s schema via `"blocks": [{ "type": "@theme" }]` — the same mechanism `sections/custom-section.liquid` already uses — rather than inline block-type definitions in the footer section's own schema. Social links are theme-wide settings (not per-block), consumed by a new shared snippet so any future section can render the same icon row.

**Tech Stack:** Shopify Liquid, native CSS. No new JS in this plan (the newsletter form is a native `{% form 'customer' %}` POST, no fetch/AJAX needed).

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) §3.4 (Footer) and the "Social media requirements" item from §0/§8 (a set of icons to choose from). Newsletter signup copy itself deliberately mirrors spec §4.7's intent (a minimal, native-form signup) without pulling in the homepage-specific `sections/newsletter-band.liquid` — that remains a separate, later task under spec §13 phase 4 (homepage sections).

## Global Constraints

(Carried over; every task below implicitly inherits these — and explicitly folds in the lessons the last plan's final review surfaced, so they aren't repeated as fresh findings here.)

- No Sass; native CSS only; no pre-minified `.css`/`.js`.
- Color contrast: 4.5:1 body text, 3:1 large text/non-text UI. **In particular: never use `--color-accent-secondary` (sage) as small body-text color** (measured 3.57–3.89:1 in the previous plan's final review, a real WCAG failure) — this token may only be a background/icon/border color with `--color-foreground` as the actual text color on top.
- Touch targets ≥24×24 CSS px on every interactive element (icons, buttons, form controls) — apply `min-width`/`min-height: 24px` and `flex-shrink: 0` on icon-only links proactively, not as an afterthought.
- `prefers-reduced-motion` respected wherever animation/transition is added.
- Any section-root element that should span the full viewport width needs the theme's `full-width` utility class (`.shopify-section > .full-width { grid-column: 1 / -1; }` in `assets/critical.css`) — check this explicitly for any new full-width element.
- Form inputs need a unique `id` with a `<label for="...">` that matches it — no `aria-label`-only shortcuts where a visible label is reasonable (matches `sections/page-contact.liquid`'s existing pattern).
- No Lorem Ipsum in default values; every setting has a `label`; American English, sentence case, Shopify's approved terminology.
- `theme-check` must pass with zero new errors after every task.
- Follow existing codebase conventions: 2-space JSON indent, the JSON-template/section-group "auto-generated" comment-header convention, the `{% doc %}...{% enddoc %}` comment style already used in `blocks/text.liquid`/`blocks/group.liquid` for new theme block files.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `blocks/footer-link-list.liquid` | create | One footer column: optional heading + a merchant-chosen linklist |
| `blocks/newsletter-signup.liquid` | create | Newsletter signup form block (native `{% form 'customer' %}`) |
| `sections/footer.liquid` | modify (full-file replace) | Renders footer blocks + copyright + social icons + payment icons |
| `sections/footer-group.json` | modify | Drops the old section-level `menu` setting (superseded by blocks) |
| `snippets/social-icons.liquid` | create | Renders configured social links as an icon list; reusable by any future section |
| `assets/icon-instagram.svg` | create | Social icon |
| `assets/icon-x.svg` | create | Social icon |
| `assets/icon-tiktok.svg` | create | Social icon |
| `config/settings_schema.json` | modify | New "Social media" settings group (3 URL fields) |
| `locales/en.default.schema.json` | modify | New `t:` keys for the new blocks, section, and settings |
| `locales/en.default.json` | modify | New `newsletter` namespace for storefront-facing form copy |

No files are deleted.

---

## Task 1: Footer blocks — link-list columns and newsletter signup

**Files:**
- Create: `blocks/footer-link-list.liquid`
- Create: `blocks/newsletter-signup.liquid`
- Modify: `sections/footer.liquid` (full-file replace)
- Modify: `sections/footer-group.json` (full-file replace — it's 26 lines)
- Modify: `locales/en.default.schema.json` (`general` and `labels` objects)
- Modify: `locales/en.default.json` (new `newsletter` namespace)

**Interfaces:**
- Consumes: `--font-header--family`, `--color-foreground`, `--color-foreground-muted`, `--color-border`, `--color-surface`, `--color-background`, `--space-1`–`--space-6` (all existing tokens — verified present in `snippets/css-variables.liquid` immediately before writing this plan).
- Produces: the `footer-link-list` and `newsletter-signup` block type names — Task 2 doesn't depend on them, but any future plan adding more footer block types should follow the same `{% doc %}`/`{% schema %}` shape these two establish.

- [ ] **Step 1: Create the link-list block**

Create `blocks/footer-link-list.liquid`:

```liquid
{% doc %}
  Renders one footer column: an optional heading and a linklist.

  @example
  {% content_for 'block', type: 'footer-link-list', id: 'footer-link-list' %}
{% enddoc %}

<div class="footer-link-list" {{ block.shopify_attributes }}>
  {% if block.settings.heading != blank %}
    <h3 class="footer-link-list__heading">{{ block.settings.heading }}</h3>
  {% endif %}

  <ul class="footer-link-list__links">
    {% for link in block.settings.menu.links %}
      <li>{{ link.title | link_to: link.url }}</li>
    {% endfor %}
  </ul>
</div>

{% stylesheet %}
  .footer-link-list__heading {
    font-family: var(--font-header--family);
    font-size: 1rem;
    margin: 0 0 var(--space-2);
  }
  .footer-link-list__links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .footer-link-list__links a {
    color: var(--color-foreground-muted);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.footer_link_list",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading"
    },
    {
      "type": "link_list",
      "id": "menu",
      "label": "t:labels.menu"
    }
  ],
  "presets": [{ "name": "t:general.footer_link_list" }]
}
{% endschema %}
```

- [ ] **Step 2: Create the newsletter block**

Create `blocks/newsletter-signup.liquid`:

```liquid
{% doc %}
  Renders a newsletter signup form using Shopify's native customer form.

  @example
  {% content_for 'block', type: 'newsletter-signup', id: 'newsletter-signup' %}
{% enddoc %}

<div class="newsletter-signup" {{ block.shopify_attributes }}>
  {% if block.settings.heading != blank %}
    <h3 class="newsletter-signup__heading">{{ block.settings.heading }}</h3>
  {% endif %}

  {% if block.settings.subtext != blank %}
    <p class="newsletter-signup__subtext">{{ block.settings.subtext }}</p>
  {% endif %}

  {% form 'customer', class: 'newsletter-signup__form' %}
    <input type="hidden" name="contact[tags]" value="newsletter">

    {% if form.posted_successfully? %}
      <p class="newsletter-signup__success">{{ 'newsletter.success' | t }}</p>
    {% else %}
      <div class="newsletter-signup__field">
        <label for="NewsletterEmail-{{ block.id }}">{{ 'newsletter.email' | t }}</label>
        <input
          type="email"
          name="contact[email]"
          id="NewsletterEmail-{{ block.id }}"
          autocomplete="email"
          required
        >
        <button type="submit">{{ 'newsletter.submit' | t }}</button>
      </div>
    {% endif %}
  {% endform %}
</div>

{% stylesheet %}
  .newsletter-signup__heading {
    font-family: var(--font-header--family);
    font-size: 1rem;
    margin: 0 0 var(--space-1);
  }
  .newsletter-signup__subtext {
    color: var(--color-foreground-muted);
    margin: 0 0 var(--space-2);
  }
  .newsletter-signup__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    align-items: flex-start;
  }
  .newsletter-signup__field input {
    width: 100%;
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-foreground);
    padding: var(--space-2);
  }
  .newsletter-signup__field button {
    border: 1px solid var(--color-foreground);
    background-color: var(--color-foreground);
    color: var(--color-background);
    padding: var(--space-2) var(--space-4);
    cursor: pointer;
    min-height: 24px;
  }
  .newsletter-signup__success {
    color: var(--color-foreground);
    font-weight: 700;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.newsletter",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "t:labels.heading",
      "default": "Subscribe to our emails"
    },
    {
      "type": "text",
      "id": "subtext",
      "label": "t:labels.subtext"
    }
  ],
  "presets": [{ "name": "t:general.newsletter" }]
}
{% endschema %}
```

Note `.newsletter-signup__success` uses `--color-foreground`, not `--color-accent-secondary` — deliberately, per this plan's Global Constraints (the sage-as-small-text mistake from the previous plan's final review must not be repeated here).

- [ ] **Step 3: Replace the footer section**

Replace the entire contents of `sections/footer.liquid` with:

```liquid
<footer>
  <div class="footer__content">
    {% content_for 'blocks' %}
  </div>

  <div class="footer__bottom">
    <div class="footer__copyright">
      &copy;
      {{ 'now' | date: '%Y' }}
      {{ shop.name | link_to: routes.root_url }}, {{ powered_by_link }}
    </div>

    {% if section.settings.show_payment_icons %}
      <div class="footer__payment">
        {% for type in shop.enabled_payment_types %}
          {{ type | payment_type_svg_tag }}
        {% endfor %}
      </div>
    {% endif %}
  </div>
</footer>

{% stylesheet %}
  footer {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin-top: var(--space-8);
    padding-block: var(--space-6);
    border-top: 1px solid var(--color-border);
  }
  footer a {
    text-decoration: none;
    color: var(--color-foreground);
  }
  .footer__content {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }
  .footer__content > * {
    flex: 1;
    min-width: 10rem;
  }
  .footer__bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    color: var(--color-foreground-muted);
    font-size: 0.875rem;
  }
  .footer__payment {
    display: flex;
    gap: var(--space-2);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.footer",
  "blocks": [{ "type": "@theme" }],
  "settings": [
    {
      "type": "checkbox",
      "id": "show_payment_icons",
      "label": "t:labels.show_payment_icons",
      "default": true
    }
  ]
}
{% endschema %}
```

Note what changed from the original: the section-level `menu` link_list setting is gone (superseded by `footer-link-list` blocks, which support multiple columns instead of one flat row); `show_payment_icons` is unchanged; the payment-icons markup and logic are unchanged, just re-nested under `.footer__bottom`. Social icons are added in Task 2, not here.

- [ ] **Step 4: Update the footer section group**

Replace the entire contents of `sections/footer-group.json` with:

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
  "type": "footer",
  "name": "t:general.footer",
  "sections": {
    "footer": {
      "type": "footer",
      "settings": {
        "show_payment_icons": true
      }
    }
  },
  "order": [
    "footer"
  ]
}
```

(The old `"menu": ""` key is removed since `footer.liquid`'s schema no longer defines that setting — leaving a stale key referencing a nonexistent setting would be exactly the kind of drift `theme-check` should catch; removing it here keeps the instance data honest. This ships with zero footer blocks configured out of the box — a merchant adds link-list/newsletter blocks via the theme editor. Shipping realistic default blocks is deliberately deferred to the demo-content-authoring phase, spec §13 phase 12, matching how the previous plan's empty-by-default announcement bar was handled.)

- [ ] **Step 5: Add the new locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "footer_link_list": "Link list",
    "newsletter": "Newsletter signup",
```

Add to the `labels` object:

```json
    "heading": "Heading",
    "subtext": "Subtext",
```

In `locales/en.default.json`, add a new top-level `newsletter` key (insert alphabetically, after `gift_card` and before `labels`):

```json
  "newsletter": {
    "email": "Email",
    "submit": "Subscribe",
    "success": "Thanks for subscribing!"
  },
```

- [ ] **Step 6: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 7: Verify in the browser**

```bash
shopify theme dev
```

In the theme editor (or local preview if admin is blocked): add a `footer-link-list` block to the footer with a heading and a linklist, confirm it renders as a column with working links. Add a `newsletter-signup` block, confirm the email field has a visible label correctly associated via `id`/`for`, and that submitting (a real submission, if feasible) shows the success message instead of the form. Confirm the payment-icons row and copyright still render correctly at the bottom. Check the browser console for errors.

- [ ] **Step 8: Commit**

```bash
git add blocks/footer-link-list.liquid blocks/newsletter-signup.liquid sections/footer.liquid sections/footer-group.json locales/en.default.schema.json locales/en.default.json
git commit -m "feat: rebuild footer with link-list and newsletter blocks"
```

---

## Task 2: Social media icon settings

**Files:**
- Modify: `config/settings_schema.json` (new settings group)
- Create: `assets/icon-instagram.svg`
- Create: `assets/icon-x.svg`
- Create: `assets/icon-tiktok.svg`
- Create: `snippets/social-icons.liquid`
- Modify: `sections/footer.liquid` (render the snippet)
- Modify: `locales/en.default.schema.json` (`general` and `labels` objects)

**Interfaces:**
- Produces: `settings.social_instagram_link`, `settings.social_x_link`, `settings.social_tiktok_link` — global theme settings any future section can read; and `snippets/social-icons.liquid` as a reusable, parameter-free render (`{% render 'social-icons' %}`) any future section can call.
- Consumes: nothing new from Task 1 — this task is independently testable even if Task 1 hadn't run (it only adds one `{% render %}` call to the bottom of the footer markup).

- [ ] **Step 1: Add the social media settings group**

In `config/settings_schema.json`, add a new top-level settings group at the end of the array (after the `t:general.colors` group, i.e. right before the final closing `]`):

```json
  ,
  {
    "name": "t:general.social_media",
    "settings": [
      {
        "type": "url",
        "id": "social_instagram_link",
        "label": "t:labels.instagram"
      },
      {
        "type": "url",
        "id": "social_x_link",
        "label": "t:labels.x"
      },
      {
        "type": "url",
        "id": "social_tiktok_link",
        "label": "t:labels.tiktok"
      }
    ]
  }
```

(Each is optional — no `default` — so nothing renders until a merchant fills one in.)

- [ ] **Step 2: Create the three icon assets**

Create `assets/icon-instagram.svg` (rounded-square camera outline with a lens circle and a flash dot — matches this theme's existing stroke-icon style):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="currentColor" stroke-width="var(--icon-stroke-width)" />
  <circle cx="10" cy="10" r="3.75" stroke="currentColor" stroke-width="var(--icon-stroke-width)" />
  <circle cx="14.375" cy="5.625" r="0.625" fill="currentColor" />
</svg>
```

Create `assets/icon-x.svg` (two crossing lines):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="var(--icon-stroke-width)"
    d="M4 4l12 12M16 4L4 16" />
</svg>
```

Create `assets/icon-tiktok.svg` (simplified musical-note glyph):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="var(--icon-stroke-width)"
    d="M12.5 3v9.5a3 3 0 1 1-3-3" />
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="var(--icon-stroke-width)"
    d="M12.5 3c.3 2 1.8 3.5 3.75 3.75" />
</svg>
```

After creating all three, view each live (via the browser tool against the running dev preview, or by opening the raw SVG) and confirm each one actually reads as a recognizable glyph for its platform. **These path coordinates were authored without live visual feedback — if any icon looks wrong, malformed, or unrecognizable once rendered, adjust the path/shape coordinates yourself until it reads correctly; don't ship a broken-looking icon just because the plan specified exact numbers.** Keep the same attribute conventions (viewBox, `stroke="currentColor"`, `var(--icon-stroke-width)`, rounded caps/joins) regardless of what shape adjustments you make.

- [ ] **Step 3: Create the social icons snippet**

Create `snippets/social-icons.liquid`:

```liquid
{% comment %}
  Renders configured social media icon links, reading URLs from theme
  settings. Only platforms with a URL configured are rendered. Callable
  from any section: {% render 'social-icons' %}
{% endcomment %}

<ul class="social-icons">
  {% if settings.social_instagram_link != blank %}
    <li>
      <a href="{{ settings.social_instagram_link }}" aria-label="Instagram">
        {{ 'icon-instagram.svg' | inline_asset_content }}
      </a>
    </li>
  {% endif %}
  {% if settings.social_x_link != blank %}
    <li>
      <a href="{{ settings.social_x_link }}" aria-label="X">
        {{ 'icon-x.svg' | inline_asset_content }}
      </a>
    </li>
  {% endif %}
  {% if settings.social_tiktok_link != blank %}
    <li>
      <a href="{{ settings.social_tiktok_link }}" aria-label="TikTok">
        {{ 'icon-tiktok.svg' | inline_asset_content }}
      </a>
    </li>
  {% endif %}
</ul>

{% stylesheet %}
  .social-icons {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: var(--space-3);
  }
  .social-icons svg {
    width: 1.25rem;
    flex-shrink: 0;
  }
  .social-icons a {
    display: flex;
    min-width: 24px;
    min-height: 24px;
    align-items: center;
    justify-content: center;
    color: var(--color-foreground);
  }
{% endstylesheet %}
```

If nothing is configured, `<ul class="social-icons"></ul>` renders empty — harmless, but note this for later: a future plan may want to wrap the `{% render 'social-icons' %}` call itself in an `{% if %}` check at the call site if an empty `<ul>` in the DOM ever becomes a problem (it isn't one today — no visible box, no assistive-tech announcement for an empty list).

- [ ] **Step 4: Render the icons in the footer**

In `sections/footer.liquid`, add the social icons render call inside `.footer__bottom`, before the payment icons:

```liquid
    {% if section.settings.show_payment_icons %}
```

becomes:

```liquid
    {% render 'social-icons' %}

    {% if section.settings.show_payment_icons %}
```

- [ ] **Step 5: Add the new locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "social_media": "Social media",
```

Add to the `labels` object:

```json
    "instagram": "Instagram",
    "x": "X",
    "tiktok": "TikTok",
```

- [ ] **Step 6: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 7: Verify in the browser**

```bash
shopify theme dev
```

In theme settings (or local preview), fill in one or more social URLs and confirm the corresponding icon(s) appear in the footer, link to the right URL, and are visibly ≥24×24px. Confirm that with all three fields empty, the footer shows no broken/empty icon row artifacts. Screenshot each icon and visually confirm it's recognizable (per Step 2's instruction) — fix and re-verify if not.

- [ ] **Step 8: Commit**

```bash
git add config/settings_schema.json assets/icon-instagram.svg assets/icon-x.svg assets/icon-tiktok.svg snippets/social-icons.liquid sections/footer.liquid locales/en.default.schema.json
git commit -m "feat: add social media icon settings and footer icons"
```

---

## Self-Review Notes

- **Spec coverage**: §3.4 (column blocks/linklists, social icon block, newsletter signup block, payment icons, copyright) → Tasks 1 and 2 together cover all five explicitly. The "social icon block" language in spec §3.4 is implemented as a theme-wide setting + reusable snippet rather than a per-block-instance icon picker — a deliberate simplification (most themes treat social links as one global set, not something merchants configure per-section-instance) that still satisfies the underlying Theme Store requirement ("a set of social media icons to select from").
- **Type/name consistency checked**: `footer-link-list` and `newsletter-signup` block type names (from their filenames) match what `sections/footer.liquid`'s `{% content_for 'blocks' %}` + `"blocks": [{ "type": "@theme" }]` schema expects — no block type is referenced anywhere that isn't a real file in `/blocks/`. `settings.social_*_link` names in Task 2 Step 1 match exactly what Step 3's snippet reads. No task in this plan references a design token that wasn't confirmed present in the live `snippets/css-variables.liquid` before this plan was written.
- **No placeholders**: every step has literal code and a concrete, checkable expected result — including an explicit instruction (Task 2 Step 2) to fix the one place in this plan where visual correctness genuinely can't be guaranteed from text alone (hand-authored SVG icon shapes), rather than silently asserting they'll look right.
