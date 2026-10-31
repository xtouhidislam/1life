# Task manager report

Implementation and local checks are complete. The user applied the second migration and confirmed task persistence after testing. Broader hosted scenarios and hosted cross-account checks remain unverified.

## Delivered

- Add, edit, complete, reopen, and delete daily tasks with notes, tags, six colours, and three priorities.
- Optional start/end times, including overnight tasks. Future tasks can be planned but cannot be completed ahead of their date.
- Date navigation and completed/incomplete filters for history. Past records can be corrected.
- Six default repeating targets, editable by title, tag, colour, priority, and days of the week. Exercise defaults to Monday–Saturday, leaving Sunday as rest.
- Daily target snapshots with a unique template/date constraint. The backend backfills missed days since each target's start date, without overwriting existing records. Editing a template affects future days; editing a dated target affects only that date.
- Archive repeating targets from tomorrow while keeping today and all past records. Dated target records are retained rather than individually deleted.
- Editable weekday and weekend timetables imported from `daily_life.docx`: add/edit/delete blocks, calculated durations, overnight labels, and overlap warnings. These are planning blocks, separate from task completion.
- Dhaka daily rollover while the task manager is open, loading/error/empty states, retry, and modal forms with keyboard focus containment.

## Checks and outcomes

- `npm run build`: TypeScript and production build passed.
- `npm test`: passed against an isolated PostgreSQL engine (PGlite). Applies both migrations and checks repeat initialization, day backfill, history/completion preservation, archive semantics, manual task CRUD, future completion rejection, anonymous denial, and two-user ownership isolation. Also checks Dhaka midnight, year rollover, overnight durations/overlaps, and that each imported routine covers 1,440 minutes.
- Browser checks with a mocked Supabase API: passed task add/edit/complete/filter/delete, date history, target editing/archiving, overnight routine edits, mobile overflow in all three views, missing migration messaging/retry, and absence of browser exceptions.
- The mocked browser checks do not validate the hosted API. PGlite uses a minimal simulated Supabase Auth schema; it does not replace real-account tests against your Supabase project.

To rerun browser checks, start the dev server and run `node scripts/check-task-ui.cjs` with Playwright available. In this workspace, set `PLAYWRIGHT_MODULE` to the bundled Playwright package path. The script uses installed Microsoft Edge and intercepts Supabase requests; it does not create accounts or modify hosted data.

## Apply and check on Supabase

1. Open Supabase **SQL Editor → New query**.
2. Run the entire `supabase/migrations/202610310002_tasks.sql` file once. Do not re-run the foundation migration.
3. Refresh the app, sign in, and open **Task manager**. The first visit initializes your targets and routines once.
4. Add a task, edit its tag/priority, mark complete, and refresh. Confirm it remains completed. Try the completed/incomplete filters, then reopen or delete the test task.
5. Open yesterday and return to today. Today's completion must remain intact. Repeat generation never adds another copy of the same target for the same date.
6. Edit a repeating target. Today's snapshot stays unchanged; future generated days use the updated template. Archive a test target and verify today's record remains.
7. Edit a routine block and refresh. Confirm the time persists. An end time earlier than its start is displayed as continuing into the next day.

The user confirmed the migration succeeded and task persistence worked. The remaining scenarios above have not been individually confirmed. Existing account data is not modified by local tests. Cross-account RLS checks passed locally but remain unverified on the hosted project.

Next section after the hosted checks: dashboard, focus/reading logs, and finances.
