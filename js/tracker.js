/* ============================================================
   ANALYTICS TRACKER (opt-in)
   Asks first. Only after a visitor clicks "Allow" does it log page
   views, sections reached, clicks, blog searches and time on page
   to the Google Sheet behind analytics/apps-script.gs. No cookies,
   no IP, no names — an anonymous id in localStorage, created only
   after consent. Results: admin.html.
   Usage: load js/analytics-config.js then this, after main.js.
   Opt this device out: visit any page with ?notrack (admin.html
   does it for you when you unlock it).
   ============================================================ */
(function(){
  const cfg = window.ANALYTICS_CONFIG || {};
  if(!/^https:\/\/script\.google\.com\//.test(cfg.endpoint || '')) return;
  if(location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  const store = (s, k, v) => { try{ return v === undefined ? s.getItem(k) : s.setItem(k, v); }catch(e){ return null; } };
  if(new URLSearchParams(location.search).has('notrack')) store(localStorage, 'cv-analytics-optout', '1');
  if(store(localStorage, 'cv-analytics-optout') === '1') return;

  const CONSENT = 'cv-analytics-consent';
  const consent = store(localStorage, CONSENT);
  if(consent === 'granted') start();
  else if(consent !== 'denied') askConsent();

  // ---- Consent banner ----
  function askConsent(){
    const box = document.createElement('div');
    box.className = 'privacy-notice';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Privacy choice');
    box.innerHTML = `
      <p>Can I keep anonymous stats on which pages and buttons you use? It helps me improve this site. No cookies, no names, no IP addresses.</p>
      <div class="privacy-actions">
        <button type="button" class="privacy-btn" data-deny>No thanks</button>
        <button type="button" class="privacy-btn solid" data-allow>Allow</button>
      </div>`;
    box.querySelector('[data-allow]').addEventListener('click', () => {
      store(localStorage, CONSENT, 'granted');
      box.remove();
      start();
    });
    box.querySelector('[data-deny]').addEventListener('click', () => {
      store(localStorage, CONSENT, 'denied');
      box.remove();
    });
    document.body.appendChild(box);
  }

  // ---- Everything below runs only with consent ----
  function start(){
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const clip = (s, n) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

    // Visitor & session ids
    let visitorId = store(localStorage, 'cv-vid');
    if(!visitorId){ visitorId = uid(); store(localStorage, 'cv-vid', visitorId); }
    let sessionId = store(sessionStorage, 'cv-sid');
    let visit = Number(store(localStorage, 'cv-visits')) || 0;
    if(!sessionId){
      sessionId = uid();
      store(sessionStorage, 'cv-sid', sessionId);
      store(localStorage, 'cv-visits', String(++visit));
    }

    // Environment
    const ua = navigator.userAgent;
    const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'Tablet'
      : /Mobi|iPhone|Android/i.test(ua) ? 'Mobile' : 'Desktop';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
      : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
    const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS'
      : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Other';
    let referrer = null;
    try{
      const r = document.referrer && new URL(document.referrer);
      if(r && r.host !== location.host) referrer = r.host.replace(/^www\./, '');
    }catch(e){}
    const params = new URLSearchParams(location.search);
    const utm = ['utm_source', 'utm_medium', 'utm_campaign'].reduce((o, k) => (params.get(k) && (o[k] = clip(params.get(k), 60)), o), {});

    const base = {
      visitor_id: visitorId,
      session_id: sessionId,
      path: clip(location.pathname + location.search, 300),
      device, browser, os,
      lang: clip(navigator.language, 20),
      tz: clip(Intl.DateTimeFormat().resolvedOptions().timeZone, 60)
    };

    // Sending: batched, and flushed when the page hides. Apps Script can't answer CORS
    // preflights, so this is a plain-text beacon whose response we never read.
    let queue = [];
    let timer = null;
    function flush(){
      clearTimeout(timer); timer = null;
      if(!queue.length) return;
      const body = JSON.stringify(queue);
      queue = [];
      if(navigator.sendBeacon && navigator.sendBeacon(cfg.endpoint, body)) return;
      fetch(cfg.endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }).catch(() => {});
    }
    function track(type, fields){
      queue.push(Object.assign({ type, page_title: clip(document.title, 200) }, base, fields));
      if(!timer) timer = setTimeout(flush, 2000);
    }

    // Page view
    track('page_view', {
      referrer,
      meta: Object.assign({ visit, screen: screen.width + 'x' + screen.height }, utm)
    });

    // Where an element sits on the page
    function where(el){
      const sec = el.closest('main section[id]');
      if(sec) return sec.id;
      const areas = [['#cover', 'cover'], ['.rail', 'sidebar'], ['.topbar', 'topbar'], ['#fabWrap', 'quick-actions'],
        ['.search-modal', 'search'], ['.skill-modal', 'skill-popup'], ['.lightbox', 'photo-zoom'], ['.blog-search-float', 'search']];
      const hit = areas.find(([sel]) => el.closest(sel));
      return hit ? hit[1] : 'other';
    }

    // Sections reached (once each per page view)
    const seen = new Set();
    const sectionObs = 'IntersectionObserver' in window && new IntersectionObserver(entries => {
      entries.forEach(e => {
        if(!e.isIntersecting || seen.has(e.target.id)) return;
        seen.add(e.target.id);
        const heading = e.target.querySelector('.eyebrow, h1, h2');
        track('section_view', { section: e.target.id, label: clip(heading ? heading.textContent : e.target.id, 200) });
      });
    }, { threshold: 0.35 });
    if(sectionObs) document.querySelectorAll('main section[id]').forEach(s => sectionObs.observe(s));

    // Clicks (capture phase so handlers that stop/prevent still get counted)
    const CLICKABLE = 'a, button, [role="button"], .tag, img.zoomable';
    document.addEventListener('click', e => {
      const el = e.target.closest && e.target.closest(CLICKABLE);
      if(!el) return;
      // Cards: use their title line rather than all of their text run together.
      const title = el.querySelector('.l, .blog-card-title, h1, h2, h3');
      const label = el.getAttribute('aria-label') || el.getAttribute('alt') || (title && title.textContent) || el.textContent || el.className;
      const target = el.getAttribute('href') || el.dataset.calendlyUrl || el.dataset.set || el.dataset.tag || '';
      track('click', {
        section: where(el),
        label: clip(label, 200) || '(unlabelled)',
        target: clip(target, 300),
        meta: el.hasAttribute('download') ? { download: true } : null
      });
      // A link may navigate away, so don't wait for the batch timer.
      if(el.tagName === 'A') flush();
    }, true);

    // Blog searches (logged once typing pauses)
    let searchTimer = null;
    let lastQuery = '';
    document.addEventListener('input', e => {
      if(e.target.id !== 'searchInput') return;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = clip(e.target.value, 200).toLowerCase();
        if(q.length < 2 || q === lastQuery) return;
        lastQuery = q;
        track('search', { section: 'search', label: q });
      }, 1200);
    });

    // Time on page (visible time only) & scroll depth
    let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
    let activeMs = 0;
    let maxScroll = 0;
    addEventListener('scroll', () => {
      const doc = document.documentElement;
      const pct = Math.round((scrollY + innerHeight) / Math.max(doc.scrollHeight, 1) * 100);
      if(pct > maxScroll) maxScroll = Math.min(pct, 100);
    }, { passive: true });

    // Each time the tab hides, log the visible time since the last report (the dashboard sums them).
    function leave(){
      if(visibleSince){ activeMs += Date.now() - visibleSince; visibleSince = null; }
      if(activeMs > 500){
        track('page_leave', { duration_ms: Math.min(activeMs, 6 * 3600e3), scroll_pct: maxScroll });
        activeMs = 0;
      }
      flush();
    }
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden') leave();
      else visibleSince = Date.now();
    });
    addEventListener('pagehide', leave);
  }
})();
