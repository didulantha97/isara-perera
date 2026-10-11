/* ============================================================
   INTEGRATION LAB
   Interactive learning widgets for the
   "software-integration-end-to-end-guide" blog post.

   Mounts on elements with [data-il="<widget>"]:
     path       18-lesson learning path with progress
     patterns   pattern explorer (tabs)
     decision   pattern decision helper
     capacity   concurrency + backlog-drain calculator
     quiz       knowledge check with instant feedback
     checklist  architecture review / go-live checklist

   Lesson progress and checklist ticks are kept in this
   browser only (localStorage, best effort).
   ============================================================ */
(function(){
  const mounts = document.querySelectorAll('[data-il]');
  if(!mounts.length) return;

  const STORE_KEY = 'integration-lab-v1';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  let state = { done: [], checks: [] };
  try{ state = Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }catch(e){}
  const save = () => { try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){} };

  /* ---------- Content ---------- */
  const LESSONS = [
    { t:'The integration mindset', track:'Foundations', more:'#what',
      idea:'Integration connects independent systems through explicit contracts, so they can exchange data or trigger behaviour without depending on each other\'s internals.',
      flow:'Producer → Contract → Consumer',
      learn:'Before writing code, name the producer, the consumer, the contract, the transport, who owns the data, how it fails and how success is measured.',
      example:'A quoting app sends an accepted quote to a policy platform. Both sides must agree on the quote ID, what "accepted" means and which system owns the quote afterwards.',
      watch:'Ask "what if the receiver is down?" on day one, not after go-live.' },
    { t:'Network and HTTP basics', track:'Foundations', more:'#protocols',
      idea:'Every API call rides on DNS, TCP, TLS and HTTP. Knowing those layers is what lets you debug timeouts, certificate errors and proxies.',
      flow:'Client → DNS → TLS → HTTP → Server',
      learn:'GET reads, POST creates or commands, PUT replaces, PATCH partially updates, DELETE removes. 2xx is success, 4xx is a client problem, 5xx is a server problem. Learn headers, timeouts and connection pools.',
      example:'GET /customers/42 returns 200 with JSON. POST /orders returns 201 with a Location header pointing at the new order.',
      watch:'A timeout does not prove the server failed to do the work. It only proves you stopped waiting.' },
    { t:'REST and API design', track:'APIs', more:'#contracts',
      idea:'REST APIs expose resources over HTTP. Good ones are consistent in naming, paging, errors and versioning, and are described by an OpenAPI contract.',
      flow:'Consumer → /v1/orders → Order service',
      learn:'Write the OpenAPI contract first: required fields, error schema, page limits, filtering, rate limits, idempotency and a deprecation policy.',
      example:'POST /v1/orders with an Idempotency-Key header creates an order exactly once; GET /v1/orders/{id} reads it back.',
      watch:'An API is a long-lived product contract, not a controller method. Consumers will depend on every quirk.' },
    { t:'GraphQL, gRPC and SOAP', track:'APIs', more:'#protocols',
      idea:'Pick the protocol from the consumer, the latency need and the existing ecosystem, not from fashion.',
      flow:'Client ↔ GraphQL | Service ↔ gRPC | ERP ↔ SOAP',
      learn:'GraphQL lets clients choose the shape of the result. gRPC uses Protobuf contracts and supports streaming. SOAP uses XML contracts and the WS-* standards still common in enterprise products.',
      example:'A mobile app reads nested data through GraphQL, internal services talk gRPC, and the legacy ERP still exposes SOAP.',
      watch:'GraphQL needs query-cost limits and field-level authorization. gRPC is harder to call from browsers and to inspect by hand.' },
    { t:'Authentication and authorization', track:'Security', more:'#security',
      idea:'Authentication proves who the caller is. Authorization decides what that caller may do. Both must hold at every hop.',
      flow:'Client → Identity provider → Token → API',
      learn:'Know OAuth 2.0 client credentials for machines, authorization code with PKCE for users, OpenID Connect for identity, mTLS and certificate-bound tokens for high assurance. Keep secrets in a vault and rotate them.',
      example:'A server-to-server Salesforce integration uses a Connected App with narrow scopes and a dedicated, least-privileged integration user.',
      watch:'Never put secrets in browser JavaScript and never log bearer tokens.' },
    { t:'API security', track:'Security', more:'#security',
      idea:'Treat every input from outside your trust boundary as hostile, and protect data in transit, at rest and in logs.',
      flow:'Request → Gateway → Validation → Service',
      learn:'TLS, schema validation, least privilege, rate limits and quotas, audit logging, secret rotation, SSRF protection and data classification.',
      example:'Verify a webhook\'s signature against the raw request body and reject requests with stale timestamps to stop replays.',
      watch:'CORS is a browser rule, not server-side authorization.' },
    { t:'Synchronous vs asynchronous', track:'Patterns', more:'#patterns',
      idea:'A synchronous call needs both sides healthy at the same moment. Asynchronous messaging lets them work at different times.',
      flow:'Request → Response | Publish → Queue → Worker',
      learn:'Use synchronous calls when the caller truly needs the answer now. Use queues or events when the work can finish later. Agree latency budgets and how stale data is allowed to be.',
      example:'Create a payment intent synchronously, then process settlement updates from signed webhooks.',
      watch:'Async systems need idempotent handlers and a replay plan from the start.' },
    { t:'Webhooks and events', track:'Patterns', more:'#patterns',
      idea:'Webhooks push a notification to your endpoint when something happens elsewhere. An event bus distributes facts to any number of subscribers.',
      flow:'Source → Event → Subscribers',
      learn:'Verify signatures, store the event ID, acknowledge quickly, put the real work on a queue, and expect duplicates and out-of-order delivery.',
      example:'Stripe sends payment_intent.succeeded; a worker verifies it and updates the matching opportunity in the CRM.',
      watch:'Webhooks are at-least-once. Plan for the same event to arrive twice.' },
    { t:'Queues, pub/sub and streams', track:'Patterns', more:'#patterns',
      idea:'A queue gives each job to one worker. Pub/sub gives each subscriber its own copy. A stream keeps an ordered, replayable log per partition.',
      flow:'Producer → Broker → Consumer(s)',
      learn:'Acknowledgements, visibility timeouts, dead-letter queues, consumer groups, offsets, partition keys, ordering and retention.',
      example:'An OrderPlaced event feeds billing and fulfilment; a message that keeps failing is retried, then moved to a DLQ for review.',
      watch:'Ordering is usually guaranteed only within one partition or session, not globally.' },
    { t:'Data models and mapping', track:'Data', more:'#data',
      idea:'Two systems rarely share the same fields, types, identifiers or lifecycles. The mapping between them must be written down.',
      flow:'Source schema → Mapper → Target schema',
      learn:'Document nulls, defaults, enums, units, currency precision, time zones, identifier matching and invalid values. Decide who owns each field.',
      example:'A Salesforce Account external ID maps to the ERP customer code; amounts are decimals, never binary floats.',
      watch:'Never silently drop a field or guess a time zone.' },
    { t:'Consistency and sagas', track:'Data', more:'#reliability',
      idea:'A business transaction across services cannot use one database transaction. Model it as local steps with explicit states and compensations.',
      flow:'Reserve → Charge → Confirm | Fail → Compensate',
      learn:'Eventual consistency, transactional outbox and inbox, sagas (choreography vs orchestration), reconciliation and duplicate protection.',
      example:'Payment succeeds but booking fails: issue a refund, or retry confirmation, according to written business rules.',
      watch:'A retry can arrive after a partial success. Every step needs a stable operation ID.' },
    { t:'Reliability and resilience', track:'Reliability', more:'#reliability',
      idea:'Integrations must survive overload, transient faults, partial outages and calls whose outcome is unknown.',
      flow:'Caller → Timeout → Retry → Circuit breaker → API',
      learn:'Exponential backoff with jitter, overall deadlines, bounded retries, circuit breakers, bulkheads, queues and dead-letter handling.',
      example:'Retry a 429 after Retry-After, retry some 5xx responses, and never blindly retry a POST that has no idempotency key.',
      watch:'Badly tuned retries turn a small outage into a retry storm.' },
    { t:'Observability and support', track:'Operations', more:'#operations',
      idea:'If you cannot trace one transaction across systems, you cannot support it.',
      flow:'Trace ID → Logs + Metrics + Spans',
      learn:'Correlation IDs, structured logs, latency percentiles, error rates, queue age and consumer lag, dashboards, alerts, runbooks and end-to-end SLOs.',
      example:'Follow order 123 through gateway, service, queue and ERP with one trace ID; page someone when DLQ depth starts climbing.',
      watch:'Log the event ID and operation ID, not credentials or full sensitive payloads.' },
    { t:'Testing integrations', track:'Delivery', more:'#testing',
      idea:'Integration tests must prove the contract and the failure paths, not only the happy path.',
      flow:'Unit → Contract → Integration → End-to-end',
      learn:'Unit and mapping tests, consumer-driven contract tests, real broker and database tests, load tests and controlled chaos experiments.',
      example:'Simulate duplicate webhooks, 429 responses, a schema change, an expired OAuth token and a crash halfway through a flow.',
      watch:'External systems change without a deploy on your side. Keep contract tests running.' },
    { t:'Versioning and CI/CD', track:'Delivery', more:'#governance',
      idea:'Ship changes safely with automation and backward-compatible contracts.',
      flow:'Git → CI → Contract checks → Deploy → Monitor',
      learn:'Environment config, protected secrets, schema compatibility gates, feature flags, canary rollout and rollback.',
      example:'Add a new optional field first; remove the old one only after telemetry shows no consumer still reads it.',
      watch:'Rolling back code does not roll back data that was already sent to another system.' },
    { t:'Governance and architecture', track:'Architecture', more:'#charter',
      idea:'Enterprise integrations need clear owners, decision records, a catalog and lifecycle rules.',
      flow:'Business goal → Requirements → ADR → Design → Operate',
      learn:'Record SLOs, RTO and RPO, data classification, retention, legal constraints, cost, support escalation and ownership.',
      example:'An ADR compares a direct API, an iPaaS flow and a queue by latency, complexity, cost and recovery.',
      watch:'Do not pick middleware because it is already licensed. Show the trade-off.' },
    { t:'Salesforce integration patterns', track:'Salesforce', more:'#patterns',
      idea:'Salesforce offers Apex callouts, REST, SOAP, Bulk and Pub/Sub APIs, Platform Events, Change Data Capture and outbound messages.',
      flow:'Salesforce ↔ API | Event bus | Middleware',
      learn:'Named and External Credentials, integration users, Bulk API 2.0 for large volumes, callout limits, Queueable Apex and event replay IDs.',
      example:'A webhook lands in middleware, is validated and queued, and Salesforce is updated by an idempotent upsert on an External ID.',
      watch:'Design around governor limits, transaction boundaries, event retention and the daily API allocation.' },
    { t:'Architect a full integration', track:'Architecture', more:'#decide',
      idea:'Go from requirements to a design that is secure, observable and recoverable, with someone clearly on call for it.',
      flow:'Discover → Design → Build → Test → Run',
      learn:'Sequence diagram, contract, source of truth, trust boundaries, error taxonomy, retries and DLQ, dedupe keys, monitoring, capacity and go-live plan.',
      example:'CRM → integration service → payment provider → webhook → queue → CRM reconciliation, with one trace ID end to end.',
      watch:'Every design must answer: how will support replay or reconcile a failed record?' }
  ];

  const PATTERNS = [
    { id:'rest', name:'Synchronous API', nodes:['Caller','HTTPS / gRPC','Service'],
      best:'Queries and commands where the caller needs the answer now.',
      pros:'Simple model, immediate feedback, mature tooling and status codes.',
      cons:'Both sides must be up together; latency and failures cascade; retries are ambiguous after a timeout.',
      avoid:'The work can finish later.',
      example:'Customer profile lookup, quote calculation, address validation.' },
    { id:'webhook', name:'Webhook', nodes:['Provider','Signed POST','Your endpoint'],
      best:'An external provider tells you that something happened on its side.',
      pros:'Near real time without polling.',
      cons:'Duplicates and reordering, a public endpoint to secure, signature checks and replay protection.',
      avoid:'You can\'t expose an endpoint, or you need guaranteed ordering.',
      example:'A payment provider reports that settlement completed.' },
    { id:'queue', name:'Queue', nodes:['Producer','Durable queue','Worker pool'],
      best:'Jobs that exactly one worker should perform, with spiky or slow processing.',
      pros:'Load levelling, retries under your control, workers scale out.',
      cons:'Eventual consistency, queue lag, poison messages and DLQ operations.',
      avoid:'Several independent consumers each need their own copy.',
      example:'Importing thousands of orders into an ERP.' },
    { id:'pubsub', name:'Publish / subscribe', nodes:['Publisher','Topic / event bus','Subscribers'],
      best:'One business fact should trigger several independent reactions.',
      pros:'Fan-out; the publisher doesn\'t need to know who listens.',
      cons:'Schema governance, ordering, duplicate handling, harder end-to-end debugging.',
      avoid:'Exactly one worker should do the job.',
      example:'OrderPaid triggers fulfilment, loyalty points, analytics and an email.' },
    { id:'stream', name:'Event stream', nodes:['Producers','Partitioned log','Consumer groups'],
      best:'High-rate events that need retained history, replay or stream processing.',
      pros:'Replay, independent consumer offsets, ordering per partition, high throughput.',
      cons:'Partition design, retention, consumer lag and schema evolution need real engineering.',
      avoid:'A simple task queue is enough.',
      example:'Clickstream, IoT telemetry, CDC feeds into a lakehouse.' },
    { id:'cdc', name:'Change data capture', nodes:['Source DB log','CDC connector','Stream / target'],
      best:'Database changes must flow elsewhere incrementally, without full re-extracts.',
      pros:'Low latency, no polling, no change to the source application.',
      cons:'Leaks storage structure to consumers unless you map changes to domain events.',
      avoid:'Consumers need business meaning, not row changes.',
      example:'Keep a search index or a cache in sync with an operational database.' },
    { id:'etl', name:'Batch ETL / ELT', nodes:['Source','Extract + transform','Warehouse'],
      best:'Scheduled bulk movement, historical loads and analytics.',
      pros:'High throughput, efficient transformation at scale.',
      cons:'Freshness lag, late-arriving data, reconciliation of partial loads.',
      avoid:'Operational systems need changes within seconds.',
      example:'Nightly customer master sync into the data warehouse.' }
  ];

  const QUIZ = [
    { q:'What does HTTP 429 usually mean?', o:['The resource was permanently removed','Too many requests: you hit a rate limit','Authentication succeeded'], a:1,
      why:'429 means rate limited. Back off, and honour the Retry-After header if the provider sends one.' },
    { q:'Which technique stops a retried POST from creating a duplicate order?', o:['An idempotency key','More worker threads','Shorter field names'], a:0,
      why:'The server stores the key with the result, so a repeat of the same request returns the original response instead of acting twice.' },
    { q:'Which OAuth flow normally fits machine-to-machine calls?', o:['Implicit grant','Client credentials','Emailing a password to the API team'], a:1,
      why:'Client credentials is the standard flow for confidential machine clients. The implicit grant is deprecated.' },
    { q:'What should a webhook receiver do before trusting a payload?', o:['Trust the source IP alone','Turn off TLS to save time','Verify the provider\'s signature and timestamp'], a:2,
      why:'Check the signature against the raw body and reject stale timestamps to block forged and replayed requests.' },
    { q:'What stops a failing message from looping forever?', o:['Bounded retries plus a dead-letter queue','Infinite recursion','Ignoring every error'], a:0,
      why:'After a set number of attempts the message moves to a DLQ, where someone can inspect it and replay it safely.' },
    { q:'What does eventual consistency mean?', o:['Systems may disagree for a while, then converge','All systems update atomically','Data is never synchronised'], a:0,
      why:'With asynchronous propagation, replicas catch up over time. The business has to accept, and you have to measure, that delay.' },
    { q:'Which value lets you follow one transaction across services?', o:['A random UI colour','A correlation / trace ID','The screen width'], a:1,
      why:'Propagate a trace or correlation ID through every call and message so logs and spans can be joined.' },
    { q:'Which API suits a large Salesforce data load?', o:['Bulk API 2.0','Clicking through the UI','One REST call per record in a loop'], a:0,
      why:'Bulk API 2.0 processes large volumes asynchronously in batches and uses far fewer API calls.' },
    { q:'How should you retry a transient failure?', o:['Instantly and forever','With a new ID on every attempt','Bounded exponential backoff with jitter'], a:2,
      why:'Backoff and jitter spread retries out; a cap on attempts and an overall deadline stop retry storms. Keep the same ID so the retry stays idempotent.' },
    { q:'How should a breaking contract change be handled?', o:['Add a new version and migrate consumers deliberately','Deploy it without notice','Remove fields silently'], a:0,
      why:'Prefer additive changes; when you must break, run old and new side by side and retire the old one based on observed usage.' },
    { q:'What problem does the transactional outbox solve?', o:['Slow web fonts','Avoiding tracing','Saving state and publishing an event consistently'], a:2,
      why:'The event is written in the same database transaction as the state change, then published separately. Consumers must still be idempotent.' },
    { q:'Which question matters most at go-live review?', o:['Can we replay and reconcile failed records?','Does the logo animate?','Can we skip alerting for now?'], a:0,
      why:'Recovery and reconciliation have to exist before launch, not after the first incident.' },
    { q:'A broker offers "exactly-once" processing. What does that cover?', o:['Every external system your consumer calls','Only the boundary the broker controls','Nothing at all'], a:1,
      why:'Exactly-once inside the broker does not make a payment provider or email service part of the same transaction. Define the boundary.' },
    { q:'Your CDC feed emits UPDATE orders SET status=\'P\'. What is the risk of exposing it as-is?', o:['None, it is a domain event','CDC cannot capture updates','Consumers couple to your table structure'], a:2,
      why:'A row change describes storage, not meaning. Map it to an owned event like OrderPaid when consumers need business semantics.' },
    { q:'Input is 10,000 events/s and consumers handle exactly 10,000 events/s. What happens after a 30-minute outage?', o:['The backlog drains in 30 minutes','The backlog never drains','The broker deletes the backlog'], a:1,
      why:'With zero spare capacity there is no catch-up rate. Size for drain rate, not just average throughput.' }
  ];

  const CHECKS = [
    ['Purpose','Business outcome and process owner identified'],
    ['Ownership','Producer, consumer and system-of-record ownership explicit'],
    ['Pattern','Sync/async choice justified by latency and coupling'],
    ['Contract','Version-controlled API, message or file schema exists'],
    ['Semantics','Units, codes, identifiers, time and null semantics defined'],
    ['Evolution','Compatibility and deprecation policy exists'],
    ['Security','Authn, authz, trust boundaries, secrets and certificates designed'],
    ['Privacy','Data classification, minimisation and retention reviewed'],
    ['Reliability','Idempotency and retry semantics documented'],
    ['Failure','DLQ, error, reconciliation and compensation paths designed'],
    ['Consistency','Required consistency model is explicit'],
    ['Transactions','Saga and outbox decisions made where they apply'],
    ['Ordering','Ordering requirement and partition scope explicit'],
    ['Capacity','Average, peak, burst, payload size and growth quantified'],
    ['Performance','SLO and benchmark plan defined'],
    ['Observability','Metrics, logs, traces and correlation IDs specified'],
    ['Testing','Contract, integration, resilience and performance coverage defined'],
    ['CI/CD','Contract and schema compatibility checks automated'],
    ['Deployment','Rollback and safe rollout strategy exists'],
    ['Operations','Dashboard, alerts, runbook and on-call owner exist'],
    ['Recovery','Replay and business reconciliation tested'],
    ['Cost','Unit cost and forecast understood'],
    ['Lifecycle','Deprecation and retirement mechanism exists']
  ];

  /* ---------- Shared bits ---------- */
  const flowHtml = flow => flow.split('|').map(row =>
    `<div class="il-flow">${row.trim().split(/\s*(→|↔)\s*/).map(part =>
      part === '→' || part === '↔' ? `<span class="il-arrow" aria-hidden="true">${part}</span>` : `<span class="il-node">${esc(part)}</span>`
    ).join('')}</div>`).join('');

  const progressHtml = (n, total, label) =>
    `<div class="il-progress"><div class="il-bar"><span style="width:${Math.round(100 * n / total)}%"></span></div><span class="il-plabel">${n} of ${total} ${label}</span></div>`;

  /* ---------- Learning path ---------- */
  function initPath(root){
    const tracks = [...new Set(LESSONS.map(l => l.track))];
    let filter = null, open = -1;

    function render(){
      const done = new Set(state.done);
      root.innerHTML = `
        <div class="il-head">
          <p class="il-kicker">Learning path</p>
          <h3>18 short lessons, from first API call to production</h3>
          <p>Open a lesson, read it in two or three minutes, and mark it complete. Your progress stays in this browser.</p>
          ${progressHtml(done.size, LESSONS.length, 'lessons complete')}
        </div>
        <div class="il-chips" role="group" aria-label="Filter lessons by track">
          ${[null, ...tracks].map(t => `<button type="button" class="il-chip" data-track="${t ? esc(t) : ''}" aria-pressed="${filter === t}">${t ? esc(t) : 'All tracks'}</button>`).join('')}
        </div>
        <ol class="il-lessons">
          ${LESSONS.map((l, i) => (filter && l.track !== filter) ? '' : `
            <li class="il-lesson${done.has(i) ? ' done' : ''}">
              <button type="button" class="il-lbtn" data-open="${i}" aria-expanded="${open === i}" aria-controls="il-l${i}">
                <span class="il-num">${done.has(i) ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <span class="il-ltitle">${esc(l.t)}</span>
                <span class="il-track">${esc(l.track)}</span>
              </button>
              <div class="il-lbody" id="il-l${i}"${open === i ? '' : ' hidden'}>
                <p class="il-idea">${esc(l.idea)}</p>
                ${flowHtml(l.flow)}
                <div class="il-two">
                  <div><strong>What to learn</strong><p>${esc(l.learn)}</p></div>
                  <div><strong>Real-world example</strong><p>${esc(l.example)}</p></div>
                </div>
                <p class="il-watch"><strong>Watch out:</strong> ${esc(l.watch)}</p>
                <div class="il-actions">
                  <button type="button" class="il-btn primary" data-done="${i}">${done.has(i) ? '✓ Completed' : 'Mark complete'}</button>
                  ${i < LESSONS.length - 1 ? `<button type="button" class="il-btn" data-open="${i + 1}" data-advance>Next lesson →</button>` : ''}
                  <a class="il-more" href="${l.more}">Go deeper in the article ↓</a>
                </div>
              </div>
            </li>`).join('')}
        </ol>
        <div class="il-foot"><button type="button" class="il-btn small ghost" data-reset>Reset progress</button></div>`;
    }

    root.addEventListener('click', e => {
      const chip = e.target.closest('[data-track]');
      if(chip){ filter = chip.dataset.track || null; open = -1; render(); return; }
      const done = e.target.closest('[data-done]');
      if(done){
        const i = +done.dataset.done;
        if(!state.done.includes(i)) state.done.push(i);
        save(); render(); return;
      }
      const btn = e.target.closest('[data-open]');
      if(btn){
        const i = +btn.dataset.open;
        if(btn.hasAttribute('data-advance')){ filter = null; open = i; }
        else open = open === i ? -1 : i;
        render();
        if(open === i){
          const el = root.querySelector(`[aria-controls="il-l${i}"]`);
          if(el && btn.hasAttribute('data-advance')){ el.focus(); el.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
        }
        return;
      }
      if(e.target.closest('[data-reset]') && confirm('Reset your lesson progress?')){
        state.done = []; save(); render();
      }
    });
    render();
  }

  /* ---------- Pattern explorer ---------- */
  let selectPattern = null;
  function initPatterns(root){
    let current = 0;
    function render(){
      const p = PATTERNS[current];
      root.innerHTML = `
        <div class="il-head">
          <p class="il-kicker">Pattern explorer</p>
          <h3>Seven ways to move information between systems</h3>
        </div>
        <div class="il-tabs" role="tablist" aria-label="Integration patterns">
          ${PATTERNS.map((x, i) => `<button type="button" role="tab" id="il-pt${i}" aria-selected="${i === current}" aria-controls="il-pp" tabindex="${i === current ? 0 : -1}" data-p="${i}">${esc(x.name)}</button>`).join('')}
        </div>
        <div class="il-ppanel" id="il-pp" role="tabpanel" aria-labelledby="il-pt${current}">
          ${flowHtml(p.nodes.join(' → '))}
          <p class="il-idea"><strong>Best for:</strong> ${esc(p.best)}</p>
          <div class="il-two">
            <div class="good"><strong>Advantages</strong><p>${esc(p.pros)}</p></div>
            <div class="bad"><strong>Trade-offs</strong><p>${esc(p.cons)}</p></div>
          </div>
          <p class="il-small"><strong>Reconsider when:</strong> ${esc(p.avoid)}<br><strong>Example:</strong> ${esc(p.example)}</p>
        </div>`;
    }
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-p]');
      if(b){ current = +b.dataset.p; render(); root.querySelector(`#il-pt${current}`).focus(); }
    });
    root.addEventListener('keydown', e => {
      if(!e.target.closest('[role=tab]') || !['ArrowLeft','ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      current = (current + (e.key === 'ArrowRight' ? 1 : -1) + PATTERNS.length) % PATTERNS.length;
      render(); root.querySelector(`#il-pt${current}`).focus();
    });
    selectPattern = id => {
      const i = PATTERNS.findIndex(x => x.id === id);
      if(i < 0) return;
      current = i; render();
      root.scrollIntoView({ behavior:'smooth', block:'start' });
    };
    render();
  }

  /* ---------- Decision helper ---------- */
  function initDecision(root){
    const Q = [
      { k:'now', label:'Does the caller need the result immediately?', opts:[['yes','Yes'],['no','No, it can finish later']] },
      { k:'who', when:s => s.now === 'yes', label:'Who calls it?', opts:[['public','Partners, apps or other teams'],['internal','Internal services, low latency, typed']] },
      { k:'shape', when:s => s.now === 'no', label:'What best describes the work?', opts:[
        ['job','One worker should do a job'],
        ['fact','Several systems react to a fact'],
        ['replay','We need history, replay or stream analytics'],
        ['notify','An external provider notifies us'],
        ['db','Database changes must flow elsewhere'],
        ['bulk','Periodic bulk or analytical movement']] },
      { k:'multi', label:'Does the business process span several systems that commit separately?', opts:[['no','No'],['simple','Yes, a short, simple flow'],['complex','Yes, with branches, timeouts or refunds']] }
    ];
    const s = {};
    const RECS = {
      public:  ['HTTP API (REST + OpenAPI)','Broad interoperability, mature tooling and caching. Put it behind an API gateway for auth, quotas and analytics.','rest'],
      internal:['gRPC (or HTTP)','Typed Protobuf contracts, generated clients and streaming suit internal, latency-sensitive calls.','rest'],
      job:     ['Queue with competing consumers','Exactly one worker processes each message, and you can scale workers to the backlog.','queue'],
      fact:    ['Publish / subscribe event','Each subscriber gets its own copy, so new consumers can be added without touching the publisher.','pubsub'],
      replay:  ['Durable event stream','A retained, partitioned log lets consumers replay history at their own pace.','stream'],
      notify:  ['Webhook into a queue','Verify the signature, acknowledge fast, then process from a queue so spikes and retries don\'t hit your core systems.','webhook'],
      db:      ['Change data capture','Read the database log incrementally. Map row changes to domain events if consumers need business meaning.','cdc'],
      bulk:    ['Batch ETL / ELT','Bulk movement on a schedule; transform in the warehouse (ELT) unless data must be cleaned before it lands (ETL).','etl']
    };
    function render(){
      const visible = Q.filter(q => !q.when || q.when(s));
      const key = s.now === 'yes' ? s.who : s.now === 'no' ? s.shape : null;
      const rec = key && RECS[key];
      const multi = s.multi === 'simple' ? 'Coordinate it with a <strong>choreographed saga</strong>: each service reacts to events and publishes its own. Keep it short, or it becomes hard to follow.'
                  : s.multi === 'complex' ? 'Coordinate it with an <strong>orchestrated saga</strong>: one workflow owns the state, timeouts and compensations such as refunds.'
                  : s.multi === 'no' ? 'A local transaction is enough. If you also publish an event, use a <strong>transactional outbox</strong>.' : '';
      root.innerHTML = `
        <div class="il-head">
          <p class="il-kicker">Decision helper</p>
          <h3>Which pattern should I start with?</h3>
          <p>Answer a few questions. The result is a starting point to test against your latency, volume, security and recovery needs, not a final answer.</p>
        </div>
        ${visible.map(q => `
          <fieldset class="il-q">
            <legend>${esc(q.label)}</legend>
            <div class="il-chips">${q.opts.map(([v, l]) => `<button type="button" class="il-chip" data-k="${q.k}" data-v="${v}" aria-pressed="${s[q.k] === v}">${esc(l)}</button>`).join('')}</div>
          </fieldset>`).join('')}
        ${rec ? `
          <div class="il-result" aria-live="polite">
            <p class="il-kicker">Start with</p>
            <h4>${esc(rec[0])}</h4>
            <p>${esc(rec[1])}</p>
            ${multi ? `<p>${multi}</p>` : ''}
            <p class="il-small">Whatever you pick: idempotent handlers, bounded retries, a DLQ or error path, correlation IDs and a reconciliation report.</p>
            <button type="button" class="il-btn" data-see="${rec[2]}">See it in the pattern explorer ↑</button>
          </div>` : ''}`;
    }
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if(b){
        s[b.dataset.k] = b.dataset.v;
        if(b.dataset.k === 'now'){ delete s.who; delete s.shape; }
        render();
        const again = root.querySelector(`[data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`);
        if(again) again.focus();
        return;
      }
      const see = e.target.closest('[data-see]');
      if(see && selectPattern) selectPattern(see.dataset.see);
    });
    render();
  }

  /* ---------- Capacity calculator ---------- */
  function initCapacity(root){
    const v = { rate:10000, ms:40, outage:30, cap:15000 };
    const dur = sec => {
      if(sec < 60) return Math.round(sec) + ' s';
      const m = Math.round(sec / 60);
      return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
    };
    root.innerHTML = `
      <div class="il-head">
        <p class="il-kicker">Capacity calculator</p>
        <h3>How many consumers, and how long to catch up?</h3>
        <p>A first-order estimate using Little's law and the catch-up rate after an outage. Measure before you trust it.</p>
      </div>
      <div class="il-form">
        <label><span>Arrival rate <em>(events/s)</em></span><input type="number" min="1" step="100" data-v="rate" value="${v.rate}"></label>
        <label><span>Processing time <em>(ms per event)</em></span><input type="number" min="1" step="5" data-v="ms" value="${v.ms}"></label>
        <label><span>Outage length <em>(minutes)</em></span><input type="number" min="0" step="5" data-v="outage" value="${v.outage}"></label>
        <label><span>Consumer capacity <em>(events/s)</em></span><input type="number" min="1" step="100" data-v="cap" value="${v.cap}"></label>
      </div>
      <div class="il-stats" aria-live="polite"></div>
      <p class="il-small il-verdict"></p>`;
    const out = root.querySelector('.il-stats'), verdict = root.querySelector('.il-verdict');
    function calc(){
      const conc = v.rate * v.ms / 1000;
      const backlog = v.rate * v.outage * 60;
      const net = v.cap - v.rate;
      const drain = net > 0 ? backlog / net : Infinity;
      const head = (v.cap / v.rate - 1) * 100;
      out.innerHTML = [
        [fmt(Math.ceil(conc)), 'concurrent handlers needed'],
        [fmt(backlog), 'events queued during the outage'],
        [net > 0 ? fmt(net) + '/s' : '0/s', 'spare catch-up capacity'],
        [backlog === 0 ? '0 s' : Number.isFinite(drain) ? dur(drain) : 'Never', 'to drain the backlog']
      ].map(([n, k]) => `<div><span class="n">${n}</span><span class="k">${k}</span></div>`).join('');
      verdict.textContent = net <= 0
        ? 'Consumers can\'t outpace arrivals, so any backlog grows forever. Add capacity, shed optional work or apply backpressure.'
        : head < 25
          ? `Only ${Math.round(head)}% headroom. A normal spike will build lag; aim for clearly more than average load.`
          : `${Math.round(head)}% headroom. Now check partition skew, slow downstreams and retries with a real load test.`;
    }
    root.addEventListener('input', e => {
      const k = e.target.dataset.v;
      if(!k) return;
      const n = parseFloat(e.target.value);
      v[k] = Number.isFinite(n) && n >= (k === 'outage' ? 0 : 1) ? n : (k === 'outage' ? 0 : 1);
      calc();
    });
    calc();
  }

  /* ---------- Quiz ---------- */
  function initQuiz(root){
    const picked = {};
    function render(){
      const answered = Object.keys(picked).length;
      const correct = Object.entries(picked).filter(([i, a]) => QUIZ[i].a === a).length;
      root.innerHTML = `
        <div class="il-head">
          <p class="il-kicker">Knowledge check</p>
          <h3>${QUIZ.length} questions, instant feedback</h3>
          ${progressHtml(answered, QUIZ.length, `answered · ${correct} correct`)}
        </div>
        ${QUIZ.map((q, i) => {
          const p = picked[i];
          return `
          <fieldset class="il-q">
            <legend><span class="il-qn">${i + 1}</span>${esc(q.q)}</legend>
            ${q.o.map((o, j) => {
              const cls = p === undefined ? '' : j === q.a ? ' right' : j === p ? ' wrong' : '';
              return `<label class="il-opt${cls}"><input type="radio" name="il-q${i}" value="${j}"${p === j ? ' checked' : ''}${p !== undefined ? ' disabled' : ''}> ${esc(o)}</label>`;
            }).join('')}
            ${p !== undefined ? `<p class="il-why ${p === q.a ? 'ok' : 'no'}" role="status"><strong>${p === q.a ? 'Correct.' : 'Not quite.'}</strong> ${esc(q.why)}</p>` : ''}
          </fieldset>`; }).join('')}
        ${answered === QUIZ.length ? `<div class="il-result"><h4>You scored ${correct} / ${QUIZ.length} (${Math.round(100 * correct / QUIZ.length)}%)</h4><p>${correct === QUIZ.length ? 'Every one right. You\'re ready for the go-live checklist below.' : 'Review the explanations above, revisit the matching lessons, then try again.'}</p></div>` : ''}
        <div class="il-foot"><button type="button" class="il-btn small ghost" data-reset>Start over</button></div>`;
    }
    root.addEventListener('change', e => {
      const m = e.target.name && e.target.name.match(/^il-q(\d+)$/);
      if(!m) return;
      const i = +m[1];
      picked[i] = +e.target.value;
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
      const next = root.querySelector(`input[name="il-q${i + 1}"]`);
      (next || root.querySelector(`input[name="il-q${i}"]:checked`)).focus({ preventScroll:true });
    });
    root.addEventListener('click', e => {
      if(e.target.closest('[data-reset]')){ for(const k in picked) delete picked[k]; render(); root.scrollIntoView({ behavior:'smooth', block:'start' }); }
    });
    render();
  }

  /* ---------- Checklist ---------- */
  function initChecklist(root){
    function render(){
      const on = new Set(state.checks);
      root.innerHTML = `
        <div class="il-head">
          <p class="il-kicker">Architecture review checklist</p>
          <h3>Ready for production?</h3>
          <p>Tick each gate you can answer "yes" to. Ticks are saved in this browser, so you can work through it over several sessions.</p>
          ${progressHtml(on.size, CHECKS.length, 'gates passed')}
        </div>
        <ul class="il-checks">
          ${CHECKS.map(([area, gate], i) => `<li><label><input type="checkbox" data-c="${i}"${on.has(i) ? ' checked' : ''}><span><strong>${esc(area)}</strong>${esc(gate)}</span></label></li>`).join('')}
        </ul>
        <div class="il-actions">
          <button type="button" class="il-btn primary" data-copy>Copy as Markdown</button>
          <button type="button" class="il-btn" data-dl>Download .md</button>
          <button type="button" class="il-btn small ghost" data-reset>Clear ticks</button>
        </div>
        <p class="il-small il-status" role="status"></p>`;
    }
    const md = () => {
      const on = new Set(state.checks);
      return '# Integration architecture review\n\n' + CHECKS.map(([a, g], i) => `- [${on.has(i) ? 'x' : ' '}] **${a}:** ${g}`).join('\n') + '\n';
    };
    const status = t => { const el = root.querySelector('.il-status'); if(el) el.textContent = t; };
    root.addEventListener('change', e => {
      const c = e.target.dataset.c;
      if(c === undefined) return;
      const i = +c;
      state.checks = e.target.checked ? [...new Set([...state.checks, i])] : state.checks.filter(x => x !== i);
      save(); render();
      root.querySelector(`[data-c="${i}"]`).focus();
    });
    root.addEventListener('click', e => {
      if(e.target.closest('[data-copy]')){
        (navigator.clipboard ? navigator.clipboard.writeText(md()) : Promise.reject())
          .then(() => status('Copied. Paste it into your ADR, ticket or wiki.'), () => status('Copy failed. Use Download instead.'));
      } else if(e.target.closest('[data-dl]')){
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([md()], { type:'text/markdown' }));
        a.download = 'integration-review-checklist.md';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else if(e.target.closest('[data-reset]') && confirm('Clear all checklist ticks?')){
        state.checks = []; save(); render();
      }
    });
    render();
  }

  const INIT = { path:initPath, patterns:initPatterns, decision:initDecision, capacity:initCapacity, quiz:initQuiz, checklist:initChecklist };
  mounts.forEach(m => {
    const fn = INIT[m.dataset.il];
    if(fn){ m.classList.add('il'); fn(m); }
  });
})();
