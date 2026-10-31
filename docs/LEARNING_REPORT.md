# AI learning tracker report

Implementation and local verification are complete. The user authorized proceeding after the fifth migration handoff; individual hosted checks have not been separately confirmed. Exercise is now implemented; see `docs/EXERCISE_REPORT.md`.

## Delivered

- Weekly, project, and progress-tree views, connected to the existing navigation.
- All 26 curriculum weeks imported from `assets/progress_tracker.docx`, with their titles, prerequisites where supplied, topics, practice, and acceptance criteria. The import produces 274 required checklist items. A week is complete when every one of its items is checked.
- Six phases and a 26-node progress tree. Locked weeks remain available for preview, while their checkboxes and evidence editing are disabled.
- Backend prerequisite enforcement: all earlier weeks must be complete before a later week can be edited. Date ranges alone do not unlock anything. Reopening an earlier week blocks later edits and preserves their saved checks and evidence.
- Weekly deliverable notes and an optional HTTP/HTTPS link. Acceptance cannot be confirmed without saved notes or a link; removing all evidence requires reopening acceptance first.
- Four portfolio project cards: Support Ticket Backend (Weeks 5–6), Company Knowledge Assistant (9–12), AI Evaluation Harness (18), and AI Customer Operations Platform (21–23). Progress derives from the linked weekly checklist items, and project notes/links can be saved after its prerequisite weeks are complete.
- Editable roadmap start date. Dates are calculated in full seven-day ranges, independent of saved progress. The default 1 November 2026 produces a final range of 25 April–1 May 2027, resolving the conflicting source calendars as documented in the plan.
- The dashboard now fetches its upcoming portfolio project from saved learning progress. Returning to Overview refreshes this card. It identifies prerequisites when a project is still locked.
- Responsive views, keyboard-operable controls, native modal focus containment, loading/empty/error/retry states, and failed-save input preservation.

## Backend enforcement

Reference curriculum tables grant authenticated users read access only. Personal checks and evidence grant only owner-scoped read access. All personal writes go through three narrowly scoped functions with fixed empty search paths, explicit Auth identity, validation, and prerequisite checks. No user ID parameter can redirect a write to another account.

These write functions serialize on the caller's profile row before checking prerequisites and updating progress. Direct REST inserts, updates, and deletes cannot bypass unlocking. URL/text length checks also apply in the database.

## Verification

- `npm run build`: TypeScript and production build passed.
- `npm test`: all task, dashboard, expense, and learning suites passed in isolated PGlite PostgreSQL with simulated Supabase Auth identity.
- Learning database checks: all 26 source weeks and 274 labels imported, reference tables immutable to ordinary users, direct progress-write denial, locked RPC denial, evidence required for acceptance, idempotent completion, exactly-next-week unlocking, reopening/relocking without lost history, full 26-week completion, project evidence, dashboard project suggestion, start-date changes without lost checks, URL constraints, two-account isolation, and signed-out denial.
- Browser checks with a mocked Supabase API: locked previews, disabled controls, acceptance error, evidence save/retry, completing Week 1 to unlock Week 2, reopening Week 1 while Week 2 retains progress, all 26 tree nodes, project notes, date settings, mobile views/dialogs, missing migration retry, reload persistence, and no browser exceptions.
- Existing authentication, task, dashboard, and expense browser regression checks passed after integration.

Local tests do not replace verification against the hosted Supabase project. No live learning progress or account data was modified by tests. Hosted RLS and concurrent-request behavior remain unverified against the real project.

## Apply and verify on Supabase

1. Open **SQL Editor → New query** and run the entire `supabase/migrations/202610310005_learning.sql` file once. It already contains the generated curriculum; no separate seeding step is needed. Do not rerun earlier migrations.
2. Refresh the app and open **AI learning**. Week 1 should be available, and Week 2 should be locked. You can inspect either week's content.
3. Check a Week 1 topic and refresh. Confirm it persists. Save a deliverable note or repository link and refresh to verify that too.
4. Check Projects and Progress tree. Project editing should stay locked until its required earlier weeks are complete. Inspect Roadmap dates if your actual start differs from the default.
5. At the end of Week 1, confirm every topic, practice, and acceptance item. Week 2 should unlock. Reopening any Week 1 item should relock Week 2 while retaining its existing work.
6. Return to Overview and confirm the upcoming coding project card shows the earliest incomplete portfolio project, including its prerequisite status.

Completion is self-reported. Use actual deliverable evidence and reopen any test checks afterward so the tracker reflects real work. The app does not execute your project tests or independently grade your learning.

## Curriculum maintenance

`data/learning-roadmap.json` is a source extraction, not personal progress. To rebuild it after changing the source Word document, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-learning.ps1
node scripts/seed-learning.mjs
```

The execution-policy flag applies only to that process. Rebuilding the seed updates the migration file for development; it does not update an already migrated database. Future curriculum changes need a new versioned migration rather than rerunning this one.
