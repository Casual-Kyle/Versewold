# Version 1 template format

This is an implemented declarative format. Templates are data, not JavaScript, and never execute code. The schema is the source of truth:

- `Versewold/src/domain/forms/poetry-form.schema.json`
- TypeScript types in `Versewold/src/domain/forms/types.ts`
- Semantic reference checks in `Versewold/src/domain/forms/validate.ts`
- Six complete examples in `Versewold/src/domain/forms/templates/`

## Where a template goes

For development, add a `.json` file to the bundled templates directory. Vite discovers it automatically. For the native app, put a custom `.json` file in `%APPDATA%\com.client.versewold\forms\` and choose **Preferences → Files & storage → Reload custom forms**. Custom IDs must not duplicate bundled or other custom IDs. There is no browser-only persistence or file import.

Custom files are limited to 1 MiB. Schema limits bound stanza and line counts. Unknown properties and unsupported versions fail validation. Invalid custom templates leave the last valid library in place and show a visible error; they do not prevent editing Markdown. The schema validator is generated ahead of time, so native Content Security Policy does not require `unsafe-eval`.

Two optional version 1 fields help author variants: `catalog.variants` lists available template IDs to offer as more specific choices, and `structure.lineMapping: "poem"` maps a fixed sequence across visual stanza breaks. The latter is used by the Shakespearean sonnet to guide all fourteen lines without requiring printed quatrain gaps. It is valid only for fixed sequences; omitted mapping keeps stanza-based behavior. Guided view reports notes-only, layout-only, or line-by-line support from the declared rules, and unprescribed rhyme positions use a dash rather than an invented rhyme group.

## Minimal custom example

This invented practice form is an authoring example, not a historical claim. A ready-to-load file is in [examples/my-iambic-couplet.json](examples/my-iambic-couplet.json):

```json
{
  "schemaVersion": 1,
  "id": "my-iambic-couplet",
  "name": "My iambic couplet practice",
  "language": "en",
  "origin": "Personal exercise",
  "summary": "Two rhyming lines with a gentle four-beat movement.",
  "tags": ["practice", "rhymed"],
  "notes": ["Read aloud; use the pattern as a guide."],
  "sources": [
    {
      "title": "Background: poetic meter",
      "url": "https://www.poetryfoundation.org/education/glossary/meter"
    }
  ],
  "structure": {
    "kind": "repeating",
    "rhymeScope": "stanza",
    "stanzas": [
      {
        "label": "Couplet",
        "lines": [
          {
            "rhyme": "A",
            "meter": {
              "system": "accentual-syllabic",
              "pattern": "u/",
              "feet": 4,
              "strength": "conventional"
            }
          },
          {
            "rhyme": "A",
            "meter": {
              "system": "accentual-syllabic",
              "pattern": "u/",
              "feet": 4,
              "strength": "conventional"
            }
          }
        ]
      }
    ]
  }
}
```

## Contract

| Field                                   | Meaning                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                         | Exactly `1`; future incompatible fields require a migration.                                                     |
| `id`                                    | Stable lowercase letters/digits/hyphens, up to 80 characters. A project stores this reference.                   |
| `language`                              | Declared language tag for human context and future providers; v1 only checks string length, not BCP 47 validity. |
| `origin`, `summary`, `notes`, `sources` | Plain text provenance and guidance. Source URLs must use HTTPS.                                                  |
| `structure.kind`                        | `fixed`: listed blocks; `repeating`: exactly one repeatable block; `free`: no prescribed blocks.                 |
| `rhymeScope`                            | `stanza` resets sounds each stanza; `poem` shares sounds throughout.                                             |
| `rhyme`                                 | Shared sound label, independent of text repetition. Omit for an unconstrained line.                              |
| `refrain`                               | ID and `define`/`repeat` role; every repeat must follow its unique definition.                                   |
| `endWord`                               | A recurring word-identity label. It does not mean that words rhyme.                                              |
| `containsEndWords`                      | Labels of end-words to appear internally, used by the sestina envoi. Labels must exist.                          |
| `meter.system`                          | `accentual-syllabic`, `syllabic`, `accentual`, `quantitative`, `moraic`, or `free`.                              |
| `meter.pattern`, `feet`                 | Basic foot and repetition count; required for accentual-syllabic rules.                                          |
| `meter.syllables`                       | Positive target count, required for syllabic rules.                                                              |
| `meter.strength`                        | `required`, `conventional`, or `optional`, always supplied when a meter rule exists.                             |

Rhyme letters stay visible alongside colors. An entire line can have a refrain, an end-word relationship, and a meter target at the same time. Omitted constraints must not be converted into invented requirements.

The inspector renders these rules and checks layout and declared whitespace-delimited word counts. It does not yet compare actual refrain text, repeated end-words, rhyme sounds, mora counts, syllable counts, or meter. Template selection changes guidance, never the existing manuscript.

## Extended catalog and language-aware targets

The expanded catalog keeps the original required version 1 fields and adds optional fields; old version 1 custom files still validate in the updated app. Older builds with the earlier strict schema will reject templates using the new fields. This is read compatibility with existing files, not a claim of forward compatibility with old binaries.

| Field                   | Meaning                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `catalog.kind`          | `form`, `tradition`, `technique`, `concept`, or `reference`.                           |
| `catalog.status`        | `structured`, `guided`, or `reference`; references cannot be selected for composition. |
| `catalog.aliases`       | Alternative names included in accent-insensitive search.                               |
| `catalog.researchedOn`  | Survey date, accompanied by source page/revision IDs when available.                   |
| `catalog.limitations`   | Specific missing constraints, evidence limitations, or selected-variant boundaries.    |
| `structure.unit`        | `line` for a continuous repeatable metrical line, otherwise a stanza unit.             |
| `structure.maxStanzas`  | An optional maximum suggested count, used by the selected yadu variant.                |
| `wordCount`             | Whitespace-delimited word-count target for a line, distinct from metrical feet.        |
| `internalRhymes`        | A list of `{ "group": "A", "syllable": 4 }` targets within a line.                     |
| `meter.beats`           | Stress count for the `accentual` system.                                               |
| `meter.morae`           | Mora count for the `moraic` system; not English syllables.                             |
| `meter.quantityPattern` | A base quantitative sequence: `-` long, `u` short, `x` anceps.                         |

The full [149-entry survey](poetic-forms/catalog.md) records the classification, sources, variant, and limitations behind every category member. Runtime files remain ordinary offline JSON. Internal-rhyme positions and sound targets are displayed for the writer, without claiming automated linguistic validation. Quantitative base patterns do not encode every permitted substitution or caesura.

## Versioning boundaries

The app currently stores `formId`, not a frozen template revision. Modifying or removing a custom template can therefore change or remove guidance for existing poems; Markdown remains intact and the app displays a missing-template message. A later migration should add a template revision/hash and project-local snapshot before template editing becomes a product feature.

Repetition means one repeatable stanza or continuous line, not an arbitrary programming loop. The research generator expands selected linked-stanza patterns into ordinary bounded refrain definitions before the editor loads them. Never introduce executable expressions, arbitrary filesystem access, or a form-specific branch inside Vue components.
