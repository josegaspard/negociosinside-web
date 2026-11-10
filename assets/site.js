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
    let k = 0;
    const caps = $$('.kh-cap'), capsBox = $('#khCaps');
    if (slides.length > 1 && !RM) setInterval(() => {
      slides[k].classList.remove('on'); caps[k].classList.remove('on');
      k = (k + 1) % slides.length;
      slides[k].classList.add('on'); caps[k].classList.add('on');
    }, 4200);
    hero.classList.add('kh-intro');
    const ease = t => 1 - Math.pow(1 - t, 3);
    let ticking = false;
    const frame = () => {
      ticking = false;
      const mob = innerWidth < 861;
      const vw = innerWidth, vh = innerHeight;
      // caja visible del viewBox 1600x1000 con "slice"
      const s = Math.max(vw / 1600, vh / 1000);
      const visW = vw / s, visH = vh / s, x0v = (1600 - visW) / 2, y0v = (1000 - visH) / 2;
      const bx = mob ? 800 : x0v + visW * 0.74;
      const by = mob ? y0v + visH * 0.25 : 440;
      const base = mob ? 0.4 : 1.05;
      const span = hero.offsetHeight - vh;
      const p = RM ? 0 : Math.min(1, Math.max(0, scrollY / span));
      const e = ease(p);
      const sc = base * (1 + Math.pow(p, 2.1) * 42);
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

  /* aparición de rejillas (una sola vez) */
  if (!RM && 'IntersectionObserver' in window) {
    const els = $$('.ep-grid > *, .clips > *, .temas > *, .offers > *, .steps > li');
    els.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        const sib = [...en.target.parentElement.children].filter(c => c.classList.contains('reveal') && !c.classList.contains('in'));
        const i = Math.max(0, sib.indexOf(en.target));
        en.target.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
        en.target.classList.add('in'); io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  }

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

  /* carrusel de shorts */
  const car = $('#shorts');
  $$('[data-car]').forEach(b => b.addEventListener('click', () => car.scrollBy({ left: +b.dataset.car * car.clientWidth * 0.8, behavior: RM ? 'auto' : 'smooth' })));

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

  /* contacto: valida y abre el correo con el mensaje escrito */
  const form = $('#form');
  if (form) {
    const q = new URLSearchParams(location.search).get('motivo');
    if (q) { const r = $(`input[name=motivo][value="${q}"]`, form); if (r) r.checked = true; }
    const labels = { visita: 'Quiero que entréis en mi empresa', patrocinio: 'Patrocinar un episodio', produccion: 'Producir mi videopodcast', otro: 'Contacto' };
    const setErr = (inp, id, msg) => { $(id).textContent = msg; inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) inp.setAttribute('aria-describedby', id.slice(1)); };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = $('#f-n'), em = $('#f-e'), ms = $('#f-m');
      let ok = true;
      setErr(n, '#e-n', n.value.trim() ? '' : 'Escribe tu nombre.'); ok = ok && !!n.value.trim();
      const ve = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim());
      setErr(em, '#e-e', ve ? '' : 'Escribe un correo válido, por ejemplo nombre@empresa.com.'); ok = ok && ve;
      setErr(ms, '#e-m', ms.value.trim().length > 9 ? '' : 'Cuéntanos un poco más (mínimo 10 caracteres).'); ok = ok && ms.value.trim().length > 9;
      if (!ok) { $('[aria-invalid=true]', form).focus(); return; }
      const mot = $('input[name=motivo]:checked', form).value;
      const emp = $('#f-c').value.trim();
      const subject = `${labels[mot]}${emp ? ' · ' + emp : ''}`;
      const bodyTxt = `Nombre: ${n.value.trim()}\nCorreo: ${em.value.trim()}\nEmpresa: ${emp || '-'}\nMotivo: ${labels[mot]}\n\n${ms.value.trim()}`;
      location.href = `mailto:busiinessshark@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyTxt)}`;
      $('#formOk').hidden = false;
    });
  }
})();
