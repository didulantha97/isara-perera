/* ============================================================
   SITE ANALYTICS BACKEND — Google Apps Script + Google Sheet
   Stores events from js/tracker.js in the "events" tab and contact
   form messages from js/components/message.js in the "messages" tab,
   and hands both to admin.html (the Admin Dashboard) only when the
   right access code is given. The dashboard can also mark messages
   replied / archived or delete them, with the same code. The code
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
var MSG_COLS = ['created_at', 'name', 'email', 'message', 'page', 'lang', 'tz', 'status', 'id', 'visitor_id'];
var MSG_STATUSES = ['new', 'replied', 'archived'];
var MAX_MSGS_READ = 500;       // newest messages sent to the dashboard
var MSG_LIMITS = { name: 100, email: 200, message: 5000, page: 300, lang: 20, tz: 60, visitor_id: 64 };
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
  if (list && list.kind === 'admin') return adminAction(list);
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

  var fields = { name: name, email: email, message: message, page: m.page, lang: m.lang, tz: m.tz,
    status: 'new', id: Utilities.getUuid(), visitor_id: m.visitor_id };
  var row = MSG_COLS.map(function (c) { return c === 'created_at' ? new Date() : text(fields[c], MSG_LIMITS[c] || 60); });

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

// ---- admin.html reads events and messages here: ?code=…&days=7 ----
function doGet(e) {
  var p = (e && e.parameter) || {};
  var denied = checkCode(p.code);
  if (denied) return json({ ok: false, error: denied });

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
  return json({
    ok: true,
    events: events,
    messages: readMessages(),
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
}

// ---- admin.html changes messages here: { kind: 'admin', code, action: 'status' | 'delete', ids, status } ----
function adminAction(req) {
  var denied = checkCode(req.code);
  if (denied) return json({ ok: false, error: denied });
  var ids = Array.isArray(req.ids) ? req.ids.map(String) : [];
  if (!ids.length) return json({ ok: false, error: 'No messages selected.' });
  if (req.action === 'status' && MSG_STATUSES.indexOf(req.status) === -1) return json({ ok: false, error: 'Unknown status.' });
  if (req.action !== 'status' && req.action !== 'delete') return json({ ok: false, error: 'Unknown action.' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(MSG_SHEET, MSG_COLS);
    var last = sh.getLastRow();
    if (last < 2) return json({ ok: true, updated: 0 });
    var idCol = MSG_COLS.indexOf('id') + 1;
    var statusCol = MSG_COLS.indexOf('status') + 1;
    var rowIds = sh.getRange(2, idCol, last - 1, 1).getValues();
    var rows = [];
    rowIds.forEach(function (r, i) { if (ids.indexOf(String(r[0])) !== -1) rows.push(i + 2); });
    if (req.action === 'delete') {
      // Bottom-up, so earlier deletions don't shift the rows still to go.
      rows.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
    } else {
      rows.forEach(function (r) { sh.getRange(r, statusCol).setValue(req.status); });
    }
    return json({ ok: true, updated: rows.length });
  } finally {
    lock.releaseLock();
  }
}

// ---- Helpers ----
// Returns an error message, or null when the code is right. Wrong codes count toward a lockout.
function checkCode(given) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return 'Too many wrong codes. Try again in 15 minutes.';
  var code = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE');
  if (!code) return 'ADMIN_CODE is not set in the Apps Script project settings.';
  if (given !== code) {
    cache.put('fails', String(fails + 1), LOCKOUT_SECONDS);
    return 'Wrong access code.';
  }
  return null;
}

// Newest first. Messages saved before ids existed get one here, so the dashboard can act on them.
function readMessages() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(MSG_SHEET, MSG_COLS);
    var last = sh.getLastRow();
    if (last < 2) return [];
    var values = sh.getRange(2, 1, last - 1, MSG_COLS.length).getValues();
    var idCol = MSG_COLS.indexOf('id');
    var missing = false;
    values.forEach(function (r) { if (!r[idCol]) { r[idCol] = Utilities.getUuid(); missing = true; } });
    if (missing) sh.getRange(2, idCol + 1, values.length, 1).setValues(values.map(function (r) { return [r[idCol]]; }));
    return values.slice(-MAX_MSGS_READ).reverse().map(function (r) {
      var m = {};
      MSG_COLS.forEach(function (c, i) {
        m[c] = c === 'created_at' ? (r[i] instanceof Date ? r[i].toISOString() : String(r[i])) : String(r[i]);
      });
      if (MSG_STATUSES.indexOf(m.status) === -1) m.status = 'new';
      return m;
    });
  } finally {
    lock.releaseLock();
  }
}

function sheet(name, cols) {
  name = name || SHEET;
  cols = cols || COLS;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < cols.length) {
    // Columns added in a later version: extend the header row in place.
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
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
