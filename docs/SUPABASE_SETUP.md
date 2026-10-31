# Supabase setup from scratch

This is the account setup step. Once the project is available, the implementation will supply the schema migrations, ownership policies, seed/import scripts, and app connection code.

## 1. Create your project

1. Open https://supabase.com/dashboard and sign in or create an account.
2. Create an organization if prompted, then choose **New project**.
3. Name it `1Life`. Generate a strong database password and keep it in your password manager.
4. Choose a nearby available region appropriate for Bangladesh. Review the plan before creating the project.
5. Wait for provisioning to finish.

## 2. Find the application connection details

Open the project's **Connect** panel (or project API settings). Find the project URL and **publishable** API key. Older projects may also expose a legacy `anon` key.

The browser app uses the project URL and publishable key. Authorization comes from the signed-in user and database row-level security. Secret keys and legacy `service_role` keys must never be placed in browser code. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

When the frontend is scaffolded, create `.env.local` in its project root with:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The implementation will provide an `.env.example` and ignore `.env.local` in Git. Do not put the database password or secret API key in these Vite variables.

## 3. Configure sign-in

1. Open **Authentication → Providers / Sign In** and enable email/password authentication.
2. Keep email confirmation enabled; confirm the first user's email when testing sign-up.
3. In **Authentication → URL Configuration**, set the development Site URL to `http://localhost:5173` and allow the corresponding development callback URL if the app requires one.
4. Once hosting exists, add the exact production origin and callback URL and update the Site URL. The final callback route will be provided with the auth implementation.

See [Supabase Auth](https://supabase.com/docs/guides/auth). Authentication establishes identity; RLS policies control which records that identity can access.

## 4. Database setup comes with the foundation section

Do not manually guess the tables or disable RLS to bypass errors. I will supply versioned SQL migrations and instructions for applying them through the SQL Editor or CLI. Each personal table will restrict access using `auth.uid()` and its owner ID. Shared curriculum/reference data will have separate read-only permissions.

Before real data is entered, we will verify anonymous denial and ownership isolation with two test accounts, including attempts to read, change, or delete another account's records. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 5. Next handoff

Create the Supabase project, then provide its project URL. Keep credentials in your local environment configuration; do not send the database password, secret key, or service-role key in chat. The next implementation section is the app foundation and authentication, followed by the task manager.

## 6. Apply the prepared foundation migration

The app is now scaffolded and this workspace's `.env.local` is configured. Project connectivity and email auth settings have been checked successfully.

1. In your project dashboard, open **SQL Editor → New query**.
2. Copy the entire file `supabase/migrations/202610310001_foundation.sql` into the editor and run it once. It creates the profile table and its ownership policies in one transaction. Do not re-run it after success.
3. Run `npm run dev` in this project and open http://localhost:5173.
4. Create your account, open the confirmation email, and sign in. Both the Site URL and allowed redirect URL should include `http://localhost:5173`.
5. The workspace should show **Profile connected to Supabase**. Refresh to check session restoration, then sign out and sign back in.

Only the project URL and publishable key have been supplied. They cannot execute schema migrations. Never provide an administrative key to the frontend to work around this.

Status: foundation code and local checks complete; migration application, real-user sign-in, and two-account database isolation checks remain pending.

Update: the foundation migration was successfully applied, and the user confirmed the local app worked. Authenticated two-account isolation still needs hosted verification.

## 7. Task manager migration

Run `supabase/migrations/202610310002_tasks.sql` once in a new SQL Editor query. Refresh the app and open **Task manager** to initialize your daily targets and routines. Follow the hosted checks in `docs/TASK_MANAGER_REPORT.md`. Do not run the foundation migration again.

Update: the user applied the task migration and confirmed that tasks persist after testing.

## 8. Dashboard migration

Run `supabase/migrations/202610310003_dashboard.sql` once in a new SQL Editor query. Refresh **Overview** to see the dashboard. Use **Log focus**, **Log reading**, and **Log money** to add records. The pencil beside **Your money, in view** sets this month's opening balance and this week's budget. Follow `docs/DASHBOARD_REPORT.md` for hosted checks. Do not rerun either earlier migration.

Update: the user confirmed the dashboard migration and testing.

## 9. Dedicated expense section

Run `supabase/migrations/202610310004_expenses.sql` once in a new SQL Editor query. It preserves the existing ledger and adds category support. Refresh and open **Expenses**. Existing records appear under `Other`; you can change their categories. Follow `docs/EXPENSES_REPORT.md` to verify shared dashboard totals, history, filters, budgets, and CSV export. Do not rerun previous migrations.

Update: the user confirmed the expense migration and testing.

## 10. AI learning tracker

Run `supabase/migrations/202610310005_learning.sql` once in a new SQL Editor query. The file includes all 26 curriculum weeks and 274 checklist items. No separate import or seed command is required. Refresh and open **AI learning**. Week 1 is available, later weeks unlock through completion, and the Projects and Progress tree tabs show the broader path. Follow `docs/LEARNING_REPORT.md` for hosted checks. Do not rerun earlier migrations.

## 11. Exercise section

Run `supabase/migrations/202610310006_exercise.sql` once in a new SQL Editor query. It includes the movement catalog. Refresh and open **Exercise**. Use **Daily workout** to log actual sessions and sets, **Weekly routine** to see the split, and **Plan & progress** to view phases and movement ladders. Follow `docs/EXERCISE_REPORT.md` for hosted checks. Do not rerun earlier migrations.

Update: the user confirmed Exercise and authorized continuing.

## 12. Knowledge section

Run `supabase/migrations/202610310007_knowledge.sql` once in a new SQL Editor query. Refresh and open **Knowledge**. Collections start empty because the assets did not contain the religious texts or book titles. Add sourced entries manually or follow `docs/KNOWLEDGE_IMPORT_GUIDE.md` to import them. Daily cards use entries you explicitly review. Book reading uses the existing dashboard reading journal. Follow `docs/KNOWLEDGE_REPORT.md` for hosted checks. Do not rerun earlier migrations.

## 13. Online collection for 180 days

Run `supabase/migrations/202610310008_online_knowledge.sql` once in a new SQL Editor query, after migration seven. Refresh **Knowledge**, choose **Load 180-day collection**, set your start date, and click **Load collection**. It adds 180 Hadiths, 180 Ayahs, and 180 Duas/adhkar to your account, with one of each per day. Source links and attribution are included. Hadith and Dua text is Arabic; Ayahs also have Pickthall's English translation. See `docs/ONLINE_KNOWLEDGE_SOURCES.md` for provenance and validation. Do not rerun earlier migrations.
