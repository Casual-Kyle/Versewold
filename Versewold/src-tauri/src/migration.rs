//! One-time, non-destructive import from the earlier executable-adjacent folder.
//! Roaming files are never overwritten. A durable completion marker prevents
//! later launches from importing stale legacy files over an active workspace.
use crate::storage::Store;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

const MARKER: &str = "storage-migration.json";

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MigrationRecord {
    schema_version: u32,
    legacy_directory: Option<String>,
    copied_files: usize,
}

/// Gather a relative inventory without following links or altering the source.
fn inventory(
    root: &Path,
    relative: &Path,
    files: &mut Vec<PathBuf>,
    directories: &mut Vec<PathBuf>,
) -> Result<(), String> {
    let path = root.join(relative);
    let kind = fs::symlink_metadata(&path)
        .map_err(|e| e.to_string())?
        .file_type();
    if kind.is_symlink() {
        return Err(format!(
            "Cannot migrate a symbolic link: {}",
            path.display()
        ));
    }
    if kind.is_dir() {
        directories.push(relative.to_owned());
        for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            inventory(root, &relative.join(entry.file_name()), files, directories)?;
        }
    } else if kind.is_file() {
        if relative == Path::new(MARKER) {
            return Err(
                "The old data folder contains a reserved storage-migration.json file.".into(),
            );
        }
        files.push(relative.to_owned());
    } else {
        return Err(format!(
            "Cannot migrate a non-regular file: {}",
            path.display()
        ));
    }
    Ok(())
}

fn existing_bytes(store: &Store, relative: &Path) -> Result<Option<Vec<u8>>, String> {
    let path = store.safe_path(relative)?;
    match fs::read(&path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Cannot inspect {}: {e}", path.display())),
    }
}

pub fn import_legacy(store: &mut Store, legacy_root: &Path) -> Result<(), String> {
    if let Some(bytes) = existing_bytes(store, Path::new(MARKER))? {
        let record: MigrationRecord = serde_json::from_slice(&bytes).map_err(|e| {
            format!("Invalid storage migration record; existing data was preserved: {e}")
        })?;
        if record.schema_version != 1 {
            return Err("Unsupported storage migration record version.".into());
        }
        return Ok(());
    }
    // Both paths come from native code. Overlap could recursively copy a folder
    // into itself; reject it before inventory or creation of migration entries.
    if store.root.starts_with(legacy_root) || legacy_root.starts_with(&store.root) {
        return Err("The current and previous data directories must not overlap.".into());
    }
    let legacy_exists = match fs::symlink_metadata(legacy_root) {
        Ok(metadata) if metadata.file_type().is_symlink() || !metadata.is_dir() => {
            return Err("The previous Versewold data folder must be a regular directory.".into())
        }
        Ok(_) => true,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => false,
        Err(e) => return Err(format!("Cannot inspect the previous data folder: {e}")),
    };
    let mut files = Vec::new();
    let mut directories = Vec::new();
    if legacy_exists {
        inventory(legacy_root, Path::new(""), &mut files, &mut directories)?;
    }
    files.sort();
    directories.sort();
    // Validate all collisions first. Identical partial copies permit retry after
    // interruption; different current files always win and stop automatic import.
    for relative in &directories {
        let target = store.safe_path(relative)?;
        if target.exists() && !target.is_dir() {
            return Err(format!(
                "Migration needs a directory at {}. Both copies were preserved.",
                target.display()
            ));
        }
    }
    for relative in &files {
        let source = fs::read(legacy_root.join(relative)).map_err(|e| e.to_string())?;
        if existing_bytes(store, relative)?.is_some_and(|bytes| bytes != source) {
            return Err(format!("The previous folder and {} contain different versions. Both copies were preserved; resolve this conflict before reopening Versewold.", store.root.join(relative).display()));
        }
    }
    for relative in &directories {
        store.ensure_directory(relative)?;
    }
    let mut copied_files = 0;
    for relative in &files {
        let bytes = fs::read(legacy_root.join(relative)).map_err(|e| e.to_string())?;
        if let Some(current) = existing_bytes(store, relative)? {
            if current == bytes {
                continue;
            }
            return Err("Data changed during migration; no existing file was overwritten.".into());
        }
        let target = store.safe_path(relative)?;
        let mut temporary =
            tempfile::NamedTempFile::new_in(target.parent().ok_or("Missing migration parent.")?)
                .map_err(|e| e.to_string())?;
        temporary.write_all(&bytes).map_err(|e| e.to_string())?;
        temporary.as_file().sync_all().map_err(|e| e.to_string())?;
        temporary
            .persist_noclobber(target)
            .map_err(|e| e.to_string())?;
        copied_files += 1;
    }
    // Do not mark an incomplete/invalid set of manifests and poems as migrated.
    // Loading does not rewrite files, including the old preference fields.
    store.load()?;
    let record = MigrationRecord {
        schema_version: 1,
        legacy_directory: legacy_exists.then(|| legacy_root.to_string_lossy().into_owned()),
        copied_files,
    };
    let bytes = serde_json::to_vec_pretty(&record).map_err(|e| e.to_string())?;
    let mut temporary = tempfile::NamedTempFile::new_in(&store.root).map_err(|e| e.to_string())?;
    temporary.write_all(&bytes).map_err(|e| e.to_string())?;
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    temporary
        .persist_noclobber(store.safe_path(Path::new(MARKER))?)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{PoemEntry, Project, Settings, Workspace};
    use std::collections::BTreeMap;

    fn legacy_workspace(root: &Path) {
        let mut store = Store::new(root.to_owned()).unwrap();
        store
            .save(&Workspace {
                settings: Settings {
                    active_project_id: Some("book-1".into()),
                    active_poem_id: Some("poem-1".into()),
                    ..Settings::default()
                },
                projects: vec![Project {
                    schema_version: 1,
                    id: "book-1".into(),
                    title: "Existing poems".into(),
                    templates: vec![],
                    sections: vec![],
                    author_name: None,
                    manuscript: None,
                    poems: vec![PoemEntry {
                        id: "poem-1".into(),
                        title: "A poem".into(),
                        file: "poems/poem-1.md".into(),
                        form_id: "free-verse".into(),
                        ..Default::default()
                    }],
                }],
                documents: BTreeMap::from([(
                    "book-1/poem-1".into(),
                    "  Rain — café\r\n\r\n".into(),
                )]),
            })
            .unwrap();
        fs::write(
            root.join("forms/custom.json"),
            "{\"schemaVersion\":1,\"id\":\"custom\"}",
        )
        .unwrap();
        fs::write(
            root.join("projects/book-1/poems/unlinked.md"),
            "An unreferenced draft\n",
        )
        .unwrap();
    }

    #[test]
    fn migration_copies_everything_preserves_preferences_and_does_not_reimport() {
        let temporary = tempfile::tempdir().unwrap();
        let legacy = temporary.path().join("exe/Versewold-data");
        let roaming = temporary.path().join("roaming/com.client.versewold");
        legacy_workspace(&legacy);
        fs::create_dir_all(&roaming).unwrap();
        let preferences =
            serde_json::to_vec_pretty(&crate::preferences::UserPreferences::default()).unwrap();
        fs::write(roaming.join("user-settings.json"), &preferences).unwrap();
        let mut source_files = Vec::new();
        let mut source_directories = Vec::new();
        inventory(
            &legacy,
            Path::new(""),
            &mut source_files,
            &mut source_directories,
        )
        .unwrap();
        let mut migrated = Store::app_data(roaming.clone(), legacy.clone()).unwrap();
        for relative in &source_files {
            assert_eq!(
                fs::read(legacy.join(relative)).unwrap(),
                fs::read(roaming.join(relative)).unwrap()
            );
        }
        assert_eq!(
            fs::read(roaming.join("user-settings.json")).unwrap(),
            preferences
        );
        let mut loaded = migrated.load().unwrap().workspace;
        assert_eq!(loaded.settings.active_project_id.as_deref(), Some("book-1"));
        assert_eq!(loaded.documents["book-1/poem-1"], "  Rain — café\r\n\r\n");
        loaded
            .documents
            .insert("book-1/poem-1".into(), "New roaming draft\n".into());
        migrated.save(&loaded).unwrap();
        let reopened = Store::app_data(roaming.clone(), legacy.clone())
            .unwrap()
            .load()
            .unwrap();
        assert_eq!(
            reopened.workspace.documents["book-1/poem-1"],
            "New roaming draft\n"
        );
        assert_eq!(
            fs::read_to_string(legacy.join("projects/book-1/poems/poem-1.md")).unwrap(),
            "  Rain — café\r\n\r\n"
        );
        assert!(roaming.join(MARKER).is_file());
    }

    #[test]
    fn different_destination_files_block_import_without_overwriting_either_copy() {
        let temporary = tempfile::tempdir().unwrap();
        let legacy = temporary.path().join("old");
        let roaming = temporary.path().join("roaming");
        legacy_workspace(&legacy);
        fs::create_dir_all(roaming.join("projects/book-1/poems")).unwrap();
        let target = roaming.join("projects/book-1/poems/poem-1.md");
        fs::write(&target, "Current roaming text").unwrap();
        let error = Store::app_data(roaming.clone(), legacy.clone())
            .err()
            .unwrap();
        assert!(error.contains("different versions"));
        assert_eq!(fs::read_to_string(&target).unwrap(), "Current roaming text");
        assert_eq!(
            fs::read_to_string(legacy.join("projects/book-1/poems/poem-1.md")).unwrap(),
            "  Rain — café\r\n\r\n"
        );
        assert!(!roaming.join(MARKER).exists());
        assert!(!roaming.join("forms/custom.json").exists());
    }

    #[test]
    fn interrupted_identical_copy_is_resumable() {
        let temporary = tempfile::tempdir().unwrap();
        let legacy = temporary.path().join("old");
        let roaming = temporary.path().join("roaming");
        legacy_workspace(&legacy);
        fs::create_dir_all(roaming.join("projects/book-1/poems")).unwrap();
        fs::copy(
            legacy.join("projects/book-1/poems/poem-1.md"),
            roaming.join("projects/book-1/poems/poem-1.md"),
        )
        .unwrap();
        let mut migrated = Store::app_data(roaming.clone(), legacy).unwrap();
        assert_eq!(migrated.load().unwrap().workspace.projects.len(), 1);
        assert!(roaming.join(MARKER).is_file());
    }

    #[test]
    fn new_installation_does_not_create_an_executable_adjacent_folder() {
        let temporary = tempfile::tempdir().unwrap();
        let legacy = temporary.path().join("exe/Versewold-data");
        let roaming = temporary.path().join("roaming");
        let mut store = Store::app_data(roaming.clone(), legacy.clone()).unwrap();
        assert!(store.load().unwrap().workspace.projects.is_empty());
        assert!(!legacy.exists());
        assert!(roaming.join("projects").is_dir());
        assert!(roaming.join("forms").is_dir());
        assert!(roaming.join(MARKER).is_file());
    }

    #[test]
    fn malformed_records_and_overlapping_roots_fail_visibly() {
        let temporary = tempfile::tempdir().unwrap();
        let roaming = temporary.path().join("roaming");
        fs::create_dir_all(&roaming).unwrap();
        fs::write(roaming.join(MARKER), "Damaged record").unwrap();
        assert!(Store::app_data(roaming.clone(), temporary.path().join("old")).is_err());
        assert_eq!(
            fs::read_to_string(roaming.join(MARKER)).unwrap(),
            "Damaged record"
        );
        let other = temporary.path().join("overlap");
        assert!(Store::app_data(other.clone(), other.join("old")).is_err());
    }
}
