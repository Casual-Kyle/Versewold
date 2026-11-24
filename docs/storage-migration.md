# Shared roaming app storage

All Versewold user data uses native Tauri `app.path().app_config_dir()`. With the current identifier, Windows resolves this to `%APPDATA%\com.client.versewold\` (normally `C:\Users\<user>\AppData\Roaming\com.client.versewold\`). There is no active executable-adjacent storage mode.

```text
com.client.versewold/
  user-settings.json          Palette, fonts, writing preferences
  settings.json               Current project/poem selection
  storage-migration.json      One-time legacy import completion record
  projects/<project-id>/
    project.json              Poem titles, links, forms, order
    poems/<poem-id>.md         Exact Markdown text
  forms/<custom-form>.json     User form templates
  backups/projects/...        Rotating Markdown/manifest snapshots
```

The Files & storage screen displays the resolved shared folder and offers Open app data folder. Build output, checked-in templates, and research remain in the repository; user-created content belongs in the roaming folder. Debug and distributed builds with the same application identifier share that location.

## Upgrade from the earlier implementation

Before loading a workspace, the app checks for its migration completion record. With no record, it inventories `Versewold-data` beside the current executable and copies its files/directories into the shared app folder. This includes custom forms, snapshots, selection settings, and unreferenced files. The source is never deleted or modified. Existing `user-settings.json` is retained.

All destination collisions are checked before copying. Equal files are accepted, allowing an interrupted import to resume. Different existing files stop the import with an error; neither copy is overwritten. Symbolic links, overlapping source/destination roots, invalid completion records, and unsupported file types fail visibly. A failed import may leave partial identical copies in the app folder, but the old folder remains intact.

After copying, the app validates the project manifests and referenced Markdown files, then atomically creates `storage-migration.json`. Future launches use the roaming folder and skip old data, so stale source files cannot replace current writing or reappear after edits. New installations also record initialization without creating an executable-adjacent folder.

Only the earlier folder beside the executable being launched is automatically imported. Copies in other locations are preserved and require an explicit future import workflow. Keep the old copy until you have reviewed the migrated projects; new app saves go only to the roaming folder.

## Verification

Native migration tests cover exact-byte copying of poems/manifests/forms/backups and unreferenced text, preservation of existing preferences and source files, active selection, resumed partial copies, destination conflicts, changed roaming text surviving restart without re-import, initialization without an old folder, malformed records, and overlapping paths. Tests use temporary directories.
