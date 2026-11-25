# Collection overview

Open **Collection overview → Rename & plan** below the project selector in the sidebar. The selected project supplies the overview; switching projects opens that collection's own details.

- **Project name:** enter a name and choose **Rename project**, or press Enter. Cancel or Escape restores the current name. Empty names and names already used by another project are rejected. Names are trimmed and limited to 160 Unicode characters.
- **Description & intention:** describe the collection's purpose, questions, or intended reader experience. Paragraphs and indentation are allowed, up to 20,000 characters.
- **Intended tone:** describe the general tone in up to 200 characters on one line.
- **Collection themes:** add individual labels with Enter or **Add theme**. Rename labels while keeping their document assignments. Unused themes can be removed with their close buttons; assigned themes must be unchecked in their documents first. Up to 50 themes are supported, each up to 80 characters. Adding the same label with different casing does not create a second entry.

Description, tone, and theme changes use the normal autosave queue. A new name enters that queue after **Rename project** is applied. The app's save indicator and Save now action also cover these details. Browser preview remains temporary.

The overview shows poem count, part count, and manuscript body word count. Planning notes, theme labels, and titles are excluded from this word total. Its poem browser filters and groups by tone/theme and opens the selected poem. See [poem planning](poem-planning.md) for assignments, stable theme identities, and copy behavior. The graphical canvas remains later work.

## Persistence and compatibility

Renaming changes the existing `title`, preserving project ID, poem IDs, file paths, ordering, and selection. Planning fields are optional version 1 manifest additions: `description`, `intendedTone`, and `themeDefinitions`. Older `themes` string arrays are accepted and migrate on the first successful theme edit or assignment. Older projects open with empty/default planning. Clearing a field removes its optional value. Native storage and portable project copies retain these fields; importing a canonical project copy allocates fresh theme identities alongside project/document identities and remaps assignments.

Collection changes leave poem Markdown and composition/revision dates unchanged. The description is planning metadata and is not added to printed manuscripts or Markdown exports. See [file format](file-format.md) and [save/load/export](save-load-export.md).

The native model must be rebuilt alongside the frontend; a previously built desktop binary does not acquire this feature from source edits alone.

## Verification status

Isolated checks of the applied metadata-helper source passed for renaming, invalid/duplicate names, description whitespace, theme changes, Unicode limits, and preservation of poem metadata. These checks do not constitute a repository build or UI/native test run.

Six new frontend domain tests, a frontend portable-copy test, and five native model/storage/portable-copy tests have been added. Running them and checking the TypeScript/Vite/native build is pending: the Windows command sandbox currently fails during startup, and the alternate Node runtime is unavailable.

Before marking the feature verified, exercise rename/cancel/invalid names, edit all planning fields, switch between two projects with the overview open, and reopen the native app. Export/load a project copy and compare its details. Check an older project and an empty collection, light/dark palettes, large interface text, and keyboard navigation. Confirm poem source bytes and revision dates remain unchanged.
