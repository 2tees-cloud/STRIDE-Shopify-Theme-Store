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
      })
      .catch(function (error) {
        console.error(error);
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
        if (typeof cart.item_count === 'number') {
          updateCartCount(cart.item_count);
        }
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
