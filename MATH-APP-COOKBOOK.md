# Math Practice App Cookbook

How to build the next chapter's practice app without repeating the bugs we found in Chapter 12.

This is a working document — when we ship the next chapter, every new lesson should leave a note here.

---

## The non-negotiable rule

**Every problem the engine generates must map to a specific question type in the source chapter.** If a variant isn't a near-mirror of a textbook example or homework problem, it doesn't ship. "Math-adjacent" is not enough.

How we enforce it:
1. The chapter PDF goes into `supabase/chapter-NN-source.pdf` and is read cover-to-cover before any generator is written.
2. Each variant in the engine has a comment saying which page/lesson it comes from.
3. Any variant that can't cite a textbook reference is deleted.

What we cut from Ch. 12 because it failed this rule:
- Geometric (×N) patterns in `number-patterns` — chapter is strictly additive + ratio relationships.
- "Did the value increase or decrease?" in `graph-data` — textbook only asks for specific values.
- "Sum of all values" in `graph-data` — never asked.
- "How far from origin?" in `point-distance` — chapter is about distance between any two collinear points, not specifically the origin.
- "Plot a point on the same line as A" in `plot-points` — duplicated a 12.2 (relate-points) skill.
- "Estimate halfway between two data points" in `line-graphs` — present in textbook but kids didn't recognize it as a Ch. 12 question.
- "N laps around rectangular court" in `point-distance` — only one example in the textbook; the question text reads identical across scenarios so kids think they're getting the same question.

---

## Wording: avoid every off-by-one trap

5th graders DO know order of operations and 1-indexed counting in theory. But under test pressure, ambiguous wording surfaces every gap.

**Bad:** "A pattern starts at 3 and follows the rule 'Add 2'. What is the 7th number?"
- Kid can plausibly read "3" as position 0 → answer 17.
- Kid can plausibly read "3" as position 1 → answer 15.

**Good (matches textbook 12.6):** Show a labeled table.
| Position | 1 | 2 | 3 | 4 |
|----------|---|---|---|---|
| Value    | 3 | 5 | 7 | 9 |

"What is the value at position 7?" — no ambiguity, position labels are visible.

**Rule:** When a question requires the kid to count something, show the count visibly (table, sequence, labeled axis). Don't make them count in their head.

---

## Order of operations: always parenthesize

Even though `2 × w + 2 × h = 16` is PEMDAS-correct, write it the textbook way:

**Bad:** `Perimeter = 2 × width + 2 × height = 2 × 5 + 2 × 3 = 16`

**Good (matches textbook page 580):** `Perimeter = (2 × width) + (2 × height) = (2 × 5) + (2 × 3) = 10 + 6 = 16`

Parentheses on every multiplication that's mixed with addition. Show the intermediate sum step.

---

## Visuals: every plotted point lands on a grid intersection

The original `LineGraph.jsx` divided the y-axis into 5 equal sections regardless of the data's range. So with `yMax = 60`, gridlines were at 0, 12, 24, 36, 48, 60 — and a data point at y=10 floated between gridlines. To a 5th grader, "the dot is between two lines, so I'm supposed to estimate" — and they get marked wrong because the engine knows the exact y.

**Fix pattern:**
1. Pick a y-axis step size from a small list `[1, 2, 5, 10, 20, 25, 50, 100]` such that `yMax % step === 0` and `yMax / step` is between 4 and 12 gridlines.
2. Generate data values as multiples of `step`. So if step=5, data values are 5, 10, 15, … never 7 or 13.
3. Render gridlines at every `step` so each data point sits exactly on a horizontal gridline.

**Coordinate grids** (`CoordinateGrid.jsx`) — easier: every grid square is one unit, so any integer-coordinate point lands exactly on an intersection. **All generators must produce integer coordinates only.** No `Math.round` of a fraction, no scaled coordinates.

---

## Visuals: dark-enough gridlines

A 5th grader on a school Chromebook can't see `#e5e7eb` gridlines under glare. Use `#94a3b8` (slate-400) for both coordinate grids and line graphs. Axis labels: 14px minimum (we started at 11px and Max couldn't read them).

---

## Server-side scoring must respect mode flags

The diagnostic view suppressed Space Invaders client-side, but the API was still incrementing the SI threshold counter. So Max never got SI at his first 5-streak in practice — the server thought he was already past 5.

**Rule:** If the UI gates a behavior by a flag, the API must check the **same** flag before persisting state that depends on it. We added `if (!ps.is_diagnostic && ...)` to the SI logic.

General pattern: the API endpoint should know which session type it's writing for, and any "reward state" mutation should be gated by `!is_diagnostic` (or the equivalent).

---

## Use the textbook's exact vocabulary

Match the chapter's vocabulary cards literally. For Ch. 12 that meant:
- "ordered pair" not "coordinates" (when the kid is reading)
- "x-coordinate" / "y-coordinate" not "x value"
- "vertices" not "corners"
- "polygon" not "shape"
- "origin" not "center"
- "Position N" / "Term N" — pick whichever the chapter uses and stay consistent

The textbook is what the kid will see on the test. The app should sound like the test.

---

## Repetition perception ≠ repetition fact

Max said he was getting laps-perimeter "over and over." Looking at the data: 2 of his last 30 problems were laps. Mathematically that's exactly the expected ~7%. But the question text was identical across the 4 scenario variations:

> "You walk 5 laps around a rectangular pool deck with corners at (X, Y), (X', Y), (X', Y'), (X, Y'). Each unit represents 2 feet. How many feet in total?"

> "You jog 5 laps around a rectangular baseball diamond with corners at..."

To a 5th grader, those are the same question. **Surface variation matters as much as logical variation.** If two variants share the same sentence skeleton with one swapped noun, count them as one variant for diversification purposes.

---

## Permanent regression tests

Two test scripts run on every change:

1. **`test/engine.test.js`** — every variant runs 50× and is checked for shape (has question, has answer, has explanation, etc).
2. **`test/math-audit.test.js`** — 12,000 problems generated across all topics + difficulty levels. For each one, the engine's own answer is fed back into `checkProblemAnswer()` and must return `true`. Catches any drift between the answer the engine computes and the answer the engine accepts.

Both are wired into `npm test`. Run them after any engine edit, even one-line ones.

---

## Operational lessons (not specific to math)

- **Vercel + GitHub:** the local git author email must match an email on the Vercel team. If a deploy fails with "Git author X must have access to the team," re-author commits with `git filter-branch` and `--env-filter`.
- **Vercel CLI auth tokens expire.** Token at `~/Library/Application Support/com.vercel.cli/auth.json` is short-lived. Personal access tokens from `vercel.com/account/tokens` are long-lived; save those to the Vault under service "Vercel".
- **Supabase management API tokens also expire.** When an old token starts returning 401, ask Dave for a fresh one from `supabase.com/dashboard/account/tokens` and update the Vault.
- **Free Supabase projects pause after 90 days.** The shared project `dhwllgdxpeucldtmzhme` (used for all kid apps) is the active one. If a SQL editor link routes Dave to a different account, he's logged into the wrong Google account in his browser.
- **Hard refresh on Chromebook:** Ctrl+Shift+R (or Ctrl+F5). When deploying a fix, tell the kid to hard-refresh.
- **Service-role key + REST is fine for inserting rows** into existing tables. But it can't run DDL — `CREATE TABLE` requires either the management API or Dave pasting SQL into the dashboard editor.

---

## Building the next chapter's app — quick checklist

1. **Drop the textbook PDF** into `supabase/chapter-NN-source.pdf`.
2. **Read every page** before writing a single generator. Note the lesson titles, vocabulary cards, example problem types, and modeling-real-life scenarios.
3. **Inventory the question types** in a comment block at the top of `engine.js`. Each variant must cite which lesson it comes from.
4. **Reuse this repo's `morriello-math` template** (tagged `template-v1`) and rip out the topic-specific generators. Keep auth, roster, teacher dashboard, scoring API, Space Invaders, sounds, ProblemCard, CoordinateGrid, DataTable, LineGraph, PracticeFlow.
5. **For each new topic:** write the generator, then immediately run `npm test`. The 12,000-problem audit will fail loudly on any answer/checker mismatch.
6. **For each new visual:** verify points land on integer grid intersections. Verify line-graph data values are multiples of the gridline step.
7. **For each new question's wording:** does it match the textbook's exact phrasing? If not, rewrite or cite a reason.
8. **Send Dave a short test session URL before deploying widely.** Have him try 10 problems and flag anything that feels off-textbook.
9. **Push a parent-progress dashboard** (mirror `max-progress` for next chapter — single API endpoint + static HTML, ~30 min of work).
10. **Update this cookbook** with anything new the chapter taught us.
