# Dedicated expense section report

Built alongside the existing dashboard finance features so both views share one ledger. The user confirmed the expense migration and testing. The AI learning tracker is now implemented; see `docs/LEARNING_REPORT.md`.

## Delivered

- **Expenses** navigation with monthly history, money in/out, net cash flow, and remaining balance.
- Add, edit, and delete categorized income and expense transactions. The dashboard money form also supports categories. Existing entries receive `Other` without changing their amounts, dates, or ownership.
- Shared monthly opening balances and Monday–Sunday weekly budgets. These can be edited for the displayed current or past period. Blank values unset the plan; negative opening balances and overspent budgets are supported.
- Expense category breakdown and a daily spending chart. Selecting a category or day filters the transaction list.
- Type, category, literal title search, and day filters, with 20 transactions per page and filtered income/expense totals across all matching entries.
- CSV export of all matching transactions across all pages. CSV includes date, type, category, description, exact decimal amount, and currency. Text values are quoted and spreadsheet formula prefixes are neutralized.
- Empty, loading, retry, failed-save recovery, and mobile layouts. Overview totals stay scoped to the entire selected month; list filters affect only transaction totals and export.

## Data and behavior

Migration `202610310004_expenses.sql` extends `finance_entries` with a category and adds owner-scoped summary/list functions. It reuses `monthly_plans`, `weekly_budgets`, and their RLS policies. There is no duplicate expense table. Records entered from either view appear in the other when navigating back or refreshing.

Month summaries use all transactions in that calendar month. Weekly budget spending covers the entire Monday–Sunday week, including days in the neighboring month. Unset opening balances show `Not set`, rather than implying a known bank balance. Opening balances and budgets do not carry forward automatically.

The application uses the profile's single currency (BDT by default); it does not convert between currencies. The supplied categories can be selected for both income and expenses. Existing custom category values are preserved when editing and included in filters.

## Checks

- Production build and TypeScript checks: passed.
- `npm test`: task, dashboard, and expense PostgreSQL suites passed. Expense tests cover migration over a pre-existing ledger, default categories, exact decimal input, CSV quoting/formula handling, month/type/category/day/literal-search filtering, cross-month weeks, >1,000-record aggregation/export, distinct pagination, matching dashboard totals, edits/deletes, invalid input, two-user isolation, and anonymous denial.
- Browser checks with a mocked Supabase API: passed income/expense creation/edit/deletion, failed-save recovery without input loss, category/search/day filtering, current/past monthly history, opening balances, weekly budgets, all-page CSV download, pagination, shared editing from dashboard and Expenses, mobile view/dialog, and missing-migration retry.
- Existing dashboard, task manager, and signed-out authentication browser regressions: passed.

Local database tests use PGlite with simulated Supabase Auth identity. Browser tests intercept API calls. These do not verify the hosted deployment, and no real transactions were created by tests.

## Supabase handoff

1. Run the complete `supabase/migrations/202610310004_expenses.sql` file once in **SQL Editor → New query**. Do not rerun earlier migrations.
2. Refresh the app and open **Expenses**. Existing dashboard transactions should appear under their original months with category `Other`.
3. Add a test transaction, choose a category, and refresh. Verify persistence, then open Overview and confirm its money totals include the same entry once.
4. Edit the entry from the dashboard, return to Expenses, and verify the update. Remove the test entry if it is not real activity.
5. Try month/category/type filters and CSV export. Set or edit an opening balance and weekly budget and confirm that the applicable values also appear in Overview.

The user confirmed the expense migration and testing after this report was first written. Individual scenarios above and hosted account-isolation checks have not been separately confirmed.
