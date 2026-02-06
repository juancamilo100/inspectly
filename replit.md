# Inspectly - Real Estate Inspection Report Marketplace

## Overview
Inspectly is a data-first marketplace for real estate investors. It transforms static PDF inspection reports into actionable intelligence using AI, providing negotiation strategies and estimated credit requests for property deals. The platform features:

-   **Smart Ingestion Engine**: AI-powered extraction of property data, defects, and findings from PDF reports.
-   **AI Deal Coach**: Generates negotiation battlecards with talking points and estimated credit requests.
-   **Karma Credit System**: A virtual currency system where users earn credits by uploading reports and spend them to access others' reports.
-   **Bounty System**: Allows users to request reports for specific addresses by staking credits.
-   **Digital Vault**: A property portfolio tracker with map view and deal status pipeline.

The project aims to revolutionize how real estate investors leverage inspection data, offering significant market potential by providing unique, AI-driven insights for property transactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Stack Summary
-   **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui. Routing with Wouter, state management with TanStack Query v5 and React hooks.
-   **Backend**: Node.js, Express, TypeScript (ESM).
-   **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.
-   **Authentication**: Email/password using bcrypt, express-session, and connect-pg-simple.
-   **AI**: OpenAI GPT-4o via Replit AI Integrations.
-   **PDF Processing**: `pdf-parse` v2 for text extraction, `jsPDF` for client-side PDF generation.
-   **Mapping**: Leaflet for the Digital Vault's map view.

### UI/UX Decisions
-   **Design System**: Leverages `shadcn/ui` for a consistent and modern look.
-   **Theming**: Supports dark/light mode.
-   **Battlecard View**: Presents AI analysis in a multi-tabbed interface (Breakdown, Scripts, Tactics, Alternatives, Summary) for comprehensive insights.
-   **Property Tracker**: Digital Vault offers both list and map views for property portfolios.

### Technical Implementations
-   **Authentication**: Custom email/password authentication with bcrypt hashing and session management via PostgreSQL. User IDs are UUID v4 strings.
-   **PDF Upload & AI Analysis**:
    -   Users upload PDFs which are validated and hashed to prevent duplicates.
    -   `pdf-parse` extracts text, which is then truncated and sent to OpenAI's GPT-4o model.
    -   OpenAI generates a structured JSON `AnalysisResult` (battlecard) based on a detailed system prompt.
    -   The `AnalysisResult` is normalized and stored, with key fields also extracted for quick access.
    -   Upon successful upload, users earn credits, and the system checks for and fulfills matching bounties.
-   **Credit System**:
    -   An append-only ledger (`credit_transactions` table) tracks all credit movements (signup bonuses, uploads, downloads, bounties).
    -   User balance is always computed dynamically by summing transaction amounts.
    -   Key credit values: Signup Bonus (50), Upload Reward (10), Download Cost (5), Minimum Bounty Stake (5).
-   **Bounty System**: Users can create bounties for specific addresses. If a matching report is uploaded, the bounty is fulfilled, and credits are transferred.
-   **Digital Vault**: Allows users to track properties, link reports, and manage deal statuses. Includes geocoding for map visualization.

### System Design Choices
-   **Data-first approach**: Prioritizes the extraction and structuring of data from unstructured reports.
-   **Micro-transaction economy**: Encourages user engagement and content contribution through the Karma Credit System.
-   **Robust AI integration**: Uses `gpt-4o` with structured JSON output and comprehensive prompt engineering for reliable analysis.
-   **Scalable database design**: Uses PostgreSQL with Drizzle ORM, with careful consideration for credit balance calculation (append-only ledger).
-   **Frontend State Management**: TanStack Query is used for server state management, enabling efficient data fetching, caching, and invalidation.

## External Dependencies

-   **PostgreSQL**: Primary database, hosted via Neon on Replit.
-   **OpenAI GPT-4o**: AI model for PDF analysis and battlecard generation, integrated via Replit AI Integrations.
-   **`pdf-parse` (v2)**: Library for extracting text content from PDF files.
-   **`jsPDF`**: JavaScript library used client-side for generating PDF battlecards.
-   **Leaflet**: Open-source JavaScript library for interactive maps in the Digital Vault.
-   **`bcrypt`**: For hashing user passwords securely.
-   **`express-session`**: Middleware for managing user sessions.
-   **`connect-pg-simple`**: PostgreSQL-backed session store for Express.
-   **Multer**: Middleware for handling `multipart/form-data`, primarily for file uploads.