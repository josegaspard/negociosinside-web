/* Negocios Inside · cliente propio con la misma forma que supabase-js (12-nov-2026).
   Habla con el motor PHP del mismo dominio (/api): sesión por cookie, consultas estilo PostgREST. */
(() => {
  const J = { 'Content-Type': 'application/json' };
  const call = async (url, opt = {}) => {
    let r;
    try { r = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...opt, headers: { ...J, ...(opt.headers || {}) } }); }
    catch (e) { return { data: null, error: { message: 'No se pudo conectar' }, status: 0 }; }
    const txt = r.status === 204 ? '' : await r.text();
    let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
    if (!r.ok) return { data: null, error: { message: (body && body.message) || String(body || r.status), code: body && body.code, status: r.status }, status: r.status, headers: r.headers };
    return { data: body, error: null, status: r.status, headers: r.headers };
  };
  const enc = (v) => encodeURIComponent(v);
  const inList = (arr) => '(' + arr.map((v) => /[,()"\s]/.test(String(v)) ? '"' + String(v).replace(/"/g, '\\"') + '"' : String(v)).join(',') + ')';

  class Query {
    constructor(api, t) { this.api = api; this.t = t; this.m = 'GET'; this.q = []; this.ord = []; this.body = undefined; this.prefer = []; this.one = 0; this.head = false; this.wantRows = false; }
    select(cols = '*', o = {}) {
      if (this.m === 'GET') { this.q.push(['select', String(cols).replace(/\s+/g, '')]); if (o.count) this.prefer.push('count=' + o.count); if (o.head) this.head = true; }
      else { this.wantRows = true; if (cols && cols !== '*') this.q.push(['select', String(cols).replace(/\s+/g, '')]); }
      return this;
    }
    _f(c, op, v) { this.q.push([c, op + '.' + v]); return this; }
    eq(c, v) { return this._f(c, 'eq', v); } neq(c, v) { return this._f(c, 'neq', v); }
    gt(c, v) { return this._f(c, 'gt', v); } gte(c, v) { return this._f(c, 'gte', v); }
    lt(c, v) { return this._f(c, 'lt', v); } lte(c, v) { return this._f(c, 'lte', v); }
    like(c, v) { return this._f(c, 'like', v); } ilike(c, v) { return this._f(c, 'ilike', v); }
    is(c, v) { return this._f(c, 'is', v); } in(c, a) { return this._f(c, 'in', inList(a)); }
    not(c, op, v) { return this._f(c, 'not', op + '.' + v); }
    filter(c, op, v) { return this._f(c, op, v); }
    match(o) { Object.entries(o).forEach(([k, v]) => this.eq(k, v)); return this; }
    order(c, o = {}) { const asc = o.ascending !== false; this.ord.push(c + (asc ? '.asc' : '.desc') + (o.nullsFirst === undefined ? '' : o.nullsFirst ? '.nullsfirst' : '.nullslast')); return this; }
    limit(n) { this.q.push(['limit', n]); return this; }
    range(a, b) { this.q.push(['offset', a]); this.q.push(['limit', b - a + 1]); return this; }
    single() { this.one = 1; return this; }
    maybeSingle() { this.one = 2; return this; }
    insert(v) { this.m = 'POST'; this.body = v; return this; }
    upsert(v, o = {}) { this.m = 'POST'; this.body = v; this.prefer.push('resolution=' + (o.ignoreDuplicates ? 'ignore' : 'merge') + '-duplicates'); if (o.onConflict) this.q.push(['on_conflict', o.onConflict]); return this; }
    update(v) { this.m = 'PATCH'; this.body = v; return this; }
    delete() { this.m = 'DELETE'; return this; }
    then(ok, ko) { return this._run().then(ok, ko); }
    catch(ko) { return this._run().catch(ko); }
    async _run() {
      const qs = this.q.map(([k, v]) => enc(k) + '=' + enc(v));
      if (this.ord.length) qs.push('order=' + enc(this.ord.join(',')));
      const pref = [...this.prefer]; if (this.m !== 'GET' && (this.wantRows || this.one)) pref.push('return=representation');
      const r = await call(`${this.api}/rest/v1/${this.t}${qs.length ? '?' + qs.join('&') : ''}`, {
        method: this.head ? 'HEAD' : this.m, body: this.body === undefined ? undefined : JSON.stringify(this.body), headers: pref.length ? { Prefer: pref.join(',') } : {} });
      if (r.error) return { data: null, error: r.error, count: null, status: r.status };
      const cr = r.headers && r.headers.get('X-Total-Count');
      let data = this.head ? null : r.data;
      if (this.one && Array.isArray(data)) {
        if (data.length > 1 || (this.one === 1 && data.length !== 1)) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, count: null, status: 406 };
        data = data[0] ?? null;
      }
      return { data, error: null, count: cr == null ? null : +cr, status: r.status };
    }
  }

  const createClient = (api) => {
    api = String(api).replace(/\/+$/, '');
    const A = api + '/auth/';
    const cbs = [];
    const emit = (ev, s) => cbs.forEach((f) => { try { f(ev, s); } catch (e) { /* nada */ } });
    const keep = (user) => { try { user ? localStorage.setItem('ni-auth', JSON.stringify({ user })) : localStorage.removeItem('ni-auth'); } catch (e) { /* nada */ } };
    const sess = (user) => user ? { user, access_token: 'cookie', token_type: 'cookie' } : null;
    const withUser = async (p, ev) => {
      const r = await p; if (r.error) return { data: { user: null, session: null }, error: r.error };
      const u = r.data && r.data.user; keep(u); if (u && ev) emit(ev, sess(u));
      return { data: { user: u, session: sess(u) }, error: null };
    };
    const post = (a, b) => call(A + a, { method: 'POST', body: JSON.stringify(b || {}) });
    const auth = {
      async getSession() { const r = await call(A + 'session'); const u = r.data && r.data.user; keep(u || null); return { data: { session: sess(u) }, error: r.error }; },
      async getUser() { const r = await call(A + 'session'); return { data: { user: (r.data && r.data.user) || null }, error: r.error }; },
      signUp({ email, password, options = {} }) { return withUser(post('signup', { email, password, data: options.data || {} }), 'SIGNED_IN'); },
      signInWithPassword({ email, password }) { return withUser(post('login', { email, password }), 'SIGNED_IN'); },
      async signInWithOtp({ email, options = {} }) { const r = await post('otp', { email, redirect_to: options.emailRedirectTo }); return { data: {}, error: r.error }; },
      async resetPasswordForEmail(email, o = {}) { const r = await post('recover', { email, redirect_to: o.redirectTo }); return { data: {}, error: r.error }; },
      updateUser(b) { return withUser(post('update', b), 'USER_UPDATED'); },
      async signOut() { const r = await post('logout'); keep(null); emit('SIGNED_OUT', null); return { error: r.error }; },
      async signInWithOAuth({ provider, options = {} }) {
        if (provider !== 'google') return { data: null, error: { message: 'provider is not enabled' } };
        location.href = A + 'google?to=' + enc(options.redirectTo || location.href); return { data: {}, error: null };
      },
      onAuthStateChange(f) { cbs.push(f); return { data: { subscription: { unsubscribe() { const i = cbs.indexOf(f); if (i >= 0) cbs.splice(i, 1); } } } }; },
    };
    return {
      auth,
      from: (t) => new Query(api, t),
      rpc: (fn, args = {}) => {
        const p = call(`${api}/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }).then((r) => ({ data: r.error ? null : r.data, error: r.error, status: r.status }));
        return p;
      },
    };
  };
  window.supabase = { createClient };
})();
