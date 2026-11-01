# Bangla translations — 1 November 2026

Every item in the original 540-entry collection now has a Bangla display translation immediately beneath its Arabic text, both in today's reader and in library details. The translation sidecar is shipped with the frontend and requires no new database migration or reinstallation of the plan. Update/redeploy the app to see it.

Existing Arabic text, stored English translations, memorization progress, review flags, plan dates, and personal records are unchanged. The sidecar applies only when both collection/reference and the entire original Arabic string match. Edited or unrelated personal items do not receive an automatically substituted translation. A personal entry whose existing translation is Bangla displays that text instead, with its own attribution.

## Coverage and source status

| Kind | Entries | Source |
| --- | ---: | --- |
| Ayah | 180 | Muhiuddin Khan Bengali edition, quran-json 3.1.2, sourced there from Tanzil.net; CC BY-SA 4.0 |
| Hadith | 180 | fawazahmed0/hadith-api, `ben-bukhari`, revision `df57907be35291c91ad6a6691180e22ca9920784`; repository Unlicense. The dataset does not identify the Bengali translator; the UI says so. |
| Dua/adhkar | 103 | ThelightHub/dua-api, Hisnul Muslim book 1. Arabic matches after removing vocalization and punctuation; no fuzzy matching. Provider README states MIT; translator is not identified. |
| Dua/adhkar | 77 | Original AI-assisted Bangla drafts for wording variants and instructional entries. Each is visibly labeled **খসড়া—পর্যালোচনা প্রয়োজন** and independent review is pending. These are not attributed to iHadis or a published scholar. |

The draft flag is independent of the original source-review badge: the badge refers to the existing Arabic dataset match, not approval of the new Bangla draft. The current package does not contain verified iHadis translations.

Source links:

- https://www.npmjs.com/package/quran-json/v/3.1.2
- https://github.com/risan/quran-json
- https://github.com/fawazahmed0/hadith-api
- https://github.com/ThelightHub/dua-api
- https://dua-api.hisnul.workers.dev/api/books/1/chapters

Bangla is rendered as plain text, with `lang="bn"`, left-to-right direction, and the Bengali font already used by Knowledge. Credits and source links follow each translation. Existing English, when present, appears afterward. Loading failures show a retry action rather than silently hiding the missing text.

## Rebuilding and checking

1. `node scripts/fetch-bangla-sources.mjs` caches Dua chapter responses and optional QuranEnc research responses. The research responses are not used in the shipped package.
2. The pinned Bengali Bukhari JSON and quran-json 3.1.2 Bengali file must be present in the ignored source cache. Their hashes are recorded in `data/online-knowledge/bangla-manifest.json`.
3. `python scripts/build-bangla-knowledge.py` builds the sidecar from those snapshots and the explicit draft file. It does not update migration 008 or the original collection.
4. `node scripts/test-bangla-knowledge.mjs` checks all 540 mappings, Arabic preservation, source credits, and draft labels. Browser checks verify placement, Bangla rendering, tab changes, and mobile layout.

The generated sidecar and manifest are tracked; raw source caches remain ignored. Publish the frontend update to Vercel; do not rerun migration 008 to add these translations.
