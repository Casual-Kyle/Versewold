# Poem planning and collection browsing

Open **Planning** below a document's Details to set a tone, assign collection themes, and keep revision notes. Tone and notes save through the existing autosave queue. Notes allow paragraphs and indentation. They stay outside the poem body, printed manuscript, and word totals. Planning edits leave composition and revision dates unchanged.

Tone supports 200 Unicode characters, notes 20,000, and a document can use up to 50 collection themes. Planning is also available on front/back matter and text pages; the collection poem browser lists poems, while theme usage counts include all document types.

## Collection themes

Manage themes in **Collection overview**. Each theme has a stable identity. Renaming its label updates how all linked poems display it, preserving assignments. A theme currently used by a document cannot be removed; uncheck it in those documents first. Unused themes can be removed directly. New labels are trimmed and duplicate labels are checked without case distinctions.

Older broad-theme string lists remain readable. Opening or browsing a collection does not migrate them. The first successful theme edit or assignment materializes stable definitions and removes the legacy string list. Existing descriptions, tone, text, dates, IDs, and paths are retained.

## Find related poems

The collection overview lists its poems with tone, assigned themes, and a planning-notes indicator. Click a poem to open it at the writing desk. Filter by tone or theme, including poems without either, and group the results by tone or theme. Clear filters restores the full list.

Filtering and grouping are read-only. The default list and the order within each group follow manuscript reading order, including ordered parts. A poem assigned several themes appears in each corresponding theme group; the matching-poem count counts each poem once. Tone matching ignores surrounding whitespace and case. Tone/theme meaning remains the writer's choice.

## Saved data and portability

Project `themeDefinitions` holds `{ "id": "theme-home", "label": "Home" }` entries. Optional document fields are `tone`, `planningNotes`, and `themeIds`. Native and frontend validation reject duplicate identities, duplicate links, invalid labels, and references to missing definitions. The earlier project `themes` string array remains a supported legacy format; nonempty legacy and canonical vocabularies cannot coexist.

Full project copies retain their vocabulary and assignments. Importing a project copy remaps theme IDs together with project, section, and poem IDs. Individual poem sidecars carry tone, notes, and theme **labels**. On import, labels merge with the destination's existing vocabulary without case distinctions and receive destination-local identities. Imports stage all new metadata before changing the live workspace; invalid entries leave the destination unchanged.

See [file format](file-format.md), [collection overview](collection-overview.md), and [save/load/export](save-load-export.md). Restart/rebuild the native app alongside the frontend to register the extended models.

## Verification status

Frontend and native tests passed for legacy theme migration, stable links on rename, removal protection, exact notes, ordered filters and groups, and portable project and poem copies. In the browser and Windows desktop app, assigning a migrated theme and setting tone, intensity, and notes preserved the fixture's exact Markdown and revision timestamp.
