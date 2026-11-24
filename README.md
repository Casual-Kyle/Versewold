# Versewold

A desktop poetry study built with Tauri 2, Vue 3, and TypeScript. Earth tones, a quiet writing desk, and guidance from declarative poetic forms.

The application is in [Versewold/](Versewold/). Poetry research lives separately in [research/](research/README.md).

Upcoming work and known limitations are tracked in [planning and bugs](docs/planning-and-bugs.md).

Automatic [saved-version backups](docs/backups.md) retain 50 readable revisions per poem and project manifest. Access them from Preferences → Files & storage → Open backups folder; revision comparison/restore and unsaved-work recovery are next in the safety backlog.

**Files & export** in the sidebar provides Save now, portable project/poem copies, project/Markdown loading, and Markdown poem/manuscript exports. Loaded copies receive fresh identities and autosave in the roaming library. See [save, load, and export](docs/save-load-export.md) for formats and behavior.

**Manuscript** adds [PDF page setup and preview](docs/manuscript-pdf.md): paper sizes, margins, print fonts/spacing, optional title-page word count, author bylines/dates, and clean Windows PDF export. Organize the sidebar into parts with dedication and author pages; use each document's Details for ordering, author, and composition date. Preferences → Author profile sets a default byline. Layout and metadata travel in portable project copies.

```powershell
cd Versewold
npm install
npm run tauri dev
```

Requires Node.js 22.18+ (24 LTS recommended), Rust, and the normal Windows Tauri prerequisites, including Microsoft C++ build tools and WebView2. Use `npm run dev` for an explicitly temporary browser preview; it does not save files.

Implemented foundation: separate Vue views/components, organized CSS tokens, offline fonts, reference-inspired icons, projects and poems, Markdown editing, JSON metadata, debounced native autosave, and validated custom JSON templates. The searchable library now includes 152 entries: 48 structural templates, 85 guided writing entries, and 19 references. All 149 direct members of Wikipedia’s poetic-forms category have a sourced research record; the original three named variants remain additional entries.

All Versewold user data lives together in Tauri’s roaming app folder: `%APPDATA%\com.client.versewold\` on Windows. This includes projects, Markdown poems, custom forms, selection state, personal settings, and backups. The earlier executable-adjacent `Versewold-data` folder is imported once without deleting its contents or overwriting different roaming files. See [storage migration](docs/storage-migration.md), [architecture](docs/architecture.md), [file format](docs/file-format.md), [personal preferences](docs/preferences.md), and the [template authoring guide](research/04-template-format.md).

Preferences include three palettes, individual RGB/hex colors, searchable installed Windows fonts, separate interface and writing typography, line spacing, writing width, soft wrapping, spellcheck, statistics, and form guidance. Changes preview immediately and save automatically; resets are available separately for appearance and writing.

See the [complete category survey](research/poetic-forms/catalog.md) for every entry, its selected variant, source revision, and limitations. Search ignores accents and includes alternate names; the library can be filtered by structural templates, guided writing, or reference entries. A structural template encodes a layout and targets, not a claim of complete linguistic validation.

From the application folder:

```powershell
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build -- --debug --no-bundle
```

[Guided composition](docs/composition.md) adds automatic stanza detection, line numbers, rhyme letters, template targets, a current-line inspector, and optional Strict count warnings. Phonetic rhyme, pronunciation-based syllable counts, scansion, nested sections, and DOCX export remain future work. The research folder lays out the next linguistic steps.
