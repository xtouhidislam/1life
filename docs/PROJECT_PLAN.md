# 1Life implementation plan

## Source material

- `assets/readme.md`: product requirements and staged delivery instructions.
- `assets/daily_life.docx`: daily timetable, six-month learning roadmap, portfolio milestones.
- `assets/progress_tracker.docx`: detailed weekly prerequisites, topics, practice, and acceptance criteria.
- `assets/exercise.docx`: weekly workout split, movement ladders, six-month phases.

## Architecture

Proposed stack: React, TypeScript, and Vite for the responsive web app; Supabase PostgreSQL and Auth for persistent data and email/password sign-in. Use SQL migrations tracked in the repository. Start with a single personal account, while enforcing ownership on every private row.

Use Asia/Dhaka for user-facing dates, daily boundaries, and schedule matching. Store event timestamps in UTC and daily records as local calendar dates. Use BDT as an editable initial currency. Weekly statistics use Monday through Sunday; roadmap weeks run from the configured roadmap start date independently.

## Delivery order and acceptance checks

### 0. Foundation

Create the app shell, navigation, responsive layout, environment configuration, Supabase connection, sign-in/out, and initial schema. Include explicit loading, error, and empty states.

Checks: build/type checks; sign-in/out; session restore; signed-out access denied; two-account ownership isolation across reads and writes. A live backend is needed to verify auth and row-level security.

### 1. Task manager and daily routine

Build this before the dashboard so dashboard statistics have real inputs. Add, edit, delete, prioritize, tag, and color tasks. Configure weekday/weekend schedules. Show completed and incomplete history by date.

Seed six editable repeating targets: memorize one Hadith, memorize one Ayah, read 10 pages, drink 3 litres, exercise 40 minutes, and AI practice. Each date gets its own completion record; opening a new day never overwrites the previous day's history. Use a unique constraint on target and local date to prevent duplicates.

Checks: task CRUD persists after refresh; recurrence produces no duplicates; yesterday remains intact; local midnight and overnight schedule blocks work; deletion behavior preserves historical records where needed.

### 2. Dashboard, focus, reading, and finances

Show current/upcoming tasks with time; weekly completed tasks, pages, and focus hours; daily/monthly score; weekly spending and remaining budget; remaining monthly balance; upcoming coding project; Hadith and Ayah of the day.

Add focus sessions, reading entries, expense/income entries, and weekly/monthly budget settings within this section so all statistics are usable. Use integer minor currency units. Monthly balance = opening balance + income - expenses; weekly budget remaining = weekly budget - weekly expenses. Permit negative remaining balances.

Initial score: completed daily targets divided by applicable daily targets, multiplied by 100. Monthly score averages daily scores through today, starting on the account's tracking start date, with missed days counting as zero and future days excluded. Display this definition in the app. Keep reading totals and task counts separate to prevent double counting.

Checks: known sample records yield expected totals; empty states; week/month rollover; focus duration; budget arithmetic; current/upcoming tasks around midnight. No invented personal progress or financial amounts.

### 3. AI automation learning

Before this section, add the dedicated Expenses section requested after dashboard testing: shared ledger, categories, monthly history, period budgets, filters, and CSV export. This keeps finance changes together and avoids duplicate entry. See `docs/EXPENSES_REPORT.md` for its implementation and verification status.

Import all 26 weeks with prerequisites, topics, practice, and acceptance criteria. Include weekly and project views, deliverable evidence, and a progress tree. Unlock week N only after every required criterion in week N-1 is complete. Enforce progression in the database as well as the UI. Include the three portfolio projects and evaluation harness.

Checks: locked weeks reject direct write attempts; completing all criteria unlocks exactly the next week; progress persists; re-opening a prerequisite blocks downstream edits without deleting existing evidence.

### 4. Exercise

Import the weekly split and movement progressions. Show today's routine with static movement diagrams, weekly routine, session logs, and phase/progression overview. Wednesday is mobility/rest and Sunday is full rest. Progression is recorded explicitly against the document's criteria, never assumed from elapsed time.

Checks: correct day selection; rest days; completed sets and sessions persist; movement levels and phase views reflect logs. Use source content rather than introducing new training prescriptions.

### 5. Knowledge

Create searchable Hadith, Ayah, Dua, and book collections with memorization and reading progress. Targets: 180 Hadiths, 180 Ayahs, 30 Duas, six small Islamic books. Store original text, translation, reference, and verification/source details.

The assets do not contain these collections or six book titles. Build import and management interfaces; populate only verified material. Do not fabricate religious text, references, or placeholder entries represented as verified. Daily cards use only the verified collection and show an empty state until content exists.

Checks: reference display; search/filter; progress persistence; daily item selection stays stable within a Dhaka calendar day; reading entries update dashboard totals once.

## Proposed data groups

- Identity/settings: profiles, tracking start date, timezone, currency, roadmap start date.
- Tasks: schedule blocks, task templates, dated task instances, tags, daily target logs.
- Metrics: focus sessions, reading logs, income/expenses, budgets, opening balances.
- Learning: weeks, learning criteria, per-user completion, projects, deliverable evidence.
- Exercise: routines, movements, progression levels, session/set logs.
- Knowledge: referenced content, books, per-user memorization and reading progress.

Every personal table receives a user ID, appropriate constraints, and RLS policies for select/insert/update/delete. Shared reference content is readable by authenticated users and cannot be edited through ordinary user access. Use migrations and backend functions for operations requiring transactional consistency.

## Conflicts and working assumptions

1. Roadmap dates conflict: `daily_life.docx` starts 1 November 2026, while the detailed tracker uses earlier October dates. Use 1 November 2026 as a configurable default and the detailed tracker for curriculum content. Derive all week ranges from this setting.
2. 1 November 2026 is Sunday, despite the document calling it Thursday. Week 26 is 25 April–1 May 2027 for 26 full seven-day weeks; 30 April is therefore a shortened final deadline if retained.
3. The timetable's midnight–05:30 block is 5.5 hours, although labeled six. Weekly summary hours and later suggested work blocks also conflict with the explicit timetable. Use the explicit start/end times and calculate durations automatically; allow editing.
4. AI practice is written as <=3 hours in the README, while scheduled work blocks are longer. Start with a configurable three-hour target, keep actual focus time separately, and do not penalize extra time until the intended cap is clarified.
5. The weekday exercise target is 40 minutes, with longer Saturday sessions and Sunday rest in the exercise document. Keep the recurring target editable and allow intentional rest days.
6. Budgets, opening balance, and religious content are not supplied. Leave them unset rather than inventing values.

## Report after every section

Record delivered behavior, checks run and outcomes, checks requiring a live Supabase project, remaining limitations, and the next section. Do not mark a section complete while required checks remain unverified.

## Planning verification

Reviewed all four supplied documents and mapped every README feature to a delivery section. No runnable app or Supabase connection exists yet, so no application tests or live database checks have been run.

## Final implementation status

All planned sections and the sourced 180-day collection are implemented. The latest request expands Duas to 180. Six sourced book suggestions now fill the remaining book-list gap. See FINAL_REVIEW.md for checks and production verification still requiring a real account. Earlier planning notes above describe the initial stage.
