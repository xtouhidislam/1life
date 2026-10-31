# Add your sourced collection

For the prepared online 180-day collection, use migration eight and **Knowledge → Load 180-day collection** as described in `docs/ONLINE_KNOWLEDGE_SOURCES.md`. The instructions below apply to your own additional/manual imports, which remain pending personal review.

Start with `data/knowledge-import-template.json` or **Knowledge → Import JSON → Download blank JSON template**. Fill it with your sourced material; the blank template itself will not pass validation.

Each array item needs:

- `kind`: `hadith`, `ayah`, or `dua`.
- `title`: a short descriptive title, up to 200 characters.
- `original_text`: the actual original text, up to 12,000 characters.
- `reference`: collection/number or surah/ayah reference, up to 500 characters.
- `source_url`: the full HTTP/HTTPS page you will use to check the entry.
- `translation`: optional text, up to 12,000 characters.
- `translator`: required when a translation is included; record the translator or translation source.
- `grade`: optional grading claim and its attribution, where applicable. Leave it blank when unknown.

Import a JSON array with 1–500 entries. A file upload may be up to 8 MB. Entries with the same collection and case-insensitive trimmed reference are skipped. Existing entries are not overwritten. If an entry fails database validation, the whole batch rolls back.

After importing, filter **Needs source review**, open each entry's source, and review the original text, translation attribution, reference, and any grading claim. Only then choose **Review source → Confirm source review**. Review is individual; there is no bulk switch that treats imported flags as proof.

The source-review workflow records your verification; it does not perform scholarly authentication automatically. The separate online package carries provider-matched source badges and attribution. Add books manually under **Books**, including the total page count for your edition. Log reading there once, then edit or delete those records through Overview's Reading journal.
