/* ============================================================
   BLOG SEARCH COMPONENT
   Searches every blog post — titles, tags, summaries and full text.
   Usage: any element with  data-search-open  opens it (the floating
          bar on blog.html). Load after that markup.
   Open with the search bar, Ctrl/⌘+K, or "/".
   ============================================================ */
(function(){
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const decoder = document.createElement('textarea');
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const stripHtml = html => { decoder.innerHTML = (html || '').replace(/<[^>]+>/g, ' '); return clean(decoder.value); };

  // ---- Modal markup ----
  const modal = document.createElement('div');
  modal.className = 'search-modal';
  modal.id = 'searchModal';
  modal.innerHTML = `
    <div class="search-backdrop" data-close></div>
    <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search blogs">
      <div class="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" id="searchInput" placeholder="Search blogs…" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="searchResults" aria-autocomplete="list">
        <kbd class="search-esc" data-close>Esc</kbd>
      </div>
      <div class="search-results" id="searchResults" role="listbox" aria-label="Search results"></div>
      <div class="search-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
    </div>`;
  document.body.appendChild(modal);
  const input = modal.querySelector('#searchInput');
  const results = modal.querySelector('#searchResults');

  // ---- Index (built on first open) ----
  let index = null;

  function buildBlogItems(){
    return (window.BLOG_POSTS || [])
      .filter(p => !p.draft)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map(p => ({
        title: p.title, sub: (p.tags || []).join(' · '),
        tags: (p.tags || []).join(' '), summary: p.summary || '',
        text: stripHtml(p.body), date: p.date,
        href: p.url || `blog.html?post=${encodeURIComponent(p.slug)}`, external: !!p.url
      }));
  }

  function ensureIndex(){
    if(!index){
      index = buildBlogItems();
      index.forEach(it => {
        it._title = it.title.toLowerCase();
        it._sub = it.tags.toLowerCase();
        it._summary = it.summary.toLowerCase();
        it._text = it.text.toLowerCase();
      });
    }
    return index;
  }

  // ---- Matching ----
  // Every word in the query must appear somewhere in the item; titles weigh most.
  function score(it, terms){
    let total = 0;
    for(const t of terms){
      let s = 0;
      const ti = it._title.indexOf(t);
      if(ti === 0) s = 14;
      else if(ti > 0) s = /\w/.test(it._title[ti - 1]) ? 8 : 11;
      else if(it._sub.includes(t)) s = 6;
      else if(it._summary.includes(t)) s = 4;
      else if(it._text.includes(t)) s = 1 + Math.min(it._text.split(t).length - 1, 5) * .2;
      if(!s) return 0;
      total += s;
    }
    return total;
  }

  function highlight(str, terms){
    let out = esc(str);
    if(!terms.length) return out;
    const re = new RegExp('(' + terms.map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }

  function snippet(it, terms){
    const src = it.summary || it.text;
    if(!terms.length) return src.slice(0, 140);
    // Prefer the summary; fall back to the passage of the body where the match is.
    const lower = src.toLowerCase();
    if(it.summary && terms.some(t => lower.includes(t))) return it.summary;
    const hit = terms.map(t => it._text.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];
    if(hit === undefined) return src.slice(0, 140);
    const start = Math.max(0, hit - 60);
    return (start ? '…' : '') + it.text.slice(start, hit + 110).trim() + '…';
  }

  let flat = [];
  let active = -1;

  function render(){
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    // Empty query lists the latest posts; otherwise best matches first.
    const items = !terms.length ? index.slice(0, 6)
      : index.map(it => [it, score(it, terms)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([it]) => it);
    const label = !terms.length ? 'Latest blogs' : `${items.length} ${items.length === 1 ? 'result' : 'results'}`;

    flat = items;
    if(!items.length){
      results.innerHTML = `<p class="search-empty">No results for “${esc(input.value.trim())}”.</p>`;
      setActive(-1);
      return;
    }
    results.innerHTML = `
      <p class="search-group-label">${label}</p>
      ${items.map((it, i) => `<a class="search-item" id="search-opt-${i}" role="option" aria-selected="false" data-i="${i}" href="${esc(it.href)}"${it.external ? ' target="_blank" rel="noopener"' : ''}>
        <span class="search-item-title">${highlight(it.title, terms)}${it.external ? ' <span class="search-ext">↗</span>' : ''}</span>
        <span class="search-item-sub">${esc(fmtDate(it.date))}${it.sub ? ' · ' + highlight(it.sub, terms) : ''}</span>
        <span class="search-item-text">${highlight(snippet(it, terms), terms)}</span>
      </a>`).join('')}`;
    setActive(0);
  }

  function setActive(i){
    active = i;
    results.querySelectorAll('.search-item').forEach(el => {
      const on = Number(el.dataset.i) === i;
      el.setAttribute('aria-selected', String(on));
      el.classList.toggle('active', on);
      if(on) el.scrollIntoView({ block: 'nearest' });
    });
    if(i >= 0) input.setAttribute('aria-activedescendant', 'search-opt-' + i);
    else input.removeAttribute('aria-activedescendant');
  }

  // ---- Open / close ----
  let lastFocused = null;
  function open(){
    if(modal.classList.contains('open')) return;
    lastFocused = document.activeElement;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    input.focus();
    input.select();
    ensureIndex();
    render();
  }
  function close(){
    if(!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  }

  document.querySelectorAll('[data-search-open]').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('rail')?.classList.contains('open') && document.getElementById('menuBtn')?.click();
    open();
  }));
  modal.addEventListener('click', e => { if(e.target.hasAttribute('data-close')) close(); });
  results.addEventListener('click', e => { if(e.target.closest('.search-item')) close(); });
  results.addEventListener('mousemove', e => {
    const el = e.target.closest('.search-item');
    if(el && Number(el.dataset.i) !== active) setActive(Number(el.dataset.i));
  });
  input.addEventListener('input', () => { if(index) render(); });

  input.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      if(!flat.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + flat.length) % flat.length);
    } else if(e.key === 'Enter'){
      e.preventDefault();
      results.querySelector(`#search-opt-${active}`)?.click();
    }
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && modal.classList.contains('open')){ e.preventDefault(); close(); return; }
    if((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)){ e.preventDefault(); modal.classList.contains('open') ? close() : open(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if(e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey){ e.preventDefault(); open(); }
  });
  // Keep Tab inside the dialog.
  modal.addEventListener('keydown', e => {
    if(e.key !== 'Tab') return;
    e.preventDefault();
    input.focus();
  });

  // Show the right shortcut hint for the platform.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll('[data-search-open] kbd').forEach(k => { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
})();
