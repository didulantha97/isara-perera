/* ============================================================
   SDD BUILDER
   Interactive Solution Architecture Design Document generator.
   Mounts on any element with [data-sdd-builder] (used inside the
   "solution-design-document-master-template" blog post).

   One document model → four exports: Word (.doc), Markdown,
   HTML and PDF (browser print). Form state autosaves to this
   browser only (localStorage, best effort).
   ============================================================ */
(function(){
  const mount = document.querySelector('[data-sdd-builder]');
  if(!mount) return;

  const STORE_KEY = 'sdd-builder-v1';
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'solution';

  /* ---------- Reference data (from the master template) ---------- */
  const TIERS = {
    1: { short:'Tier 1', name:'MVP / Small Project', label:'Tier 1 (MVP / Small Project)', hint:'PoC, pilot, early startup' },
    2: { short:'Tier 2', name:'Standard Product', label:'Tier 2 (Standard Product)', hint:'Departmental tool, mid-market SaaS' },
    3: { short:'Tier 3', name:'Enterprise / Mission-Critical', label:'Tier 3 (Enterprise / Mission-Critical)', hint:'High availability, regulated' }
  };
  const TIER_SECTIONS = { 1:[0,1,2,3,4,7,8], 2:[0,1,2,3,4,5,6,7,8,9,10], 3:[0,1,2,3,4,5,6,7,8,9,10,11,12,13] };

  const SECTION_TITLES = [
    'Document Control',
    'Executive Summary & Scope',
    'Architecture Principles & Context',
    'Functional & Non-Functional Requirements (NFRs)',
    'System Architecture & Component Design (C4 Model)',
    'Data Architecture & Lifecycle',
    'Integration & Communication Patterns',
    'Security, Identity & Compliance',
    'Deployment, Infrastructure & DevOps',
    'Observability, Operations & Support',
    'Risks, Assumptions, Constraints & Dependencies (RACK)',
    'Alternative Solutions & Trade-Off Analysis',
    'Cost Estimation & Capacity Planning',
    'Appendices & References'
  ];

  const GUIDANCE = [
    'Fill in before the first review. Every approval must add a row to the revision history.',
    'Tier 1: one paragraph, focused on functional validation. Tier 2: core business metrics, integration boundaries and target SLAs. Tier 3: multi-year strategic alignment, regulatory impact and cross-organisation dependencies.',
    'Principles are the rules every later decision is checked against. Keep them few and testable. The context diagram shows people and systems, not technology.',
    'Every NFR needs a number. "Fast" and "secure" are not requirements; "p95 < 200ms" is.',
    'Level 2 shows deployable containers and how they talk. Level 3 is only needed for the services that carry real complexity.',
    'Say where each class of data lives, how long it is kept, how it is encrypted and how it is deleted.',
    'List every integration with its pattern and SLA, then say what happens when it fails.',
    'Map each control to a compliance requirement so the security review is a checklist, not a debate.',
    'Describe how code reaches production and how it gets rolled back.',
    'Define what "healthy" means and who gets paged when it is not.',
    'Every risk needs an owner and a mitigation. Assumptions should be validated, not just listed.',
    'Show the options you rejected and why. This is the section reviewers read most closely.',
    'Use a pricing calculator for real numbers. The baseline here is only a sanity check.',
    'Link the specs, standards and sign-off records this document depends on.'
  ];

  const NFR = {
    1: { avail:'99.0% (best effort)', perf:'< 1000ms', rps:'50 RPS', rpo:'24 hours', rto:'12 hours', comp:'Basic GDPR' },
    2: { avail:'99.9% (~8.7 hrs downtime/yr)', perf:'< 200ms', rps:'1,000 RPS', rpo:'1 hour', rto:'2 hours', comp:'SOC 2 Type II, GDPR' },
    3: { avail:'99.99%+ (< 52 mins downtime/yr)', perf:'< 50ms', rps:'10,000+ RPS', rpo:'Near zero (< 1 sec)', rto:'< 15 minutes', comp:'PCI-DSS, HIPAA, ISO 27001' }
  };

  const COST = {
    rows: ['Compute Engine / Clusters', 'Database & Caching', 'Networking & Egress', 'Observability & Security'],
    1: ['$100', '$50', '$20', '$30', '~$200 / mo'],
    2: ['$800', '$400', '$150', '$250', '~$1,600 / mo'],
    3: ['$3,500', '$2,000', '$800', '$1,200', '~$7,500+ / mo']
  };

  const COMPLIANCE = {
    'GDPR': 'Lawful basis recorded, data subject rights (access, erasure, portability), DPAs with processors, records of processing.',
    'SOC 2 Type II': 'Access reviews, change management, logging and monitoring, vendor management, evidence collected over the audit period.',
    'HIPAA': 'BAAs with vendors, PHI access logging, minimum-necessary access, breach notification process.',
    'PCI-DSS': 'Card data scope minimised with tokenisation, network segmentation, quarterly scans, key management.',
    'ISO 27001': 'ISMS scope, risk register, Annex A controls, internal audits and management review.',
    'EU AI Act': 'Risk classification of the AI system, transparency notices, human oversight, logging and post-market monitoring.'
  };

  const CLOUDS = {
    agnostic: { label:'Cloud-agnostic', compute:'Managed Kubernetes or serverless containers', gateway:'API gateway (Kong / NGINX)', db:'Managed PostgreSQL', cache:'Managed Redis', obj:'Object storage', kms:'cloud KMS', secrets:'a secrets manager (e.g. HashiCorp Vault)', mon:'OpenTelemetry, Prometheus and Grafana / Datadog', iac:'Terraform / OpenTofu', idp:'an OIDC identity provider (Okta / Entra ID / Auth0)', queue:'Kafka or managed pub/sub' },
    aws: { label:'AWS', compute:'Amazon EKS / ECS Fargate', gateway:'Amazon API Gateway / ALB', db:'Amazon RDS / Aurora PostgreSQL', cache:'Amazon ElastiCache (Redis)', obj:'Amazon S3', kms:'AWS KMS', secrets:'AWS Secrets Manager', mon:'Amazon CloudWatch, AWS X-Ray and OpenTelemetry', iac:'Terraform / AWS CDK', idp:'Amazon Cognito or an enterprise IdP (Okta / Entra ID)', queue:'Amazon SQS / EventBridge / MSK' },
    azure: { label:'Microsoft Azure', compute:'Azure Kubernetes Service / Container Apps', gateway:'Azure API Management / Front Door', db:'Azure Database for PostgreSQL / Azure SQL', cache:'Azure Cache for Redis', obj:'Azure Blob Storage', kms:'Azure Key Vault (keys)', secrets:'Azure Key Vault (secrets)', mon:'Azure Monitor and Application Insights', iac:'Terraform / Bicep', idp:'Microsoft Entra ID', queue:'Azure Service Bus / Event Grid' },
    gcp: { label:'Google Cloud', compute:'GKE / Cloud Run', gateway:'API Gateway / Cloud Load Balancing', db:'Cloud SQL for PostgreSQL / AlloyDB', cache:'Memorystore (Redis)', obj:'Cloud Storage', kms:'Cloud KMS', secrets:'Secret Manager', mon:'Cloud Logging, Monitoring and Trace', iac:'Terraform', idp:'Identity Platform or an enterprise IdP', queue:'Pub/Sub' },
    salesforce: { label:'Salesforce Platform', compute:'Salesforce Platform (Apex, Flow, LWC) + Heroku / AWS for off-platform compute', gateway:'MuleSoft / Connected Apps', db:'Salesforce objects + Data Cloud', cache:'Platform Cache', obj:'Salesforce Files / external object storage', kms:'Shield Platform Encryption (tenant secrets / BYOK)', secrets:'Named Credentials & External Credentials', mon:'Event Monitoring, Proactive Monitoring and debug logs', iac:'Salesforce DX source + sf CLI (Terraform for surrounding cloud)', idp:'Salesforce Identity with SSO (SAML / OIDC via Okta or Entra ID)', queue:'Platform Events / Change Data Capture / Pub/Sub API' },
    onprem: { label:'On-premise / hybrid', compute:'Kubernetes (OpenShift / Rancher) or VMs', gateway:'Kong / NGINX', db:'PostgreSQL (HA with Patroni)', cache:'Redis (Sentinel)', obj:'MinIO / NAS', kms:'HashiCorp Vault Transit / HSM', secrets:'HashiCorp Vault', mon:'Prometheus, Grafana, Loki and Tempo', iac:'Terraform + Ansible', idp:'Keycloak or AD FS', queue:'Apache Kafka / RabbitMQ' }
  };

  /* Case presets. Strings may use {token} → replaced from CLOUDS. */
  const PRESETS = {
    generic: {
      label:'Generic (master template example)',
      context:'The solution is a cloud-hosted application with an API gateway, domain services and managed data stores.',
      objective:'Define the core technical purpose of the system.',
      kpis:'Key metric / KPI target\nEfficiency gain\nRevenue or cost goal',
      actors:'End user / client',
      integrations:'Auth provider (Okta) | Sync | REST / JSON (OIDC)\nPayment gateway | Sync | HTTPS / JSON\nNotification engine | Async | Event pub/sub (Kafka)',
      frs:'User Authentication: System must support MFA for all admin interfaces\nOrder Processing: System must publish transaction events upon state change',
      inScope:'Core feature set, user flows and APIs',
      outScope:'Deferred features and legacy conversions',
      principles:[['Cloud-first & managed services','Prefer native serverless/managed infrastructure to minimise operational overhead.'],['Security by design','Zero-trust access model across all services and API gateways.'],['Decoupled async messaging','Event-driven interfaces for high throughput and fault isolation.']],
      containers:[[['Web / mobile client','JavaScript, React / React Native']],[['API gateway','{gateway}']],[['User service','Node.js, Express'],['Order service','Go, Gin']],[['PostgreSQL database','{db}'],['Redis cache / stream','{cache}']]],
      components:[['API router','Fastify / Go Gin','Request routing, rate limiting, auth validation','HTTP/2 · OpenAPI 3.0'],['Event bus adapter','Apache Kafka client','Reliable async publishing and consumer handling','Binary Kafka protocol'],['Persistence layer','Prisma / Hibernate ORM','Data access, query optimisation, connection pooling','SQL / native drivers']],
      engines:['Relational ({db}) for the transactional domain model.','Key-value ({cache}) for cache and sessions.','Analytical store (Snowflake / BigQuery) for reporting.'],
      retention:[['User credentials & PII','{db}','Active account lifetime','AES-256 ({kms})','Soft delete, then anonymise'],['Audit & access logs','{obj}','7 years','AES-256 at rest','Cold storage after 90 days'],['Ephemeral caches','{cache}','TTL (15 min – 24 hrs)','TLS 1.3 in transit','Automatic purge']],
      risks:[['Risk','Third-party legacy API throughput limits.','High','Redis caching layer and rate limiting.'],['Assumption','Cloud provider regional outage < 1/year.','Medium','Use multi-AZ deployment options.'],['Dependency','IAM team delivering SSO module on schedule.','High','Mock OIDC provider interfaces for early development.']],
      options:[['Monolithic architecture','Rapid initial velocity, easy deployment.','Hard to scale independently, risk of tight coupling.','Rejected'],['Serverless (Lambda / Functions)','Auto-scaling, low idle cost.','Vendor lock-in, cold start latency.','Deferred (background jobs)'],['Microservices (Kubernetes)','Independent scaling, modular tech stack.','Higher operational complexity and cost.','Selected baseline']]
    },
    saas: {
      label:'Cloud SaaS web application',
      context:'The solution is delivered as a multi-tenant SaaS web application with a single-page front end, stateless API services and a managed relational database.',
      objective:'Deliver a secure, multi-tenant web application that customers can self-serve, with tenant-isolated data and a public API for partner integrations.',
      kpis:'Weekly active accounts grow 10% quarter on quarter\nSign-up to first value in under 10 minutes\nAPI p95 latency within the NFR target',
      actors:'Customer user\nTenant administrator\nSupport agent',
      integrations:'Identity provider (OIDC) | Sync | HTTPS / OIDC\nPayment gateway (Stripe) | Sync | HTTPS / JSON + webhooks\nEmail service | Async | Queue → HTTPS\nProduct analytics | Async | Event stream',
      frs:'Authentication: Users sign in with SSO or email + MFA; admins must use MFA\nTenancy: Every record is scoped to a tenant and cannot be read across tenants\nBilling: Subscriptions are created and changed through the payment gateway\nNotifications: Users receive email for account and billing events | Should\nAudit: Admin actions are written to an append-only audit log',
      inScope:'Web application and public REST API\nTenant onboarding, roles and billing\nEmail notifications',
      outScope:'Native mobile apps\nOn-premise deployment\nData migration from the legacy product',
      principles:[['Managed services first','Use managed database, cache and container services; run nothing ourselves unless required.'],['Tenant isolation by default','Tenant ID is enforced in the data layer on every query path, not only in the UI.'],['API-first','Every UI capability is backed by a documented, versioned API.'],['Security by design','Zero-trust between services, least-privilege IAM, no secrets in code.']],
      containers:[[['Web app (SPA)','React / Next.js']],[['API gateway','{gateway}']],[['Core API service','Node.js / Go'],['Worker service','Queue consumers'],['Notification service','Email / webhooks']],[['Primary database','{db}'],['Cache','{cache}'],['File storage','{obj}']]],
      components:[['API router','Fastify / Go Gin','Routing, validation, rate limiting, auth checks','HTTPS · OpenAPI 3.1'],['Tenant context','Middleware','Resolves tenant from the token and applies row-level scope','Internal'],['Job queue adapter','{queue}','Async jobs, retries, dead-letter queue','Messages (JSON)'],['Persistence layer','Prisma / Drizzle ORM','Data access, migrations, connection pooling','SQL']],
      engines:['Relational ({db}) for the transactional domain model, with tenant_id on every table and row-level security.','Key-value ({cache}) for sessions, rate limits and hot reads.','Object storage ({obj}) for uploads and exports.'],
      retention:[['User credentials & PII','{db}','Account lifetime + 30 days','AES-256 ({kms})','Soft delete, then anonymise'],['Audit & access logs','{obj}','1–7 years (per compliance)','AES-256 at rest','Cold storage after 90 days'],['Caches & sessions','{cache}','15 min – 24 hrs TTL','TLS in transit','Automatic expiry']],
      risks:[['Risk','A noisy tenant consumes shared capacity.','Medium','Per-tenant rate limits and quotas.'],['Risk','Cross-tenant data exposure through a missing filter.','High','Database row-level security plus automated tenancy tests.'],['Assumption','Customers accept SSO via OIDC or email + MFA.','Low','Validate with the first pilot customers.'],['Dependency','Payment gateway availability.','Medium','Idempotent webhooks and a reconcile job.']],
      options:[['Modular monolith','Fast to build, one deployment, simple operations.','Scales all-or-nothing; boundaries need discipline.','Selected (Tier 1–2)'],['Microservices on Kubernetes','Independent scaling and deployments.','Higher operational cost and complexity.','Deferred until team or load needs it'],['Serverless functions','Low idle cost, auto-scaling.','Cold starts, vendor lock-in.','Used for background jobs']]
    },
    salesforce: {
      label:'Salesforce / CRM implementation', cloud:'salesforce',
      context:'The solution is built on the Salesforce Platform, extending standard CRM objects with Lightning Web Components, Flow and Apex, and integrating with surrounding systems through an integration layer.',
      objective:'Give sales and service teams a single view of the customer in Salesforce, with automated processes and reliable integration to back-office systems.',
      kpis:'Case resolution time reduced by 20%\nOpportunity data completeness above 95%\nNo manual re-keying between CRM and ERP',
      actors:'Sales rep\nService agent\nCustomer (Experience Cloud)\nSalesforce admin',
      integrations:'ERP (SAP / Dynamics) | Sync | REST via MuleSoft\nMarketing automation | Async | Platform Events\nIdentity provider (Okta / Entra ID) | Sync | SAML 2.0 / OIDC\nData warehouse | Async | Change Data Capture / Bulk API',
      frs:'Accounts: Sales users see ERP credit limit and open orders on the Account page\nCases: Email and web cases are routed by skill with Omni-Channel\nQuotes: Approved quotes are sent to the ERP as sales orders\nSecurity: Field-level security restricts PII to authorised profiles\nReporting: Managers see pipeline and SLA dashboards | Should',
      inScope:'Sales Cloud and Service Cloud configuration\nLWC components and Apex services\nERP and marketing integrations',
      outScope:'Migration of closed records older than 5 years\nCPQ replacement\nPartner portal',
      principles:[['Clicks before code','Use standard objects and Flow first; Apex only where declarative tools cannot meet the requirement.'],['Integrate through a layer','No point-to-point callouts to back-office systems; use the integration layer with Named Credentials.'],['Bulk-safe by default','All Apex and Flows handle 200-record batches within governor limits.'],['Source-driven delivery','All metadata in Git, deployed with sf CLI pipelines, never change sets.']],
      containers:[[['Lightning Experience / LWC','Salesforce UI'],['Experience Cloud site','Customer portal']],[['Salesforce Platform','Flow · Apex · Platform Events']],[['Integration layer','MuleSoft / Named Credentials']],[['ERP','System of record: orders'],['Data warehouse','Analytics']]],
      components:[['LWC components','Lightning Web Components','UI on record pages and the portal','Lightning Data Service / Apex'],['Service layer','Apex (service / selector pattern)','Business logic, bulk-safe DML','Apex interfaces'],['Record-triggered flows','Flow','Declarative automation and validation','Platform'],['Integration adapters','Apex callouts + Named Credentials','Outbound REST with retries','HTTPS · JSON'],['Event publishers','Platform Events / CDC','Async notifications to other systems','Pub/Sub API']],
      engines:['Salesforce objects as the system of engagement; the ERP stays the system of record for orders and pricing.','External IDs on every integrated object for idempotent upserts.','Big Objects or an off-platform archive for high-volume history.'],
      schema:'Metadata changes are deployed from source control with sf CLI; destructive changes are reviewed and deployed separately.',
      retention:[['Customer PII','Salesforce objects','Customer lifetime','{kms}','Anonymise on erasure request'],['Field history & audit','Field Audit Trail / Event Monitoring','Up to 10 years','Platform encryption at rest','Archive to the data warehouse'],['Integration logs','Custom log object','90 days','Platform encryption at rest','Scheduled purge job']],
      risks:[['Risk','Governor limits hit by bulk data loads.','High','Bulk-safe code, async Apex, Bulk API for loads.'],['Risk','Org complexity grows from unchecked customisation.','Medium','Design authority review; naming and metadata standards.'],['Constraint','API call limits per 24 hours.','Medium','Composite API and event-driven sync instead of polling.'],['Dependency','ERP team exposes order APIs.','High','Mock APIs in MuleSoft for early build.']],
      options:[['Point-to-point Apex callouts','Quick to build.','Brittle, hard to monitor, credentials spread across the org.','Rejected'],['MuleSoft integration layer','Reusable APIs, monitoring, retries.','Licence cost.','Selected'],['Heroku / AWS middleware','Flexible, cheaper at small scale.','The team must build and run it.','Deferred']]
    },
    ai: {
      label:'AI agent / RAG solution',
      context:'The solution is an AI agent that answers questions and performs actions using retrieval-augmented generation (RAG) over approved knowledge sources, with guardrails, evaluation and hand-off to a human.',
      objective:'Answer customer and employee questions from approved knowledge with cited sources, and complete simple actions through governed tools.',
      kpis:'Containment rate above 40%\nGroundedness above 90% on the evaluation set\nHand-off to a human in under 30 seconds when confidence is low',
      actors:'Customer (chat)\nEmployee / service agent\nKnowledge owner',
      integrations:'LLM provider (Claude / Azure OpenAI) | Sync | HTTPS / JSON\nVector store | Sync | HTTPS / gRPC\nKnowledge sources (Confluence / SharePoint / Salesforce Knowledge) | Async | Scheduled ingestion\nCRM / ticketing (tool actions) | Sync | REST via tool calls\nContact center (human hand-off) | Sync | Webhook / API',
      frs:'Answers: Every answer cites the source document it is grounded in\nActions: The agent can create a case and check order status through approved tools only\nHand-off: Users can ask for a human at any time; the conversation is passed on\nSafety: Prompt-injection and PII filters run on input and output\nFeedback: Users rate answers; low ratings feed the evaluation set | Should',
      inScope:'Web chat channel\nRAG over approved knowledge sources\nTwo read actions and one write action',
      outScope:'Voice channel\nFine-tuning a custom model\nAutonomous refunds or payments',
      principles:[['Grounded or silent','Answer only from retrieved, approved content; otherwise say so and offer a human.'],['Least-privilege tools','Each tool has a narrow scope, typed inputs and server-side authorisation.'],['Evaluate before release','Every prompt, model or retrieval change runs against the evaluation set in CI.'],['Human in the loop','A clear hand-off path, and human approval for irreversible actions.']],
      containers:[[['Chat widget','Web / mobile']],[['Agent orchestrator','{compute}']],[['LLM provider','Hosted model API'],['Retriever','Embeddings + vector search'],['Tool gateway','Typed actions']],[['Vector store','pgvector / managed vector DB'],['Ingestion pipeline','Chunk · embed · index'],['Trace & eval store','{obj}']]],
      components:[['Prompt & policy manager','Versioned templates','System prompts and guardrail policies','Internal'],['Retriever','Hybrid search (BM25 + vectors)','Top-k retrieval, re-ranking, citations','HTTPS'],['Tool router','Tool / function calling','Validates arguments, enforces authorisation, logs calls','JSON Schema'],['Guardrails','Input / output filters','PII redaction, injection and topic checks','Inline'],['Evaluator','Offline + online evals','Groundedness, relevance, regression tests','CI job']],
      engines:['Vector index of chunked, embedded knowledge with source metadata and access labels.','Relational ({db}) for conversations, feedback and the tool-call audit trail.','Object storage ({obj}) for raw documents, traces and evaluation datasets.'],
      retention:[['Conversation transcripts','{db}','30–90 days','AES-256 ({kms})','PII redacted before long-term storage'],['Embeddings & chunks','Vector store','While the source is published','Encrypted at rest','Re-index on change; delete on unpublish'],['Prompts, traces & evals','{obj}','1 year','AES-256 at rest','Cold storage after 90 days']],
      perf:{ 1:'First token < 2s; full answer < 8s', 2:'First token < 1.5s; full answer < 6s', 3:'First token < 1s; full answer < 4s' },
      risks:[['Risk','Hallucinated or ungrounded answers.','High','Grounding checks, citations, refusal when retrieval is weak, eval gate in CI.'],['Risk','Prompt injection via user input or documents.','High','Input filtering, tool allow-list, no secrets in context, output checks.'],['Risk','Token cost grows faster than usage.','Medium','Caching, smaller models for routing, per-conversation budgets.'],['Constraint','Model provider data-residency terms.','Medium','Region-pinned endpoint and a zero-data-retention agreement.']],
      options:[['Prompt-only (no retrieval)','Simplest to build.','Out-of-date or invented answers.','Rejected'],['RAG with a hosted LLM','Fresh knowledge, citations, no training.','Retrieval quality becomes critical.','Selected'],['Fine-tuned model','Better style and domain fit.','Cost, retraining, still needs RAG for facts.','Deferred']]
    },
    integration: {
      label:'API & integration platform',
      context:'The solution is an integration platform that exposes reusable APIs over systems of record and moves data between them with synchronous APIs and asynchronous events.',
      objective:'Replace point-to-point integrations with governed, reusable APIs and events, so new channels connect in days instead of months.',
      kpis:'New API consumer onboarded in under 5 days\nIntegration failures alerted within 5 minutes\n80% API reuse across channels',
      actors:'Channel applications (web, mobile, CRM)\nPartner developers\nIntegration support team',
      integrations:'ERP | Sync | REST / SOAP\nCRM | Async | Events (CDC)\nPayment provider | Sync | HTTPS / JSON\nData warehouse | Async | Batch / streaming',
      frs:'API catalog: Every API is published with an OpenAPI spec in the developer portal\nSecurity: Consumers authenticate with OAuth 2.0 client credentials\nEvents: Order and customer changes are published as events within 5 seconds\nErrors: Failed messages go to a DLQ and can be replayed\nTracing: Every transaction can be traced end to end by correlation ID',
      inScope:'Experience, process and system APIs\nEvent backbone and DLQ\nDeveloper portal',
      outScope:'Rewriting systems of record\nMaster data management\nB2B EDI',
      principles:[['API-led connectivity','System, process and experience API layers; consumers never call systems of record directly.'],['Event-driven where possible','Publish state changes as events instead of polling.'],['Contract-first','OpenAPI / AsyncAPI specs are reviewed before build.'],['Observable by default','Correlation IDs on every hop, structured logs and tracing.']],
      containers:[[['Channel apps','Web · Mobile · CRM'],['Partners','External consumers']],[['API gateway','{gateway}']],[['Experience APIs','Channel-specific'],['Process APIs','Orchestration'],['System APIs','One per system of record']],[['Event broker','{queue}'],['ERP','System of record'],['CRM','System of engagement']]],
      components:[['Policy enforcement','{gateway}','Auth, quotas, threat protection','HTTPS · OAuth 2.0'],['Orchestrator','MuleSoft / Spring Boot / Node.js','Process flows and transformation','REST · OpenAPI 3.1'],['Event adapter','{queue}','Publish / subscribe, ordering, DLQ','AsyncAPI · JSON / Avro'],['Schema registry','Confluent / Apicurio','Event schema versioning','Avro / JSON Schema']],
      engines:['The platform owns no business data; systems of record stay authoritative.','Event log retained for replay, with a schema registry for compatibility.','Small state store ({cache}) for idempotency keys and correlation.'],
      retention:[['Message payloads','Event broker','7 days','TLS in transit, encrypted at rest','Replay window, then expiry'],['Transaction logs','{obj}','1 year','AES-256 at rest','Cold storage after 90 days'],['Idempotency keys','{cache}','24–72 hrs TTL','TLS in transit','Automatic expiry']],
      risks:[['Risk','Legacy system throughput limits.','High','Caching, rate limiting, async queueing.'],['Risk','Breaking contract changes.','Medium','Versioning policy and consumer-driven contract tests.'],['Constraint','Some systems only support batch files.','Medium','Batch adapter with a file-to-event bridge.'],['Dependency','System owners provide test environments.','High','Service virtualisation and mocks.']],
      options:[['Point-to-point','Fast for the first link.','Grows as N², no reuse.','Rejected'],['iPaaS (MuleSoft / Boomi)','Connectors, governance, developer portal.','Licence cost.','Selected'],['Custom on Kubernetes + Kafka','Full control, lower licence cost.','The team builds and runs everything.','Alternative']]
    },
    mobile: {
      label:'Mobile app',
      context:'The solution is a cross-platform mobile app backed by a backend-for-frontend (BFF) that aggregates services and handles authentication and push notifications.',
      objective:'Give users a fast mobile experience that works offline for core tasks and syncs reliably when connected.',
      kpis:'App store rating 4.5 or higher\nCrash-free sessions above 99.5%\nCold start under 2 seconds',
      actors:'Mobile user\nSupport agent',
      integrations:'Identity provider | Sync | OIDC + PKCE\nPush notifications (APNs / FCM) | Async | HTTPS\nCrash & analytics SDK | Async | HTTPS\nCore backend APIs | Sync | REST / GraphQL',
      frs:'Auth: Users sign in with OIDC + PKCE and can unlock with biometrics\nOffline: Core screens work offline and sync when back online\nNotifications: Users receive push for important events and can opt out\nUpgrades: The app can require an upgrade when an API version is retired | Should',
      inScope:'iOS and Android apps\nBFF API\nPush notifications',
      outScope:'Tablet-optimised layouts\nWearables\nWeb version',
      principles:[['Offline-first','The local store is the UI source of truth; sync is background work.'],['Thin client, smart BFF','Business rules live in the backend; the BFF shapes data for screens.'],['Secure on device','Tokens in Keychain / Keystore; no secrets in the app bundle.'],['Backward-compatible APIs','Old app versions keep working for an agreed support window.']],
      containers:[[['iOS / Android app','Flutter / React Native / native']],[['BFF API','{compute}']],[['Domain services','REST / gRPC'],['Push service','APNs / FCM']],[['Database','{db}'],['Cache','{cache}']]],
      components:[['Local store','SQLite / Hive / Realm','Offline data, encrypted at rest','On device'],['Sync engine','Background tasks','Delta sync and conflict resolution','REST / GraphQL'],['BFF aggregator','Node.js / Kotlin','Screen-shaped APIs and auth checks','HTTPS · OpenAPI'],['Notification dispatcher','{queue}','Fan-out to APNs / FCM','Events']],
      engines:['Encrypted on-device store for offline data.','Relational ({db}) as the backend system of record.','Cache ({cache}) for sessions and hot data.'],
      retention:[['User PII','{db}','Account lifetime','AES-256 ({kms})','Delete on account closure'],['On-device data','Encrypted local store','Until logout / uninstall','AES-256, key in Keychain / Keystore','Wiped on logout'],['Analytics events','Analytics provider','13 months','Provider encryption','Aggregated only']],
      risks:[['Risk','Old app versions call retired APIs.','Medium','API versioning and a force-upgrade flag.'],['Risk','Sync conflicts lose user edits.','Medium','Server timestamps plus a conflict UI for key entities.'],['Constraint','App store review delays releases.','Low','Feature flags and remote config.'],['Dependency','Push certificates and keys owned by the platform team.','Low','Automated expiry alerts.']],
      options:[['Native (Swift + Kotlin)','Best performance and platform fit.','Two codebases.','Alternative'],['Cross-platform (Flutter / React Native)','One codebase, faster delivery.','Some native bridging.','Selected'],['Progressive web app','No app store, one codebase.','Limited device APIs and offline support.','Rejected']]
    },
    data: {
      label:'Data & analytics platform',
      context:'The solution is a cloud data platform that ingests data from operational systems, models it in a warehouse and serves governed datasets to BI and data science.',
      objective:'Provide one trusted, governed source of reporting data that is refreshed on schedule and documented.',
      kpis:'Daily data ready by 07:00 local time\nData quality tests pass rate above 99%\nSelf-service dashboards replace 80% of manual reports',
      actors:'Business analyst\nData engineer\nData scientist\nData steward',
      integrations:'CRM | Async | CDC / API extract\nERP | Async | Batch extract\nProduct events | Async | Streaming\nBI tool (Power BI / Tableau) | Sync | SQL / semantic layer',
      frs:'Ingestion: Source data lands in the raw zone within the agreed schedule\nModelling: Curated models are built with tested, version-controlled SQL\nQuality: Failed quality tests block publishing to the curated zone\nAccess: Row- and column-level security applies to PII\nLineage: Every dashboard metric traces back to its sources | Should',
      inScope:'Ingestion from CRM, ERP and product events\nWarehouse modelling and semantic layer\nCore executive dashboards',
      outScope:'Real-time operational analytics\nML model serving\nReverse ETL',
      principles:[['ELT over ETL','Load raw data, then transform in the warehouse with version-controlled SQL.'],['Medallion zones','Raw → cleaned → curated, each with clear ownership and tests.'],['Governed self-service','Certified datasets, documented metrics, access by role.'],['Privacy by design','PII tagged at ingestion and masked by default.']],
      containers:[[['Source systems','CRM · ERP · Events']],[['Ingestion','Fivetran / Airbyte / streaming']],[['Raw zone','{obj}'],['Warehouse','Snowflake / BigQuery / Databricks']],[['Transformation','dbt'],['BI & semantic layer','Power BI / Tableau / Looker']]],
      components:[['Connectors','Fivetran / Airbyte','Extract and load from sources','APIs / CDC'],['Orchestrator','Airflow / Dagster','Scheduling, dependencies, retries','DAGs'],['Transformation','dbt','Models, tests, docs, lineage','SQL'],['Catalog','Unity Catalog / DataHub','Discovery, ownership, PII tags','UI / API']],
      engines:['Object storage ({obj}) for raw, immutable landing data.','Columnar warehouse for curated models.','Semantic layer for certified metrics.'],
      schema:'dbt models are version-controlled and tested; source schema changes are detected by contracts and alert before they break downstream models.',
      retention:[['Raw source data','{obj}','1–3 years','AES-256 ({kms})','Lifecycle to archive tier'],['Curated models','Warehouse','Rolling 7 years','Warehouse-managed encryption','Time travel 7 days'],['PII columns','Warehouse','Per source system policy','Masking + column-level security','Purged on erasure request']],
      perf:{ 1:'Dashboard query p95 < 10s', 2:'Dashboard query p95 < 5s', 3:'Dashboard query p95 < 2s' },
      risks:[['Risk','Source schema changes break pipelines.','High','Schema contracts, alerting, dbt tests.'],['Risk','Warehouse cost overrun.','Medium','Budgets, auto-suspend, query monitoring.'],['Assumption','Source owners provide read replicas or CDC.','Medium','Agree access early in the project.'],['Constraint','PII must stay in region.','High','Region-pinned storage and warehouse.']],
      options:[['Cloud data warehouse','Managed, SQL-first, fast to deliver.','Cost at high volume.','Selected'],['Lakehouse (Databricks)','ML and BI on one platform.','Needs more engineering skill.','Alternative'],['On-premise warehouse','Data stays on site.','Capex, slow to scale.','Rejected']]
    }
  };
  // Starting points for "Add another diagram": title and the section it lands in.
  const DIAGRAM_KINDS = [
    { title:'Deployment & infrastructure', section:8 },
    { title:'Data flow', section:5 },
    { title:'Integration sequence', section:6 },
    { title:'Security & trust zones', section:7 },
    { title:'Component detail', section:4 },
    { title:'Business process', section:1 },
    { title:'Other diagram', section:13 }
  ];
  const PRESET_FIELDS = ['objective', 'kpis', 'actors', 'integrations', 'frs', 'inScope', 'outScope'];

  /* ---------- State ---------- */
  function freshState(preset){
    const p = PRESETS[preset];
    const s = {
      preset, tier:2, q:{ aud:2, sla:2, data:2, deploy:2 },
      name:'', projectId:'', architect:'', owner:'', engLead:'', status:'Draft', date:today(), version:'0.1',
      summary:'', regions:'', cloud:p.cloud || 'agnostic', compliance:[], locality:'',
      sections:TIER_SECTIONS[2].slice(), guidance:true
    };
    PRESET_FIELDS.forEach(f => { s[f] = p[f]; });
    return s;
  }

  let S = freshState('saas');
  try{
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if(saved && PRESETS[saved.preset]) S = Object.assign(S, saved);
  }catch(e){ /* storage unavailable — start fresh */ }
  const save = () => { try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){} };

  // Diagrams edited in draw.io: { context, container, custom:[{ id, title, section, xml, svg, png, w, h }] }.
  // Kept apart from the form state because they can be large; if storage is full the form still saves.
  const DIAGRAM_KEY = STORE_KEY + '-diagrams';
  const freshDiagrams = () => ({ context:null, container:null, custom:[] });
  let D = freshDiagrams();
  try{ D = Object.assign(D, JSON.parse(localStorage.getItem(DIAGRAM_KEY) || 'null')); }catch(e){}
  const saveDiagrams = () => { try{ localStorage.setItem(DIAGRAM_KEY, JSON.stringify(D)); return true; }catch(e){ return false; } };

  /* ---------- Generated diagrams (SVG for preview / HTML / PDF / Word, Mermaid for Markdown, draw.io XML for editing) ---------- */
  let svgSeq = 0;
  const clip = (s, n) => (s = String(s || '')).length > n ? s.slice(0, n - 1) + '…' : s;

  // Rows of boxes, centred, sized to their text. Shared by the SVG and draw.io renderers.
  function layout(layers, maxLabel){
    const H = 58, GX = 22, GY = 56, M = 24;
    const rows = layers.map(row => row.map(n => {
      const label = maxLabel ? clip(n.label, maxLabel) : String(n.label), sub = maxLabel ? clip(n.sub, maxLabel + 10) : String(n.sub || '');
      return { label, sub, hl:n.hl, w:Math.max(140, Math.round(Math.max(label.length * 7.9, sub.length * 6.3)) + 28) };
    }));
    const rowW = rows.map(r => r.reduce((a, n) => a + n.w, 0) + GX * (r.length - 1));
    const W = Math.max(...rowW) + M * 2;
    const HT = rows.length * H + (rows.length - 1) * GY + M * 2;
    rows.forEach((r, i) => {
      let x = (W - rowW[i]) / 2;
      r.forEach(n => { n.x = Math.round(x); n.y = M + i * (H + GY); x += n.w + GX; });
    });
    return { rows, W, HT, H };
  }

  // Editable draw.io file of the generated diagram, so the editor starts from it instead of a blank page.
  function layeredDrawio(layers, edgeLabel, name){
    const { rows } = layout(layers);
    const x = s => esc(s);
    let cells = '', e = 0;
    rows.forEach((r, i) => r.forEach((n, j) => {
      const value = `<b>${esc(n.label)}</b>${n.sub ? `<br><font style="font-size:11px" color="#475569">${esc(n.sub)}</font>` : ''}`;
      const style = `rounded=1;whiteSpace=wrap;html=1;arcSize=12;fontSize=14;fontColor=#0F172A;fillColor=${n.hl ? '#FFF4DC' : '#F4F6F9'};strokeColor=${n.hl ? '#D18B0F' : '#94A3B8'};`;
      cells += `<mxCell id="n${i}_${j}" value="${x(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="58" as="geometry"/></mxCell>`;
    }));
    const edge = (s, t, lbl) => {
      cells += `<mxCell id="e${++e}" value="${x(lbl || '')}" style="endArrow=block;endFill=1;html=1;strokeColor=#64748B;fontSize=11;fontColor=#475569;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="${s}" target="${t}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
    };
    for(let i = 0; i < rows.length - 1; i++){
      const a = rows[i], b = rows[i + 1];
      // Labels on wide fans of straight arrows collide, so only label up to three arrows (the boxes still name the protocol).
      const label = edgeLabel && Math.max(a.length, b.length) <= 3;
      if(a.length === 1 || b.length === 1) a.forEach((p, s) => b.forEach((q, t) => edge(`n${i}_${s}`, `n${i + 1}_${t}`, label && edgeLabel(i, layers[i][s], layers[i + 1][t]))));
      else a.forEach((_, s) => edge(`n${i}_${s}`, `n${i + 1}_${Math.min(s, b.length - 1)}`));
    }
    return `<mxfile><diagram name="${x(name || 'Diagram')}" id="sdd"><mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`;
  }

  function layeredSvg(layers){
    const id = 'sdd-arrow-' + (++svgSeq);
    const { rows, W, HT, H } = layout(layers, 30);
    const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2 - 3}" stroke="#64748b" stroke-width="1.6" marker-end="url(#${id})"/>`;
    let edges = '';
    for(let i = 0; i < rows.length - 1; i++){
      const a = rows[i], b = rows[i + 1];
      if(a.length === 1 || b.length === 1){
        a.forEach(p => b.forEach(q => { edges += line(p.x + p.w / 2, p.y + H, q.x + q.w / 2, q.y); }));
      }else{
        edges += line(W / 2, a[0].y + H, W / 2, b[0].y);
      }
    }
    const boxes = rows.flat().map(n => `
      <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${H}" rx="9" fill="${n.hl ? '#fff4dc' : '#f4f6f9'}" stroke="${n.hl ? '#d18b0f' : '#94a3b8'}" stroke-width="1.5"/>
      <text x="${n.x + n.w / 2}" y="${n.y + (n.sub ? 25 : 34)}" text-anchor="middle" font-size="14" font-weight="600" fill="#0f172a">${esc(n.label)}</text>
      ${n.sub ? `<text x="${n.x + n.w / 2}" y="${n.y + 44}" text-anchor="middle" font-size="11.5" fill="#475569">${esc(n.sub)}</text>` : ''}`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${HT}" width="${W}" height="${HT}" font-family="Inter, Arial, sans-serif" role="img">
      <defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0,0 L0,8 L8,4 z" fill="#64748b"/></marker></defs>
      <rect width="${W}" height="${HT}" fill="#ffffff"/>${edges}${boxes}</svg>`;
  }

  function layeredMermaid(layers, edgeLabel){
    const q = s => String(s || '').replace(/["|]/g, "'");
    const ids = layers.map((row, i) => row.map((_, j) => `n${i}_${j}`));
    let out = 'flowchart TB\n';
    layers.forEach((row, i) => row.forEach((n, j) => {
      out += `  ${ids[i][j]}["${q(n.label)}${n.sub ? '<br/><small>' + q(n.sub) + '</small>' : ''}"]\n`;
    }));
    for(let i = 0; i < layers.length - 1; i++){
      const a = layers[i], b = layers[i + 1];
      if(a.length === 1 || b.length === 1){
        a.forEach((_, x) => b.forEach((nb, y) => {
          const lbl = edgeLabel && edgeLabel(i, a[x], nb);
          out += `  ${ids[i][x]} ${lbl ? `-- "${q(lbl)}" -->` : '-->'} ${ids[i + 1][y]}\n`;
        }));
      }else{
        a.forEach((_, x) => { out += `  ${ids[i][x]} --> ${ids[i + 1][Math.min(x, b.length - 1)]}\n`; });
      }
    }
    return out.trimEnd();
  }

  /* ---------- Parsing helpers ---------- */
  function parseIntegrations(text){
    return lines(text).map(l => {
      const [name, pat = 'Sync', proto = 'HTTPS / JSON', sla = ''] = l.split('|').map(x => x.trim());
      const async = /^a/i.test(pat);
      return { name, async, pattern:async ? 'Asynchronous' : 'Synchronous', proto, sla };
    });
  }
  function parseFrs(text){
    return lines(text).map((l, i) => {
      const [main, prio = 'Must'] = l.split('|').map(x => x.trim());
      const k = main.indexOf(':');
      return { id:'FR-' + String(i + 1).padStart(3, '0'), module:k > 0 ? main.slice(0, k).trim() : 'General', desc:k > 0 ? main.slice(k + 1).trim() : main, prio };
    });
  }

  /* ---------- Document model ----------
     Blocks: {t:'h3'|'p'|'note', text} · {t:'ul', items:[string | [bold, rest]]}
             {t:'table', head:[], rows:[[]]} · {t:'diagram', key, title, layers?, edgeLabel?, caption}
     A diagram the user edited in draw.io (D[key]) replaces the generated one.
  */
  function build(){
    let tbd = 0;
    const T = S.tier, P = PRESETS[S.preset], C = CLOUDS[S.cloud] || CLOUDS.agnostic, N = NFR[T];
    const fill = s => String(s).replace(/\{(\w+)\}/g, (m, k) => C[k] || m);
    const val = (v, ph) => { v = String(v || '').trim(); if(v) return v; tbd++; return `[${ph}]`; };
    const sys = val(S.name, 'System Name');
    const actors = lines(S.actors);
    const ints = parseIntegrations(S.integrations);
    const frs = parseFrs(S.frs);
    const comp = S.compliance.length ? S.compliance.join(', ') : N.comp;
    const light = T === 1;
    const sec = [];
    const add = (n, blocks) => {
      if(!S.sections.includes(n)) return;
      if(S.guidance) blocks.unshift({ t:'note', text:'Guidance: ' + GUIDANCE[n] });
      sec.push({ n, title:`Section ${n}: ${SECTION_TITLES[n]}`, blocks });
    };

    add(0, [
      { t:'h3', text:'0.1 Information & Governance' },
      { t:'table', head:['Field', 'Value / Details'], rows:[
        ['Document Title', 'Solution Architecture Design Document: ' + sys],
        ['Project Name / ID', val(S.projectId, 'Project ID')],
        ['Project Tier Classification', TIERS[T].label],
        ['Lead Architect', val(S.architect, 'Person')],
        ['Product Manager / Owner', val(S.owner, 'Person')],
        ['Engineering Lead', val(S.engLead, 'Person')],
        ['Document Status', S.status],
        ['Approval Date', S.status === 'Approved' ? S.date : 'Pending']
      ]},
      { t:'h3', text:'0.2 Version Revision History' },
      { t:'table', head:['Version', 'Date', 'Author', 'Summary of Changes', 'Status / Approver'], rows:[
        [S.version || '0.1', S.date, val(S.architect, 'Person'), 'Initial architectural draft from the SDD master template', S.status]
      ].concat(S.status === 'Approved' ? [] : [['1.0', '[Date]', '[Person]', 'Architecture Review Board approved', 'Approved']]) }
    ]);

    const summary = [{ t:'p', text:val(S.summary, 'Describe the business problem, the strategic context and the target solution in 2–3 paragraphs') }];
    if(!light) summary.push({ t:'p', text:`${P.context} The system is classified as ${TIERS[T].label}, with a target availability of ${N.avail} and a compliance scope of ${comp}.` });
    else summary.push({ t:'p', text:P.context + ' This is a Tier 1 build: the goal is to validate the functionality quickly at the lowest sensible cost.' });
    if(T === 3) summary.push({ t:'p', text:'[Strategic alignment: the multi-year roadmap this supports, regulatory impact summary, and cross-organisation dependencies.]' });
    const kpis = lines(S.kpis);
    add(1, [
      { t:'h3', text:'1.1 Executive Summary' }, ...summary,
      { t:'h3', text:'1.2 System Purpose & Objectives' },
      { t:'ul', items:[['Primary objective: ', val(S.objective, 'Core technical purpose of the system')], ['Business outcomes: ', kpis.length ? kpis.join('; ') : val('', 'Key metrics, KPI targets, efficiency gains')]] },
      { t:'h3', text:'1.3 Scope Boundaries' },
      { t:'table', head:['Category', 'In Scope', 'Out of Scope'], rows:[
        ['Functional capabilities', lines(S.inScope).join('; ') || val('', 'Feature set, user flows, APIs'), lines(S.outScope).join('; ') || val('', 'Deferred features, legacy conversions')],
        ['Integrations', ints.map(i => i.name).join('; ') || val('', 'Core integrations'), '[Third-party systems outside the current phase]'],
        ['User base / geography', [actors.join(', '), S.regions.trim()].filter(Boolean).join(' — ') || val('', 'Target regions, user types'), '[Unsupported regions or tiers]']
      ]}
    ]);

    const principles = P.principles.slice();
    if(T === 3) principles.push(['Design for failure', 'Every component can fail without data loss; failover is automated and tested.']);
    if(S.compliance.length && T > 1) principles.push(['Compliance by design', `Controls for ${S.compliance.join(', ')} are built in and evidenced automatically.`]);
    const ctxLayers = [
      (actors.length ? actors : ['[User]']).map(a => ({ label:a, sub:'Person' })),
      [{ label:sys, sub:'This system', hl:true }],
      ...(ints.length ? [ints.map(i => ({ label:i.name, sub:(i.async ? 'Async' : 'Sync') + ' · ' + i.proto }))] : [])
    ];
    add(2, [
      { t:'h3', text:'2.1 Core Architectural Principles' },
      { t:'ul', items:principles.map(([a, b]) => [a + ': ', b]) },
      { t:'h3', text:'2.2 System Context Diagram (C4 Level 1)' },
      { t:'diagram', key:'context', title:'System context', layers:ctxLayers, caption:'System context: people, this system and the external systems it depends on.',
        edgeLabel:(i, a, b) => i === 0 ? 'HTTPS' : (ints.find(x => x.name === b.label) || {}).proto }
    ]);

    const perf = (P.perf && P.perf[T]) || N.perf;
    const nfrRows = [
      ['Availability', 'System uptime SLA', N.avail],
      ['Performance', P.perf ? 'Response time' : 'API response (p95)', perf],
      ['Throughput', 'Peak requests / sec', N.rps],
      ['RPO (data loss)', 'Recovery point objective', N.rpo],
      ['RTO (downtime)', 'Recovery time objective', N.rto],
      ['Compliance', 'Standards', comp]
    ];
    if(S.locality.trim()) nfrRows.push(['Data residency', 'Where data is stored and processed', S.locality.trim()]);
    add(3, [
      { t:'h3', text:'3.1 Functional Requirements Baseline' },
      { t:'table', head:['ID', 'Module / Component', 'Requirement', 'Priority'],
        rows:frs.length ? frs.map(f => [f.id, f.module, f.desc, f.prio]) : [['FR-001', '[Module]', val('', 'Requirement'), 'Must']] },
      { t:'h3', text:'3.2 Non-Functional Requirements' },
      { t:'table', head:['Category', 'Metric / Objective', `Target (${TIERS[T].short})`], rows:nfrRows }
    ]);

    add(4, [
      { t:'h3', text:'4.1 Container Diagram (C4 Level 2)' },
      { t:'diagram', key:'container', title:'Container diagram', layers:P.containers.map(row => row.map(([l, s]) => ({ label:fill(l), sub:fill(s) }))), caption:`Containers inside the ${sys} boundary.` },
      { t:'h3', text:'4.2 Component Design (C4 Level 3)' },
      { t:'table', head:['Component', 'Tech Stack / Library', 'Responsibility', 'Interface Standard'], rows:P.components.map(r => r.map(fill)) }
    ]);

    const schema = P.schema || {
      1:'Migrations run automatically in the deployment pipeline.',
      2:'Versioned, automated migrations (Flyway / Liquibase / ORM) using backward-compatible expand-and-contract steps.',
      3:'Versioned, automated migrations with zero-downtime expand-and-contract steps, online schema change tooling and a tested rollback for every migration.'
    }[T];
    const data = [
      { t:'h3', text:'5.1 Data Modeling Strategy' },
      { t:'ul', items:[['Data storage engines: ', P.engines.map(fill).join(' ')], ['Schema evolution: ', schema]] },
      { t:'h3', text:'5.2 Data Lifecycle & Retention Matrix' },
      { t:'table', head:['Data Classification', 'Storage Medium', 'Retention Period', 'Encryption Standard', 'Archival Strategy'], rows:P.retention.map(r => r.map(fill)) }
    ];
    if(S.locality.trim()) data.push({ t:'p', text:`All personal data is stored and processed in ${S.locality.trim()}.` });
    add(5, data);

    const resilience = [
      ['Timeouts: ', 'Every outbound call has an explicit timeout.'],
      ['Retry strategy: ', 'Exponential backoff with full jitter, 3 retries max, only for idempotent operations.']
    ];
    if(T >= 2) resilience.push(
      ['Circuit breaker: ', 'Enabled for all external vendor APIs (opens at 50% failures over 10s).'],
      ['Dead letter queue: ', 'Unprocessable events go to a DLQ with an automated alert and a replay procedure.']
    );
    if(T === 3) resilience.push(
      ['Idempotency: ', 'Idempotency keys on every write API and event consumer.'],
      ['Bulkheads & failover: ', 'Isolated pools per dependency; automated regional failover tested by game days.']
    );
    add(6, [
      { t:'h3', text:'6.1 Integration Catalog' },
      { t:'table', head:['Source System', 'Target System', 'Pattern', 'Protocol / Payload', 'SLA / Sync Type'],
        rows:ints.length ? ints.map(i => [sys, i.name, i.pattern, i.proto, i.sla || (i.async ? 'Eventual consistency' : (T === 3 ? 'Real-time (< 500ms)' : 'Real-time (< 1000ms)'))])
          : [[sys, '[Target]', 'Synchronous', '[Protocol]', '[SLA]']] },
      { t:'h3', text:'6.2 Error Handling & Resilience Patterns' },
      { t:'ul', items:resilience }
    ]);

    if(light){
      add(7, [
        { t:'h3', text:'7.1 Identity & Access' },
        { t:'ul', items:[['Authentication: ', `OIDC sign-in via ${C.idp}; MFA for all admin access.`], ['Authorization: ', 'Role-based access control in the application.']] },
        { t:'h3', text:'7.2 Data Protection' },
        { t:'ul', items:[['In transit: ', 'TLS 1.2+ on all endpoints.'], ['At rest: ', `Provider-managed encryption (${C.kms}).`], ['Secrets: ', `Stored in ${C.secrets}; never in code.`]] }
      ]);
    }else{
      const iam = [
        ['Authentication: ', `OAuth 2.0 + OpenID Connect via ${C.idp}; short-lived access tokens (15 min) with refresh-token rotation; MFA for all admin interfaces.`],
        ['Authorization: ', 'RBAC and ABAC enforced at the API gateway and at each service boundary.'],
        ['Service-to-service: ', T === 3 ? 'Strict mTLS with workload identity (service mesh / SPIFFE).' : 'Scoped service identities; no shared credentials.']
      ];
      if(T === 3) iam.push(['Privileged access: ', 'Just-in-time elevation with approval and session recording.']);
      const sec7 = [
        { t:'h3', text:'7.1 Identity & Access Management (IAM)' },
        { t:'ul', items:iam },
        { t:'h3', text:'7.2 Data Protection & Encryption Controls' },
        { t:'table', head:['Control', 'Standard'], rows:[
          ['Encryption in transit', T === 3 ? 'TLS 1.3 externally; strict mTLS internally' : 'TLS 1.2+ externally (TLS 1.3 preferred); TLS internally'],
          ['Encryption at rest', T === 3 ? `AES-256 with customer-managed, HSM-backed keys in ${C.kms}` : `AES-256 with keys in ${C.kms}`],
          ['Key rotation', T === 3 ? 'Automated, every 90–365 days' : 'Every 365 days'],
          ['Secrets', T === 3 ? `Dynamic, short-lived secrets from ${C.secrets}` : `${C.secrets}; never in code or CI logs`],
          ['Data masking', T === 3 ? 'PII masked in logs and non-prod; tokenisation for regulated fields' : 'PII masked in logs and non-production environments'],
          ['Network', T === 3 ? 'Private endpoints, WAF + DDoS protection, egress allow-list' : 'Private subnets, WAF on public endpoints']
        ]}
      ];
      if(S.compliance.length){
        sec7.push({ t:'h3', text:'7.3 Compliance Control Mapping' },
          { t:'table', head:['Standard', 'Key Controls'], rows:S.compliance.map(c => [c, COMPLIANCE[c] || '']) });
      }
      add(7, sec7);
    }

    const pipelines = {
      1:[['Development', 'Continuous deployment', 'Automated unit tests', 'Single region, shared'], ['Production', 'Manual promote', 'Owner approval', `Single region, ${C.compute}`]],
      2:[['Development', 'Continuous deployment', 'Automated integration tests', 'Single region, shared cluster'], ['Staging / QA', 'Continuous deployment', 'Automated E2E & performance tests', 'Mirror of production'], ['Production', 'Blue / green', 'Change approval', 'Multi-AZ high availability']],
      3:[['Development', 'Continuous deployment', 'Automated integration tests', 'Single region, shared cluster'], ['Staging / QA', 'Continuous deployment', 'Automated E2E, security & performance tests', 'Mirror of production'], ['Pre-production', 'Release candidate', 'DR and failover rehearsal', 'Production-sized'], ['Production', 'Canary (10/90) then full', 'CAB / architectural sign-off', 'Multi-region, active-active']]
    }[T];
    const infra = [
      ['IaC framework: ', `${C.iac}, version-controlled in Git.`],
      ['Runtime: ', C.compute + '.']
    ];
    if(!light) infra.push(['Topology: ', (T === 3 ? 'Multi-region (active-active or active-passive with a DR region)' : 'Single region, multi-AZ') + (S.regions.trim() ? ` — ${S.regions.trim()}.` : '.')]);
    const sec8 = [
      { t:'h3', text:'8.1 Infrastructure Provisioning Topology' }, { t:'ul', items:infra },
      { t:'h3', text:'8.2 Deployment Pipeline Strategy' },
      { t:'table', head:['Environment', 'Strategy', 'Approval Gate', 'Infrastructure Pattern'], rows:pipelines }
    ];
    if(!light) sec8.push({ t:'p', text:'Rollback: every release can be rolled back by redeploying the previous artifact; database migrations are backward-compatible so a rollback never needs a data restore.' });
    add(8, sec8);

    const obs = [
      ['Logging: ', `Structured JSON logs with trace IDs, aggregated in ${C.mon}.`],
      ['Metrics: ', 'RED metrics (rate, errors, duration) and resource metrics, scraped every 15s.'],
      ['Distributed tracing: ', 'OpenTelemetry instrumentation across service boundaries.'],
      ['Alerting: ', 'Alerts on SLO burn rate, not on single spikes; every alert links to a runbook.']
    ];
    if(T === 3) obs.push(['SLOs & error budgets: ', 'Published per critical user journey; releases freeze when the budget is spent.']);
    add(9, [
      { t:'h3', text:'9.1 Observability Stack' }, { t:'ul', items:obs },
      { t:'h3', text:'9.2 Operations Support Framework' },
      { t:'table', head:['Priority', 'Response SLA', 'Target Resolution', 'Escalation Target'], rows:T === 3
        ? [['P1 - System outage', '15 minutes (24/7)', '< 2 hours', 'On-call lead engineer + architect'], ['P2 - Major degradation', '1 hour', '< 8 hours', 'Primary product pod'], ['P3 - Minor bug', '24 hours', 'Next sprint', 'Maintenance engineering team']]
        : T === 2
        ? [['P1 - System outage', '30 minutes', '< 4 hours', 'On-call engineer'], ['P2 - Major degradation', '4 business hours', '< 2 business days', 'Product team'], ['P3 - Minor bug', '2 business days', 'Next sprint', 'Product team backlog']]
        : [['P1 - System outage', 'Next business hour', 'Best effort', 'Product owner'], ['P2/P3 - Bugs', 'Best effort', 'Backlog', 'Product team']] }
    ]);

    const counters = {};
    const rack = P.risks.slice();
    if(S.locality.trim()) rack.push(['Constraint', `Data must be stored and processed in ${S.locality.trim()}.`, 'High', 'Region-pinned deployment, storage and backups.']);
    if(S.compliance.length) rack.push(['Constraint', `Solution must meet ${S.compliance.join(', ')}.`, 'High', 'Control mapping in Section 7; compliance review before go-live.']);
    add(10, [
      { t:'h3', text:'10.1 RACK Analysis' },
      { t:'table', head:['ID', 'Category', 'Description', 'Impact', 'Mitigation'], rows:rack.map(([cat, d, imp, mit]) => {
        const k = cat[0];
        counters[k] = (counters[k] || 0) + 1;
        return [`${k}-${String(counters[k]).padStart(2, '0')}`, cat, d, imp, mit];
      })}
    ]);

    add(11, [
      { t:'h3', text:'11.1 Evaluated Architecture Options' },
      { t:'table', head:['Option', 'Pros', 'Cons', 'Decision'], rows:P.options.map((r, i) => [`Option ${String.fromCharCode(65 + i)}: ${r[0]}`, r[1], r[2], r[3]]) },
      { t:'p', text:'Record the final decision as an Architecture Decision Record (ADR) and link it in Section 13.' }
    ]);

    add(12, [
      { t:'h3', text:'12.1 Estimated Infrastructure Cost' },
      { t:'table', head:['Resource Category', `${TIERS[T].short} / month`], rows:COST.rows.map((r, i) => [r, COST[T][i]]).concat([['Estimated monthly total', COST[T][4]]]) },
      { t:'p', text:`Indicative baseline from the master template. Replace with a ${C.label} pricing-calculator estimate before approval.` },
      { t:'h3', text:'12.2 Capacity Planning' },
      { t:'ul', items:[['Peak load: ', `${N.rps} at launch.`], ['Growth assumption: ', '[x% per year]'], ['Scaling trigger: ', 'Scale out at 70% sustained CPU / memory or queue depth above threshold.']] }
    ]);

    add(13, [
      { t:'h3', text:'13.1 Reference Documentation & Artifacts' },
      { t:'ul', items:[['System API specifications (OpenAPI 3.x): ', '[link]'], ['Regulatory compliance strategy: ', '[link]'], ['Enterprise security standard: ', '[link]'], ['Architecture decision records: ', '[link]'], ['Architecture Review Board sign-off: ', '[link]']] }
    ]);

    // User-added diagrams go at the end of their chosen section, or in a closing section if that one is excluded.
    const extra = [];
    D.custom.forEach(c => {
      const block = { t:'diagram', key:c.id, title:c.title, caption:c.title };
      const target = sec.find(s => s.n === +c.section);
      if(target) target.blocks.push({ t:'h3', text:c.title }, block);
      else extra.push({ t:'h3', text:c.title }, block);
    });
    if(extra.length) sec.push({ n:99, title:'Additional Diagrams', blocks:extra });

    return { title:'Solution Architecture Design Document: ' + sys, sub:`${TIERS[T].label} · ${PRESETS[S.preset].label} · ${C.label} · v${S.version || '0.1'} · ${S.status}`, sections:sec, tbd };
  }

  /* ---------- Renderers ---------- */
  const edited = b => D.custom.find(c => c.id === b.key) || D[b.key] || null;
  const diagramFile = b => `${fileBase()}-${slug(b.key)}.drawio.svg`;

  // `files` (optional) collects the edited diagrams the Markdown links to, so they can be downloaded with it.
  function toMarkdown(doc, files){
    const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const out = [`# ${doc.title}`, '', `_${doc.sub}_`, ''];
    doc.sections.forEach(s => {
      out.push(`## ${s.title}`, '');
      s.blocks.forEach(b => {
        if(b.t === 'h3') out.push(`### ${b.text}`, '');
        else if(b.t === 'p') out.push(b.text, '');
        else if(b.t === 'note') out.push(`> ${b.text}`, '');
        else if(b.t === 'ul') out.push(...b.items.map(it => Array.isArray(it) ? `- **${it[0].trim()}** ${it[1]}` : `- ${it}`), '');
        else if(b.t === 'table') out.push(`| ${b.head.map(cell).join(' | ')} |`, `| ${b.head.map(() => '---').join(' | ')} |`, ...b.rows.map(r => `| ${r.map(cell).join(' | ')} |`), '');
        else if(b.t === 'diagram'){
          const d = edited(b);
          if(d){
            if(files) files.push({ name:diagramFile(b), d });
            out.push(`![${b.title}](${diagramFile(b)})`, '', `_${b.caption} Editable in draw.io (diagrams.net or the VS Code extension)._`, '');
          }else if(b.layers){
            out.push('```mermaid', layeredMermaid(b.layers, b.edgeLabel), '```', '', `_${b.caption}_`, '');
          }
        }
      });
    });
    out.push('---', '', '_Generated with the SDD builder by Isara Perera._');
    return out.join('\n');
  }

  function toHtml(doc){
    let html = `<h1>${esc(doc.title)}</h1><p class="sub">${esc(doc.sub)}</p>`;
    doc.sections.forEach(s => {
      html += `<h2>${esc(s.title)}</h2>`;
      s.blocks.forEach(b => {
        if(b.t === 'h3') html += `<h3>${esc(b.text)}</h3>`;
        else if(b.t === 'p') html += `<p>${esc(b.text)}</p>`;
        else if(b.t === 'note') html += `<p class="note">${esc(b.text)}</p>`;
        else if(b.t === 'ul') html += '<ul>' + b.items.map(it => `<li>${Array.isArray(it) ? `<strong>${esc(it[0])}</strong>${esc(it[1])}` : esc(it)}</li>`).join('') + '</ul>';
        else if(b.t === 'table') html += `<table><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        else if(b.t === 'diagram'){
          const d = edited(b);
          const art = d ? `<img src="${d.svg}" alt="${esc(b.title)}">` : b.layers ? layeredSvg(b.layers) : '';
          if(art) html += `<figure class="diagram">${art}<figcaption>${esc(b.caption)}</figcaption></figure>`;
        }
      });
    });
    return html;
  }

  const DOC_CSS = `
    body{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt;line-height:1.5;color:#1e293b;max-width:900px;margin:32px auto;padding:0 24px}
    h1{font-size:22pt;line-height:1.2;margin:0 0 4px;color:#0f172a}
    .sub{color:#64748b;margin:0 0 24px}
    h2{font-size:15pt;margin:28px 0 8px;padding-bottom:4px;border-bottom:1px solid #cbd5e1;color:#0f172a}
    h3{font-size:12pt;margin:18px 0 6px;color:#0f172a}
    p,ul{margin:0 0 10px}
    .note{color:#64748b;font-style:italic;font-size:10pt}
    table{width:100%;border-collapse:collapse;margin:0 0 14px;font-size:10pt}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f1f5f9}
    figcaption{color:#64748b;font-size:9.5pt;text-align:center}
    figure{margin:0 0 14px;border:1px solid #e2e8f0;padding:10px}
    figure svg,figure img{display:block;max-width:100%;height:auto;margin:0 auto}
    @media print{body{margin:0;max-width:none}h2{break-after:avoid}table,figure{break-inside:avoid}}
  `;
  const htmlDocument = doc => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(doc.title)}</title><style>${DOC_CSS}</style></head><body>${toHtml(doc)}</body></html>`;

  /* ---------- Word (.docx) ----------
     A real Office Open XML file built in the browser with JSZip (loaded from cdnjs on first use).
     Diagrams go in as PNG: edited ones as exported by draw.io, generated ones rasterised from the SVG.
  */
  const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  let jszipLoading = null;
  const loadJSZip = () => window.JSZip ? Promise.resolve(window.JSZip) : (jszipLoading = jszipLoading || new Promise((ok, fail) => {
    const s = Object.assign(document.createElement('script'), { src:JSZIP_URL, onload:() => ok(window.JSZip), onerror:() => { jszipLoading = null; fail(new Error('JSZip failed to load')); } });
    document.head.appendChild(s);
  }));

  const loadImage = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  async function svgToPng(svg){
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    const scale = 2, c = document.createElement('canvas');
    c.width = img.naturalWidth * scale; c.height = img.naturalHeight * scale;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.scale(scale, scale); g.drawImage(img, 0, 0);
    return { png:c.toDataURL('image/png'), w:img.naturalWidth, h:img.naturalHeight };
  }

  async function toDocx(doc){
    const JSZip = await loadJSZip();
    const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const run = (text, props) => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
    const para = (inner, pPr) => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${inner}</w:p>`;
    const images = [];
    const TEXT_W = 11906 - 2 * 1134; // A4 width minus 2cm margins, in twips
    const MAX_W = Math.floor(TEXT_W / 1440 * 914400); // same width in EMU, for images

    let body = para(run(doc.title), '<w:pStyle w:val="Title"/>') + para(run(doc.sub, '<w:color w:val="64748B"/>'));
    for(const s of doc.sections){
      body += para(run(s.title), '<w:pStyle w:val="Heading1"/>');
      for(const b of s.blocks){
        if(b.t === 'h3') body += para(run(b.text), '<w:pStyle w:val="Heading2"/>');
        else if(b.t === 'p') body += para(run(b.text));
        else if(b.t === 'note') body += para(run(b.text, '<w:i/><w:color w:val="64748B"/><w:sz w:val="20"/>'));
        else if(b.t === 'ul') b.items.forEach(it => {
          body += para(run('•\t') + (Array.isArray(it) ? run(it[0], '<w:b/>') + run(it[1]) : run(it)), '<w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs><w:ind w:left="360" w:hanging="360"/><w:spacing w:after="60"/>');
        });
        else if(b.t === 'table'){
          // Explicit column widths (twips), weighted by content length; without them some readers collapse columns.
          const weights = b.head.map((h, i) => Math.min(60, Math.max(12, ...[h, ...b.rows.map(r => r[i])].map(t => String(t).length))));
          const total = weights.reduce((a, w) => a + w, 0);
          const widths = weights.map(w => Math.floor(TEXT_W * w / total));
          const cellXml = (t, i, head) => `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : ''}</w:tcPr>${para(run(t, (head ? '<w:b/>' : '') + '<w:sz w:val="19"/>'), '<w:spacing w:after="0"/>')}</w:tc>`;
          body += `<w:tbl><w:tblPr><w:tblStyle w:val="SddTable"/><w:tblW w:w="${TEXT_W}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr>`
            + `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
            + `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.head.map((h, i) => cellXml(h, i, true)).join('')}</w:tr>`
            + b.rows.map(r => `<w:tr>${r.map((c, i) => cellXml(c, i)).join('')}</w:tr>`).join('') + '</w:tbl>' + para('', '<w:spacing w:after="0"/>');
        }
        else if(b.t === 'diagram'){
          const d = edited(b);
          const pic = d ? { png:d.png, w:d.w, h:d.h } : b.layers ? await svgToPng(layeredSvg(b.layers)) : null;
          if(!pic || !pic.png) continue;
          const n = images.length + 1, rid = 'rIdImg' + n;
          images.push(pic.png.split(',')[1]);
          let cx = pic.w * 9525, cy = pic.h * 9525;
          if(cx > MAX_W){ cy = Math.round(cy * MAX_W / cx); cx = MAX_W; }
          body += para(`<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="${x(b.title)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="image${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`, '<w:jc w:val="center"/><w:keepNext/>')
            + para(run(b.caption, '<w:i/><w:color w:val="64748B"/><w:sz w:val="19"/>'), '<w:jc w:val="center"/>');
        }
      }
    }
    body += para(run('Generated with the SDD builder by Isara Perera.', '<w:i/><w:color w:val="94A3B8"/><w:sz w:val="18"/>'));

    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const heading = (id, name, size, before) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${id === 'Heading1' ? 0 : 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="${size}"/></w:rPr></w:style>`;
    const border = side => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`;
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${images.map((_, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.png"/>`).join('')}</Relationships>`);
    zip.file('word/styles.xml', `${XML}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="1E293B"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
      + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
      + `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="44"/></w:rPr></w:style>`
      + heading('Heading1', 'heading 1', 30, 360) + heading('Heading2', 'heading 2', 24, 200)
      + `<w:style w:type="table" w:styleId="SddTable"><w:name w:val="SDD Table"/><w:tblPr><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`);
    zip.file('word/document.xml', `${XML}<w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
    images.forEach((b64, i) => zip.file(`word/media/image${i + 1}.png`, b64, { base64:true }));
    return zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /* ---------- Export actions ---------- */
  const fileBase = () => `${slug(S.name || 'solution')}-SDD-v${String(S.version || '0.1').replace(/[^0-9a-z.]/gi, '')}`;
  function download(name, content, type){
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href:url, download:name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const svgText = dataUri => {
    const [head, body] = dataUri.split(',');
    return /;base64/.test(head) ? new TextDecoder().decode(Uint8Array.from(atob(body), c => c.charCodeAt(0))) : decodeURIComponent(body);
  };
  function printPdf(doc){
    const frame = Object.assign(document.createElement('iframe'), { title:'Print preview' });
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const d = frame.contentWindow.document;
    d.open(); d.write(htmlDocument(doc)); d.close();
    Promise.all([...d.images].map(i => i.decode ? i.decode().catch(() => {}) : null)).then(() => setTimeout(() => {
      frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 1000);
    }, 150));
  }
  async function copyText(text){
    try{ await navigator.clipboard.writeText(text); return true; }
    catch(e){
      const ta = Object.assign(document.createElement('textarea'), { value:text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  /* ---------- Diagram editor (draw.io / diagrams.net embed) ----------
     Free hosted editor, no account or key. Talks to this page over postMessage
     (https://www.drawio.com/doc/faq/embed-mode). Diagrams stay in the browser.
  */
  const EDITOR_ORIGIN = 'https://embed.diagrams.net';
  const EDITOR_URL = EDITOR_ORIGIN + '/?embed=1&proto=json&configure=1&spin=1&saveAndExit=1&noSaveBtn=1&libraries=1&lang=en'
    + '&libs=' + encodeURIComponent('general;c4;aws4;azure;gcp2;kubernetes;network;flowchart;uml;er;bpmn;mockups');
  let editor = null;

  // The editor opens in its own tab and reports back to this page through window.opener.
  function openEditor(opts){ // opts: { key, title, xml, onSave(d) }
    if(editor && !editor.win.closed){
      editor.win.focus();
      status(`Finish "${editor.title}" in the editor tab first, or close that tab.`, 6000);
      return;
    }
    const win = window.open(EDITOR_URL, '_blank');
    if(!win){ status('Your browser blocked the editor tab. Allow pop-ups for this page and press Edit again.', 8000); return; }
    editor = { ...opts, win, step:null, result:{} };
    // Notice when the tab is closed without saving, so another diagram can be opened.
    editor.watch = setInterval(() => {
      if(editor && editor.win.closed){ const t = editor.title; closeEditor(); status(`Closed "${t}" without saving.`); }
    }, 1000);
    status(`Editing "${opts.title}" in a new tab. Press Save & Exit there to bring it back here.`, 600000);
  }
  function closeEditor(){
    if(!editor) return;
    clearInterval(editor.watch);
    if(!editor.win.closed) editor.win.close();
    editor = null;
    window.focus();
  }
  const toEditor = msg => editor.win.postMessage(JSON.stringify(msg), EDITOR_ORIGIN);

  window.addEventListener('message', async e => {
    if(!editor || e.origin !== EDITOR_ORIGIN || e.source !== editor.win || typeof e.data !== 'string') return;
    let m; try{ m = JSON.parse(e.data); }catch(err){ return; }
    if(m.event === 'configure'){
      // Embed mode starts with the shapes panel collapsed; open it on screens wide enough for it.
      toEditor({ action:'configure', config:{ sidebarWidth:screen.width >= 900 ? 240 : 0 } });
    }else if(m.event === 'init'){
      if(editor.xml) toEditor({ action:'load', xml:editor.xml, title:editor.title, autosave:0 });
      else toEditor({ action:'template' });
    }else if(m.event === 'save'){
      editor.result.xml = m.xml;
      editor.step = 'svg';
      toEditor({ action:'export', format:'xmlsvg', spinKey:'export', border:12, background:'#ffffff' });
    }else if(m.event === 'export' && editor.step === 'svg'){
      editor.result.svg = m.data;
      editor.step = 'png';
      toEditor({ action:'export', format:'png', spinKey:'export', scale:2, border:12, background:'#ffffff' });
    }else if(m.event === 'export' && editor.step === 'png'){
      const img = await loadImage(m.data).catch(() => null);
      const r = editor.result;
      editor.onSave({ xml:r.xml, svg:r.svg, png:m.data, w:img ? Math.round(img.naturalWidth / 2) : 800, h:img ? Math.round(img.naturalHeight / 2) : 500 });
      closeEditor();
    }else if(m.event === 'exit'){
      if(!editor.step) closeEditor();
    }
  });

  /* ---------- Form UI ---------- */
  const opt = (v, label, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(label)}</option>`;
  const field = (k, label, ph, type) => `<label class="sdd-field"><span>${label}</span><input type="${type || 'text'}" data-k="${k}" value="${esc(S[k])}" placeholder="${esc(ph || '')}"></label>`;
  const area = (k, label, hint, rows) => `<label class="sdd-field sdd-wide"><span>${label}${hint ? ` <em>${hint}</em>` : ''}</span><textarea data-k="${k}" rows="${rows || 3}">${esc(S[k])}</textarea></label>`;
  const qSel = (k, label, choices) => `<label class="sdd-field"><span>${label}</span><select data-q="${k}">${choices.map((c, i) => opt(i + 1, c, S.q[k])).join('')}</select></label>`;

  mount.innerHTML = `
  <div class="sdd">
    <div class="sdd-head">
      <p class="sdd-kicker">Interactive tool</p>
      <h3>Solution Design Document builder</h3>
      <p>Pick your case and tier, fill in what you know, and export a ready-to-review SDD. Anything you leave empty becomes a <code>[placeholder]</code>. Your inputs stay in this browser only.</p>
    </div>

    <div class="sdd-step">
      <h4><span>1</span>Case &amp; tier</h4>
      <div class="sdd-grid">
        <label class="sdd-field sdd-wide"><span>What are you designing?</span>
          <select data-k="preset">${Object.entries(PRESETS).map(([k, p]) => opt(k, p.label, S.preset)).join('')}</select></label>
      </div>
      <div class="sdd-tiers" role="radiogroup" aria-label="Project tier">
        ${[1, 2, 3].map(t => `<button type="button" role="radio" class="sdd-tier" data-tier="${t}" aria-checked="${S.tier === t}"><strong>${TIERS[t].short}</strong><span>${TIERS[t].name}</span><small>${TIERS[t].hint}</small></button>`).join('')}
      </div>
      <details class="sdd-assist">
        <summary>Not sure which tier? Answer four questions</summary>
        <div class="sdd-grid">
          ${qSel('aud', 'Who is it for?', ['PoC, pilot or early startup', 'Departmental tool or SaaS feature', 'Mission-critical platform'])}
          ${qSel('sla', 'Uptime needed', ['Best effort (< 99%)', '99.9%', '99.99% or more'])}
          ${qSel('data', 'Most sensitive data', ['Public / internal', 'Confidential / PII', 'Regulated (PCI, HIPAA, GDPR special category)'])}
          ${qSel('deploy', 'Deployment', ['Single region', 'Multi-AZ managed cloud', 'Multi-region / hybrid / active-active'])}
        </div>
        <p class="sdd-rec" data-rec></p>
      </details>
    </div>

    <div class="sdd-step">
      <h4><span>2</span>Document control</h4>
      <div class="sdd-grid">
        ${field('name', 'System name', 'e.g. Customer Portal')}
        ${field('projectId', 'Project name / ID', 'e.g. PRJ-2041')}
        ${field('architect', 'Lead architect')}
        ${field('owner', 'Product owner')}
        ${field('engLead', 'Engineering lead')}
        <label class="sdd-field"><span>Status</span><select data-k="status">${['Draft', 'Under Review', 'Approved', 'Superseded'].map(s => opt(s, s, S.status)).join('')}</select></label>
        ${field('version', 'Version', '0.1')}
        ${field('date', 'Date', '', 'date')}
      </div>
    </div>

    <div class="sdd-step">
      <h4><span>3</span>Problem &amp; scope</h4>
      <div class="sdd-grid">
        ${area('summary', 'Business problem &amp; context', '2–3 sentences', 3)}
        ${area('objective', 'Primary objective', '', 2)}
        ${area('kpis', 'Business outcomes / KPIs', 'one per line')}
        ${area('inScope', 'In scope', 'one per line')}
        ${area('outScope', 'Out of scope', 'one per line')}
        ${area('actors', 'Users &amp; actors', 'one per line')}
        ${field('regions', 'Target regions', 'e.g. EU and UK')}
      </div>
    </div>

    <div class="sdd-step">
      <h4><span>4</span>Platform &amp; requirements</h4>
      <div class="sdd-grid">
        <label class="sdd-field"><span>Cloud / platform</span><select data-k="cloud">${Object.entries(CLOUDS).map(([k, c]) => opt(k, c.label, S.cloud)).join('')}</select></label>
        ${field('locality', 'Data residency', 'e.g. EU (Frankfurt)')}
        <fieldset class="sdd-field sdd-wide sdd-checks"><legend>Compliance scope</legend>
          ${Object.keys(COMPLIANCE).map(c => `<label><input type="checkbox" data-comp="${esc(c)}"${S.compliance.includes(c) ? ' checked' : ''}> ${esc(c)}</label>`).join('')}
        </fieldset>
        ${area('integrations', 'Integrations', 'System | Sync or Async | Protocol', 4)}
        ${area('frs', 'Functional requirements', 'Module: requirement | Must / Should', 5)}
      </div>
    </div>

    <div class="sdd-step">
      <h4><span>5</span>Diagrams</h4>
      <p class="sdd-hint">The builder draws these from your inputs. Press Edit to open any of them in the free draw.io editor in a new tab: C4, AWS, Azure, GCP, Kubernetes and network shapes, your own images, layers and templates. Edited diagrams replace the generated ones in every export.</p>
      <div class="sdd-dgrid" data-diagrams></div>
      <div class="sdd-dadd">
        <label class="sdd-field"><span>Add another diagram</span>
          <select data-newkind>${DIAGRAM_KINDS.map((k, i) => opt(i, `${k.title} (Section ${k.section})`, 0)).join('')}</select></label>
        <button type="button" class="sdd-btn" data-dact="add">+ Draw new diagram</button>
      </div>
    </div>

    <div class="sdd-step">
      <h4><span>6</span>Sections</h4>
      <p class="sdd-hint">Pre-selected for your tier. Tier 1 gets light versions of Sections 7–8.</p>
      <div class="sdd-checks sdd-secs">
        ${SECTION_TITLES.map((t, i) => `<label><input type="checkbox" data-sec="${i}"> ${i}. ${esc(t.replace(/ \(.*\)$/, ''))}</label>`).join('')}
      </div>
      <label class="sdd-toggle"><input type="checkbox" data-k="guidance"${S.guidance ? ' checked' : ''}> Include guidance notes for reviewers and authors</label>
    </div>

    <div class="sdd-out">
      <div class="sdd-bar">
        <div class="sdd-tabs" role="tablist">
          <button type="button" role="tab" data-view="doc" aria-selected="true">Preview</button>
          <button type="button" role="tab" data-view="md" aria-selected="false">Markdown</button>
        </div>
        <span class="sdd-tbd" data-tbd></span>
      </div>
      <div class="sdd-paper" data-preview></div>
      <pre class="sdd-md" data-md hidden></pre>
      <div class="sdd-actions">
        <button type="button" class="sdd-btn primary" data-act="word">Word (.docx)</button>
        <button type="button" class="sdd-btn" data-act="pdf">PDF</button>
        <button type="button" class="sdd-btn" data-act="md">Markdown</button>
        <button type="button" class="sdd-btn" data-act="html">HTML</button>
        <button type="button" class="sdd-btn" data-act="copy">Copy Markdown</button>
        <button type="button" class="sdd-btn ghost" data-act="reset">Reset</button>
      </div>
      <p class="sdd-status" data-status role="status" aria-live="polite"></p>
    </div>
  </div>`;

  const $ = sel => mount.querySelector(sel);
  const $$ = sel => mount.querySelectorAll(sel);
  let doc = null, timer = 0;

  function syncSections(){ $$('[data-sec]').forEach(cb => { cb.checked = S.sections.includes(+cb.dataset.sec); }); }
  function syncTier(){ $$('[data-tier]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.tier === S.tier))); }
  function setTier(t){ S.tier = t; S.sections = TIER_SECTIONS[t].slice(); syncTier(); syncSections(); }
  function recommend(){
    const rec = Math.max(S.q.aud, S.q.sla, S.q.data, S.q.deploy);
    $('[data-rec]').innerHTML = `Recommended: <strong>${TIERS[rec].label}</strong>. The highest answer sets the tier.`;
    return rec;
  }
  function status(msg, ms){ const el = $('[data-status]'); el.textContent = msg; clearTimeout(el._t); el._t = setTimeout(() => { el.textContent = ''; }, ms || 4000); }

  // Generated diagrams (built-in keys) found in the current document, for the cards and the editor.
  const builtIns = () => doc.sections.flatMap(s => s.blocks).filter(b => b.t === 'diagram' && b.layers);

  function renderDiagramCards(){
    const secOpts = cur => SECTION_TITLES.map((t, i) => opt(i, `Section ${i}: ${t.replace(/ \(.*\)$/, '')}`, cur)).join('');
    const card = (key, title, thumb, isEdited, custom) => `
      <div class="sdd-dcard">
        <div class="sdd-dthumb">${thumb ? `<img src="${thumb}" alt="">` : ''}</div>
        <div class="sdd-dinfo">
          <strong>${esc(title)}</strong>
          <span class="sdd-dbadge${isEdited ? ' on' : ''}">${isEdited ? 'Edited in draw.io' : 'Auto-generated'}</span>
          ${custom ? `<select data-dsec="${esc(key)}" aria-label="Section for ${esc(title)}">${secOpts(custom.section)}</select>` : ''}
          <div class="sdd-dbtns">
            <button type="button" class="sdd-btn small primary" data-dact="edit" data-key="${esc(key)}">Edit</button>
            <button type="button" class="sdd-btn small" data-dact="file" data-key="${esc(key)}" title="Download as a draw.io file">.drawio</button>
            ${custom ? `<button type="button" class="sdd-btn small" data-dact="rename" data-key="${esc(key)}">Rename</button><button type="button" class="sdd-btn small ghost" data-dact="remove" data-key="${esc(key)}">Remove</button>`
              : isEdited ? `<button type="button" class="sdd-btn small ghost" data-dact="revert" data-key="${esc(key)}">Revert</button>` : ''}
          </div>
        </div>
      </div>`;
    const cards = builtIns().map(b => {
      const d = D[b.key];
      return card(b.key, b.title, d ? d.svg : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(layeredSvg(b.layers)), !!d);
    }).concat(D.custom.map(c => card(c.id, c.title, c.svg, true, c)));
    $('[data-diagrams]').innerHTML = cards.join('') || '<p class="sdd-hint">Turn on Section 2 or 4 to get the generated diagrams, or draw a new one below.</p>';
  }

  function persistDiagrams(){
    if(!saveDiagrams()) status('The diagram is in your document, but it is too large to remember in this browser. Download its .drawio file to keep a copy.', 8000);
    render();
  }

  function render(){
    doc = build();
    $('[data-preview]').innerHTML = toHtml(doc);
    $('[data-md]').textContent = toMarkdown(doc);
    $('[data-tbd]').textContent = doc.tbd ? `${doc.tbd} field${doc.tbd > 1 ? 's' : ''} still [placeholder]` : 'All core fields filled';
    renderDiagramCards();
    save();
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 120); };

  mount.addEventListener('input', e => {
    const el = e.target;
    if(el.dataset.k){
      const k = el.dataset.k;
      if(k === 'preset'){
        const old = PRESETS[S.preset], next = PRESETS[el.value];
        // Swap in the new case's examples, but keep anything the user typed themselves.
        PRESET_FIELDS.forEach(f => {
          if(!S[f].trim() || S[f] === old[f]){ S[f] = next[f]; const t = $(`[data-k="${f}"]`); if(t) t.value = next[f]; }
        });
        if(next.cloud) S.cloud = next.cloud;
        else if(old.cloud && S.cloud === old.cloud) S.cloud = 'agnostic';
        $('[data-k="cloud"]').value = S.cloud;
        S.preset = el.value;
      }else{
        S[k] = el.type === 'checkbox' ? el.checked : el.value;
      }
    }else if(el.dataset.q){
      S.q[el.dataset.q] = +el.value;
      setTier(recommend());
    }else if(el.dataset.comp){
      const c = el.dataset.comp;
      S.compliance = el.checked ? S.compliance.concat(c) : S.compliance.filter(x => x !== c);
    }else if(el.dataset.sec){
      const n = +el.dataset.sec;
      S.sections = el.checked ? S.sections.concat(n).sort((a, b) => a - b) : S.sections.filter(x => x !== n);
    }else if(el.dataset.dsec){
      const c = D.custom.find(x => x.id === el.dataset.dsec);
      if(c){ c.section = +el.value; persistDiagrams(); }
      return;
    }else return;
    schedule();
  });

  function diagramAction(act, key){
    const custom = D.custom.find(c => c.id === key);
    const gen = builtIns().find(b => b.key === key);
    const cur = custom || D[key];
    const title = custom ? custom.title : gen ? gen.title : '';
    switch(act){
      case 'edit':
        openEditor({ title, xml:cur ? cur.xml : layeredDrawio(gen.layers, gen.edgeLabel, title), onSave:d => {
          if(custom) Object.assign(custom, d); else D[key] = d;
          persistDiagrams(); status(`"${title}" updated in your document.`);
        }});
        break;
      case 'add': {
        const kind = DIAGRAM_KINDS[+$('[data-newkind]').value] || DIAGRAM_KINDS[0];
        openEditor({ title:kind.title, xml:null, onSave:d => {
          D.custom.push({ id:'d' + Date.now().toString(36), title:kind.title, section:kind.section, ...d });
          persistDiagrams(); status(`"${kind.title}" added to Section ${kind.section}.`);
        }});
        break;
      }
      case 'file':
        download(`${fileBase()}-${slug(key)}.drawio`, cur ? cur.xml : layeredDrawio(gen.layers, gen.edgeLabel, title), 'application/xml');
        status('Open the .drawio file in diagrams.net, the draw.io desktop app, Confluence or VS Code.');
        break;
      case 'revert':
        if(confirm(`Replace your edited "${title}" with the generated diagram?`)){ D[key] = null; persistDiagrams(); }
        break;
      case 'rename': {
        const name = prompt('Diagram title', title);
        if(name && name.trim()){ custom.title = name.trim(); persistDiagrams(); }
        break;
      }
      case 'remove':
        if(confirm(`Remove "${title}" from the document?`)){ D.custom = D.custom.filter(c => c !== custom); persistDiagrams(); }
        break;
    }
  }

  mount.addEventListener('click', async e => {
    const tierBtn = e.target.closest('[data-tier]');
    if(tierBtn){ setTier(+tierBtn.dataset.tier); render(); return; }

    const tab = e.target.closest('[data-view]');
    if(tab){
      const md = tab.dataset.view === 'md';
      $$('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b === tab)));
      $('[data-preview]').hidden = md;
      $('[data-md]').hidden = !md;
      return;
    }

    const dact = e.target.closest('[data-dact]');
    if(dact){ diagramAction(dact.dataset.dact, dact.dataset.key); return; }

    const act = e.target.closest('[data-act]');
    if(!act) return;
    render();
    switch(act.dataset.act){
      case 'word':
        status('Building the Word document…', 15000);
        act.disabled = true;
        try{ download(fileBase() + '.docx', await toDocx(doc)); status('Word document downloaded, with diagrams as images.'); }
        catch(err){ status('Could not build the Word file. Check your connection (the Word exporter loads from cdnjs) and try again.', 8000); }
        finally{ act.disabled = false; }
        break;
      case 'md': {
        const files = [];
        download(fileBase() + '.md', toMarkdown(doc, files), 'text/markdown;charset=utf-8');
        // Edited diagrams travel as .drawio.svg files next to the Markdown: they render as images and stay editable.
        files.forEach((f, i) => setTimeout(() => download(f.name, svgText(f.d.svg), 'image/svg+xml'), 400 * (i + 1)));
        status(files.length ? `Markdown downloaded with ${files.length} diagram file${files.length > 1 ? 's' : ''}. Keep them in the same folder.` : 'Markdown downloaded.', 6000);
        break;
      }
      case 'html': download(fileBase() + '.html', htmlDocument(doc), 'text/html;charset=utf-8'); status('HTML downloaded.'); break;
      case 'pdf':  printPdf(doc); status('Choose "Save as PDF" in the print dialog.'); break;
      case 'copy': {
        const files = [];
        const ok = await copyText(toMarkdown(doc, files));
        status(!ok ? 'Copy failed — use the Markdown tab instead.' : files.length ? 'Markdown copied. Edited diagrams are linked as files: use the Markdown download to get them.' : 'Markdown copied — paste into Confluence, Notion or GitHub.', 6000);
        break;
      }
      case 'reset':
        if(!confirm('Clear all fields and diagrams and start again?')) return;
        try{ localStorage.removeItem(STORE_KEY); localStorage.removeItem(DIAGRAM_KEY); }catch(err){}
        S = freshState(S.preset);
        D = freshDiagrams();
        $$('[data-k]').forEach(el => { if(el.type === 'checkbox') el.checked = !!S[el.dataset.k]; else el.value = S[el.dataset.k]; });
        $$('[data-q]').forEach(el => { el.value = S.q[el.dataset.q]; });
        $$('[data-comp]').forEach(el => { el.checked = false; });
        syncTier(); syncSections(); recommend(); render();
        status('Reset.');
        break;
    }
  });

  syncSections();
  recommend();
  render();
})();
