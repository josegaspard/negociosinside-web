/* Negocios Inside · cuenta, comentarios, noticias, newsletter, métricas y panel */
(() => {
  const C = window.NI_CFG || {};
  if (!C.api || !C.anon) return;
  const B = C.base;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const H = { apikey: C.anon, Authorization: 'Bearer ' + C.anon, 'Content-Type': 'application/json' };
  const rest = async (path, opt = {}) => {
    const r = await fetch(`${C.api}/rest/v1/${path}`, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
    if (!r.ok) throw new Error((await r.text()) || r.status);
    return r.status === 204 ? null : r.json();
  };
  const MES = 'ene feb mar abr may jun jul ago sep oct nov dic'.split(' ');
  const fdate = (d) => { d = new Date(d); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
  const ago = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'ahora'; if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`; if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
    return fdate(d);
  };
  const nf = new Intl.NumberFormat('es-ES');
  const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const avatar = (url, name, cls = 'av') => url ? `<img class="${cls}" src="${esc(url)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<span class="${cls} av-i" aria-hidden="true">${esc(initials(name))}</span>`;
  const SECT = { emprendimiento: 'Emprendimiento', hosteleria: 'Hostelería', industria: 'Industria', retail: 'Retail', tecnologia: 'Tecnología', alimentacion: 'Alimentación', inmobiliario: 'Inmobiliario', finanzas: 'Finanzas pyme' };
  const sk = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '').replace('finanzaspyme', 'finanzas');
  const sname = (s) => SECT[sk(s)] || s || 'Negocios';

  /* ---------- avisos y confirmaciones propias (sin ventanas del navegador) ---------- */
  const toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('role', 'status'); document.body.appendChild(toastBox);
  const toast = (msg, bad) => {
    const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; toastBox.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
  };
  const ask = (title, text, ok = 'Confirmar', danger) => new Promise((res) => {
    const d = document.createElement('dialog'); d.className = 'ask';
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="ask-b"><button class="btn btn-o btn-sm" value="no">Cancelar</button><button class="btn ${danger ? 'btn-red' : 'btn-y'} btn-sm" value="si">${esc(ok)}</button></div></form>`;
    document.body.appendChild(d); d.showModal();
    d.addEventListener('close', () => { res(d.returnValue === 'si'); d.remove(); });
  });

  /* ---------- cliente de sesión (se carga solo si hace falta) ---------- */
  let sbP = null;
  const sb = () => sbP || (sbP = new Promise((res, rej) => {
    const make = () => res(window.supabase.createClient(C.api, C.anon, { auth: { storageKey: 'ni-auth', flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }));
    if (window.supabase) return make();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = make; s.onerror = () => rej(new Error('No se pudo cargar el acceso')); document.head.appendChild(s);
  }));
  const html = document.documentElement;
  const qs = new URLSearchParams(location.search);
  const returning = qs.has('code') || location.hash.includes('access_token') || qs.has('error_description');
  let me = null; // {user, profile}
  const loadMe = async () => {
    const s = await sb();
    const { data } = await s.auth.getSession();
    if (!data.session) { html.removeAttribute('data-auth'); me = null; return null; }
    html.dataset.auth = '1';
    const u = data.session.user;
    let { data: p } = await s.from('profiles').select('*').eq('id', u.id).maybeSingle();
    p = p || { display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email, avatar_url: u.user_metadata?.avatar_url, role: 'user', newsletter: true };
    me = { user: u, profile: p, admin: p.role === 'admin' };
    paintHeader(); return me;
  };
  const paintHeader = () => {
    $$('.nav-acc').forEach((a) => {
      if (!me) return;
      const n = me.profile.display_name || me.user.email;
      a.querySelector('.acc-ico').outerHTML = avatar(me.profile.avatar_url, n, 'acc-ico av-sm');
      a.setAttribute('aria-label', 'Mi cuenta');
    });
  };
  const oauth = async (provider, to) => {
    try {
      const s = await sb();
      sessionStorage.setItem('ni-volver', to || location.href);
      const { error } = await s.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + C.base + 'cuenta/' } });
      if (error) throw error;
    } catch (e) { toast(errMsg(e), 1); }
  };
  const errMsg = (e) => {
    const m = String(e?.message || e);
    if (/Invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/already registered|already been registered/i.test(m)) return 'Ese correo ya tiene cuenta. Entra con él.';
    if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera un minuto.';
    if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Este acceso aún no está activado. Usa tu correo.';
    if (/5 comentarios|rate/i.test(m)) return 'Vas muy rápido. Espera un momento.';
    return 'No se pudo completar. Inténtalo de nuevo.';
  };
  const G_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>';
  const X_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9zm-1.3 19.4h2L6.5 3.3H4.3z"/></svg>';
  const socialBtns = (to) => `<button class="sbtn" data-oauth="google" data-to="${esc(to || '')}">${G_ICO}<span>Continuar con Google</span></button><button class="sbtn sbtn-x" data-oauth="x" data-to="${esc(to || '')}">${X_ICO}<span>Continuar con X</span></button>`;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-oauth]'); if (!b) return;
    e.preventDefault(); b.disabled = true; oauth(b.dataset.oauth, b.dataset.to || location.href).finally(() => setTimeout(() => (b.disabled = false), 4000));
  });

  /* ---------- newsletter (todas las páginas) ---------- */
  $$('form[data-nl]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = $('input[type=email]', f), nm = $('input[name=nombre]', f), out = $('.nl-msg', f), btn = $('button', f);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { out.textContent = 'Escribe un correo válido.'; out.className = 'nl-msg bad'; em.focus(); return; }
    btn.disabled = true;
    try {
      const r = await rest('rpc/subscribe', { method: 'POST', body: JSON.stringify({ p_email: em.value.trim(), p_name: nm ? nm.value.trim() : '', p_source: f.dataset.nl }) });
      out.className = 'nl-msg ok';
      out.textContent = r === 'ya' ? 'Ya estabas suscrito. ¡Gracias!' : r === 'invalido' ? 'Ese correo no parece válido.' : 'Listo. Te llegará la próxima newsletter.';
      if (r !== 'invalido') f.reset();
    } catch (err) { out.className = 'nl-msg bad'; out.textContent = 'No se pudo guardar. Inténtalo en un momento.'; }
    btn.disabled = false;
  }));

  /* ---------- métricas del podcast (inicio) ---------- */
  const stats = $('[data-stats]');
  if (stats) rest('podcast_stats?select=subscribers,views,videos,shorts,taken_at,data&order=taken_at.desc&limit=1').then(([s]) => {
    if (!s) return;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    ['subscribers', 'views', 'videos', 'shorts'].forEach((k) => {
      const el = $(`[data-k=${k}]`, stats); if (!el || s[k] == null) return;
      const from = +el.dataset.v || 0, to = +s[k]; if (from === to) return;
      el.dataset.v = to;
      if (RM) { el.textContent = nf.format(to); return; }
      const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / 900); el.textContent = nf.format(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    const up = $('[data-updated]', stats); if (up) up.textContent = 'Actualizado ' + ago(s.taken_at);
  }).catch(() => {});

  /* ---------- portada de marca para noticias (sin fotos de terceros) ---------- */
  const cover = (n, big) => `<span class="nw-cover s-${sk(n.sector)}${big ? ' big' : ''}" aria-hidden="true"><span class="nw-cover-k">${esc(sname(n.sector))}</span><svg viewBox="0 0 24 32"><path d="M8.34 15.97A7 7 0 1 1 15.66 15.97L18 29H6Z" stroke-linejoin="round"/></svg></span>`;
  const nwCard = (n, big) => `<a class="nw-card${big ? ' nw-big' : ''}" href="${B}noticias/articulo/?n=${encodeURIComponent(n.slug)}">${cover(n, big)}<span class="nw-body"><span class="nw-k">${esc(sname(n.sector))} · ${fdate(n.published_at || n.created_at)}</span><span class="nw-t">${esc(n.title)}</span>${n.dek ? `<span class="nw-d">${esc(n.dek)}</span>` : ''}</span></a>`;
  const NSEL = 'slug,title,dek,sector,published_at,created_at,source_name';

  const teaser = $('[data-news-teaser]');
  if (teaser) rest(`news?select=${NSEL}&status=eq.published&order=published_at.desc&limit=7`).then((r) => {
    if (!r.length) return;
    const secs = [...new Set(r.map((n) => sname(n.sector)))];
    $('.nw-home', teaser).innerHTML = nwCard(r[0], true) + `<div class="nw-grid">${r.slice(1).map((n) => nwCard(n)).join('')}</div>`;
    const chips = $('.nw-secs', teaser);
    if (chips) chips.innerHTML = secs.map((x) => `<a class="chip" href="${B}noticias/#${encodeURIComponent(x)}">${esc(x)}</a>`).join('');
    teaser.hidden = false;
  }).catch(() => {});

  const nlist = $('#newsList');
  if (nlist) {
    const chipsBox = $('#newsChips');
    rest(`news?select=${NSEL}&status=eq.published&order=published_at.desc&limit=90`).then((r) => {
      if (!r.length) { nlist.innerHTML = '<p class="empty">Aún no hay noticias publicadas. Vuelve pronto.</p>'; return; }
      const secs = [...new Set(r.map((n) => sname(n.sector)))];
      chipsBox.innerHTML = '<button class="chip" aria-pressed="true" data-s="">Todas</button>' + secs.map((s) => `<button class="chip" aria-pressed="false" data-s="${esc(s)}">${esc(s)}</button>`).join('');
      const paint = (f) => {
        const list = f ? r.filter((n) => sname(n.sector) === f) : r;
        nlist.innerHTML = nwCard(list[0], true) + `<div class="nw-grid">${list.slice(1).map((n) => nwCard(n)).join('')}</div>`;
      };
      const h0 = decodeURIComponent(location.hash.slice(1));
      if (h0 && secs.includes(h0)) { $$('.chip', chipsBox).forEach((x) => x.setAttribute('aria-pressed', x.dataset.s === h0)); paint(h0); } else paint('');
      chipsBox.addEventListener('click', (e) => {
        const c = e.target.closest('.chip'); if (!c) return;
        $$('.chip', chipsBox).forEach((x) => x.setAttribute('aria-pressed', x === c));
        const run = () => paint(c.dataset.s);
        document.startViewTransition ? document.startViewTransition(run) : run();
      });
    }).catch(() => { nlist.innerHTML = '<p class="empty">No se pudieron cargar las noticias. Recarga la página.</p>'; });
  }

  /* limpia el HTML de la noticia: solo etiquetas de texto */
  const clean = (h) => {
    const t = document.createElement('template'); t.innerHTML = h || '';
    const ok = new Set(['P', 'H2', 'H3', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'A', 'BLOCKQUOTE', 'BR']);
    const walk = (n) => [...n.childNodes].forEach((c) => {
      if (c.nodeType === 8) { c.remove(); return; }
      if (c.nodeType !== 1) return;
      if (!ok.has(c.tagName)) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT)$/.test(c.tagName)) c.remove(); else { walk(c); c.replaceWith(...c.childNodes); } return; }
      [...c.attributes].forEach((a) => { if (!(c.tagName === 'A' && a.name === 'href')) c.removeAttribute(a.name); });
      if (c.tagName === 'A') { if (!/^https?:/i.test(c.getAttribute('href') || '')) c.removeAttribute('href'); c.rel = 'noopener nofollow'; c.target = '_blank'; }
      walk(c);
    });
    walk(t.content); return t.innerHTML;
  };

  const art = $('#newsArt');
  if (art) {
    const slug = qs.get('n') || '';
    rest(`news?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`).then(async ([n]) => {
      if (!n) { art.innerHTML = `<div class="wrap pg-hd"><h1>Noticia no encontrada</h1><p>Puede que se haya movido. <a class="lnk" href="${B}noticias/">Ver todas las noticias</a></p></div>`; return; }
      document.title = `${n.title} · Negocios Inside`;
      const md = $('meta[name=description]'); if (md) md.content = n.dek || n.title;
      art.innerHTML = `<div class="wrap art-top"><nav class="crumbs" aria-label="Migas"><a href="${B}">Inicio</a><span aria-hidden="true">/</span><a href="${B}noticias/">Noticias</a><span aria-hidden="true">/</span><span>${esc(sname(n.sector))}</span></nav>
        <h1>${esc(n.title)}</h1>${n.dek ? `<p class="epi-lead">${esc(n.dek)}</p>` : ''}<p class="art-meta">Redacción Negocios Inside · ${fdate(n.published_at || n.created_at)}</p></div>
        <div class="wrap art-grid"><div class="art-main">${cover(n, 1)}<div class="prose">${clean(n.body_html)}</div>
        ${n.source_url ? `<p class="art-src">Fuente: <a href="${esc(n.source_url)}" rel="noopener nofollow" target="_blank">${esc(n.source_name || new URL(n.source_url).hostname)}</a></p>` : ''}
        <section class="epi-sec" id="comentarios"><h2>Comentarios</h2><div data-comments data-page="noticias/${esc(n.slug)}"></div></section></div>
        <aside class="epi-side"><div class="side-box nl-side"><h2>La newsletter</h2><p>Lo mejor de la semana en negocios, en tu correo. Gratis.</p><form data-nl="noticia" novalidate><label class="sr" for="nlA">Correo</label><input id="nlA" type="email" placeholder="tu@correo.com" autocomplete="email" required><button class="btn btn-y btn-sm">Suscribirme</button><p class="nl-msg" aria-live="polite"></p></form></div>
        <div class="side-cta"><p>¿Tu empresa tiene algo que contar?</p><a class="btn btn-y" href="${B}contacto/">Propón tu empresa</a></div></aside></div>`;
      $$('form[data-nl]', art).forEach((f) => f.addEventListener('submit', async (e) => {
        e.preventDefault(); const em = $('input', f), out = $('.nl-msg', f);
        try { await rest('rpc/subscribe', { method: 'POST', body: JSON.stringify({ p_email: em.value.trim(), p_name: '', p_source: 'noticia' }) }); out.className = 'nl-msg ok'; out.textContent = 'Listo, suscrito.'; f.reset(); } catch { out.className = 'nl-msg bad'; out.textContent = 'Revisa el correo.'; }
      }));
      initComments($('[data-comments]', art));
      const more = await rest(`news?select=${NSEL}&status=eq.published&slug=neq.${encodeURIComponent(slug)}&order=published_at.desc&limit=3`).catch(() => []);
      if (more.length) art.insertAdjacentHTML('beforeend', `<section class="sec sec-tight"><div class="wrap"><h2 class="h-sm">Más noticias</h2><div class="nw-grid">${more.map((m) => nwCard(m)).join('')}</div></div></section>`);
    }).catch(() => { art.innerHTML = '<div class="wrap pg-hd"><h1>No se pudo cargar</h1><p>Recarga la página en un momento.</p></div>'; });
  }

  /* ---------- comentarios ---------- */
  function initComments(box) {
    if (!box || box.dataset.ready) return; box.dataset.ready = 1;
    const page = box.dataset.page;
    box.innerHTML = `<div class="cm-form-wrap"></div><ol class="cm-list" aria-live="polite"><li class="cm-sk"></li><li class="cm-sk"></li></ol>`;
    const list = $('.cm-list', box), fw = $('.cm-form-wrap', box);
    const here = location.href.split('#')[0] + '#comentarios';
    const formHtml = (pid) => `<form class="cm-form" data-pid="${pid || ''}"><label class="sr" for="cm-${pid || 'n'}">Tu comentario</label><textarea id="cm-${pid || 'n'}" rows="${pid ? 2 : 3}" maxlength="2000" placeholder="${pid ? 'Responde…' : 'Escribe lo que piensas, pregunta o aporta tu experiencia'}" required></textarea><div class="cm-fb"><span class="cm-c">0/2000</span>${pid ? '<button type="button" class="btn btn-o btn-sm cm-cancel">Cancelar</button>' : ''}<button class="btn btn-y btn-sm">${pid ? 'Responder' : 'Publicar'}</button></div></form>`;
    const paintForm = () => {
      if (me) {
        const n = me.profile.display_name || me.user.email;
        fw.innerHTML = `<div class="cm-me">${avatar(me.profile.avatar_url, n)}<span>Comentas como <b>${esc(n)}</b></span></div>` + formHtml();
      } else {
        fw.innerHTML = `<div class="cm-login"><p><b>Entra para comentar.</b> Tarda 5 segundos.</p><div class="sbtns">${socialBtns(here)}<a class="sbtn sbtn-m" href="${B}cuenta/?volver=${encodeURIComponent(here)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h18v12H3zM3 7l9 6 9-6"/></svg><span>Con tu correo</span></a></div></div>`;
      }
    };
    const load = async () => {
      let rows = [];
      try { rows = await rest(`comments_public?select=*&page=eq.${encodeURIComponent(page)}&order=created_at.asc&limit=300`); } catch { list.innerHTML = '<li class="empty">No se pudieron cargar los comentarios.</li>'; return; }
      const kids = {}; rows.forEach((c) => { if (c.parent_id) (kids[c.parent_id] = kids[c.parent_id] || []).push(c); });
      const one = (c, child) => `<li class="cm${child ? ' cm-child' : ''}" id="c${c.id}">${avatar(c.avatar_url, c.display_name)}<div class="cm-b"><div class="cm-h"><b>${esc(c.display_name || 'Lector')}</b><time datetime="${c.created_at}">${ago(c.created_at)}</time></div><p>${esc(c.body).replace(/\n/g, '<br>')}</p><div class="cm-a">${!child && me ? `<button data-reply="${c.id}">Responder</button>` : ''}${me && (me.user.id === c.user_id || me.admin) ? `<button data-del="${c.id}">${me.user.id === c.user_id ? 'Borrar' : 'Ocultar'}</button>` : ''}</div>${!child ? `<ol class="cm-kids">${(kids[c.id] || []).map((k) => one(k, 1)).join('')}</ol>` : ''}</div></li>`;
      const top = rows.filter((c) => !c.parent_id).reverse();
      list.innerHTML = top.length ? top.map((c) => one(c)).join('') : '<li class="empty">Todavía no hay comentarios. Sé el primero.</li>';
      const h = $('h2', box.closest('section')); if (h) h.dataset.n = rows.length ? ` (${rows.length})` : '';
    };
    box.addEventListener('input', (e) => { if (e.target.tagName === 'TEXTAREA') { const c = $('.cm-c', e.target.form); if (c) c.textContent = `${e.target.value.length}/2000`; } });
    box.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, ta = $('textarea', f), btn = $('.btn-y', f);
      const body = ta.value.trim(); if (body.length < 2) { ta.focus(); return; }
      btn.disabled = true;
      try {
        const s = await sb(); const { error } = await s.from('comments').insert({ page, body, parent_id: f.dataset.pid ? +f.dataset.pid : null });
        if (error) throw error; ta.value = ''; toast('Comentario publicado'); await load();
        if (f.dataset.pid) f.remove();
      } catch (err) { toast(errMsg(err), 1); }
      btn.disabled = false;
    });
    box.addEventListener('click', async (e) => {
      const r = e.target.closest('[data-reply]'), d = e.target.closest('[data-del]'), cc = e.target.closest('.cm-cancel');
      if (cc) { cc.closest('form').remove(); return; }
      if (r) { const li = $(`#c${r.dataset.reply} .cm-b`, box); if (!$('.cm-form', li)) { li.insertAdjacentHTML('beforeend', formHtml(r.dataset.reply)); $('textarea', li).focus(); } return; }
      if (d) {
        const own = d.textContent === 'Borrar';
        if (!(await ask(own ? '¿Borrar tu comentario?' : '¿Ocultar este comentario?', own ? 'Se elimina para siempre.' : 'Dejará de verse en la web. Puedes volver a mostrarlo desde el panel.', own ? 'Borrar' : 'Ocultar', 1))) return;
        const s = await sb();
        const q = own ? s.from('comments').delete().eq('id', d.dataset.del) : s.from('comments').update({ status: 'hidden' }).eq('id', d.dataset.del);
        const { error } = await q; if (error) toast(errMsg(error), 1); else { toast(own ? 'Comentario borrado' : 'Comentario oculto'); load(); }
      }
    });
    paintForm(); load();
    box._refresh = () => { paintForm(); load(); };
  }
  $$('[data-comments]').forEach(initComments);

  /* ---------- sesión: arranque ---------- */
  const needSb = html.dataset.auth || returning || $('#acct') || $('#panel');
  if (needSb) loadMe().then(() => $$('[data-comments]').forEach((b) => b._refresh && b._refresh())).catch(() => {});

  /* ---------- página «Mi cuenta» ---------- */
  const acct = $('#acct');
  if (acct) {
    const volver = qs.get('volver') || sessionStorage.getItem('ni-volver') || '';
    const safeBack = (u) => { try { const x = new URL(u, location.href); return x.origin === location.origin && x.pathname.startsWith(C.base) && !x.pathname.startsWith(C.base + 'cuenta') ? x.href : ''; } catch { return ''; } };
    let mode = 'in';
    const paintOut = (msg) => {
      acct.innerHTML = `<div class="auth">
        <div class="auth-side"><img src="${B}img/logo.webp" alt="" width="150" height="48"><h1>Entra en Negocios Inside</h1><ul class="ticks"><li>Comenta los episodios y las noticias</li><li>Recibe la newsletter con lo mejor de la semana</li><li>Propón tu empresa para el próximo episodio</li></ul></div>
        <div class="auth-card">
          ${msg ? `<p class="auth-msg">${msg}</p>` : ''}
          <div class="sbtns sbtns-col">${socialBtns(volver)}</div>
          <div class="or"><span>o con tu correo</span></div>
          <div class="tabs" role="tablist"><button role="tab" aria-selected="${mode === 'in'}" data-m="in">Entrar</button><button role="tab" aria-selected="${mode === 'up'}" data-m="up">Crear cuenta</button></div>
          <form class="form auth-f" novalidate>
            ${mode === 'up' ? '<div class="f"><label for="a-n">Nombre</label><input id="a-n" autocomplete="name" required></div>' : ''}
            <div class="f"><label for="a-e">Correo</label><input id="a-e" type="email" autocomplete="email" required></div>
            <div class="f"><label for="a-p">Contraseña</label><div class="pw"><input id="a-p" type="password" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" minlength="8" required><button type="button" class="pw-t" aria-label="Mostrar contraseña">Ver</button></div>${mode === 'up' ? '<span class="hint">Mínimo 8 caracteres.</span>' : ''}</div>
            ${mode === 'up' ? '<label class="chk"><input type="checkbox" id="a-nl" checked><span>Quiero recibir la newsletter</span></label>' : ''}
            <button class="btn btn-y">${mode === 'up' ? 'Crear mi cuenta' : 'Entrar'}</button>
            <p class="err" id="a-err" role="alert"></p>
          </form>
          <div class="auth-alt"><button data-magic>Entrar sin contraseña (te enviamos un enlace)</button>${mode === 'in' ? '<button data-forgot>¿Olvidaste tu contraseña?</button>' : ''}</div>
        </div></div>`;
    };
    const paintIn = () => {
      const p = me.profile, n = p.display_name || me.user.email;
      const prov = me.user.app_metadata?.provider || 'email';
      acct.innerHTML = `<div class="prof">
        <div class="prof-hd">${avatar(p.avatar_url, n, 'av-lg')}<div><h1>Hola, ${esc(n.split(' ')[0])}</h1><p class="muted">${esc(me.user.email || '')} · entras con ${prov === 'google' ? 'Google' : prov === 'x' || prov === 'twitter' ? 'X' : 'correo'}</p></div></div>
        ${safeBack(volver) ? `<a class="btn btn-y" href="${esc(safeBack(volver))}">Volver a donde estabas</a>` : ''}
        <div class="prof-grid">
          <form class="form prof-box" id="pf"><h2>Tu perfil</h2><div class="f"><label for="p-n">Nombre que se ve en tus comentarios</label><input id="p-n" value="${esc(p.display_name || '')}" maxlength="60" required></div><button class="btn btn-y btn-sm">Guardar</button></form>
          <div class="prof-box"><h2>Newsletter</h2><label class="sw"><input type="checkbox" id="p-nl" ${p.newsletter !== false ? 'checked' : ''}><span class="sw-ui" aria-hidden="true"></span><span>Recibir la newsletter de Negocios Inside</span></label><p class="muted">Una vez a la semana, como mucho. Te das de baja cuando quieras.</p></div>
          ${me.admin ? `<div class="prof-box prof-admin"><h2>Panel de Negocios Inside</h2><p class="muted">Noticias, comentarios, newsletter, usuarios y métricas.</p><a class="btn btn-y btn-sm" href="${B}panel/">Abrir el panel</a></div>` : ''}
        </div>
        <button class="btn btn-o btn-sm" id="logout">Cerrar sesión</button></div>`;
      $('#pf').addEventListener('submit', async (e) => {
        e.preventDefault(); const s = await sb(); const v = $('#p-n').value.trim(); if (!v) return;
        const { error } = await s.from('profiles').update({ display_name: v }).eq('id', me.user.id);
        if (error) toast(errMsg(error), 1); else { me.profile.display_name = v; toast('Perfil guardado'); }
      });
      $('#p-nl').addEventListener('change', async (e) => {
        const s = await sb(); const { error } = await s.rpc('my_newsletter', { p_on: e.target.checked });
        if (error) { toast(errMsg(error), 1); e.target.checked = !e.target.checked; } else toast(e.target.checked ? 'Suscrito a la newsletter' : 'Ya no recibirás la newsletter');
      });
      $('#logout').addEventListener('click', async () => { const s = await sb(); await s.auth.signOut(); localStorage.removeItem('ni-auth'); location.href = B; });
    };
    const paintReset = () => {
      acct.innerHTML = `<div class="auth auth-one"><div class="auth-card"><h1>Nueva contraseña</h1><form class="form" id="rf"><div class="f"><label for="r-p">Contraseña nueva</label><input id="r-p" type="password" minlength="8" autocomplete="new-password" required><span class="hint">Mínimo 8 caracteres.</span></div><button class="btn btn-y">Guardar contraseña</button><p class="err" role="alert"></p></form></div></div>`;
      $('#rf').addEventListener('submit', async (e) => {
        e.preventDefault(); const v = $('#r-p').value; if (v.length < 8) { $('#rf .err').textContent = 'Mínimo 8 caracteres.'; return; }
        const s = await sb(); const { error } = await s.auth.updateUser({ password: v });
        if (error) $('#rf .err').textContent = errMsg(error); else { toast('Contraseña cambiada'); history.replaceState(null, '', C.base + 'cuenta/'); await loadMe(); paintIn(); }
      });
    };
    acct.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-m]'); if (t) { mode = t.dataset.m; paintOut(); $('#a-e').focus(); return; }
      if (e.target.closest('.pw-t')) { const i = $('#a-p'); const b = e.target.closest('.pw-t'); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Ver' : 'Ocultar'; return; }
      const mg = e.target.closest('[data-magic]'), fg = e.target.closest('[data-forgot]');
      if (mg || fg) {
        const em = $('#a-e').value.trim(), err = $('#a-err');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = 'Escribe primero tu correo arriba.'; $('#a-e').focus(); return; }
        const s = await sb();
        const { error } = mg ? await s.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + C.base + 'cuenta/' } }) : await s.auth.resetPasswordForEmail(em, { redirectTo: location.origin + C.base + 'cuenta/?reset=1' });
        if (error) err.textContent = errMsg(error); else paintOut(mg ? `Te hemos enviado un enlace a <b>${esc(em)}</b>. Ábrelo desde este dispositivo.` : `Si <b>${esc(em)}</b> tiene cuenta, te llegará un correo para cambiar la contraseña.`);
      }
    });
    acct.addEventListener('submit', async (e) => {
      if (!e.target.classList.contains('auth-f')) return;
      e.preventDefault(); const err = $('#a-err'), btn = $('.btn-y', e.target); err.textContent = '';
      const em = $('#a-e').value.trim(), pw = $('#a-p').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = 'Escribe un correo válido.'; return; }
      if (pw.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
      btn.disabled = true;
      try {
        const s = await sb();
        if (mode === 'up') {
          const name = $('#a-n').value.trim();
          if (!name) { err.textContent = 'Escribe tu nombre.'; btn.disabled = false; return; }
          const { data, error } = await s.auth.signUp({ email: em, password: pw, options: { data: { full_name: name, newsletter: $('#a-nl').checked }, emailRedirectTo: location.origin + C.base + 'cuenta/' } });
          if (error) throw error;
          if (!data.session) { paintOut(`Revisa tu correo <b>${esc(em)}</b> para confirmar la cuenta.`); return; }
          if (!$('#a-nl').checked) await s.rpc('my_newsletter', { p_on: false });
        } else {
          const { error } = await s.auth.signInWithPassword({ email: em, password: pw }); if (error) throw error;
        }
        await done();
      } catch (er) { err.textContent = errMsg(er); }
      btn.disabled = false;
    });
    const done = async () => {
      await loadMe(); const back = safeBack(volver); sessionStorage.removeItem('ni-volver');
      if (back) { location.href = back; return; }
      history.replaceState(null, '', C.base + 'cuenta/'); paintIn();
    };
    (async () => {
      try {
        const s = await sb();
        let recovery = qs.has('reset');
        s.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; paintReset(); } });
        if (qs.get('error_description')) { paintOut(`No se pudo entrar: ${esc(qs.get('error_description'))}. Prueba con tu correo.`); return; }
        await loadMe();
        if (me && recovery) return paintReset();
        if (me) return returning ? done() : paintIn();
        paintOut();
      } catch { acct.innerHTML = '<p class="empty">No se pudo conectar. Recarga la página.</p>'; }
    })();
  }

  /* ---------- panel ---------- */
  const panel = $('#panel');
  if (panel) import(C.base + 'assets/panel.js?v=' + C.v).then((m) => m.default({ C, sb, loadMe, getMe: () => me, esc, toast, ask, fdate, ago, nf, avatar, sname, clean, errMsg })).catch(() => { panel.innerHTML = '<p class="empty">No se pudo cargar el panel.</p>'; });
})();
