/* ============================================================
   BLOG PAGE
   Renders window.BLOG_POSTS (js/blog-data.js) as a card list,
   or a single post when the URL is blog.html?post=<slug>.
   ============================================================ */
(function(){
  const posts = (window.BLOG_POSTS || [])
    .filter(p => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const fmtDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  const readTime = html => {
    const words = String(html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220)) + ' min read';
  };
  const tagChips = tags => (tags || []).map(t => `<span class="blog-tag">${esc(t)}</span>`).join('');
  const postHref = p => p.url || `blog.html?post=${encodeURIComponent(p.slug)}`;

  const listView = document.getElementById('blogList');
  const postView = document.getElementById('blogPost');

  // ---- Single post ----
  const slug = new URLSearchParams(location.search).get('post');
  const post = slug && posts.find(p => p.slug === slug && !p.url);
  if(post){
    listView.hidden = true;
    postView.hidden = false;
    document.title = post.title + ' — Isara Perera';
    document.getElementById('postMeta').textContent = fmtDate(post.date) + ' · ' + readTime(post.body);
    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postTags').innerHTML = tagChips(post.tags);
    document.getElementById('postBody').innerHTML = post.body || '';
    return;
  }

  // ---- List ----
  const grid = document.getElementById('blogGrid');
  const filters = document.getElementById('blogFilters');
  const empty = document.getElementById('blogEmpty');
  let activeTag = null;

  function renderGrid(){
    const shown = activeTag ? posts.filter(p => (p.tags || []).includes(activeTag)) : posts;
    empty.hidden = shown.length > 0;
    grid.innerHTML = shown.map(p => {
      const external = Boolean(p.url);
      const meta = fmtDate(p.date) + (external ? '' : ' · ' + readTime(p.body));
      return `
        <a class="blog-card" href="${esc(postHref(p))}"${external ? ' target="_blank" rel="noopener"' : ''}>
          <p class="blog-meta">${esc(meta)}${external ? ' <span class="blog-ext">External ↗</span>' : ''}</p>
          <h2 class="blog-card-title">${esc(p.title)}</h2>
          <p class="blog-summary">${esc(p.summary || '')}</p>
          <div class="blog-tags">${tagChips(p.tags)}</div>
        </a>`;
    }).join('');
  }

  const allTags = [...new Set(posts.flatMap(p => p.tags || []))].sort();
  if(allTags.length > 1){
    filters.innerHTML = [null, ...allTags].map(t =>
      `<button type="button" class="blog-filter" data-tag="${t === null ? '' : esc(t)}" aria-pressed="${t === null}">${t === null ? 'All' : esc(t)}</button>`
    ).join('');
    filters.addEventListener('click', e => {
      const btn = e.target.closest('.blog-filter');
      if(!btn) return;
      activeTag = btn.dataset.tag || null;
      filters.querySelectorAll('.blog-filter').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      renderGrid();
    });
  }

  renderGrid();
})();
