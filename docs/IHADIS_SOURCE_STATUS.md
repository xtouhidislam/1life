# iHadis source request — 1 November 2026

Requested: replace the existing collection's sources with iHadis Bengali material, and move the daily entries from Dashboard to the Knowledge heading.

Implemented: a daily reader at the top of Knowledge, with Hadith/Ayah/Dua tabs, Arabic text, the stored translation and its credit, original source link, plan day, keyboard navigation, and previous/next controls. Dashboard no longer fetches or displays daily knowledge. Library changes and plan installs refresh the daily reader. Existing daily selection and per-user data rules remain in the database.

Source research:

- https://ihadis.com/bn exposes Hadith pages with Arabic, Bengali, and references.
- https://ihadis.com/bn/projects explicitly links its separate Quran and Dua projects: https://quranmazid.com and https://duaruqyah.com.
- Direct automated requests to iHadis and its robots/credits pages returned HTTP 403 in this workspace. Some pages could be read through indexed web results, but that is not a reliable complete export.
- The home page displays an all-rights-reserved notice. No reusable bulk export/API or explicit license for the Bengali corpus was verified.

The existing 540-entry catalog and its attribution have therefore not been replaced or relabeled as iHadis content. Knowledge includes outbound links to all three IRD sites for direct Bengali reading. No new migration is required for this UI change.

To complete the corpus replacement, obtain an authorized export or documented API from IRD that supplies Arabic text, Bengali translation, translation/publisher credits, collection identifiers, and canonical URLs. The existing JSON importer accepts sourced entries; an export can be mapped to that schema and, for the scheduled collection, included in a new migration that preserves private memorization history. Do not rerun or modify the already-applied migration 008 to replace users' saved records.
