# STRIDE Theme Foundation (Design Tokens + Compliance Scaffolding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish version control, the theme's color/typography/spacing design-token system, and the first piece of Theme-Store-required scaffolding (favicon setting, `theme_info`, and the `page.contact` template) on top of the existing `skeleton-theme` codebase.

**Architecture:** Extend the skeleton's existing patterns rather than replace them — merchant-facing tokens live in `config/settings_schema.json` as `color`/`font_picker`/`range` settings, are consumed in `snippets/css-variables.liquid` and exposed as CSS custom properties (`--color-*`, `--font-*`, `--space-*`), and every other file (sections, `critical.css`) reads only the CSS variables, never `settings.*` directly. This keeps the token layer the single source of truth, matching the skeleton's documented convention (see `README.md`).

**Tech Stack:** Shopify Liquid, native CSS (custom properties, no Sass), no build step — verified with Shopify CLI (`shopify theme check`, `shopify theme dev`). No JavaScript in this plan.

**Spec:** [docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md](../specs/2026-08-31-stride-sneaker-theme-design.md) — implements spec §2 (Design system) and the design-token/scaffolding slice of spec §0/§5.9/§8/§9 (Theme Store compliance framing, contact page, settings/terminology rules, naming). Later plans cover the spec's remaining phases (§13, phases 3–12: global layout, homepage sections, product/collection/cart pages, remaining required templates, a11y/perf pass, submission docs) — **not** in scope here.

## Global Constraints

(Copied verbatim from the spec; every task below implicitly inherits these.)

- Codebase must stay a `skeleton-theme` derivative — never introduce Dawn/Horizon code or patterns.
- No Sass; native CSS only (`.css`/`.css.liquid`); no pre-minified `.css`/`.js`.
- Fonts: Shopify's current font library only, via `font_picker` — no custom uploads, no Google Fonts `<link>` tags.
- No fake timers/scarcity/false urgency in any UI copy or behavior.
- Color contrast: 4.5:1 for body text; 3:1 for large text (≥18pt/24px, or ≥14pt/18.66px bold) and non-text UI elements.
- Touch targets ≥24×24 CSS px.
- No Lorem Ipsum in any default setting value or demo/placeholder content — write real-sounding sneaker-brand copy.
- American English spelling; Shopify's approved terminology; sentence case for section/preset names; descriptive (non-numbered) setting names in merchant-friendly language; active voice, verb-led buttons; no ampersands.
- Every setting has a `label`.
- `theme-check` (`.theme-check.yml`, `extends: theme-check:recommended`) must pass with zero new errors after every task.
- `<html lang="{{ request.locale.iso_code }}">` (already present in `layout/theme.liquid:2` — do not remove).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `config/settings_schema.json` | modify | Merchant-facing settings: `theme_info`, favicon, typography (header/body fonts), colors (10 tokens) |
| `locales/en.default.schema.json` | modify | `t:` label/name strings referenced by the schema settings above |
| `locales/en.default.json` | modify | Storefront-facing copy for the new contact form |
| `snippets/css-variables.liquid` | modify | Renders every design token as a CSS custom property in `:root` |
| `layout/theme.liquid` | modify | Adds the favicon `<link>` tag |
| `assets/critical.css` | modify | Renames `var(--font-primary--family)` → `var(--font-body--family)` to match the renamed token |
| `sections/page-contact.liquid` | create | Renders `page.contact` template: page content + Shopify's native contact form |
| `templates/page.contact.json` | create | Wires the `page-contact` section in as the alternate "Contact" page template |
| `docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md` | modify | Sync the audited color defaults from Task 4 back into the spec's §2.1 table |

No files are deleted. No JavaScript is introduced in this plan.

---

## Task 0: Initialize version control

**Files:**
- Create: `.git/` (via `git init`)

**Interfaces:**
- Produces: a git history that every later task's "Commit" step appends to.

- [ ] **Step 1: Initialize the repository**

```bash
git init
git status
```

Expected: `Initialized empty Git repository in C:/skeleton-theme-main/.git/`, followed by a status listing all existing skeleton-theme files as untracked.

- [ ] **Step 2: Commit the existing skeleton-theme baseline**

```bash
git add -A
git commit -m "chore: initial commit of skeleton-theme baseline"
```

- [ ] **Step 3: Verify**

```bash
git log --oneline
```

Expected: one commit, the baseline commit from Step 2.

---

## Task 1: Color design tokens

**Files:**
- Modify: `config/settings_schema.json:56-82` (the `t:general.colors` settings group)
- Modify: `locales/en.default.schema.json:36-52` (`labels` object)
- Modify: `snippets/css-variables.liquid:8-17` (the `:root` block)

**Interfaces:**
- Produces: CSS custom properties `--color-background`, `--color-background-alt`, `--color-foreground`, `--color-foreground-muted`, `--color-surface`, `--color-border`, `--color-accent`, `--color-on-accent`, `--color-accent-secondary`, `--color-urgency`. All later tasks/plans style against these names, never against a raw hex value or `settings.*_color` directly.
- Consumes: nothing new (extends the existing `settings.background_color`/`foreground_color` pattern already read by `snippets/css-variables.liquid`).

- [ ] **Step 1: Replace the colors settings group**

In `config/settings_schema.json`, replace the existing `t:general.colors` group (lines 56-82) with:

```json
  {
    "name": "t:general.colors",
    "settings": [
      {
        "type": "color",
        "id": "background_color",
        "default": "#F7F5F1",
        "label": "t:labels.background"
      },
      {
        "type": "color",
        "id": "background_alt_color",
        "default": "#EFEBE4",
        "label": "t:labels.background_alt"
      },
      {
        "type": "color",
        "id": "foreground_color",
        "default": "#141311",
        "label": "t:labels.foreground"
      },
      {
        "type": "color",
        "id": "foreground_muted_color",
        "default": "#6B665D",
        "label": "t:labels.foreground_muted"
      },
      {
        "type": "color",
        "id": "surface_color",
        "default": "#FFFFFF",
        "label": "t:labels.surface"
      },
      {
        "type": "color",
        "id": "border_color",
        "default": "#DDD8CE",
        "label": "t:labels.border"
      },
      {
        "type": "color",
        "id": "accent_color",
        "default": "#B5502D",
        "label": "t:labels.accent"
      },
      {
        "type": "color",
        "id": "on_accent_color",
        "default": "#FFFFFF",
        "label": "t:labels.on_accent"
      },
      {
        "type": "color",
        "id": "accent_secondary_color",
        "default": "#7C8471",
        "label": "t:labels.accent_secondary"
      },
      {
        "type": "color",
        "id": "urgency_color",
        "default": "#E8462E",
        "label": "t:labels.urgency"
      },
      {
        "type": "range",
        "id": "input_corner_radius",
        "min": 0,
        "max": 10,
        "step": 1,
        "unit": "px",
        "label": "t:labels.input_corner_radius",
        "default": 4
      }
    ]
  }
```

(The `urgency_color` default of `#E8462E` is deliberately revisited in Task 4 once contrast is measured — leave it as-is here.)

- [ ] **Step 2: Add the new labels**

In `locales/en.default.schema.json`, in the `labels` object (starts line 36), add these entries (keep existing `background`/`foreground` keys as-is):

```json
    "background_alt": "Background (alternate)",
    "foreground_muted": "Foreground (muted)",
    "surface": "Surface",
    "border": "Border",
    "accent": "Accent",
    "on_accent": "Text on accent",
    "accent_secondary": "Accent (secondary)",
    "urgency": "Urgency / sale",
```

- [ ] **Step 3: Run theme-check to confirm no schema errors**

```bash
shopify theme check
```

Expected: passes with the same result as the Task 0 baseline (0 offenses) — the new settings are all well-formed (`type`, `id`, `label`, `default` all present).

- [ ] **Step 4: Expose the tokens as CSS custom properties**

In `snippets/css-variables.liquid`, inside the `:root { ... }` block (lines 8-17), replace:

```liquid
    --color-background: {{ settings.background_color }};
    --color-foreground: {{ settings.foreground_color }};
```

with:

```liquid
    --color-background: {{ settings.background_color }};
    --color-background-alt: {{ settings.background_alt_color }};
    --color-foreground: {{ settings.foreground_color }};
    --color-foreground-muted: {{ settings.foreground_muted_color }};
    --color-surface: {{ settings.surface_color }};
    --color-border: {{ settings.border_color }};
    --color-accent: {{ settings.accent_color }};
    --color-on-accent: {{ settings.on_accent_color }};
    --color-accent-secondary: {{ settings.accent_secondary_color }};
    --color-urgency: {{ settings.urgency_color }};
```

- [ ] **Step 5: Verify in the browser**

```bash
shopify theme dev
```

Open the preview URL it prints, open browser DevTools, and run in the console:

```js
getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()
```

Expected: `"#B5502D"`. Repeat for `--color-background` (expect `"#F7F5F1"`) to confirm the new defaults are live, not just the old white/dark-gray pair.

- [ ] **Step 6: Commit**

```bash
git add config/settings_schema.json locales/en.default.schema.json snippets/css-variables.liquid
git commit -m "feat: add STRIDE color design tokens"
```

---

## Task 2: Typography design tokens

**Files:**
- Modify: `config/settings_schema.json:10-24` (the `t:general.typography` settings group)
- Modify: `locales/en.default.schema.json:2-35` (`general` object)
- Modify: `snippets/css-variables.liquid` (font loading + `:root` block)
- Modify: `assets/critical.css:76` (font-family variable reference)

**Interfaces:**
- Produces: CSS custom properties `--font-header--family`/`--font-header--style`/`--font-header--weight` (new) and `--font-body--family`/`--font-body--style`/`--font-body--weight` (renamed from `--font-primary--*`). Settings ids `type_header_font` (new) and `type_primary_font` (existing, relabeled).
- Consumes: Task 1's color tokens are not needed here — this task is independent of Task 1 and could be reordered, but Task 4's contrast audit needs Task 1 done first, so the numbering here is kept sequential for a single reviewer to follow linearly.

- [ ] **Step 1: Replace the typography settings group**

In `config/settings_schema.json`, replace the `t:general.typography` group (lines 10-24) with:

```json
  {
    "name": "t:general.typography",
    "settings": [
      {
        "type": "header",
        "content": "t:general.fonts"
      },
      {
        "type": "font_picker",
        "id": "type_header_font",
        "default": "forum_n4",
        "label": "t:general.header_font"
      },
      {
        "type": "font_picker",
        "id": "type_primary_font",
        "default": "work_sans_n4",
        "label": "t:general.body_font"
      }
    ]
  }
```

- [ ] **Step 2: Update the `general` locale keys**

In `locales/en.default.schema.json`, in the `general` object (starts line 2): remove the `"primary": "Primary"` entry, and add:

```json
    "header_font": "Heading font",
    "body_font": "Body font",
```

- [ ] **Step 3: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses — in particular no `MissingTranslation` or `UnusedTranslation` offense (the `primary` key was removed in the same step it became unused).

- [ ] **Step 4: Add header-font loading and rename the body-font variables**

In `snippets/css-variables.liquid`, replace the whole file with:

```liquid
{% style %}
  {% # Loads all font variations with display: swap %}
  {{ settings.type_header_font | font_face: font_display: 'swap' }}
  {{ settings.type_header_font | font_modify: 'weight', 'bold' | font_face: font_display: 'swap' }}
  {{ settings.type_header_font | font_modify: 'weight', 'bold' | font_modify: 'style', 'italic' | font_face: font_display: 'swap' }}
  {{ settings.type_header_font | font_modify: 'style', 'italic' | font_face: font_display: 'swap' }}

  {{ settings.type_primary_font | font_face: font_display: 'swap' }}
  {{ settings.type_primary_font | font_modify: 'weight', 'bold' | font_face: font_display: 'swap' }}
  {{ settings.type_primary_font | font_modify: 'weight', 'bold' | font_modify: 'style', 'italic' | font_face: font_display: 'swap' }}
  {{ settings.type_primary_font | font_modify: 'style', 'italic' | font_face: font_display: 'swap' }}

  :root {
    --font-header--family: {{ settings.type_header_font.family }}, {{ settings.type_header_font.fallback_families }};
    --font-header--style: {{ settings.type_header_font.style }};
    --font-header--weight: {{ settings.type_header_font.weight }};
    --font-body--family: {{ settings.type_primary_font.family }}, {{ settings.type_primary_font.fallback_families }};
    --font-body--style: {{ settings.type_primary_font.style }};
    --font-body--weight: {{ settings.type_primary_font.weight }};
    --page-width: {{ settings.max_page_width }};
    --page-margin: {{ settings.min_page_margin }}px;
    --color-background: {{ settings.background_color }};
    --color-background-alt: {{ settings.background_alt_color }};
    --color-foreground: {{ settings.foreground_color }};
    --color-foreground-muted: {{ settings.foreground_muted_color }};
    --color-surface: {{ settings.surface_color }};
    --color-border: {{ settings.border_color }};
    --color-accent: {{ settings.accent_color }};
    --color-on-accent: {{ settings.on_accent_color }};
    --color-accent-secondary: {{ settings.accent_secondary_color }};
    --color-urgency: {{ settings.urgency_color }};
    --style-border-radius-inputs: {{ settings.input_corner_radius }}px;
  }
{% endstyle %}
```

- [ ] **Step 5: Rename the variable reference in critical.css**

In `assets/critical.css:76`, change:

```css
  font-family: var(--font-primary--family);
```

to:

```css
  font-family: var(--font-body--family);
```

- [ ] **Step 6: Run theme-check again**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 7: Verify in the browser**

With `shopify theme dev` still running, in DevTools console:

```js
getComputedStyle(document.documentElement).getPropertyValue('--font-header--family').trim()
getComputedStyle(document.documentElement).getPropertyValue('--font-body--family').trim()
```

Expected: the header one includes `Forum` (or whatever family `forum_n4` resolves to), the body one includes `Work Sans`. Also visually confirm body text still renders normally (not falling back to browser-default serif) — this catches a broken rename immediately.

If `forum_n4` is no longer present in Shopify's live font library (font libraries change over time), the theme editor's font picker will show an error state for that field — if so, pick the closest available serif directly in the theme editor and update the `default` in `config/settings_schema.json` to match before continuing.

- [ ] **Step 8: Commit**

```bash
git add config/settings_schema.json locales/en.default.schema.json snippets/css-variables.liquid assets/critical.css
git commit -m "feat: add header/body typography design tokens"
```

---

## Task 3: Spacing design tokens

**Files:**
- Modify: `snippets/css-variables.liquid` (the `:root` block)

**Interfaces:**
- Produces: CSS custom properties `--space-1` through `--space-8` (4px base scale). `--page-width` already exists (from `settings.max_page_width`, default `90rem` = 1440px, matching the spec's intended default) — confirmed unchanged, not reintroduced.

- [ ] **Step 1: Add the spacing scale**

In `snippets/css-variables.liquid`, inside the `:root { ... }` block, add (anywhere inside the block — placing it after `--page-margin` keeps layout-related tokens grouped):

```liquid
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-7: 3rem;
    --space-8: 4rem;
```

- [ ] **Step 2: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses (this step only adds static CSS custom properties — no schema/setting changes are possible to get wrong here, but running it keeps the verification cycle consistent).

- [ ] **Step 3: Verify in the browser**

DevTools console:

```js
getComputedStyle(document.documentElement).getPropertyValue('--space-4').trim()
```

Expected: `"1rem"`.

- [ ] **Step 4: Commit**

```bash
git add snippets/css-variables.liquid
git commit -m "feat: add spacing design tokens"
```

---

## Task 4: Color contrast audit and fix

**Files:**
- Modify: `config/settings_schema.json` (the `urgency_color` default set in Task 1)
- Modify: `docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md` (§2.1 color table)

**Interfaces:**
- Consumes: `--color-*` tokens from Task 1.
- Produces: an audited `urgency_color` default (`#CC3E23` instead of `#E8462E`) and two documented usage constraints that every later plan (homepage sections, product/collection pages) must follow when it renders sale badges or secondary-accent badges.

This task has no code-generation ambiguity — the contrast ratios below are computed via the WCAG relative-luminance formula (`L = 0.2126R + 0.7152G + 0.0722B` on linearized sRGB channels; contrast = `(L_lighter + 0.05) / (L_darker + 0.05)`), not estimated.

- [ ] **Step 1: Verify the already-passing pairs (no change needed)**

Confirm these by computing or by using a contrast-checker tool with the exact hex values — both must be true before continuing:

- `--color-foreground` `#141311` on `--color-background` `#F7F5F1`: **17.05:1** (body text — passes 4.5:1 with large margin).
- `--color-on-accent` `#FFFFFF` on `--color-accent` `#B5502D`: **5.06:1** (button label text — passes 4.5:1).
- `--color-accent` `#B5502D` on `--color-background` `#F7F5F1` (used for links/accent text directly on the page background): **4.65:1** (passes 4.5:1, but with little headroom — flag: if `accent_color`'s default is ever changed, this pair must be re-measured).

- [ ] **Step 2: Confirm the failing pair and fix it**

`--color-urgency` `#E8462E` on white (`--color-surface`/`--color-background`): **3.93:1** — passes the 3:1 non-text/large-text threshold but fails 4.5:1 for small body-sized text (e.g. an inline "Sale" label). Since later plans will use this token for sale-price text at various sizes, fix it at the token level rather than requiring every future call site to remember a size rule:

In `config/settings_schema.json`, in the `t:general.colors` group added in Task 1, change:

```json
        "id": "urgency_color",
        "default": "#E8462E",
```

to:

```json
        "id": "urgency_color",
        "default": "#CC3E23",
```

`#CC3E23` on white measures **4.91:1** — passes 4.5:1 for text of any size, while staying visually in the same red/terracotta family as the original.

- [ ] **Step 3: Document the one pairing that stays size-restricted**

`--color-accent-secondary` `#7C8471` (sage): **3.89:1** against both white and off-white background — passes 3:1 (icons, borders, large/bold badge text ≥14pt bold or ≥18pt regular) but not 4.5:1 for small text. Record this as a standing rule (not a code change) for every later task that uses it: **never set `--color-accent-secondary` as the text color of small body-sized copy; use it as a badge/chip background or icon/border color, with `--color-foreground` as the actual text color on top of it.**

- [ ] **Step 4: Sync the spec**

In `docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md`, update the §2.1 color table row for `--color-urgency`: change the default from `#E8462E` to `#CC3E23`, and add a one-line note under the table recording the sage size-restriction rule from Step 3 (so a future plan reading only the spec still sees the constraint).

- [ ] **Step 5: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 6: Verify in the browser**

DevTools console:

```js
getComputedStyle(document.documentElement).getPropertyValue('--color-urgency').trim()
```

Expected: `"#CC3E23"`.

- [ ] **Step 7: Commit**

```bash
git add config/settings_schema.json docs/superpowers/specs/2026-08-31-stride-sneaker-theme-design.md
git commit -m "fix: darken urgency color token to meet 4.5:1 text contrast"
```

---

## Task 5: Compliance scaffolding — theme_info, favicon, contact page

**Files:**
- Modify: `config/settings_schema.json:1-9` (`theme_info`) and a new settings group for the favicon
- Modify: `locales/en.default.schema.json` (`general`/`labels` objects)
- Modify: `locales/en.default.json` (new `contact` namespace)
- Modify: `layout/theme.liquid` (favicon `<link>` tag)
- Create: `sections/page-contact.liquid`
- Create: `templates/page.contact.json`

**Interfaces:**
- Consumes: `--space-1`, `--space-4` (Task 3), `--color-accent-secondary`, `--color-urgency` (Tasks 1/4) in the new section's stylesheet.
- Produces: the `page.contact` template, satisfying spec §5.9. Nothing later in this plan depends on this task, but future homepage/header work should follow the same "component's own `{% stylesheet %}` block only references `--color-*`/`--space-*`/`--font-*` tokens, never raw hex/px" convention this task follows.

- [ ] **Step 1: Update theme_info**

In `config/settings_schema.json`, in the `theme_info` object (lines 1-9), change:

```json
    "theme_name": "Skeleton",
    "theme_version": "0.1.0",
    "theme_author": "Shopify",
```

to:

```json
    "theme_name": "STRIDE",
    "theme_version": "0.1.0",
    "theme_author": "STRIDE",
```

Leave `theme_documentation_url` and `theme_support_url` as their current real Shopify help-center URLs for now — replacing them with STRIDE's own documentation/support URLs is a submission-readiness task (spec §13 phase 12), not part of this plan, since those pages don't exist yet.

- [ ] **Step 2: Add the favicon setting**

In `config/settings_schema.json`, add a new settings group directly after the `theme_info` object (before the `t:general.typography` group):

```json
  {
    "name": "t:general.favicon",
    "settings": [
      {
        "type": "image_picker",
        "id": "favicon",
        "label": "t:labels.favicon"
      }
    ]
  },
```

- [ ] **Step 3: Add the new locale keys**

In `locales/en.default.schema.json`, add to the `general` object:

```json
    "favicon": "Favicon",
    "contact": "Contact form",
```

and to the `labels` object:

```json
    "favicon": "Favicon image",
```

In `locales/en.default.json`, add a new top-level `contact` key (alongside the existing `404`, `blog`, `cart`, etc. — insert it alphabetically, after `cart` and before `customers`):

```json
  "contact": {
    "form": {
      "name": "Name",
      "email": "Email",
      "message": "Message",
      "submit": "Send message",
      "success": "Thanks for reaching out. We'll get back to you soon."
    }
  },
```

- [ ] **Step 4: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses.

- [ ] **Step 5: Render the favicon in the layout**

In `layout/theme.liquid`, after the `{% render 'meta-tags' %}` line (line 24), add:

```liquid
    {% if settings.favicon %}
      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
    {% endif %}
```

- [ ] **Step 6: Create the contact section**

Create `sections/page-contact.liquid`:

```liquid
{% comment %}
  This section is used in the page.contact template to render a store's
  contact page, combining page content with Shopify's native contact form.

  https://shopify.dev/docs/storefronts/themes/architecture/templates/page
{% endcomment %}

<h1>{{ page.title }}</h1>

{{ page.content }}

{% form 'contact', class: 'contact-form' %}
  {% if form.posted_successfully? %}
    <p class="form-status form-status--success">{{ 'contact.form.success' | t }}</p>
  {% endif %}

  {% if form.errors %}
    <div class="form-status form-status--error">
      {{ form.errors | default_errors }}
    </div>
  {% endif %}

  <div class="field">
    <label for="ContactFormName">{{ 'contact.form.name' | t }}</label>
    <input
      type="text"
      id="ContactFormName"
      name="contact[name]"
      value="{% if form.name %}{{ form.name }}{% elsif customer %}{{ customer.name }}{% endif %}"
    >
  </div>

  <div class="field">
    <label for="ContactFormEmail">{{ 'contact.form.email' | t }}</label>
    <input
      type="email"
      id="ContactFormEmail"
      name="contact[email]"
      autocomplete="email"
      autocapitalize="off"
      value="{% if form.email %}{{ form.email }}{% elsif customer %}{{ customer.email }}{% endif %}"
      required
    >
  </div>

  <div class="field">
    <label for="ContactFormMessage">{{ 'contact.form.message' | t }}</label>
    <textarea rows="5" id="ContactFormMessage" name="contact[body]">{% if form.body %}{{ form.body }}{% endif %}</textarea>
  </div>

  <button type="submit">{{ 'contact.form.submit' | t }}</button>
{% endform %}

{% stylesheet %}
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 32rem;
  }
  .contact-form .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .form-status--success {
    color: var(--color-accent-secondary);
  }
  .form-status--error {
    color: var(--color-urgency);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.contact",
  "settings": []
}
{% endschema %}
```

- [ ] **Step 7: Create the template**

Create `templates/page.contact.json`:

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
    "main": {
      "type": "page-contact",
      "settings": {}
    }
  },
  "order": [
    "main"
  ]
}
```

- [ ] **Step 8: Run theme-check**

```bash
shopify theme check
```

Expected: 0 offenses — this is the check that actually validates the new section's Liquid syntax and its `{% schema %}` JSON, since there's no automated test runner for Liquid.

- [ ] **Step 9: Verify what's verifiable without a connected store**

```bash
shopify theme dev
```

Confirm the CLI starts cleanly (no template/section parse errors in its output) and that the theme editor's Templates dropdown lists "Contact page" as an available alternate template for pages. Uploading a favicon image and assigning the `contact` template to an actual Page resource to see the rendered form end-to-end requires a connected development store with a Pages resource — if one is connected, do that too; if not, this is the same gap already recorded in spec §12 and isn't a regression introduced by this task.

- [ ] **Step 10: Commit**

```bash
git add config/settings_schema.json locales/en.default.schema.json locales/en.default.json layout/theme.liquid sections/page-contact.liquid templates/page.contact.json
git commit -m "feat: add favicon setting and page.contact template"
```

---

## Self-Review Notes

- **Spec coverage**: §2.1 (color tokens) → Tasks 1, 4. §2.2 (typography) → Task 2. §2.3 (spacing) → Task 3. §5.9 (contact page) → Task 5. §8 (`theme_info`, favicon, no-Lorem-Ipsum, terminology) → Task 5 + constraints applied throughout. §0/§9 naming placeholder → Task 5 Step 1 explicitly keeps "STRIDE" as a placeholder per spec §9, doesn't invent a final name. Everything else in the spec (global layout, homepage sections, product/collection/cart, remaining templates, a11y/perf pass, submission docs) is out of scope for this plan by design — see the Spec line above and spec §13 phases 3-12.
- **Type/name consistency checked**: `--color-*`/`--font-*`/`--space-*` names introduced in Tasks 1-3 are the exact strings used in Task 5's stylesheet; `urgency_color`/`accent_secondary_color` setting ids match between Task 1's schema and Task 4's edit; `type_primary_font` id is preserved (not renamed) even though its CSS variable output was renamed from `--font-primary--*` to `--font-body--*`, avoiding a settings-data migration.
- **No placeholders**: every step has literal code/JSON to write and an exact expected result to check.
