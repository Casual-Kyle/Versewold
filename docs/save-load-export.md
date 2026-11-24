# Save, load, and export

Open **Files & export** at the bottom of the sidebar, or press **Ctrl+O** / **Ctrl+Shift+S**. File actions require the native desktop app, including `npm run tauri dev`. A browser-only Vite preview does not save local files. After adding/changing native Rust commands, restart Tauri dev; frontend hot reload alone cannot register them.

**Save now** / **Ctrl+S** flushes pending manuscript and preference autosaves to `%APPDATA%\com.client.versewold\`. File operations flush pending work before showing a native chooser. Loading adds a new working copy to the roaming library and saves it immediately. It never opens the external copy for ongoing autosave or replaces the existing original project.

| Action                     | Result                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Save project copy          | Choose a parent folder; a new uniquely named folder contains `project.json` and `poems/<id>.md`. Metadata retains title, poem order, form IDs, and snapshots of used form definitions.                                               |
| Load project               | Choose `project.json`; all text/metadata is read and validated before adding a new library project with fresh IDs. Duplicate titles gain an “imported” suffix. Empty projects work.                                                  |
| Save poem copy             | Choose a parent folder; a new folder contains exact `poem.md` and `poem.md.versewold.json` with title, form ID, and available form definition. Keep both files together.                                                             |
| Load poems                 | Choose one or several `.md` files. A matching `<filename>.md.versewold.json` restores title/form; ordinary Markdown uses the filename as title and Free verse. Poems append to the current project, or a new Imported poems project. |
| Export manuscript          | Choose a `.md` filename; one document contains the project heading, poem titles, and bodies in project order. Headings/separators are added around the original text.                                                                |
| Export poem                | Choose a `.md` filename; its content is the exact manuscript, without added headings, annotations, or metadata.                                                                                                                      |
| PDF · page setup & preview | Open Manuscript to choose paper, margins, print typography, title-page counts, bylines/dates, and page flow; export a PDF through the native Save dialog.                                                                            |

[Manuscript layout and PDF](manuscript-pdf.md) also documents parts, dedication/author pages, document ordering, author profile, composition dates, and automatic revision dates. Project copies retain all these fields and page settings; poem copies retain kind, author, and dates. Imported parts receive fresh IDs. Combined Markdown follows the same reading order as the PDF preview, while preserving each original body.

Copies receive a title-based folder name with a unique suffix. Existing copy folders are never overwritten. Markdown export uses native overwrite confirmation and atomic replacement; cancelling any chooser changes nothing. Destinations inside the managed app data folder are rejected to protect active manuscripts/settings. Copies contain no personal theme preferences or backup history.

## Portable form definitions

`Project.templates` is an optional version 1 array of declarative poetry-form definitions. Older manifests load normally. Snapshots override global forms only within their project; loading never overwrites the global custom-form library. A poem copy with a conflicting definition gets a distinct imported form ID so earlier poems retain their guidance. Invalid definitions stop the import before the live workspace changes. An unavailable form retains its ID/text and the existing missing-template notice.

## Fidelity and limits

Copies and individual poem exports preserve UTF-8, Unicode, indentation, Markdown headings, mixed LF/CRLF/CR, blank lines, and trailing whitespace/newlines. Metadata never embeds poem bodies. Combined manuscript export keeps each body intact while adding headings/separators. It is an output manuscript; use Save project copy for round trips.

Imports accept up to 1,000 poems per operation, 16 MiB per Markdown file, 8 MiB per JSON manifest/sidecar, and 128 MiB total text. Damaged/newer metadata, missing referenced files, non-UTF-8 text, unsafe paths, and linked poem files fail visibly. Batch reads/validation complete before any poems append. Sources remain untouched. A save failure leaves the loaded text in memory with an error so Save now can retry.

Native tests cover exact project/poem round trips, old/empty manifests, distinct copies, separate metadata, invalid/oversized input, unsafe paths, atomic replacement, and all-or-nothing batch reads. Domain tests cover fresh identities, ordering, scoped/conflicting templates, invalid imports without partial mutation, reactive snapshots, and manuscript output.
