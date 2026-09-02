(function () {
  // Loaded once per full page load from layout/theme.liquid (gated to
  // template == 'collection'), the same pattern product-variant-picker.js
  // uses — see that file's comment for why loading from the layout instead
  // of embedding <script src> inside sections/collection.liquid matters.
  //
  // currentRoot/currentForm track whichever DOM subtree initCollectionFilters
  // last initialized (document on first load, or a fresh section root on
  // shopify:section:load in the theme editor) so the single module-scope
  // popstate listener below always operates on the CURRENT form instead of
  // a stale one. popstate is bound once, outside initCollectionFilters,
  // specifically so re-running initCollectionFilters on repeated
  // shopify:section:load events (theme-editor setting changes) never
  // re-registers it — window persists across those reloads even though the
  // section subtree doesn't, so a listener attached inside
  // initCollectionFilters would duplicate on every reload.
  var currentRoot = document;
  var currentForm = null;

  // Guards against out-of-order Section Rendering API responses: if a
  // second request (e.g. Back button right after changing sort) starts
  // before the first one's fetch resolves, only the response matching the
  // MOST RECENTLY issued request is applied. Without this, a slow earlier
  // response arriving after a faster later one could overwrite the grid
  // with stale, superseded content.
  var latestRequestId = 0;

  function announce(root, count) {
    var live = root.querySelector('[data-collection-live-region]');
    if (!live) return;
    var template = live.dataset.resultsCountTemplate;
    if (!template) return;
    live.textContent = template.replace('__COUNT__', String(count));
  }

  function submitForm(form) {
    // requestSubmit() is Baseline-widely-available since September 2022
    // (Chrome 75+/2019, Firefox 88+/2021, Safari 16+/2022) — well within
    // this theme's stated browser-support baseline (spec §7: Safari
    // latest 2, Chrome latest 3, Firefox latest 3, Edge latest 2, Mobile
    // Safari latest 2, Samsung Internet latest 2), all of which track
    // current releases far newer than 2022. The manual-dispatch fallback
    // is kept anyway as defense in depth for any embedded webview that
    // lags the baseline.
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }

  function fetchAndSwap(root, form, url, pushState) {
    latestRequestId += 1;
    var requestId = latestRequestId;

    // Only the sort <select> has a stable id across swaps
    // (CollectionSortBy-{{ section.id }}, unchanged since it's the same
    // section instance) and only it auto-submits without the user
    // deliberately leaving the form (unlike the Apply button, whose click
    // is itself a "submit this form" action, so losing focus afterward
    // matches what a native full-page-reload submit already does).
    // Restoring focus after form.innerHTML replaces the sort <select> with
    // a freshly-rendered one avoids silently dropping keyboard focus back
    // to <body> right after a change the user didn't expect to be
    // "form-submission-like".
    var focusId = null;
    if (document.activeElement && form.contains(document.activeElement) && document.activeElement.id) {
      focusId = document.activeElement.id;
    }

    // The section ID is read from a data attribute rendered server-side
    // by snippets/collection-filters.liquid (data-section-id="{{ section.id }}"),
    // not parsed back out of the auto-generated
    // id="shopify-section-<id>" wrapper — see that snippet's comment.
    var sectionParam = form.dataset.sectionId;
    if (!sectionParam) {
      // Should never happen (the attribute is always rendered), but fail
      // open to a real navigation rather than silently doing nothing.
      window.location.href = url;
      return;
    }

    var fetchUrl = new URL(url, window.location.origin);
    fetchUrl.searchParams.set('sections', sectionParam);

    fetch(fetchUrl.toString())
      .then(function (response) {
        if (!response.ok) throw new Error('Section Rendering API request failed: ' + response.status);
        return response.json();
      })
      .then(function (sections) {
        if (requestId !== latestRequestId) return; // superseded by a newer request

        var html = sections[sectionParam];
        if (!html) throw new Error('Section "' + sectionParam + '" missing from Section Rendering API response');

        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newResults = doc.querySelector('[data-collection-results]');
        var newFiltersInner = doc.querySelector('[data-collection-filters]');

        // data-collection-results wraps the grid-or-empty-state AND the
        // pagination nav together (see sections/collection.liquid) and is
        // swapped as one unit — re-queried fresh from the live DOM rather
        // than relying on a closure-captured reference, since after the
        // first swap an earlier-captured reference would point at a node
        // already detached by replaceWith(), and further lookups against
        // a detached node fail silently. Swapping the grid alone (without
        // the pagination nav) would leave stale pagination sitting next
        // to fresh results whenever filtering/sorting changes the total
        // page count.
        var currentResults = root.querySelector('[data-collection-results]');
        if (currentResults && newResults) {
          currentResults.replaceWith(newResults);
        }

        // Only the filter form's children are replaced, never the <form>
        // element itself, so the submit/change listeners bound once in
        // initCollectionFilters below stay attached — no re-init, no risk
        // of double-registering them on every AJAX swap.
        if (newFiltersInner) {
          form.innerHTML = newFiltersInner.innerHTML;
          if (focusId) {
            var toFocus = form.querySelector('#' + CSS.escape(focusId));
            if (toFocus) toFocus.focus();
          }
        }

        if (pushState) {
          window.history.pushState({}, '', url);
        }

        var count = newResults ? newResults.querySelectorAll('.product-card').length : 0;
        announce(root, count);
      })
      .catch(function (error) {
        console.error(error);
        window.location.href = url;
      });
  }

  function initCollectionFilters(root) {
    var form = root.querySelector('[data-collection-filters]');
    if (!form) return;

    currentRoot = root;
    currentForm = form;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var params = new URLSearchParams(new FormData(form));
      var query = params.toString();
      var url = form.action + (query ? '?' + query : '');
      fetchAndSwap(root, form, url, true);
    });

    // Checkboxes intentionally do NOT auto-submit here — only the sort
    // dropdown does. Auto-submitting every checkbox toggle risks
    // rapid-fire, potentially out-of-order fetches (and a matching
    // aria-live announcement firing repeatedly) while a user is still
    // ticking several boxes in a row, and it's a jarring/inaccessible
    // experience for keyboard and switch-access users moving through a
    // fieldset of checkboxes. Checkboxes keep requiring the existing
    // "Apply filters" button click, matching Task 2's already-shipped,
    // accessible base behavior exactly — Task 3 only makes that same
    // submit path AJAX instead of a full reload, it doesn't change when a
    // submit happens.
    form.addEventListener('change', function (event) {
      var target = event.target;
      if (target && target.matches && target.matches('[data-collection-sort]')) {
        submitForm(form);
      }
    });
  }

  initCollectionFilters(document);
  document.addEventListener('shopify:section:load', function (event) {
    initCollectionFilters(event.target);
  });

  window.addEventListener('popstate', function () {
    if (!currentForm || !document.contains(currentForm)) return;
    // window.location.href already reflects the URL the browser just
    // navigated to by the time popstate fires, whether that's an earlier
    // pushState'd filtered/sorted URL or the original un-filtered
    // collection URL from the initial full page load — re-fetching that
    // exact URL through the Section Rendering API re-renders the grid
    // section with the query params it actually contains, so Back/Forward
    // always lands on the grid state matching the address bar.
    fetchAndSwap(currentRoot, currentForm, window.location.href, false);
  });
})();
