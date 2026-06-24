# RFP Analyzer Pro

A production-ready, full-stack web application that analyzes Request for Proposal (RFP) documents and generates comprehensive delivery insights across five modules: **Cost Estimation**, **Project Plan**, **Staffing Plan**, **Testing Strategy**, and **AI Comparison**.

---

## Quick Start

```bash
cd rfp-analyzer-pro
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

| Module | What it does |
|---|---|
| **Document Upload** | Drag-and-drop or file-picker upload for PDF, DOCX, TXT. Validates, extracts structured content, shows confidence score. |
| **Dashboard** | Real-time summary of all module outputs — KPI cards, cost-by-phase bar chart, staffing area chart, AI savings overview. |
| **Cost Estimation** | Detailed breakdown by phase, role, and category with interactive sliders for hourly rates, contingency, infrastructure, overhead, and more. Live recalculation on every change. |
| **Project Plan** | 7-phase Gantt-style timeline with expandable phase cards, milestone flags, deliverables, and risk list. |
| **Staffing Plan** | Role-level cards with allocation bars, ramp-up/ramp-down, stacked area headcount chart, and a summary table. |
| **Testing Strategy** | 9 test types with effort estimates, automation feasibility, radar coverage chart, phase distribution, entry/exit criteria, and quality targets. |
| **AI Comparison** | Side-by-side Traditional vs AI-Augmented scenario with 7 use cases, grouped bar chart, radar chart, recommendations, and limitations. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| UI Primitives | Radix UI |
| File Upload | react-dropzone |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              ← Root page — mounts AppLayout + active module
│   ├── layout.tsx            ← HTML shell, metadata, fonts
│   ├── globals.css           ← Global styles, scrollbar, range input
│   └── api/
│       ├── upload/route.ts   ← POST /api/upload — file ingestion + summary
│       ├── analyze/route.ts  ← POST /api/analyze — full analysis pipeline
│       └── recalculate/route.ts ← POST /api/recalculate — live cost updates
├── components/
│   ├── layout/AppLayout.tsx  ← Collapsible sidebar + top bar + animated routing
│   ├── modules/              ← One file per major module
│   │   ├── Dashboard.tsx
│   │   ├── DocumentUpload.tsx
│   │   ├── CostEstimation.tsx
│   │   ├── ProjectPlan.tsx
│   │   ├── StaffingPlan.tsx
│   │   ├── TestingStrategy.tsx
│   │   └── AIComparison.tsx
│   └── ui/index.tsx          ← Shared primitives: Card, Button, Badge,
│                                MetricCard, ProgressBar, DataTable, Alert…
├── lib/
│   ├── store.ts              ← Zustand global store
│   ├── utils.ts              ← Formatting helpers, color palettes
│   ├── parser.ts             ← Document text extraction + summary generation
│   ├── orchestrator.ts       ← Coordinates all engines for full analysis
│   └── engines/
│       ├── costEngine.ts     ← Cost calculation with editable assumptions
│       ├── planEngine.ts     ← Project phase + milestone generation
│       ├── staffingEngine.ts ← Team composition + weekly headcount data
│       ├── testingEngine.ts  ← QA strategy + effort estimation
│       └── aiEngine.ts       ← AI vs traditional comparison scenarios
└── types/index.ts            ← All shared TypeScript types
```

---

## How It Works

1. **Upload** a PDF, DOCX, or TXT RFP document (or click **"Load demo RFP"**).
2. The client-side parser extracts structured sections and generates a `DocumentSummary` with detected technologies, budget, timeline, requirements, and a confidence score.
3. The **orchestrator** runs all five engines in sequence, producing a typed `AnalysisResult` stored in the Zustand store.
4. Each module reads from the store and renders its section — all calculations stay live and editable (especially Cost Estimation).

---

## Demo Mode

No real file is required. On the Upload screen, click **"Or load demo RFP"** to instantly load a sample enterprise platform RFP and trigger a full analysis. All five modules will be populated within ~2 seconds.

---

## Production Considerations

| Concern | Current state | Production path |
|---|---|---|
| File storage | In-memory (demo) | Replace with S3/Azure Blob in `upload/route.ts` |
| PDF/DOCX parsing | Text fallback | Add `pdf-parse` + `mammoth` packages |
| Database | None (Zustand in-memory) | Add Prisma + PostgreSQL for persistence |
| Authentication | Architecture-ready | Add NextAuth.js or Clerk |
| LLM integration | Deterministic engines | Swap `parser.ts` summary logic for OpenAI/Anthropic calls |
| Environment config | Hardcoded defaults | Move to `.env.local` with `zod` validation |

---

## Available Scripts

```bash
npm run dev      # Start development server on :3000
npm run build    # Production build (TypeScript + lint checked)
npm run start    # Serve production build
npm run lint     # ESLint check
```

---

## Key Design Decisions

- **Client-side-first architecture**: all calculation engines run in the browser via Zustand, enabling zero-latency live recalculation when sliders change.
- **Deterministic fallback schemas**: every engine produces complete, sensible output even for sparse RFP documents. No LLM dependency for core functionality.
- **Typed throughout**: `src/types/index.ts` is the single source of truth for all data shapes — engines, API routes, and UI components all share the same types.
- **Modular engines**: each engine (`costEngine`, `planEngine`, etc.) is a pure function — easy to unit-test, swap implementations, or wire to an LLM output.
