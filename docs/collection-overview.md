# Collection overview

Open **Collection overview → Rename & plan** below the project selector in the sidebar. The selected project supplies the overview; switching projects opens that collection's own details.

- **Project name:** enter a name and choose **Rename project**, or press Enter. Cancel or Escape restores the current name. Empty names and names already used by another project are rejected. Names are trimmed and limited to 160 Unicode characters.
- **Description & intention:** describe the collection's purpose, questions, or intended reader experience. Paragraphs and indentation are allowed, up to 20,000 characters.
- **Intended tone:** describe the general tone in up to 200 characters on one line.
- **Collection themes:** add individual labels with Enter or **Add theme**. Rename labels while keeping their document assignments. Unused themes can be removed with their close buttons; assigned themes must be unchecked in their documents first. Up to 50 themes are supported, each up to 80 characters. Adding the same label with different casing does not create a second entry.

Description, tone, and theme changes use the normal autosave queue. A new name enters that queue after **Rename project** is applied. The app's save indicator and Save now action also cover these details. Browser preview remains temporary.

The overview shows poem count, part count, and manuscript body word count. Planning notes, theme labels, and titles are excluded from this word total. Its poem browser filters and groups by tone or theme and opens the selected poem. See [poem planning](poem-planning.md).

Open **Theme canvas** from the overview toolbar. Add poem, theme, or note cards, then drag them to arrange the board. Select a card and use **Connect to** to label a relationship with another card. **Open poem** opens the linked poem in the writing desk. Drag the background to pan and scroll to zoom, or use the zoom buttons. Tab to a card and move it with the arrow keys. **Find a card** centers the view on it.

The app saves the layout, relationship labels, and viewport with the project. Each poem or theme can appear once on the board, and each pair of cards can have one labeled connection. Removing a card removes its connections. Remove a theme’s card before deleting the collection theme. A project copy preserves the canvas and updates its links when imported.

Open **Word explorer** from the overview toolbar to view counts for the whole collection, a part, or a poem. Select a word in the cloud or table to compare its frequency across poems, or open a passage to select that occurrence in the writing desk. The common-word list is editable and can be switched off. Filters and the selected word are remembered for each collection during the current app session.

The explorer counts Markdown poem bodies, including words in links and code. Internal apostrophes and hyphens stay in words, with common punctuation variants and equivalent Unicode spellings grouped. Set the case toggle to count uppercase and lowercase separately. Rates per 1,000 words use the full word count of the scope or poem, including words hidden by filters.

## Persistence and compatibility

Renaming changes the existing `title`, preserving project ID, poem IDs, file paths, ordering, and selection. Planning fields are optional version 1 manifest additions: `description`, `intendedTone`, and `themeDefinitions`. Older `themes` string arrays are accepted and migrate on the first successful theme edit or assignment. Older projects open with empty/default planning. Clearing a field removes its optional value. Native storage and portable project copies retain these fields; importing a canonical project copy allocates fresh theme identities alongside project/document identities and remaps assignments.

Collection changes leave poem Markdown and composition/revision dates unchanged. The description is planning metadata and is not added to printed manuscripts or Markdown exports. See [file format](file-format.md) and [save/load/export](save-load-export.md).

The native model must be rebuilt alongside the frontend; a previously built desktop binary does not acquire this feature from source edits alone.

## Verification status

Isolated checks of the applied metadata-helper source passed for renaming, invalid/duplicate names, description whitespace, theme changes, Unicode limits, and preservation of poem metadata. These checks do not constitute a repository build or UI/native test run.

Six new frontend domain tests, a frontend portable-copy test, and five native model/storage/portable-copy tests have been added. Running them and checking the TypeScript/Vite/native build is pending: the Windows command sandbox currently fails during startup, and the alternate Node runtime is unavailable.

Before marking the feature verified, exercise rename/cancel/invalid names, edit all planning fields, switch between two projects with the overview open, and reopen the native app. Export/load a project copy and compare its details. Check an older project and an empty collection, light/dark palettes, large interface text, and keyboard navigation. Confirm poem source bytes and revision dates remain unchanged.
