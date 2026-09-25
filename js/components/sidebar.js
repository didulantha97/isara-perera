/* ============================================================
   SIDEBAR COMPONENT
   Shared mobile topbar + left rail for every page.
   Usage: <div id="site-sidebar" data-page="home|blog"></div>
          <script src="js/components/sidebar.js"></script>
   Load it right after the placeholder and before main.js.
   ============================================================ */
(function(){
  const mount = document.getElementById('site-sidebar');
  if(!mount) return;
  const page = mount.dataset.page || 'home';
  const onHome = page === 'home';

  // Section links jump in-page on the home page, and back to it from elsewhere.
  const sectionHref = id => (onHome ? '' : 'index.html') + '#' + id;
  const NAV = [
    { label: 'Home',           href: sectionHref('home'),           key: 'home' },
    { label: 'About',          href: sectionHref('about') },
    { label: 'Expertise',      href: sectionHref('expertise') },
    { label: 'Experience',     href: sectionHref('experience') },
    { label: 'Certifications', href: sectionHref('certifications') },
    { label: 'Contact',        href: sectionHref('contact') }
  ];

  const navLinks = NAV.map(item => {
    const active = item.key === page;
    // On the home page scrollspy moves the highlight, so only mark other pages as current.
    const current = active && !onHome ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${active ? ' class="active"' : ''}${current}><span class="dot"></span><span class="nav-text">${item.label}</span></a>`;
  }).join('\n      ');

  // Blogs is a separate page, so it sits outside the section nav as a plain text link.
  const onBlog = page === 'blog';
  const blogLink = `<a href="blog.html" class="rail-link${onBlog ? ' current' : ''}"${onBlog ? ' aria-current="page"' : ''}>Blogs<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>`;

  mount.outerHTML = `
  <header class="topbar">
    <span class="tb-name">Isara Perera</span>
    <button class="menu-btn" id="menuBtn" aria-label="Open navigation" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </header>
  <div class="scrim" id="scrim"></div>

  <aside class="rail${onHome ? ' home-active' : ''}" id="rail">
    <div class="avatar"><img id="avatarImg" src="assets/img/avatar.jpg" alt="Isara Perera"></div>
    <div class="name">Isara Perera</div>
    <div class="role">Senior Software Engineer</div>
    <div class="role">Technical Lead</div>
    <hr>
    <nav class="railnav" id="railnav">
      ${navLinks}
    </nav>
    ${blogLink}
    <div class="foot">
      <div class="socials">
        <a href="https://www.linkedin.com/in/isara-perera-a43a0313a" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.24 8.25h4.5V24H.24V8.25ZM8.24 8.25h4.32v2.15h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9V24h-4.5v-6.9c0-1.65-.03-3.78-2.3-3.78-2.3 0-2.65 1.8-2.65 3.66V24h-4.5V8.25Z"/></svg>
        </a>
        <a href="mailto:k.g.i.d.perera@gmail.com" aria-label="Email">
          <svg viewBox="0 0 24 24"><path d="M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 7.2 8-5.2H4l8 5.2Zm0 2.3L3 7.6V18h18V7.6l-9 5.9Z"/></svg>
        </a>
        <a href="https://wa.me/46764432825" target="_blank" rel="noopener" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.2-.4-4.5-1.3l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>
        </a>
        <a href="tel:+46764432825" aria-label="Call">
          <svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z"/></svg>
        </a>
      </div>
      <div class="swatches" role="group" aria-label="Colour theme">
        <span class="lbl">Theme</span>
        <button class="swatch sw-amber" data-set="amber" aria-pressed="true" aria-label="Amber"></button>
        <button class="swatch sw-ocean" data-set="ocean" aria-pressed="false" aria-label="Ocean"></button>
        <button class="swatch sw-teal" data-set="teal" aria-pressed="false" aria-label="Teal"></button>
        <button class="swatch sw-violet" data-set="violet" aria-pressed="false" aria-label="Violet"></button>
        <button class="swatch sw-coral" data-set="coral" aria-pressed="false" aria-label="Coral"></button>
      </div>
    </div>
  </aside>`;
})();
