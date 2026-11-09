(function () {
  // sticky nav shadow
  var nav = document.getElementById('nav');
  var onScroll = function () { nav && nav.classList.toggle('scrolled', window.scrollY > 10); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // mobile menu
  var burger = document.getElementById('burger'), menu = document.getElementById('menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      menu.classList.toggle('open'); burger.classList.toggle('x');
      burger.setAttribute('aria-expanded', menu.classList.contains('open'));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.remove('open'); burger.classList.remove('x'); });
    });
  }

  // reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }

  // count-up numbers
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return; co.unobserve(e.target);
        var el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = null;
        var step = function (t) {
          if (!t0) t0 = t; var p = Math.min((t - t0) / 1400, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          el.textContent = v.toLocaleString('en-US') + suf; if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  }

  // product filter
  var filters = document.getElementById('filters');
  if (filters) {
    var apply = function (f) {
      filters.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === f); });
      document.querySelectorAll('#grid .product').forEach(function (p) {
        p.classList.toggle('hide', f !== 'all' && p.dataset.cat !== f);
        p.classList.add('in');
      });
    };
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      apply(b.dataset.f); history.replaceState(null, '', b.dataset.f === 'all' ? location.pathname : '#' + b.dataset.f);
    });
    var h = location.hash.slice(1); if (h && filters.querySelector('[data-f="' + h + '"]')) apply(h);
  }

  // quote form → WhatsApp / email (no backend yet)
  var form = document.getElementById('quoteForm');
  if (form) {
    var qs = new URLSearchParams(location.search), prod = qs.get('product');
    if (prod) form.message.value = 'I am interested in: ' + prod + '\n\n';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ['name', 'email', 'country', 'message'].forEach(function (n) {
        var f = form[n], bad = !f.value.trim() || (n === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value));
        f.style.borderColor = bad ? '#D9534F' : ''; if (bad) ok = false;
      });
      if (!ok) return;
      var interests = Array.prototype.map.call(form.querySelectorAll('[name=interest]:checked'), function (c) { return c.value; }).join(', ');
      var text = 'New inquiry from website\n' +
        'Name: ' + form.name.value + '\nEmail: ' + form.email.value +
        '\nCompany: ' + (form.company.value || '-') + '\nCountry: ' + form.country.value +
        '\nPhone: ' + (form.phone.value || '-') + '\nQuantity: ' + (form.quantity.value || '-') +
        '\nInterested in: ' + (interests || '-') + '\n\n' + form.message.value;
      var c = window.SITE_CONTACT || {};
      window.open('https://wa.me/' + c.wa + '?text=' + encodeURIComponent(text), '_blank');
      document.getElementById('formOk').style.display = 'block';
    });
  }
})();
