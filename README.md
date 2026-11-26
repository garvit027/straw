# Smart Roster Management System

A browser-based roster planning tool built for the Datastraw AI + Tech Internship assessment. It plans monthly rosters across multiple brands, processes and operational pods, and — more importantly — tells an operations manager exactly **why** a plan is or is not publishable.

**Live demo:** https://garvit027.github.io/straw/
**Repository:** https://github.com/garvit027/straw

---

## What it does

| Capability | Where in the app |
|---|---|
| 30 employees, 20 brands, 4 processes, 4 pods with leads | *Setup & data* (fully editable) |
| Per-brand-process operating calendars (365-day / holidays-off / Mon–Sat / Mon–Fri) | *Setup & data → Allocations* |
| Minimum coverage, shared processes, multi-process single-resource brands | *Setup & data → Allocations* |
| Leaves, comp-offs, public holidays, availability overrides | *Setup & data* |
| Deterministic monthly roster generation | *Generate roster* (top bar) |
| Company / pod / brand / process / employee views | *Roster views* |
| Mandatory vs. advisory conflict detection | *Conflicts* |
| Ranked backup recommendations + one-click manual fixes | *Conflicts* |
| Before/after change simulation with gap detection | *Change simulator* |
| CSV export, reset to sample data, in-app approach note | Top bar / *Approach* |

The seed data follows the brief: 16 of 20 brands (80%) have one dedicated employee handling every assigned process; the remaining four have two or three core employees, with distinct processes in some brands and shared processes in others. Two specialists also work across brands.

---

## Quick start

```bash
git clone https://github.com/garvit027/straw.git
cd straw
npm install
npm run dev
```

Open the URL printed by Vite (the production build uses the `/straw/` base path).

```bash
npm run build      # typecheck + production bundle
npm run preview    # serve the production build locally
```

No API keys, accounts or backend services are required. State is persisted in the browser via `localStorage`; **Reset** restores the original sample dataset. Copy `.env.example` to `.env` only if you want to change the Pages base path.

---

## Architecture

```
src/
├── types.ts              Domain model and working-rule presets
├── data/seed.ts          Deterministic 30-employee sample dataset
├── engine/
│   ├── calendar.ts       Holiday / weekday / operating-day classification
│   ├── scheduler.ts      buildRoster + validateRoster (the core)
│   └── recommendations.ts Ranked backup suggestions + resolution hints
├── store/AppContext.tsx  React state, localStorage, change orchestration
├── utils/                Date helpers and CSV export
└── components/           Overview, five roster views, conflicts, change
                          simulator, data manager, approach note
```

**Stack:** React 19 + TypeScript + Vite, lucide-react icons, plain CSS. Deployed as a static site to GitHub Pages via GitHub Actions.

### Design decisions

1. **The allocation is the central entity.** An `Allocation` joins a brand and a process and owns the eligible employees, `minCoverage`, and the operating rule. A brand can therefore run Customer Support 365 days while its Retention process is Mon–Fri — the rule belongs to the work, not the person.

2. **Generation and validation are separate pure functions.** `buildRoster` produces the matrix; `validateRoster` runs every constraint against it independently. A manual edit regenerates through the same pipeline, so validation can never drift from generation logic.

3. **Mandatory constraints outrank preferences.** Coverage, leave and availability are hard constraints. Preferred off days and the consecutive-day cap are advisory and only surface as INFO/WARNING conflicts when mandatory coverage forced a trade-off.

4. **One person may cover several processes for the same brand in a day, but never two different brands.** This is what makes single-resource brands workable while still detecting genuinely conflicting cross-brand assignments. A roster cell stores an `allocationIds` array so covering CS + ACC + RET for one brand is represented correctly.

5. **Most-constrained-first ordering.** Within each day, allocations with the fewest available eligible employees are filled first, reducing avoidable gaps without needing a heavyweight solver.

6. **Deterministic scoring.** Candidate score penalises working a preferred off day, exceeding the consecutive-day cap, and accumulating too many shifts. A stable ID tie-break makes every roster reproducible and explainable.

7. **Human control stays where it matters.** The system ranks and validates; a manager approves leave, sets coverage requirements, accepts a backup, and publishes.

---

## Tell Us How You Think

### 1. How did you model employees, brands, processes, pods, and their relationships?

I used a relational, normalised model in TypeScript. Employee, Brand, Process and Pod are first-class entities with IDs. A Pod references its lead by `employeeId` rather than embedding a lead object, so changing a lead never duplicates data. The key modelling decision was introducing an **Allocation** as the join entity between a brand and a process. It holds the eligible `employeeIds`, the minimum coverage, and the operating rule (weekdays + `worksOnHolidays`). This is what allows one brand to run Customer Support 365 days while its Retention process is Mon–Fri — the rule belongs to the work, not to the person or the brand. Employees carry preferences (`preferredOffDays`, `maxConsecutiveDays`) and skills, which are advisory. Leaves, holidays and availability overrides are separate date-bounded facts, so they can be added or removed without touching a roster cell.

### 2. How does your system generate a roster and determine whether it satisfies the required constraints?

Generation is deterministic and runs in two phases. `buildRoster` walks each calendar day, computes every employee's availability, finds the allocations requiring coverage that day, orders them most-constrained-first, scores each eligible employee, and picks the top `minCoverage`. Scoring penalises working on a preferred off day, exceeding the consecutive-day cap, and accumulating too many shifts, which spreads work fairly without randomness. Then `validateRoster` runs independently over the finished matrix. It checks coverage shortfalls, double-brand bookings, leave and availability violations, preference breaches and consecutive-day caps. Conflicts are tagged mandatory or advisory and sorted by severity. Keeping build and validate separate means a manual edit can be revalidated without regenerating everything from scratch.

### 3. How did you handle the difference between single-resource brands and brands with multiple employees?

There is no special code path. A single-resource brand is simply an Allocation with one `employeeId`; a multi-resource brand has two or three. The sample data includes 16 single-resource brands (80%), brands where each person owns a different process, and brands where two people share the same process with `minCoverage = 2`. The difference emerges in validation: a single-resource allocation with a leave on a required day has zero candidates, so it produces a critical shortfall with no internal backup. A three-person brand can usually absorb the same absence by letting the remaining people cover, which the recommender quantifies.

### 4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?

The Change Simulator marks that person unavailable for a date range and regenerates the month. Because the allocation has no other eligible employee, every required day in that range becomes a critical `COVERAGE_SHORTFALL`. The before/after diff shows exactly which cells moved, and the resolution panel explains that the brand is single-resource and offers ranked options: cross-train a pod colleague, arrange a comp-off swap, or request a client coverage exception. Nothing is silently dropped — the roster is still generated so the manager sees the whole picture, but it is explicitly marked as not publishable until the mandatory conflict is resolved.

### 5. How does your system handle conflicting requirements or insufficient staffing?

Mandatory constraints always outrank preferences. If a 365-day process needs coverage on a Sunday that is the only employee's preferred off day, the employee is scheduled and an INFO conflict records the trade-off. If there are genuinely not enough available people, a CRITICAL conflict is raised with the exact shortfall, the unavailable employees and the reason for each. The recommender ranks backups in three tiers: someone already assigned to the same allocation who is off that day, someone handling the same process for another brand, and finally anyone cross-trained on the process. A manager can assign a ranked backup with one click, which adds a manual override and triggers full revalidation.

### 6. Which parts of the process did you automate, and which did you leave under human control? Why?

Automated: calendar expansion, holiday/weekday classification, availability filtering, allocation ordering, candidate scoring, coverage counting, conflict detection, before/after diffing, backup ranking and CSV export. These are deterministic and repeatable, so automating them removes clerical errors. Human-controlled: approving leave, defining operating rules and minimum coverage, choosing which backup to accept, and final publication. Coverage is a client commitment with commercial consequences; the system advises and validates, but a manager makes the call. Manual overrides are recorded with a note so decisions remain auditable.

### 7. If the company doubled its team and brand count, what would you change about your solution?

The pure function at the core would survive unchanged, but browser `localStorage` would not. I would move state to a real database (Postgres via Supabase or Neon) with tables mirroring the current entities, add optimistic locking on roster edits, and run generation in a server worker so 60+ employees × 50 brands does not block the UI. I would also replace the exhaustive per-day scan with constraint propagation or a CP-SAT/ILP solver for hard cases, add role-based access so pod leads only see their pod, and paginate/virtualise the matrix views. The conflict report would become an event stream with notifications when a published roster changes.

### 8. If you had one additional week to work on this, what would you improve first?

I would add a real optimisation solver with a weighted objective for fairness and preference satisfaction, subject to the mandatory constraints the validator already enforces. Today the greedy heuristic is reliable and explainable, but it can leave a preference unmet when a swap would have satisfied both coverage and preference. Second would be a multi-plan comparison view (baseline vs. current vs. proposed) with pod-lead approval state and an audit log of every manual override.

---

## Assumptions made

- A person-day is the unit of assignment. One person may cover multiple processes for the **same** brand on a day, but not two brands.
- `minCoverage` counts distinct people assigned to that process-day; the same person may count toward two processes of one brand.
- Public holidays are global; each allocation's rule decides whether it works on them.
- An `AVAILABLE` override is an explicit manager decision and outranks an approved leave.
- Conflicts never block generation; they block *publishing*. The UI makes mandatory conflicts impossible to miss.
- Seed names, holidays, weekly-off rules and coverage requirements are illustrative; all are editable in the app.

## Deployment

The app is a static Vite build (`npm ci && npm run build` → `dist/`), so every major host can auto-deploy it from the GitHub repo.

| Host | Auto-deploy setup | Config in this repo |
|---|---|---|
| **GitHub Pages** (current) | `.github/workflows/deploy.yml` runs on every push to `main`. Enable **Source = GitHub Actions** in repo settings. | Default `base` is `/straw/`. |
| **Vercel** (recommended alternative) | Import `garvit027/straw` in Vercel; it detects Vite and deploys every push/PR. | `vercel.json` sets the build, output, SPA rewrite and `VITE_BASE_PATH=/`. |
| **Netlify** | Import the repo; Netlify reads the config automatically. | `netlify.toml` sets the build, output, SPA redirect and `VITE_BASE_PATH=/`. |
| **Cloudflare Pages** | Connect the repo; set build command `npm run build`, output `dist`, and env var `VITE_BASE_PATH=/` in the dashboard. | `public/_redirects` provides the SPA fallback. |

On root-domain hosts, `VITE_BASE_PATH=/` is required; otherwise the built assets would still be requested from `/straw/assets/...` and 404. GitHub Pages keeps the default `/straw/`.
