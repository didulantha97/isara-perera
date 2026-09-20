/* ============================================================
   SKILL ICONS
   Inner SVG shapes only (wrapped with a common <svg> element by
   main.js). Keep viewBox at 0 0 24 24, stroke-based, no fills.
   ============================================================ */
window.SKILL_ICONS = {
  code: '<path d="M8 5 3 12l5 7M16 5l5 7-5 7"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v6.2c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V5.5"/><path d="M5 11.7v6.2c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6.2"/>',
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.2h2"/>',
  bolt: '<path d="M13 3 5 14h5.5L10 21l8-11h-5.5L13 3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  box: '<path d="M12 3 4 7.2v9.6L12 21l8-4.2V7.2L12 3Z"/><path d="M4 7.2 12 11l8-3.8M12 11v10"/>',
  scale: '<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l3.5-3.5"/><path d="M12 6v2M20 15h-2M4 15h2"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13.5 12 18.5l9-5"/>',
  cloud: '<path d="M7.5 18a4.2 4.2 0 0 1-.6-8.4 5.3 5.3 0 0 1 10.2-1.8A4.6 4.6 0 0 1 17.4 18H7.5Z"/>',
  wrench: '<path d="M15.4 6.4a4 4 0 1 0-5.6 5.6L4 17.8 6.2 20l5.8-5.8a4 4 0 0 0 5.6-5.6l-2.7 2.7-2-2 2.5-2.9Z"/>',
  cart: '<circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.3 11.2A2 2 0 0 0 9.3 17h8a2 2 0 0 0 2-1.6L20.5 8H6.1"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><path d="M9 11h6M9 15h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2M3 12h2.5M18.5 12H21"/>',
  sitemap: '<rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="17" width="6" height="4" rx="1"/><rect x="15" y="17" width="6" height="4" rx="1"/><path d="M12 7v4M12 11H6v6M12 11h6v6"/>',
  workflow: '<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M6 9v2a3 3 0 0 0 3 3M18 9v2a3 3 0 0 1-3 3"/>',
  robot: '<rect x="4" y="9" width="16" height="10" rx="2"/><circle cx="9" cy="14" r="1.3"/><circle cx="15" cy="14" r="1.3"/><path d="M12 9V5.5M9.5 5.5h5"/>',
  chat: '<path d="M4 5h16v11H8.5L4 20V5Z"/>',
  brain: '<path d="M9.5 3.5a2.8 2.8 0 0 0-2.8 2.8 2.8 2.8 0 0 0-1.7 4.9 2.8 2.8 0 0 0 1.7 4.9v1a2 2 0 0 0 2 2h.8a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5Z"/><path d="M14.5 3.5a2.8 2.8 0 0 1 2.8 2.8 2.8 2.8 0 0 1 1.7 4.9 2.8 2.8 0 0 1-1.7 4.9v1a2 2 0 0 1-2 2h-.8A1.5 1.5 0 0 1 13 17.6V5a1.5 1.5 0 0 1 1.5-1.5Z"/>',
  plug: '<path d="M9 2.5v4M15 2.5v4M6.5 6.5h11l-1 5.2a5 5 0 0 1-10 0l-1-5.2Z"/><path d="M12 15.7v5.8"/>',
  checklist: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M7.2 13.2l1.6 1.6L11.5 12M8 17h4"/>',
  api: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11l7.4-3.6M8.3 13l7.4 3.6"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h1.5M14.5 7H16M8 11h1.5M14.5 11H16M8 15h1.5M14.5 15H16M10 21v-4h4v4"/>',
  creditCard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 14h4"/>',
  messageCircle: '<path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.5-1.1A8.5 8.5 0 1 0 12 3.5Z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="9" r="3.2"/><path d="M3 20c0-3.5 2.7-6.3 6-6.3s6 2.8 6 6.3"/><circle cx="17.5" cy="9.6" r="2.2"/><path d="M15.8 13.9c2.4 0 4.4 2.5 4.7 5.8"/>',
  shield: '<path d="M12 3.2 19 6v6c0 5-3 8.3-7 9.8-4-1.5-7-4.8-7-9.8V6l7-2.8Z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  shieldCheck: '<path d="M12 3.2 19 6v6c0 5-3 8.3-7 9.8-4-1.5-7-4.8-7-9.8V6l7-2.8Z"/><path d="M9 12.2l2 2 4-4.2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.7"/><circle cx="12" cy="12" r="1"/>',
  gitBranch: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="7.5" r="2"/><path d="M6 8v8M6 12c0-2.5 2.2-3.5 5-3.5h3.3"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9.5 10.5 12 7 14.5M12.5 15.5h4.5"/>',
  headset: '<path d="M4.5 13.5a7.5 7.5 0 0 1 15 0"/><rect x="3.2" y="13" width="4" height="6.5" rx="1.4"/><rect x="16.8" y="13" width="4" height="6.5" rx="1.4"/><path d="M19.5 19.5v.3a3 3 0 0 1-3 3H14"/>'
};

/* ============================================================
   SKILL DETAILS
   Keyed by the exact visible text of each .tag in the
   "Technical expertise" section (#expertise). Each entry:
     category  - section heading, shown as the popup eyebrow
     icon      - key into SKILL_ICONS
     plain     - one or two sentences, no jargon, for any reader
     technical - one or two sentences with real technical detail
     example   - where this was actually used (HTML allowed)
   ============================================================ */
window.SKILLS_DATA = {
  /* ---------- Development & Architecture ---------- */
  "Python": {
    category: "Development & Architecture", icon: "code",
    plain: "A general-purpose programming language used to write scripts, automate tasks, and build logic outside of Salesforce.",
    technical: "Used for scripting, data-processing utilities, and automation tooling that complements Apex-based development, including build and CI helper scripts.",
    example: "Used to build automation and data-processing scripts around Salesforce projects at <b>CodeTerriers</b> and <b>CMS</b>."
  },
  "JavaScript": {
    category: "Development & Architecture", icon: "code",
    plain: "The language that powers interactive, dynamic behavior on web pages and modern user interfaces.",
    technical: "Used to build Lightning Web Components (LWC) and custom front-end logic — handling events, API calls, and dynamic UI state in the browser.",
    example: "Core to the Lightning Web Components and custom portals built at <b>CodeTerriers</b> and for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Apex": {
    category: "Development & Architecture", icon: "code",
    plain: "Salesforce's own programming language, similar to Java, used to add custom logic that the point-and-click tools can't handle.",
    technical: "A strongly-typed, object-oriented language running on Salesforce's multi-tenant platform, used for triggers, classes, batch jobs, and web services.",
    example: "The backbone of custom automation across every Salesforce role, from <b>WebQuarters</b> through to <b>CodeTerriers</b> today."
  },
  "SOQL / SOSL": {
    category: "Development & Architecture", icon: "database",
    plain: "Salesforce's query languages for finding and searching records in the database, similar to SQL for a normal database.",
    technical: "SOQL retrieves structured records with relationship queries and aggregate functions; SOSL performs full-text search across multiple objects and fields at once.",
    example: "Used daily to build efficient, selective queries inside Apex and Flows, especially in the high-volume Health Cloud data model at <b>Virtusa</b>."
  },
  "LWC": {
    category: "Development & Architecture", icon: "mobile",
    plain: "Lightning Web Components — the modern building blocks used to create the screens and interactive elements users click on inside Salesforce.",
    technical: "A standards-based web component framework using native JavaScript, HTML templates, and Lightning Data Service to build fast, reusable UI.",
    example: "Used to build the custom Quote Manager and customer-facing quote pipeline for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Apex Triggers": {
    category: "Development & Architecture", icon: "bolt",
    plain: "Automated code that runs behind the scenes whenever a record is created, updated, or deleted, keeping data consistent without manual effort.",
    technical: "Event-driven Apex logic bound to DML operations, written bulk-safe and following one-trigger-per-object patterns to stay within governor limits.",
    example: "Built and maintained extensively at <b>CodeTerriers</b> and <b>Virtusa</b> to enforce business rules on record changes."
  },
  "Queueable & Scheduled Apex": {
    category: "Development & Architecture", icon: "clock",
    plain: "Ways to run larger jobs in the background or on a schedule, so heavy tasks don't slow down what the user is doing.",
    technical: "Queueable Apex handles asynchronous, chainable processing with more flexibility than @future methods; Scheduled Apex runs jobs on a cron-like schedule for batch-style maintenance.",
    example: "Used for background processing and scheduled maintenance jobs at <b>CodeTerriers</b> and <b>Virtusa</b>."
  },
  "Async Apex": {
    category: "Development & Architecture", icon: "clock",
    plain: "A general term for code that runs separately from the user's immediate click, so large or slow operations don't freeze the screen.",
    technical: "Covers Future methods, Queueable, Batch Apex, and Scheduled Apex — used to process large data volumes and long-running operations within Salesforce's governor limits.",
    example: "Applied across <b>CodeTerriers</b> and <b>Virtusa</b> to keep large data operations fast and within platform limits."
  },
  "Bulkification": {
    category: "Development & Architecture", icon: "box",
    plain: "A coding discipline that makes sure automation works correctly whether it's handling one record or ten thousand at once.",
    technical: "Writing Apex and Flow logic to operate on collections rather than single records, avoiding per-record DML or SOQL calls inside loops.",
    example: "A core practice enforced in every Apex trigger and batch job built at <b>Virtusa</b> and <b>CodeTerriers</b> to keep large data loads reliable."
  },
  "Governor-limit optimization": {
    category: "Development & Architecture", icon: "scale",
    plain: "Making sure Salesforce automations stay efficient, since the platform enforces strict limits on how much processing can happen at once.",
    technical: "Tuning SOQL/DML counts, CPU time, and heap usage in Apex and Flow to operate safely within Salesforce's per-transaction governor limits on large enterprise orgs.",
    example: "Critical when supporting the high-volume Health Cloud org at <b>Virtusa</b> and large enterprise data volumes at <b>CodeTerriers</b>."
  },
  "OOP": {
    category: "Development & Architecture", icon: "layers",
    plain: "Object-Oriented Programming — a way of organizing code around reusable, structured building blocks rather than one long list of instructions.",
    technical: "Applying encapsulation, inheritance, and interfaces in Apex and Python to build maintainable, testable class structures instead of duplicated procedural code.",
    example: "The design foundation behind the reusable Apex frameworks and service classes built throughout my Salesforce career."
  },

  /* ---------- Platform & Clouds ---------- */
  "Experience Cloud": {
    category: "Platform & Clouds", icon: "cloud",
    plain: "Salesforce's tool for building external-facing websites and portals — for customers or partners — powered by the same data as the internal system.",
    technical: "Configuring branded, secure community sites with custom LWC components, sharing rules, and guest or authenticated user access models.",
    example: "Built customer journeys at <b>CodeTerriers</b>, enterprise client portals at <b>CMS</b>, and the Support/Client Portal for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Service Cloud": {
    category: "Platform & Clouds", icon: "cloud",
    plain: "Salesforce's customer-service toolkit — cases, queues, knowledge articles — used to help support teams resolve customer issues faster.",
    technical: "Configuring case management, omni-channel routing, macros, and knowledge-base workflows to streamline support operations.",
    example: "Applied to support-team workflows underpinning several of the client portals and service processes I've delivered."
  },
  "Field Service (FSL)": {
    category: "Platform & Clouds", icon: "wrench",
    plain: "Tools that help schedule and dispatch technicians who do on-site work, and let them access job details from their phone.",
    technical: "Configuring the Field Service managed package: work orders, service appointments, scheduling policies, and the mobile app for field technicians.",
    example: "Implemented mobile features and customized dispatching workflows for European enterprise clients at <b>CMS</b>."
  },
  "CPQ (Steelbrick)": {
    category: "Platform & Clouds", icon: "cart",
    plain: "Configure, Price, Quote — software that helps sales teams put together accurate, complex quotes and pricing without manual errors.",
    technical: "Configuring product bundles, pricing rules, and quote templates in Salesforce CPQ (Steelbrick), and resolving billing and quote-calculation issues.",
    example: "Resolved complex CPQ billing issues and optimized quoting workflows for enterprise clients at <b>CMS</b>."
  },
  "Health Cloud": {
    category: "Platform & Clouds", icon: "clipboard",
    plain: "A specialized version of Salesforce built for healthcare organizations, designed around patient and provider relationships.",
    technical: "Configuring Health Cloud data models, care plans, and console layouts, plus supporting Apex/Flow automation on top of the clinical data model.",
    example: "Designed healthcare workflows and console configurations using Health Cloud at <b>Virtusa</b>."
  },
  "Salesforce Sites": {
    category: "Platform & Clouds", icon: "cloud",
    plain: "A way to publish public-facing web pages directly from Salesforce data, without needing separate website hosting.",
    technical: "Configuring public sites with guest-user profiles and secure REST endpoints for anonymous, unauthenticated access.",
    example: "Used alongside Experience Cloud to build the high-traffic Support and Client Portals for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Custom Metadata Types": {
    category: "Platform & Clouds", icon: "gear",
    plain: "A way to store configuration settings inside Salesforce that admins can change safely, without touching code.",
    technical: "Using Custom Metadata Types as deployable, environment-specific configuration records that Apex and Flow read at runtime instead of hardcoding values.",
    example: "Used to make automation configurable and easy to migrate across sandboxes at <b>CodeTerriers</b>."
  },
  "Data Modeling": {
    category: "Platform & Clouds", icon: "sitemap",
    plain: "Designing how information is structured and connected in the system, so it's easy to find, report on, and keep accurate.",
    technical: "Designing custom objects, relationships (lookup and master-detail), and schema that balances normalization with reporting and automation performance.",
    example: "Built the object model behind the Health Cloud implementation at <b>Virtusa</b> and enterprise integrations at <b>CMS</b>."
  },

  /* ---------- Automation & AI ---------- */
  "Flow Builder": {
    category: "Automation & AI", icon: "workflow",
    plain: "Salesforce's drag-and-drop automation tool, letting complex business logic be built visually instead of writing code.",
    technical: "Building record-triggered, screen, and scheduled flows with subflows, decision logic, and Apex-invocable actions for complex business processes.",
    example: "Used to design complex automation for major enterprise clients at <b>CodeTerriers</b> and <b>CMS</b>."
  },
  "Record-Triggered Flows": {
    category: "Automation & AI", icon: "bolt",
    plain: "Automations that fire automatically the moment a record is saved, keeping data updated without anyone lifting a finger.",
    technical: "Configuring before-save and after-save record-triggered flows for field updates, related-record changes, and orchestrating downstream automation.",
    example: "A go-to tool for keeping data consistent across enterprise Salesforce orgs at <b>CodeTerriers</b>."
  },
  "Screen Flows": {
    category: "Automation & AI", icon: "mobile",
    plain: "Guided, step-by-step forms that walk users through a process, like a wizard.",
    technical: "Building multi-screen, branching guided flows with dynamic choices and validation, embedded in Lightning pages or Experience Cloud sites.",
    example: "Used to simplify multi-step processes for internal and customer-facing users at <b>CodeTerriers</b> and <b>CMS</b>."
  },
  "Agentforce": {
    category: "Automation & AI", icon: "robot",
    plain: "Salesforce's generative-AI agent platform — it lets you build AI 'agents' that understand requests and take action inside Salesforce.",
    technical: "Designing Agentforce topics and actions that combine LLM reasoning with Apex and Flow to automate customer-support and business workflows.",
    example: "Blueprinted high-value Agentforce use cases for customer-support automation at <b>CodeTerriers</b>."
  },
  "AI Agents": {
    category: "Automation & AI", icon: "robot",
    plain: "Software assistants that can understand a goal and carry out multiple steps to achieve it, rather than just answering one question.",
    technical: "Designing agent workflows that combine LLM reasoning, tool/action calls, and business logic to automate multi-step tasks.",
    example: "Combined with Flow and Apex to automate customer-support workflows at <b>CodeTerriers</b>."
  },
  "Prompt Engineering": {
    category: "Automation & AI", icon: "chat",
    plain: "The skill of writing clear instructions for an AI so it reliably gives useful, accurate responses.",
    technical: "Designing and iterating on prompts, grounding data, and guardrails to get consistent, safe output from LLMs in production use cases.",
    example: "Applied while designing Agentforce and LLM-powered automation at <b>CodeTerriers</b>."
  },
  "Einstein AI": {
    category: "Automation & AI", icon: "brain",
    plain: "Salesforce's built-in artificial intelligence features, like predictions and recommendations, layered on top of your data.",
    technical: "Leveraging Salesforce's native AI/ML features — predictions, recommendations, generative fields — within standard Salesforce workflows.",
    example: "Explored alongside Agentforce to bring AI-assisted recommendations into enterprise workflows at <b>CodeTerriers</b>."
  },
  "LLM Integrations": {
    category: "Automation & AI", icon: "plug",
    plain: "Connecting large language models (AI like ChatGPT) into a system so it can generate text, summarize, or make decisions automatically.",
    technical: "Integrating LLM APIs into Salesforce via Apex callouts and Agentforce, handling prompts, context grounding, and response parsing.",
    example: "Used to power generative-AI use cases within Agentforce automation at <b>CodeTerriers</b>."
  },
  "Validation Rules": {
    category: "Automation & AI", icon: "checklist",
    plain: "Simple rules that stop bad or incomplete data from being saved, by checking it against conditions before it's accepted.",
    technical: "Declarative, formula-based rules enforced at save time to guarantee data quality without requiring Apex.",
    example: "Used throughout to enforce business rules and data integrity across every Salesforce org I've worked on."
  },
  "Approval Processes": {
    category: "Automation & AI", icon: "checklist",
    plain: "A built-in workflow for getting sign-off from the right people before something (like a discount or a document) goes ahead.",
    technical: "Configuring multi-step, criteria-based approval processes with dynamic approvers, email alerts, and field updates on approval or rejection.",
    example: "Configured to route business approvals correctly within CPQ and case-management workflows at <b>CMS</b>."
  },

  /* ---------- Integration & Data ---------- */
  "REST APIs": {
    category: "Integration & Data", icon: "api",
    plain: "A standard, widely-used way for two systems to talk to each other over the internet, exchanging data as simple messages.",
    technical: "Building and consuming RESTful APIs — Apex REST classes and HTTP callouts — with JSON payloads, authentication, and error handling.",
    example: "Used to build integrations with Glass Guide and HOUN at <b>CodeTerriers</b>, and payment/scheduling integrations for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "SOAP APIs": {
    category: "Integration & Data", icon: "api",
    plain: "An older but still widely-used standard for systems to exchange structured data, common in enterprise software like ERPs.",
    technical: "Building and consuming SOAP web services with WSDL-based contracts for structured, enterprise-grade system integration.",
    example: "Used for enterprise integrations with external systems, including ERP platforms, at <b>CodeTerriers</b> and <b>CMS</b>."
  },
  "Custom Web Services": {
    category: "Integration & Data", icon: "api",
    plain: "Purpose-built connections that let Salesforce and outside systems share information automatically, tailored to a specific business need.",
    technical: "Writing custom Apex REST/SOAP web-service endpoints exposed from Salesforce for bespoke integration requirements.",
    example: "Built to connect Salesforce to partner systems (Glass Guide, HOUN) at <b>CodeTerriers</b>."
  },
  "ERP integrations": {
    category: "Integration & Data", icon: "building",
    plain: "Connecting Salesforce with a company's core business system (like inventory, finance, or operations software) so data flows automatically between them.",
    technical: "Designing bi-directional integrations between Salesforce and external ERP systems — mapping data models and handling sync errors.",
    example: "Supported custom API integrations connecting external ERP systems to Salesforce at <b>CMS</b>."
  },
  "Stripe": {
    category: "Integration & Data", icon: "creditCard",
    plain: "A payment platform that lets a website securely accept credit-card and online payments.",
    technical: "Integrating the Stripe API into Salesforce/LWC checkout flows for secure digital payment collection and transaction tracking.",
    example: "Connected Stripe to drive digital payment collection for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Twilio": {
    category: "Integration & Data", icon: "chat",
    plain: "A service that lets applications send text messages and make phone calls automatically.",
    technical: "Integrating the Twilio API for automated SMS/voice notifications triggered from Salesforce automation.",
    example: "Connected Twilio to drive messaging workflows for <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Calendly": {
    category: "Integration & Data", icon: "calendar",
    plain: "A scheduling tool that lets people book meetings directly into a calendar without back-and-forth emails.",
    technical: "Embedding and integrating the Calendly widget/API to automate appointment scheduling tied to Salesforce records.",
    example: "Integrated to drive scheduling for <b>Booking Ninjas / Corporate Rentals</b> — and used on this site's own contact section."
  },
  "WhatsApp": {
    category: "Integration & Data", icon: "messageCircle",
    plain: "Integrating the world's most popular messaging app so customers can chat with a business directly.",
    technical: "Integrating WhatsApp Business messaging into Salesforce workflows for customer communication and notifications.",
    example: "Connected WhatsApp messaging for customer communication at <b>Booking Ninjas / Corporate Rentals</b>."
  },
  "Workbench": {
    category: "Integration & Data", icon: "wrench",
    plain: "A power-user tool for viewing, editing, and moving Salesforce data directly, often used for one-off fixes or migrations.",
    technical: "Using Workbench for ad-hoc SOQL queries, bulk data operations, and metadata inspection during migrations and troubleshooting.",
    example: "Used for large-scale data migration and sanitization projects at <b>CMS</b>."
  },
  "Data Loader": {
    category: "Integration & Data", icon: "database",
    plain: "A tool for importing, updating, or exporting large amounts of data into Salesforce all at once, instead of one record at a time.",
    technical: "Using Data Loader (CLI/UI) for bulk insert, update, upsert, and delete operations, batching large volumes with error-file review.",
    example: "Used to run large-scale data migrations and build test-data pipelines at <b>CMS</b>."
  },

  /* ---------- Security & Governance ---------- */
  "Profiles & Permission Sets": {
    category: "Security & Governance", icon: "users",
    plain: "The system that controls exactly what each user is allowed to see and do inside Salesforce.",
    technical: "Designing least-privilege profiles and modular permission sets to manage object, field, and feature access across user populations.",
    example: "Managed user access this way for enterprise clients at <b>CMS</b> and via custom admin controls at <b>CodeTerriers</b>."
  },
  "Permission Set Groups": {
    category: "Security & Governance", icon: "users",
    plain: "A way to bundle several access permissions together so they can be assigned to a user in one step, instead of one at a time.",
    technical: "Grouping multiple permission sets into a single assignable unit to simplify access management for complex role structures.",
    example: "Used to simplify access administration for enterprise Salesforce orgs at <b>CodeTerriers</b>."
  },
  "Sharing Rules": {
    category: "Security & Governance", icon: "shield",
    plain: "Rules that automatically open up access to specific records for certain teams or roles, beyond the default visibility.",
    technical: "Configuring criteria- and ownership-based sharing rules to extend record visibility without loosening the org-wide default.",
    example: "Configured as part of the custom security frameworks built at <b>CodeTerriers</b>."
  },
  "OWD": {
    category: "Security & Governance", icon: "lock",
    plain: "'Organization-Wide Defaults' — the baseline setting for how private or open each type of record is by default.",
    technical: "Setting Organization-Wide Defaults as the restrictive baseline for record visibility, layered with sharing rules for exceptions.",
    example: "Configured as the security baseline within custom security frameworks at <b>CodeTerriers</b>."
  },
  "Field-Level Security": {
    category: "Security & Governance", icon: "lock",
    plain: "Control over which specific pieces of information on a record (like salary or a phone number) each user is allowed to see or edit.",
    technical: "Configuring field-level security via profiles and permission sets to restrict sensitive field visibility and editability per user group.",
    example: "Fine-tuned extensively on the custom data model built at <b>Virtusa</b>."
  },
  "MFA configuration": {
    category: "Security & Governance", icon: "shieldCheck",
    plain: "Setting up an extra login step (like a phone code) so accounts stay secure even if a password is stolen.",
    technical: "Configuring Salesforce Multi-Factor Authentication policies and verification methods org-wide for login security.",
    example: "Configured MFA as part of security and compliance work at <b>CodeTerriers</b>."
  },

  /* ---------- Delivery & DevOps ---------- */
  "Solution Architecture": {
    category: "Delivery & DevOps", icon: "compass",
    plain: "Designing the overall shape of a system — how the pieces fit together — before anyone starts building, so it scales and holds up long-term.",
    technical: "Translating business requirements into scalable Salesforce architecture: object model, automation strategy, integration design, and security model.",
    example: "Leads end-to-end solution design for a major Australian enterprise client at <b>CodeTerriers</b>."
  },
  "Technical Leadership": {
    category: "Delivery & DevOps", icon: "target",
    plain: "Guiding a development team's technical decisions and making sure the work being built is solid, consistent, and on track.",
    technical: "Setting technical direction, reviewing designs and code, and mentoring engineers while owning delivery quality across a Salesforce program.",
    example: "Serves as Salesforce Technical Lead at <b>CodeTerriers</b>, guiding architecture and delivery for the engineering team."
  },
  "Agile / Scrum": {
    category: "Delivery & DevOps", icon: "workflow",
    plain: "A way of working in short cycles (sprints), with regular check-ins, so teams can adapt quickly and deliver value continuously.",
    technical: "Operating within sprint-based delivery — backlog grooming, sprint planning, stand-ups, and retrospectives across cross-functional teams.",
    example: "The standard delivery rhythm across enterprise engagements at <b>CodeTerriers</b> and <b>CMS</b>."
  },
  "CI/CD Pipelines": {
    category: "Delivery & DevOps", icon: "gear",
    plain: "Automated systems that test and deploy code changes safely and consistently, instead of doing it manually every time.",
    technical: "Building continuous integration/continuous deployment pipelines that run tests and deploy Salesforce metadata automatically on merge.",
    example: "Set up and maintained to keep enterprise Salesforce deployments safe and repeatable at <b>CodeTerriers</b>."
  },
  "GitHub Actions": {
    category: "Delivery & DevOps", icon: "gitBranch",
    plain: "A tool built into GitHub that automatically runs checks or deployments whenever code is pushed or a pull request is opened.",
    technical: "Configuring GitHub Actions workflows (YAML) to run validation deployments, tests, and metadata pushes on Salesforce repositories.",
    example: "Used to automate CI/CD for Salesforce deployments at <b>CodeTerriers</b>."
  },
  "SFDX CLI": {
    category: "Delivery & DevOps", icon: "terminal",
    plain: "A command-line tool for developers to push, pull, and manage Salesforce code and configuration from their own computer.",
    technical: "Using the Salesforce CLI (sf/sfdx) for source-driven development, scratch orgs, metadata retrieval/deployment, and packaging.",
    example: "Core to source-driven development workflows at <b>CodeTerriers</b>."
  },
  "Git": {
    category: "Delivery & DevOps", icon: "gitBranch",
    plain: "The industry-standard tool for tracking changes to code over time and letting multiple people work on it together safely.",
    technical: "Using Git for branching strategies, code review via pull requests, and merge-conflict resolution across a multi-developer Salesforce codebase.",
    example: "Used daily for version control across every engineering role, from <b>Virtusa</b> to <b>CodeTerriers</b>."
  },
  "Production Support": {
    category: "Delivery & DevOps", icon: "headset",
    plain: "Being the person who steps in to fix issues in the live system quickly when something goes wrong, so the business keeps running.",
    technical: "Triaging, diagnosing, and resolving production incidents across Apex, Flow, and integrations, then deploying fixes through governed release pipelines.",
    example: "Provided production support and bug fixes across test and production environments at <b>Virtusa</b>."
  },

  /* ---------- Enterprise Platforms & ERP ---------- */
  "IFS Applications 10": {
    category: "Enterprise Platforms & ERP", icon: "building",
    plain: "A large enterprise resource-planning (ERP) system that big organizations use to run operations like finance, inventory, and maintenance.",
    technical: "Supporting IFS Applications 10 modules and workflows, including configuration awareness and cross-module business processes.",
    example: "Supported enterprise operations on IFS Applications 10 as a Trainee Support Analyst at <b>WebQuarters</b>."
  },
  "Enterprise App Support": {
    category: "Enterprise Platforms & ERP", icon: "headset",
    plain: "Helping the people who use big business software day-to-day when something doesn't work, and getting it fixed.",
    technical: "Providing L1/L2 application support — incident triage, root-cause investigation, and coordination with internal teams for resolution.",
    example: "Investigated user-reported incidents and coordinated resolutions for enterprise applications at <b>WebQuarters</b>."
  },
  "ERP Integrations": {
    category: "Enterprise Platforms & ERP", icon: "building",
    plain: "Connecting core business software with other systems so information doesn't have to be entered twice.",
    technical: "Applying the same integration discipline specifically in ERP contexts — mapping business data models between Salesforce and ERP platforms.",
    example: "Applied while supporting ERP-related workflows at <b>WebQuarters</b> and integrating ERP data at <b>CMS</b>."
  },
  "Business Process Analysis": {
    category: "Enterprise Platforms & ERP", icon: "sitemap",
    plain: "Studying how a business currently works step-by-step, to find where processes can be simplified, automated, or fixed.",
    technical: "Mapping current-state business processes, identifying automation opportunities, and translating findings into functional requirements for the platform team.",
    example: "Assisted with ERP-related workflows and operational process analysis at <b>WebQuarters</b>."
  }
};
