(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* cabecera sólida al bajar */
  const hdr = $('#hdr');
  const hero = $('#khHero');
  const onHdr = () => {
    hdr.classList.toggle('solid', scrollY > 30);
  };
  addEventListener('scroll', onHdr, { passive: true }); onHdr();

  /* menú móvil */
  const burger = $('#burger'), nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : '';
    hdr.classList.toggle('menu', open); if (!open) onHdr();
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); burger.focus(); } });
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* héroe: cerradura que se abre al hacer scroll */
  if (hero) {
    const g = $('#khG'), ring = $('#khRing'), copy = $('#khCopy'), hint = $('#khHint');
    const slides = $$('.kh-slide');
    const caps = $$('.kh-cap'), capsBox = $('#khCaps');
    let k = 0, timer = 0;
    const show = (n) => {
      if (n === k) return;
      slides[k] && slides[k].classList.remove('on'); caps[k].classList.remove('on');
      k = n; slides[k] && slides[k].classList.add('on'); caps[k].classList.add('on');
      caps.forEach(c => c.tabIndex = capsBox.classList.contains('live') && c.classList.contains('on') ? 0 : -1);
    };
    const rotate = () => { if (!timer && slides.length > 1 && !RM) timer = setInterval(() => show((k + 1) % slides.length), 4200); };
    /* vídeo dentro de la cerradura: un plano por episodio, sincronizado con el pie */
    const vid = $('#khVid');
    const conn = navigator.connection || {};
    if (vid && !RM && !conn.saveData && !/(^|-)2g$/.test(conn.effectiveType || '')) {
      const seg = +vid.dataset.seg || 4.2;
      let vs = innerWidth < 861 || /3g/.test(conn.effectiveType || '') ? vid.dataset.sm : vid.dataset.lg;
      if (!vid.canPlayType('video/mp4; codecs="avc1.640028"')) vs = vs.replace('.mp4', '.webm');
      vid.src = vs;
      vid.addEventListener('playing', () => { clearInterval(timer); timer = 0; vid.classList.add('on'); }, { once: true });
      vid.addEventListener('timeupdate', () => show(Math.min(caps.length - 1, Math.floor(vid.currentTime / seg))));
      vid.addEventListener('error', rotate);
      const tryPlay = () => vid.play().catch(rotate);
      vid.preload = 'auto'; tryPlay();
      new IntersectionObserver(([en]) => { if (!vid.classList.contains('on')) return; en.isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }).observe(hero);
      setTimeout(() => { if (!vid.classList.contains('on')) rotate(); }, 3500);
    } else rotate();
    const ease = t => 1 - Math.pow(1 - t, 3);
    let ticking = false;
    const frame = () => {
      ticking = false;
      const mob = innerWidth < 861;
      const vw = innerWidth, vh = innerHeight;
      // caja visible del viewBox 1600x1000 con "slice"
      const s = Math.max(vw / 1600, vh / 1000);
      const visW = vw / s, visH = vh / s, x0v = (1600 - visW) / 2, y0v = (1000 - visH) / 2;
      // móvil: la cerradura cabe entre la cabecera y el titular (sin pisarlo)
      const av = copy.offsetTop - 78, kp = Math.min(vw * 0.66 / 240, av / 480);
      const base = mob ? kp / s : visH / 615;
      const bx = mob ? 800 : x0v + visW * 0.74;
      const by = mob ? y0v + (68 + Math.max(0, (av - 480 * kp) / 2) + 180 * kp) / s : y0v + visH * 0.54 - 60 * base;
      const span = hero.offsetHeight - vh;
      const p = RM ? 0 : Math.min(1, Math.max(0, scrollY / span));
      const e = ease(p);
      const sc = base * (1 + Math.pow(p, 2.1) * 26);
      const x = bx + (800 - bx) * e, y = by + (470 - by) * e;
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(3)})`);
      ring.setAttribute('transform', g.getAttribute('transform'));
      ring.style.opacity = Math.max(0, 1 - p * 5).toFixed(3);
      ring.setAttribute('stroke-width', (6 / sc).toFixed(3));
      const o = Math.max(0, 1 - p * 3.2);
      copy.style.opacity = o.toFixed(3);
      copy.style.transform = mob ? `translateY(${(-p * 120).toFixed(1)}px)` : `translateY(calc(-50% - ${(p * 120).toFixed(1)}px))`;
      copy.style.pointerEvents = o < 0.2 ? 'none' : '';
      if (hint) hint.style.opacity = Math.max(0, 1 - p * 8).toFixed(3);
      const p2 = Math.min(1, Math.max(0, (p - 0.62) / 0.3));
      hero.style.setProperty('--p2', p2.toFixed(3));
      const live = p2 > 0.6;
      capsBox.classList.toggle('live', live);
      caps.forEach(c => c.tabIndex = live && c.classList.contains('on') ? 0 : -1);
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); frame();
  }

  /* aparición de rejillas: el CSS ya las oculta desde el primer pintado (html.js) */
  const RSEL = '.ep-grid > *, .clips > *, .temas > *, .offers > *, .steps > li, .stats > *, .nw-grid > *';
  if (!RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        const sib = [...en.target.parentElement.children].filter(c => !c.classList.contains('in'));
        const i = Math.max(0, sib.indexOf(en.target));
        en.target.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
        en.target.classList.add('in'); io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    const watch = () => $$(RSEL).forEach(el => { if (!el.classList.contains('in') && !el._io) { el._io = 1; io.observe(el); } });
    watch(); new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
  } else document.documentElement.classList.add('rv-all');

  /* cortinilla de entrada (solo la primera visita al inicio en la sesión) */
  const intro = $('#intro');
  if (intro && document.documentElement.classList.contains('intro-on')) {
    const t0 = performance.now();
    const poster = $('.kh-slide.on');
    const ready = Promise.all([
      document.fonts ? document.fonts.ready : 0,
      poster && poster.decode ? poster.decode().catch(() => {}) : 0,
    ]);
    const end = () => {
      if (intro.dataset.done) return; intro.dataset.done = 1;
      const wait = Math.max(0, 650 - (performance.now() - t0));
      setTimeout(() => {
        document.documentElement.classList.add('intro-out');
        setTimeout(() => { document.documentElement.classList.remove('intro-on', 'intro-out'); intro.hidden = true; }, 900);
      }, wait);
      try { sessionStorage.setItem('ni-intro', '1'); } catch (e) {}
    };
    ready.then(end); setTimeout(end, 1600);
  } else if (intro) intro.hidden = true;

  /* reproductor en ventana (clips y shorts) */
  const dlg = $('#player'), frameBox = $('#playerFrame'), box = $('.player-box');
  const openPlayer = (id, vert) => {
    box.classList.toggle('vert', !!vert);
    frameBox.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="Vídeo de Negocios Inside" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    dlg.showModal(); document.body.style.overflow = 'hidden';
  };
  const closePlayer = () => { dlg.close(); };
  dlg.addEventListener('close', () => { frameBox.innerHTML = ''; document.body.style.overflow = ''; });
  $('#playerX').addEventListener('click', closePlayer);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closePlayer(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-yt]:not(#lite)');
    if (b) { e.preventDefault(); openPlayer(b.dataset.yt, b.dataset.short); }
  });

  /* reels de Instagram: se cargan al pulsar */
  $$('.reel-go').forEach(b => b.addEventListener('click', () => {
    const r = b.closest('.reel');
    r.innerHTML = `<iframe src="https://www.instagram.com/reel/${r.dataset.reel}/embed/" title="Reel de Negocios Inside en Instagram" allowtransparency="true" allow="encrypted-media; fullscreen"></iframe>`;
    r.classList.add('on');
  }));

  /* carrusel de shorts */
  const car = $('#shorts');
  if (car) $$('[data-car]').forEach(b => b.addEventListener('click', () => car.scrollBy({ left: +b.dataset.car * car.clientWidth * 0.8, behavior: RM ? 'auto' : 'smooth' })));

  /* episodio: vídeo ligero + capítulos */
  const lite = $('#lite');
  if (lite) {
    const id = lite.dataset.yt;
    const load = (t = 0) => {
      let fr = $('iframe', lite);
      if (fr) {
        fr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true] }), '*');
        fr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        return;
      }
      fr = document.createElement('iframe');
      fr.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&enablejsapi=1&playsinline=1&start=${t}`;
      fr.title = 'Episodio de Negocios Inside';
      fr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; fr.allowFullscreen = true;
      lite.appendChild(fr); $('.lite-play', lite).remove();
    };
    $('.lite-play', lite).addEventListener('click', () => load(0));
    $$('.chap').forEach(c => c.addEventListener('click', () => {
      $$('.chap.on').forEach(x => x.classList.remove('on')); c.classList.add('on');
      load(+c.dataset.t);
      const r = lite.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight) lite.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
    }));
  }
  const share = $('#share');
  if (share) share.addEventListener('click', async () => {
    const d = { title: share.dataset.title, url: share.dataset.url };
    try {
      if (navigator.share) { await navigator.share(d); return; }
      await navigator.clipboard.writeText(d.url);
      const t = share.textContent; share.textContent = 'Enlace copiado'; setTimeout(() => share.textContent = t, 2000);
    } catch (e) {}
  });

  /* filtros de episodios */
  const chips = $$('.chip');
  if (chips.length) {
    const apply = (f) => {
      const run = () => {
        chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.f === f));
        $$('#epGrid [data-tema], #clipGrid [data-tema]').forEach(el => el.classList.toggle('hide', f !== 'todos' && el.dataset.tema !== f));
      };
      if (document.startViewTransition && !RM) document.startViewTransition(run); else run();
    };
    chips.forEach(c => c.addEventListener('click', () => {
      apply(c.dataset.f);
      history.replaceState(null, '', c.dataset.f === 'todos' ? location.pathname : '#' + c.dataset.f.toLowerCase());
    }));
    const h = decodeURIComponent(location.hash.slice(1));
    const m = chips.find(c => c.dataset.f.toLowerCase() === h);
    if (m) apply(m.dataset.f);
  }

  /* contacto: valida y envía a hola@negociosinside.com (rpc/contact en el motor PHP) */
  const form = $('#form');
  if (form) {
    const mot = new URLSearchParams(location.search).get('motivo');
    if (mot) form.elements.motivo.value = mot;
    const setErr = (inp, id, msg) => { $(id).textContent = msg; inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) inp.setAttribute('aria-describedby', id.slice(1)); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = $('#f-n'), t = $('#f-t'), em = $('#f-e'), c = $('#f-c');
      const ve = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim()), vt = t.value.replace(/\D/g, '').length >= 7;
      setErr(n, '#e-n', n.value.trim() ? '' : 'Escribe tu nombre.');
      setErr(t, '#e-t', vt ? '' : 'Escribe un teléfono válido.');
      setErr(em, '#e-e', ve ? '' : 'Escribe un correo válido.');
      setErr(c, '#e-c', c.value.trim() ? '' : 'Escribe el nombre de tu empresa.');
      const bad = $('[aria-invalid=true]', form); if (bad) { bad.focus(); return; }
      const btn = $('button[type=submit]', form); btn.disabled = true; $('#formErr').hidden = true;
      try {
        const r = await fetch(`${(window.NI_CFG || {}).api || '/api'}/rest/v1/rpc/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ p_nombre: n.value.trim(), p_telefono: t.value.trim(), p_email: em.value.trim(), p_empresa: c.value.trim(), p_motivo: form.elements.motivo.value, p_web: form.elements.web.value, p_pagina: document.referrer || '' }) });
        const j = r.ok ? await r.json() : null;
        if (j === 'ok' || j === 'ya') { form.reset(); $('#formOk').hidden = false; }
        else { $('#formErr').hidden = false; }
      } catch (err) { $('#formErr').hidden = false; }
      btn.disabled = false;
    });
  }
})();
