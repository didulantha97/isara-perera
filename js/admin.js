/* ============================================================
   ADMIN ANALYTICS DASHBOARD (admin.html)
   Unlocks with your access code and reads events from the Google
   Apps Script backend (analytics/apps-script.gs), which checks the
   code server-side — the code and the data are never in this repo.
   Shortcut: bookmark admin.html#code=YOUR-CODE to unlock directly.
   Event text comes from visitors, so everything rendered goes
   through esc().
   ============================================================ */
(function(){
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const store = (k, v, s = localStorage) => { try{ return v === undefined ? s.getItem(k) : v === null ? s.removeItem(k) : s.setItem(k, v); }catch(e){ return null; } };

  const theme = store('cv-theme');
  if(theme) document.documentElement.setAttribute('data-theme', theme);

  const cfg = window.ANALYTICS_CONFIG || {};
  const show = view => ['loginView', 'setupView', 'dashView'].forEach(id => { $(id).hidden = id !== view; });
  if(!/^https:\/\/script\.google\.com\//.test(cfg.endpoint || '')){
    show('setupView');
    return;
  }

  let days = 7;
  let sessionsShown = 25;
  let data = null;

  // ---- Access code ----
  const CODE_KEY = 'cv-admin-code';
  // Take a code from admin.html#code=… and drop it from the address bar.
  function codeFromHash(){
    const m = /[#&]code=([^&]+)/.exec(location.hash);
    if(!m) return null;
    history.replaceState(null, '', location.pathname + location.search);
    return decodeURIComponent(m[1]);
  }
  let code = codeFromHash() || store(CODE_KEY) || store(CODE_KEY, undefined, sessionStorage);
  addEventListener('hashchange', () => { const c = codeFromHash(); if(c){ code = c; load(); } });

  function lock(message){
    code = null;
    store(CODE_KEY, null);
    store(CODE_KEY, null, sessionStorage);
    $('loginError').textContent = message || '';
    $('loginCode').value = '';
    show('loginView');
    $('loginCode').focus();
  }

  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    code = $('loginCode').value.trim();
    $('loginBtn').disabled = true;
    $('loginError').textContent = '';
    const ok = await load();
    $('loginBtn').disabled = false;
    if(ok) store(CODE_KEY, code, $('loginRemember').checked ? localStorage : sessionStorage);
  });
  $('logoutBtn').addEventListener('click', () => lock());

  // ---- Controls ----
  $('rangeSeg').addEventListener('click', e => {
    const btn = e.target.closest('button[data-days]');
    if(!btn) return;
    days = Number(btn.dataset.days);
    $('rangeSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    load();
  });
  $('refreshBtn').addEventListener('click', load);
  $('moreSessions').addEventListener('click', () => { sessionsShown += 25; renderSessions(); });

  // ---- Load (returns true when the code was accepted) ----
  async function load(){
    $('dashNote').textContent = 'Loading…';
    let res;
    try{
      const r = await fetch(`${cfg.endpoint}?code=${encodeURIComponent(code)}&days=${days}`);
      res = await r.json();
    }catch(err){
      if($('dashView').hidden){
        $('loginError').textContent = 'Could not reach the analytics backend. Check the Web app URL and that it is deployed for "Anyone".';
        show('loginView');
      } else $('dashNote').textContent = 'Could not reach the analytics backend. Try Refresh.';
      return false;
    }
    if(!res.ok){ lock(res.error); return false; }

    // Keep the owner's own visits out of the numbers on this device.
    store('cv-analytics-optout', '1');
    show('dashView');
    const rows = res.events || [];
    $('dashNote').textContent = rows.length
      ? `${rows.length.toLocaleString()} events · updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · your own visits on this device are excluded`
      : 'No events in this range yet. Only visitors who click "Allow" on the privacy notice are counted.';
    data = shape(rows);
    render();
    return true;
  }

  if(code) load(); else show('loginView');

  // ---- Helpers ----
  const pathOnly = p => (p || '').split('?')[0];
  const isHome = p => !/blog\.html|admin\.html/.test(p || '') && /(\/|index\.html)$/.test(pathOnly(p));
  const postSlug = p => { const m = /[?&]post=([^&]+)/.exec(p || ''); return m ? decodeURIComponent(m[1]) : null; };
  const cleanTitle = t => (t || '').replace(/\s+—\s+Isara Perera.*$/, '');
  function pageName(e){
    if(isHome(e.path)) return 'Home';
    if(postSlug(e.path)) return 'Blog: ' + cleanTitle(e.page_title);
    if(/blog\.html/.test(e.path)) return 'Blog list';
    return pathOnly(e.path);
  }
  function tzLabel(tz){
    if(!tz) return 'Unknown';
    const parts = tz.split('/');
    return parts.length > 1 ? `${parts[parts.length - 1].replace(/_/g, ' ')} (${parts[0]})` : tz;
  }
  function fmtDur(ms){
    if(!ms) return '0s';
    const s = Math.round(ms / 1000);
    if(s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if(m < 60) return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
  const fmtTime = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDateTime = iso => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const visitorName = id => 'Visitor ' + String(id).replace(/-/g, '').slice(0, 4).toUpperCase();

  function contactKind(e){
    const t = (e.target || '').toLowerCase();
    if(e.meta?.download || /\.pdf($|\?)/.test(t)) return 'Downloaded CV';
    if(t.startsWith('mailto:')) return 'Email';
    if(t.startsWith('tel:')) return 'Phone call';
    if(t.includes('wa.me') || t.includes('whatsapp')) return 'WhatsApp';
    if(t.includes('linkedin.com/messaging')) return 'LinkedIn message';
    if(t.includes('linkedin.com')) return 'LinkedIn profile';
    if(t.includes('calendly.com')) return 'Book a meeting';
    return null;
  }

  // Count items, tracking total hits and distinct sessions for each key.
  function tally(list, keyFn, extra){
    const m = new Map();
    list.forEach(e => {
      const k = keyFn(e);
      if(k == null || k === '') return;
      let r = m.get(k);
      if(!r){ r = { key: k, count: 0, sessions: new Set(), first: e }; m.set(k, r); }
      r.count++;
      r.sessions.add(e.session_id);
      extra?.(r, e);
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }

  // ---- Shape raw rows into what the dashboard needs ----
  function shape(rows){
    const by = t => rows.filter(e => e.type === t);
    const views = by('page_view');
    const clicks = by('click');
    const leaves = by('page_leave');

    const sessions = new Map();
    rows.forEach(e => {
      let s = sessions.get(e.session_id);
      if(!s){ s = { id: e.session_id, visitor: e.visitor_id, events: [], duration: 0, visit: 1 }; sessions.set(e.session_id, s); }
      s.events.push(e);
      if(e.type === 'page_leave') s.duration += e.duration_ms || 0;
      if(e.type === 'page_view'){
        s.visit = Math.max(s.visit, e.meta?.visit || 1);
        if(!s.entry){ s.entry = e; }
      }
    });
    sessions.forEach(s => {
      const first = s.entry || s.events[0];
      Object.assign(s, {
        start: s.events[0].created_at,
        end: s.events[s.events.length - 1].created_at,
        referrer: s.entry?.referrer || s.entry?.meta?.utm_source || null,
        device: first.device, os: first.os, browser: first.browser, tz: first.tz, lang: first.lang,
        pages: s.events.filter(e => e.type === 'page_view').length,
        clicks: s.events.filter(e => e.type === 'click').length
      });
    });

    const leaveMs = new Map();
    leaves.forEach(e => { const k = pageName(e); leaveMs.set(k, (leaveMs.get(k) || 0) + (e.duration_ms || 0)); });

    return { rows, views, clicks, leaves, sessions: [...sessions.values()], leaveMs };
  }

  // ---- Rendering ----
  function render(){
    renderTiles();
    renderDays();
    renderLists();
    sessionsShown = 25;
    renderSessions();
  }

  function renderTiles(){
    const { rows, views, clicks, sessions } = data;
    const visitors = new Set(rows.map(e => e.visitor_id)).size;
    const timed = sessions.filter(s => s.duration > 0);
    const avg = timed.length ? timed.reduce((a, s) => a + s.duration, 0) / timed.length : 0;
    const returning = sessions.length ? Math.round(sessions.filter(s => s.visit > 1).length / sessions.length * 100) : 0;
    const contacts = clicks.filter(contactKind).length;
    const tiles = [
      ['Unique visitors', visitors.toLocaleString(), ''],
      ['Visits', sessions.length.toLocaleString(), `${returning}% returning`],
      ['Page views', views.length.toLocaleString(), sessions.length ? (views.length / sessions.length).toFixed(1) + ' per visit' : ''],
      ['Avg. visit length', fmtDur(avg), 'time the tab was visible'],
      ['Clicks', clicks.length.toLocaleString(), ''],
      ['Contact actions', contacts.toLocaleString(), 'email, call, meeting, CV…']
    ];
    $('tiles').innerHTML = tiles.map(([label, value, sub]) =>
      `<div class="tile"><p class="tile-label">${esc(label)}</p><p class="tile-value">${esc(value)}</p><p class="tile-sub">${esc(sub)}</p></div>`).join('');
  }

  function renderDays(){
    const hourly = days === 1;
    const step = hourly ? 3600e3 : 864e5;
    const n = hourly ? 24 : days;
    const now = new Date();
    const startOf = d => { const x = new Date(d); hourly ? x.setMinutes(0, 0, 0) : x.setHours(0, 0, 0, 0); return x.getTime(); };
    const last = startOf(now);
    const buckets = Array.from({ length: n }, (_, i) => ({ t: last - (n - 1 - i) * step, visitors: new Set(), views: 0 }));
    const first = buckets[0].t;
    data.rows.forEach(e => {
      const i = Math.round((startOf(e.created_at) - first) / step);
      const b = buckets[i];
      if(!b) return;
      b.visitors.add(e.visitor_id);
      if(e.type === 'page_view') b.views++;
    });
    const max = Math.max(1, ...buckets.map(b => b.visitors.size));
    const label = t => hourly ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' });
    const every = Math.ceil(n / 8);
    $('dayChart').innerHTML = `
      <div class="dc-axis"><span>${max}</span><span>0</span></div>
      <div class="dc-plot">
        ${buckets.map((b, i) => `
          <div class="dc-col" data-tip="${esc(label(b.t))} — ${b.visitors.size} visitor${b.visitors.size === 1 ? '' : 's'}, ${b.views} page view${b.views === 1 ? '' : 's'}">
            <span class="dc-area"><span class="dc-bar" style="height:${b.visitors.size / max * 100}%"></span></span>
            <span class="dc-x">${i % every === 0 || i === n - 1 ? esc(label(b.t)) : ''}</span>
          </div>`).join('')}
      </div>`;
  }

  // Horizontal bar list: [{label, sub, value, display}]
  function barList(el, items, empty){
    const node = $(el);
    if(!items.length){ node.innerHTML = `<p class="empty">${esc(empty || 'Nothing yet.')}</p>`; return; }
    const max = Math.max(...items.map(i => i.value), 1);
    const row = i => `
      <li class="bar-row">
        <div class="bar-text"><span class="bar-label">${esc(i.label)}</span>${i.sub ? `<span class="bar-sub">${esc(i.sub)}</span>` : ''}</div>
        <span class="bar-val">${esc(i.display ?? i.value)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(i.value / max * 100, 1.5)}%"></span></span>
      </li>`;
    const top = items.slice(0, 8);
    const rest = items.slice(8);
    node.innerHTML = `<ul class="bars">${top.map(row).join('')}</ul>` +
      (rest.length ? `<details class="bars-more"><summary>Show ${rest.length} more</summary><ul class="bars">${rest.map(row).join('')}</ul></details>` : '');
  }
  const perVisit = r => `${r.count} · ${r.sessions.size} visit${r.sessions.size === 1 ? '' : 's'}`;

  function renderLists(){
    const { views, clicks, rows, sessions, leaveMs } = data;

    barList('contactList', tally(clicks, contactKind).map(r => ({ label: r.key, value: r.count, display: perVisit(r) })),
      'No one has reached out yet.');

    barList('clickList', tally(clicks, e => e.label + '\u0000' + e.section).map(r => {
      const [label, section] = r.key.split('\u0000');
      const t = r.first.target && !/^#/.test(r.first.target) ? ' → ' + r.first.target : '';
      return { label, sub: section + t, value: r.count, display: perVisit(r) };
    }), 'No clicks yet.');

    const homeVisits = new Set(views.filter(e => isHome(e.path)).map(e => e.session_id)).size;
    const ORDER = ['home', 'about', 'expertise', 'experience', 'certifications', 'contact'];
    const secs = tally(rows.filter(e => e.type === 'section_view' && isHome(e.path)), e => e.section)
      .sort((a, b) => ((ORDER.indexOf(a.key) + 1) || 99) - ((ORDER.indexOf(b.key) + 1) || 99));
    barList('sectionList', secs.map(r => {
      const pct = homeVisits ? Math.round(r.sessions.size / homeVisits * 100) : 0;
      return { label: r.first.label || r.key, sub: '#' + r.key, value: pct, display: pct + '%' };
    }), 'No section views yet.');

    barList('pageList', tally(views, pageName).map(r => ({
      label: r.key, sub: 'avg ' + fmtDur((leaveMs.get(r.key) || 0) / r.count), value: r.count, display: perVisit(r)
    })), 'No page views yet.');

    barList('skillList', tally(clicks.filter(e => e.section === 'expertise'), e => e.label)
      .map(r => ({ label: r.key, value: r.count, display: perVisit(r) })), 'No skills opened yet.');

    barList('blogList', tally(views.filter(e => postSlug(e.path)), e => cleanTitle(e.page_title) || postSlug(e.path)).map(r => ({
      label: r.key, sub: 'avg ' + fmtDur((leaveMs.get('Blog: ' + r.key) || 0) / r.count), value: r.count, display: perVisit(r)
    })), 'No blog posts read yet.');

    barList('searchList', tally(rows.filter(e => e.type === 'search'), e => e.label)
      .map(r => ({ label: '“' + r.key + '”', value: r.count, display: perVisit(r) })), 'No searches yet.');

    const bySession = (fn) => tally(sessions.map(s => ({ ...s, session_id: s.id })), fn);
    barList('refList', bySession(s => s.referrer || 'Direct / unknown')
      .map(r => ({ label: r.key, value: r.count, display: r.count + ' visit' + (r.count === 1 ? '' : 's') })));

    const visitorsOnce = [...new Map(sessions.map(s => [s.visitor, s])).values()];
    barList('geoList', tally(visitorsOnce.map(s => ({ ...s, session_id: s.id })), s => tzLabel(s.tz))
      .map(r => ({ label: r.key, value: r.count, display: r.count + ' visitor' + (r.count === 1 ? '' : 's') })));

    barList('deviceList', bySession(s => `${s.device} · ${s.os} · ${s.browser}`)
      .map(r => ({ label: r.key, value: r.count, display: r.count + ' visit' + (r.count === 1 ? '' : 's') })));
  }

  function describe(e){
    switch(e.type){
      case 'page_view': return ['view', `Opened <b>${esc(pageName(e))}</b>${e.referrer ? ` from ${esc(e.referrer)}` : ''}`];
      case 'section_view': return ['section', `Scrolled to <b>${esc(e.label || e.section)}</b>`];
      case 'click': {
        const kind = contactKind(e);
        const t = e.target && !/^#/.test(e.target) ? ` <span class="muted">→ ${esc(e.target)}</span>` : '';
        return [kind ? 'contact' : 'click', `${kind ? esc(kind) + ': c' : 'C'}licked <b>${esc(e.label)}</b> <span class="muted">in ${esc(e.section)}</span>${t}`];
      }
      case 'search': return ['search', `Searched blogs for <b>“${esc(e.label)}”</b>`];
      case 'page_leave': return ['leave', `Left ${esc(pageName(e))} after ${fmtDur(e.duration_ms)}${e.scroll_pct ? `, scrolled ${e.scroll_pct}%` : ''}`];
      default: return ['click', esc(e.type)];
    }
  }

  function renderSessions(){
    const list = [...data.sessions].sort((a, b) => b.start.localeCompare(a.start));
    const visitsPer = new Map();
    list.forEach(s => visitsPer.set(s.visitor, (visitsPer.get(s.visitor) || 0) + 1));
    if(!list.length){ $('sessionList').innerHTML = '<p class="empty">No visits yet.</p>'; $('moreSessions').hidden = true; return; }
    $('sessionList').innerHTML = list.slice(0, sessionsShown).map(s => {
      const contacted = s.events.some(e => e.type === 'click' && contactKind(e));
      const badges = [
        s.visit > 1 ? `<span class="badge">visit #${s.visit}</span>` : '<span class="badge">new</span>',
        contacted ? '<span class="badge hot">contacted</span>' : ''
      ].join('');
      return `
        <details class="sess">
          <summary>
            <span class="sess-who"><b>${esc(visitorName(s.visitor))}</b>${badges}</span>
            <span class="sess-meta">${esc(fmtDateTime(s.start))} · ${esc(tzLabel(s.tz))} · ${esc(s.device)} ${esc(s.os)} · ${esc(s.referrer || 'direct')}</span>
            <span class="sess-stats">${s.pages} page${s.pages === 1 ? '' : 's'} · ${s.clicks} click${s.clicks === 1 ? '' : 's'} · ${fmtDur(s.duration)}</span>
          </summary>
          <ol class="timeline">
            ${s.events.map(e => { const [kind, html] = describe(e); return `<li class="ev ev-${kind}"><time>${esc(fmtTime(e.created_at))}</time><span>${html}</span></li>`; }).join('')}
          </ol>
          <p class="sess-foot muted">${esc(s.browser)} · ${esc(s.lang || '')} · ${visitsPer.get(s.visitor)} visit${visitsPer.get(s.visitor) === 1 ? '' : 's'} in this range</p>
        </details>`;
    }).join('');
    $('moreSessions').hidden = list.length <= sessionsShown;
  }

  // ---- Tooltip for the day chart ----
  const tip = $('tip');
  document.addEventListener('pointerover', e => {
    const el = e.target.closest('[data-tip]');
    if(!el){ tip.hidden = true; return; }
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + 'px';
    tip.style.top = (r.top + scrollY - tip.offsetHeight - 8) + 'px';
  });
})();
