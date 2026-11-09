/* 金彤阳 · 首屏娃娃机 */
(function () {
  var machine = document.getElementById('claw');
  if (!machine) return;
  var glass = document.getElementById('cmGlass');
  var clawEl = document.getElementById('cmClaw');
  var rope = clawEl.querySelector('.cm-rope');
  var hold = document.getElementById('cmHold');
  var pile = document.getElementById('cmPile');
  var goBtn = document.getElementById('cmGo');
  var modal = document.getElementById('prizeModal');
  var POOL = window.CLAW_PRIZES || [];
  var GOLD = window.CLAW_GOLD || null;

  var X_MIN = 33, X_MAX = 89, CHUTE_X = 13;   // % of glass width
  var ROPE_REST = 10;                          // px
  var x = 50, dir = 1, swinging = true, busy = false, manualUntil = 0, last = 0;
  var balls = [];

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------- pile ----------
  var SLOTS = [ // [x% center, row]
    [36.5, 0], [54, 0], [71.5, 0], [89, 0],
    [45.2, 1], [62.7, 1], [80.2, 1],
    [54, 2], [71.5, 2]
  ];
  function buildPile() {
    pile.innerHTML = '';
    balls = [];
    var picks = shuffle(POOL).slice(0, SLOTS.length - (GOLD ? 1 : 0));
    if (GOLD) picks.splice(1 + (Math.random() * (picks.length - 1) | 0), 0, GOLD);
    picks.forEach(function (p, i) {
      var b = document.createElement('div');
      b.className = 'ball' + (p.gold ? ' gold' : '');
      b.innerHTML = p.gold
        ? '<span class="g-star">★</span><span class="g-txt">大奖</span>'
        : '<img src="' + p.img + '" alt="' + p.name + '" draggable="false">';
      b.style.animationDelay = (i * 60) + 'ms';
      pile.appendChild(b);
      balls.push({ el: b, prize: p, slot: SLOTS[i] });
    });
    layout();
  }
  function layout() {
    var W = glass.clientWidth, H = glass.clientHeight, size = W * 0.215;
    balls.forEach(function (o) {
      if (o.taken) return;
      var cx = o.slot[0] / 100 * W, row = o.slot[1];
      var bottom = 6 + row * size * 0.74;
      o.el.style.width = o.el.style.height = size + 'px';
      o.el.style.left = (cx - size / 2) + 'px';
      o.el.style.top = (H - bottom - size) + 'px';
      o.cx = cx; o.top = H - bottom - size; o.size = size;
    });
  }
  window.addEventListener('resize', layout);

  // ---------- swing ----------
  function setX(v) { x = Math.max(X_MIN - 4, Math.min(X_MAX + 2, v)); clawEl.style.left = x + '%'; }
  function tick(t) {
    var dt = last ? Math.min(t - last, 50) : 16; last = t;
    if (swinging && !busy && t > manualUntil) {
      setX(x + dir * dt * 0.026);
      if (x >= X_MAX) dir = -1; else if (x <= X_MIN) dir = 1;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // arrows (hold to move)
  machine.querySelectorAll('[data-dir]').forEach(function (btn) {
    var timer = null;
    function start(e) {
      e.preventDefault(); if (busy) return;
      var d = +btn.dataset.dir;
      manualUntil = performance.now() + 2500;
      setX(x + d * 2);
      clearInterval(timer);
      timer = setInterval(function () { manualUntil = performance.now() + 2500; setX(x + d * 1.2); }, 30);
    }
    function stop() { clearInterval(timer); }
    btn.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
  });

  // ---------- grab sequence ----------
  async function grab() {
    if (busy) return;
    busy = true; machine.classList.add('busy');
    goBtn.disabled = true;
    var W = glass.clientWidth, H = glass.clientHeight;
    var clawX = x / 100 * W;
    var hand = clawEl.querySelector('.cm-hand'), handH = hand.offsetHeight;

    // choose target: nearest within reach, prefer upper row
    var cand = balls.filter(function (o) { return !o.taken && Math.abs(o.cx - clawX) < o.size * 0.62; });
    cand.sort(function (a, b) { return a.top - b.top || Math.abs(a.cx - clawX) - Math.abs(b.cx - clawX); });
    var target = cand[0];

    clawEl.classList.add('open');
    await sleep(260);
    var dropTo = target ? target.top + target.size * 0.32 - handH * 0.62 : H - handH - 8;
    rope.style.height = Math.max(ROPE_REST, dropTo) + 'px';
    await sleep(950);
    clawEl.classList.remove('open');
    await sleep(320);

    if (!target) {
      rope.style.height = ROPE_REST + 'px';
      await sleep(900);
      done(); return;
    }
    // attach ball to claw
    target.taken = true;
    var el = target.el;
    el.classList.add('held');
    el.style.left = ''; el.style.top = '';
    hold.appendChild(el);
    rope.style.height = ROPE_REST + 'px';
    await sleep(950);
    // carry to chute
    clawEl.classList.add('travel');
    setX(CHUTE_X);
    await sleep(1000);
    clawEl.classList.remove('travel');
    clawEl.classList.add('open');
    await sleep(180);
    // release: drop into chute
    var hr = hold.getBoundingClientRect(), gr = glass.getBoundingClientRect();
    el.classList.remove('held');
    el.classList.add('falling');
    el.style.left = (hr.left - gr.left - target.size / 2) + 'px';
    el.style.top = (hr.top - gr.top) + 'px';
    glass.appendChild(el);
    void el.offsetWidth;
    el.style.top = (H - target.size * 0.55) + 'px';
    el.style.opacity = '0';
    await sleep(650);
    clawEl.classList.remove('open');
    machine.classList.add('win');
    setTimeout(function () { machine.classList.remove('win'); }, 900);
    showPrize(target.prize);
  }

  function done() {
    busy = false; machine.classList.remove('busy'); goBtn.disabled = false;
  }

  function showPrize(p) {
    var box = modal.querySelector('.pz-body');
    if (p.gold) {
      box.innerHTML =
        '<div class="pz-gold"><span>★</span></div>' +
        '<p class="pz-kicker">手气太好了！</p><h3>抓到大奖</h3>' +
        '<p class="pz-desc">免费领取 <b>完整产品图册 + 批发价目表</b>，加微信发送“大奖”即可。</p>' +
        '<div class="pz-actions"><a href="#" class="btn btn-primary" data-wx>加微信免费领取</a><button class="btn btn-ghost pz-again" type="button">再抓一次</button></div>';
    } else {
      box.innerHTML =
        '<div class="pz-img"><img src="' + p.img + '" alt="' + p.name + '"></div>' +
        '<p class="pz-kicker">恭喜抓到</p><h3>' + p.name + '</h3>' +
        '<p class="pz-desc">' + p.desc + '</p>' +
        '<div class="pz-meta"><span>' + p.sizes + '</span><span>可定制</span><span>' + p.catName + '</span></div>' +
        '<div class="pz-actions"><a href="#" class="btn btn-primary" data-wx>加微信要报价</a><a class="btn btn-ghost" href="products.html#' + p.cat + '">看同系列款式</a></div>' +
        '<button class="pz-again pz-link" type="button">再抓一次 ↻</button>';
    }
    modal.classList.add('open');
    confetti();
  }

  function closePrize() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    var c = modal.querySelector('.pz-confetti'); if (c) c.innerHTML = '';
    reset();
  }
  function reset() {
    setX(CHUTE_X + 18);
    buildPile();
    done();
  }

  function confetti() {
    var c = modal.querySelector('.pz-confetti'); c.innerHTML = '';
    var colors = ['#E46A3C', '#F7DCD3', '#DCEAF4', '#E3EBD9', '#F2C14E'];
    for (var i = 0; i < 26; i++) {
      var s = document.createElement('i');
      s.style.left = (Math.random() * 100) + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.25) + 's';
      s.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      c.appendChild(s);
    }
  }

  goBtn.addEventListener('click', grab);
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('.pz-close') || e.target.closest('.pz-again')) { closePrize(); return; }
    if (e.target.closest('[data-wx]')) { modal.classList.remove('open'); setTimeout(reset, 300); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePrize(); });

  buildPile();
  setX(50);
})();
