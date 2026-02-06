# Inspectly - Real Estate Inspection Report Marketplace

## Overview
Inspectly is a data-first marketplace for real estate investors. It transforms static PDF inspection reports into actionable intelligence using AI, providing negotiation strategies and estimated credit requests for property deals. Key capabilities include AI-powered data extraction, an AI Deal Coach for negotiation battlecards, a Karma Credit System for report access, a Bounty System for requesting specific reports, and a Digital Vault for property portfolio tracking.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Stack Summary
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui. Wouter for routing, TanStack Query v5 for state management.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.
- **Authentication**: Email/password with bcrypt (10 rounds), express-session, connect-pg-simple.
- **AI**: OpenAI GPT-4o via Replit AI Integrations.
- **PDF Processing**: pdf-parse v2 (class-based API) for text extraction, jsPDF for client-side PDF generation.
- **Mapping**: Leaflet for Digital Vault map view.

### Environment Variables
- DATABASE_URL: PostgreSQL connection string
- SESSION_SECRET: Express session signing key. FALLS BACK to hardcoded "inspectswap-secret-key" if env var not set (server/auth.ts line 42).
- AI_INTEGRATIONS_OPENAI_API_KEY: OpenAI API key
- AI_INTEGRATIONS_OPENAI_BASE_URL: OpenAI base URL

### Core Features and Design Decisions
- **AI Analysis Pipeline**: PDF uploads are processed by Multer, hashed, and text-extracted via pdf-parse v2 class API (new PDFParse, getText, destroy). Truncated text (30k chars max) is sent to OpenAI GPT-4o with BATTLECARD_SYSTEM_PROMPT defining JSON schema for AnalysisResult. The parsed JSON is normalized with fallback defaults and stored in analysis_json column. A hardcoded fallback analysis (2 generic defects, $3k credit) is returned if the AI call fails entirely.
- **Credit Economy**: Append-only ledger in credit_transactions table. Balance = SUM(amount). Signup bonus: 50, Upload reward: 10, Download cost: 5, Min bounty stake: 5. Constants in CREDIT_VALUES (shared/schema.ts).
- **Authentication System**: Email/password with bcrypt (10 rounds) and PostgreSQL session storage. Session secret falls back to hardcoded string. isAuthenticated middleware protects all non-auth API routes.
- **Digital Vault**: Property portfolio tracker with list/map views, CRUD, and report linking via property_reports join table.
- **UI/UX**: shadcn/ui with dark/light mode. BattlecardView has 5 tabs: Breakdown, Scripts, Tactics, Alternatives, Summary.

### Key Architectural Patterns
- **Monorepo Structure**: Frontend, backend, and shared code in a single repository.
- **Data-first Approach**: Transforms raw inspection data into structured negotiation intelligence.
- **API-driven Backend**: RESTful JSON APIs under /api/* in server/routes.ts.
- **Drizzle ORM**: Type-safe schema definitions and query building.
- **TanStack Query**: staleTime Infinity, no retry, no refetchOnFocus. Manual cache invalidation via queryKey.

## Project File Map

### Files You Must NOT Modify
- server/vite.ts, server/static.ts, server/index.ts, drizzle.config.ts
- package.json (use packager tool instead)
- server/replit_integrations/ (auto-managed by Replit)

### Frontend (client/src/)
- App.tsx: Root component with auth gating, SidebarProvider layout, routing
- components/app-sidebar.tsx: Sidebar nav with credit balance display
- components/battlecard-view.tsx: Full battlecard renderer (5 tabs)
- components/theme-provider.tsx: Dark/light mode context
- hooks/use-auth.ts: Auth hook with login, register, logout, user state (staleTime 5min)
- lib/battlecard.ts: AIAnalysis type, text generation, PDF export via jsPDF
- lib/queryClient.ts: TanStack Query config, apiRequest helper
- pages/landing.tsx: Public landing page
- pages/auth.tsx: Login/Register form
- pages/dashboard.tsx: Upload zone, stats, inline AI analysis, auto-vault
- pages/browse.tsx: Report marketplace with search and bounty creation
- pages/my-reports.tsx: Uploaded/downloaded reports with battlecard dialog
- pages/vault.tsx: Digital Vault with list/map views
- pages/credits.tsx: Credit balance and transaction history
- pages/bounties.tsx: Bounty management

### Backend (server/)
- routes.ts: ALL API endpoints, AI analysis logic, OpenAI prompt
- storage.ts: IStorage interface + DatabaseStorage (all DB operations)
- auth.ts: Session setup, register/login/logout routes, isAuthenticated middleware
- db.ts: Drizzle ORM and pg Pool initialization

### Shared (shared/)
- schema.ts: Drizzle tables (reports, credit_transactions, bounties, downloads, properties, property_reports), Zod schemas, types, CREDIT_VALUES
- models/auth.ts: Users + Sessions table definitions

## Database Schema

### users (shared/models/auth.ts)
- id: varchar PK, gen_random_uuid() -- UUID string NOT serial
- email: varchar UNIQUE NOT NULL -- stored lowercase
- password_hash: text NOT NULL -- bcrypt 10 rounds
- first_name, last_name: varchar nullable
- profile_image_url: varchar nullable (unused)
- created_at, updated_at: timestamp

CRITICAL: User IDs are VARCHAR UUIDs. All FKs use varchar type.

### sessions (shared/models/auth.ts)
- sid: varchar PK, sess: jsonb NOT NULL, expire: timestamp NOT NULL (indexed)
- Managed by connect-pg-simple with createTableIfMissing: true

### reports
- id: serial PK
- user_id: varchar NOT NULL (no DB FK constraint)
- property_address: text NOT NULL (derived from filename, NOT from PDF content)
- inspection_date: timestamp nullable (ALWAYS null, never set during upload)
- file_hash: text NOT NULL UNIQUE (SHA-256, global dedup across all users)
- file_name: text, file_size: integer
- major_defects: jsonb (string[]), summary_findings: text, negotiation_points: jsonb (string[])
- estimated_credit: integer (total dollar credit request)
- analysis_json: jsonb (FULL AnalysisResult battlecard object)
- is_redacted: boolean (ALWAYS hardcoded true on upload, no actual redaction)
- is_public: boolean (ALWAYS hardcoded true on upload)
- download_count: integer default 0 (incremented via raw SQL)
- created_at, updated_at: timestamp

SCHEMA BUG: reportsRelations (schema.ts lines 40-45) self-references reports instead of users. No runtime impact since relational API is unused.
Legacy data: Reports IDs 1-4 have null analysis_json (pre-fix). Must re-upload.

### credit_transactions
- id: serial PK, user_id: varchar, amount: integer (positive=earned, negative=spent)
- type: text (upload, download, bounty_stake, bounty_earned, signup_bonus)
- description: text nullable, report_id/bounty_id: integer nullable
- CRITICAL: Balance = SUM(amount). Append-only ledger. No cached balance.

### bounties
- id: serial PK, user_id: varchar, property_address: text
- staked_credits: integer default 5, status: text (open/fulfilled/cancelled)
- fulfilled_by_user_id: varchar, fulfilled_report_id: integer, fulfilled_at: timestamp

### downloads
- id: serial PK, user_id: varchar, report_id: integer, credit_spent: integer (always 5)

### properties (Digital Vault)
- id: serial PK, user_id: varchar, address: text
- city, state, zip_code, latitude, longitude: text nullable
- status: text (watching/offer_pending/under_contract/closed/passed)
- notes: text, purchase_price, offer_amount: integer, closing_date: timestamp

### property_reports (join table)
- id: serial PK, property_id: integer, report_id: integer
- Cascade delete in app code (storage.ts deleteProperty), NOT DB constraints

## Credit Economy Rules

### Constants (CREDIT_VALUES in shared/schema.ts)
SIGNUP_BONUS: 50, UPLOAD_REWARD: 10, DOWNLOAD_COST: 5, EARLY_UPLOAD_BONUS: 5 (not implemented), MIN_BOUNTY_STAKE: 5

### Transaction Flow
1. Registration: +50 signup_bonus (server/auth.ts)
2. Dashboard fallback: POST /api/signup-bonus awards bonus if user has zero transactions (safety net)
3. Upload: +10, type=upload
4. Download: -5, type=download. Guards: not own report, not already downloaded, balance >= 5
5. Bounty create: -N (min 5), type=bounty_stake
6. Bounty cancel: +N refund, type=bounty_stake (positive)
7. Bounty fulfill: uploader +N, type=bounty_earned. Auto-triggered during upload via ILIKE address match.

Balance = COALESCE(SUM(amount), 0). War Chest = Math.floor(balance / 5).

## Authentication Details

- Method: Email/password (NOT Replit Auth/OIDC)
- bcrypt 10 rounds, session in PostgreSQL via connect-pg-simple
- Cookie: connect.sid, HttpOnly, 30-day maxAge, secure in production
- Session secret fallback: hardcoded "inspectswap-secret-key"
- POST /api/auth/register: Zod validates, checks email dupe (case-insensitive), creates user, awards 50 credits
- POST /api/auth/login: Lookup by lowercase email, bcrypt compare
- POST /api/auth/logout: Destroys session, clears cookie
- GET /api/auth/user: Returns user (never passwordHash), 401 if no session
- Frontend hook: staleTime 5min, on login sets query data directly, on logout invalidates ALL queries
- Limitations: No password reset, no email verification, no rate limiting, no CSRF

## AI Analysis Pipeline

### PDF Processing
- pdf-parse v2 class API: new PDFParse({ data: new Uint8Array(buffer) }), getText(), destroy()
- Extraction failure fallback: placeholder text about failure
- Text truncated to 30,000 chars

### OpenAI Call
- Model: gpt-4o, response_format: json_object, max_tokens: 4096
- System prompt: BATTLECARD_SYSTEM_PROMPT with "ruthless real estate investor" persona and JSON schema

### AnalysisResult Type (analysis_json)
majorDefects (string[]), summaryFindings, negotiationPoints (string[]), estimatedCredit, defectBreakdown (DefectBreakdown[]), openingStatement, closingStatement, anchorAmount, walkawayThreshold, killShotSummary, psychologicalLeverage (string[]), creativeAlternatives (CreativeAlternative[]), calibratedQuestions (string[]), accusationAudit, walkawayScript, nibbleAsks (string[]), disclosureWarning, marketLeverageNotes.

DefectBreakdown: issue, severity (critical/major/moderate/monitor), estimatedRepairCost, estimatedRepairRange, creditRecommendation, anchorHighAmount, consequentialDamageRisk, remainingUsefulLife, repairVsCredit, sellerScript, collaborativeScript, nuclearScript, lenderImplication, codeComplianceNote.

### Fallback on AI Error
Hardcoded fallback: 2 generic defects, estimatedCredit 3000, anchorAmount 3500, walkawayThreshold 2000, generic scripts.

### Normalization
Missing arrays->[], strings->predefined text, numbers->0/computed. Severity enum validated. defectBreakdown auto-generated from majorDefects if empty.

## API Endpoints

All in server/routes.ts. All except auth require isAuthenticated.

### Dashboard
- GET /api/dashboard: creditBalance, recentReports (5), recentTransactions (10), stats
- POST /api/signup-bonus: Awards bonus if zero transactions

### Reports
- POST /api/reports/upload: Multipart (field "file"). Returns report, creditsEarned, analysis
- GET /api/reports: ?search= (ILIKE). Returns reports, total
- GET /api/my-reports: uploaded[], downloaded[]
- POST /api/reports/:id/download: Unlock (-5 credits). Idempotent for re-downloads/own
- GET /api/reports/:id/analysis: Battlecard JSON. Must be owner or downloaded
- DELETE /api/reports/:id: Owner only

### Credits
- GET /api/credits: balance, totalEarned, totalSpent, transactions

### Bounties
- GET /api/bounties: myBounties, openBounties (excludes own)
- POST /api/bounties: { propertyAddress, stakedCredits }
- DELETE /api/bounties/:id: Cancel (owner only), refunds credits

### Properties (Digital Vault)
- GET /api/properties, POST /api/properties, PATCH /api/properties/:id, DELETE /api/properties/:id
- POST /api/properties/:id/reports: Link report { reportId }

## Frontend Routing

Unauthenticated: LandingPage (catch-all), /auth (AuthPage)
Authenticated: / and /dashboard (Dashboard), /browse, /my-reports, /vault, /credits, /bounties, /* (NotFound)

Layout: SidebarProvider wrapping AppSidebar + main content with header (SidebarTrigger, ThemeToggle) and Router.

### Cache Invalidation
Upload: /api/dashboard, /api/reports, /api/properties
Download: /api/dashboard, /api/credits, /api/my-reports, /api/reports
Delete report: /api/my-reports, /api/dashboard
Bounty: /api/bounties, /api/dashboard
Property: /api/properties

## Storage Interface (server/storage.ts)

Key methods: getPublicReports (ILIKE, createdAt DESC), getReportByHash (dedup), incrementDownloadCount (raw SQL), getCreditBalance (SUM), getCreditStats (full scan, INEFFICIENT), getBountyByAddress (ILIKE), getOpenBounties (exclude user, stakedCredits DESC), deleteProperty (app-level cascade).

## Known Issues and Technical Debt

1. Legacy reports (IDs 1-4): null analysis_json. Must re-upload.
2. Schema bug: reportsRelations self-references reports instead of users.
3. Property address from filename only, not PDF content.
4. No file storage: PDF buffers not persisted.
5. Global duplicate: file_hash prevents same PDF by ANY user.
6. Fuzzy bounty matching: ILIKE wildcards may false-match.
7. No pagination: all list queries return ALL rows.
8. Inefficient credit stats: full in-memory scan.
9. Signup bonus double-guard in auth.ts and /api/signup-bonus.
10. No CSRF protection.
11. inspection_date always null.
12. is_redacted/is_public hardcoded true (routes.ts lines 395-396). No actual redaction.
13. Session secret hardcoded fallback.

## External Dependencies

- **PostgreSQL**: Primary database (Neon-backed).
- **OpenAI GPT-4o**: AI analysis and battlecard generation.
- **pdf-parse v2**: PDF text extraction.
- **jsPDF**: Client-side PDF generation.
- **Leaflet**: Interactive mapping for the Digital Vault.
- **bcrypt**: Password hashing.
- **express-session**: Session management for Node.js.
- **connect-pg-simple**: PostgreSQL store for express-session.
- **Multer**: Middleware for handling multipart/form-data, primarily for file uploads.
