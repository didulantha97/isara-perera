/* ============================================================
   SEND A MESSAGE COMPONENT
   Floating button (icon + label on desktop, icon only on mobile)
   that opens a small message form. Messages go to the same Google
   Apps Script as the analytics (analytics/apps-script.gs), which
   saves them in the "messages" tab of the sheet. Anyone can send
   one. Only if the visitor already allowed analytics is their
   anonymous visitor id sent along (the form says so), so the Admin
   Dashboard can show what they viewed before writing.
   On the home page it sits above the quick-actions button.
   Usage: load js/analytics-config.js, then
          <script src="js/components/message.js"></script>
   Nothing shows when no endpoint is configured.
   ============================================================ */
(function(){
  const endpoint = (window.ANALYTICS_CONFIG || {}).endpoint || '';
  if(!/^https:\/\/script\.google\.com\//.test(endpoint)) return;
  const read = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  // The analytics id, only when the visitor said yes to stats (tracker.js creates it after consent).
  const visitorId = () => read('cv-analytics-consent') === 'granted' ? read('cv-vid') : null;

  const ICON = '<span class="msg-fab-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 21.7a.5.5 0 0 0 .9 0l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="M21.9 2.1 10.9 13.1"/></svg></span>';

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'msg-fab';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'msgPanel');
  fab.setAttribute('aria-label', 'Send a message');
  fab.innerHTML = ICON + '<span class="msg-fab-label">Send a message</span>';

  const panel = document.createElement('div');
  panel.className = 'msg-panel';
  panel.id = 'msgPanel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'msgTitle');
  panel.innerHTML = `
    <div class="msg-head">
      <div>
        <h3 id="msgTitle">Send a message</h3>
        <p>Leave your email and I'll get back to you.</p>
      </div>
      <button type="button" class="msg-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <form class="msg-form" novalidate>
      <label>Name<input name="name" type="text" autocomplete="name" maxlength="100" required></label>
      <label>Email<input name="email" type="email" autocomplete="email" maxlength="200" required></label>
      <label>Message<textarea name="message" rows="4" maxlength="5000" required></textarea></label>
      <p class="msg-note" hidden>Since you allowed site stats, the pages you viewed here are attached for context.</p>
      <label class="msg-hp" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
      <div class="msg-actions">
        <button type="submit" class="btn solid">Send message</button>
        <p class="msg-status" role="status" aria-live="polite"></p>
      </div>
    </form>`;

  document.body.append(fab, panel);

  const form = panel.querySelector('form');
  const status = panel.querySelector('.msg-status');
  const btn = form.querySelector('button[type="submit"]');
  const FAILED = 'Couldn\'t send right now. Please email me instead.';
  const say = (text, kind) => { status.textContent = text; status.className = 'msg-status' + (kind ? ' ' + kind : ''); };

  // ---- Open / close ----
  function setOpen(open){
    panel.hidden = !open;
    fab.classList.toggle('is-hidden', open);
    fab.setAttribute('aria-expanded', String(open));
    if(open){
      panel.querySelector('.msg-note').hidden = !visitorId();
      form.elements.name.focus();
    }
    else fab.focus({ preventScroll: true });
  }
  fab.addEventListener('click', () => setOpen(true));
  panel.querySelector('.msg-close').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !panel.hidden) setOpen(false); });
  // Typed text is kept, so clicking away is safe.
  document.addEventListener('click', e => {
    if(!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) setOpen(false);
  });

  // ---- Send ----
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = form.elements;
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const message = f.message.value.trim();
    if(!name || !email || !message || !f.email.checkValidity()){
      say('Please fill in your name, a valid email and a message.', 'err');
      return;
    }

    btn.disabled = true;
    say('Sending…');
    try{
      // text/plain keeps this a "simple" request, since Apps Script can't answer CORS preflights.
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          kind: 'message', name, email, message,
          website: f.website.value,
          visitor_id: visitorId(),
          page: location.pathname + location.search,
          lang: navigator.language,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });
      const res = await r.json();
      if(res.ok){
        form.reset();
        say('Thanks! Your message was sent.', 'ok');
        // Let the thank-you show briefly, then close and clear it for next time.
        setTimeout(() => {
          if(!panel.hidden) setOpen(false);
          say('');
        }, 2200);
      }else{
        say(res.error || FAILED, 'err');
      }
    }catch(err){
      say(FAILED, 'err');
    }finally{
      btn.disabled = false;
    }
  });
})();
