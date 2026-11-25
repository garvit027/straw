# Submission pack

- **Application URL:** https://garvit027.github.io/straw/
- **GitHub repository:** https://github.com/garvit027/straw
- **LinkedIn:** https://www.linkedin.com/in/garvit027/
- **Email:** final draft in [`EMAIL.md`](EMAIL.md)
- **Demo video:** 3–5 minute walkthrough (script below)

Before recording, clear browser storage so the app starts from the exact seed data described here: open DevTools → Application → Local Storage → clear the `smart-roster:state:v2` key, then reload. The first paint now already shows a generated roster.

## Demo video script (3–5 minutes)

Record at 1280×720 or higher. Use the default December 2026 month. Move the cursor slowly and narrate the *reasoning*, not just the clicks.

### 0:00–0:30 — Setup and problem framing
- Open https://garvit027.github.io/straw/. On **Overview**, point out 30 employees, 20 brands, 54 allocations and four pods.
- Say: *"80% of brands here are single-resource; the rest have two or three people, some sharing a process. Each brand-process pair carries its own operating calendar."*
- Show the **Operating calendar mix** card — 365-day, daily-minus-holidays, Mon–Sat and Mon–Fri rules all coexisting.

### 0:30–1:15 — Generation
- Click **Generate roster** in the top bar.
- Point to the coverage gauge (≈99%) and explain the remaining gap is intentional and explained in the conflicts report.
- Mention the engine is deterministic, fills the most constrained allocations first, and balances shifts through scoring.

### 1:15–2:15 — Different brand schedules
- Go to **Roster views → Brand-wise**. Select **Aurora Lifestyle** (B01).
- Show that one employee covers CS, ACC and RET, with three different operating rules in the allocation list.
- Show the daily coverage grid: green = covered, red = shortfall, grey = process closed on Sundays/holidays.
- Switch to **Willow Goods** (three core employees) to show Customer Support shared by two people with `minCoverage = 2`.
- Switch to **Process-wise → NDR** to show one process across several brands with different calendars.

### 2:15–3:15 — Conflict detection and backup assignment
- Go to **Conflicts** (the Mandatory filter is on by default).
- Open a shortfall caused by a planned leave on a single-resource brand; read the detail: *"unavailable: Aarav Sharma (planned: Approved leave)"*.
- Open the shortfall caused by a comp-off on the Willow Goods shared process and explain minimum coverage.
- Expand a conflict with **Ranked backup options**. Explain the tiers: same allocation → same process → cross-trained.
- Click **Assign** on a backup. Show the toast, the conflict count dropping, and say that the whole roster was revalidated.

### 3:15–4:15 — Handling a change
- Go to **Change simulator**.
- Pick a single-resource employee (e.g. Priya Nair, who owns Bloom & Co), set 2026-12-16, click **Simulate absence**.
- Show the three impact numbers: cells changed, new mandatory conflicts, active overrides.
- Show the before/after diff for that employee.
- Expand a new gap: the app explains Bloom & Co is single-resource and suggests a comp-off swap, cross-training or a client exception.
- Click **Revert to previous plan** to show the original plan is restored.

### 4:15–4:45 — Configuration and closing
- Open **Setup & data → Allocations** briefly to show employees, coverage rules and calendars are editable without code changes.
- Open **Approach**, expand the first answer, and point to the written reasoning.
- Close on the live URL, repository and LinkedIn handle.

## Recording tips
- If you assign a backup during a take, click **Reset** in the top bar before the next take.
- Keep it under 5 minutes — the assignment asks for 3–5.
- Export at MP4/H.264.
