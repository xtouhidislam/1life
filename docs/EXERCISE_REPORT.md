# Exercise section report

Implementation and local verification are complete. The user confirmed the Exercise migration/testing and authorized Knowledge. Individual hosted scenarios and account-isolation checks have not been separately confirmed. See `docs/KNOWLEDGE_REPORT.md` for the next section.

## Delivered

- Daily workout, weekly routine, and plan/progress views.
- Weekly split from `assets/exercise.docx`: Monday push, Tuesday pull/core, Wednesday rest/mobility, Thursday legs/glutes, Friday lighter full body, Saturday longer training, and Sunday full rest.
- All 21 movement levels across push, pull, legs, and core, including source graduation criteria and optional-bar pull levels.
- Static SVG movement-pattern schematics. Related variations share a diagram; captions identify these as schematics rather than detailed form instruction.
- Actual session duration, notes, and individual sets recorded as repetitions or seconds. Each date has one editable session; editing a day preserves other dates. A rest record has zero minutes and no sets. Wednesday supports a mobility session without strength sets; Sunday allows rest only.
- Date navigation, selected-date workouts, and session history for the 30 days ending on the selected date. Future days can be previewed, with logging disabled.
- Three source-based calendar phases and an editable start date. Calendar phases do not automatically raise movement levels.
- Explicit movement progression and step-down controls with notes and an audit history. Advancing one level requires the two latest logged sessions for that movement to meet its source set/quantity threshold, plus confirmation of clean form and both sides/variations where relevant. Pull levels 4–5 require the optional-bar setting.
- Separate session and level history. Deleting or correcting a session does not silently rewrite a past level-change record.
- Loading, empty/error/retry states, failed-save recovery, native modal dialogs, and mobile layouts.

## Data and rules

Migration `202610310006_exercise.sql` contains the 21 catalog entries, owner-scoped settings, sessions, normalized sets, current levels, and level history. Ordinary accounts can read their own records and the shared catalog; guarded functions perform writes. Session and set replacement is transactional, including rollback after invalid set data. Cross-account deletes are rejected.

Progression evaluates the two latest logged sessions that contain the current movement. Each must contain the required number of sets at or above its quantity threshold in the relevant unit. This checks recorded numbers; clean form, per-leg work, combined variations, and how easy the movement felt remain self-reported. Evidence notes record that confirmation. Stepping down requires a reason and preserves the previous logs.

Workouts may be logged as actual activity before the selected program start; the date setting affects calendar phases only. The default start is 1 November 2026. Workout logs do not automatically mark the task manager's exercise target complete. They also do not count as focused coding/study hours.

## Verification

- Production build and TypeScript: passed.
- `npm test`: all task, dashboard, expense, learning, and exercise suites passed.
- Exercise PostgreSQL checks: 21 catalog levels and thresholds, calendar phase boundaries, default levels, same-date upsert, session/set persistence, future-date and Sunday rejection, valid rest records, training-set requirement, replacement rollback, duplicate/invalid sets, direct-write denial, two-session graduation, step-down, optional-bar gating, ownership isolation, cascading session deletion with retained level history, and anonymous denial.
- Browser checks using a mocked API: day selection, static diagrams, set entry and failed-save recovery, advancement rejected after one session and accepted after two, settings, all seven routine days, Sunday rest, Wednesday mobility, edits/deletion preserving other dates, mobile views/dialogs, missing migration retry, and no browser exceptions.
- Existing authentication, task, dashboard, expense, and learning browser regression checks passed after integration.

Database checks use isolated PGlite PostgreSQL and simulated Auth identity. Browser checks intercept API requests. Hosted persistence, real-project RLS, and concurrent behavior still need verification; tests did not write real sessions to Supabase.

## Apply and check

1. Run the entire `supabase/migrations/202610310006_exercise.sql` once in **Supabase → SQL Editor → New query**. Catalog rows are included; do not rerun earlier migrations.
2. Refresh the app and open **Exercise**. Check today's focus and the **Weekly routine** tab.
3. Select a past training day, choose **Log session**, and enter the actual duration and sets. Save and refresh to confirm persistence. Edit the session and confirm another day's record remains unchanged.
4. Select a Sunday and confirm only a rest record is offered. Wednesday should offer rest or mobility.
5. Inspect **Plan & progress**. All movement patterns start at Level 1. Test a level advance only when the two qualifying sessions and source criteria are real; a premature advance should be rejected. Remove or correct any test session so the logs reflect actual activity.
6. Check **Plan settings** if your start date differs or you have the optional bar.

The next section is Knowledge: referenced Hadith/Ayah/Dua collections, books, and personal learning/reading progress.

## Catalog maintenance

The reviewed source mapping is in `data/exercise-plan.json`. `node scripts/seed-exercise.mjs` regenerates its movement seed inside the migration for development. Changes after the migration is applied require a new migration; do not rerun the original one.
