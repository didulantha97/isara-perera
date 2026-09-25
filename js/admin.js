/* ============================================================
   ADMIN DASHBOARD (admin.html)
   Unlocks with your access code and reads events and contact-form
   messages from the Google Apps Script backend
   (analytics/apps-script.gs), which checks the code server-side —
   the code and the data are never in this repo. Two tabs:
   Analytics, and Messages (reply, mark replied, archive, delete).
   A message from a visitor who allowed analytics carries their
   visitor id, so it shows what they viewed before writing.
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
  let messages = null;   // null = the backend is an older version without messages
  let msgFilter = 'new';

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

  // ---- Tabs ----
  const TAB_KEY = 'cv-admin-tab';
  function showTab(name){
    document.querySelectorAll('.tabs [role=tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    $('overviewPanel').hidden = name !== 'overview';
    $('messagesPanel').hidden = name !== 'messages';
    $('dashNote').hidden = name !== 'overview';
    store(TAB_KEY, name, sessionStorage);
  }
  $('dashView').querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if(t) showTab(t.dataset.tab);
  });
  showTab(store(TAB_KEY, undefined, sessionStorage) === 'messages' ? 'messages' : 'overview');
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
    messages = Array.isArray(res.messages) ? res.messages : null;
    $('sheetLink').hidden = !res.sheetUrl;
    if(res.sheetUrl) $('sheetLink').href = res.sheetUrl;
    render();
    renderMessages();
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

  // Name of whoever sent a message with this visitor id (only visitors who allowed analytics are linked).
  function senderName(visitor){
    const m = messages?.find(x => x.visitor_id && x.visitor_id === visitor);
    return m ? m.name : null;
  }
  const newestFirst = list => [...list].sort((a, b) => b.start.localeCompare(a.start));

  function sessionHtml(s){
    const count = data.sessions.filter(x => x.visitor === s.visitor).length;
    const contacted = s.events.some(e => e.type === 'click' && contactKind(e));
    const sender = senderName(s.visitor);
    const badges = [
      s.visit > 1 ? `<span class="badge">visit #${s.visit}</span>` : '<span class="badge">new</span>',
      contacted ? '<span class="badge hot">contacted</span>' : '',
      sender ? '<span class="badge hot">sent a message</span>' : ''
    ].join('');
    return `
        <details class="sess">
          <summary>
            <span class="sess-who"><b>${esc(sender || visitorName(s.visitor))}</b>${badges}</span>
            <span class="sess-meta">${esc(fmtDateTime(s.start))} · ${esc(tzLabel(s.tz))} · ${esc(s.device)} ${esc(s.os)} · ${esc(s.referrer || 'direct')}</span>
            <span class="sess-stats">${s.pages} page${s.pages === 1 ? '' : 's'} · ${s.clicks} click${s.clicks === 1 ? '' : 's'} · ${fmtDur(s.duration)}</span>
          </summary>
          <ol class="timeline">
            ${s.events.map(e => { const [kind, html] = describe(e); return `<li class="ev ev-${kind}"><time>${esc(fmtTime(e.created_at))}</time><span>${html}</span></li>`; }).join('')}
          </ol>
          <p class="sess-foot muted">${esc(s.browser)} · ${esc(s.lang || '')} · ${count} visit${count === 1 ? '' : 's'} in this range</p>
        </details>`;
  }

  function renderSessions(){
    const list = newestFirst(data.sessions);
    if(!list.length){ $('sessionList').innerHTML = '<p class="empty">No visits yet.</p>'; $('moreSessions').hidden = true; return; }
    $('sessionList').innerHTML = list.slice(0, sessionsShown).map(sessionHtml).join('');
    $('moreSessions').hidden = list.length <= sessionsShown;
  }

  // ---- Messages ----
  const STATUS_LABEL = { new: 'needs reply', replied: 'replied', archived: 'archived' };

  $('msgFilter').addEventListener('click', e => {
    const btn = e.target.closest('button[data-filter]');
    if(!btn) return;
    msgFilter = btn.dataset.filter;
    $('msgFilter').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    renderMessages();
  });
  $('msgSearch').addEventListener('input', () => renderMessages());
  $('attention').addEventListener('click', e => {
    if(e.target.closest('[data-open-messages]')) showTab('messages');
  });

  function replyLinks(m){
    const subject = 'Re: your message';
    const quote = m.message.length > 1500 ? m.message.slice(0, 1500) + '…' : m.message;
    const body = `Hi ${m.name.split(/\s+/)[0]},\n\n\n\n` +
      `On ${fmtDateTime(m.created_at)}, ${m.name} wrote:\n` + quote.split('\n').map(l => '> ' + l).join('\n');
    const q = new URLSearchParams({ view: 'cm', fs: '1', to: m.email, su: subject, body });
    return {
      mailto: `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      gmail: 'https://mail.google.com/mail/?' + q.toString()
    };
  }

  function renderAttention(){
    const n = messages ? messages.filter(m => m.status === 'new').length : 0;
    $('newCount').hidden = !n;
    $('newCount').textContent = n;
    document.title = (n ? `(${n}) ` : '') + 'Admin Dashboard';
    const box = $('attention');
    if(!messages){
      box.hidden = false;
      box.innerHTML = '<p><b>Messages need a backend update.</b> Paste the new <code>analytics/apps-script.gs</code> into Apps Script, then Deploy → Manage deployments → Edit → New version.</p>';
      return;
    }
    box.hidden = !n;
    if(!n) return;
    const latest = messages.find(m => m.status === 'new');
    box.innerHTML = `<p><b>${n} message${n === 1 ? '' : 's'} waiting for a reply.</b> Latest from ${esc(latest.name)}, ${esc(fmtDateTime(latest.created_at))}.</p>
      <button type="button" class="btn solid" data-open-messages>Open messages</button>`;
  }

  function renderMessages(){
    renderAttention();
    const list = $('msgList');
    if(!messages){
      list.innerHTML = '<p class="empty">Update and redeploy the Apps Script backend to see messages here.</p>';
      return;
    }
    const q = $('msgSearch').value.trim().toLowerCase();
    const shown = messages.filter(m =>
      (msgFilter === 'inbox' ? m.status !== 'archived' : m.status === msgFilter) &&
      (!q || [m.name, m.email, m.message].some(v => v.toLowerCase().includes(q))));
    if(!shown.length){
      list.innerHTML = `<p class="empty">${q ? 'No messages match that search.'
        : msgFilter === 'new' ? 'All caught up — nothing is waiting for a reply.' : 'No messages here.'}</p>`;
      return;
    }
    list.innerHTML = shown.map(m => {
      const r = replyLinks(m);
      const meta = [m.page && 'sent from ' + (isHome(m.page) ? 'Home' : /blog\.html/.test(m.page) ? 'Blog' : m.page), m.tz && tzLabel(m.tz), m.lang].filter(Boolean).join(' · ');
      return `
        <article class="msg msg-${esc(m.status)}" data-id="${esc(m.id)}">
          <header class="msg-top">
            <div class="msg-who">
              <b>${esc(m.name)}</b>
              <a href="mailto:${esc(m.email)}">${esc(m.email)}</a>
              <span class="badge${m.status === 'new' ? ' hot' : ''}">${esc(STATUS_LABEL[m.status])}</span>
            </div>
            <time class="muted" datetime="${esc(m.created_at)}">${esc(fmtDateTime(m.created_at))}</time>
          </header>
          <p class="msg-body">${esc(m.message)}</p>
          ${meta ? `<p class="msg-meta">${esc(meta)}</p>` : ''}
          ${visitsHtml(m)}
          <div class="msg-actions">
            <a class="btn solid sm" href="${esc(r.mailto)}" data-act="reply">Reply</a>
            <a class="btn ghost sm" href="${esc(r.gmail)}" target="_blank" rel="noopener" data-act="reply">Reply in Gmail</a>
            <button type="button" class="btn ghost sm" data-act="copy">Copy email</button>
            ${m.status === 'new'
              ? '<button type="button" class="btn ghost sm" data-act="replied">Mark replied</button>'
              : '<button type="button" class="btn ghost sm" data-act="new">Mark as needs reply</button>'}
            ${m.status !== 'archived' ? '<button type="button" class="btn ghost sm" data-act="archived">Archive</button>' : ''}
            <button type="button" class="btn ghost sm danger" data-act="delete">Delete</button>
          </div>
        </article>`;
    }).join('');
  }

  // What the sender did on the site, when they had allowed analytics.
  function visitsHtml(m){
    if(!m.visitor_id) return '';
    const list = newestFirst(data.sessions.filter(s => s.visitor === m.visitor_id));
    if(!list.length){
      const range = $('rangeSeg').querySelector('[aria-pressed=true]').textContent;
      return `<p class="msg-meta">Their visits fall outside the selected range (${esc(range)}). Pick a longer range above to see them.</p>`;
    }
    const pages = list.reduce((a, s) => a + s.pages, 0);
    const time = list.reduce((a, s) => a + s.duration, 0);
    return `
          <details class="msg-visits">
            <summary>What they viewed · ${list.length} visit${list.length === 1 ? '' : 's'}, ${pages} page${pages === 1 ? '' : 's'}, ${fmtDur(time)}</summary>
            ${list.map(sessionHtml).join('')}
          </details>`;
  }

  // Send a change to the backend. Returns true when it was saved.
  async function sendAction(action, ids, status){
    try{
      const r = await fetch(cfg.endpoint, {
        method: 'POST',
        // text/plain keeps this a "simple" request, since Apps Script can't answer CORS preflights.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ kind: 'admin', code, action, ids, status })
      });
      const res = await r.json();
      if(res.ok && typeof res.updated === 'number') return true;
      if(/code/i.test(res.error || '')){ lock(res.error); return false; }
      toast(res.error || 'That change wasn\'t saved. Redeploy the Apps Script backend and try again.');
    }catch(err){
      toast('Couldn\'t reach the backend. The change wasn\'t saved.');
    }
    return false;
  }

  // Change status right away, save in the background, and put it back if saving fails.
  async function setStatus(m, status, note){
    const before = m.status;
    if(before === status) return;
    m.status = status;
    renderMessages();
    toast(note || `Marked as ${STATUS_LABEL[status]}.`, () => setStatus(m, before, 'Undone.'));
    if(!await sendAction('status', [m.id], status)){ m.status = before; renderMessages(); }
  }

  $('msgList').addEventListener('click', async e => {
    const el = e.target.closest('[data-act]');
    if(!el) return;
    const m = messages.find(x => x.id === el.closest('.msg').dataset.id);
    if(!m) return;
    const act = el.dataset.act;
    // Reply links open the mail app as usual; the message moves to "replied" with an undo.
    // Wait a tick: re-rendering during the click would remove the link before it opens.
    if(act === 'reply') setTimeout(() => setStatus(m, 'replied', 'Opened a reply — marked as replied.'));
    else if(act === 'copy'){
      try{ await navigator.clipboard.writeText(m.email); toast('Copied ' + m.email); }
      catch(err){ toast('Couldn\'t copy. The address is ' + m.email); }
    }
    else if(act === 'delete'){
      if(!confirm(`Delete the message from ${m.name}? This removes it from the sheet and can't be undone.`)) return;
      el.disabled = true;
      if(await sendAction('delete', [m.id])){
        messages = messages.filter(x => x !== m);
        renderMessages();
        toast('Message deleted.');
      } else el.disabled = false;
    }
    else setStatus(m, act);
  });

  // ---- Toast with an optional Undo ----
  let toastTimer;
  function toast(text, undo){
    const t = $('toast');
    t.innerHTML = `<span>${esc(text)}</span>` + (undo ? '<button type="button" class="toast-undo">Undo</button>' : '');
    t.hidden = false;
    if(undo) t.querySelector('button').onclick = () => { t.hidden = true; undo(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, undo ? 6000 : 3500);
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
