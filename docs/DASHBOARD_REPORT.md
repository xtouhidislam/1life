# Dashboard report

Dashboard implementation and local verification are complete. The user confirmed the third migration and testing. Broader hosted account-isolation checks remain unverified. The dedicated Expenses section now extends the same ledger; see `docs/EXPENSES_REPORT.md`.

## Delivered

- Current and upcoming timed tasks, falling back to your weekday/weekend routine. Overnight blocks and task priority over concurrent routine blocks are handled. Times use Asia/Dhaka.
- Weekly completed tasks, reading pages, focused hours, and spending. Weeks start Monday. Completed tasks are counted by their scheduled date, including recurring targets.
- Daily target score, monthly average, and weekly target progress bars. The expandable score explanation states the formula. Missed elapsed days count as zero, future days are excluded, and scoring starts on the profile's tracking start date.
- Manual focus logs in minutes, reading logs in pages, and expense/income logs. Add, edit, or delete entries; filter the journal by month and type, with 20 entries per page.
- Monthly opening balance and weekly spending budget. Remaining monthly balance = opening + income − expenses; weekly remaining = budget − weekly expenses. Negative balances are shown. Unset values stay explicitly unset.
- Money uses integer minor units and exact decimal input parsing. Plan updates run in one transaction. The app passes the period shown when the plan form opened, preventing a save into a different period after a week/month rollover.
- Database aggregation avoids API row limits truncating totals. RLS restricts each user's logs and plans. No administrative credentials are used.
- Loading, empty, error, retry, mobile, keyboard-accessible dialog, and failed-save recovery behavior.
- Dashboard and task manager load separately to reduce initial JavaScript download.

## Intended boundaries

Focus and reading logs update their own totals; they do not automatically complete daily targets. Log actual activity once and mark its daily target separately. The focus logger records completed minutes, without a running stopwatch.

Balances and budgets belong to specific periods and do not carry forward automatically. Currency is read from the profile (BDT by default); this section does not perform currency conversion.

The upcoming project card reads saved project progress through migration five. Hadith/Ayah cards now use the Knowledge section's reviewed, active entries through migration seven and retain clear empty states until that library is populated. No religious text or personal project progress has been invented.

## Verification

- `npm run build`: TypeScript and production build passed.
- `npm test`: task regression suite and dashboard PostgreSQL tests passed. Coverage includes exact decimal parsing, known totals, target-only scoring, missed-day denominator, >1,000-row aggregation, negative/unset plans, atomic update rollback, stale-period plan rejection, future-date rejection, log changes, cross-account isolation, and anonymous denial.
- Fixed-date PostgreSQL scenarios passed at Dhaka midnight on 1 November 2026, 1 January 2027, and Monday 4 January 2027. They check Sunday week retention, Monday reset, month/year rollover, and distinct weekly/monthly spending boundaries.
- Browser checks with a mocked API passed log creation/edit/deletion, failed-save input preservation, budget and negative remaining balance, journal pagination/month filtering, mobile dashboard/dialog sizing, missing-migration retry, and absence of browser exceptions.
- Existing task-manager and signed-out authentication browser checks also passed after integration.

The database tests run in isolated PGlite PostgreSQL with simulated Supabase Auth identity. The browser tests intercept Supabase calls. These checks do not replace verification against your hosted project. No hosted records were changed by the tests.

## Apply and check on Supabase

1. Run the entire `supabase/migrations/202610310003_dashboard.sql` file once in **SQL Editor → New query**. Do not rerun earlier migrations.
2. Refresh the app and open **Overview**.
3. Log 60 minutes of focus and 10 pages of reading dated today. Confirm totals increase by 1.0 hour and 10 pages relative to their previous values. Refresh and confirm persistence.
4. Set a monthly opening balance and weekly budget. For a clean example, opening 1,000.00, income 250.00, expense 150.50 gives remaining monthly balance 1,099.50; a weekly budget of 100.00 gives remaining −50.50. Existing entries also contribute, so account for them when comparing. Delete test entries afterward if they are not real activity.
5. Edit and delete a log entry and confirm totals recalculate. Try the journal month filter.
6. Complete a repeating target in Task manager, then return to Overview and confirm daily progress updates. Manual tasks should affect the weekly task count but not the target score.

The user confirmed the dashboard migration and testing after this report was first written. Hosted cross-account verification and individual test scenarios above have not been separately confirmed. The dedicated expense section was added next at the user's request; after its hosted checks, continue with the 26-week AI learning tracker.
