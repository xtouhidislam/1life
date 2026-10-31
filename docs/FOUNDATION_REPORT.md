# Foundation report

## Delivered

- React/TypeScript/Vite project with a responsive green-and-ivory interface.
- Supabase configuration in Git-ignored `.env.local`; reusable `.env.example`.
- Email/password sign-in and sign-up, email confirmation messaging, password reset/recovery, sign-out, and persisted session handling.
- Signed-out workspace guard and navigation for the five planned sections.
- Clear empty states instead of fabricated personal statistics.
- Dhaka date display and a live profile connection status.
- Transactional SQL migration with profile constraints, foreign key to Auth, least-privilege grants, and ownership policies for all CRUD operations.

## Verification

- Dependency install: passed; npm reported zero vulnerabilities.
- TypeScript and production build: passed (`npm run build`).
- Local development server: HTTP 200.
- Headless Microsoft Edge checks: signed-out workspace unavailable, sign-up/reset/sign-in form switching, minimum sign-up password length, no horizontal overflow at 390px, no browser exceptions. Passed using `scripts/check-ui.cjs` with the workspace-provided Playwright module.
- Live Supabase Auth settings: HTTP 200; email enabled; automatic email confirmation disabled.
- Initial anonymous profile endpoint probe: HTTP 404 before migration. After the user ran the migration successfully, the same signed-out probe returned HTTP 401 Unauthorized, confirming anonymous access is denied. Authenticated ownership policies remain unverified.

## Pending before marking the foundation complete

The user applied `supabase/migrations/202610310001_foundation.sql` successfully through Supabase SQL Editor. Next verify account creation, email confirmation, sign-in/out, refresh/session restoration, and password recovery with a real email address.

With two test accounts, verify each can create/read/update/delete its own profile, cannot read/update/delete the other's profile, and cannot insert a profile owned by the other account. These authenticated checks have not been performed. Signed-out API access was checked and denied after migration.

No real accounts were created and no email was sent during automated checks. The other sections remain planned. Continue with the task manager after the foundation's live checks pass. No hosted deployment has been created at this stage.

## References

Auth behavior follows [Supabase password-based Auth](https://supabase.com/docs/guides/auth/passwords) and [auth event handling](https://supabase.com/docs/reference/javascript/auth-onauthstatechange). Database access follows [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
