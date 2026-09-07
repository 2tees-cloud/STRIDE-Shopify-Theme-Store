(function () {
  function getVariants(root) {
    var script = root.querySelector('[data-product-variants-json]');
    if (!script) return [];
    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return [];
    }
  }

  function findMatchingVariant(variants, selectedOptions) {
    return variants.find(function (variant) {
      return selectedOptions.every(function (value, index) {
        return value == null || variant.options[index] === value;
      });
    });
  }

  function updatePrice(root, variant) {
    // Both the price and compare-at elements always exist in the DOM
    // (see blocks/product-price.liquid) — this function only ever
    // toggles hidden/data-is-sale and rewrites text, it never creates
    // or removes elements, so it works identically regardless of
    // whether the INITIAL server-rendered variant was on sale.
    //
    // price_formatted/compare_at_price_formatted are rendered
    // server-side by blocks/variant-picker.liquid using Liquid's
    // `money` filter (product.variants | json does NOT include
    // formatted price fields — it only has raw integer cent values,
    // confirmed against Shopify's documented json-filter output) so
    // this JS never needs its own currency formatter.
    var container = root.querySelector('[data-product-price-container]');
    var priceEl = root.querySelector('[data-product-price]');
    var compareAtEl = root.querySelector('[data-product-compare-at-price]');
    var saleLabelEl = root.querySelector('[data-product-price-on-sale-label]');

    // priceEl.textContent is always assigned (not just when
    // price_formatted is truthy) so that an impossible/unmatched option
    // combination — where the caller passes {} because
    // findMatchingVariant returned nothing — clears the price instead
    // of leaving the PREVIOUS variant's price on screen next to the
    // "Unavailable" label.
    if (priceEl) priceEl.textContent = variant.price_formatted || '';

    var showCompareAt = !!(variant.compare_at_price_formatted && variant.compare_at_price > variant.price);
    if (compareAtEl) {
      compareAtEl.textContent = showCompareAt ? variant.compare_at_price_formatted : '';
      compareAtEl.hidden = !showCompareAt;
    }
    if (saleLabelEl) saleLabelEl.hidden = !showCompareAt;
    if (container) container.toggleAttribute('data-is-sale', showCompareAt);
  }

  function updateUnitPrice(root, variant) {
    // [data-product-unit-price] is ALWAYS present in the DOM (see
    // blocks/product-price.liquid), hidden via the `hidden` attribute
    // rather than omitted via Liquid {% if %}/{% else %}, even when the
    // INITIAL variant has no unit_price_measurement — the same
    // never-omit-the-element contract updatePrice's compare-at element
    // already follows above. That's what lets this function correctly
    // REVEAL the element on a later switch to a variant that DOES have
    // unit pricing: if the element were only rendered when the initial
    // variant had unit pricing, this querySelector would find nothing
    // for a product whose initial variant lacked it, and the unit price
    // could never appear no matter which variant is selected afterward.
    var unitPriceEl = root.querySelector('[data-product-unit-price]');
    if (!unitPriceEl) return;

    var hasUnitPrice = !!(
      variant &&
      variant.unit_price &&
      variant.unit_price_measurement_reference_value &&
      variant.unit_price_measurement_reference_unit
    );

    if (!hasUnitPrice) {
      unitPriceEl.hidden = true;
      return;
    }

    unitPriceEl.textContent =
      variant.unit_price + '/' + variant.unit_price_measurement_reference_value + variant.unit_price_measurement_reference_unit;
    unitPriceEl.hidden = false;
  }

  function updateAvailability(root, variant) {
    var submit = root.querySelector('[data-buy-buttons-submit]');
    var label = root.querySelector('[data-buy-buttons-label]');
    if (!submit || !label) return;

    if (!variant) {
      submit.disabled = true;
      label.textContent = submit.dataset.unavailableText || 'Unavailable';
      return;
    }

    submit.disabled = !variant.available;
    label.textContent = variant.available
      ? submit.dataset.addToCartText
      : submit.dataset.soldOutText;
  }

  function updateVariantId(root, variant) {
    var input = root.querySelector('[data-buy-buttons-variant-id]');
    if (input) input.value = variant ? variant.id : '';
  }

  // Shared by both variant-driven gallery updates (updateGalleryImage
  // below) and direct thumbnail clicks (initGalleryThumbnails below) —
  // both are just "make the item with this media id the active one",
  // triggered by a variant match in one case and direct user choice in
  // the other. [data-product-media-id] is present on both the main
  // .product__gallery-item elements AND the .product__gallery-thumbnail
  // buttons (sections/product.liquid), so toggling by that shared
  // attribute keeps the main image and the thumbnail strip's active
  // state in sync in one pass.
  function setActiveGalleryItem(sectionRoot, mediaId) {
    if (!mediaId) return;
    var items = sectionRoot.querySelectorAll('[data-product-media-id]');
    items.forEach(function (item) {
      var matches = String(item.dataset.productMediaId) === String(mediaId);
      item.classList.toggle('is-active', matches);
    });
  }

  function updateGalleryImage(sectionRoot, variant) {
    if (!variant || !variant.featured_media_id) return;
    setActiveGalleryItem(sectionRoot, variant.featured_media_id);
  }

  // Pickup availability lives in its own top-level section
  // (sections/pickup-availability.liquid, a sibling of "main" in
  // templates/product.json — same architecture as
  // recommended-products.liquid), not inside the variant picker's own
  // .shopify-section, so it's looked up from `document` rather than
  // `sectionRoot` like the update* functions above. Its container
  // already carries the exact fetch URL for the CURRENTLY rendered
  // variant (data-url, built server-side in the section itself); this
  // only needs to swap that URL's variant= query param for the newly
  // selected variant's id before fetching, mirroring
  // recommended-products.liquid's own fetch-and-swap-innerHTML JS.
  function updatePickupAvailability(variant) {
    var container = document.querySelector('[data-pickup-availability-container]');
    if (!container || !variant) return;

    var url = new URL(container.dataset.url, window.location.origin);
    url.searchParams.set('variant', variant.id);

    fetch(url)
      .then(function (response) { return response.text(); })
      .then(function (text) {
        var html = document.createElement('div');
        html.innerHTML = text;
        var fresh = html.querySelector('[data-pickup-availability-container]');
        // The section renders nothing at all once no pickup-enabled
        // location has this variant (see the {% if %} guard in the
        // liquid) -- fresh is null in that case, so the previous
        // variant's now-stale availability is explicitly cleared
        // rather than left on screen.
        container.outerHTML = fresh ? fresh.outerHTML : '';
        // outerHTML replacement drops the old container node entirely,
        // taking its trigger/close click listeners with it -- re-run the
        // modal wiring (querySelectorAll no-ops if nothing matches) or the
        // pickup-availability trigger button would go dead after the very
        // first variant switch.
        initPickupAvailabilityModal(document);
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  function getSellingPlanAllocations(container) {
    var script = container.querySelector('[data-selling-plan-allocations-json]');
    if (!script) return [];
    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return [];
    }
  }

  // Reads whichever [data-selling-plan-option] radio is currently
  // checked and redraws the price accordingly, reusing updatePrice
  // above rather than duplicating its DOM-writing logic — a synthetic
  // "variant" object carrying just the four price fields updatePrice
  // reads is enough. One-time purchase uses the container's own
  // data-one-time-price* attributes (the variant selected when this
  // block was last rendered); a subscription plan uses the matching
  // entry from this block's own allocations JSON, scoped to that same
  // variant (see the file-level doc comment for why it can't safely
  // reach across a later variant switch).
  function updateSellingPlanPrice(sectionRoot) {
    var container = sectionRoot.querySelector('[data-selling-plan-picker]');
    if (!container) return;

    var checked = container.querySelector('[data-selling-plan-option]:checked');
    var sellingPlanId = checked ? checked.value : '';

    var input = container.querySelector('[data-selling-plan-input]');
    if (input) input.value = sellingPlanId;

    if (!sellingPlanId) {
      updatePrice(sectionRoot, {
        price: Number(container.dataset.oneTimePrice),
        price_formatted: container.dataset.oneTimePriceFormatted,
        compare_at_price: Number(container.dataset.oneTimeCompareAtPrice) || 0,
        compare_at_price_formatted: container.dataset.oneTimeCompareAtPriceFormatted,
      });
      return;
    }

    var allocation = getSellingPlanAllocations(container).find(function (entry) {
      return String(entry.id) === sellingPlanId;
    });
    if (!allocation) return;

    // selling_plan_allocation doesn't expose a raw compare_at_price
    // integer the same way a variant does (see blocks/selling-plan-
    // picker.liquid's JSON, which only ever emits the FORMATTED
    // compare-at string, or null) — updatePrice's own showCompareAt
    // check only needs compare_at_price > price to be true when a
    // formatted string is present, so 1/0 stands in for that
    // comparison without a matching raw compare_at_price value.
    updatePrice(sectionRoot, {
      price: 0,
      price_formatted: allocation.price_formatted,
      compare_at_price: allocation.compare_at_price_formatted ? 1 : 0,
      compare_at_price_formatted: allocation.compare_at_price_formatted,
    });
  }

  // Called from initVariantPicker's click handler on every variant
  // switch. The allocations JSON embedded in blocks/selling-plan-
  // picker.liquid is scoped to whichever variant was selected when the
  // page (or this block) was last rendered server-side — data-variant-id
  // records exactly which one. A switch to any OTHER variant makes that
  // data stale (see the file-level doc comment in
  // blocks/selling-plan-picker.liquid), so this falls back to one-time
  // purchase and disables the subscription radios rather than risk
  // showing a subscription price that belongs to a different variant.
  function syncSellingPlanPickerForVariant(sectionRoot, variant) {
    var container = sectionRoot.querySelector('[data-selling-plan-picker]');
    if (!container || !variant) return;

    if (String(variant.id) === container.dataset.variantId) return;

    // Refresh the one-time-purchase cache to the NEW variant before
    // updateSellingPlanPrice reads it below — otherwise resetting to
    // one-time here would redraw the price from the OLD variant's cached
    // values, clobbering the correct price updatePrice(sectionRoot,
    // matchedVariant) already wrote moments earlier in the click handler.
    container.dataset.variantId = variant.id;
    container.dataset.oneTimePrice = variant.price;
    container.dataset.oneTimePriceFormatted = variant.price_formatted || '';
    container.dataset.oneTimeCompareAtPrice = variant.compare_at_price || '';
    container.dataset.oneTimeCompareAtPriceFormatted =
      variant.compare_at_price > variant.price ? variant.compare_at_price_formatted : '';

    container.querySelectorAll('[data-selling-plan-option]').forEach(function (radio) {
      if (radio.value === '') {
        radio.checked = true;
        radio.disabled = false;
      } else {
        radio.checked = false;
        radio.disabled = true;
      }
    });

    updateSellingPlanPrice(sectionRoot);
  }

  function initSellingPlanPicker(root) {
    root.querySelectorAll('[data-selling-plan-option]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        var sectionRoot = (typeof radio.closest === 'function' && radio.closest('.shopify-section')) || root;
        updateSellingPlanPrice(sectionRoot);
      });
    });
  }

  function initGalleryThumbnails(root) {
    root.querySelectorAll('[data-product-gallery-thumbnail]').forEach(function (thumbnail) {
      thumbnail.addEventListener('click', function () {
        // root is `document` on first load and a section DOM node on
        // shopify:section:load — Document has no .closest(), so guard
        // it (same pattern as initVariantPicker below).
        var sectionRoot = (typeof thumbnail.closest === 'function' && thumbnail.closest('.shopify-section')) || root;
        setActiveGalleryItem(sectionRoot, thumbnail.dataset.productMediaId);
      });
    });
  }

  function updateUrl(variant) {
    if (!variant || !window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);
  }

  function updateActiveButtons(root, selectedOptions) {
    root.querySelectorAll('[data-variant-option-value]').forEach(function (button) {
      var position = parseInt(button.dataset.optionPosition, 10) - 1;
      var isActive = selectedOptions[position] === button.dataset.optionValue;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function initVariantPicker(root) {
    var picker = root.querySelector('[data-variant-picker]');
    if (!picker) return;

    // root is `document` on first load and a section DOM node on
    // shopify:section:load — Document has no .closest(), so guard it.
    var sectionRoot = (typeof root.closest === 'function' && root.closest('.shopify-section')) || root;
    var variants = getVariants(picker);
    if (variants.length === 0) return;

    var selectedOptions = variants[0].options.map(function () {
      return null;
    });

    // Seed initial state from whichever buttons the server already
    // marked is-active (product.selected_or_first_available_variant).
    picker.querySelectorAll('[data-variant-option-value].is-active').forEach(function (button) {
      var position = parseInt(button.dataset.optionPosition, 10) - 1;
      selectedOptions[position] = button.dataset.optionValue;
    });

    picker.querySelectorAll('[data-variant-option-value]').forEach(function (button) {
      button.addEventListener('click', function () {
        var position = parseInt(button.dataset.optionPosition, 10) - 1;
        selectedOptions[position] = button.dataset.optionValue;

        var matchedVariant = findMatchingVariant(variants, selectedOptions);

        updateActiveButtons(picker, selectedOptions);
        updatePrice(sectionRoot, matchedVariant || {});
        updateUnitPrice(sectionRoot, matchedVariant);
        updateAvailability(sectionRoot, matchedVariant);
        updateVariantId(sectionRoot, matchedVariant);
        updateGalleryImage(sectionRoot, matchedVariant);
        updatePickupAvailability(matchedVariant);
        syncSellingPlanPickerForVariant(sectionRoot, matchedVariant);
        updateUrl(matchedVariant);
      });
    });
  }

  // Lives here rather than in snippets/size-chart-modal.liquid's own
  // {% javascript %} block — live verification found that shopify
  // theme dev's local asset bundler doesn't correctly extract a
  // snippet's {% javascript %} content (it dumped the raw comment/
  // markup/stylesheet text ahead of the actual function body,
  // producing a SyntaxError that silently broke the trigger). The
  // equivalent block-level bundling (blocks/gift-card-recipient.liquid)
  // extracts correctly, so this is specifically a snippet-bundling
  // gap. The snippet is only ever rendered from
  // blocks/variant-picker.liquid, which only exists on the product
  // template where this file is already loaded, so this is a safe,
  // already-proven-working home for it.
  function initSizeChartModal(root) {
    root.querySelectorAll('[data-size-chart-trigger]').forEach(function (trigger) {
      var wrapper = trigger.parentElement;
      var modal = wrapper ? wrapper.querySelector('[data-size-chart-modal]') : null;
      if (!modal) return;

      trigger.addEventListener('click', function () {
        modal.showModal();
      });

      // A native <dialog> fires its own 'close' event regardless of HOW
      // it closed -- the close button below, or the browser's built-in
      // Escape-to-dismiss default action, which never runs any of this
      // file's own JS. Restoring focus here (rather than only inside the
      // close button's click handler) is what covers both paths: without
      // it, closing via Escape leaves document.activeElement pointing at
      // the now-display:none close button, which is unreachable by Tab
      // from that point on (confirmed live -- focus does not move on
      // subsequent Tab presses), a real keyboard trap. This mirrors the
      // lastFocusedElement-restore pattern already used for the mobile
      // nav panel and header search panel elsewhere in this file/theme.
      modal.addEventListener('close', function () {
        trigger.focus();
      });

      var closeButton = modal.querySelector('[data-size-chart-close]');
      if (closeButton) {
        closeButton.addEventListener('click', function () {
          modal.close();
        });
      }
    });
  }

  // Mirrors initSizeChartModal's open/close/focus-restore pattern, but the
  // trigger and modal are siblings inside the shared
  // [data-pickup-availability-container] wrapper (trigger is nested in
  // .pickup-availability__summary, not a direct parent of the modal), so
  // the modal is found via closest() on that container rather than
  // trigger.parentElement.
  function initPickupAvailabilityModal(root) {
    root.querySelectorAll('[data-pickup-availability-trigger]').forEach(function (trigger) {
      var container = trigger.closest('[data-pickup-availability-container]');
      var modal = container ? container.querySelector('[data-pickup-availability-modal]') : null;
      if (!modal) return;

      trigger.addEventListener('click', function () {
        modal.showModal();
      });

      modal.addEventListener('close', function () {
        trigger.focus();
      });

      var closeButton = modal.querySelector('[data-pickup-availability-close]');
      if (closeButton) {
        closeButton.addEventListener('click', function () {
          modal.close();
        });
      }
    });
  }

  initVariantPicker(document);
  initGalleryThumbnails(document);
  initSizeChartModal(document);
  initPickupAvailabilityModal(document);
  initSellingPlanPicker(document);
  document.addEventListener('shopify:section:load', function (event) {
    initVariantPicker(event.target);
    initGalleryThumbnails(event.target);
    initSizeChartModal(event.target);
    initPickupAvailabilityModal(event.target);
    initSellingPlanPicker(event.target);
  });
})();
