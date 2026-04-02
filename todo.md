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
