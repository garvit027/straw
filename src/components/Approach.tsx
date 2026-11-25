import { useState } from 'react';
import { ChevronDown, Workflow, GitCommitVertical } from 'lucide-react';
import { Card, Pill, SectionHeader } from './ui';

const QUESTIONS: Array<{ q: string; a: string[] }> = [
  {
    q: '1. How did you model employees, brands, processes, pods, and their relationships?',
    a: [
      'I used a relational, normalised model in TypeScript. Employee, Brand, Process and Pod are first-class entities with IDs. A Pod references its lead by employeeId rather than embedding a lead object, so changing a lead never duplicates data.',
      'The key modelling decision was to introduce an Allocation as the join entity between a brand and a process. It holds the eligible employeeIds, the minimum coverage, and the operating rule (weekdays + worksOnHolidays). This is what allows Aurora Lifestyle to run Customer Support 365 days while its Retention process is Mon–Fri — the rule belongs to the work, not to the person or the brand.',
      'Employees carry preferences (preferredOffDays, maxConsecutiveDays) and skills, which are advisory. Leaves, holidays and availability overrides are separate date-bounded facts, so they can be added or removed without touching a roster cell.',
    ],
  },
  {
    q: '2. How does your system generate a roster and determine whether it satisfies the required constraints?',
    a: [
      'Generation is deterministic and runs in two phases. buildRoster walks each calendar day, computes every employee\'s availability, finds the allocations that require coverage that day, orders them most-constrained-first, scores each eligible employee, and picks the top minCoverage people. Scoring penalises working on a preferred off day, exceeding the consecutive-day cap, and accumulating too many shifts, which spreads work fairly without randomness.',
      'Then validateRoster runs independently over the finished matrix. It checks coverage shortfalls, double assignments, leave and availability violations, preference breaches and consecutive-day caps. Conflicts are tagged mandatory or advisory and sorted by severity. Keeping build and validate separate means a manual edit can be revalidated without regenerating everything from scratch.',
    ],
  },
  {
    q: '3. How did you handle the difference between single-resource brands and brands with multiple employees?',
    a: [
      'There is no special code path for them. A single-resource brand is simply an Allocation with one employeeId; a multi-resource brand has two or three. The sample data includes 20 single-resource brands (80%), brands where each person owns a different process, and brands where two people share the same process with minCoverage = 2.',
      'The difference emerges in validation. A single-resource allocation with a leave on a required day has zero candidates, so it produces a critical shortfall with no internal backup. A three-person brand can usually absorb the same absence by letting the remaining people cover, which the recommender quantifies.',
    ],
  },
  {
    q: '4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?',
    a: [
      'The Change Simulator marks that person unavailable for a date range and regenerates the month. Because the allocation has no other eligible employee, every required day in that range becomes a critical COVERAGE_SHORTFALL conflict. The before/after diff shows exactly which cells moved, and the resolution panel explains that the brand is single-resource and offers ranked options: cross-train a pod colleague, arrange a comp-off swap, or request a client coverage exception.',
      'Nothing is silently dropped — the roster is still generated so the manager can see the whole picture, but it is explicitly marked as not publishable until the mandatory conflict is resolved.',
    ],
  },
  {
    q: '5. How does your system handle conflicting requirements or insufficient staffing?',
    a: [
      'Mandatory constraints always outrank preferences. If a 365-day process needs coverage on a Sunday that is the only employee\'s preferred off day, the employee is scheduled and an INFO conflict records the trade-off. If there are genuinely not enough available people, a CRITICAL conflict is raised with the exact shortfall, the unavailable employees and the reason for each.',
      'The recommender then ranks backups in three tiers: someone already assigned to the same allocation who is off that day, someone handling the same process for another brand, and finally anyone cross-trained on the process. A manager can assign a ranked backup with one click, which adds a manual override and triggers full revalidation.',
    ],
  },
  {
    q: '6. Which parts of the process did you automate, and which did you leave under human control? Why?',
    a: [
      'Automated: calendar expansion, holiday/weekday classification, availability filtering, allocation ordering, candidate scoring, coverage counting, conflict detection, before/after diffing, backup ranking and CSV export. These are deterministic and repeatable, so automating them removes clerical errors.',
      'Human-controlled: approving leave, defining operating rules and minimum coverage, choosing which backup to accept, and final publication. Coverage is a client commitment with commercial consequences; the system advises and validates, but a manager makes the call. Manual overrides are recorded with a note so decisions remain auditable.',
    ],
  },
  {
    q: '7. If the company doubled its team and brand count, what would you change about your solution?',
    a: [
      'The pure function at the core would survive unchanged, but browser localStorage would not. I would move state to a real database (Postgres via Supabase or Neon) with tables mirroring the current entities, add optimistic locking on roster edits, and run generation in a server worker so 60+ employees × 50 brands does not block the UI.',
      'I would also replace the exhaustive per-day scan with constraint propagation or a CP-SAT/ILP solver for the hard cases, add role-based access so pod leads only see their pod, and paginate/virtualise the matrix views. The conflict report would become an event stream with notifications when a published roster changes.',
    ],
  },
  {
    q: '8. If you had one additional week to work on this, what would you improve first?',
    a: [
      'I would add a real optimisation solver with a weighted objective for fairness and preference satisfaction, subject to the mandatory constraints the validator already enforces. Today the greedy heuristic is reliable and explainable, but it can leave a preference unmet when a swap would have satisfied both coverage and preference.',
      'Second would be a proper multi-plan comparison view (baseline vs. current vs. proposed) with approval state per pod lead, and an audit log of every manual override.',
    ],
  },
];

export default function Approach() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="page-stack">
      <Card>
        <SectionHeader title="Architecture at a glance" subtitle="A deterministic core with an editable data layer and a validation-first UI" />
        <div className="flow">
          <div><Workflow size={20} /><strong>Config</strong><span>Employees · brands · processes · pods · allocations · leaves · holidays</span></div>
          <GitCommitVertical size={18} className="flow-arrow" />
          <div><Workflow size={20} /><strong>buildRoster</strong><span>Day loop · availability · most-constrained-first · scoring · fairness</span></div>
          <GitCommitVertical size={18} className="flow-arrow" />
          <div><Workflow size={20} /><strong>validateRoster</strong><span>Coverage · leave · overrides · preferences · consecutive days</span></div>
          <GitCommitVertical size={18} className="flow-arrow" />
          <div><Workflow size={20} /><strong>Views & decisions</strong><span>5 roster views · conflict triage · backups · change simulator · CSV</span></div>
        </div>
        <div className="pill-row wrap">
          <Pill tone="blue">React + TypeScript + Vite</Pill>
          <Pill tone="green">Deterministic scheduler</Pill>
          <Pill tone="purple">localStorage persistence</Pill>
          <Pill tone="amber">No external services required</Pill>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Tell us how you think" subtitle="The eight questions from the assessment, answered" />
        <div className="qa-list">
          {QUESTIONS.map((item, i) => (
            <div key={i} className={`qa ${open === i ? 'open' : ''}`}>
              <button onClick={() => setOpen(open === i ? null : i)}>
                <strong>{item.q}</strong><ChevronDown size={18} />
              </button>
              {open === i && <div className="qa-body">{item.a.map((p, j) => <p key={j}>{p}</p>)}</div>}
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
