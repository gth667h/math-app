# Math App

Live app: https://gth667h.github.io/math-app/

## Spanish practice

The Spanish button opens eight modes: English-to-Spanish sentences, Spanish-to-English sentences, verb conjugation, nouns, adjectives, pronouns, conjunctions, and adverbs.

`spanish-data.json` contains a fallback copy of the starter data and the IDs of eight Spanish tabs in the existing Math App workbook. On opening Spanish, the app reads their published CSVs. Edit **English**, **Spanish**, and **Notes** in the word/sentence tabs. The conjugations tab has one row per English verb and tense, with five subject columns. Supported tense keys are `present`, `preterit`, `imperfect`, `future`, `imperative`, `perfect`, and `progressive`. Keep the headers and tab IDs unchanged. New verbs also need their seven conjugation rows.

Select or type an English entry, translate/reveal it, then self-grade. New text is translated through the public MyMemory API (500 UTF-8 bytes per request; anonymous daily limits apply). Translation errors offer manual Spanish entry. Existing saved entries reveal their stored translation without sending it to the translation service. Machine translations may need correction. No credentials are embedded in the app.

### Review rules

- Right: due one calendar month later, with dates clamped to the last valid day of the next month.
- Wrong: due after five **other graded Spanish questions**, counted across modes and sessions. Reveal, navigation, and repeated clicks do not count.
- Due entries are chosen randomly. Returning from a graded card opens a due review when one exists; the menu also provides a review button. Reviews require opening and using the app; there are no background notifications.
- English sentence identity is shared between the two translation directions. Each verb/tense set has its own review record and one grade for all five subjects.
- Future reviews are excluded from random practice; manual selection remains available.

New entries and review history persist in local storage on the current browser/device, not in Google Sheets. Download/restore JSON backups to transfer them. Restore merges entries and rebases question-count deadlines; incoming records take precedence for matching keys. The static GitHub Pages app has no authenticated Sheets write endpoint, so automatic writes back to the workbook are not implemented.

Imperatives are affirmative commands: no `yo` form, then `tú`, formal `usted`, `nosotros`, and `ustedes`. The perfect is present perfect and the progressive is present progressive. `Friendly` is retained in the requested pronoun list with an adjective note. `Both` uses the conjunction construction `tanto … como …`, with a note about `ambos/ambas`.

## Validation

`spanish-tests.js` is a browser smoke suite, loaded only by a local development harness. It verifies review deadlines, all modes, tense navigation, grading, additions, duplicate prevention, translation failure/manual entry, and the original multiplication mode. It posts its result to `/test-report`. Production `index.html` does not load it.
