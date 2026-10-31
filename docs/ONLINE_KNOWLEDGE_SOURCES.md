# 180-day sourced knowledge collection

Prepared on 31 October 2026 for 1Life: **180 Hadiths, 180 Ayahs, and 180 Duas/adhkar**, arranged as one of each on Days 1–180. This extends the original 30-Dua goal to the user's latest request for 180 days.

## Sources and selection

### Ayahs

Arabic is the unchanged `quran-uthmani` text from [Al Quran Cloud](https://alquran.cloud/api), attributed to the [Tanzil Project](https://tanzil.net). English is Marmaduke Pickthall's 1930 translation, edition `en.pickthall`; the historical edition is identified at [Wikisource](https://en.wikisource.org/wiki/The_Meaning_of_the_Glorious_Koran).

The selection starts with Al-Fatihah and then follows complete verses within short surahs, beginning with An-Naas and working backward through surahs. The last selected reference is Quran 92:16. This is a practical study sequence rather than a ranking of the most important verses. The final selected surah is partial. Quran references are unique; repeated wording at different verse references is preserved.

Arabic orthography, diacritics, and the provider's inclusion of the basmalah in first-verse records are preserved. No verse text is rewritten or shortened. The Tanzil notice is included in each Ayah's provenance and in `data/online-knowledge/licenses/TANZIL-NOTICE.txt`. Its [text license](https://tanzil.net/docs/text_license) requires verbatim reproduction and source attribution. [Al Quran Cloud's terms](https://alquran.cloud/terms-and-conditions) are retained with the source materials.

### Hadiths

The Arabic Sahih al-Bukhari edition comes from [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api), pinned to the Git commit recorded in `data/online-knowledge/manifest.json`. Each entry has its own pinned source JSON URL, Arabic Hadith number, book/section number, and in-book reference.

The selection rotates through belief, knowledge, good manners, invocations, heart-softening, oneness of Allah, and revelation chapters, preferring complete narrations of 60–700 characters. Chains of narration are retained. Duplicate full texts are excluded. This is a thematic sampling, not an independent scholarly selection or grading.

No modern English Hadith translation has been republished or generated. Hadith translation and grade fields are blank. The collection name is recorded as its source; the app does not invent individual grades. The repository's Unlicense notice is included under `data/online-knowledge/licenses/`.

### Duas and adhkar

Arabic supplications and remembrance entries come from [asellam/HisnElMuslim](https://github.com/asellam/HisnElMuslim), a transcription of Hisn al-Muslim by Abdellah SELLAM. The source describes its comparison against a printed edition and another transcription. Its MIT license notice is preserved in `data/online-knowledge/licenses/hisn-mit.txt`.

The selection rotates across source chapters before taking additional entries from each chapter. It contains 180 distinct Arabic texts with their original references, chapter/entry identifiers, and repetition counts in provenance. Some entries are adhkar or Quran recitation passages rather than petition-style supplications, as in the source book. The original text is retained without abbreviation. No English Dua translation or new authenticity grade has been generated.

## Files

- `data/online-knowledge/collection-180.json`: the complete 540-entry, day-numbered source package.
- `data/online-knowledge/hadith-180-import.json`, `ayah-180-import.json`, and `dua-180-import.json`: individual 180-entry backups compatible with ordinary JSON import. Ordinary import leaves them pending review and does not install the dated schedule.
- `data/online-knowledge/manifest.json`: provider URLs, pinned revisions, byte counts, SHA-256 checksums, and selection notes.
- `data/online-knowledge/verification.json`: verification outcome.
- `data/online-knowledge/licenses/`: retained attribution, notices, and terms.
- `supabase/migrations/202610310008_online_knowledge.sql`: embeds the package, so loading it does not depend on live third-party APIs.

Full downloaded source corpora are cached locally under the Git-ignored `source-cache/` directory; the selected package and its provenance are tracked. Rebuild with `node scripts/build-online-knowledge.mjs`, then `node scripts/seed-online-knowledge.mjs`. Changes after applying migration 008 require a new migration.

## Validation

- All 540 Arabic texts compare exactly with their downloaded source records.
- All 180 English Ayah translations compare exactly with their source edition.
- Each of the 180 individual Hadith source URLs was fetched and returned the matching Arabic narration. The final URLs use pinned raw GitHub files; a CDN used during discovery intermittently rejected requests, so that CDN is not required by the saved entries.
- Each collection has exactly 180 distinct references and one entry for each Day 1–180. Hadith and Dua full texts are also deduplicated using normalization only for comparison; saved Arabic text is unchanged.
- Database tests pass installation, repeat installation without duplicates, saved memorization preservation, private account isolation, conflicting-text protection, start-date changes, Days 1/2/180, and dates before/after the plan.
- Browser checks pass loading, failed-install retry, counts, source badges, memorization, license display, start-date changes, mobile sizing, and previous manual-library/dashboard functionality.

These are provenance and application checks. They are not independent scholarly authentication, and the app labels provider-matched records **Online source checked** instead of falsely recording a personal review. Editing an online item removes that badge and requires a fresh personal source review before memorization/daily display.

## Load into your library

1. Run the complete `supabase/migrations/202610310008_online_knowledge.sql` once in **Supabase → SQL Editor → New query**. Migration 007 must already be applied. Do not rerun earlier migrations.
2. Refresh and open **Knowledge → Load 180-day collection**.
3. Choose your start date and click **Load collection**. This copies the 540 entries into your signed-in account's library in one transaction.
4. Return to Overview. During the plan, Hadith, Ayah, and Dua cards follow the same day number. Before the start or after Day 180, the card indicates the plan's status.

Reinstalling preserves record IDs and memorization progress. Differing text at an existing matching reference is never overwritten; resolve that conflict explicitly if reported. Archiving or editing an assigned entry can leave that day's card empty until it is restored/reviewed. Changing the plan start resets today's selection to the new schedule; ordinary refreshes do not change it.

Hosted installation remains pending until the migration and signed-in loader are run. No account credentials or administrative key were available to apply it automatically from this workspace.
