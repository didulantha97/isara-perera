/* ============================================================
   SITE ANALYTICS BACKEND — Google Apps Script + Google Sheet
   Stores events from js/tracker.js in the "events" tab and contact
   form messages from js/contact-form.js in the "messages" tab, and
   hands events to admin.html only when the right access code is given. The code
   lives in Script Properties, never in the website's repo.

   SETUP (one time, ~5 minutes)
   1. Create a new Google Sheet (sheets.new). Name it anything.
   2. Extensions → Apps Script. Replace everything in Code.gs with
      this file and click Save.
   3. Project Settings (gear) → Script Properties → Add property:
        ADMIN_CODE = a long code only you know
   4. Deploy → New deployment → type "Web app":
        Execute as: Me
        Who has access: Anyone
      Deploy, allow the permissions, and copy the Web app URL.
   5. Paste that URL into js/analytics-config.js and push the site.
   6. Open <your-site>/admin.html and enter your ADMIN_CODE.

   After editing this file later: Deploy → Manage deployments →
   Edit (pencil) → Version: New version → Deploy (the URL stays).
   ============================================================ */

/** Only ask for access to this one spreadsheet, not all of your Drive.
 * @OnlyCurrentDoc
 */

var SHEET = 'events';
var MSG_SHEET = 'messages';
var MSG_COLS = ['created_at', 'name', 'email', 'message', 'page', 'lang', 'tz'];
var MSG_LIMITS = { name: 100, email: 200, message: 5000, page: 300, lang: 20, tz: 60 };
var MAX_MSGS_PER_HOUR = 30;    // site-wide cap so a bot can't flood the sheet
var COLS = ['created_at', 'visitor_id', 'session_id', 'type', 'path', 'page_title', 'section', 'label', 'target',
  'referrer', 'device', 'browser', 'os', 'lang', 'tz', 'duration_ms', 'scroll_pct', 'meta'];
var TYPES = ['page_view', 'section_view', 'click', 'search', 'page_leave'];
var LIMITS = { visitor_id: 64, session_id: 64, path: 300, page_title: 200, section: 60, label: 200, target: 300,
  referrer: 200, device: 30, browser: 30, os: 30, lang: 20, tz: 60, meta: 1000 };
var MAX_FAILS = 10;            // wrong codes allowed…
var LOCKOUT_SECONDS = 15 * 60; // …per 15 minutes

// ---- Visitors send events here ----
function doPost(e) {
  var list;
  try { list = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false }); }
  if (list && list.kind === 'message') return saveMessage(list);
  if (!Array.isArray(list)) list = [list];

  var now = new Date();
  var rows = list.slice(0, 50).filter(function (ev) {
    return ev && TYPES.indexOf(ev.type) !== -1 && ev.visitor_id && ev.session_id;
  }).map(function (ev) {
    return COLS.map(function (c) { return c === 'created_at' ? now : cell(c, ev[c]); });
  });
  if (!rows.length) return json({ ok: true });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, COLS.length).setValues(rows);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

// ---- The contact form sends one message here ----
function saveMessage(m) {
  if (m.website) return json({ ok: true }); // honeypot field: only bots fill it in
  var name = String(m.name || '').trim();
  var email = String(m.email || '').trim();
  var message = String(m.message || '').trim();
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Please fill in your name, a valid email and a message.' });
  }

  var cache = CacheService.getScriptCache();
  var sent = Number(cache.get('msgs') || 0);
  if (sent >= MAX_MSGS_PER_HOUR) return json({ ok: false, error: 'Too many messages right now. Please email me instead.' });

  var fields = { name: name, email: email, message: message, page: m.page, lang: m.lang, tz: m.tz };
  var row = MSG_COLS.map(function (c) { return c === 'created_at' ? new Date() : text(fields[c], MSG_LIMITS[c]); });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(MSG_SHEET, MSG_COLS);
    sh.getRange(sh.getLastRow() + 1, 1, 1, MSG_COLS.length).setValues([row]);
    cache.put('msgs', String(sent + 1), 3600);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

// ---- admin.html reads events here: ?code=…&days=7 ----
function doGet(e) {
  var p = (e && e.parameter) || {};
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return json({ ok: false, error: 'Too many wrong codes. Try again in 15 minutes.' });

  var code = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE');
  if (!code) return json({ ok: false, error: 'ADMIN_CODE is not set in the Apps Script project settings.' });
  if (p.code !== code) {
    cache.put('fails', String(fails + 1), LOCKOUT_SECONDS);
    return json({ ok: false, error: 'Wrong access code.' });
  }

  var days = Math.min(Math.max(Number(p.days) || 7, 1), 366);
  var since = Date.now() - days * 864e5;
  var sh = sheet();
  var last = sh.getLastRow();
  var events = [];
  if (last > 1) {
    var values = sh.getRange(2, 1, last - 1, COLS.length).getValues();
    // Rows are appended in time order, so walk back from the newest until out of range.
    for (var i = values.length - 1; i >= 0 && events.length < 50000; i--) {
      var t = values[i][0] instanceof Date ? values[i][0].getTime() : Date.parse(values[i][0]);
      if (t < since) break;
      events.push(toEvent(values[i]));
    }
    events.reverse();
  }
  return json({ ok: true, events: events });
}

// ---- Helpers ----
function sheet(name, cols) {
  name = name || SHEET;
  cols = cols || COLS;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
    sh.setFrozenRows(1);
  }
  return sh;
}

function cell(col, v) {
  if (v === null || v === undefined) return '';
  if (col === 'duration_ms' || col === 'scroll_pct') {
    var n = Math.round(Number(v));
    return isFinite(n) ? Math.max(0, n) : '';
  }
  return text(col === 'meta' ? JSON.stringify(v) : v, LIMITS[col] || 200);
}

function text(v, max) {
  if (v === null || v === undefined) return '';
  var s = String(v).slice(0, max);
  // Visitor text must never become a spreadsheet formula.
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function toEvent(row) {
  var ev = {};
  COLS.forEach(function (c, i) {
    var v = row[i];
    if (c === 'created_at') v = v instanceof Date ? v.toISOString() : String(v);
    else if (c === 'duration_ms' || c === 'scroll_pct') v = v === '' ? null : Number(v);
    else if (c === 'meta') { try { v = v ? JSON.parse(v) : null; } catch (err) { v = null; } }
    else v = v === '' ? null : String(v);
    ev[c] = v;
  });
  return ev;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
