# Design Guidelines: Inspectly (Real Estate Inspection Marketplace)

## Design Approach: Utility-First SaaS System

**Selected Framework:** Modern SaaS Dashboard Pattern (inspired by Linear, Stripe Dashboard, Notion)

**Rationale:** Real estate investors are efficiency-driven professionals managing data-heavy workflows. They prioritize speed, clarity, and trust over visual flair. The design must reduce cognitive load while handling complex information architecture.

---

## Core Design Principles

1. **Clarity Over Decoration** - Every element serves a functional purpose
2. **Speed-Optimized Layouts** - Minimize steps from landing to action
3. **Data Hierarchy** - Information density without overwhelming
4. **Trust Signals** - Professional, secure, reliable aesthetics

---

## Typography System

**Primary Font:** Inter or IBM Plex Sans (via Google Fonts CDN)
**Secondary Font:** (optional) JetBrains Mono for numerical data/credits

**Hierarchy:**
- H1: 3xl-4xl, font-semibold (page titles)
- H2: 2xl, font-semibold (section headers)
- H3: xl, font-medium (card titles)
- Body: base, font-normal
- Small/Meta: sm, font-normal
- Data/Numbers: lg-2xl, font-bold (credits, stats)

---

## Layout System

**Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16
- Standard padding: p-6 or p-8
- Card spacing: gap-6
- Section margins: mb-8 or mb-12

**Grid Strategy:**
- Dashboard: Two-column sidebar layout (240px fixed sidebar + fluid content)
- Upload zone: Single-column centered (max-w-3xl)
- Report listings: Grid of 2-3 columns on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Search results: Single-column list view with metadata

---

## Component Library

### Navigation
- **Persistent Left Sidebar:** Logo at top, main navigation items (Upload, Browse, My Reports, Credits), user profile at bottom
- **Top Bar:** Search input (prominent, always visible), notification bell, credit balance display

### Dashboard Cards
- **Upload Zone:** Large drag-drop area (min-h-64), dashed border, prominent icon, "Drop PDF or Click to Browse" text
- **Credit Balance Widget:** Large number display, "+/- transaction history" link, progress bar if applicable
- **Recent Activity Feed:** List of uploads/downloads with timestamps and credit changes

### Data Display
- **Report Cards:** Thumbnail preview, address as title, inspection date, defect count badges, download/view CTA
- **AI Analysis Panel:** Clean white card with structured sections (Negotiation Points as numbered list, Estimated Credits as highlight box)
- **Search Results:** Table-like rows with property address, date, preview snippet, credit cost, download button

### Forms
- **Search Bar:** Full-width on mobile, max-w-xl centered on desktop, rounded-lg, shadow-sm
- **Upload Flow:** Multi-step indicator, auto-extraction progress bar, confirmation summary

### Buttons
- **Primary CTA:** Solid fill, rounded-lg, px-6 py-3, font-medium
- **Secondary:** Outline variant with same size
- **Icon Buttons:** Square or circular, p-2, for actions like download/share

### Overlays
- **Upload Success Modal:** Checkmark icon, auto-extracted data preview, "View AI Analysis" CTA
- **Report Preview:** Full-screen overlay with PDF viewer, redacted PII highlighted, download option

---

## Iconography

**Library:** Heroicons (via CDN)
**Usage:**
- Upload: Cloud arrow up
- Download: Arrow down tray
- Credits: Currency dollar / Coins
- AI Analysis: Sparkles / Light bulb
- Search: Magnifying glass
- Reports: Document text

---

## Images

**Hero Section:** Use a clean, professional image of modern real estate (architectural blueprint overlay or clean property photo), max-h-[500px], with subtle gradient overlay for text legibility

**Placement:**
- Landing page hero: Full-width background image with centered value proposition text
- Empty states: Small illustrative icons (use placeholder comments for custom illustrations like "<!-- CUSTOM ILLUSTRATION: Empty folder with magnifying glass -->"

---

## Responsive Behavior

**Mobile (< 768px):**
- Sidebar collapses to bottom navigation bar
- Single-column card grids
- Upload zone reduces to min-h-48

**Desktop (≥ 1024px):**
- Fixed sidebar navigation
- Multi-column report grids
- Expanded AI analysis side panel

---

## Animation: Minimal & Purposeful

- Upload progress: Linear progress bar animation only
- Card hover: Subtle lift (translate-y-1) + shadow increase
- Page transitions: None (instant for speed)
- Success states: Simple checkmark fade-in

---

## Key Page Structures

**Landing Page:**
1. Hero with image background (value proposition + "Get Started" CTA)
2. How It Works (3-step visual flow)
3. Credit System Explainer (simple infographic)
4. CTA section

**Dashboard:**
- Sidebar + Upload zone (prominent, above fold)
- Credit balance widget
- Recent reports grid below

**Browse/Search:**
- Prominent search bar at top
- Filters sidebar (left, collapsible on mobile)
- Report cards grid (main area)
- "Request Report" CTA on zero results

**Report Detail:**
- Property metadata header
- AI analysis panel (right sidebar on desktop)
- PDF viewer (main content, with redaction highlights)
- Download/Share actions