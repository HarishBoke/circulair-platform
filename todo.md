# Circul-AI-r Platform TODO

## Phase 1: Foundation
- [x] Project scaffolding with React 19 + tRPC + MySQL
- [x] Database schema: batteries, telemetry, users, marketplace, logistics, compliance, alerts, documents
- [x] Global design system: dark theme, color tokens, typography (Syne + DM Sans + DM Mono)
- [x] PlatformLayout with role-aware sidebar navigation
- [x] Authentication and role-based access (OEM, Recycler, BESS Developer, Government, Admin)

## Phase 2: BPAN Registry & Battery Management
- [x] BPAN generation engine (21-char alphanumeric structure)
- [x] BPAN validation and decoding API
- [x] QR code generation for batteries
- [x] Battery registration form (manufacturer, capacity, chemistry, voltage, cell origin)
- [x] Battery registry list with search/filter
- [x] Battery detail page with lifecycle timeline
- [x] Battery status management (Operational / Second Life / End of Life)
- [x] Service history tracking

## Phase 3: IoT Telemetry
- [x] Telemetry ingestion API (MQTT simulation)
- [x] Real-time telemetry dashboard with live charts
- [x] Voltage, current, temperature, cycle count, IR monitoring
- [x] Thermal anomaly detection (T_max > 51°C alerts)
- [x] Telemetry history and trend analysis

## Phase 4: AI SOH Prediction
- [x] SOH prediction API (CNN-LSTM simulation with LLM)
- [x] RUL estimation display
- [x] AI triage routing (Direct Reuse / Module Repurposing / Material Recycling)
- [x] SOH prediction accuracy tracking (< 2% RMSE target)
- [x] Predictive maintenance recommendations
- [x] Battery health passport generation

## Phase 5: Marketplace
- [x] Battery listing creation with health passport
- [x] Marketplace browse/search with filters
- [x] Dynamic spot pricing based on SOH/RUL
- [x] Smart matching for BESS developers
- [x] Order management and transaction tracking
- [x] Marketplace analytics (volume, revenue, take rate)

## Phase 6: Reverse Logistics
- [x] Pickup request dispatch system
- [x] Hazmat manifest generation
- [x] GPS chain-of-custody tracking simulation
- [x] 24/48-hour SLA monitoring
- [x] Logistics partner management
- [x] Shipment status tracking

## Phase 7: EPR Compliance & Blockchain
- [x] EPR token issuance on yield verification
- [x] Compliance audit trail (blockchain simulation)
- [x] CPCB Form BW-3 report generation
- [x] PLI provenance passport generation
- [x] EPR credit token management
- [x] Compliance dashboard for government regulators

## Phase 8: Yield Verification
- [x] SCADA data ingestion API
- [x] Black Mass yield reconciliation
- [x] Theoretical vs actual yield comparison
- [x] End-product certification tracking
- [x] Mineral recovery reporting

## Phase 9: Analytics & KPIs
- [x] Platform-wide KPI dashboard
- [x] SOH prediction accuracy metrics
- [x] Marketplace transaction volume charts
- [x] Sustainability KPIs (EPR compliance, mineral recovery, second-life rate)
- [x] System uptime monitoring display
- [x] Warranty claim reduction tracking

## Phase 10: Alerts & Notifications
- [x] Thermal anomaly alerts (T_max > 51°C)
- [x] EOL battery detection alerts
- [x] Logistics dispatch confirmations
- [x] EPR token issuance notifications
- [x] Compliance deadline reminders
- [x] In-app notification center
- [x] Alert history and management

## Phase 11: AI Assistant
- [x] Natural language query interface for battery data
- [x] BPAN decoding chatbot
- [x] Lifecycle guidance assistant
- [x] Automated CPCB compliance report generation
- [x] Predictive maintenance recommendations via AI
- [x] Suggested queries panel

## Phase 12: Document Storage
- [x] Battery certificates upload/storage
- [x] Compliance documents management
- [x] Health passports PDF generation
- [x] Recycling manifests storage
- [x] Audit trail PDF export
- [x] Role-based document access control

## Phase 13: Role-Based Dashboards
- [x] OEM dashboard (fleet overview, BPAN registration, warranty)
- [x] Battery Manufacturer dashboard (production, QR codes)
- [x] Recycler dashboard (EOL intake, yield, EPR tokens)
- [x] BESS Developer dashboard (marketplace, procurement)
- [x] Service Provider dashboard (field ops, service history)
- [x] Government/Regulator dashboard (CPCB portal, compliance)
- [x] Admin dashboard (platform overview, all KPIs)

## Phase 14: Testing & Polish
- [x] Vitest unit tests for core procedures (24 tests passing)
- [x] TypeScript strict mode: 0 errors
- [x] Responsive design (mobile sidebar, RWD breakpoints)
- [x] Loading/error/empty states on all pages
- [x] Final checkpoint and delivery

## Phase 15: Real-Time WebSocket Telemetry
- [x] Install socket.io server + socket.io-client packages
- [x] Create server/telemetrySocket.ts — Socket.io server with rooms per BPAN
- [x] Wire Socket.io into server/_core/index.ts HTTP server
- [x] Create MQTT-simulation broadcaster that emits live readings every 2s
- [x] Extend telemetry.ingest tRPC procedure to broadcast via socket
- [x] Create client/src/hooks/useTelemetrySocket.ts — React hook for live data
- [x] Create client/src/contexts/TelemetrySocketContext.tsx — shared socket instance
- [x] Rewrite Telemetry.tsx to use live socket stream + rolling chart buffer
- [x] Add live connection status indicator (connected/reconnecting/disconnected)
- [x] Add per-BPAN room subscription (join/leave on monitor start/stop)
- [x] Add thermal anomaly real-time toast push via socket
- [x] Update Dashboard.tsx to show live alert badge via socket
- [x] Write vitest tests for socket event handlers (15 tests passing)

## Phase 16: Dummy Data & Real Data Integration Hub
- [x] Audit schema for all tables and plan seed data coverage
- [x] Write seed.mjs — 40 batteries (NMC/LFP/NCA/LCO/LMO), 480 telemetry readings, 25 SOH predictions, 18 marketplace listings, 20 logistics orders, 22 EPR tokens, 35 alerts, 89 service records
- [x] Fix all enum values to match DB schema (chemistry, status, listingType, logistics status, shipmentId length)
- [x] Optimize seed with bulk inserts for telemetry and alerts
- [x] Build DataIntegration.tsx — MQTT, REST API, CSV import, Webhooks, SDK, Direct DB tabs
- [x] Add Data Integration route to App.tsx (/data-integration)
- [x] Add Database icon + Data Integration nav item to PlatformLayout sidebar (INTEGRATIONS section)
- [x] TypeScript: 0 errors
- [x] Tests: 39 passing (auth + platform + telemetrySocket)

## Phase 17: Real MQTT Broker Integration
- [x] Install mqtt npm package (mqtt v5)
- [x] Build server/mqttSubscriber.ts — full MQTT client with reconnect, TLS, auth
- [x] Bridge MQTT messages → insertTelemetry (DB) → Socket.io broadcast
- [x] Handle thermal anomaly detection and alert creation in MQTT handler
- [x] Wire mqttSubscriber into server/_core/index.ts startup
- [x] Add mqtt tRPC router (status, connect, disconnect, testPublish)
- [x] Build MqttBrokerPanel.tsx — live broker status, message rate, connect form, test publish
- [x] Add MqttBrokerPanel to Data Integration Hub MQTT tab
- [x] Add MQTT connection status to Telemetry page header (via existing socket indicator)
- [x] Write 19 vitest tests for MQTT subscriber logic (all passing)
- [x] TypeScript: 0 errors
- [x] Tests: 58 passing (19 MQTT + 15 socket + 23 platform + 1 auth)

## Phase 18: MQTT Flow Tester (Bidirectional Live Testing)
- [x] Add mqtt.publish tRPC procedure (server-side broker publish)
- [x] Add mqtt.startStream / mqtt.stopStream for continuous publishing
- [x] Build MqttFlowTester.tsx — publish form, scenario picker, live log feed, DB confirmation
- [x] Show real-time message flow: Publish → Broker → Server → DB → Socket.io
- [x] Add sidebar nav link under INTEGRATIONS
- [x] Wire /mqtt-flow-tester route in App.tsx
- [x] Write tests for mqtt.publish procedure

## Phase 19: Alert Deduplication Cooldown (5 min)
- [x] Build server/alertCooldown.ts — in-memory cooldown map + DB-backed check
- [x] Apply cooldown to MQTT subscriber thermal anomaly alert
- [x] Apply cooldown to MQTT subscriber EOL alert
- [x] Apply cooldown to tRPC telemetry.ingest thermal anomaly alert
- [x] Write 17 vitest tests for AlertCooldown module (all passing)
- [x] TypeScript: 0 errors
- [x] Tests: 79 passing total (17 cooldown + 19 MQTT + 23 platform + 19 socket + 1 auth)

## Phase 20: PDF Export — Health Passports & CPCB Reports [COMPLETE]
- [x] Evaluated PDF libraries — chose puppeteer-core + system Chromium for pixel-perfect rendering
- [x] Installed puppeteer-core; uses /usr/bin/chromium-browser (no binary download needed)
- [x] Built server/pdfGenerator.ts — health passport HTML template with SOH gauge, telemetry, service history
- [x] Built CPCB Form BW-3 HTML template with all regulatory fields (EPR tokens, yield, mineral recovery)
- [x] Added tRPC pdf.healthPassport (bpan) → S3 URL + documents table record
- [x] Added tRPC pdf.cpcbReport (year, month) → S3 URL + documents table record
- [x] Wired "Export Health Passport" button in BpanDetail.tsx (opens PDF in new tab)
- [x] Wired "Export CPCB BW-3" button in EprCompliance.tsx (opens PDF in new tab)
- [x] Stored PDF metadata in documents table (S3 key, URL, bpan, type, fileSize)
- [x] Wrote 14 vitest tests for pdfGenerator (all passing)
- [x] TypeScript: 0 errors
- [x] Tests: 90 passing total

## Phase 21: Admin User Role Management UI [COMPLETE]
- [x] Extend users table with platformRole enum (7 roles) and roleAuditLog table
- [x] Schema already had platformRole — verified roleAuditLog table in DB
- [x] Add listUsersAdmin, getUserRoleStats, updateUserRoleById, createRoleAuditEntry, getRoleAuditLog db helpers
- [x] Add admin.listUsers tRPC procedure (search, filter by role, pagination)
- [x] Add admin.roleStats tRPC procedure (counts by platformRole and systemRole)
- [x] Add admin.updateUserRole tRPC procedure with full audit logging
- [x] Add admin.auditLog tRPC procedure (paginated role change history)
- [x] Build AdminUserManagement.tsx — user table with role badges, search, filter, pagination
- [x] Role distribution stats bar (7 platform roles with count and % bar)
- [x] Edit Role Dialog with platformRole, systemRole, organization, reason fields
- [x] Audit trail tab showing full role change history
- [x] Wire /admin/users route in App.tsx
- [x] Add Users nav item under ADMIN section in PlatformLayout sidebar
- [x] Write 23 vitest tests for admin user management procedures
- [x] TypeScript: 0 errors, 113 tests passing

## Phase 22: Admin User Management UI Redesign [COMPLETE]
- [x] Rewrite AdminUserManagement.tsx with clean, compact, responsive layout
- [x] Replace bulky card-heavy layout with lean table + slim stat row
- [x] Responsive: mobile card view (< md), desktop table (≥ md), xl extra columns
- [x] Compact Edit Role dialog — avatar header, single-column fields, no wasted space
- [x] Clean Audit Log tab with timeline dot + role-change arrow entries
- [x] Edit button appears on row hover (desktop), always visible on mobile
- [x] TypeScript: 0 errors, 113 tests passing

## Phase 23: Admin User Management — Calm & Readable Redesign [COMPLETE]
- [x] Removed stat strip — header shows total + admin count only
- [x] Single Edit button always visible per row (no hover tricks)
- [x] Improved text contrast: white/zinc-100 for names, zinc-500 for meta
- [x] Single role badge per row, system access shown as plain text
- [x] Clean skeleton loading and empty states
- [x] Audit log: simple two-column timeline, no table overhead
- [x] Edit dialog: compact card with avatar, 4 fields, 2 action buttons
- [x] TypeScript: 0 errors, 113 tests passing

## Phase 24: Search Debounce in Admin User Management [COMPLETE]
- [x] Created reusable useDebounce<T> hook at client/src/hooks/useDebounce.ts
- [x] Wired 300ms debounce to AdminUserManagement search input
- [x] Page resets to 0 via useEffect on debouncedSearch change only
- [x] TypeScript: 0 errors, 113 tests passing

## Phase 25: Inline Role Quick-Change Dropdown [COMPLETE]
- [x] Replaced Edit button with inline platform-role Select dropdown in each row
- [x] Dropdown saves immediately on change with audit log entry (reason: "Quick role change from admin panel")
- [x] Compact MoreHorizontal icon button opens full details dialog (org/reason/system-role)
- [x] Spinner shown inside SelectTrigger while mutation is in flight; dropdown disabled during save
- [x] UserRow extracted as a separate component with its own mutation instance
- [x] TypeScript: 0 errors, 113 tests passing

## Phase 26: Admin User Management — Full Audit & Hardening [COMPLETE]
- [x] Backend: all admin.* procedures now use adminProcedure (non-admins get FORBIDDEN)
- [x] Backend: self-demotion guard — cannot remove own admin access
- [x] Backend: last-admin guard — cannot demote if no other admins remain
- [x] Backend: TRPCError with proper codes (NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR)
- [x] Backend: input validation — max lengths on strings, .int().positive() on IDs
- [x] Frontend: useMemo depends on debouncedSearch (not raw search) — no stale queries
- [x] Frontend: EditDialog uses key prop for full remount + useEffect syncs on user.id change
- [x] Frontend: mutation.isPending used throughout — no manual boolean state
- [x] Frontend: mobile role badge + details button always visible on small screens
- [x] Frontend: PAGE_SIZE is module-level constant
- [x] Frontend: access guard placed after all hooks (Rules of Hooks compliant)
- [x] TypeScript: 0 errors, 113 tests passing (8 test files)

## Phase 27: Multinational Compliance & i18n Foundation [COMPLETE]
- [x] shared/jurisdictions.ts — jurisdiction registry (EU, IN, CN, US, UK, TH, ID) with full metadata
- [x] shared/currencies.ts — currency registry (INR, EUR, USD, GBP, CNY, JPY, KRW, THB, IDR, AED)
- [x] shared/regulatory.ts — RegulatoryProfile, CarbonFootprint, MaterialComposition shared types
- [x] shared/i18n/en.json — base English translation file
- [x] shared/i18n/de.json, fr.json, zh.json, hi.json — 4 additional language files
- [x] drizzle/schema.ts — added regulatoryProfiles, platformSettings, carbonFootprintDeclarations tables
- [x] pnpm db:push + manual SQL — all 4 new tables live in TiDB
- [x] server/db-regulatory.ts — full CRUD helpers for regulatory profiles and platform settings
- [x] server/routers.ts — regulatory.* and platformSettings.* tRPC procedures added
- [x] client/src/contexts/PlatformSettingsContext.tsx — formatCurrency, formatDate, locale, activeJurisdictions
- [x] main.tsx — PlatformSettingsProvider added to provider tree
- [x] client/src/pages/PlatformSettings.tsx — org settings page (locale, currency, timezone, jurisdictions, data residency)
- [x] client/src/pages/ComplianceDashboard.tsx — per-jurisdiction compliance status cards + feature highlights
- [x] client/src/pages/EuBatteryPassport.tsx — public passport page at /passport/EU/:localId (no auth)
- [x] App.tsx — /settings/platform, /compliance, /passport/EU/:localId routes added
- [x] PlatformLayout.tsx — Compliance Dashboard + Platform Settings added to sidebar
- [x] TypeScript: 0 errors, 113 tests passing (8 test files)

## Phase 28: Carbon Footprint Declaration Form [COMPLETE]
- [x] Reviewed carbonFootprintDeclarations table — bpan, 4 stage columns, performanceClass, methodology, certifyingBody
- [x] Added getCarbonFootprintByBpan db helper in db-regulatory.ts
- [x] Added regulatory.getCarbonFootprintByBpan tRPC procedure (protected, by BPAN)
- [x] Added regulatory.declareCarbonFootprint tRPC procedure (protected, creates new declaration)
- [x] Built shared/carbonClass.ts — A-E class calculator with chemistry-specific thresholds (NMC, LFP, NCA, LCO, LMO, LEAD_ACID, DEFAULT)
- [x] Built CarbonFootprintForm.tsx — 4 lifecycle stage inputs with auto-sum total
- [x] Live A-E class badge updates on every keystroke (useMemo on stage values)
- [x] Visual performance class bar with EU reference marker and this-battery marker
- [x] Class E warning callout with chemistry-specific threshold explanation
- [x] Integrated CarbonFootprintForm into BpanDetail.tsx as a dedicated section
- [x] Read-only passport view when declaration exists; Edit mode via 'Update Declaration' button
- [x] Prefills form from existing declaration when entering edit mode
- [x] Placeholder hints show expected values based on capacity × reference intensity × typical stage share
- [x] Wrote 32 vitest tests for carbonClass.ts (calculatePerformanceClass, getThresholds, getReferenceIntensity, LIFECYCLE_STAGES, CLASS_LABELS, CLASS_COLORS)
- [x] TypeScript: 0 errors, 145 tests passing (9 test files)

## Phase 29: Carbon Badge + Multi-Currency + i18n [COMPLETE]
- [x] Add A–E carbon class badge column to BpanRegistry battery table
- [x] Backend: batchGetCarbonClasses db helper + joined in bpan.list procedure
- [x] Multi-currency marketplace: priceCurrency stored in marketplace_listings_currency table
- [x] Multi-currency marketplace: currency selector (10 currencies) in listing creation form
- [x] Multi-currency marketplace: prices displayed with Intl.NumberFormat + currency symbol
- [x] Installed react-i18next, i18next, html-parse-stringify, use-sync-external-store, void-elements
- [x] Created client/src/lib/i18n.ts — i18next config with browser language detection + fallback
- [x] Wired i18n import into main.tsx
- [x] Built LanguageSelector component in PlatformLayout sidebar footer (5 languages)
- [x] Wrote 26 vitest tests for carbon badge, currency formatting, i18n files, jurisdictions
- [x] TypeScript: 0 errors, 169 tests passing (10 test files)

## Phase 30: Remove Manus Branding from Meta [COMPLETE]
- [x] Added proper meta description, og:title, og:description, twitter:card tags with Circul-AI-r branding
- [x] Added Google Fonts link for Syne + DM Sans + DM Mono in index.html
- [x] Replaced "Login with Manus" → "Sign In" and "Please login with Manus" → "Please sign in to continue" in ManusDialog.tsx
- [x] Removed Manus comment from server/storage.ts
- [x] Verified: no user-facing Manus references remain (only internal _core/test fixtures with loginMethod: "manus")
- [x] TypeScript: 0 errors, 169 tests passing

## Phase 31: Production-Grade Gap Fixes [COMPLETE]
- [x] Wire useTranslation() into PlatformLayout sidebar — all nav labels, section headers, and role badge use i18n keys
- [x] Fix NotFound page — dark theme with zinc-900 bg, animated 404, back-to-dashboard link
- [x] Add recycledContentDeclarations table to schema + SQL migration
- [x] Add recycled content db helpers (getRecycledContentByBpan, createRecycledContentDeclaration) + tRPC procedures (declareRecycledContent, getRecycledContentByBpan)
- [x] Build RecycledContentForm component with Co/Li/Ni/Pb percentage inputs, EU threshold bars, compliance summary
- [x] Integrate RecycledContentForm into BpanDetail page as dedicated section
- [x] Build reusable CSV export utility (client/src/lib/csvExport.ts) with typed columns
- [x] Add CSV export buttons to BpanRegistry, Marketplace, Admin Users
- [x] Add helmet middleware for security headers (CSP relaxed for Vite HMR)
- [x] Add express-rate-limit — 120 req/min on /api/, 20 req/15min on /api/oauth/
- [x] Add pagination to Marketplace (12 per page with Previous/Next controls)
- [x] Build first-login onboarding wizard — 7-step walkthrough (Welcome, Registry, Telemetry, Marketplace, Carbon/Recycled, Compliance, Roles), localStorage persistence, progress bar, dot navigation
- [x] TypeScript: 0 errors, 169 tests passing (10 test files)

## Phase 32: Professional Overhaul — Landing, Auth, Super Admin, Agentic Layer
- [x] Redesign landing page with enterprise-grade content, animated hero, stakeholder use-cases, compliance badges, partner section, professional footer
- [x] Modernize login/signup auth page — dark theme, animated battery visual, role-aware messaging
- [x] Build Super Admin panel at /admin/system — platform health, agent action log, system metrics, MQTT status, user growth, API usage
- [x] Add agentActions table to schema for tracking all agentic operations
- [x] Add agent tRPC router — agent.execute, agent.logAction, agent.listActions, agent.stats, agent.recentActivity, agent.systemHealth, agent.batchExecute, agent.capabilities
- [x] Wire Super Admin into sidebar navigation (admin-only)
- [x] Add agentic action logging middleware — logAction and execute endpoints for all modules
- [x] Write vitest tests for agent router and super admin procedures (12 tests)
- [x] TypeScript: 0 errors, 181 tests passing (11 test files)

## Phase 33: Battery Onboarding, Auto-BPAN Tie-Up & Warranty System
- [x] Design warranty_records schema (warrantyId, batteryId, bpan, manufacturer, purchaseDate, warrantyStartDate, warrantyEndDate, warrantyTermMonths, warrantyType, coverageType, customerName, customerPhone, customerEmail, customerWhatsApp, dealerName, dealerCode, invoiceNumber, invoiceUrl, serialNumber, modelNumber, status, claimHistory, notes)
- [x] Build bulk battery onboarding — CSV/manual import of existing batteries with auto-BPAN generation and tie-up
- [x] Auto-BPAN assignment logic — parse manufacturer serial, chemistry, capacity, origin to generate BPAN automatically
- [x] Warranty registration flow — register warranty with purchase details, customer info, dealer info
- [x] Warranty check/lookup — public-facing page to check warranty by BPAN, serial number, phone, or email
- [x] Warranty status engine — active/expired/voided/claimed logic with days remaining calculation
- [x] Warranty impact on platform — warranty status affects triage path, marketplace listing eligibility, and compliance reporting
- [x] Multi-channel warranty verification — phone, WhatsApp, email lookup support
- [x] Warranty claim workflow — initiate claim, track status, resolution
- [x] Wire warranty into battery detail page and dashboard
- [x] Add warranty routes to App.tsx and sidebar navigation
- [x] Write vitest tests for warranty and onboarding procedures (17 tests)
- [x] TypeScript: 0 errors, 198 tests passing (12 test files)

## Phase 34: Enterprise-Grade Upgrade — Compliance, Microservices, MCP & Documentation

### ISO 27001 / SOC 2 Compliance
- [ ] Build comprehensive audit_logs table (who, what, when, where, ip, user_agent, resource, action, result)
- [ ] Build audit logging middleware for all tRPC procedures (automatic capture)
- [ ] Build security event logging (login, logout, role change, data export, failed auth)
- [ ] Build data classification labels (public, internal, confidential, restricted) on all endpoints
- [ ] Build access control matrix documentation (role × resource × action)
- [ ] Build encryption-at-rest and in-transit verification endpoints
- [ ] Build compliance dashboard page with audit trail viewer, security events, data classification
- [ ] Build GDPR/data retention policy engine (configurable retention periods)
- [ ] Build session management (concurrent session limits, forced logout, session audit)

### Microservices-Ready API Layer
- [x] Build REST API gateway alongside tRPC (Express routes under /api/v1/*)
- [x] Build API key management system (create, revoke, rotate keys with scopes)
- [x] Build OpenAPI 3.1 specification for all public endpoints
- [x] Build rate limiting per API key with configurable tiers
- [x] Build API versioning (v1 namespace)
- [x] Build webhook system for event notifications
- [x] Build API usage analytics (requests per key, endpoint popularity, error rates)
- [x] Build Swagger/OpenAPI documentation UI at /api/docs

### MCP (Model Context Protocol) Server
- [x] Build MCP server with 20 tools for all platform operations
- [x] Build MCP resources (5) for battery data, warranty, marketplace, compliance, analytics
- [x] Build MCP prompts (4) for battery health, fleet overview, warranty analysis, compliance summary
- [x] Register MCP server at /api/mcp with JSON-RPC 2.0 protocol

### Enhanced Logging
- [x] Build structured JSON logging with correlation IDs (SIEM-ready)
- [x] Build request tracing (trace_id propagation across all operations)
- [x] Build security event log with severity classification (low/medium/high/critical)
- [x] Build log retention and rotation policies

### Documentation Suite
- [x] Write Platform Overview document (PLATFORM_GUIDE.md)
- [x] Write Getting Started / How-To Guide (HOW_TO_GUIDES.md — 12 guides)
- [x] Write API Reference (API_REFERENCE.md)
- [x] Write Feature Documentation (FEATURES.md — 25 features documented)
- [x] Write Compliance & Security Guide (COMPLIANCE_GUIDE.md)
- [x] Write Microservices Integration Guide (included in API_REFERENCE.md)
- [x] Write MCP Integration Guide (MCP_GUIDE.md)
- [x] Write Architecture & Data Model documentation (ARCHITECTURE.md)
- [x] Documentation available in /docs directory (7 files, 79KB total)
- [x] TypeScript: 0 errors, 198 tests passing (12 test files)

## Phase 35: CirculWiki — AI-Powered Knowledge Base (DeepWiki-style)
- [x] Design wiki content structure with 6 categories, 24 articles, cross-references
- [x] Build 24 knowledge base articles covering platform features, battery science, compliance, integration, architecture, operations
- [x] Build CirculWiki main page with category grid, featured articles, search bar
- [x] Build article reader page with table of contents, cross-references, related articles
- [x] Build full-text search across all wiki articles
- [x] Build AI chat interface with LLM-powered Q&A (tRPC wiki.chat mutation)
- [x] Build 4 interactive SVG architecture diagrams (system, data-flow, security, modules)
- [x] Build knowledge graph visualization showing article relationships
- [x] Add CirculWiki to sidebar navigation (KNOWLEDGE section) and landing page footer
- [x] Write vitest tests for wiki data, search, chat, and diagrams (16 tests)
- [x] TypeScript: 0 errors, 239 tests passing (14 test files)

## Phase 36: CirculWiki Enhancements — Diagrams, Feedback, Tutorial
- [x] Embed ArchitectureDiagram component into 11 wiki articles (platform-overview, architecture-overview, platform-modules, security-architecture, data-model, telemetry-system, mqtt-integration, rest-api, mcp-integration, iso27001, soc2)
- [x] Add ARTICLE_DIAGRAM_MAP with type and title metadata for each article-diagram pair
- [x] Build article contribution/feedback system — wiki_feedback table with star ratings, 6 feedback types, admin review
- [x] Build ArticleFeedback component with star ratings, 6 types (helpful, not helpful, suggest edit, flag outdated, flag inaccurate, request topic)
- [x] Build admin review workflow — wikiFeedback.list, wikiFeedback.review (approve/reject/merge) tRPC procedures
- [x] Build interactive Getting Started tutorial page with 10 backend-tracked steps and progress bar
- [x] Tutorial covers: dashboard, register battery, telemetry, SOH, warranty register/check, marketplace, compliance, wiki, AI assistant
- [x] Add backend progress tracking via tutorial_progress table with complete/reset mutations
- [x] Add /getting-started route, sidebar link (KNOWLEDGE section), and landing page footer link
- [x] All 239 existing tests still passing (14 test files)
- [x] TypeScript: 0 errors, 239 tests passing (14 test files)

## Phase 37: Admin Feedback Review Page
- [x] Build Admin Feedback Review page at /admin/feedback with full CRUD
- [x] Add feedback stats summary (total, pending, approved, rejected, merged) with clickable stat cards
- [x] Add filtering by status, type (7 types), and full-text search across articles/content/users
- [x] Add review actions (approve, reject, merge) with optional review notes field
- [x] Add feedback detail side panel with user info, dates, rating, content, suggested edits, and article link
- [x] Add bulk actions — select multiple items and batch approve/reject/merge
- [x] Integrate into sidebar (ADMIN > Feedback Review) and App.tsx route (/admin/feedback)
- [x] Write 16 vitest tests for feedback list, stats, review, submit, and validation
- [x] TypeScript: 0 errors, 255 tests passing (15 test files)

## Phase 38: Landing Page Typography & Design Overhaul
- [x] Replace fonts: Plus Jakarta Sans (display), Inter (body), JetBrains Mono (monospace)
- [x] Update index.css with new font-family CSS variables and refined type scale
- [x] Update index.html with Google Fonts CDN links for all 3 font families
- [x] Redesign hero section with extrabold headings, tight tracking, explicit font-family
- [x] Improve section headings, body text, and card typography across all sections
- [x] Polish layout, fix dynamic Tailwind class issues (stakeholder icons), improve spacing
- [x] TypeScript: 0 errors, 255 tests passing (15 test files)

## Phase 39: Launching Soon Splash Screen & Access Gate
- [x] Build LaunchingSoon.tsx splash page with countdown timer, animated particles, and password form
- [x] Add username/password access gate (VITE_ACCESS_USERNAME/VITE_ACCESS_PASSWORD env secrets)
- [x] Wire access gate into App.tsx — all routes protected until credentials entered
- [x] Store access state in localStorage (circulair_access_granted key)
- [x] Professional design matching platform dark theme with Plus Jakarta Sans typography
- [x] TypeScript: 0 errors, 258 tests passing (16 test files)

## Phase 40: Add Setoo Branding
- [x] Add "By www.setoo.co" branding to Launching Soon footer
- [x] Add "By www.setoo.co" branding to platform landing page footer

## Phase 41: Fix Deployment + Replace Manus OAuth with JWT Auth
- [ ] Fix pnpm-lock.yaml sync with package.json for deployment
- [ ] Remove Manus OAuth dependency
- [ ] Build email/password registration endpoint with bcrypt hashing
- [ ] Build email/password login endpoint returning JWT token
- [ ] Build JWT middleware for protected routes (replace protectedProcedure)
- [ ] Build Login page UI with email/password form
- [ ] Build Register page UI with name/email/password form
- [ ] Update useAuth hook to use JWT-based auth instead of Manus OAuth
- [ ] Update all auth references across frontend (getLoginUrl, ManusDialog, etc.)
- [ ] Update PlatformLayout auth screen to use new login/register
- [ ] Write vitest tests for new auth system
- [x] TypeScript: 0 errors, 363 tests passing total, deployment succeeds

## Auth Migration: Manus OAuth → JWT Email/Password
- [x] Add passwordHash column to users table schema
- [x] Create server/_core/auth.ts with JWT token creation/verification
- [x] Create /api/auth/register endpoint with bcrypt password hashing
- [x] Create /api/auth/login endpoint with JWT cookie session
- [x] Create /api/auth/logout endpoint
- [x] Create /api/auth/me endpoint
- [x] Rewrite context.ts to use new authenticateRequest from auth.ts
- [x] Replace registerOAuthRoutes with registerAuthRoutes in index.ts
- [x] Add getUserByEmail and createLocalUser helpers to db.ts
- [x] Create Login page (client/src/pages/Login.tsx) with email/password form
- [x] Create Register page (client/src/pages/Register.tsx) with name/email/password form
- [x] Add /login and /register routes to App.tsx
- [x] Rewrite client/src/const.ts — getLoginUrl now returns /login
- [x] Update useAuth hook to redirect to /login instead of OAuth URL
- [x] Update main.tsx to redirect to /login on unauthorized errors
- [x] Remove getLoginUrl import from PlatformLayout, DashboardLayout, Home, GettingStarted
- [x] Update ArchitectureDiagram security node from "Manus OAuth" to "JWT Auth"
- [x] Update security.ts rate limiter from /api/oauth/ to /api/auth/
- [x] Clean stale i18next from node_modules (pnpm reinstall)
- [x] Write auth.test.ts with 11 tests covering JWT, tRPC auth, email validation
- [x] All 269 tests passing, 0 TypeScript errors, build succeeds

## Logo Replacement: AI-generated icon → Circul-AI-r SVG logo
- [x] Upload circulair.svg to CDN via manus-upload-file
- [x] Generate favicon.ico from SVG
- [x] Replace favicon in client/public/
- [x] Update VITE_APP_LOGO env with CDN URL (built-in, used CDN directly)
- [x] Replace all inline SVG logo icons across components (Home, PlatformLayout, LaunchingSoon, Login, Register, ManusDialog)
- [x] Verify build and visual appearance

## Fixes: Logo display and contact email
- [x] Fix broken logo display (created dark-bg version of SVG, white path → #000202 matching theme)
- [x] Update contact email to business@setoo.co across all pages

## Design: Remove AI-looking badge/pill labels
- [ ] Audit all rounded pill badge labels (e.g. "MULTINATIONAL BATTERY LIFECYCLE PLATFORM")
- [ ] Redesign to editorial/typographic treatment (no rounded pill, no globe icon, clean type)
- [ ] Apply consistently across Home, LaunchingSoon, and any other pages

## SEO: Update meta tags from landing page content
- [x] Extract key headings, value props, and features from Home.tsx
- [x] Rewrite title, description, keywords, OG tags to match landing page (not launch screen)

## SEO: Dynamic document.title for inner pages
- [x] Create usePageTitle hook for consistent title management
- [x] Apply to all inner page components (34 pages)

## SEO: Add sitemap.xml
- [x] Create /sitemap.xml route listing all public pages with canonical URLs, priorities, and change frequencies
- [x] Add sitemap reference to robots.txt

## SEO: Add JSON-LD structured data
- [x] Add Organization schema to index.html
- [x] Add WebApplication + WebSite schema to index.html
- [x] Add BreadcrumbList + WebPage schema to Home, Marketplace, CirculWiki, GettingStarted

## Fix: Regenerate favicon from correct logo
- [x] Regenerate favicon.ico from circulair.svg (20KB, 6 sizes: 16/32/48/64/128/256)

## Fix: LaunchingSoon page SEO (title, description, keywords)
- [x] Fix title (47 chars), description (148 chars), keywords meta — all within SEO limits

## Mobile: Apple Touch Icon + Web App Manifest
- [x] Generate apple-touch-icon.png (180×180) from logo SVG
- [x] Generate manifest icons (192×192, 512×512) from logo SVG
- [x] Create manifest.json with app name, icons, theme colors
- [x] Link apple-touch-icon and manifest in index.html + mobile meta tags

## Compliance: GDPR Cookie Consent Banner
- [x] Create CookieConsent component (accept/reject/manage, localStorage persistence)
- [x] Gate analytics script on consent (dynamically inject/remove Umami)
- [x] Integrate banner into App.tsx root (both LaunchingSoon and main app)

## Inner Pages: Wire up with real data
- [x] Audit all inner pages for placeholder vs real data states
- [x] Dashboard: replaced all MOCK_* chart constants with real tRPC data (SOH trend, triage, marketplace weekly)
- [x] Analytics: replaced all MOCK_* chart constants with real tRPC data (monthly activity, SOH distribution, chemistry mix)
- [x] Added 6 new chart tRPC procedures (monthlyActivity, sohDistribution, sohTrend, chemistryDistribution, triageDistribution, marketplaceWeekly)
- [x] Added 6 DB helper functions for chart data in db.ts
- [x] BPAN Registry: already wired to real DB (listBatteries, search/filter)
- [x] Battery Detail: already wired to real DB (telemetry, SOH, history)
- [x] Marketplace: already wired to real DB (listings, create/edit/delete)
- [x] Telemetry: already wired to real MQTT/DB + live socket stream
- [x] AI SOH: already wired to real prediction endpoint + DB
- [x] Compliance: already wired to real EPR/regulatory DB data
- [x] Alerts: already wired to real DB alerts
- [x] Warranty: already wired to real DB warranty records
- [x] Documents: already wired to real S3+DB document storage
- [x] Logistics: already wired to real DB shipment tracking
- [x] Service History: already wired to real DB service records
- [x] Data Integration: real MQTT connection status via mqtt tRPC router

## Compliance & Legal: GDPR Article 13
- [x] Add consent_logs table to drizzle schema and push migration
- [x] Build /privacy page with GDPR Article 13 required content (data controller, retention, rights, contact)
- [x] Add consent.log tRPC procedure (server-side timestamped consent record with IP hash + user agent)
- [x] Wire consent logging into CookieConsent component on accept/reject
- [x] Add "Manage Cookies" + Privacy Policy links to footer in Home.tsx and LaunchingSoon.tsx
- [x] Add Privacy + Cookies links to PlatformLayout sidebar footer
- [x] Register /privacy route in App.tsx

## Legal: Terms of Service page
- [x] Build /terms page with platform ToS (usage, liability, data ownership, IP, governing law, 13 sections)
- [x] Register /terms route in App.tsx
- [x] Links from footer "Terms of Service" spans already point to /terms

## Data: Seed database with demo data
- [x] Ran seed.mjs — DB now has 558 batteries, 6035 telemetry readings, 170 marketplace listings, 15 users

## Phase 42: Authentication Hardening & User Account Management
- [ ] Forgot Password flow — generate time-limited reset token, send reset email via SMTP/SendGrid
- [ ] Reset Password page — validate token, accept new password, invalidate token after use
- [ ] Email verification on registration — send verification link, block login until verified
- [ ] User Profile page — update display name, email, password, avatar
- [ ] Session management UI — list active sessions (device, IP, last seen), revoke individual sessions
- [ ] Concurrent session tracking — store session metadata in DB (device, IP, user_agent, created_at)
- [ ] Role-based frontend guards — conditionally render nav items, buttons, and routes based on ctx.user.role
- [ ] Write vitest tests for reset token, email verification, session management

## Phase 43: Battery Registry — Full CRUD & Battery Passport
- [ ] Battery registration form — create new battery with manufacturer, chemistry, capacity, voltage, cell origin, serial number, model number
- [ ] Auto-BPAN generation on form submit — derive from chemistry + origin + timestamp
- [ ] Battery detail page — full lifecycle timeline, telemetry summary, SOH history, service records, documents
- [ ] QR code generation — render scannable QR per BPAN, downloadable as PNG/SVG
- [ ] NFC tag payload generation — NDEF record with BPAN URL for NFC-enabled devices
- [ ] Battery edit form — update status, notes, owner, location
- [ ] Battery archive / decommission flow — mark as End of Life, trigger EPR reporting
- [ ] Bulk CSV import — upload CSV with battery rows, validate, auto-assign BPANs, preview before commit
- [ ] Battery search and filter — by chemistry, status, SOH range, manufacturer, date range
- [ ] Write vitest tests for BPAN generation, battery CRUD, QR payload

## Phase 44: Marketplace — Full Transaction Flow
- [ ] Listing creation form — post battery for sale with SOH, price, currency, photos, description, minimum SOH guarantee
- [ ] Listing edit and delete — seller can update or remove their listing
- [ ] Listing detail page — full battery passport preview, seller info, price history, contact button
- [ ] Buyer interest / offer flow — express interest, send offer price, seller accepts/rejects
- [ ] Transaction record — create transaction on acceptance, track payment status, delivery status
- [ ] Seller and buyer profiles — reputation score, transaction history, verified badge
- [ ] Marketplace search and filter — by chemistry, SOH range, price range, location, listing type (spot/auction/tender)
- [ ] Saved searches and watchlist — notify buyer when matching listing appears
- [ ] Marketplace analytics — volume, revenue, average SOH, take rate, top sellers
- [ ] Write vitest tests for listing CRUD, offer flow, transaction creation

## Phase 45: AI SOH Prediction — Real Inference Engine
- [ ] Design inference API contract — input: voltage array, temperature array, cycle count, chemistry; output: SOH %, RUL cycles, confidence interval
- [ ] Build tRPC procedure soh.predict — calls LLM with structured prompt + battery telemetry context
- [ ] Build SOH prediction UI — submit telemetry snapshot, show prediction result with confidence bar
- [ ] SHAP-style explainability panel — show which features drove the prediction (voltage degradation, temperature stress, cycle count)
- [ ] Triage routing output — map SOH to one of: Direct Reuse (>80%), Module Repurposing (60–80%), Material Recycling (<60%)
- [ ] Prediction history per battery — store all predictions with timestamps in soh_predictions table
- [ ] Batch prediction — run SOH prediction for all batteries in fleet, export results as CSV
- [ ] Model accuracy tracking — compare predicted vs actual SOH when ground truth is available
- [ ] Write vitest tests for soh.predict procedure, triage routing logic, accuracy tracking

## Phase 46: EPR Compliance — Report Generation & Jurisdiction Rules
- [ ] Jurisdiction rule engine — encode thresholds and requirements for EU, IN, CN, US, UK, TH, ID
- [ ] EU Battery Regulation compliance checker — validate carbon footprint class, recycled content %, due diligence
- [ ] India BWMR compliance checker — validate CPCB registration, EPR targets, collection efficiency
- [ ] EPR compliance report generation — PDF export of declaration per jurisdiction per period
- [ ] Compliance period management — define reporting periods (quarterly/annual), track submission status
- [ ] Submission workflow — mark period as submitted, attach proof document, record submission date
- [ ] Compliance deadline reminders — alert 30/7/1 days before deadline
- [ ] Government regulator portal view — read-only compliance dashboard for regulator role
- [ ] Write vitest tests for rule engine, report generation, deadline logic

## Phase 47: Logistics & Triage Workflow
- [ ] Triage intake form — receive battery, record condition, assign triage path
- [ ] Triage workflow board — Kanban-style view: Received → Testing → Classified → Routed
- [ ] Logistics shipment creation — create pickup request with hazmat manifest, carrier, SLA
- [ ] Carrier integration stubs — API contracts for DHL, FedEx, local logistics partners
- [ ] Chain-of-custody record — immutable log of every custody transfer with timestamp and actor
- [ ] GPS tracking simulation — show shipment location on map with timeline
- [ ] SLA monitoring — flag shipments breaching 24/48-hour SLA with escalation alert
- [ ] Logistics partner management — register carriers, set SLAs, track performance
- [ ] Write vitest tests for triage workflow, shipment creation, SLA monitoring

## Phase 48: Alerts & Notifications — Real-Time Rules Engine
- [ ] Alert rule configuration UI — define threshold rules (SOH < X%, temperature > Y°C, cycle count > Z)
- [ ] Rule engine — evaluate incoming telemetry against all active rules, fire alerts on breach
- [ ] Notification delivery — send email notification when alert fires (SMTP/SendGrid)
- [ ] In-app notification bell — real-time badge count, dropdown with unread alerts
- [ ] Alert acknowledgement — mark alert as acknowledged, add resolution note
- [ ] Alert escalation — re-notify if unacknowledged after configurable timeout
- [ ] Alert history — full log with filter by type, severity, battery, date range
- [ ] Write vitest tests for rule engine, alert creation, notification dispatch

## Phase 49: Telemetry Pipeline — MQTT→DB Write Handler
- [x] MQTT→DB write handler — persist every incoming MQTT message to telemetry_readings table
- [ ] Device provisioning UI — register IoT device/gateway, associate with BPAN, generate device credentials
- [x] REST telemetry ingest endpoint — POST /api/v1/batteries/:bpan/telemetry for non-MQTT sources (SCADA, fleet software)
- [x] Telemetry validation — reject malformed payloads, log validation errors
- [ ] Offline buffering strategy — document edge device buffering pattern, test replay on reconnect
- [x] Battery telemetry simulator — auto-starts on Socket.io subscribe, publishes realistic readings every 2s
- [ ] Non-EV battery adapters — Modbus/RS-485 bridge spec for industrial batteries, SMBus spec for consumer electronics
- [ ] Telemetry data retention policy — configurable rolling window (e.g., keep 90 days of raw readings)
- [x] Write vitest tests for REST ingest (14 tests passing)
- [x] Battery detail page — live telemetry charts (voltage, temperature, current, SOH), history table, Socket.io stream, thermal anomaly banner

## Phase 50: Documents & Warranty — Full Workflow
- [ ] Document upload UI — drag-and-drop file upload, associate with battery BPAN or compliance period
- [ ] Document storage — upload to S3, store metadata (filename, type, size, uploader, date) in documents table
- [ ] Document viewer — inline PDF/image preview, download button
- [ ] Role-based document access — OEM sees own battery docs, recycler sees intake docs, admin sees all
- [ ] Warranty claim submission — form to initiate claim with issue description, photos, invoice
- [ ] Claim tracking — status board (Submitted → Under Review → Approved/Rejected → Resolved)
- [ ] Warranty expiry alerts — notify owner 30/7 days before warranty expiry
- [ ] Warranty impact on marketplace — flag batteries with active warranty as premium listings
- [ ] Write vitest tests for document upload, warranty claim flow, expiry alerts

## Phase 51: LaunchingSoon Gate — Bypass & Direct Login
- [ ] Remove or disable LaunchingSoon gate so users land directly on /login
- [ ] Optionally convert LaunchingSoon to a marketing landing page at /coming-soon (separate route)
- [ ] Ensure /login and /register are the default unauthenticated entry points

## Phase 52: SEO & Social Sharing Completeness
- [ ] Generate og:image social card (1200×630 px) with logo, tagline, and brand colors
- [ ] Add og:image meta tag to index.html
- [ ] Add canonical link tags to all inner pages (not just homepage)
- [ ] Add FAQPage JSON-LD schema to CirculWiki for Google rich snippets
- [ ] Add BreadcrumbList schema to all inner pages

## Phase 53: PWA & Offline Support
- [ ] Build service worker — cache app shell, static assets, and last-visited pages
- [ ] Register service worker in main.tsx
- [ ] Add offline fallback page shown when network is unavailable
- [ ] Test PWA install prompt on Chrome (desktop and Android)
- [ ] Test Apple Touch Icon and manifest on real iOS device
- [ ] Achieve Lighthouse PWA score ≥ 90

## Phase 54: Admin Panel — Full Operational UI
- [ ] Admin system health dashboard — DB size, active connections, MQTT status, queue depth, error rate
- [ ] Admin audit log viewer — full audit trail with filter by user, action, resource, date range
- [ ] Admin security events — login failures, role changes, data exports, suspicious activity
- [ ] Admin data export — export any table as CSV for compliance audits
- [ ] Admin platform settings — feature flags, maintenance mode toggle, rate limit configuration
- [ ] Admin seed / reset demo data — one-click re-seed for demo environments
- [ ] Write vitest tests for admin system health, audit log, security events

## Phase 49 (Active): Telemetry Pipeline — MQTT→DB + Simulator + Battery Detail Page
- [ ] Audit current MQTT subscriber, telemetry schema, and battery detail page
- [ ] Wire MQTT→DB write handler — persist every incoming MQTT message to telemetry_readings table
- [ ] Build REST telemetry ingest endpoint — POST /api/v1/telemetry for non-MQTT sources
- [ ] Build battery telemetry simulator — publish realistic voltage/temperature/current/SoC readings every 2s
- [ ] Add simulator controls to Data Integration page (start/stop per BPAN, speed multiplier)
- [ ] Build battery detail page — full lifecycle view with live telemetry charts
- [ ] Live voltage, temperature, current, SoC charts (rolling 60-point window via Socket.io)
- [ ] Telemetry history table — paginated list of all readings with timestamps
- [ ] Battery metadata panel — BPAN, chemistry, capacity, manufacturer, status, SOH badge
- [ ] Add /battery/:bpan route to App.tsx and link from BpanRegistry table rows
- [ ] Write vitest tests for MQTT→DB handler, REST ingest, simulator logic
- [x] TypeScript: 0 errors, 363 tests passing total

## Phase 43 (COMPLETED): Battery Registration Form
- [x] Audit existing BpanRegister page and BPAN generation logic
- [x] Enhance registration form with guided 4-step wizard (Manufacturer → Specifications → Instance → Sustainability)
- [x] Auto-generate BPAN on form submission using existing BPAN engine
- [x] "Register New Battery" button already exists on BpanRegistry page header
- [x] Success state with generated BPAN, next-step links (View Passport, Register Another, Back to Registry)
- [x] Live BPAN preview updates as user fills in fields

## Phase 43b (COMPLETED): Device lastSeen Heartbeat
- [x] Add updateDeviceLastSeen and updateDeviceLastSeenByBpan DB helpers
- [x] Wire MQTT subscriber to call updateDeviceLastSeenByBpan on every incoming message (fire-and-forget)
- [x] Wire REST ingest endpoint to call updateDeviceLastSeenByBpan on every POST
- [x] DeviceProvisioning page shows relative time for lastSeen ("Just now", "2 min ago", etc.)
- [x] 10 vitest tests for device provisioning + lastSeen (all passing, 293 total)

## Phase 49b (COMPLETED): Device Provisioning UI
- [x] iot_devices table created in DB (raw SQL, drizzle schema synced)
- [x] 10 DB helpers: insert, list, getById, getByDeviceId, getByMqttUsername, update, updateLastSeen, updateLastSeenByBpan, delete, getStats
- [x] tRPC device router: register, list, get, update, regenerateCredentials, delete, stats
- [x] DeviceProvisioning.tsx page: register form, device table, credential modal, edit modal, integration guide
- [x] Route /device-provisioning wired in App.tsx with PlatformLayout
- [x] Sidebar nav item added under INTEGRATIONS
- [x] TypeScript: 0 errors

## Phase 44 (COMPLETED): Marketplace Listing Creation
- [x] Audit existing marketplace schema, DB helpers, tRPC procedures, and page
- [x] Add listing_photos table and enhance marketplace_listings with condition, location, photoCount, primaryPhotoUrl
- [x] Add DB helpers: getListingById, listUserListings, updateListing, withdrawListing, insertListingPhoto, getListingPhotos, deleteListingPhoto, listUserBatteries
- [x] Add tRPC procedures: marketplace.uploadPhoto, marketplace.getPhotos, marketplace.deletePhoto, marketplace.getById, marketplace.myListings, marketplace.myBatteries, marketplace.update, marketplace.withdraw
- [x] Photo upload via S3 storagePut with max 6 photos per listing
- [x] Build MarketplaceCreate.tsx — 4-section guided form (Battery Selection, Condition & Pricing, Photos, Description & Submit)
- [x] Wire /marketplace/create route in App.tsx
- [x] Replace old Create Listing dialog with "List Battery for Sale" button linking to /marketplace/create
- [x] Add Browse / My Listings tabs to Marketplace page with withdraw action
- [x] Write 18 vitest tests for marketplace listing CRUD (all passing)
- [x] TypeScript: 0 errors, 311 tests passing total

## Phase 46 (COMPLETED): EPR Compliance PDF Export
- [x] Audit existing PDF generator (pdfGenerator.ts), EPR compliance page, and data structures
- [x] Build EPR compliance report HTML template — 3 jurisdictions (India CPCB, EU Battery Reg, Generic) with battery inventory, EPR tokens, yield data, mineral recovery, regulatory fields
- [x] Add tRPC procedure: pdf.eprComplianceReport (jurisdiction, year, quarter, org details) → S3 URL
- [x] Add tRPC procedure: pdf.batteryComplianceCert (bpan) → per-battery compliance certificate PDF → S3 URL
- [x] Wire "Export Report" dialog on EprCompliance page with jurisdiction selector, period picker, organization details form, and report preview
- [x] Wire "Compliance Cert" button on BpanDetail page (opens cert PDF in new tab)
- [x] Store PDF metadata in documents table (compliance_report / battery_certificate types)
- [x] Write 8 vitest tests for EPR PDF generation (all passing)
- [x] TypeScript: 0 errors, 319 tests passing total

## Phase 49 (COMPLETED): Full End-to-End Telemetry Pipeline
- [x] Audit MQTT subscriber, telemetry DB helpers, simulator, and battery detail page
- [x] Harden MQTT→DB write handler: validate payload fields, persist all columns, broadcast via Socket.io
- [x] Device lastSeen heartbeat: update iot_devices.lastSeen on every MQTT message
- [x] Physics-based battery simulator (server/batterySimulator.ts): realistic voltage/temperature/current curves per chemistry (NMC/LFP/NCA/LCO/LMO/LEAD_ACID)
- [x] Degradation model: SOH decreases with cycles, capacity fade, internal resistance rise
- [x] Anomaly injection: occasional thermal spikes, voltage sag, high current events for demo realism
- [x] Per-battery simulator state: each battery has independent SoC, cycle count, temperature, current
- [x] Rewrite telemetrySocket.ts to use physics-based simulator
- [x] Demo mode page at /demo: one-click start/stop all simulators, live per-battery stats grid, readings/min rate, anomaly count
- [x] Sidebar nav item (Play icon) under INTEGRATIONS
- [x] tRPC procedures: mqtt.startDemo, mqtt.stopDemo, mqtt.demoStatus
- [x] Write 16 vitest tests for simulator physics and lifecycle (all passing)
- [x] TypeScript: 0 errors, 335 tests passing total

## Phase 50 (COMPLETED): Gateway Firmware & Modbus Adapter Field Guide
- [x] ESP32/Arduino CAN bus gateway firmware (gateway/esp32-can/circul_air_can_gateway.ino) — CAN bus read, MQTT publish, OTA update, watchdog, TLS
- [x] Raspberry Pi Modbus RS-485 gateway agent (gateway/rpi-modbus/circul_air_modbus_gateway.py) — register maps for Pylontech/BYD/CATL/Victron, offline buffer, systemd service
- [x] Python host-system agent (gateway/python-agent/circul_air_host_agent.py) — Modbus TCP/RTU, SNMP, REST API, CSV, zero new hardware
- [x] Lead-acid inference agent (gateway/lead-acid/circul_air_lead_acid_agent.py) — voltage clamp + shunt, Peukert's law, Ah counting, temperature correction
- [x] Gateway Docs page at /gateway-docs — interactive battery type selector, step-by-step setup guide, credential auto-fill from registered devices, payload schema reference
- [x] Sidebar nav item (BookOpen) under INTEGRATIONS
- [x] 18 vitest tests for physics model validation (all passing)
- [x] TypeScript: 0 errors, 353 tests passing total

## Phase 51 (COMPLETED): Remove LaunchingSoon Gate
- [x] Audit LaunchingSoon gate mechanism in App.tsx and LaunchingSoon.tsx
- [x] Remove early-access password gate — route / directly to /login
- [x] Keep LaunchingSoon page accessible at /coming-soon for marketing use

## Phase 44b (COMPLETED): Marketplace Listing Detail Page
- [x] Build MarketplaceDetail.tsx at /marketplace/:id with photo gallery, seller info, condition report
- [x] Add Make Offer dialog with offer amount, currency, message fields
- [x] Add tRPC procedure: marketplace.makeOffer (listingId, amount, currency, message)
- [x] Add marketplace_offers table to schema
- [x] Link listing cards on Marketplace page to /marketplace/:id
- [x] Wire /marketplace/:id route in App.tsx
- [x] Write 10 vitest tests for offer submission and detail page (all passing)
- [x] TypeScript: 0 errors, 363 tests passing total

## Phase 52 (COMPLETED): Audit unguarded protectedProcedure calls on public routes
- [x] Scan all React contexts and providers for tRPC queries that fire unconditionally
- [x] Fix TelemetrySocketContext — disable socket connection when unauthenticated
- [x] Verify no other context/provider fires a protectedProcedure on /login or /register
- [x] TypeScript: 0 errors

## Phase 53 (COMPLETED): Forgot Password / Reset Flow
- [x] Add password_reset_tokens table to drizzle schema (token, userId, expiresAt, usedAt)
- [x] Create tables via SQL migration (drizzle-kit reports no diff for already-tracked tables)
- [x] Add DB helpers: createPasswordResetToken, getPasswordResetToken, markPasswordResetTokenUsed, updateUserPassword
- [x] Add REST routes: POST /api/auth/forgot-password, POST /api/auth/reset-password, GET /api/auth/reset-password/validate
- [x] Build ForgotPassword.tsx page at /forgot-password with email input form and success state
- [x] Build ResetPassword.tsx page at /reset-password?token=... with token validation, password strength meter, confirm fields
- [x] Add "Forgot password?" link on Login.tsx
- [x] Wire /forgot-password and /reset-password routes in App.tsx
- [x] TypeScript: 0 errors

## Phase 54 (COMPLETED): Session Expiry Toast
- [x] Detect mid-session 401 from auth.me (not initial page load 401) via hadActiveSession flag
- [x] Show graceful "Session expired" toast with description before redirect (sonner toast)
- [x] Distinguish between initial-load unauthenticated (silent) vs mid-session expiry (toast)
- [x] TypeScript: 0 errors

## Phase 55 (COMPLETED): Resend Email Integration
- [x] Install resend npm package (v6.10.0)
- [x] Add RESEND_API_KEY secret via webdev_request_secrets
- [x] Add RESEND_FROM_EMAIL secret (sender address)
- [x] Add resendApiKey and resendFromEmail to ENV in server/_core/env.ts
- [x] Build server/email.ts helper with sendPasswordResetEmail() function
- [x] Create branded dark-themed HTML email template with plain-text fallback
- [x] Wire sendPasswordResetEmail() into POST /api/auth/forgot-password
- [x] Graceful fallback: Resend failure logs a warning but still returns 200
- [x] Owner notification kept as secondary audit trail
- [x] Write 7 vitest tests for email helper (all mocked, all passing)
- [x] TypeScript: 0 errors, 385 tests passing across 26 test files

## Phase 56 (COMPLETED): Production Readiness Audit & Documentation
- [x] Full codebase audit: security, trust proxy, rate limiter, CSP, unguarded procedures
- [x] Fix trust proxy: added app.set("trust proxy", 1) before security middleware in index.ts
- [x] Enable CSP in production mode (permissive policy allowing CDN assets, inline scripts, wss)
- [x] Write README.md: architecture, tech stack, quick start, env vars, DB schema, auth, API ref, testing, deployment, compliance, i18n
- [x] Write DEPLOYMENT.md: pre-deployment checklist, secrets config, DNS setup, publish steps, rollback, ops runbook, monitoring, DB ops
- [x] Write API.md: all 100+ tRPC procedures documented with auth levels, REST API v1, MCP server, WebSocket, MQTT, error codes
- [x] TypeScript: 0 errors, 385 tests passing across 26 test files

## Phase 57 (COMPLETED): Resend DNS Verification Guide
- [x] Fetched Resend domain verification documentation (SPF, DKIM, DMARC record formats)
- [x] Produced clear DNS verification instructions for circulair.energy (delivered in result message)
- [x] Documented how to verify domain status in Resend dashboard

## Phase 58 (COMPLETED): Alert Rule Configuration UI
- [x] Add alert_rules table to drizzle schema (metric, operator, threshold, chemistry, bpan, enabled, severity)
- [x] Create table directly via SQL (drizzle-kit skips already-tracked tables)
- [x] Add alertRules import and DB helpers to db.ts (createAlertRule, listAlertRules, getAlertRuleById, updateAlertRule, deleteAlertRule, toggleAlertRule, getActiveRulesForBpan, evaluateAlertRules)
- [x] Add alertRules tRPC router with list, getById, create, update, toggle, delete, getDefaults procedures
- [x] Build AlertRules.tsx page at /alert-rules with full CRUD table, create/edit dialog, enable/disable toggle
- [x] Add chemistry defaults panel with one-click pre-fill for NMC, LFP, NCA, LCO, LMO, LEAD_ACID
- [x] Add stats row (total, active, disabled, critical counts)
- [x] Add info banner explaining rule priority and legacy threshold removal
- [x] Add AlertRules route to App.tsx at /alert-rules
- [x] Add "Alert Rules" nav item to PlatformLayout.tsx sidebar (REPORTING section)
- [x] Replace hard-coded 51°C threshold in mqttSubscriber.ts with dynamic rule evaluation
- [x] Extend alertCooldown.ts to support dynamic rule keys (rule_42 etc.) with string union type
- [x] Write 19 vitest tests (evaluateAlertRules, alertCooldown dynamic keys, scope priority)
- [x] TypeScript: 0 errors, 404 tests passing across 27 test files
