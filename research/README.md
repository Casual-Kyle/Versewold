# Poetry research for Versewold

Researched 23 November 2026. These are design notes and source references, outside the Tauri project. They are not bundled into the desktop application.

Start with:

- [Complete poetic-forms survey](poetic-forms/catalog.md): all 149 direct members of the supplied Wikipedia category, with original guidance, classification, source attribution, selected variants, and explicit limitations. Its [inventory](poetic-forms/inventory.json) records page IDs and revisions; [coverage](poetic-forms/coverage.json) maps every entry to runtime JSON.

1. [Sound and phonetics](01-sound-and-phonetics.md): consonants, vowels, consonance, assonance, pronunciation data, and uncertainty.
2. [Rhyme and meter](02-rhyme-and-meter.md): phonetic rhyme keys, rhyme scope, feet, scansion, and useful engine boundaries.
3. [Forms and variants](03-forms-and-variants.md): six starter forms and the distinctions their templates exercise.
4. [Template format](04-template-format.md): the implemented, versioned JSON contract and an authoring example.
5. [Analysis roadmap](05-analysis-roadmap.md): a proposed offline linguistic pipeline and realistic acceptance cases.
6. [Sources](sources.md): primary institutions, dictionary maintainers, and technical documentation.

Personalization behavior, its writing-app references, and the roaming JSON contract are documented separately in [personal preferences](../docs/preferences.md). These application settings are distinct from poetry-form templates and manuscript files.

The application implements a starter library, template validation, structural guidance, project management, and readable JSON/Markdown persistence in the shared roaming app folder. It does **not** yet implement dictionary lookup, phonetic rhyme detection, syllable counting, automatic scansion, or publishing exports. Those research recommendations are separated from implemented behavior throughout these notes.

The user's request for JSON/Markdown storage supersedes the SQLite recommendation in the supplied design proposal. That proposal is reference material, not a separate set of instructions.
