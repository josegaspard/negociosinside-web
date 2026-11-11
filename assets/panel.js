/* Panel de Negocios Inside (solo administradores) */
export default async function panel(K) {
  const { C, sb, loadMe, esc, toast, ask, fdate, ago, nf, avatar, sname, clean, errMsg } = K;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = $('#panel');
  const s = await sb();
  const me = await loadMe();
  if (!me) { location.href = C.base + 'cuenta/?volver=' + encodeURIComponent(location.href); return; }
  if (!me.admin) { root.innerHTML = `<div class="pg-hd"><h1>Sin acceso</h1><p>Tu cuenta (${esc(me.user.email)}) no es administradora de Negocios Inside.</p><a class="btn btn-o" href="${C.base}">Ir al inicio</a></div>`; return; }

  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="' + C.base + 'assets/dash.css?v=' + C.v + '">');
  const GROUPS = [['Podcast', [['podcast', 'Inicio'], ['prospeccion', 'Prospección'], ['calendario', 'Calendario'], ['produccion', 'Producción'], ['finanzas', 'Finanzas'], ['objetivos', 'Objetivos'], ['informes', 'Informes'], ['redes', 'Redes']]],
    ['Web', [['resumen', 'Resumen'], ['noticias', 'Noticias'], ['comentarios', 'Comentarios'], ['newsletter', 'Newsletter'], ['usuarios', 'Usuarios']]]];
  root.innerHTML = `<div class="pn">
    <aside class="pn-side"><div class="pn-me">${avatar(me.profile.avatar_url, me.profile.display_name)}<div><b>${esc(me.profile.display_name || me.user.email)}</b><span>Administrador</span></div></div>
      <nav class="pn-nav" aria-label="Secciones del panel">${GROUPS.map(([g, tabs]) => `<span class="pn-g">${g}</span>` + tabs.map(([k, n]) => `<a href="#${k}" data-tab="${k}">${n}</a>`).join('')).join('')}</nav>
      <a class="pn-out" href="${C.base}">Ver la web</a></aside>
    <section class="pn-main" id="pnMain" tabindex="-1"></section></div>`;
  const main = $('#pnMain');
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  const fail = (e) => { main.innerHTML = `<p class="empty">Error: ${esc(e.message || e)}</p>`; };
  const kpi = (n, v, sub) => `<div class="kpi"><span class="kpi-n">${n}</span><span class="kpi-v">${v}</span>${sub ? `<span class="kpi-s">${sub}</span>` : ''}</div>`;

  /* ---------- resumen ---------- */
  async function resumen() {
    const [ov, st] = await Promise.all([q(s.rpc('admin_overview')), q(s.from('podcast_stats').select('*').order('taken_at', { ascending: false }).limit(30))]);
    const o = ov || {}; const last = st[0] || {}; const prev = st.find((x) => new Date(last.taken_at) - new Date(x.taken_at) > 6 * 864e5) || st[st.length - 1] || {};
    const diff = (k) => last[k] != null && prev[k] != null && last !== prev ? `${last[k] - prev[k] >= 0 ? '+' : ''}${nf.format(last[k] - prev[k])} en 7 días` : '';
    const prov = o.users_by_provider || o.por_proveedor || {};
    const latest = (last.data && last.data.latest) || [];
    main.innerHTML = `<h1>Resumen</h1>
      <h2 class="pn-h">El podcast en YouTube</h2>
      <div class="kpis">${kpi('Suscriptores', nf.format(last.subscribers ?? 0), diff('subscribers'))}${kpi('Visualizaciones', nf.format(last.views ?? 0), diff('views'))}${kpi('Vídeos', nf.format(last.videos ?? 0))}${kpi('Shorts', nf.format(last.shorts ?? 0))}</div>
      <p class="muted">Datos de ${last.taken_at ? ago(last.taken_at) : '—'}. Se actualizan cada día.</p>
      <h2 class="pn-h">La web</h2>
      <div class="kpis">${kpi('Usuarios', nf.format(o.users_total ?? o.usuarios ?? 0), `${nf.format(o.users_7d ?? o.altas_7d ?? 0)} nuevos en 7 días`)}${kpi('Suscriptores newsletter', nf.format(o.subscribers_active ?? o.suscriptores ?? 0))}${kpi('Comentarios 7 días', nf.format(o.comments_7d ?? o.comentarios_7d ?? 0))}${kpi('Noticias', nf.format(o.news_published ?? o.noticias_publicadas ?? 0), `${nf.format(o.news_draft ?? o.noticias_borrador ?? 0)} por revisar`)}</div>
      ${Object.keys(prov).length ? `<p class="pn-prov">${Object.entries(prov).map(([k, v]) => `<span>${esc(k === 'email' ? 'Correo' : k === 'google' ? 'Google' : k === 'x' || k === 'twitter' ? 'X' : k)}: <b>${nf.format(v)}</b></span>`).join('')}</p>` : ''}
      ${latest.length ? `<h2 class="pn-h">Últimos vídeos</h2><table class="tbl"><thead><tr><th>Vídeo</th><th>Tipo</th><th class="r">Vistas</th></tr></thead><tbody>${latest.map((v) => `<tr><td><a href="https://www.youtube.com/${v.is_short ? 'shorts/' : 'watch?v='}${esc(v.id)}" target="_blank" rel="noopener">${esc(String(v.title).replace(/#\S+/g, '').trim())}</a></td><td>${v.is_short ? 'Short' : 'Vídeo'}</td><td class="r">${nf.format(v.views || 0)}</td></tr>`).join('')}</tbody></table>` : ''}`;
  }

  /* ---------- noticias ---------- */
  async function noticias() {
    const [rows, set] = await Promise.all([q(s.from('news').select('id,slug,title,dek,sector,status,source_name,source_url,created_at,published_at').neq('status', 'discarded').order('created_at', { ascending: false }).limit(100)), q(s.from('settings').select('value').eq('key', 'news_autopublish').maybeSingle())]);
    const auto = set && set.value === true;
    const drafts = rows.filter((r) => r.status === 'draft'), pub = rows.filter((r) => r.status === 'published');
    const row = (n) => `<li class="nr" data-id="${n.id}"><div class="nr-b"><span class="nr-k">${esc(sname(n.sector))} · ${n.status === 'published' ? 'Publicada ' + fdate(n.published_at) : 'Borrador · ' + ago(n.created_at)}${n.source_name ? ' · fuente: ' + esc(n.source_name) : ''}</span><b>${esc(n.title)}</b>${n.dek ? `<span class="nr-d">${esc(n.dek)}</span>` : ''}</div>
      <div class="nr-a"><button class="btn btn-o btn-sm" data-edit="${n.id}">Revisar</button>${n.status === 'draft' ? `<button class="btn btn-y btn-sm" data-pub="${n.id}">Publicar</button><button class="btn btn-o btn-sm" data-disc="${n.id}">Descartar</button>` : `<a class="btn btn-o btn-sm" href="${C.base}noticias/articulo/?n=${encodeURIComponent(n.slug)}" target="_blank">Ver</a><button class="btn btn-o btn-sm" data-unpub="${n.id}">Retirar</button>`}</div></li>`;
    main.innerHTML = `<h1>Noticias</h1>
      <div class="pn-bar"><label class="sw"><input type="checkbox" id="autoP" ${auto ? 'checked' : ''}><span class="sw-ui" aria-hidden="true"></span><span>Publicar automáticamente lo que escribe la IA</span></label><span class="muted">${auto ? 'Las noticias salen solas cada 6 horas.' : 'La IA deja borradores cada 6 horas; aquí decides cuáles salen.'}</span></div>
      <h2 class="pn-h">Por revisar (${drafts.length})</h2><ul class="nrs">${drafts.map(row).join('') || '<li class="empty">No hay borradores pendientes.</li>'}</ul>
      <h2 class="pn-h">Publicadas (${pub.length})</h2><ul class="nrs">${pub.map(row).join('') || '<li class="empty">Aún no hay noticias publicadas.</li>'}</ul>`;
    $('#autoP').addEventListener('change', async (e) => {
      const { error } = await s.from('settings').upsert({ key: 'news_autopublish', value: e.target.checked });
      if (error) { toast(errMsg(error), 1); e.target.checked = !e.target.checked; } else { toast(e.target.checked ? 'Publicación automática activada' : 'Las noticias quedarán en borrador'); noticias(); }
    });
    main.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const id = +(b.dataset.pub || b.dataset.disc || b.dataset.unpub || b.dataset.edit || 0); if (!id) return;
      if (b.dataset.edit) return editNews(id);
      const patch = b.dataset.pub ? { status: 'published', published_at: new Date().toISOString() } : b.dataset.disc ? { status: 'discarded' } : { status: 'draft' };
      if (b.dataset.unpub && !(await ask('¿Retirar la noticia?', 'Dejará de verse en la web y volverá a borradores.', 'Retirar'))) return;
      const { error } = await s.from('news').update(patch).eq('id', id);
      if (error) toast(errMsg(error), 1); else { toast(b.dataset.pub ? 'Noticia publicada' : b.dataset.disc ? 'Noticia descartada' : 'Noticia retirada'); noticias(); }
    };
  }
  async function editNews(id) {
    const n = await q(s.from('news').select('*').eq('id', id).single());
    main.onclick = null;
    main.innerHTML = `<button class="lnk back" id="bk">← Volver a noticias</button><h1>Revisar noticia</h1>
      <form class="form ed" id="nf"><div class="f"><label for="n-t">Titular</label><input id="n-t" value="${esc(n.title)}" required></div>
      <div class="f"><label for="n-d">Entradilla</label><textarea id="n-d" rows="2">${esc(n.dek || '')}</textarea></div>
      <div class="f"><label for="n-s">Sector</label><input id="n-s" value="${esc(n.sector || '')}"></div>
      <div class="f"><label for="n-b">Texto (HTML sencillo: p, h2, ul, li, strong, a)</label><textarea id="n-b" rows="16" class="mono">${esc(n.body_html || '')}</textarea></div>
      <p class="muted">Fuente: ${n.source_url ? `<a href="${esc(n.source_url)}" target="_blank" rel="noopener">${esc(n.source_name || n.source_url)}</a>` : '—'}</p>
      <div class="cta-row"><button class="btn btn-y" name="a" value="save">Guardar</button>${n.status !== 'published' ? '<button class="btn btn-y" name="a" value="pub">Guardar y publicar</button>' : ''}</div></form>
      <h2 class="pn-h">Vista previa</h2><div class="prose prev" id="nPrev">${clean(n.body_html)}</div>`;
    $('#n-b').addEventListener('input', (e) => { $('#nPrev').innerHTML = clean(e.target.value); });
    $('#bk').onclick = noticias;
    $('#nf').addEventListener('submit', async (e) => {
      e.preventDefault(); const pubNow = e.submitter && e.submitter.value === 'pub';
      const patch = { title: $('#n-t').value.trim(), dek: $('#n-d').value.trim(), sector: $('#n-s').value.trim(), body_html: $('#n-b').value };
      if (pubNow) Object.assign(patch, { status: 'published', published_at: new Date().toISOString() });
      const { error } = await s.from('news').update(patch).eq('id', id);
      if (error) toast(errMsg(error), 1); else { toast(pubNow ? 'Guardada y publicada' : 'Guardada'); noticias(); }
    });
  }

  /* ---------- comentarios ---------- */
  async function comentarios() {
    const rows = await q(s.from('comments').select('id,page,body,status,created_at,profiles(display_name,email,avatar_url)').order('created_at', { ascending: false }).limit(200));
    const pageUrl = (p) => p.startsWith('noticias/') ? `${C.base}noticias/articulo/?n=${encodeURIComponent(p.slice(9))}` : `${C.base}${p}/`;
    main.innerHTML = `<h1>Comentarios</h1><p class="muted">Los últimos 200. Ocultar lo quita de la web sin borrarlo.</p>
      <ul class="cms-adm">${rows.map((c) => `<li class="${c.status === 'hidden' ? 'off' : ''}">${avatar(c.profiles?.avatar_url, c.profiles?.display_name)}<div class="cm-b"><div class="cm-h"><b>${esc(c.profiles?.display_name || '—')}</b><span class="muted">${esc(c.profiles?.email || '')}</span><time>${ago(c.created_at)}</time></div><p>${esc(c.body)}</p><a class="muted" href="${pageUrl(c.page)}#comentarios" target="_blank">${esc(c.page)}</a></div>
        <div class="nr-a">${c.status === 'hidden' ? `<button class="btn btn-o btn-sm" data-show="${c.id}">Mostrar</button>` : `<button class="btn btn-o btn-sm" data-hide="${c.id}">Ocultar</button>`}<button class="btn btn-o btn-sm" data-delc="${c.id}">Borrar</button></div></li>`).join('') || '<li class="empty">Aún no hay comentarios.</li>'}</ul>`;
    main.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.delc) {
        if (!(await ask('¿Borrar el comentario?', 'Se elimina para siempre, con sus respuestas.', 'Borrar', 1))) return;
        const { error } = await s.from('comments').delete().eq('id', b.dataset.delc); if (error) return toast(errMsg(error), 1);
      } else if (b.dataset.hide || b.dataset.show) {
        const { error } = await s.from('comments').update({ status: b.dataset.hide ? 'hidden' : 'visible' }).eq('id', b.dataset.hide || b.dataset.show); if (error) return toast(errMsg(error), 1);
      } else return;
      toast('Hecho'); comentarios();
    };
  }

  /* ---------- newsletter ---------- */
  const md2html = (md) => {
    const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
    return md.trim().split(/\n{2,}/).map((b) => {
      b = b.trim();
      if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
      if (/^(- .*(\n|$))+$/.test(b)) return `<ul>${b.split('\n').map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      const btn = b.match(/^\[\[(.+?)\]\]\((https?:\/\/\S+)\)$/);
      if (btn) return `<p class="cta"><a href="${btn[2]}" class="btn">${esc(btn[1])}</a></p>`;
      return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
  };
  const src = (h) => { const m = /^<!--src:(.*?)-->/.exec(h || ''); return m ? decodeURIComponent(m[1]) : ''; };
  const emailPreview = (subject, pre, body) => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#eef2f8;font-family:Lexend,Arial,sans-serif;color:#13233d}.w{max-width:600px;margin:0 auto;padding:24px 12px}.hd{background:#0f2647;border-radius:14px 14px 0 0;padding:22px;text-align:center}.hd img{width:150px}.bd{background:#fff;padding:28px 30px;font-size:16px;line-height:1.6;border-radius:0 0 14px 14px}h1{font-size:24px;line-height:1.2;margin:0 0 16px;color:#0f2647}h2{font-size:19px;color:#0f2647;margin:24px 0 8px}a{color:#0f2647;font-weight:600}.cta a{display:inline-block;background:#f5b301;color:#0f2647;text-decoration:none;padding:12px 22px;border-radius:10px}.ft{text-align:center;color:#5b6b85;font-size:12px;padding:18px}.pre{display:none}</style></head><body><span class="pre">${esc(pre)}</span><div class="w"><div class="hd"><img src="${location.origin + C.base}img/logo.png" alt="Negocios Inside"></div><div class="bd"><h1>${esc(subject)}</h1>${body}</div><div class="ft">Recibes esto porque te suscribiste a Negocios Inside.<br><u>Darme de baja</u></div></div></body></html>`;

  async function newsletter(sub) {
    if (sub === 'suscriptores') return suscriptores();
    const [camps, cnt] = await Promise.all([q(s.from('campaigns').select('*').order('created_at', { ascending: false }).limit(50)), s.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active')]);
    let stats = {}; try { (await q(s.rpc('campaign_stats'))).forEach((x) => (stats[x.campaign_id ?? x.id] = x)); } catch {}
    const total = cnt.count || 0;
    const st = { draft: 'Borrador', queued: 'En cola', sending: 'Enviando', sent: 'Enviada', failed: 'Error' };
    main.innerHTML = `<h1>Newsletter</h1>
      <div class="pn-sub"><button class="on">Campañas</button><button data-sub="suscriptores">Suscriptores (${nf.format(total)})</button></div>
      <div class="pn-bar"><button class="btn btn-y" id="newC">Nueva newsletter</button><span class="muted">${nf.format(total)} suscriptores activos.</span></div>
      <table class="tbl"><thead><tr><th>Asunto</th><th>Estado</th><th class="r">Enviados</th><th class="r">Aperturas</th><th class="r">Clics</th><th></th></tr></thead><tbody>
      ${camps.map((c) => { const x = stats[c.id] || {}; return `<tr><td><b>${esc(c.subject || '(sin asunto)')}</b><br><span class="muted">${c.sent_at ? 'Enviada ' + fdate(c.sent_at) : 'Creada ' + ago(c.created_at)}</span></td><td><span class="pill p-${c.status}">${st[c.status] || c.status}</span></td><td class="r">${nf.format(c.sent_count || 0)}${c.recipients ? ' / ' + nf.format(c.recipients) : ''}</td><td class="r">${x.opens != null ? nf.format(x.opens) : '—'}</td><td class="r">${x.clicks != null ? nf.format(x.clicks) : '—'}</td><td class="r"><button class="btn btn-o btn-sm" data-open="${c.id}">${c.status === 'draft' ? 'Editar' : 'Ver'}</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Todavía no hay newsletters. Crea la primera.</td></tr>'}
      </tbody></table>`;
    $('[data-sub]').onclick = () => newsletter('suscriptores');
    $('#newC').onclick = async () => { const { data, error } = await s.from('campaigns').insert({ subject: '', preheader: '', body_html: '' }).select().single(); if (error) return toast(errMsg(error), 1); editCamp(data.id, total); };
    main.onclick = (e) => { const b = e.target.closest('[data-open]'); if (b) editCamp(+b.dataset.open, total); };
  }
  async function editCamp(id, total) {
    main.onclick = null;
    const c = await q(s.from('campaigns').select('*').eq('id', id).single());
    const ro = c.status !== 'draft';
    const md0 = src(c.body_html) || '';
    main.innerHTML = `<button class="lnk back" id="bk">← Volver a newsletters</button><h1>${ro ? 'Newsletter enviada' : 'Escribir newsletter'}</h1>
      <div class="ed-grid"><form class="form ed" id="cf">
        <div class="f"><label for="c-s">Asunto</label><input id="c-s" value="${esc(c.subject || '')}" maxlength="120" ${ro ? 'disabled' : ''} placeholder="Ej.: Así se fabrica una figura de 6 metros"></div>
        <div class="f"><label for="c-p">Texto de vista previa (lo que se ve junto al asunto)</label><input id="c-p" value="${esc(c.preheader || '')}" maxlength="140" ${ro ? 'disabled' : ''}></div>
        <div class="f"><label for="c-b">Contenido</label><textarea id="c-b" rows="16" ${ro ? 'disabled' : ''} placeholder="Escribe en párrafos separados por una línea en blanco.&#10;&#10;## Un subtítulo&#10;&#10;- Una lista&#10;- con puntos&#10;&#10;**Negrita** y [enlaces](https://...)&#10;&#10;[[Ver el episodio]](https://...)">${esc(md0)}</textarea>
          <span class="hint">## subtítulo · - lista · **negrita** · [texto](enlace) · [[Botón]](enlace) en su propia línea.</span></div>
        ${ro ? '' : `<div class="cta-row"><button class="btn btn-o btn-sm" name="a" value="save">Guardar borrador</button></div>
        <div class="send-box"><div class="f"><label for="c-t">Enviar una prueba a</label><div class="row"><input id="c-t" type="email" value="${esc(c.test_email || me.user.email || '')}"><button class="btn btn-o btn-sm" name="a" value="test">Enviar prueba</button></div></div>
        <button class="btn btn-y" name="a" value="send">Enviar a ${nf.format(total)} suscriptores</button></div>`}
        <button type="button" class="lnk del-c" id="delC">${ro ? '' : 'Borrar este borrador'}</button>
      </form>
      <div class="ed-prev"><span class="muted">Vista previa</span><iframe id="cPrev" title="Vista previa de la newsletter"></iframe></div></div>`;
    const prev = () => { $('#cPrev').srcdoc = emailPreview($('#c-s').value, $('#c-p').value, $('#c-b').value.trim() ? md2html($('#c-b').value) : (c.body_html || '')); };
    prev(); ['c-s', 'c-p', 'c-b'].forEach((k) => $('#' + k).addEventListener('input', prev));
    $('#bk').onclick = () => newsletter();
    const save = async () => {
      const md = $('#c-b').value;
      const { error } = await s.from('campaigns').update({ subject: $('#c-s').value.trim(), preheader: $('#c-p').value.trim(), body_html: `<!--src:${encodeURIComponent(md)}-->\n` + md2html(md) }).eq('id', id);
      if (error) throw error;
    };
    $('#delC').onclick = async () => { if (ro) return; if (!(await ask('¿Borrar el borrador?', 'No se puede deshacer.', 'Borrar', 1))) return; await s.from('campaigns').delete().eq('id', id); toast('Borrador borrado'); newsletter(); };
    $('#cf').addEventListener('submit', async (e) => {
      e.preventDefault(); if (ro) return; const a = e.submitter && e.submitter.value;
      try {
        if (a !== 'save' && (!$('#c-s').value.trim() || $('#c-b').value.trim().length < 20)) { toast('Falta el asunto o el contenido.', 1); return; }
        await save();
        if (a === 'save') return toast('Borrador guardado');
        if (a === 'test') { const em = $('#c-t').value.trim(); await q(s.rpc('request_test', { p_id: id, p_email: em })); return toast(`Prueba en camino a ${em}. Llega en 1-2 minutos.`); }
        if (a === 'send') {
          if (!(await ask(`¿Enviar a ${nf.format(total)} suscriptores?`, `«${$('#c-s').value.trim()}» se enviará ahora. No se puede deshacer.`, 'Enviar ahora'))) return;
          await q(s.rpc('queue_campaign', { p_id: id })); toast('Newsletter en cola. Se envía poco a poco para no caer en spam.'); newsletter();
        }
      } catch (er) { toast(errMsg(er), 1); }
    });
  }
  async function suscriptores() {
    main.onclick = null;
    let rows = await q(s.from('subscribers').select('id,email,name,source,status,created_at').order('created_at', { ascending: false }).limit(5000));
    const act = rows.filter((r) => r.status === 'active').length;
    main.innerHTML = `<h1>Newsletter</h1><div class="pn-sub"><button data-sub="c">Campañas</button><button class="on">Suscriptores (${nf.format(act)})</button></div>
      <div class="pn-bar"><input id="sq" type="search" placeholder="Buscar correo o nombre" aria-label="Buscar suscriptor"><button class="btn btn-o btn-sm" id="csv">Descargar CSV</button><button class="btn btn-o btn-sm" id="imp">Importar correos</button></div>
      <div id="impBox" hidden class="imp"><label for="impT">Pega correos (uno por línea, o «correo, nombre»)</label><textarea id="impT" rows="6"></textarea><button class="btn btn-y btn-sm" id="impGo">Añadir</button></div>
      <table class="tbl"><thead><tr><th>Correo</th><th>Nombre</th><th>Origen</th><th>Estado</th><th>Alta</th><th></th></tr></thead><tbody id="sb"></tbody></table>`;
    const paint = (f = '') => {
      const l = rows.filter((r) => !f || (r.email + ' ' + (r.name || '')).toLowerCase().includes(f.toLowerCase())).slice(0, 400);
      $('#sb').innerHTML = l.map((r) => `<tr class="${r.status === 'active' ? '' : 'off'}"><td>${esc(r.email)}</td><td>${esc(r.name || '')}</td><td>${esc(r.source || '')}</td><td>${r.status === 'active' ? 'Activo' : 'De baja'}</td><td>${fdate(r.created_at)}</td><td class="r"><button class="btn btn-o btn-sm" data-tog="${r.id}" data-st="${r.status}">${r.status === 'active' ? 'Dar de baja' : 'Reactivar'}</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sin resultados.</td></tr>';
    };
    paint();
    $('#sq').addEventListener('input', (e) => paint(e.target.value));
    $('[data-sub]').onclick = () => newsletter();
    $('#imp').onclick = () => { $('#impBox').hidden = !$('#impBox').hidden; };
    $('#impGo').onclick = async () => {
      const lines = $('#impT').value.split('\n').map((l) => l.split(/[,;\t]/)).map(([e, n]) => ({ email: (e || '').trim().toLowerCase(), name: (n || '').trim(), source: 'importado' })).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email));
      if (!lines.length) return toast('No hay correos válidos.', 1);
      const { error } = await s.from('subscribers').upsert(lines, { onConflict: 'email', ignoreDuplicates: true });
      if (error) return toast(errMsg(error), 1); toast(`${lines.length} correos añadidos`); suscriptores();
    };
    $('#csv').onclick = () => {
      const csv = 'email,nombre,origen,estado,alta\n' + rows.map((r) => [r.email, r.name || '', r.source || '', r.status, r.created_at.slice(0, 10)].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'suscriptores-negocios-inside.csv'; a.click();
    };
    $('#sb').onclick = async (e) => {
      const b = e.target.closest('[data-tog]'); if (!b) return;
      const ns = b.dataset.st === 'active' ? 'unsubscribed' : 'active';
      const { error } = await s.from('subscribers').update({ status: ns }).eq('id', b.dataset.tog);
      if (error) return toast(errMsg(error), 1);
      rows.find((r) => r.id === +b.dataset.tog).status = ns; paint($('#sq').value); toast('Hecho');
    };
  }

  /* ---------- usuarios ---------- */
  async function usuarios() {
    const rows = await q(s.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000));
    main.innerHTML = `<h1>Usuarios (${nf.format(rows.length)})</h1><div class="pn-bar"><input id="uq" type="search" placeholder="Buscar" aria-label="Buscar usuario"></div>
      <table class="tbl"><thead><tr><th>Usuario</th><th>Entra con</th><th>Newsletter</th><th>Alta</th><th>Rol</th></tr></thead><tbody id="ub"></tbody></table>`;
    const paint = (f = '') => {
      $('#ub').innerHTML = rows.filter((r) => !f || ((r.email || '') + ' ' + (r.display_name || '')).toLowerCase().includes(f.toLowerCase())).map((r) => `<tr><td><span class="u">${avatar(r.avatar_url, r.display_name)}<span><b>${esc(r.display_name || '—')}</b><br><span class="muted">${esc(r.email || '')}</span></span></span></td><td>${esc(r.provider === 'google' ? 'Google' : r.provider === 'x' || r.provider === 'twitter' ? 'X' : 'Correo')}</td><td>${r.newsletter ? 'Sí' : 'No'}</td><td>${fdate(r.created_at)}</td><td>${r.id === me.user.id ? '<span class="pill p-sent">Tú (admin)</span>' : `<button class="btn btn-o btn-sm" data-role="${r.id}" data-r="${r.role}">${r.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>`}</td></tr>`).join('');
    };
    paint(); $('#uq').addEventListener('input', (e) => paint(e.target.value));
    main.onclick = async (e) => {
      const b = e.target.closest('[data-role]'); if (!b) return;
      const nr = b.dataset.r === 'admin' ? 'user' : 'admin';
      if (!(await ask(nr === 'admin' ? '¿Dar acceso al panel?' : '¿Quitar acceso al panel?', nr === 'admin' ? 'Podrá publicar noticias, moderar y enviar newsletters.' : 'Dejará de ver el panel.', 'Confirmar'))) return;
      const { error } = await s.from('profiles').update({ role: nr }).eq('id', b.dataset.role);
      if (error) return toast(errMsg(error), 1); rows.find((r) => r.id === b.dataset.role).role = nr; paint($('#uq').value); toast('Rol cambiado');
    };
  }

  /* =====================================================================
     DASHBOARD DEL PODCAST
     ===================================================================== */
  let poll = 0;
  const T = (t) => s.from(t);
  const grp = (v) => { const n = Math.round(+v || 0); return (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const eur = { format: (v) => grp(v) + ' €' };
  const today = () => new Date().toLocaleDateString('sv-SE');
  const dnum = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  const daysTo = (d) => Math.round((dnum(d) - dnum(today())) / 864e5);
  const MESL = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
  const DIAS = 'lun mar mié jue vie sáb dom'.split(' ');
  const fd = (d) => d ? `${+d.slice(8, 10)} ${MESL[+d.slice(5, 7) - 1].slice(0, 3)} ${d.slice(0, 4)}` : '—';
  const n0 = grp;

  /* formulario en ventana propia (nunca las del navegador) */
  const field = (f, v) => {
    const id = 'fm-' + f.k, val = v ?? f.def ?? '';
    const w = f.w ? ' f-w' : '';
    if (f.t === 'select') return `<div class="f${w}"><label for="${id}">${f.l}</label><select id="${id}" name="${f.k}">${f.o.map(([a, b]) => `<option value="${esc(a)}"${String(val) === String(a) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select></div>`;
    if (f.t === 'textarea') return `<div class="f${w}"><label for="${id}">${f.l}</label><textarea id="${id}" name="${f.k}" rows="${f.r || 4}">${esc(val)}</textarea></div>`;
    if (f.t === 'check') return `<label class="chk f-w"><input type="checkbox" name="${f.k}"${val ? ' checked' : ''}><span>${f.l}</span></label>`;
    return `<div class="f${w}"><label for="${id}">${f.l}</label><input id="${id}" name="${f.k}" type="${f.t || 'text'}" value="${esc(val)}"${f.t === 'number' ? ' step="any" inputmode="decimal"' : ''}${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}></div>`;
  };
  const modal = (title, fields, vals = {}, opt = {}) => new Promise((res) => {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<form method="dialog" novalidate><div class="dlg-hd"><h2>${esc(title)}</h2><button class="dlg-x" value="no" aria-label="Cerrar">×</button></div><div class="dlg-g">${fields.map((f) => field(f, vals[f.k])).join('')}</div>${opt.extra || ''}
      <div class="ask-b">${opt.del ? '<button class="btn btn-o btn-sm dlg-del" value="del">Borrar</button>' : ''}<button class="btn btn-o btn-sm" value="no">Cancelar</button><button class="btn btn-y btn-sm" value="si">${opt.ok || 'Guardar'}</button></div></form>`;
    document.body.appendChild(d); d.showModal();
    const f = $('form', d);
    f.addEventListener('submit', (e) => {
      if (e.submitter?.value !== 'si') return;
      const miss = fields.find((x) => x.req && !String(f.elements[x.k].value).trim());
      if (miss) { e.preventDefault(); f.elements[miss.k].focus(); toast('Falta: ' + miss.l.replace(/<[^>]+>/g, ''), 1); }
    });
    d.addEventListener('close', () => {
      let out = null;
      if (d.returnValue === 'si') {
        out = {};
        fields.forEach((x) => {
          const el = f.elements[x.k]; let v = x.t === 'check' ? el.checked : String(el.value).trim();
          if (x.t === 'number') v = v === '' ? null : +String(v).replace(',', '.');
          else if (v === '') v = null;
          out[x.k] = v;
        });
      } else if (d.returnValue === 'del') out = { __del: 1 };
      d.remove(); res(out);
    });
  });
  const saveRow = async (table, id, data) => {
    const { error } = id ? await T(table).update(data).eq('id', id) : await T(table).insert(data);
    if (error) { toast(errMsg(error), 1); return false; } toast('Guardado'); return true;
  };
  const delRow = async (table, id, what) => {
    if (!(await ask(`¿Borrar ${what}?`, 'No se puede deshacer.', 'Borrar', 1))) return false;
    const { error } = await T(table).delete().eq('id', id); if (error) { toast(errMsg(error), 1); return false; } toast('Borrado'); return true;
  };

  /* ---------- tiempo (Open-Meteo, gratis y sin clave) ---------- */
  const WXC = {};
  const geocode = async (q) => {
    const tries = [q, ...q.split(',').map((x) => x.trim()).reverse()].filter((x, i, a) => x && a.indexOf(x) === i);
    for (const t of tries) {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(t)}&count=1&language=es&countryCode=ES`).then((r) => r.json());
        const x = (r.results || [])[0]; if (x) return { lat: x.latitude, lon: x.longitude };
      } catch {}
    }
    return null;
  };
  const forecast = (lat, lon) => { const k = (+lat).toFixed(2) + ',' + (+lon).toFixed(2); return WXC[k] || (WXC[k] = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FMadrid&forecast_days=16`).then((r) => r.json()).catch(() => null)); };
  const WXI = {
    sol: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    nube: '<path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
    lluvia: '<path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 6.5 4.3 4.3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    nieve: '<path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 6.5 4.3 4.3 0 0 0 7 15z"/><path d="M8 19h.01M12 21h.01M16 19h.01"/>',
    tormenta: '<path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 6.5 4.3 4.3 0 0 0 7 15z"/><path d="M12.5 15l-2 4h3l-2 4"/>',
    niebla: '<path d="M4 9h16M3 13h18M5 17h14"/>',
  };
  const wxKind = (c) => c <= 1 ? ['sol', 'Despejado'] : c <= 3 ? ['nube', 'Nubes y claros'] : c <= 48 ? ['niebla', 'Niebla'] : c <= 67 || (c >= 80 && c <= 82) ? ['lluvia', 'Lluvia'] : c <= 77 || c <= 86 ? ['nieve', 'Nieve'] : ['tormenta', 'Tormenta'];
  const wxHtml = async (ev) => {
    if (ev.lat == null) return ev.lugar ? '<span class="wx wx-m">Lugar no encontrado</span>' : '';
    const dt = daysTo(ev.fecha);
    if (dt < 0) return '';
    if (dt > 15) return '<span class="wx wx-m">Previsión disponible 16 días antes</span>';
    const f = await forecast(ev.lat, ev.lon); const i = f?.daily?.time?.indexOf(ev.fecha);
    if (i == null || i < 0) return '<span class="wx wx-m">Sin previsión</span>';
    const D = f.daily, [k, lab] = wxKind(D.weathercode[i]);
    return `<span class="wx wx-${k}" title="${lab}"><svg viewBox="0 0 24 24" aria-hidden="true">${WXI[k]}</svg><b>${Math.round(D.temperature_2m_max[i])}°</b>/${Math.round(D.temperature_2m_min[i])}° · ${lab}${D.precipitation_probability_max[i] != null ? ` · lluvia ${D.precipitation_probability_max[i]} %` : ''}</span>`;
  };
  const fillWx = (evs) => $$('[data-wx]', main).forEach(async (el) => { const ev = evs.find((x) => String(x.id) === el.dataset.wx); if (ev) el.innerHTML = await wxHtml(ev); });

  /* ---------- inicio del podcast ---------- */
  const PEST = { sugerido: 'Sugeridos', contactado: 'Contactados', aceptado: 'Aceptados', rechazado: 'Rechazados', grabado: 'Grabados' };
  const PROD = [['idea', 'Idea'], ['agendado', 'Agendado'], ['grabado', 'Grabado'], ['editando', 'Por editar / editando'], ['revision_cliente', 'Revisión del cliente'], ['aceptado', 'Aceptado por el cliente'], ['publicado', 'Publicado']];
  const PRODN = Object.fromEntries(PROD);
  const EVT = { grabacion: 'Grabación', publicacion: 'Publicación', reunion: 'Reunión', otro: 'Otro' };
  async function podcast() {
    const m0 = today().slice(0, 7) + '-01';
    const [pros, evs, prods, fin, goals] = await Promise.all([
      q(T('prospects').select('estado,tipo')), q(T('events').select('*').gte('fecha', today()).order('fecha').limit(6)),
      q(T('productions').select('id,titulo,empresa,estado,fecha_grabacion').neq('estado', 'publicado').order('fecha_grabacion', { nullsFirst: false })),
      q(T('finance').select('tipo,importe').gte('fecha', m0)), q(T('goals').select('*').order('fecha_limite', { nullsFirst: false }).limit(4))]);
    const cnt = (e) => pros.filter((p) => p.estado === e).length;
    const ing = fin.filter((f) => f.tipo === 'ingreso').reduce((a, f) => a + +f.importe, 0), gas = fin.filter((f) => f.tipo === 'gasto').reduce((a, f) => a + +f.importe, 0);
    main.innerHTML = `<h1>El podcast hoy</h1>
      <div class="kpis">${kpi('Empresas contactadas', n0(cnt('contactado') + cnt('aceptado') + cnt('grabado')), `${n0(cnt('sugerido'))} sugeridas por revisar`)}${kpi('Aceptadas', n0(cnt('aceptado') + cnt('grabado')), `${n0(pros.filter((p) => p.tipo === 'pago').length)} de pago`)}${kpi('En producción', n0(prods.length), `${n0(prods.filter((p) => p.estado === 'editando').length)} por editar`)}${kpi('Resultado del mes', eur.format(ing - gas), `${eur.format(ing)} ingresos · ${eur.format(gas)} gastos`)}</div>
      <div class="d-2">
        <section><h2 class="pn-h">Próximas fechas</h2><ul class="d-list">${evs.map((e) => `<li><span class="ev-t ev-${e.tipo}">${EVT[e.tipo]}</span><b>${esc(e.titulo)}</b><span class="muted">${fd(e.fecha)}${e.hora ? ' · ' + e.hora.slice(0, 5) : ''}${e.lugar ? ' · ' + esc(e.lugar) : ''}</span><span data-wx="${e.id}"></span></li>`).join('') || '<li class="empty">No hay nada en el calendario. <a class="lnk" href="#calendario">Añadir fecha</a></li>'}</ul></section>
        <section><h2 class="pn-h">Producción pendiente</h2><ul class="d-list">${prods.slice(0, 6).map((p) => `<li><span class="pill">${PRODN[p.estado]}</span><b>${esc(p.titulo)}</b><span class="muted">${esc(p.empresa || '')}${p.fecha_grabacion ? ' · graba ' + fd(p.fecha_grabacion) : ''}</span></li>`).join('') || '<li class="empty">Todo publicado. <a class="lnk" href="#produccion">Nuevo episodio</a></li>'}</ul></section>
      </div>
      ${goals.length ? `<h2 class="pn-h">Objetivos</h2><div class="g-grid">${goals.map(goalCard).join('')}</div>` : ''}`;
    fillWx(evs);
  }

  /* ---------- prospección ---------- */
  async function prospeccion(filtro = '') {
    const [rows, srch] = await Promise.all([q(T('prospects').select('*').order('created_at', { ascending: false }).limit(500)), q(T('prospect_searches').select('*').order('created_at', { ascending: false }).limit(5))]);
    const cnt = (e) => rows.filter((p) => p.estado === e).length;
    const list = filtro ? rows.filter((r) => r.estado === filtro) : rows;
    const SST = { pendiente: 'En cola', procesando: 'Buscando…', hecho: 'Hecha', error: 'Error' };
    main.innerHTML = `<h1>Prospección</h1>
      <div class="kpis">${kpi('Contactadas', n0(cnt('contactado')))}${kpi('Aceptadas', n0(cnt('aceptado') + cnt('grabado')))}${kpi('De pago', n0(rows.filter((p) => p.tipo === 'pago').length), eur.format(rows.filter((p) => p.tipo === 'pago').reduce((a, p) => a + (+p.importe || 0), 0)))}${kpi('Sugeridas por la IA', n0(cnt('sugerido')))}</div>
      <form class="ai-box" id="aiF"><label for="aiQ"><b>Busca empresas con IA</b><span class="muted">Describe qué tipo de empresas quieres. La IA las busca en internet, encuentra su correo público si lo tienen y te deja un borrador de invitación. No envía nada: tú revisas y lo mandas desde tu correo.</span></label>
        <textarea id="aiQ" rows="3" placeholder="Ej.: fábricas de muebles de la Comunidad de Madrid con más de 20 empleados y tienda propia"></textarea>
        <div class="ai-row"><label for="aiN">Cuántas</label><select id="aiN"><option>3</option><option selected>5</option><option>10</option></select><button class="btn btn-y btn-sm">Buscar empresas</button></div>
        ${srch.length ? `<ul class="ai-hist">${srch.map((x) => `<li><span class="pill p-${x.estado === 'hecho' ? 'sent' : x.estado === 'error' ? 'failed' : 'queued'}">${SST[x.estado]}</span><span>${esc(x.criterios.slice(0, 110))}</span><span class="muted">${x.resultado ? `${n0(x.resultado.encontradas)} encontradas, ${n0(x.resultado.con_email)} con correo` : ago(x.created_at)}</span></li>`).join('')}</ul><p class="muted">Cada búsqueda tarda entre 5 y 15 minutos. Esta página se actualiza sola.</p>` : ''}
      </form>
      <div class="pn-bar"><div class="chips d-chips"><button class="chip" aria-pressed="${!filtro}" data-f="">Todas (${rows.length})</button>${Object.entries(PEST).map(([k, n]) => `<button class="chip" aria-pressed="${filtro === k}" data-f="${k}">${n} (${cnt(k)})</button>`).join('')}</div><button class="btn btn-o btn-sm" id="pNew">Añadir empresa</button></div>
      <table class="tbl d-tbl"><thead><tr><th>Empresa</th><th>Correo</th><th>Estado</th><th>Tipo</th><th class="r">Importe</th><th></th></tr></thead><tbody>
      ${list.map((p) => `<tr><td><b>${esc(p.empresa)}</b><br><span class="muted">${esc([p.sector, p.ciudad].filter(Boolean).join(' · '))}${p.web ? ` · <a href="${esc(p.web)}" target="_blank" rel="noopener">web</a>` : ''}</span></td>
        <td>${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '<span class="muted">Sin correo público</span>'}</td>
        <td><select class="d-sel" data-est="${p.id}" aria-label="Estado de ${esc(p.empresa)}">${Object.keys(PEST).map((k) => `<option value="${k}"${p.estado === k ? ' selected' : ''}>${PEST[k].replace(/s$/, '')}</option>`).join('')}</select></td>
        <td>${p.tipo === 'pago' ? '<span class="pill p-sent">De pago</span>' : p.tipo === 'gratis' ? '<span class="pill">Gratis</span>' : '<span class="muted">Por definir</span>'}</td>
        <td class="r">${p.importe ? eur.format(p.importe) : '—'}</td>
        <td class="r d-acts">${p.borrador_cuerpo ? `<button class="btn btn-y btn-sm" data-inv="${p.id}">Invitación</button>` : ''}<button class="btn btn-o btn-sm" data-ed="${p.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No hay empresas aquí todavía.</td></tr>'}</tbody></table>`;
    const PF = [{ k: 'empresa', l: 'Empresa', req: 1 }, { k: 'sector', l: 'Sector' }, { k: 'ciudad', l: 'Ciudad' }, { k: 'web', l: 'Web', t: 'url' }, { k: 'email', l: 'Correo', t: 'email' }, { k: 'contacto', l: 'Persona de contacto' }, { k: 'telefono', l: 'Teléfono', t: 'tel' },
      { k: 'estado', l: 'Estado', t: 'select', o: Object.keys(PEST).map((k) => [k, PEST[k].replace(/s$/, '')]) }, { k: 'tipo', l: 'Tipo', t: 'select', o: [['por_definir', 'Por definir'], ['gratis', 'Gratis'], ['pago', 'De pago']] }, { k: 'importe', l: 'Importe (€)', t: 'number' },
      { k: 'notas', l: 'Notas', t: 'textarea', w: 1, r: 3 }, { k: 'borrador_asunto', l: 'Asunto de la invitación', w: 1 }, { k: 'borrador_cuerpo', l: 'Texto de la invitación', t: 'textarea', w: 1, r: 7 }];
    $('#aiF').addEventListener('submit', async (e) => {
      e.preventDefault(); const c = $('#aiQ').value.trim(); if (c.length < 10) { toast('Describe un poco más qué empresas buscas.', 1); $('#aiQ').focus(); return; }
      const { error } = await T('prospect_searches').insert({ criterios: c, cantidad: +$('#aiN').value }); if (error) return toast(errMsg(error), 1);
      toast('Búsqueda en cola. Tarda entre 5 y 15 minutos.'); prospeccion(filtro);
    });
    $('#pNew').onclick = async () => { const v = await modal('Añadir empresa', PF, { estado: 'contactado', tipo: 'por_definir' }); if (v && !v.__del && await saveRow('prospects', 0, v)) prospeccion(filtro); };
    main.onchange = async (e) => {
      const sel = e.target.closest('[data-est]'); if (!sel) return;
      const patch = { estado: sel.value }; if (sel.value === 'contactado') patch.contacted_at = new Date().toISOString();
      const { error } = await T('prospects').update(patch).eq('id', sel.dataset.est); if (error) toast(errMsg(error), 1); else { toast('Estado cambiado'); prospeccion(filtro); }
    };
    main.onclick = async (e) => {
      const ch = e.target.closest('[data-f]'); if (ch) return prospeccion(ch.dataset.f);
      const ed = e.target.closest('[data-ed]'), inv = e.target.closest('[data-inv]');
      if (ed) {
        const p = rows.find((r) => r.id === +ed.dataset.ed); const v = await modal(p.empresa, PF, p, { del: 1 }); if (!v) return;
        if (v.__del) { if (await delRow('prospects', p.id, 'esta empresa')) prospeccion(filtro); return; }
        if (await saveRow('prospects', p.id, v)) prospeccion(filtro);
      }
      if (inv) invitation(rows.find((r) => r.id === +inv.dataset.inv), () => prospeccion(filtro));
    };
    clearInterval(poll);
    if (srch.some((x) => x.estado === 'pendiente' || x.estado === 'procesando')) poll = setInterval(async () => {
      const { data } = await T('prospect_searches').select('id').in('estado', ['pendiente', 'procesando']); if (data && !data.length) { clearInterval(poll); toast('Búsqueda terminada'); prospeccion(filtro); }
    }, 30000);
  }
  function invitation(p, back) {
    const d = document.createElement('dialog'); d.className = 'dlg dlg-w';
    const href = () => `mailto:${encodeURI(p.email || '')}?subject=${encodeURIComponent($('#ivS', d).value)}&body=${encodeURIComponent($('#ivB', d).value)}`;
    d.innerHTML = `<form method="dialog"><div class="dlg-hd"><h2>Invitación a ${esc(p.empresa)}</h2><button class="dlg-x" value="no" aria-label="Cerrar">×</button></div>
      <p class="muted">Borrador escrito por la IA. Revísalo y envíalo tú desde tu correo: desde aquí no se envía nada.${p.fuente_url ? ` Correo visto en <a href="${esc(p.fuente_url)}" target="_blank" rel="noopener">esta página</a>.` : ''}</p>
      ${p.notas ? `<p class="iv-why">${esc(p.notas)}</p>` : ''}
      <div class="f"><label for="ivTo">Para</label><input id="ivTo" value="${esc(p.email || '')}" placeholder="Sin correo público: búscalo o escríbeles por su web"></div>
      <div class="f"><label for="ivS">Asunto</label><input id="ivS" value="${esc(p.borrador_asunto || '')}"></div>
      <div class="f"><label for="ivB">Texto</label><textarea id="ivB" rows="11">${esc(p.borrador_cuerpo || '')}</textarea></div>
      <div class="ask-b"><button class="btn btn-o btn-sm" value="save">Guardar cambios</button><button class="btn btn-o btn-sm" value="copy">Copiar texto</button><a class="btn btn-o btn-sm" id="ivMail" href="#">Abrir en mi correo</a><button class="btn btn-y btn-sm" value="done">Marcar como contactada</button></div></form>`;
    document.body.appendChild(d); d.showModal();
    const sync = () => { p.email = $('#ivTo', d).value.trim(); $('#ivMail', d).href = href(); };
    sync(); d.addEventListener('input', sync);
    $('form', d).addEventListener('submit', async (e) => {
      const v = e.submitter?.value; if (v === 'no') return;
      e.preventDefault();
      const patch = { email: $('#ivTo', d).value.trim() || null, borrador_asunto: $('#ivS', d).value, borrador_cuerpo: $('#ivB', d).value };
      if (v === 'copy') { try { await navigator.clipboard.writeText(`${patch.borrador_asunto}\n\n${patch.borrador_cuerpo}`); toast('Texto copiado'); } catch { toast('No se pudo copiar', 1); } return; }
      if (v === 'done') Object.assign(patch, { estado: 'contactado', contacted_at: new Date().toISOString() });
      const { error } = await T('prospects').update(patch).eq('id', p.id); if (error) return toast(errMsg(error), 1);
      toast(v === 'done' ? 'Marcada como contactada' : 'Guardado'); d.close(); back();
    });
    d.addEventListener('close', () => d.remove());
  }

  /* ---------- calendario ---------- */
  let calM = today().slice(0, 7);
  async function calendario() {
    const [y, m] = calM.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)), last = new Date(Date.UTC(y, m, 0));
    const iso = (d) => d.toISOString().slice(0, 10);
    const [evs, prods] = await Promise.all([q(T('events').select('*').gte('fecha', iso(new Date(first - 7 * 864e5))).lte('fecha', iso(new Date(+last + 7 * 864e5))).order('hora', { nullsFirst: true })), q(T('productions').select('id,titulo').order('id', { ascending: false }).limit(100))]);
    const next = await q(T('events').select('*').gte('fecha', today()).order('fecha').limit(8));
    const lead = (first.getUTCDay() + 6) % 7, cells = [];
    for (let i = -lead; i < 42 - lead; i++) cells.push(new Date(Date.UTC(y, m - 1, 1 + i)));
    const rowsN = Math.ceil((lead + last.getUTCDate()) / 7);
    main.innerHTML = `<h1>Calendario</h1>
      <div class="pn-bar"><div class="cal-nav"><button class="btn btn-o btn-sm" data-mv="-1" aria-label="Mes anterior">‹</button><b>${MESL[m - 1][0].toUpperCase() + MESL[m - 1].slice(1)} ${y}</b><button class="btn btn-o btn-sm" data-mv="1" aria-label="Mes siguiente">›</button><button class="btn btn-o btn-sm" data-mv="0">Hoy</button></div><button class="btn btn-y btn-sm" id="eNew">Nueva fecha</button>
        <span class="cal-leg">${Object.entries(EVT).map(([k, n]) => `<span class="ev-t ev-${k}">${n}</span>`).join('')}</span></div>
      <div class="cal" role="grid">${DIAS.map((d) => `<div class="cal-h">${d}</div>`).join('')}${cells.slice(0, rowsN * 7).map((d) => { const ds = iso(d); const es = evs.filter((e) => e.fecha === ds); return `<div class="cal-d${d.getUTCMonth() !== m - 1 ? ' out' : ''}${ds === today() ? ' hoy' : ''}" data-day="${ds}"><span class="cal-n">${d.getUTCDate()}</span>${es.map((e) => `<button class="cal-e ev-${e.tipo}" data-ev="${e.id}">${e.hora ? e.hora.slice(0, 5) + ' ' : ''}${esc(e.titulo)}</button>`).join('')}</div>`; }).join('')}</div>
      <h2 class="pn-h">Próximas fechas</h2><ul class="d-list">${next.map((e) => `<li><span class="ev-t ev-${e.tipo}">${EVT[e.tipo]}</span><b>${esc(e.titulo)}</b><span class="muted">${fd(e.fecha)}${e.hora ? ' · ' + e.hora.slice(0, 5) : ''}${e.lugar ? ' · ' + esc(e.lugar) : ''}</span><span data-wx="${e.id}"></span><button class="lnk" data-ev="${e.id}">Editar</button></li>`).join('') || '<li class="empty">Nada programado.</li>'}</ul>
      <p class="muted">El tiempo sale de Open-Meteo para el lugar de cada fecha (previsión de hasta 16 días).</p>`;
    const all = [...evs, ...next];
    fillWx(all);
    const EF = [{ k: 'tipo', l: 'Tipo', t: 'select', o: Object.entries(EVT) }, { k: 'titulo', l: 'Título', req: 1, ph: 'Grabación en MYL Ideas' }, { k: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { k: 'hora', l: 'Hora', t: 'time' },
      { k: 'lugar', l: 'Lugar (ciudad o dirección)', w: 1, ph: 'Madrid' }, { k: 'production_id', l: 'Episodio relacionado', t: 'select', w: 1, o: [['', '—'], ...prods.map((p) => [p.id, p.titulo])] }, { k: 'notas', l: 'Notas', t: 'textarea', w: 1, r: 3 }];
    const edit = async (ev, day) => {
      const v = await modal(ev ? 'Editar fecha' : 'Nueva fecha', EF, ev || { fecha: day || today(), tipo: 'grabacion' }, { del: !!ev }); if (!v) return;
      if (v.__del) { if (await delRow('events', ev.id, 'esta fecha')) calendario(); return; }
      v.production_id = v.production_id ? +v.production_id : null;
      if (v.lugar && (!ev || v.lugar !== ev.lugar || ev.lat == null)) { const g = await geocode(v.lugar); v.lat = g?.lat ?? null; v.lon = g?.lon ?? null; if (!g) toast('No encontré ese lugar para el tiempo. Prueba con la ciudad.', 1); }
      if (!v.lugar) { v.lat = null; v.lon = null; }
      if (await saveRow('events', ev?.id, v)) { calM = v.fecha.slice(0, 7); calendario(); }
    };
    $('#eNew').onclick = () => edit(null);
    main.onclick = (e) => {
      const mv = e.target.closest('[data-mv]');
      if (mv) { const k = +mv.dataset.mv; if (!k) calM = today().slice(0, 7); else { const d = new Date(Date.UTC(y, m - 1 + k, 1)); calM = d.toISOString().slice(0, 7); } return calendario(); }
      const b = e.target.closest('[data-ev]'); if (b) return edit(all.find((x) => String(x.id) === b.dataset.ev));
      const day = e.target.closest('[data-day]'); if (day) edit(null, day.dataset.day);
    };
  }

  /* ---------- producción ---------- */
  async function produccion() {
    const rows = await q(T('productions').select('*').order('fecha_grabacion', { ascending: false, nullsFirst: true }).order('id', { ascending: false }));
    const cols = PROD.filter(([k]) => k !== 'idea' || rows.some((r) => r.estado === 'idea'));
    main.innerHTML = `<h1>Producción</h1>
      <div class="pn-bar"><button class="btn btn-y btn-sm" id="prNew">Nuevo episodio</button><span class="muted">${n0(rows.filter((r) => r.estado === 'editando').length)} por editar · ${n0(rows.filter((r) => r.estado === 'revision_cliente').length)} esperando al cliente · ${n0(rows.filter((r) => r.cliente_creamos).length)} de «Creamos tu podcast»</span></div>
      <div class="kb">${cols.map(([k, n]) => { const l = rows.filter((r) => r.estado === k); return `<section class="kb-c"><h2>${n} <span>${l.length}</span></h2>${l.map((r) => `<article class="kb-i${r.cliente_creamos ? ' kb-cl' : ''}"><button class="kb-t" data-pr="${r.id}">${esc(r.titulo)}</button><span class="muted">${esc(r.empresa || '')}</span>${r.cliente_creamos ? '<span class="pill">Creamos tu podcast</span>' : ''}<span class="kb-d">${r.fecha_grabacion ? 'Graba ' + fd(r.fecha_grabacion) : ''}${r.fecha_publicacion ? (r.fecha_grabacion ? ' · ' : '') + 'Sale ' + fd(r.fecha_publicacion) : ''}</span>
        <select class="d-sel" data-pst="${r.id}" aria-label="Mover ${esc(r.titulo)}">${PROD.map(([a, b]) => `<option value="${a}"${a === r.estado ? ' selected' : ''}>${b}</option>`).join('')}</select></article>`).join('') || '<p class="muted kb-e">—</p>'}</section>`; }).join('')}</div>`;
    const PRF = [{ k: 'titulo', l: 'Título', req: 1, w: 1 }, { k: 'empresa', l: 'Empresa' }, { k: 'responsable', l: 'Responsable' }, { k: 'fecha_grabacion', l: 'Fecha de grabación', t: 'date' }, { k: 'fecha_publicacion', l: 'Fecha de publicación', t: 'date' },
      { k: 'estado', l: 'Estado', t: 'select', o: PROD }, { k: 'enlace', l: 'Enlace (vídeo o carpeta)', t: 'url' }, { k: 'cliente_creamos', l: 'Es un cliente de «Creamos tu podcast»', t: 'check' }, { k: 'notas', l: 'Notas', t: 'textarea', w: 1, r: 3 }];
    $('#prNew').onclick = async () => { const v = await modal('Nuevo episodio', PRF, { estado: 'agendado' }); if (v && !v.__del && await saveRow('productions', 0, v)) produccion(); };
    main.onchange = async (e) => { const sel = e.target.closest('[data-pst]'); if (!sel) return; const { error } = await T('productions').update({ estado: sel.value }).eq('id', sel.dataset.pst); if (error) toast(errMsg(error), 1); else { toast('Movido a «' + PRODN[sel.value] + '»'); produccion(); } };
    main.onclick = async (e) => {
      const b = e.target.closest('[data-pr]'); if (!b) return; const r = rows.find((x) => x.id === +b.dataset.pr);
      const v = await modal('Editar episodio', PRF, r, { del: 1 }); if (!v) return;
      if (v.__del) { if (await delRow('productions', r.id, 'este episodio')) produccion(); return; }
      if (await saveRow('productions', r.id, v)) produccion();
    };
  }

  /* ---------- finanzas ---------- */
  let finY = +today().slice(0, 4), finM = +today().slice(5, 7);
  async function finanzas() {
    const rows = await q(T('finance').select('*').gte('fecha', `${finY}-01-01`).lte('fecha', `${finY}-12-31`).order('fecha', { ascending: false }));
    const byM = Array.from({ length: 12 }, (_, i) => { const l = rows.filter((r) => +r.fecha.slice(5, 7) === i + 1); const ing = l.filter((r) => r.tipo === 'ingreso').reduce((a, r) => a + +r.importe, 0), gas = l.filter((r) => r.tipo === 'gasto').reduce((a, r) => a + +r.importe, 0); return { ing, gas }; });
    const cur = byM[finM - 1], mx = Math.max(1, ...byM.map((x) => Math.max(x.ing, x.gas)));
    const ty = byM.reduce((a, x) => ({ ing: a.ing + x.ing, gas: a.gas + x.gas }), { ing: 0, gas: 0 });
    const list = rows.filter((r) => +r.fecha.slice(5, 7) === finM);
    const bar = byM.map((x, i) => { const X = 20 + i * 48, h1 = x.ing / mx * 150, h2 = x.gas / mx * 150; return `<g class="${i + 1 === finM ? 'on' : ''}" data-m="${i + 1}"><rect class="b-i" x="${X}" y="${170 - h1}" width="16" height="${h1}" rx="3"><title>${MESL[i]}: ingresos ${eur.format(x.ing)}</title></rect><rect class="b-g" x="${X + 18}" y="${170 - h2}" width="16" height="${h2}" rx="3"><title>${MESL[i]}: gastos ${eur.format(x.gas)}</title></rect><text x="${X + 17}" y="190" text-anchor="middle">${MESL[i].slice(0, 3)}</text></g>`; }).join('');
    main.innerHTML = `<h1>Finanzas</h1>
      <div class="pn-bar"><label class="sr" for="fY">Año</label><select id="fY" class="d-sel">${[finY - 1, finY, finY + 1].map((y) => `<option${y === finY ? ' selected' : ''}>${y}</option>`).join('')}</select><label class="sr" for="fM">Mes</label><select id="fM" class="d-sel">${MESL.map((n, i) => `<option value="${i + 1}"${i + 1 === finM ? ' selected' : ''}>${n}</option>`).join('')}</select><button class="btn btn-y btn-sm" data-add="ingreso">Añadir ingreso</button><button class="btn btn-o btn-sm" data-add="gasto">Añadir gasto</button><button class="btn btn-o btn-sm" id="fCsv">Descargar CSV</button></div>
      <div class="kpis">${kpi(`Ingresos de ${MESL[finM - 1]}`, eur.format(cur.ing))}${kpi(`Gastos de ${MESL[finM - 1]}`, eur.format(cur.gas))}${kpi('Resultado del mes', eur.format(cur.ing - cur.gas))}${kpi(`Resultado ${finY}`, eur.format(ty.ing - ty.gas), `${eur.format(ty.ing)} ingresos · ${eur.format(ty.gas)} gastos`)}</div>
      <figure class="fin-ch"><svg viewBox="0 0 600 200" role="img" aria-label="Ingresos y gastos por mes de ${finY}">${bar}</svg><figcaption><span class="lg lg-i">Ingresos</span><span class="lg lg-g">Gastos</span><span class="muted">Pulsa un mes para ver sus movimientos.</span></figcaption></figure>
      <h2 class="pn-h">Movimientos de ${MESL[finM - 1]} ${finY}</h2>
      <table class="tbl d-tbl"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Cliente</th><th class="r">Importe</th><th></th></tr></thead><tbody>
      ${list.map((r) => `<tr><td>${fd(r.fecha)}</td><td><b>${esc(r.concepto)}</b></td><td>${esc(r.categoria || '')}</td><td>${esc(r.cliente || '')}</td><td class="r ${r.tipo === 'ingreso' ? 'm-in' : 'm-out'}">${r.tipo === 'ingreso' ? '+' : '−'}${eur.format(r.importe)}</td><td class="r"><button class="btn btn-o btn-sm" data-fe="${r.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sin movimientos este mes.</td></tr>'}</tbody></table>`;
    const FF = [{ k: 'tipo', l: 'Tipo', t: 'select', o: [['ingreso', 'Ingreso'], ['gasto', 'Gasto']] }, { k: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { k: 'concepto', l: 'Concepto', req: 1, w: 1, ph: 'Episodio patrocinado, edición, transporte…' }, { k: 'importe', l: 'Importe (€)', t: 'number', req: 1 },
      { k: 'categoria', l: 'Categoría', ph: 'Patrocinio, equipo, edición…' }, { k: 'cliente', l: 'Cliente o proveedor', w: 1 }, { k: 'notas', l: 'Notas', t: 'textarea', w: 1, r: 2 }];
    const mm = String(finM).padStart(2, '0'), defDate = today().slice(0, 7) === `${finY}-${mm}` ? today() : `${finY}-${mm}-01`;
    $('#fY').onchange = (e) => { finY = +e.target.value; finanzas(); }; $('#fM').onchange = (e) => { finM = +e.target.value; finanzas(); };
    $('#fCsv').onclick = () => { const csv = 'fecha,tipo,concepto,categoria,cliente,importe\n' + rows.map((r) => [r.fecha, r.tipo, r.concepto, r.categoria || '', r.cliente || '', r.importe].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `finanzas-negocios-inside-${finY}.csv`; a.click(); };
    main.onclick = async (e) => {
      const g = e.target.closest('[data-m]'); if (g) { finM = +g.dataset.m; return finanzas(); }
      const ad = e.target.closest('[data-add]'), ed = e.target.closest('[data-fe]'); if (!ad && !ed) return;
      const r = ed ? rows.find((x) => x.id === +ed.dataset.fe) : { tipo: ad.dataset.add, fecha: defDate };
      const v = await modal(ed ? 'Editar movimiento' : ad.dataset.add === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto', FF, r, { del: !!ed }); if (!v) return;
      if (v.__del) { if (await delRow('finance', r.id, 'este movimiento')) finanzas(); return; }
      if (!(v.importe >= 0)) return toast('El importe no es válido.', 1);
      if (await saveRow('finance', r.id, v)) { finY = +v.fecha.slice(0, 4); finM = +v.fecha.slice(5, 7); finanzas(); }
    };
  }

  /* ---------- objetivos ---------- */
  const AREA = { metricas: 'Métricas en redes', facturacion: 'Facturación', clientes: 'Clientes de «Creamos tu podcast»' };
  const goalCard = (g, tasks = null) => { const p = g.objetivo ? Math.min(100, Math.round((+g.actual || 0) / g.objetivo * 100)) : 0; const money = g.area === 'facturacion';
    return `<article class="g-c"><div class="g-h"><span class="g-a">${AREA[g.area]}</span>${tasks ? `<button class="lnk" data-ge="${g.id}">Editar</button>` : ''}</div><h3>${esc(g.titulo)}</h3>
      <div class="g-v"><b>${money ? eur.format(g.actual || 0) : n0(g.actual)}</b> de ${money ? eur.format(g.objetivo || 0) : n0(g.objetivo)} ${esc(g.metrica || '')}</div>
      <div class="g-bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div><span class="muted">${p} %${g.fecha_limite ? ' · hasta ' + fd(g.fecha_limite) : ''}</span>
      ${tasks ? `<ul class="g-t">${tasks.map((t) => `<li><label class="chk"><input type="checkbox" data-tk="${t.id}"${t.hecho ? ' checked' : ''}><span${t.hecho ? ' class="done"' : ''}>${esc(t.titulo)}${t.fecha ? ` <span class="muted">· ${fd(t.fecha)}</span>` : ''}</span></label><button class="g-x" data-td="${t.id}" aria-label="Quitar tarea">×</button></li>`).join('')}</ul>
      <form class="g-add" data-goal="${g.id}"><label class="sr" for="ta${g.id}">Nueva tarea</label><input id="ta${g.id}" placeholder="Nueva tarea del plan"><input type="date" aria-label="Fecha de la tarea"><button class="btn btn-o btn-sm">Añadir</button></form>` : ''}</article>`; };
  async function objetivos() {
    const [goals, tasks] = await Promise.all([q(T('goals').select('*').order('area').order('fecha_limite', { nullsFirst: false })), q(T('plan_tasks').select('*').order('hecho').order('fecha', { nullsFirst: false }))]);
    main.innerHTML = `<h1>Objetivos</h1>
      <div class="pn-bar"><button class="btn btn-y btn-sm" id="gNew">Nuevo objetivo</button><span class="muted">Cada objetivo tiene su pequeño plan de tareas. Actualiza la cifra «actual» cuando avance.</span></div>
      ${Object.entries(AREA).map(([a, n]) => { const l = goals.filter((g) => g.area === a); return `<h2 class="pn-h">${n}</h2>${l.length ? `<div class="g-grid">${l.map((g) => goalCard(g, tasks.filter((t) => t.goal_id === g.id))).join('')}</div>` : `<p class="muted">Sin objetivos todavía. ${a === 'clientes' ? 'Ej.: 3 clientes de «Creamos tu podcast» antes de marzo.' : a === 'facturacion' ? 'Ej.: 5.000 € al mes.' : 'Ej.: 250.000 visualizaciones al mes sumando redes.'}</p>`}`; }).join('')}`;
    const GF = [{ k: 'area', l: 'Área', t: 'select', o: Object.entries(AREA) }, { k: 'titulo', l: 'Objetivo', req: 1, w: 1, ph: '3 clientes de «Creamos tu podcast»' }, { k: 'objetivo', l: 'Cifra objetivo', t: 'number', req: 1 }, { k: 'actual', l: 'Cifra actual', t: 'number' },
      { k: 'metrica', l: 'Unidad', ph: 'clientes, visualizaciones, €…' }, { k: 'fecha_limite', l: 'Fecha límite', t: 'date' }, { k: 'notas', l: 'Notas', t: 'textarea', w: 1, r: 2 }];
    $('#gNew').onclick = async () => { const v = await modal('Nuevo objetivo', GF, { area: 'clientes', actual: 0 }); if (v && !v.__del && await saveRow('goals', 0, v)) objetivos(); };
    main.onclick = async (e) => {
      const ge = e.target.closest('[data-ge]'), td = e.target.closest('[data-td]');
      if (ge) { const g = goals.find((x) => x.id === +ge.dataset.ge); const v = await modal('Editar objetivo', GF, g, { del: 1 }); if (!v) return; if (v.__del) { if (await delRow('goals', g.id, 'este objetivo y su plan')) objetivos(); return; } if (await saveRow('goals', g.id, v)) objetivos(); }
      if (td) { const { error } = await T('plan_tasks').delete().eq('id', td.dataset.td); if (error) toast(errMsg(error), 1); else objetivos(); }
    };
    main.onchange = async (e) => { const c = e.target.closest('[data-tk]'); if (!c) return; const { error } = await T('plan_tasks').update({ hecho: c.checked }).eq('id', c.dataset.tk); if (error) toast(errMsg(error), 1); else objetivos(); };
    main.onsubmit = async (e) => { const f = e.target.closest('[data-goal]'); if (!f) return; e.preventDefault(); const [t, d] = $$('input', f); if (!t.value.trim()) return t.focus(); const { error } = await T('plan_tasks').insert({ goal_id: +f.dataset.goal, titulo: t.value.trim(), fecha: d.value || null }); if (error) toast(errMsg(error), 1); else objetivos(); };
  }

  /* ---------- redes ---------- */
  async function redes() {
    const row = await q(T('settings').select('value').eq('key', 'social_stats').maybeSingle());
    const v = row?.value || { periodo: 'Último mes', redes: [] };
    const tot = () => $$('[data-rv]', main).reduce((a, i) => a + (+i.value || 0), 0);
    main.innerHTML = `<h1>Redes</h1><p class="muted">Estas cifras son las que salen en «El podcast en números» de la web. YouTube se puede leer solo; Instagram, TikTok y LinkedIn no dan sus estadísticas sin acceso a la cuenta, así que cópialas aquí una vez al mes desde las estadísticas de cada app.</p>
      <form class="form ed" id="rdF"><div class="d-2"><div class="f"><label for="rdP">Periodo</label><input id="rdP" value="${esc(v.periodo || '')}" placeholder="Último mes"></div><div class="f"><label for="rdF2">Fuente (se ve pequeño en la web)</label><input id="rdF2" value="${esc(v.fuente || '')}"></div></div>
      <table class="tbl d-tbl"><thead><tr><th>Red</th><th>Usuario</th><th>Enlace</th><th>Qué se mide</th><th class="r">Cifra</th><th class="r">Seguidores</th></tr></thead><tbody>
      ${(v.redes || []).map((r, i) => `<tr><td><b>${esc(r.nombre)}</b></td><td><input class="d-in" data-i="${i}" data-k="handle" value="${esc(r.handle || '')}" aria-label="Usuario en ${esc(r.nombre)}"></td><td><input class="d-in" data-i="${i}" data-k="url" value="${esc(r.url || '')}" aria-label="Enlace de ${esc(r.nombre)}"></td><td><input class="d-in d-in-s" data-i="${i}" data-k="metrica" value="${esc(r.metrica || '')}" aria-label="Métrica de ${esc(r.nombre)}"></td><td class="r"><input class="d-in d-in-n" type="number" min="0" data-rv data-i="${i}" data-k="valor" value="${r.valor ?? ''}" aria-label="Cifra de ${esc(r.nombre)}"></td><td class="r"><input class="d-in d-in-n" type="number" min="0" data-i="${i}" data-k="seguidores" value="${r.seguidores ?? ''}" aria-label="Seguidores en ${esc(r.nombre)}"></td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="4"><b>Total sumando todas las redes</b></td><td class="r"><b id="rdT">${n0(tot())}</b></td><td></td></tr></tfoot></table>
      <div class="cta-row"><button class="btn btn-y">Guardar cifras</button><span class="muted">Última actualización: ${esc(v.actualizado || '—')}. La web las recoge en su próxima actualización (cada 6 horas).</span></div></form>`;
    $('#rdT').textContent = n0(tot());
    main.oninput = (e) => { if (e.target.matches('[data-rv]')) $('#rdT').textContent = n0(tot()); };
    $('#rdF').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nv = { ...v, periodo: $('#rdP').value.trim() || 'Último mes', fuente: $('#rdF2').value.trim(), actualizado: today(), redes: (v.redes || []).map((r) => ({ ...r })) };
      $$('[data-i]', main).forEach((i) => { const r = nv.redes[+i.dataset.i]; const k = i.dataset.k; r[k] = (k === 'valor' || k === 'seguidores') ? (i.value === '' ? null : Math.round(+i.value)) : i.value.trim(); });
      const { error } = await T('settings').upsert({ key: 'social_stats', value: nv }); if (error) return toast(errMsg(error), 1); toast('Cifras guardadas'); redes();
    });
  }

  /* ---------- informes ---------- */
  const REDES = ['Instagram', 'YouTube', 'TikTok', 'LinkedIn'];
  async function informes(id) {
    if (id) return informe(id);
    const rows = await q(T('reports').select('id,titulo,empresa,estado,created_at,plataformas').order('created_at', { ascending: false }));
    const EST = { borrador: 'Borrador', pendiente_ia: 'La IA está escribiendo', listo: 'Listo' };
    main.innerHTML = `<h1>Informes de métricas</h1><p class="muted">El informe que se manda a la empresa cuando acaba su episodio: metes las cifras de cada red, la IA redacta el resumen y lo descargas en PDF.</p>
      <div class="pn-bar"><button class="btn btn-y btn-sm" id="rNew">Nuevo informe</button></div>
      <ul class="nrs">${rows.map((r) => `<li class="nr"><div class="nr-b"><span class="nr-k">${EST[r.estado]} · ${fdate(r.created_at)}</span><b>${esc(r.titulo)}</b><span class="nr-d">${n0((r.plataformas || []).reduce((a, p) => a + (+p.visitas || 0), 0))} visitas en total</span></div><div class="nr-a"><button class="btn btn-o btn-sm" data-rp="${r.id}">Abrir</button></div></li>`).join('') || '<li class="empty">Aún no hay informes.</li>'}</ul>`;
    $('#rNew').onclick = async () => { const { data, error } = await T('reports').insert({ titulo: 'Episodio nuevo: datos y resultados', dias: 14, plataformas: REDES.slice(0, 3).map((red) => ({ red, visitas: null, videos: null })) }).select('id').single(); if (error) return toast(errMsg(error), 1); informe(data.id); };
    main.onclick = (e) => { const b = e.target.closest('[data-rp]'); if (b) informe(+b.dataset.rp); };
  }
  async function informe(id) {
    clearInterval(poll); main.onclick = null;
    const r = await q(T('reports').select('*').eq('id', id).single());
    const pl = REDES.map((red) => (r.plataformas || []).find((p) => p.red === red) || { red });
    const au = r.audiencia || {};
    const inp = (red, k, lab, t = 'number') => { const p = pl.find((x) => x.red === red); return `<div class="f"><label for="p-${red}-${k}">${lab}</label><input id="p-${red}-${k}" data-red="${red}" data-k="${k}" type="${t}"${t === 'number' ? ' min="0"' : ''} value="${esc(p[k] ?? '')}"></div>`; };
    main.innerHTML = `<button class="lnk back" id="bk">← Volver a informes</button><h1>${esc(r.titulo)}</h1>
      <form class="form ed" id="rpF">
        <div class="d-3"><div class="f"><label for="r-t">Título</label><input id="r-t" value="${esc(r.titulo)}"></div><div class="f"><label for="r-e">Empresa</label><input id="r-e" value="${esc(r.empresa || '')}"></div><div class="f"><label for="r-d">Días desde la publicación</label><input id="r-d" type="number" min="1" value="${r.dias ?? 14}"></div></div>
        <h2 class="pn-h">Cifras por red <span class="muted">(deja vacía la red que no uses)</span></h2>
        <div class="rp-grid">${pl.map((p) => `<fieldset class="rp-f"><legend>${p.red}</legend>${inp(p.red, 'visitas', 'Visitas totales')}${inp(p.red, 'videos', 'Nº de vídeos')}${inp(p.red, 'destacado_titulo', 'Vídeo más visto', 'text')}${inp(p.red, 'destacado_visitas', 'Visitas de ese vídeo')}${inp(p.red, 'likes', 'Me gusta')}${inp(p.red, 'seguidores_nuevos', 'Seguidores nuevos')}</fieldset>`).join('')}</div>
        <p><button type="button" class="lnk" id="ytFill">Rellenar YouTube con los datos del canal</button></p>
        <h2 class="pn-h">Audiencia</h2>
        <div class="d-2">${[['genero', 'Género'], ['edad', 'Edad'], ['ubicacion', 'Ubicación e idioma'], ['intereses', 'Intereses (separados por comas)']].map(([k, l]) => `<div class="f"><label for="a-${k}">${l}</label><input id="a-${k}" data-au="${k}" value="${esc(au[k] || '')}"></div>`).join('')}</div>
        <h2 class="pn-h">Resumen</h2>
        <div class="f"><label for="r-s">${r.estado === 'pendiente_ia' ? 'La IA está escribiendo el resumen (1-10 minutos)…' : 'Texto del resumen (puedes editarlo)'}</label><textarea id="r-s" rows="9">${esc(r.resumen || '')}</textarea></div>
        <div class="cta-row"><button class="btn btn-o" name="a" value="save">Guardar</button><button class="btn btn-o" name="a" value="ia"${r.estado === 'pendiente_ia' ? ' disabled' : ''}>Redactar resumen con IA</button><button class="btn btn-y" name="a" value="ver">Ver y descargar PDF</button></div>
        <button type="button" class="lnk del-c" id="rDel">Borrar este informe</button></form>`;
    const collect = () => ({
      titulo: $('#r-t').value.trim() || 'Informe', empresa: $('#r-e').value.trim() || null, dias: +$('#r-d').value || null, resumen: $('#r-s').value.trim() || null,
      plataformas: REDES.map((red) => { const o = { red }; $$(`[data-red="${red}"]`).forEach((i) => { o[i.dataset.k] = i.type === 'number' ? (i.value === '' ? null : +i.value) : (i.value.trim() || null); }); return o; }).filter((o) => o.visitas != null),
      audiencia: Object.fromEntries($$('[data-au]').map((i) => [i.dataset.au, i.value.trim()])),
    });
    $('#bk').onclick = () => informes();
    $('#rDel').onclick = async () => { if (await delRow('reports', id, 'este informe')) informes(); };
    $('#ytFill').onclick = async () => {
      const st = await q(T('podcast_stats').select('data').order('taken_at', { ascending: false }).limit(1)); const d = st[0]?.data || {};
      const w = ($('#r-e').value || $('#r-t').value).toLowerCase().split(/\s+/).filter((x) => x.length > 3);
      const seen = {}; [...(d.latest || []), ...(d.top || [])].forEach((v) => { seen[v.id] = v; });
      const hits = Object.values(seen).filter((v) => w.some((x) => String(v.title || '').toLowerCase().includes(x)));
      if (!hits.length) return toast('No encontré vídeos de esa empresa entre los últimos del canal. Escríbelo a mano.', 1);
      const top = hits.sort((a, b) => (b.views || 0) - (a.views || 0))[0];
      const set = (k, v) => { const i = $(`[data-red="YouTube"][data-k="${k}"]`); if (i) i.value = v; };
      set('visitas', hits.reduce((a, v) => a + (v.views || 0), 0)); set('videos', hits.length); set('destacado_titulo', String(top.title).replace(/#\S+/g, '').trim()); set('destacado_visitas', top.views || 0);
      toast(`YouTube: ${hits.length} vídeos encontrados en el canal`);
    };
    $('#rpF').addEventListener('submit', async (e) => {
      e.preventDefault(); const a = e.submitter?.value, data = collect();
      if (a === 'ia') { if (!data.plataformas.length) return toast('Pon al menos las visitas de una red.', 1); data.estado = 'pendiente_ia'; }
      const { error } = await T('reports').update(data).eq('id', id); if (error) return toast(errMsg(error), 1);
      if (a === 'ver') return printReport({ ...r, ...data });
      toast(a === 'ia' ? 'La IA redactará el resumen en unos minutos. Esta página se actualiza sola.' : 'Guardado'); informe(id);
    });
    if (r.estado === 'pendiente_ia') poll = setInterval(async () => { const { data } = await T('reports').select('estado').eq('id', id).single(); if (data && data.estado !== 'pendiente_ia') { clearInterval(poll); toast('Resumen listo'); informe(id); } }, 20000);
  }
  function printReport(r) {
    const pl = (r.plataformas || []).filter((p) => p.visitas != null);
    const tot = pl.reduce((a, p) => a + (+p.visitas || 0), 0);
    const au = r.audiencia || {};
    const ICO = { Instagram: '<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>', YouTube: '<path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.4 3.1z"/>', TikTok: '<path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 1 1-2-2.7V9.5a6.3 6.3 0 1 0 5.4 6.2V8.8a8.2 8.2 0 0 0 4.8 1.5V6.9z"/>', LinkedIn: '<path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6z"/>' };
    const ico = (red) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[red] || ''}</svg>`;
    const ov = document.createElement('div'); ov.className = 'rp-ov';
    ov.innerHTML = `<div class="rp-bar"><b>Vista del informe</b><span class="muted">Para PDF: «Guardar como PDF» en la ventana de impresión, horizontal.</span><button class="btn btn-y btn-sm" id="rpPrint">Imprimir / PDF</button><button class="btn btn-o btn-sm" id="rpX">Cerrar</button></div>
      <div class="rp">
        <section class="rp-p rp-cover"><img src="${C.base}img/logo.webp" alt="Negocios Inside" width="190"><h1>${esc(r.titulo)}</h1><p>Un análisis del alcance, la audiencia y el impacto de este episodio${r.empresa ? ' con ' + esc(r.empresa) : ''}.</p></section>
        <section class="rp-p"><span class="rp-k">Alcance global</span><h2>El impacto total del episodio</h2><p class="rp-sub">Todas las visualizaciones entre las distintas plataformas desde su publicación${r.dias ? `, un total de <b>${r.dias} días</b>` : ''}.</p>
          <div class="rp-cards">${pl.map((p) => `<div class="rp-card"><span class="rp-red">${ico(p.red)}${p.red}</span><b>${n0(p.visitas)}</b><span>visitas${p.videos ? ` · ${n0(p.videos)} vídeos` : ''}</span>${p.videos ? `<span class="rp-avg">Media por vídeo: ${n0(p.visitas / p.videos)}</span>` : ''}</div>`).join('')}</div>
          <div class="rp-total">+${n0(tot)} visitas en total</div></section>
        <section class="rp-p"><span class="rp-k">Vídeos más destacados</span><h2>El contenido con mayor impacto</h2>
          <div class="rp-cards">${pl.filter((p) => p.destacado_visitas).map((p) => `<div class="rp-card rp-top"><span class="rp-red">${ico(p.red)}${p.red}</span><b>+${n0(p.destacado_visitas)}</b><span>visitas${r.dias ? ` en ${r.dias} días` : ''}</span>${p.destacado_titulo ? `<em>${esc(p.destacado_titulo)}</em>` : ''}<span class="rp-avg">${[p.likes ? n0(p.likes) + ' me gusta' : '', p.seguidores_nuevos ? n0(p.seguidores_nuevos) + ' seguidores nuevos' : ''].filter(Boolean).join(' · ')}</span></div>`).join('') || '<p>Sin vídeo destacado indicado.</p>'}</div></section>
        <section class="rp-p rp-sum"><div><span class="rp-k">Resumen de resultados</span><h2>Los resultados que marcan la diferencia</h2>${(r.resumen || 'Falta el resumen: escríbelo o pide a la IA que lo redacte.').split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join('')}</div>
          <aside class="rp-au"><h3>Perfil e intereses de la audiencia</h3>${[['genero', 'Género'], ['edad', 'Edad'], ['ubicacion', 'Ubicación e idioma']].filter(([k]) => au[k]).map(([k, l]) => `<div><span>${l}</span><b>${esc(au[k])}</b></div>`).join('')}${au.intereses ? `<div><span>Intereses</span><p class="rp-tags">${au.intereses.split(',').map((x) => `<i>${esc(x.trim())}</i>`).join('')}</p></div>` : ''}</aside></section>
        <section class="rp-p rp-cover rp-end"><img src="${C.base}img/logo.webp" alt="" width="150"><h2>¿Hablamos de negocios?</h2><p>Gracias por abrirnos las puertas. Seguimos contando historias de empresas reales.</p><p class="rp-mail">busiinessshark@gmail.com · josegaspard.github.io/negociosinside-web</p></section>
      </div>`;
    document.body.appendChild(ov); document.documentElement.classList.add('rp-on');
    const close = () => { ov.remove(); document.documentElement.classList.remove('rp-on'); removeEventListener('keydown', esc1); };
    const esc1 = (e) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', esc1);
    $('#rpX', ov).onclick = close; $('#rpPrint', ov).onclick = () => print();
  }

  const views = { podcast, prospeccion, calendario, produccion, finanzas, objetivos, informes, redes, resumen, noticias, comentarios, newsletter, usuarios };
  const go = async () => {
    const k = (location.hash.slice(1) || 'podcast'); const v = views[k] ? k : 'podcast';
    $$('.pn-nav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === v));
    clearInterval(poll); main.onchange = null; main.oninput = null; main.onsubmit = null;
    main.onclick = null; main.innerHTML = '<div class="pn-sk"></div><div class="pn-sk"></div>';
    try { await views[v](); } catch (e) { fail(e); }
    main.focus({ preventScroll: true });
  };
  addEventListener('hashchange', go); go();
}
