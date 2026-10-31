# Final implementation review — 31 October 2026

All six application sections are implemented: dashboard, tasks, learning, exercise, knowledge, and expenses. Migration 008 supplies the online 180-day collection (540 entries). Apply each migration once in sequence; loading the collection is a separate signed-in action in Knowledge.

## Six-book shelf

Knowledge → Books → Choose from six short Islamic books offers metadata and links. Add a suggestion to open the ordinary editable book form, then save. Existing matching source/title entries, including archived books, are marked already in the library. Restore archived books through the Archived filter. No new migration is needed. Reading starts at zero and uses the shared dashboard journal.

The following English PDF editions were checked online on 31 October 2026. Counts are PDF pages, including covers and front matter, rather than printed page labels. Change the total when reading a different edition. Only metadata and links are included in the app; copyrighted book contents are not copied or redistributed.

| Book | Author | PDF pages | Source |
| --- | --- | ---: | --- |
| The Forty Hadith of al-Imam an-Nawawi | An-Nawawi; explanatory notes by Umm Muhammad | 107 | [IslamHouse PDF](https://d1.islamhouse.com/data/en/ih_books/single2/en-hadith-nawawy-sahih.pdf) |
| Hisn Al-Muslim (Fortress of the Muslim) | Saeed ibn Ali ibn Wahf al-Qahtani | 159 | [IslamHouse PDF](https://d1.islamhouse.com/data/en/ih_books/single/risala_en_hisnulmuslim.pdf) |
| Useful Ways of Leading a Happy Life | Abdur-Rahman ibn Nasir as-Sadi | 40 | [IslamHouse PDF](https://d1.islamhouse.com/data/en/ih_books/single2/en_useful_way_of_leading_happy_life.pdf) |
| The Three Fundamental Principles of Islam and Their Proofs | Muhammad ibn Abdul-Wahhab | 30 | [IslamHouse PDF](https://d1.islamhouse.com/data/en/ih_books/single/en-the-fundamentals-of-islam.pdf) |
| What Every Muslim Must Know about Purification | Abdul Rahman Abdul Karim Al-Sheha | 103 | [IslamHouse PDF](https://d1.islamhouse.com/data/en/ih_books/single/en_What_Every_Muslim_Must_Know_about_Purification.pdf) |
| A Brief Illustrated Guide to Understanding Islam | I. A. Ibrahim | 80 | [Book's website PDF](https://www.islam-guide.com/islam-guide.pdf) |

## Verification

- Production build and TypeScript checks pass.
- All seven database test scripts pass, covering daily boundaries, totals, imports, locks, ownership isolation, and anonymous denial in local PostgreSQL/PGlite.
- Knowledge browser checks pass against mocked Supabase responses, including suggestion prefill/save, saved-book detection, reading/edit flows, mobile fit, and error recovery.
- The online collection's source comparison is documented in ONLINE_KNOWLEDGE_SOURCES.md.

## Production handoff

The app uses the existing Supabase project. Publication does not apply migrations or copy personal records. In Supabase Authentication → URL Configuration, set Site URL to the deployed origin and add that origin to allowed Redirect URLs; retain http://localhost:5173 for local development. Email confirmation and password recovery use the current app origin.

Still requiring real-account verification: sign in at the deployed URL, confirm a saved task survives refresh, confirm the installed collection has 180 of each kind, and test an email recovery link. Two-account isolation has been tested locally; it has not been exercised using two real hosted accounts. No personal passwords or administrator key are needed by this repository.
