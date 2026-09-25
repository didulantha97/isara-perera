  // ---- Theme switcher (persists per visitor) ----
  const root = document.documentElement;
  const swatches = document.querySelectorAll('.swatch');
  function setTheme(name){
    root.setAttribute('data-theme', name);
    swatches.forEach(s => s.setAttribute('aria-pressed', String(s.dataset.set === name)));
    try{ localStorage.setItem('cv-theme', name); }catch(e){}
  }
  swatches.forEach(s => s.addEventListener('click', () => setTheme(s.dataset.set)));
  try{
    const saved = localStorage.getItem('cv-theme');
    if(saved) setTheme(saved);
  }catch(e){}

  // ---- Hero photo (reuses the sidebar avatar image) ----
  const avatarImg = document.getElementById('avatarImg');
  const heroImg = document.getElementById('heroImg');
  if(avatarImg && heroImg) heroImg.src = avatarImg.src;

  // ---- Landing cover ----
  const cover = document.getElementById('cover');
  const coverImg = document.getElementById('coverImg');
  const moreBtn = document.getElementById('moreAboutBtn');
  if(avatarImg && coverImg) coverImg.src = avatarImg.src;
  // Arriving at a section link (e.g. index.html#about from the blog) skips the cover.
  if(cover && location.hash && location.hash !== '#home'){
    document.body.classList.remove('cover-open');
    cover.style.display = 'none';
  }
  moreBtn?.addEventListener('click', () => {
    document.body.classList.remove('cover-open');
    cover.classList.add('closing');
    setTimeout(() => { cover.style.display = 'none'; }, 480);
  });

  // ---- Photo lightbox (click/tap a photo to zoom) ----
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  let lastFocused = null;
  function openLightbox(src, alt){
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lastFocused = document.activeElement;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }
  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  }
  if(lightbox){
    document.querySelectorAll('img.zoomable').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.currentSrc || img.src, img.alt));
    });
    lightbox.addEventListener('click', (e) => { if(e.target === lightbox || e.target === lightboxImg) closeLightbox(); });
    lightboxClose.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox(); });
  }

  // ---- Mobile menu ----
  const rail = document.getElementById('rail');
  const scrim = document.getElementById('scrim');
  const menuBtn = document.getElementById('menuBtn');
  function openMenu(open){
    rail.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.getElementById('fabWrap')?.classList.toggle('hide-fab', open);
  }
  menuBtn.addEventListener('click', () => openMenu(!rail.classList.contains('open')));
  scrim.addEventListener('click', () => openMenu(false));
  document.querySelectorAll('#railnav a').forEach(a =>
    a.addEventListener('click', () => openMenu(false)));

  // ---- Scrollspy: highlight active nav link ----
  const links = [...document.querySelectorAll('#railnav a')];
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        links.forEach(l => l.classList.remove('active'));
        map.get(e.target.id)?.classList.add('active');
        rail.classList.toggle('home-active', e.target.id === 'home');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  // Only sections that have a matching nav link (other pages keep their own active link).
  document.querySelectorAll('main section').forEach(s => { if(map.has(s.id)) obs.observe(s); });

  // ---- Calendly scheduling popup ----
  document.querySelectorAll('.calendly-trigger').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const url = el.dataset.calendlyUrl;
      if(window.Calendly){
        window.Calendly.initPopupWidget({ url });
      } else {
        window.open(url, '_blank', 'noopener');
      }
    });
  });

  // ---- Phone/WhatsApp & LinkedIn dropdown cards ----
  const dropdownCards = [];
  function initDropdownCard(id){
    const card = document.getElementById(id);
    if(!card) return;
    const setOpen = (open) => {
      card.classList.toggle('open', open);
      card.setAttribute('aria-expanded', String(open));
      if(open) dropdownCards.forEach(c => { if(c !== card) c.classList.remove('open'), c.setAttribute('aria-expanded','false'); });
    };
    card.addEventListener('click', (e) => {
      if(e.target.closest('.phone-menu')) return;
      setOpen(!card.classList.contains('open'));
    });
    card.addEventListener('keydown', (e) => {
      if(e.target !== card) return;
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        setOpen(!card.classList.contains('open'));
      } else if(e.key === 'Escape'){
        setOpen(false);
      }
    });
    dropdownCards.push(card);
  }
  initDropdownCard('phoneCard');
  initDropdownCard('linkedinCard');
  document.addEventListener('click', (e) => {
    dropdownCards.forEach(card => {
      if(!card.contains(e.target)) card.classList.remove('open'), card.setAttribute('aria-expanded','false');
    });
  });

  // ---- Floating quick actions ----
  const fabWrap = document.getElementById('fabWrap');
  const fabMain = document.getElementById('fabMain');
  if(fabWrap && fabMain){
    const setFabOpen = (open) => {
      fabWrap.classList.toggle('open', open);
      fabMain.setAttribute('aria-expanded', String(open));
    };
    fabMain.addEventListener('click', () => setFabOpen(!fabWrap.classList.contains('open')));
    document.addEventListener('click', (e) => {
      if(!fabWrap.contains(e.target)) setFabOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape') setFabOpen(false);
    });
    fabWrap.querySelectorAll('.fab-actions a, .fab-actions button').forEach(el =>
      el.addEventListener('click', () => setTimeout(() => setFabOpen(false), 150)));
  }

  // ---- Skill detail popups (Technical expertise tags) ----
  const skillModal = document.getElementById('skillModal');
  if(skillModal){
    const skillModalIcon = document.getElementById('skillModalIcon');
    const skillModalCategory = document.getElementById('skillModalCategory');
    const skillModalTitle = document.getElementById('skillModalTitle');
    const skillModalPlain = document.getElementById('skillModalPlain');
    const skillModalTechnical = document.getElementById('skillModalTechnical');
    const skillModalExample = document.getElementById('skillModalExample');
    const skillModalClose = document.getElementById('skillModalClose');
    let skillLastFocused = null;

    function openSkillModal(name){
      const data = window.SKILLS_DATA && window.SKILLS_DATA[name];
      if(!data) return;
      const shapes = (window.SKILL_ICONS && window.SKILL_ICONS[data.icon]) || '';
      skillModalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`;
      skillModalCategory.textContent = data.category || '';
      skillModalTitle.textContent = name;
      skillModalPlain.textContent = data.plain || '';
      skillModalTechnical.textContent = data.technical || '';
      skillModalExample.innerHTML = data.example ? `<span class="sm-example">${data.example}</span>` : '';
      skillLastFocused = document.activeElement;
      skillModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      skillModalClose.focus();
    }
    function closeSkillModal(){
      skillModal.classList.remove('open');
      document.body.style.overflow = '';
      skillLastFocused?.focus?.();
    }
    document.querySelectorAll('#expertise .tag').forEach(tag => {
      tag.tabIndex = 0;
      tag.setAttribute('role', 'button');
      tag.setAttribute('aria-haspopup', 'dialog');
      tag.classList.add('tag-clickable');
      tag.addEventListener('click', () => openSkillModal(tag.textContent.trim()));
      tag.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          openSkillModal(tag.textContent.trim());
        }
      });
    });
    skillModal.addEventListener('click', (e) => { if(e.target.hasAttribute('data-close')) closeSkillModal(); });
    skillModalClose.addEventListener('click', closeSkillModal);
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && skillModal.classList.contains('open')) closeSkillModal(); });
  }

  // ---- Collapsible experience cards ----
  (function initJobCards(){
    const timeline = document.querySelector('#experience .timeline');
    if(!timeline) return;
    const jobs = [...timeline.querySelectorAll('.job')];
    const chevron = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

    const setOpen = (job, open) => {
      job.classList.toggle('open', open);
      job.querySelector('.top').setAttribute('aria-expanded', String(open));
    };

    jobs.forEach((job, idx) => {
      const top = job.querySelector('.top');
      const list = job.querySelector('ul');
      if(!top || !list) return;
      const bodyId = 'job-body-' + idx;

      // Wrap the bullet list so it can animate open/closed
      const body = document.createElement('div');
      body.className = 'job-body';
      body.id = bodyId;
      const inner = document.createElement('div');
      inner.className = 'job-inner';
      list.replaceWith(body);
      inner.appendChild(list);
      body.appendChild(inner);
      list.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));

      // Highlight count chip shown while collapsed
      const count = document.createElement('span');
      count.className = 'job-count';
      count.textContent = list.children.length + ' highlights';
      top.firstElementChild.appendChild(count);

      const chev = document.createElement('span');
      chev.className = 'job-chev';
      chev.innerHTML = chevron;
      top.appendChild(chev);

      top.setAttribute('role', 'button');
      top.setAttribute('tabindex', '0');
      top.setAttribute('aria-controls', bodyId);
      job.classList.add('collapsible');
      setOpen(job, idx === 0);

      // A closed card opens from a click anywhere on it; an open card closes from its header.
      // Ignore the extra clicks of a double-click / rapid taps so they don't cancel each other out.
      let lastToggle = 0;
      const toggle = () => {
        const now = Date.now();
        if(now - lastToggle < 350) return;
        lastToggle = now;
        setOpen(job, !job.classList.contains('open'));
      };
      job.addEventListener('click', (e) => {
        if(e.detail > 1) return;
        if(job.classList.contains('open') && !top.contains(e.target)) return;
        toggle();
      });
      top.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          toggle();
        }
      });
    });

    // Expand / collapse all
    const tools = document.createElement('div');
    tools.className = 'job-tools';
    const toggleAll = document.createElement('button');
    toggleAll.type = 'button';
    const syncLabel = () => {
      const allOpen = jobs.every(j => j.classList.contains('open'));
      toggleAll.textContent = allOpen ? 'Collapse all' : 'Expand all';
    };
    toggleAll.addEventListener('click', () => {
      const allOpen = jobs.every(j => j.classList.contains('open'));
      jobs.forEach(j => setOpen(j, !allOpen));
      syncLabel();
    });
    timeline.addEventListener('click', syncLabel);
    timeline.addEventListener('keydown', syncLabel);
    syncLabel();
    tools.appendChild(toggleAll);
    timeline.before(tools);
    timeline.classList.add('enhanced');

    // Always print the full CV
    window.addEventListener('beforeprint', () => jobs.forEach(j => j.classList.add('open')));
  })();

  // ---- Collapsible expertise categories ----
  (function initSkillCards(){
    const grid = document.querySelector('#expertise .exp-grid');
    if(!grid) return;
    const cats = [...grid.querySelectorAll('.exp-cat')];
    const icons = ['code', 'cloud', 'robot', 'api', 'shield', 'terminal', 'building'];
    const svg = (shapes, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`;
    const chevron = svg('<path d="m6 9 6 6 6-6"/>', 2.4);

    const setOpen = (cat, open) => {
      cat.classList.toggle('open', open);
      cat.querySelector('.cat-head').setAttribute('aria-expanded', String(open));
    };

    cats.forEach((cat, idx) => {
      const h3 = cat.querySelector('h3');
      const tags = cat.querySelector('.tags');
      if(!h3 || !tags) return;
      const names = [...tags.querySelectorAll('.tag')].map(t => t.textContent.trim());
      const bodyId = 'cat-body-' + idx;

      // Header: icon + title + preview line + chevron
      const head = document.createElement('div');
      head.className = 'cat-head';
      const icon = document.createElement('span');
      icon.className = 'cat-icon';
      icon.innerHTML = svg((window.SKILL_ICONS && window.SKILL_ICONS[icons[idx]]) || '', 1.8);
      const text = document.createElement('div');
      text.className = 'cat-text';
      const peek = document.createElement('p');
      peek.className = 'cat-peek';
      peek.innerHTML = `<span class="cat-count">${names.length}</span>${names.slice(0, 3).join(' · ')}${names.length > 3 ? ` <em>+${names.length - 3}</em>` : ''}`;
      h3.replaceWith(head);
      text.append(h3, peek);
      const chev = document.createElement('span');
      chev.className = 'job-chev';
      chev.innerHTML = chevron;
      head.append(icon, text, chev);

      // Wrap the tags so they can animate open/closed
      const body = document.createElement('div');
      body.className = 'cat-body';
      body.id = bodyId;
      const inner = document.createElement('div');
      inner.className = 'cat-inner';
      tags.replaceWith(body);
      inner.appendChild(tags);
      body.appendChild(inner);
      tags.querySelectorAll('.tag').forEach((t, i) => t.style.setProperty('--i', i));

      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-controls', bodyId);
      cat.classList.add('collapsible');
      setOpen(cat, idx < 2);

      let lastToggle = 0;
      const toggle = () => {
        const now = Date.now();
        if(now - lastToggle < 350) return;
        lastToggle = now;
        setOpen(cat, !cat.classList.contains('open'));
        syncLabel();
      };
      cat.addEventListener('click', (e) => {
        if(e.detail > 1) return;
        if(cat.classList.contains('open') && !head.contains(e.target)) return;
        toggle();
      });
      head.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          toggle();
        }
      });
    });

    // Expand / collapse all
    const tools = document.createElement('div');
    tools.className = 'job-tools';
    const toggleAll = document.createElement('button');
    toggleAll.type = 'button';
    function syncLabel(){
      const allOpen = cats.every(c => c.classList.contains('open'));
      toggleAll.textContent = allOpen ? 'Collapse all' : 'Expand all';
    }
    toggleAll.addEventListener('click', () => {
      const allOpen = cats.every(c => c.classList.contains('open'));
      cats.forEach(c => setOpen(c, !allOpen));
      syncLabel();
    });
    syncLabel();
    tools.appendChild(toggleAll);
    grid.before(tools);

    // Two independent columns so opening a card never leaves a gap beside it
    const cols = [0, 1].map(() => {
      const col = document.createElement('div');
      col.className = 'exp-col';
      grid.appendChild(col);
      return col;
    });
    cats.forEach((cat, idx) => {
      cat.style.order = idx; // keeps the original order when stacked on mobile
      cols[idx % 2].appendChild(cat);
    });
    grid.classList.add('enhanced');

    window.addEventListener('beforeprint', () => cats.forEach(c => c.classList.add('open')));
  })();
