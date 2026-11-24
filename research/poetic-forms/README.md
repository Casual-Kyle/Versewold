# Complete category research

The captured scope is **all 149 direct article members** of [Category:Poetic forms](https://en.wikipedia.org/wiki/Category:Poetic_forms), researched 23 November 2026. The category also points to subcategories; their members are not silently claimed as covered by this snapshot.

The app contains 152 entries: the 149 category records plus the three original named variants Standard Habbie, Shakespearean sonnet, and English 5–7–5 practice. Free verse, sestina, and villanelle reuse their original templates and gain category attribution.

- [catalog.md](catalog.md): readable index and original research notes for every member.
- [inventory.json](inventory.json): source titles, original and resolved page IDs, revision IDs, dates, and attribution URLs. The `Vers libre` redirect is explicitly preserved.
- [coverage.json](coverage.json): complete mapping from source members to runtime IDs, classifications, and support levels.
- [definitions.mjs](definitions.mjs): curated descriptions and explicit layout definitions, used to generate ordinary runtime JSON.

## What the support labels mean

**Structural template** means a selected layout and its relevant targets are serialized. A template may still require manual checks of meaning, tone, internal divisions, or language-specific prosody. **Guided writing** provides a writable canvas and researched directions; it may include a partial layout, but unsupported constraints remain explicit. **Reference** identifies terminology, historical groupings, cultural topics, or books that should not be presented as fixed writing forms. References have no compose action.

Every record was surveyed through its Wikipedia introduction. Full-article details were also read for Tetractys, Cinquain, Pantoum, Paradelle, Pentina, Rondel, Roundel, Terzanelle, Ainggyin, Lutherstrophe, Tuyugh, Kural, and Hudibrastic. Selected institutional cross-checks appear in the runtime source lists. This is a broad encyclopedia-based working survey, not independent scholarly verification of every article. Thinly sourced or disputed descriptions are identified instead of being converted into strict universal rules.

Specific variants are named: the ballad quatrain, four-stanza pantoum, thirteen-line rondel, five-line-envoi chant royal, and short-ending yadu are teaching choices. No attempt is made to identify an entire tradition with one invented numeric pattern. The Tamil kural uses metrical feet, not necessarily a 4/3 whitespace-word split; Japanese morae are distinct from English syllables. The Tetractys article’s poetry section is distinguished from its mathematical subject. The Robert Bridges essay, Paul Fussell book, and Emi Omo Eso cultural topic remain references.

## Rebuilding and extending

From the repository root:

```powershell
node research/scripts/build-form-catalog.mjs
```

Or run `npm run catalog:build` from the application folder, followed by `npm run format`. The generator uses only committed curated data and source metadata; it performs no network requests. It checks coverage and unique IDs before the finished catalog can be considered complete. Tests check the 149-entry coverage contract and known structural distinctions. Runtime JSON is committed and the application does not need to read the research directory.

The fetch scripts are optional research tools. They access the official MediaWiki API, honor category continuation and redirects, pace requests, and retain ignored local evidence under `artifacts/poetic-forms-wikipedia/`. Article introductions and full extracts are working evidence, not runtime content. `fetch-poetic-forms.mjs --refresh` refreshes captured introductions; changing the source inventory requires reviewing and updating the curated definitions, not automatically publishing new templates.

Wikipedia material is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with attribution and history available through each linked source/revision. Catalog summaries and directions are newly written; no complete article text, modern poem examples, illustrations, or dictionary is copied into the app. Language-specific analysis and further specialist corroboration remain follow-up work.
