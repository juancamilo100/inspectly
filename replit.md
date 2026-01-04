# InspectSwap - Real Estate Inspection Report Marketplace

## Overview

InspectSwap is a data-first marketplace for real estate investors to share and access property inspection reports. The platform transforms static PDF inspection reports into actionable intelligence through AI-powered analysis, providing negotiation strategies and estimated credit requests for property deals.

Core value propositions:
- **Smart Ingestion Engine**: Drag-and-drop PDF upload with AI extraction of property data, defects, and findings
- **AI Deal Coach**: Generates negotiation battlecards with top talking points and estimated credit requests
- **Karma Credit System**: Virtual currency earned by uploading reports and spent to access others' reports
- **Redaction Shield**: Auto-redacts personal information before public sharing
- **Bounty System**: Request reports for specific addresses with staked credits

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Style**: RESTful JSON APIs under `/api/*` prefix
- **File Uploads**: Multer middleware for PDF handling (50MB limit)
- **Authentication**: Replit Auth via OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines all tables
- **Key Tables**:
  - `reports`: Inspection reports with AI-extracted data
  - `credit_transactions`: Credit ledger for karma system
  - `bounties`: Report requests with staked credits
  - `downloads`: Track which users downloaded which reports
  - `users`/`sessions`: Authentication tables (required for Replit Auth)

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Model**: GPT-4o for report analysis
- **Features**: PDF content analysis, defect extraction, negotiation point generation

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (shadcn/ui)
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and query client
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database operations
│   └── replit_integrations/  # Auth, chat, image utilities
├── shared/              # Shared types and schema
│   ├── schema.ts        # Drizzle database schema
│   └── models/          # TypeScript models
└── migrations/          # Database migrations
```

### Key Design Patterns
- **Monorepo Structure**: Client and server in single repository with shared types
- **Type Safety**: Drizzle-zod generates Zod schemas from database tables
- **Path Aliases**: `@/` for client, `@shared/` for shared code
- **Credit Economy**: Upload = earn credits, Download = spend credits (configurable in `CREDIT_VALUES`)

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe query builder and schema management

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **Required Env Vars**: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### AI Services
- **OpenAI API**: Report analysis and negotiation generation
- **Required Env Vars**: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Frontend Libraries
- **TanStack Query**: Server state management with caching
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Icon library

### Development Tools
- **Vite**: Dev server and production bundler
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development