# 1Life

Personal activity tracker for tasks, AI automation learning, exercise, knowledge, focus time, and money.

Requirements and source documents are in `assets/`.

Start with [the implementation plan](docs/PROJECT_PLAN.md), then follow [the Supabase setup guide](docs/SUPABASE_SETUP.md).

Current stage: all planned application sections are implemented locally. A sourced 180-day package now contains 180 Hadiths, 180 Ayahs, and 180 Duas/adhkar; apply migration eight and use the signed-in loader to populate your library. Arabic originals are included throughout, with Pickthall English for Ayahs. See [online sources and loading instructions](docs/ONLINE_KNOWLEDGE_SOURCES.md). Six sourced English book suggestions are available under Knowledge ? Books, with editable PDF page totals. See [final review and deployment handoff](docs/FINAL_REVIEW.md). Earlier section reports: [Knowledge](docs/KNOWLEDGE_REPORT.md), [Exercise](docs/EXERCISE_REPORT.md), [Learning](docs/LEARNING_REPORT.md), [Expenses](docs/EXPENSES_REPORT.md), [Dashboard](docs/DASHBOARD_REPORT.md), [Tasks](docs/TASK_MANAGER_REPORT.md), [Foundation](docs/FOUNDATION_REPORT.md).

## Run locally

Install Node.js if needed, then run `npm install` followed by `npm run dev`. Open http://localhost:5173. `npm run build` checks TypeScript and creates the production build.

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key. This workspace's `.env.local` is already configured and excluded from Git. Vite uses the `VITE_` prefix rather than `NEXT_PUBLIC_`.

## Vercel deployment

Follow [the Vercel deployment and production checklist](docs/VERCEL_DEPLOYMENT.md). The modern UI uses a shared visual system in `src/modern.css`; the database and saved progress are unchanged.

Bangla translations are displayed beneath all 540 collection entries. See [translation sources and draft status](docs/BANGLA_TRANSLATIONS.md): 463 source-backed translations and 77 visibly labeled Dua drafts pending independent review. No new migration is needed.
#