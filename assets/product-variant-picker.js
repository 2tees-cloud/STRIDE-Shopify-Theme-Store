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

    if (priceEl && variant.price_formatted) priceEl.textContent = variant.price_formatted;

    var showCompareAt = !!(variant.compare_at_price_formatted && variant.compare_at_price > variant.price);
    if (compareAtEl) {
      compareAtEl.textContent = showCompareAt ? variant.compare_at_price_formatted : '';
      compareAtEl.hidden = !showCompareAt;
    }
    if (saleLabelEl) saleLabelEl.hidden = !showCompareAt;
    if (container) container.toggleAttribute('data-is-sale', showCompareAt);
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

  function updateGalleryImage(sectionRoot, variant) {
    if (!variant || !variant.featured_media_id) return;
    var items = sectionRoot.querySelectorAll('[data-product-media-id]');
    items.forEach(function (item) {
      var matches = String(item.dataset.productMediaId) === String(variant.featured_media_id);
      item.classList.toggle('is-active', matches);
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
        updateAvailability(sectionRoot, matchedVariant);
        updateVariantId(sectionRoot, matchedVariant);
        updateGalleryImage(sectionRoot, matchedVariant);
        updateUrl(matchedVariant);
      });
    });
  }

  initVariantPicker(document);
  document.addEventListener('shopify:section:load', function (event) {
    initVariantPicker(event.target);
  });
})();
