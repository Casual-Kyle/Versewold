# Architecture and storage decisions

## Scope and authority

The user's direct request governs this foundation: Vue views/components, clean CSS, reference-based icon, readable JSON/Markdown, and poetry research outside the application. All user data belongs in Tauri's roaming app folder, following the user's clarified storage requirement. The supplied design proposal guides the palette and literary atmosphere. Its SQLite recommendation is intentionally superseded by the user's requested file format. Publishing and phonetic analysis remain later work.

## Code map

```text
research/                         Sourced notes, design questions, template guide
docs/                             Architecture and storage contracts
Versewold/
  src/
    views/                        WritingDesk, FormLibrary, Settings
    components/
      layout/                     ProjectSidebar
      editor/                     PoemEditor, VerseEditor, measured annotation extension
      forms/                      FormPicker, FormMap, FormGuide, LineInspector, MeterPattern
      settings/                   PaletteEditor, FontPicker, SettingRange, WritingPreview
      ui/                         AppIcon, CreateDialog
    composables/useWorkspace.ts   Shared reactive workspace and autosave lifecycle
    composables/usePreferences.ts Shared personal preferences and separate autosave queue
    composables/useProjectFiles.ts Dialog workflow, flush-before-copy, import completion/errors
    composables/useAppearance.ts  Apply preferences as reactive CSS variables
    services/                     Native repositories, save queue, exact editor source/undo
    domain/
      workspace.ts                Typed metadata and document transport
      portable.ts                 Portable snapshots, import identities, manuscript export
      preferences.ts              Palette roles, presets, font stacks, preference types
      default-preferences.json    Shared frontend/native defaults
      forms/                      Schema, types, semantic checks, structure rules
        composition.ts            Stanza/line layout, target labels, scoped writing hints
        picker.ts, lineMap.ts      Ranked writing search and source-position navigation
        strict.ts                 Offline English syllable estimates and count/layout feedback
        templates/                Declarative JSON form definitions
        generated/                Committed precompiled schema validator
    router/                       Lazy Vue views, hash history for native delivery
    styles/                       Tokens, base elements, shell, components, views
  scripts/                        Schema-validator generation
  tests/                          Template invariants and concurrent-save behavior
  public/versewold.svg             Editable vector icon source and in-app branding
  src-tauri/src/
    lib.rs                        Native application registration
    commands.rs                   Thin Tauri IPC handlers
    file_commands.rs              Native file/folder chooser scoped commands
    portable.rs                   Exact JSON/Markdown copy/read/export; isolated tests
    models.rs                     Serde metadata/transport types
    storage.rs                    App data paths, conflict checks, atomic file writes
    migration.rs                  Non-destructive one-time import of the old data folder
    backups.rs                    Readable snapshots, sequencing, bounded retention
    preferences.rs                Validated roaming preferences and legacy migration
    fonts.rs                      Installed Windows font families through DirectWrite
```

Components handle presentation and user events; views compose them. Vue reactivity stays in the composable. The repository service is the only frontend filesystem boundary. Domain code has no Vue or Tauri dependency. Future pronunciation analysis should follow that separation.

## Data location

The single user-data root is Rust `app.path().app_config_dir()`: `%APPDATA%\com.client.versewold\` on Windows. Projects, Markdown files, custom forms, selection state, personal settings, and backups all live there. Debug and distributed builds with the same identifier use this same location; no active user-data folder is created beside the executable or in the repository.

An earlier implementation wrote manuscripts to executable-adjacent `Versewold-data/`. On first launch, a native [migration](storage-migration.md) imports that folder into the roaming root, preserves the source, and refuses to overwrite different existing files. A completion marker prevents stale re-import. The executable and bundle resource directories are not active writable data stores.

```text
%APPDATA%/com.client.versewold/
  user-settings.json
  settings.json
  storage-migration.json
  projects/
    <project-id>/
      project.json
      poems/
        <poem-id>.md
  forms/
    <custom-form>.json
  backups/projects/<project-id>/
    poems/<poem-id>/               Numbered Markdown snapshots, newest 50
    project/                      Numbered JSON manifest snapshots, newest 50
```

No SQLite, localStorage, IndexedDB, or mandatory network service is used. The browser mode is explicitly a temporary preview and starts empty each refresh. Files remain readable and copyable outside the app regardless of their storage location. Explicit [portable copies and Markdown exports](save-load-export.md) go to native-dialog-selected destinations outside the managed root; loaded copies receive new identities and become normal roaming projects.

## Save lifecycle

Project metadata, selections, and poem text schedule a save after 600 ms of inactivity. Personal preferences use a separate queue and a 400 ms debounce. Ctrl/Cmd+S flushes both queues, attempting each even when the other fails. A serialized revision queue prevents overlapping writes and follows up when edits arrive during a save. Closing the native window waits for pending writes; failure keeps the window open with a visible error. OS termination or a power outage can still lose changes inside the debounce interval.

Rust writes only files whose desired bytes differ from its last observed version. It checks those targets against disk, then preserves existing and incoming poem/manifest bytes in bounded backups before the first primary write. A backup failure stops the save with existing manuscript files unchanged. Primary writes use synchronized temporary files and atomic replacement. Markdown is written before manifests and settings. This is atomic per file, not a multi-file transaction. An interrupted new-project save can leave an orphan Markdown file, which is preserved. See [backup behavior and recovery](backups.md).

Editing a file outside the app is supported between sessions. During a session, conflicting changes to a target being saved produce an error rather than knowingly replacing the external version. Live file watching and conflict merging are future work. There is a small check-to-replacement race with concurrent external writers; this is not a multi-process lock or a complete version-history system. Back up the data folder normally.

Unsupported schema versions, invalid JSON, non-UTF-8 text, or a missing referenced poem fail visibly. No damaged existing project is silently replaced by an empty one. IDs and paths are constrained, and symbolic links along controlled file paths are rejected. This boundary does not expose arbitrary native file paths to Vue.

## Template loading

Bundled templates are discovered from JSON files. Native custom templates load from the data root. A precompiled JSON Schema validator checks shape; a semantic pass checks refrain ordering and end-word references. Duplicate IDs fail custom-library reload without discarding the previous valid library. The native CSP does not permit script evaluation.

The UI displays expected rhyme, internal-rhyme positions, meter, refrains, and end-word groups and checks draft stanza/line and declared word counts. The [guided editor](composition.md) detects blank-line stanza breaks and adds measured stanza headings, line/rhyme gutters, inline targets, and a cursor-following inspector. Optional Strict highlighting compares approximate English syllables or actual word counts with per-line targets and marks extra written lines. Stress beats, morae, syllables, and quantitative base sequences remain separate. It does not yet perform phonetic analysis or enforce refrain text. Existing poem content is never rewritten when its form changes. Annotation widgets never serialize into Markdown; raw line endings and undo source are handled independently of CodeMirror's normalized document.

The expanded offline catalog covers all 149 direct entries of the surveyed Wikipedia category, plus three original named variants. It distinguishes 48 structural templates, 85 guided writing entries, and 19 references. References cannot be selected for composition. Accent-insensitive multi-word search includes aliases and provenance; support filters and incremental rendering keep the larger library usable. `research/scripts/build-form-catalog.mjs` builds committed JSON from curated definitions and source metadata; the application never loads research files or fetches Wikipedia at runtime.

## Visual system

The [Manuscript view](manuscript-pdf.md) has its own page setup and print CSS. Pure domain pagination and canvas font measurement generate physical point-positioned sheets used by both preview and native Windows WebView2 PDF printing. Native Save chooses the destination; a temporary PDF is validated/synced before atomic replacement. Print locks keep the preview DOM stable. Flat project sections and optional document kinds/bylines/dates are metadata; bodies remain separate Markdown files. Shared layout defaults are validated on both sides of IPC.

The default theme follows the supplied Heather & Earth reference. Lavender identifies selected items and primary actions; earth/walnut remain dominant. Midnight Ink and Warm Parchment are additional starting palettes; every supported color can be adjusted. Type families are bundled locally through Fontsource: Cormorant Garamond, EB Garamond, Inter, and IBM Plex Mono. Native Windows font pickers also search installed DirectWrite font families. Interface, heading, analysis, and manuscript fonts are independent. CSS is split by ownership, with default tokens centralized in `tokens.css` and reactive overrides applied at the root. Rhyme letters supplement color, keyboard focus stays visible, dialogs use native modal focus containment, and reduced-motion preferences are respected.

The icon is a new SVG interpretation of the supplied botanical quill reference. Regenerate all platform sizes with `npm run tauri icon public/versewold.svg` from the application folder.
