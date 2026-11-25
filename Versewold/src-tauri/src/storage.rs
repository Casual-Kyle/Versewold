//! Readable storage in Tauri's roaming app folder. Writes are atomic per file, ordered Markdown →
//! manifest → settings. A save is not a multi-file database transaction.
use crate::models::{LoadedWorkspace, Project, Settings, Workspace};
use std::{
    collections::{BTreeMap, HashMap, HashSet},
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    sync::Mutex,
};

#[derive(Default)]
pub struct StorageState(pub Mutex<Option<Store>>);

pub struct Store {
    pub root: PathBuf,
    // Original bytes let us detect external edits before overwriting an existing file.
    observed: HashMap<PathBuf, Option<Vec<u8>>>,
}

fn message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

pub fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 100
        || !id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
    {
        return Err("Invalid project or poem ID; use letters, digits, and hyphens.".into());
    }
    Ok(())
}

impl Store {
    pub fn app_data(root: PathBuf, legacy_root: PathBuf) -> Result<Self, String> {
        let mut store = Self::new(root)?;
        crate::migration::import_legacy(&mut store, &legacy_root)?;
        Ok(store)
    }

    pub fn new(root: PathBuf) -> Result<Self, String> {
        let mut store = Self {
            root,
            observed: HashMap::new(),
        };
        store.ensure_directory(Path::new(""))?;
        store.ensure_directory(Path::new("projects"))?;
        store.ensure_directory(Path::new("forms"))?;
        Ok(store)
    }

    /// Reject absolute paths, traversal and links at each existing path component.
    pub(crate) fn safe_path(&self, relative: &Path) -> Result<PathBuf, String> {
        let mut path = self.root.clone();
        if fs::symlink_metadata(&path).is_ok_and(|m| m.file_type().is_symlink()) {
            return Err("The data folder must not be a symbolic link.".into());
        }
        for component in relative.components() {
            let Component::Normal(part) = component else {
                return Err("Unsafe relative path.".into());
            };
            path.push(part);
            if fs::symlink_metadata(&path).is_ok_and(|m| m.file_type().is_symlink()) {
                return Err(format!(
                    "Symbolic links are not supported: {}",
                    path.display()
                ));
            }
        }
        Ok(path)
    }

    pub(crate) fn ensure_directory(&mut self, relative: &Path) -> Result<(), String> {
        let path = self.safe_path(relative)?;
        fs::create_dir_all(&path).map_err(|e| {
            format!(
                "Cannot create the Versewold data directory {}: {e}.",
                path.display()
            )
        })
    }

    fn read_optional(&mut self, relative: &Path) -> Result<Option<Vec<u8>>, String> {
        let path = self.safe_path(relative)?;
        let bytes = match fs::read(&path) {
            Ok(bytes) => Some(bytes),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
            Err(e) => return Err(format!("Cannot read {}: {e}", path.display())),
        };
        self.observed.insert(relative.to_path_buf(), bytes.clone());
        Ok(bytes)
    }

    pub fn load(&mut self) -> Result<LoadedWorkspace, String> {
        let settings: Settings = match self.read_optional(Path::new("settings.json"))? {
            Some(bytes) => {
                serde_json::from_slice(&bytes).map_err(|e| format!("Invalid settings.json: {e}"))?
            }
            None => Settings::default(),
        };
        if settings.schema_version != 1 {
            return Err("Unsupported settings schema version.".into());
        }
        let mut projects = Vec::new();
        let mut documents = BTreeMap::new();
        for entry in fs::read_dir(self.root.join("projects")).map_err(message)? {
            let entry = entry.map_err(message)?;
            if !entry.file_type().map_err(message)?.is_dir() {
                continue;
            }
            let id = entry
                .file_name()
                .to_str()
                .ok_or("Invalid project folder name.")?
                .to_owned();
            validate_id(&id)?;
            let relative = PathBuf::from(format!("projects/{id}/project.json"));
            // Interrupted creation can leave an unreferenced poem; preserve it.
            let Some(bytes) = self.read_optional(&relative)? else {
                continue;
            };
            let project: Project = serde_json::from_slice(&bytes)
                .map_err(|e| format!("Invalid {}: {e}", relative.display()))?;
            if project.id != id {
                return Err(format!("Project ID does not match its folder: {id}"));
            }
            Self::validate_project(&project)?;
            for poem in &project.poems {
                let relative = PathBuf::from(format!("projects/{id}/{}", poem.file));
                let bytes = self.read_optional(&relative)?.ok_or_else(|| {
                    format!(
                        "Missing poem: {}. Restore it before reopening.",
                        relative.display()
                    )
                })?;
                documents.insert(
                    format!("{id}/{}", poem.id),
                    String::from_utf8(bytes).map_err(message)?,
                );
            }
            projects.push(project);
        }
        projects.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        Ok(LoadedWorkspace {
            legacy_preferences: crate::preferences::LegacyPreferences {
                show_guidance: settings.legacy_show_guidance,
                editor_font_size: settings.legacy_editor_font_size,
            },
            workspace: Workspace {
                settings,
                projects,
                documents,
            },
            data_directory: self.root.to_string_lossy().into_owned(),
        })
    }

    pub(crate) fn validate_project(project: &Project) -> Result<(), String> {
        validate_id(&project.id)?;
        if project.schema_version != 1 {
            return Err("Unsupported project schema version.".into());
        }
        project.validate_overview()?;
        if let Some(canvas) = &project.theme_canvas {
            canvas.validate(project)?;
        }
        let theme_ids: HashSet<_> = project
            .theme_definitions
            .iter()
            .map(|theme| &theme.id)
            .collect();
        crate::manuscript::validate_author(project.author_name.as_deref())?;
        if let Some(layout) = &project.manuscript {
            layout.validate()?;
        }
        if project.sections.len() > 500 {
            return Err("Too many project sections.".into());
        }
        let mut section_ids = HashSet::new();
        for section in &project.sections {
            validate_id(&section.id)?;
            if section.title.trim().is_empty()
                || section.title.chars().count() > 300
                || !section_ids.insert(&section.id)
            {
                return Err("Invalid or duplicate project section.".into());
            }
        }
        let mut ids = HashSet::new();
        for poem in &project.poems {
            poem.validate_planning()?;
            if poem.theme_ids.iter().any(|id| !theme_ids.contains(id)) {
                return Err("A poem refers to a missing collection theme.".into());
            }
            if poem
                .kind
                .as_deref()
                .is_some_and(|kind| !["poem", "dedication", "about", "text"].contains(&kind))
            {
                return Err("Unknown project page type.".into());
            }
            if poem
                .section_id
                .as_ref()
                .is_some_and(|id| !section_ids.contains(id))
            {
                return Err("Unknown poem section.".into());
            }
            crate::manuscript::validate_author(poem.author.as_deref())?;
            crate::manuscript::validate_dates(
                poem.composed_on.as_deref(),
                poem.updated_at.as_deref(),
            )?;
            validate_id(&poem.id)?;
            if !ids.insert(&poem.id) {
                return Err("Duplicate poem ID.".into());
            }
            if poem.file != format!("poems/{}.md", poem.id) {
                return Err("Poem path must be poems/<id>.md.".into());
            }
        }
        Ok(())
    }

    pub fn save(&mut self, workspace: &Workspace) -> Result<(), String> {
        if workspace.settings.schema_version != 1 {
            return Err("Unsupported settings schema version.".into());
        }
        let mut ids = HashSet::new();
        let mut updates = Vec::new();
        for project in &workspace.projects {
            Self::validate_project(project)?;
            if !ids.insert(&project.id) {
                return Err("Duplicate project ID.".into());
            }
            for poem in &project.poems {
                let key = format!("{}/{}", project.id, poem.id);
                let body = workspace
                    .documents
                    .get(&key)
                    .ok_or_else(|| format!("Missing document body: {key}"))?;
                updates.push((
                    PathBuf::from(format!("projects/{}/{}", project.id, poem.file)),
                    body.as_bytes().to_vec(),
                ));
            }
            updates.push((
                PathBuf::from(format!("projects/{}/project.json", project.id)),
                serde_json::to_vec_pretty(project).map_err(message)?,
            ));
        }
        updates.push((
            PathBuf::from("settings.json"),
            serde_json::to_vec_pretty(&workspace.settings).map_err(message)?,
        ));
        // Unchanged files retain their mtimes, including unrelated external revisions.
        updates.retain(|(path, bytes)| {
            self.observed.get(path).and_then(Option::as_ref) != Some(bytes)
        });
        // Check every target before writing any. A conflict keeps the draft in memory.
        for (relative, _) in &updates {
            let path = self.safe_path(relative)?;
            let current = match fs::read(&path) {
                Ok(bytes) => Some(bytes),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
                Err(e) => return Err(message(e)),
            };
            if current != self.observed.get(relative).cloned().flatten() {
                return Err(format!("{} changed outside Versewold. Copy your unsaved text somewhere safe, then reopen the app to load the external version.", relative.display()));
            }
        }
        // All conflicts are checked first; all backups finish before any primary
        // file changes. Failure leaves the workspace's existing files untouched.
        for (relative, incoming) in &updates {
            if relative
                .extension()
                .is_some_and(|extension| extension == "md")
                || relative
                    .file_name()
                    .is_some_and(|name| name == "project.json")
            {
                let history = Path::new("backups").join(relative.with_extension(""));
                self.ensure_directory(&history)?;
                let folder = self.safe_path(&history)?;
                let extension = relative
                    .extension()
                    .and_then(|value| value.to_str())
                    .ok_or("Missing backup format.")?;
                crate::backups::preserve(
                    &folder,
                    extension,
                    self.observed
                        .get(relative)
                        .and_then(|value| value.as_deref()),
                    incoming,
                )
                .map_err(|e| {
                    format!(
                        "Could not back up {}. No manuscript files were written: {e}",
                        relative.display()
                    )
                })?;
            }
        }
        for (relative, bytes) in updates {
            self.ensure_directory(relative.parent().ok_or("Missing parent folder.")?)?;
            let path = self.safe_path(&relative)?;
            // tempfile atomically replaces existing destinations on Windows and Unix.
            let mut temporary =
                tempfile::NamedTempFile::new_in(path.parent().unwrap()).map_err(message)?;
            temporary.write_all(&bytes).map_err(message)?;
            temporary.as_file().sync_all().map_err(message)?;
            temporary.persist(&path).map_err(message)?;
            self.observed.insert(relative, Some(bytes));
        }
        Ok(())
    }

    pub fn backups_directory(&mut self) -> Result<PathBuf, String> {
        self.ensure_directory(Path::new("backups"))?;
        self.safe_path(Path::new("backups"))
    }

    pub fn custom_forms(&self) -> Result<Vec<serde_json::Value>, String> {
        let mut forms = Vec::new();
        for entry in fs::read_dir(self.safe_path(Path::new("forms"))?).map_err(message)? {
            let entry = entry.map_err(message)?;
            if entry
                .path()
                .extension()
                .is_none_or(|extension| extension != "json")
            {
                continue;
            }
            let path = self.safe_path(&Path::new("forms").join(entry.file_name()))?;
            if entry.metadata().map_err(message)?.len() > 1_048_576 {
                return Err("Custom forms must be under 1 MiB.".into());
            }
            forms.push(
                serde_json::from_slice(&fs::read(&path).map_err(message)?)
                    .map_err(|e| format!("Invalid {}: {e}", path.display()))?,
            );
        }
        Ok(forms)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::PoemEntry;

    fn backup_versions(store: &Store, relative: &str) -> Vec<Vec<u8>> {
        let mut paths: Vec<_> = fs::read_dir(store.root.join("backups").join(relative))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .collect();
        paths.sort();
        paths.iter().map(|path| fs::read(path).unwrap()).collect()
    }

    fn workspace() -> Workspace {
        Workspace {
            settings: Settings::default(),
            projects: vec![Project {
                schema_version: 1,
                id: "book-1".into(),
                title: "A book".into(),
                description: None,
                intended_tone: None,
                themes: vec![],
                theme_definitions: vec![],
                theme_canvas: None,
                templates: vec![],
                sections: vec![],
                author_name: None,
                manuscript: None,
                poems: vec![PoemEntry {
                    id: "poem-1".into(),
                    title: "First light".into(),
                    file: "poems/poem-1.md".into(),
                    form_id: "free-verse".into(),
                    ..Default::default()
                }],
            }],
            documents: BTreeMap::from([(
                "book-1/poem-1".into(),
                "  A line\nA second line\n\nA stanza — café.\n".into(),
            )]),
        }
    }

    #[test]
    fn renaming_and_collection_planning_survive_restart_without_poem_revisions() {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path().join("data");
        let mut store = Store::new(root.clone()).unwrap();
        let mut draft = workspace();
        draft.projects[0].poems[0].updated_at = Some("2026-11-24T12:00:00Z".into());
        store.save(&draft).unwrap();
        let bodies = draft.documents.clone();
        let revisions = backup_versions(&store, "projects/book-1/poems/poem-1").len();
        draft.projects[0].title = "Seasons & home".into();
        draft.projects[0].description = Some("  Home — café\r\n\r\nA question.\n".into());
        draft.projects[0].intended_tone = Some("Reflective".into());
        draft.projects[0].themes = vec!["Home".into(), "Seasons".into()];
        store.save(&draft).unwrap();
        assert_eq!(
            backup_versions(&store, "projects/book-1/poems/poem-1").len(),
            revisions
        );
        let loaded = Store::new(root.clone()).unwrap().load().unwrap().workspace;
        let project = &loaded.projects[0];
        assert_eq!(project.id, "book-1");
        assert_eq!(project.title, "Seasons & home");
        assert_eq!(project.description, draft.projects[0].description);
        assert_eq!(project.intended_tone.as_deref(), Some("Reflective"));
        assert_eq!(project.themes, draft.projects[0].themes);
        assert_eq!(project.poems[0].file, "poems/poem-1.md");
        assert_eq!(
            project.poems[0].updated_at.as_deref(),
            Some("2026-11-24T12:00:00Z")
        );
        assert_eq!(loaded.documents, bodies);
        assert_eq!(
            fs::read(root.join("projects/book-1/poems/poem-1.md")).unwrap(),
            bodies["book-1/poem-1"].as_bytes()
        );
    }

    #[test]
    fn invalid_collection_planning_blocks_the_save_before_writing_poems() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        let mut draft = workspace();
        store.save(&draft).unwrap();
        let original = draft.documents["book-1/poem-1"].clone();
        draft.projects[0].themes = vec!["".into()];
        draft
            .documents
            .insert("book-1/poem-1".into(), "New draft".into());
        assert!(store.save(&draft).is_err());
        assert_eq!(
            fs::read_to_string(store.root.join("projects/book-1/poems/poem-1.md")).unwrap(),
            original
        );
    }

    #[test]
    fn poem_planning_and_theme_renames_persist_without_markdown_revisions() {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path().join("data");
        let mut store = Store::new(root.clone()).unwrap();
        let mut draft = workspace();
        draft.projects[0].themes = vec!["Home".into()];
        draft.projects[0].poems[0].updated_at = Some("2026-11-24T12:00:00Z".into());
        store.save(&draft).unwrap();
        let bodies = draft.documents.clone();
        let revisions = backup_versions(&store, "projects/book-1/poems/poem-1").len();
        draft.projects[0].themes.clear();
        draft.projects[0].theme_definitions = vec![crate::models::ProjectTheme {
            id: "theme-home".into(),
            label: "Home".into(),
        }];
        draft.projects[0].poems[0].theme_ids = vec!["theme-home".into()];
        draft.projects[0].poems[0].tone = Some("Tender".into());
        draft.projects[0].poems[0].planning_notes =
            Some("  🌙 Notes\r\n\r\n\tAn ending.  \n".into());
        store.save(&draft).unwrap();
        draft.projects[0].theme_definitions[0].label = "Belonging".into();
        store.save(&draft).unwrap();
        assert_eq!(
            backup_versions(&store, "projects/book-1/poems/poem-1").len(),
            revisions
        );
        let loaded = Store::new(root).unwrap().load().unwrap().workspace;
        let project = &loaded.projects[0];
        assert_eq!(project.theme_definitions[0].label, "Belonging");
        assert_eq!(project.poems[0].theme_ids, vec!["theme-home"]);
        assert_eq!(project.poems[0].tone.as_deref(), Some("Tender"));
        assert_eq!(
            project.poems[0].planning_notes,
            draft.projects[0].poems[0].planning_notes
        );
        assert_eq!(
            project.poems[0].updated_at.as_deref(),
            Some("2026-11-24T12:00:00Z")
        );
        assert_eq!(loaded.documents, bodies);
    }

    #[test]
    fn dangling_theme_links_block_the_entire_save_before_any_poem_write() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        let mut draft = workspace();
        draft.projects[0].theme_definitions = vec![crate::models::ProjectTheme {
            id: "theme-home".into(),
            label: "Home".into(),
        }];
        draft.projects[0].poems[0].theme_ids = vec!["theme-home".into()];
        store.save(&draft).unwrap();
        let original = draft.documents["book-1/poem-1"].clone();
        draft.projects[0].theme_definitions.clear();
        draft
            .documents
            .insert("book-1/poem-1".into(), "Changed draft".into());
        assert!(store
            .save(&draft)
            .unwrap_err()
            .contains("missing collection theme"));
        assert_eq!(
            fs::read_to_string(store.root.join("projects/book-1/poems/poem-1.md")).unwrap(),
            original
        );
    }

    #[test]
    fn roundtrip_keeps_markdown_exact_and_manifest_has_no_body() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        let mut draft = workspace();
        store.save(&draft).unwrap();
        assert_eq!(store.load().unwrap().workspace.documents, draft.documents);
        draft
            .documents
            .insert("book-1/poem-1".into(), "Revised\n".into());
        store.save(&draft).unwrap(); // replacing an existing file on Windows
        assert_eq!(store.load().unwrap().workspace.documents, draft.documents);
        assert!(
            !fs::read_to_string(store.root.join("projects/book-1/project.json"))
                .unwrap()
                .contains("Revised")
        );
    }

    #[test]
    fn external_edits_are_never_overwritten() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        let mut draft = workspace();
        store.save(&draft).unwrap();
        let path = store.root.join("projects/book-1/poems/poem-1.md");
        fs::write(&path, "External revision").unwrap();
        draft
            .documents
            .insert("book-1/poem-1".into(), "App revision".into());
        assert!(store.save(&draft).unwrap_err().contains("changed outside"));
        assert_eq!(fs::read_to_string(path).unwrap(), "External revision");
        assert_eq!(
            backup_versions(&store, "projects/book-1/poems/poem-1").len(),
            1
        );
    }

    #[test]
    fn unsafe_paths_and_newer_schemas_are_rejected() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        let mut draft = workspace();
        draft.projects[0].poems[0].file = "../../escape.md".into();
        assert!(store.save(&draft).is_err());
        assert!(store.safe_path(Path::new("../escape")).is_err());
        assert!(validate_id("../escape").is_err());
        draft = workspace();
        draft.projects[0].schema_version = 2;
        assert!(store.save(&draft).is_err());
    }

    #[test]
    fn missing_files_do_not_become_empty_drafts() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        store.save(&workspace()).unwrap();
        fs::remove_file(store.root.join("projects/book-1/poems/poem-1.md")).unwrap();
        assert!(store.load().unwrap_err().contains("Missing poem"));
    }

    #[test]
    fn legacy_choices_remain_until_roaming_migration_succeeds() {
        use crate::preferences::PreferencesStore;
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("portable")).unwrap();
        let path = store.root.join("settings.json");
        fs::write(&path, r#"{"schemaVersion":1,"activeProjectId":null,"activePoemId":null,"showGuidance":false,"editorFontSize":29}"#).unwrap();
        let mut loaded = store.load().unwrap();
        // Saving writing while migration is unavailable must retain the choices.
        store.save(&loaded.workspace).unwrap();
        let retained: serde_json::Value =
            serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(retained["editorFontSize"], 29);
        assert_eq!(retained["showGuidance"], false);
        let mut personal = PreferencesStore::new(directory.path().join("roaming"));
        let migrated = personal.load(loaded.legacy_preferences).unwrap();
        assert_eq!(migrated.preferences.writing.font_size, 29);
        assert!(!migrated.preferences.writing.show_guidance);
        // This mirrors Vue acknowledging successful migration before its next save.
        loaded.workspace.settings.legacy_editor_font_size = None;
        loaded.workspace.settings.legacy_show_guidance = None;
        store.save(&loaded.workspace).unwrap();
        let cleaned: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert!(cleaned.get("editorFontSize").is_none());
        assert!(cleaned.get("showGuidance").is_none());
    }

    #[test]
    fn backups_keep_exact_drafts_and_manifests_across_restarts_without_noop_copies() {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path().join("portable");
        let mut store = Store::new(root.clone()).unwrap();
        let mut draft = workspace();
        let original = draft.documents["book-1/poem-1"].as_bytes().to_vec();
        store.save(&draft).unwrap();
        store.save(&draft).unwrap();
        assert_eq!(
            backup_versions(&store, "projects/book-1/poems/poem-1"),
            vec![original.clone()]
        );
        let manifests = backup_versions(&store, "projects/book-1/project");
        let manifest: serde_json::Value = serde_json::from_slice(&manifests[0]).unwrap();
        assert_eq!(manifest["title"], "A book");
        assert_eq!(manifest["poems"][0]["file"], "poems/poem-1.md");
        assert!(manifest.get("documents").is_none());
        draft
            .documents
            .insert("book-1/poem-1".into(), "Second draft\r\n\r\n".into());
        store.save(&draft).unwrap();
        let mut reopened = Store::new(root).unwrap();
        let mut loaded = reopened.load().unwrap().workspace;
        loaded.documents.insert("book-1/poem-1".into(), "".into());
        reopened.save(&loaded).unwrap();
        assert_eq!(
            backup_versions(&reopened, "projects/book-1/poems/poem-1"),
            vec![original, b"Second draft\r\n\r\n".to_vec(), vec![]]
        );
        assert_eq!(
            backup_versions(&reopened, "projects/book-1/project").len(),
            1
        );
        assert_eq!(
            fs::read_to_string(reopened.root.join("projects/book-1/poems/poem-1.md")).unwrap(),
            ""
        );
    }

    #[test]
    fn backup_failure_prevents_every_primary_write() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().join("data")).unwrap();
        let mut draft = workspace();
        store.save(&draft).unwrap();
        let poem_path = store.root.join("projects/book-1/poems/poem-1.md");
        let manifest_path = store.root.join("projects/book-1/project.json");
        let original = fs::read(&poem_path).unwrap();
        let manifest = fs::read(&manifest_path).unwrap();
        draft
            .documents
            .insert("book-1/poem-1".into(), "Incoming revision\n".into());
        draft.projects[0].poems.push(PoemEntry {
            id: "poem-2".into(),
            title: "Another".into(),
            file: "poems/poem-2.md".into(),
            form_id: "free-verse".into(),
            ..Default::default()
        });
        draft
            .documents
            .insert("book-1/poem-2".into(), "New poem\n".into());
        // The first poem's snapshots succeed; a later backup folder is blocked.
        fs::write(
            store.root.join("backups/projects/book-1/poems/poem-2"),
            "Do not replace me",
        )
        .unwrap();
        assert!(store.save(&draft).is_err());
        assert_eq!(fs::read(poem_path).unwrap(), original);
        assert_eq!(fs::read(manifest_path).unwrap(), manifest);
        assert!(!store.root.join("projects/book-1/poems/poem-2.md").exists());
        // The incoming revision remains available even though the save failed.
        assert_eq!(
            backup_versions(&store, "projects/book-1/poems/poem-1")
                .last()
                .unwrap(),
            b"Incoming revision\n"
        );
    }
}
