# Knowledge section report

Library functionality is implemented and locally tested. The user subsequently requested online material for 180 days. That 540-entry package and migration eight are now prepared; see `docs/ONLINE_KNOWLEDGE_SOURCES.md`. The original report below describes the manual-library workflow introduced in migration seven.

## Delivered

- Separate Hadith, Ayah, Dua, and Books tabs with the requested collection goals: 180, 180, 30, and six books.
- Personal entries with original text, optional attributed translation, precise reference, source URL, and optional grading/attribution text. Original text supports automatic text direction.
- Search across titles, original text, translations, and references; review and memorization filters; archive/restore; 20 entries per page.
- Source review performed explicitly by the user. Imported/manual entries start pending. Only reviewed, active entries can be marked new/learning/memorized or selected for daily cards. Editing any entry resets its source review while retaining memorization history.
- JSON file/paste import, a downloadable blank template, duplicate reference skipping, and atomic validation. A batch can contain up to 500 entries. Imported review/verification flags are not trusted or copied.
- Dashboard Hadith/Ayah daily cards backed by persistent date-specific selections. The first eligible item is pinned for that Dhaka date, even as the collection grows. Unreviewed or archived selected items are hidden without substituting a different entry that day.
- Books with author, total pages, notes, optional source URL, reading progress, and archive/restore. The six-book goal does not invent book titles.
- Book reading writes directly to the existing `reading_logs` table. One request ID is retained while a reading form is retried, avoiding duplicate entries after an ambiguous save failure. Dashboard reading edits/deletion also recalculate book progress.
- Empty/loading/error/retry states, failed-save input preservation, source links, native modal focus containment, and mobile layouts.

## Content status and meaning of review

Migration seven itself contains no religious texts or book titles. The later online package adds 180 sourced entries of each kind through an explicit signed-in loader. No new religious wording, Hadith/Dua translation, or authenticity grade is generated. The Dua goal is now 180, matching the latest 180-day request.

“Source reviewed” means the account owner confirmed the text, reference, translation attribution, and any grading claim against the recorded source. The app does not independently authenticate a Hadith or endorse a translation. A source URL is validated for format and protocol; the server does not fetch or verify that page's contents automatically.

The library can be populated with the new online package, manual entry, or an existing sourced collection using `data/knowledge-import-template.json`. The book list is still user-selected. Online-source badges identify matched upstream content; personal source review remains a separate workflow.

## Backend and reading behavior

Migration `202610310007_knowledge.sql` adds owner-scoped items, memorization states, daily selections, and books. The existing reading table gains a nullable, ownership-constrained book reference. Previous dashboard reading entries remain unchanged and continue contributing to totals.

Guarded functions perform library writes; ordinary accounts cannot directly mark an entry reviewed or bypass the review requirement through table writes. Account ownership is enforced on every operation. The daily function scopes selection to the caller and serializes selection initialization through the caller's profile row.

Archiving preserves progress, sources, and reading history. Book page totals may exceed the page count when rereading; the displayed progress bar caps at 100%. The dashboard is the place to edit/delete a reading log. Memorization progress and reading logs do not automatically complete fixed daily tasks.

## Verification

- TypeScript and production build: passed.
- `npm test`: all prior suites and the Knowledge PostgreSQL suite passed.
- Knowledge database checks include input/source constraints, draft/review/progress gates, stable same-day selection, review invalidation after edits, retained memorization history, archive/restore, duplicate-safe atomic import, ignored imported verification flags, pagination, shared dashboard/book pages, idempotent reading requests, reading edits/deletion, cross-account access rejection, and anonymous denial.
- Browser checks using a mocked API passed manual entry, failed-save recovery, source review, memorization, editing/review invalidation, archive/restore, pending JSON imports, pagination/search, all four tabs, book reading/editing, mobile views/dialog, missing migration retry, and no browser exceptions.
- Existing authentication, task, dashboard, expense, learning, and exercise browser regression checks passed after integration.

The tests use isolated PGlite PostgreSQL with simulated Auth identity or intercepted browser API requests. Synthetic test fixtures are explicitly nonreligious and are not shipped as library content. Tests do not write to the hosted project. Hosted persistence, real-project RLS, and daily rollover behavior still require verification.

## Supabase handoff

1. Run the complete `supabase/migrations/202610310007_knowledge.sql` once in **SQL Editor → New query**. Do not rerun earlier migrations.
2. Refresh and open **Knowledge**. Confirm the four empty collections and their target counts.
3. Add a real entry you can check against a source, including original text, reference, and URL. Save, refresh, and confirm persistence. If adding a translation, include the translator/source attribution.
4. Choose **Review source**, open its link, check its contents, and confirm review. Set memorization progress and refresh to verify persistence.
5. Return to Overview. Reviewed Hadith/Ayah entries should populate the daily cards when available. Edits invalidate review and hide that daily item until it is reviewed again.
6. Add a book and log pages once. Confirm its progress and Overview's weekly pages increase together. Edit/delete that reading entry in Overview if it was a test.

Application sections from the original plan are implemented locally. The later online package supplies 180/180/180 entries; its hosted installation, the user's book list, remaining hosted checks, and deployment remain separate work. This report does not mark the entire original project complete.
