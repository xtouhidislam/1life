# UI refresh — 1 November 2026

The supplied reference informed the rounded surfaces, compact pill navigation, warm neutral background, oversized figures, and restrained yellow accents. The implementation retains 1Life's own content and workflows. Desktop uses a horizontal navigation bar; mobile keeps every section accessible through horizontally scrolling navigation.

The shared visual system is in `src/modern.css`. It styles authentication and all six sections, including form dialogs, keyboard focus, reduced-motion preferences, and mobile layouts. No database migration or data conversion is required.

Verified:

- `npm run build`: TypeScript and production Vite build pass.
- `npm test`: all seven database suites pass.
- Browser checks: authentication, dashboard, tasks, knowledge, learning, exercise, and expenses pass, including their mobile/dialog checks and failed-save recovery cases. Authenticated browser tests use mocked Supabase responses.
- Desktop and mobile dashboard screenshots inspected; fixtures in those screenshots are test data.

Vercel configuration and instructions are in `vercel.json` and `docs/VERCEL_DEPLOYMENT.md`. The refreshed version is prepared locally for the user's requested Vercel deployment. It has not been deployed to Vercel from this workspace. The previously published Sites version remains the earlier design until separately updated. Hosted email redirects, real-account persistence, and the hosted database setup require verification at the final Vercel URL.
