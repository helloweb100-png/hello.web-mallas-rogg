/* =====================================================================
   MALLAS ROGG | script.js
   Dependencias opcionales (el sitio funciona sin ellas, solo con menos efectos):
     GSAP + ScrollTrigger (scroll horizontal, progreso, parallax)
     Lenis (scroll suave con inercia)
   Sin listeners de "scroll": se usa IntersectionObserver y ScrollTrigger.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     0. UTILIDADES Y ENTORNO
  --------------------------------------------------------------- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var root = document.documentElement;
  var WA_NUMBER = document.body.getAttribute('data-wa') || '525568380637';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  function waUrl(msg) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  // Cola de tareas que esperan a que termine el loader
  var readyQueue = [];
  function onReady(fn) {
    if (root.classList.contains('is-ready')) { fn(); } else { readyQueue.push(fn); }
  }

  // Todos los enlaces con mensaje predefinido apuntan al WhatsApp configurado en <body data-wa>
  $$('[data-wa-msg]').forEach(function (a) { a.href = waUrl(a.getAttribute('data-wa-msg')); });

  /* ---------------------------------------------------------------
     1. SCROLL SUAVE (Lenis) + SINCRONÍA CON GSAP
  --------------------------------------------------------------- */
  var lenis = null;
  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); }

  if (typeof window.Lenis !== 'undefined' && !reduceMotion) {
    lenis = new window.Lenis({
      duration: 1.35,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.9
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
    lenis.stop(); // se activa al terminar el loader
  }

  function scrollToTarget(el) {
    if (!el) return;
    if (lenis) { lenis.scrollTo(el, { offset: -56, duration: 1.8 }); }
    else { el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
  }

  /* ---------------------------------------------------------------
     2. LOADER (spinner + contador + cortina que se abre)
  --------------------------------------------------------------- */
  (function loaderModule() {
    var loader = $('#loader');
    if (!loader) { root.classList.remove('is-loading'); root.classList.add('is-ready'); return; }

    var bar = $('#loaderBar'), count = $('#loaderCount'), status = $('#loaderStatus');
    var STEPS = [[0, 'Midiendo el perímetro'], [35, 'Tensando la malla'], [70, 'Asegurando los accesos'], [100, 'Todo listo']];
    var MIN_MS = reduceMotion ? 350 : 2200;
    var pageLoaded = document.readyState === 'complete';
    var shown = 0, finished = false, t0 = performance.now(), lastStep = -1;

    window.addEventListener('load', function () { pageLoaded = true; });

    function render(p) {
      var pct = Math.round(p * 100);
      bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      count.textContent = pct;
      for (var i = STEPS.length - 1; i >= 0; i--) {
        if (pct >= STEPS[i][0]) {
          if (i !== lastStep) { lastStep = i; status.textContent = STEPS[i][1]; }
          break;
        }
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      render(1);
      setTimeout(function () {
        loader.classList.add('is-leaving');
        root.classList.remove('is-loading');
        setTimeout(function () {
          root.classList.add('is-ready');
          if (lenis) lenis.start();
          readyQueue.splice(0).forEach(function (fn) { fn(); });
        }, 380);
        setTimeout(function () {
          loader.classList.add('is-done');
          if (hasGSAP) ScrollTrigger.refresh();
        }, 1400);
      }, 400);
    }

    function tick(now) {
      if (finished) return;
      var progress = Math.min(1, (now - t0) / MIN_MS);
      var eased = 1 - Math.pow(1 - progress, 2.4);
      var goal = Math.min(eased, pageLoaded ? 1 : 0.92); // espera en 92% si la página aún carga
      shown += (goal - shown) * 0.2;
      if (goal >= 1 && shown > 0.995) { finish(); return; }
      render(shown);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(finish, 9000); // seguro: nunca dejar al usuario atrapado
  })();

  /* ---------------------------------------------------------------
     3. NAVEGACIÓN, MENÚ MÓVIL Y ENLACES ANCLA
  --------------------------------------------------------------- */
  var header = $('#header'), sentinel = $('#top-sentinel');
  if (header && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  // Enlace activo según la sección visible
  (function navSpy() {
    var links = $$('[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('data-nav') === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['inicio', 'nosotros', 'servicios', 'colores', 'proceso', 'ventajas', 'faq', 'contacto'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  })();

  var burger = $('#burger'), menu = $('#menu');
  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    if (lenis) lenis.stop(); else root.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    if (lenis) lenis.start(); else root.style.overflow = '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) closeMenu(); else openMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', closeMenu);
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      closeMenu();
      // Si el menú estaba abierto, esperamos a que Lenis vuelva a estar activo
      setTimeout(function () { scrollToTarget(target); }, menu && menu.classList.contains('is-open') ? 0 : 20);
      if (history.replaceState) history.replaceState(null, '', id);
    });
  });

  /* ---------------------------------------------------------------
     4. TEXTO: separar palabras para animarlas
        mode 'mask'  -> cada palabra sube desde una máscara (titulares)
        mode 'flat'  -> cada palabra es un span (se ilumina con scroll)
  --------------------------------------------------------------- */
  function splitWords(el, mode) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (mode === 'mask') {
              var outer = document.createElement('span'); outer.className = 'sp';
              var inner = document.createElement('span'); inner.className = 'sp__in';
              inner.style.setProperty('--i', i++);
              inner.textContent = part;
              outer.appendChild(inner); frag.appendChild(outer);
            } else {
              var w = document.createElement('span'); w.className = 'sw'; w.textContent = part;
              frag.appendChild(w);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
  }
  $$('[data-split]').forEach(function (el) { splitWords(el, 'mask'); });
  $$('[data-words]').forEach(function (el) { splitWords(el, 'flat'); });

  /* ---------------------------------------------------------------
     5. REVELADO AL ENTRAR EN PANTALLA
  --------------------------------------------------------------- */
  (function reveal() {
    var items = $$('[data-reveal], [data-split]');
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------
     6. HERO: frase rotativa (animación constante)
  --------------------------------------------------------------- */
  (function rotator() {
    var el = $('#rotator');
    if (!el || reduceMotion) return;
    var words = $$('.rotator__w', el), i = 0;
    if (words.length < 2) return;
    function next() {
      var cur = words[i];
      i = (i + 1) % words.length;
      var nxt = words[i];
      cur.classList.remove('is-active'); cur.classList.add('is-prev');
      nxt.classList.remove('is-prev');   nxt.classList.add('is-active');
      setTimeout(function () { cur.classList.remove('is-prev'); }, 1100);
    }
    onReady(function () {
      setTimeout(function () {
        setInterval(function () { if (!document.hidden) next(); }, 2900);
      }, 1800);
    });
  })();

  /* ---------------------------------------------------------------
     7. HERO: MALLA CICLÓNICA INTERACTIVA (canvas)
        Rombos de cerco ciclónico que ondulan con el viento, se deforman
        con el cursor (o con un puntero fantasma si no hay cursor) y por
        los que viajan pulsos de energía, igual que una cerca electrificada.
  --------------------------------------------------------------- */
  (function mesh() {
    var canvas = $('#mesh');
    if (!canvas || !canvas.getContext) return;
    var hero = canvas.parentElement;
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, dpr = 1, cell = 56, dy = 31, cols = 0, rows = 0;
    var nodes = [], pulses = [], raf = 0, last = 0, start = performance.now();
    var ptr = { x: 0, y: 0, sx: null, sy: 0, last: -99999, real: false };

    function rnd(n) { return Math.floor(Math.random() * n); }

    function build() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cell = W < 640 ? 46 : (W < 1100 ? 54 : 62);
      dy = cell * 0.56;
      cols = Math.ceil(W / cell) + 3;
      rows = Math.ceil(H / dy) + 3;

      nodes = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var bx = c * cell + (r % 2) * cell / 2 - cell;
          var by = r * dy - dy;
          nodes.push({ bx: bx, by: by, x: bx, y: by, h: 0 });
        }
      }
      pulses = [];
      var n = W < 640 ? 3 : 6;
      for (var i = 0; i < n; i++) pulses.push(newPulse());
    }

    // Vecino de un nodo: dir 0=arriba-izq, 1=arriba-der, 2=abajo-izq, 3=abajo-der
    function neighbor(r, c, dir) {
      var e = r % 2;
      var rr = r + (dir < 2 ? -1 : 1);
      var cc = c + ((dir & 1) === 0 ? -1 + e : e);
      if (rr < 1 || rr > rows - 2 || cc < 1 || cc > cols - 2) return -1;
      return rr * cols + cc;
    }

    function newPulse() {
      for (var tries = 0; tries < 20; tries++) {
        var r = 2 + rnd(rows - 4), c = 2 + rnd(cols - 4), dir = rnd(4);
        var nx = neighbor(r, c, dir);
        if (nx >= 0) {
          return { cur: r * cols + c, next: nx, dir: dir, t: Math.random(), speed: 1.6 + Math.random() * 1.6, trail: [] };
        }
      }
      return { cur: 0, next: 1, dir: 3, t: 0, speed: 2, trail: [] };
    }

    function stepPulses(dt) {
      for (var k = 0; k < pulses.length; k++) {
        var p = pulses[k];
        p.t += dt * p.speed;
        while (p.t >= 1) {
          p.t -= 1;
          p.trail.push(p.cur);
          if (p.trail.length > 9) p.trail.shift();
          p.cur = p.next;
          var r = Math.floor(p.cur / cols), c = p.cur % cols, dir = p.dir, roll = Math.random();
          if (roll > 0.58) dir ^= 1;     // zigzag horizontal
          if (roll > 0.95) dir ^= 2;     // cambio de sentido vertical
          var nx = neighbor(r, c, dir);
          if (nx < 0) { dir ^= 2; nx = neighbor(r, c, dir); }
          if (nx < 0) { pulses[k] = newPulse(); break; }
          p.dir = dir; p.next = nx;
        }
      }
    }

    function frame(now, animate) {
      var t = (now - start) / 1000;

      // Puntero: el real, o uno fantasma que recorre la malla cuando nadie la toca
      var idle = !ptr.real || (now - ptr.last > 1800);
      var tx = ptr.x, ty = ptr.y;
      if (idle) {
        tx = W * (0.5 + 0.34 * Math.sin(t * 0.42));
        ty = H * (0.5 + 0.28 * Math.sin(t * 0.31 + 1.3));
      }
      if (ptr.sx === null) { ptr.sx = tx; ptr.sy = ty; }
      ptr.sx += (tx - ptr.sx) * 0.06;
      ptr.sy += (ty - ptr.sy) * 0.06;

      var R = Math.min(230, W * 0.34), R2 = R * R, wind = animate ? 1 : 0;
      var i, n;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var x = n.bx + wind * (Math.sin(t * 0.7 + n.bx * 0.006 + n.by * 0.004) * 3.4 + Math.sin(t * 0.31 + n.by * 0.011) * 2);
        var y = n.by + wind * (Math.cos(t * 0.6 + n.bx * 0.005 - n.by * 0.006) * 3.4);
        n.h = 0;
        if (animate) {
          var dx = x - ptr.sx, dyy = y - ptr.sy, d2 = dx * dx + dyy * dyy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1, k = 1 - d / R, push = k * k * 36;
            x += dx / d * push; y += dyy / d * push; n.h = k;
          }
        }
        n.x = x; n.y = y;
      }

      // Construye las líneas una sola vez por cuadro y las reutiliza
      var base = new Path2D(), hot1 = new Path2D(), hot2 = new Path2D();
      for (var r = 0; r < rows - 1; r++) {
        var e = r % 2;
        for (var c = 0; c < cols; c++) {
          var a = nodes[r * cols + c];
          for (var s = 0; s < 2; s++) {
            var cc = c - 1 + e + s;
            if (cc < 0 || cc >= cols) continue;
            var b = nodes[(r + 1) * cols + cc];
            base.moveTo(a.x, a.y); base.lineTo(b.x, b.y);
            var h = (a.h + b.h) * 0.5;
            if (h > 0.5) { hot1.moveTo(a.x, a.y); hot1.lineTo(b.x, b.y); }
            else if (h > 0.12) { hot2.moveTo(a.x, a.y); hot2.lineTo(b.x, b.y); }
          }
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(142,192,247,0.2)';
      ctx.stroke(base);

      if (animate) {
        // Barrido diagonal de luz sobre toda la malla
        var span = W + H + 700, sx = ((t * 150) % span) - 350;
        var g = ctx.createLinearGradient(sx - 190, -190, sx + 190, 190);
        g.addColorStop(0, 'rgba(191,225,255,0)');
        g.addColorStop(0.5, 'rgba(191,225,255,0.62)');
        g.addColorStop(1, 'rgba(191,225,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.stroke(base);

        // Resalte de las líneas cercanas al puntero
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = 'rgba(142,192,247,0.5)'; ctx.stroke(hot2);
        ctx.strokeStyle = 'rgba(191,225,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke(hot1);
      }

      // Nudos
      ctx.fillStyle = 'rgba(191,225,255,0.4)';
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.x < -4 || n.x > W + 4 || n.y < -4 || n.y > H + 4) continue;
        if (n.h > 0.05) {
          ctx.fillStyle = 'rgba(214,236,255,' + (0.5 + 0.5 * n.h).toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(n.x, n.y, 1.6 + 2.4 * n.h, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(191,225,255,0.4)';
        } else {
          ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
        }
      }

      // Pulsos de energía
      if (animate) {
        for (var k2 = 0; k2 < pulses.length; k2++) {
          var p = pulses[k2], pts = [], j;
          for (j = 0; j < p.trail.length; j++) pts.push(nodes[p.trail[j]]);
          var cur = nodes[p.cur], nxt = nodes[p.next];
          pts.push(cur);
          var hx = cur.x + (nxt.x - cur.x) * p.t, hy = cur.y + (nxt.y - cur.y) * p.t;
          pts.push({ x: hx, y: hy });
          ctx.lineCap = 'round';
          for (j = 0; j < pts.length - 1; j++) {
            var al = (j + 1) / pts.length;
            ctx.strokeStyle = 'rgba(142,200,255,' + (al * 0.9).toFixed(2) + ')';
            ctx.lineWidth = 1 + al * 1.6;
            ctx.beginPath(); ctx.moveTo(pts[j].x, pts[j].y); ctx.lineTo(pts[j + 1].x, pts[j + 1].y); ctx.stroke();
          }
          var glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 18);
          glow.addColorStop(0, 'rgba(214,236,255,0.95)');
          glow.addColorStop(0.35, 'rgba(120,180,255,0.45)');
          glow.addColorStop(1, 'rgba(59,123,224,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(hx, hy, 18, 0, 6.2832); ctx.fill();
        }
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      stepPulses(dt);
      frame(now, true);
    }

    build();
    if (reduceMotion) {
      frame(performance.now(), false);
    }

    hero.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
      ptr.last = performance.now(); ptr.real = true;
    }, { passive: true });

    // Solo se anima mientras el hero está en pantalla
    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
        } else if (raf) {
          cancelAnimationFrame(raf); raf = 0;
        }
      }, { threshold: 0.02 }).observe(hero);
    } else if (!reduceMotion) {
      raf = requestAnimationFrame(loop);
    }

    // Reconstruir al cambiar de tamaño (ignora los saltos de la barra del navegador móvil)
    var rt = 0;
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          var r = canvas.getBoundingClientRect();
          if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 140) {
            build();
            if (reduceMotion) frame(performance.now(), false);
          }
        }, 150);
      }).observe(canvas);
    }
  })();

  /* ---------------------------------------------------------------
     8. CONTADORES
  --------------------------------------------------------------- */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        var el = e.target, target = parseInt(el.getAttribute('data-count'), 10), t0 = performance.now(), dur = 1700;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur);
          el.textContent = Math.round(target * (1 - Math.pow(2, -10 * p)));
          if (p < 1) requestAnimationFrame(step); else el.textContent = target;
        })(t0);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------
     9. INTERACCIONES DE PUNTERO: foco de luz y botones magnéticos
  --------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$('.spot').forEach(function (el) {
      var raf = 0;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.setProperty('--mx', x + 'px');
          el.style.setProperty('--my', y + 'px');
        });
      }, { passive: true });
    });

    $$('.btn--magnetic').forEach(function (btn) {
      var raf = 0;
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          btn.style.setProperty('--tx', x.toFixed(1) + 'px');
          btn.style.setProperty('--ty', y.toFixed(1) + 'px');
        });
      }, { passive: true });
      btn.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf);
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ---------------------------------------------------------------
     10. EFECTOS DE SCROLL (GSAP + ScrollTrigger)
  --------------------------------------------------------------- */
  (function scrollFX() {
    if (!hasGSAP) { root.classList.add('no-gsap'); return; }

    // Barra de progreso de lectura
    gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

    if (reduceMotion) return;

    // Hero: el contenido sube y se desvanece al salir
    gsap.to('#heroInner', {
      yPercent: -10, opacity: 0.05, ease: 'none',
      scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom 30%', scrub: true }
    });

    // Texto de "Nosotros": las palabras se iluminan con el scroll
    var words = $$('.statement__text .sw');
    if (words.length) {
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: '.statement__text', start: 'top 82%', end: 'bottom 52%', scrub: true }
      });
    }

    // Parallax suave en las fotos del bento
    $$('.tile__img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img.closest('.tile'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Proceso: scroll horizontal fijado (solo escritorio)
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', function () {
      var section = $('#proceso'), pin = $('#processPin'), viewport = $('#processViewport'),
          track = $('#processTrack'), bar = $('#processBar');
      if (!section || !pin || !track) return;
      section.classList.add('is-pan');
      function dist() { return Math.max(0, track.offsetWidth - viewport.clientWidth); }
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin, start: 'top top', end: function () { return '+=' + (dist() + 160); },
          pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1
        }
      });
      tl.to(track, { x: function () { return -dist(); } }, 0);
      if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1 }, 0);
      return function () { section.classList.remove('is-pan'); gsap.set(track, { clearProps: 'transform' }); };
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  })();

  /* ---------------------------------------------------------------
     11. CONFIGURADOR DE COLOR (cinta de privacidad)
  --------------------------------------------------------------- */
  (function colors() {
    var group = $('.swatches');
    if (!group) return;
    var swatches = $$('.swatch', group), imgs = $$('.colors__img'),
        caption = $('#colorCaption'), cta = $('#colorCta'), ctaText = $('#colorCtaText');

    function select(sw, focus) {
      swatches.forEach(function (s) {
        var on = s === sw;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-checked', on ? 'true' : 'false');
        s.tabIndex = on ? 0 : -1;
      });
      imgs.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-color') === sw.getAttribute('data-color')); });
      caption.textContent = sw.getAttribute('data-caption');
      var label = sw.getAttribute('data-label');
      ctaText.textContent = 'Quiero la cinta ' + label;
      cta.href = waUrl('Hola, quiero cotizar cinta de privacidad en color ' + label + '.');
      if (focus) sw.focus();
    }

    swatches.forEach(function (sw, i) {
      sw.addEventListener('click', function () { select(sw); });
      sw.addEventListener('keydown', function (e) {
        var n = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % swatches.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + swatches.length) % swatches.length;
        if (n > -1) { e.preventDefault(); select(swatches[n], true); }
      });
    });
  })();

  /* ---------------------------------------------------------------
     12. PREGUNTAS FRECUENTES (acordeón accesible)
  --------------------------------------------------------------- */
  $$('.faq-item').forEach(function (item) {
    var q = $('.faq-item__q', item);
    q.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 650);
    });
  });

  /* ---------------------------------------------------------------
     13. FORMULARIO -> WHATSAPP
  --------------------------------------------------------------- */
  (function form() {
    var f = $('#quoteForm');
    if (!f) return;
    var status = $('#formStatus');
    var RULES = {
      nombre:   { el: '#f-nombre',   err: '#e-nombre',   msg: 'Escribe tu nombre para poder atenderte.',          ok: function (v) { return v.trim().length >= 3; } },
      telefono: { el: '#f-tel',      err: '#e-tel',      msg: 'Escribe un teléfono de 10 dígitos.',               ok: function (v) { return v.replace(/\D/g, '').length >= 10; } },
      servicio: { el: '#f-servicio', err: '#e-servicio', msg: 'Elige el servicio que necesitas.',                 ok: function (v) { return v !== ''; } }
    };

    function check(key) {
      var rule = RULES[key], input = $(rule.el), errEl = $(rule.err), field = input.closest('.field');
      var valid = rule.ok(input.value);
      field.classList.toggle('has-error', !valid);
      errEl.textContent = valid ? '' : rule.msg;
      input.setAttribute('aria-invalid', valid ? 'false' : 'true');
      return valid;
    }

    Object.keys(RULES).forEach(function (key) {
      var input = $(RULES[key].el);
      input.addEventListener('blur', function () { if (input.value) check(key); });
      input.addEventListener('input', function () { if (input.closest('.field').classList.contains('has-error')) check(key); });
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(RULES).forEach(function (key) { if (!check(key) && !firstBad) firstBad = $(RULES[key].el); });
      if (firstBad) {
        status.classList.remove('is-ok');
        status.textContent = 'Revisa los campos marcados para continuar.';
        firstBad.focus();
        return;
      }

      var val = function (id) { return ($(id).value || '').trim(); };
      var msg = [
        'Hola, soy ' + val('#f-nombre') + '. Quiero cotizar: ' + val('#f-servicio') + '.',
        val('#f-medidas') ? 'Medidas aproximadas: ' + val('#f-medidas') : '',
        val('#f-zona') ? 'Ubicación: ' + val('#f-zona') : '',
        val('#f-mensaje') ? 'Detalles: ' + val('#f-mensaje') : '',
        'Mi teléfono: ' + val('#f-tel'),
        'Enviado desde el sitio web de Mallas Rogg.'
      ].filter(Boolean).join('\n');

      var url = waUrl(msg);
      window.open(url, '_blank', 'noopener');
      status.classList.add('is-ok');
      status.innerHTML = 'Listo. Abrimos WhatsApp con tu solicitud. Si no se abrió, <a href="' + url + '" target="_blank" rel="noopener">toca aquí</a>.';
    });
  })();

  /* ---------------------------------------------------------------
     14. WHATSAPP FLOTANTE: aviso discreto una sola vez por sesión
  --------------------------------------------------------------- */
  (function waTip() {
    var tip = $('#waTip');
    if (!tip) return;
    try { if (sessionStorage.getItem('waTipShown')) return; } catch (e) { /* sin almacenamiento */ }
    onReady(function () {
      setTimeout(function () {
        tip.classList.add('is-show');
        try { sessionStorage.setItem('waTipShown', '1'); } catch (e) { /* sin almacenamiento */ }
        setTimeout(function () { tip.classList.remove('is-show'); }, 6500);
      }, 7000);
    });
  })();

})();
