(function () {
  // Loaded globally from layout/theme.liquid (not template-gated, unlike
  // product-variant-picker.js/collection-filters.js) because the header
  // -- and therefore the predictive-search trigger this file drives --
  // renders on every page. See sections/predictive-search.liquid's own
  // comment for the documentation citations confirming the API shape
  // this file relies on: routes.predictive_search_url returns HTML (not
  // JSON) for the section named "predictive-search", wrapped the same
  // way every Shopify section is wrapped
  // (#shopify-section-predictive-search), extracted here the same way
  // Shopify's own Dawn reference theme does it.
  //
  // This snippet renders from BOTH sections/header.liquid (global, every
  // page) and sections/search.liquid (search template only), so
  // initPredictiveSearch below may find and initialize MULTIPLE
  // [data-predictive-search] instances on the same page load. Every
  // piece of mutable state (latestRequestId, activeIndex, etc.) is
  // declared INSIDE initPredictiveSearchInstance's closure, scoped to
  // one instance's DOM subtree only -- nothing is shared or global, so
  // typing in the header's search box can never affect the search page's
  // own dropdown state or vice versa.
  var DEBOUNCE_MS = 300;
  var MIN_QUERY_LENGTH = 2;

  function debounce(fn, wait) {
    var timeoutId;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function initPredictiveSearchInstance(container) {
    if (container.dataset.predictiveSearchInitialized) return;
    container.dataset.predictiveSearchInitialized = 'true';

    var baseUrl = container.dataset.predictiveSearchUrl;
    var form = container.querySelector('[data-predictive-search-form]');
    var input = container.querySelector('[data-predictive-search-input]');
    var resultsEl = container.querySelector('[data-predictive-search-results]');
    var statusEl = container.querySelector('[data-predictive-search-status]');
    if (!baseUrl || !form || !input || !resultsEl) return;

    // Scoped to THIS instance only -- see the file-level comment above.
    var latestRequestId = 0;
    var activeIndex = -1;
    var outsideClickBound = false;

    function getOptions() {
      return Array.prototype.slice.call(resultsEl.querySelectorAll('[role="option"]'));
    }

    function onDocumentClick(event) {
      if (container.contains(event.target)) return;
      closeResults();
    }

    function openResultsListeners() {
      if (outsideClickBound) return;
      outsideClickBound = true;
      document.addEventListener('click', onDocumentClick);
    }

    function closeResultsListeners() {
      if (!outsideClickBound) return;
      outsideClickBound = false;
      document.removeEventListener('click', onDocumentClick);
    }

    function closeResults() {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      resultsEl.removeAttribute('aria-busy');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
      closeResultsListeners();
      if (statusEl) statusEl.textContent = '';
    }

    function setActive(index) {
      var options = getOptions();
      if (options.length === 0) return;

      options.forEach(function (option) {
        option.setAttribute('aria-selected', 'false');
        option.classList.remove('is-active');
      });

      if (index < 0) index = options.length - 1;
      if (index >= options.length) index = 0;
      activeIndex = index;

      var active = options[activeIndex];
      active.setAttribute('aria-selected', 'true');
      active.classList.add('is-active');
      input.setAttribute('aria-activedescendant', active.id);
      if (active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    }

    function renderResults(html) {
      var parsed = new DOMParser().parseFromString(html, 'text/html');
      var section = parsed.getElementById('shopify-section-predictive-search');
      if (!section) {
        throw new Error('predictive-search: #shopify-section-predictive-search missing from Predictive Search API response');
      }

      resultsEl.innerHTML = section.innerHTML;

      // Options and group headings come back from the shared
      // sections/predictive-search.liquid fragment with no ids of their
      // own (that section has no knowledge of which instance -- header or
      // search page -- fetched it). IDs are assigned here, scoped to
      // resultsEl's own already-unique id (id_prefix-Results, rendered by
      // snippets/predictive-search.liquid), so aria-activedescendant and
      // aria-labelledby always reference real, unique elements even when
      // both instances are on the page at once.
      Array.prototype.forEach.call(
        resultsEl.querySelectorAll('.predictive-search__group'),
        function (group, groupIndex) {
          var title = group.querySelector('.predictive-search__group-title');
          if (!title) return;
          title.id = resultsEl.id + '-Group-' + groupIndex;
          group.setAttribute('role', 'group');
          group.setAttribute('aria-labelledby', title.id);
        }
      );

      getOptions().forEach(function (option, index) {
        option.id = resultsEl.id + '-Option-' + index;
        option.setAttribute('tabindex', '-1');
      });

      // The result-count/no-results text is rendered server-side (so it
      // stays correctly localized) into role="presentation" elements --
      // presentation keeps them out of the ARIA ownership model for this
      // role="listbox" (which may only own option/group children) without
      // hiding the no-results message from sighted users. Copy the text
      // into the persistent status region so it's actually announced, and
      // discard the hidden, success-case-only copy (.predictive-search__empty
      // stays in the DOM -- it's real visible UI, not just an AT artifact).
      var announcement =
        resultsEl.querySelector('[data-predictive-search-announcement]') ||
        resultsEl.querySelector('.predictive-search__empty');
      if (statusEl) statusEl.textContent = announcement ? announcement.textContent.trim() : '';

      var hiddenAnnouncement = resultsEl.querySelector('[data-predictive-search-announcement]');
      if (hiddenAnnouncement) hiddenAnnouncement.remove();

      activeIndex = -1;
      resultsEl.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      openResultsListeners();
    }

    function fetchResults(term) {
      latestRequestId += 1;
      var requestId = latestRequestId;
      resultsEl.setAttribute('aria-busy', 'true');

      var url =
        baseUrl +
        '?q=' + encodeURIComponent(term) +
        '&section_id=predictive-search' +
        '&resources[type]=product,article,page' +
        '&resources[limit]=10';

      fetch(url)
        .then(function (response) {
          if (!response.ok) throw new Error('Predictive Search API request failed: ' + response.status);
          return response.text();
        })
        .then(function (html) {
          // A newer keystroke already superseded this response -- discard
          // it rather than let a slow earlier request overwrite fresher
          // results (same guard collection-filters.js uses for its own
          // out-of-order Section Rendering API responses).
          if (requestId !== latestRequestId) return;
          renderResults(html);
        })
        .catch(function (error) {
          if (requestId !== latestRequestId) return;
          console.error(error);
          // Progressive enhancement: a fetch/parse failure here must never
          // block the plain <form> underneath from still working -- leave
          // the dropdown closed and let Enter/submit fall through to a
          // real full-page routes.search_url request.
          closeResults();
        })
        .finally(function () {
          if (requestId === latestRequestId) resultsEl.removeAttribute('aria-busy');
        });
    }

    var debouncedSearch = debounce(function () {
      var term = input.value.trim();
      if (term.length < MIN_QUERY_LENGTH) {
        closeResults();
        return;
      }
      fetchResults(term);
    }, DEBOUNCE_MS);

    input.addEventListener('input', debouncedSearch);

    input.addEventListener('keydown', function (event) {
      var resultsOpen = !resultsEl.hidden;

      if (event.key === 'ArrowDown') {
        if (!resultsOpen) return;
        event.preventDefault();
        setActive(activeIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        if (!resultsOpen) return;
        event.preventDefault();
        setActive(activeIndex - 1);
        return;
      }

      if (event.key === 'Enter') {
        if (resultsOpen && activeIndex > -1) {
          var options = getOptions();
          var active = options[activeIndex];
          if (active && active.href) {
            event.preventDefault();
            window.location.href = active.href;
          }
        }
        // No active option: let the native form submission proceed to
        // routes.search_url, unchanged -- this is the progressive
        // enhancement fallback, not just a JS-unavailable one.
        return;
      }

      if (event.key === 'Escape') {
        if (resultsOpen) {
          // First Escape closes just the results dropdown and keeps focus
          // in the input. stopPropagation so a second, separate Escape
          // press is needed to also close a header search panel this
          // instance might be nested inside (sections/header.liquid's own
          // initSearchTrigger listens for Escape at the document level).
          event.stopPropagation();
          closeResults();
        }
      }
    });

    form.addEventListener('submit', function () {
      // Always let this submit through to a real full-page
      // routes.search_url request -- predictive search never intercepts
      // or prevents the plain form's default submission.
      closeResults();
    });
  }

  function initPredictiveSearch(root) {
    root.querySelectorAll('[data-predictive-search]').forEach(initPredictiveSearchInstance);
  }

  initPredictiveSearch(document);

  document.addEventListener('shopify:section:load', function (event) {
    initPredictiveSearch(event.target);
  });
})();
