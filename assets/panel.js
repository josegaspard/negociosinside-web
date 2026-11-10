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

  const TABS = [['resumen', 'Resumen'], ['noticias', 'Noticias'], ['comentarios', 'Comentarios'], ['newsletter', 'Newsletter'], ['usuarios', 'Usuarios']];
  root.innerHTML = `<div class="pn">
    <aside class="pn-side"><div class="pn-me">${avatar(me.profile.avatar_url, me.profile.display_name)}<div><b>${esc(me.profile.display_name || me.user.email)}</b><span>Administrador</span></div></div>
      <nav class="pn-nav" aria-label="Secciones del panel">${TABS.map(([k, n]) => `<a href="#${k}" data-tab="${k}">${n}</a>`).join('')}</nav>
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
      ${latest.length ? `<h2 class="pn-h">Últimos vídeos</h2><table class="tbl"><thead><tr><th>Vídeo</th><th>Tipo</th><th class="r">Vistas</th></tr></thead><tbody>${latest.map((v) => `<tr><td><a href="https://www.youtube.com/${v.is_short ? 'shorts/' : 'watch?v='}${esc(v.id)}" target="_blank" rel="noopener">${esc(v.title)}</a></td><td>${v.is_short ? 'Short' : 'Vídeo'}</td><td class="r">${nf.format(v.views || 0)}</td></tr>`).join('')}</tbody></table>` : ''}`;
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

  const views = { resumen, noticias, comentarios, newsletter, usuarios };
  const go = async () => {
    const k = (location.hash.slice(1) || 'resumen'); const v = views[k] ? k : 'resumen';
    $$('.pn-nav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === v));
    main.onclick = null; main.innerHTML = '<div class="pn-sk"></div><div class="pn-sk"></div>';
    try { await views[v](); } catch (e) { fail(e); }
    main.focus({ preventScroll: true });
  };
  addEventListener('hashchange', go); go();
}
