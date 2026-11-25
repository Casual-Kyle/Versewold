# Automatic saved-version backups

The native app automatically snapshots changed poems and project manifests before replacing their primary files. Backups are plain UTF-8 Markdown/JSON inside Tauri's shared roaming app folder. Open them from Preferences → Files & storage → Open backups folder.

```text
%APPDATA%/com.client.versewold/
  projects/<project-id>/poems/<poem-id>.md       Current poem
  projects/<project-id>/project.json             Current manifest
  backups/projects/<project-id>/
    poems/<poem-id>/
      00000000000000000001-<unix-milliseconds>.md
      00000000000000000002-<unix-milliseconds>.md
    project/
      00000000000000000001-<unix-milliseconds>.json
```

## Behavior

- Each poem and project manifest retains its newest **3** recognized snapshots, including the latest incoming text and up to two earlier versions. These are files on disk, not extra copies held in RAM. Older recognized snapshots rotate on that file's next changed save. Three snapshots is the current retention policy; longer-term history is deferred.
- The first changed save snapshots any existing on-disk version, even when it predates this feature, then the incoming draft. New files receive an initial snapshot. Existing unchanged files are not copied just because the app opens.
- Consecutive identical bytes are not duplicated. A no-op save or appearance-only change creates no manuscript snapshot. Markdown whitespace, Unicode, CRLF/LF, and trailing newlines remain exact.
- Sequence numbers establish order across restarts and wall-clock changes. The timestamp is Unix milliseconds. The sequence restarts only if that document's entire recognized history has been removed externally.
- Conflict checks run before backup creation. All required backups finish before any primary files change. A backup creation/rotation failure stops that save and leaves the existing manuscript files intact; the draft stays unsaved in the editor with a visible error.
- Each snapshot is synchronized and published from a temporary file without replacing an existing revision. Only recognized regular snapshot files in that document's directory rotate. Unrecognized notes/files are preserved, and controlled paths reject symbolic links.
- A failed or interrupted primary save can leave the incoming draft in backups. A snapshot is a recoverable candidate, not proof that its contents reached every primary file. Saving remains atomic per file, not a multi-file transaction.

The backup folder lives with all other user data under `%APPDATA%\com.client.versewold\`. Personal preferences and current-project selection are not versioned here. These local copies do not protect against loss of the entire app data folder/device, and they cannot recover keystrokes that never reached an autosave attempt. There is no multi-process lock.

## Recover a poem in this first version

1. Open the backups folder and identify the project/poem IDs using the current `project.json`.
2. Read the numbered `.md` snapshots in any text editor; larger sequence numbers are newer.
3. Close Versewold normally. Keep a separate copy of the current poem before manually restoring.
4. Copy the chosen snapshot's exact contents into `projects/<project-id>/poems/<poem-id>.md`, then reopen Versewold. Leave the snapshot itself intact.

If a project manifest is damaged/missing, its JSON snapshots retain titles, poem order, and file links. Restoring a manifest also requires the files it references to exist. The app deliberately does not guess which snapshot or set of files to restore.

The next safety steps are a revision browser with explicit restore/compare actions (SAFE-02), an unsaved-work recovery journal (SAFE-03), and external-conflict comparison (SAFE-04). See [planning and bugs](planning-and-bugs.md).

## Verification

Native tests cover exact-byte snapshots and manifests, restarts, deduplication, rotation beyond the configured retention limit, clearing a draft, importing an existing draft into history, preserving unrelated files, rejecting invalid backup entries, external conflicts, and keeping all primary files unchanged when a later backup fails. The retention policy was reduced to three snapshots on 24 November 2026; tests have not been rerun for that change because local command execution is currently blocked.
