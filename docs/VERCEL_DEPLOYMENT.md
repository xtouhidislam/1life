# Deploy 1Life to Vercel

This is a React + Vite static frontend. Supabase continues to host authentication and the database. Vercel does not run the SQL migrations. No new database migration is needed for the UI refresh.

## 1. Upload the source to GitHub

Create a private GitHub repository, then use GitHub Desktop: **File → Add local repository**, select this `1Life` folder, commit any remaining changes, and **Publish repository** to GitHub with **Keep this code private** checked. If Desktop reports the folder is not a repository, choose its create-repository option for this folder.

This workspace was previously published through Sites. Keep that connection separate: if using Git commands, add your GitHub repository as a separate remote (for example `github`) instead of replacing another deployment remote.

Commit `src/`, `supabase/`, `data/` (except ignored source caches), `scripts/`, `assets/`, `docs/`, `.env.example`, `.gitignore`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, and `vercel.json`. Let Git respect `.gitignore`: `.env.local`, `node_modules/`, and `dist/` stay out of GitHub. The `.openai/hosting.json` file belongs to the earlier Sites deployment; Vercel does not use it.

## 2. Import into Vercel

In Vercel choose **Add New → Project**, connect GitHub, and import the repository. Use:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `./` (the directory containing `package.json`) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

The tracked `vercel.json` supplies the build/output settings and page-refresh fallback. Keep Vercel's supported default Node version.

Before clicking Deploy, add these variables for Production and Preview. Copy their values from your local `.env.local` or the Supabase project connection dialog:

```text
VITE_SUPABASE_URL=https://pvsvswcfolyyjhzggbrx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable key>
```

The app specifically reads these `VITE_` names. A publishable key is intended for browser use; never substitute a service-role key. Vite embeds the values during the build: after changing environment variables, redeploy.

## 3. Configure Supabase authentication

After Vercel gives you the stable production domain, open **Supabase → Authentication → URL Configuration**:

1. Set **Site URL** to `https://YOUR-PROJECT.vercel.app` (or your final custom domain).
2. Add that exact origin to **Redirect URLs**. The app returns confirmation/recovery emails to the root origin.
3. Retain `http://localhost:5173` and `http://127.0.0.1:5173` for local development.
4. If testing auth on a preview deployment, add its exact origin too. Prefer exact production URLs over broad wildcard allowances.
5. Save. Request a fresh confirmation/recovery email after making changes; older email links may still contain the earlier destination.

Do not paste the Vercel URL into the frontend Supabase URL variable: that variable must remain your `supabase.co` API origin.

## 4. Confirm database setup

If migrations 001–008 have already succeeded in the same Supabase project, do not run them again. If starting with a fresh project, run each complete migration once in filename order in SQL Editor, through its `commit;`. In particular, migration 008 has a large single JSON payload: selecting only the visible beginning will not install the complete collection.

After migration 008, run this read-only check in SQL Editor:

```sql
select kind, count(*) as items, min(day) as first_day, max(day) as last_day
from public.knowledge_online_catalog
group by kind order by kind;
```

Expected: `ayah`, `dua`, and `hadith`, each with 180 items, first_day 1, last_day 180. This checks the shared catalog. Each account must still use **Knowledge → Load 180-day collection** and select its start date to install its personal copies.

## 5. Verify the production app

Use the actual Vercel URL, not localhost, for these checks:

| Check | Expected result |
| --- | --- |
| Open in a private browser window | Sign-in page; personal records are hidden |
| Sign in and refresh | Session remains; dashboard loads |
| Add a temporary task, complete it, refresh | Saved state persists; remove the temporary task afterward |
| Add one temporary reading/focus entry | Shared dashboard total updates once; delete the test entry afterward |
| Open Expenses | Correct month, categories, budget controls and CSV export |
| Open AI learning | Week 1 available initially; later weeks remain locked until prerequisites are completed |
| Open Exercise | Routine matches Dhaka day; Sunday is full rest |
| Load the online collection | 180 items in each collection, and daily cards match your plan date |
| Books | Six source suggestions; adding one starts with zero reading progress |
| Forgot password | Fresh email returns to the Vercel domain and opens the new-password form |
| Phone width | Navigation scrolls horizontally; forms remain usable; no page overflow |
| Sign out | Workspace disappears; reopening requires sign-in |

For a stronger ownership check, use a second account in a separate browser profile and verify the first account's private tasks, finances, logs, and progress do not appear. Automated isolation checks run locally; they do not substitute for confirming the hosted project's migrations and settings.

## Troubleshooting

- **Missing connection details / blank sign-in:** check both Vercel environment variable names and redeploy; inspect the browser console and Vercel build log.
- **Database setup needed:** apply the corresponding missing migration to the Supabase project configured in Vercel.
- **Emails return to localhost or Sites:** update Supabase Site URL and allowed redirects, then request a new email.
- **Invalid login credentials:** use your Supabase app account, not Vercel or GitHub credentials; confirm your signup email if required.
- **Old UI:** verify the correct GitHub branch deployed, redeploy its newest commit, and refresh the page.

Reference: [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite), [Git deployments](https://vercel.com/docs/git), [environment variables](https://vercel.com/docs/environment-variables), and [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
