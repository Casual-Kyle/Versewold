//! Portable copies use metadata JSON and exact UTF-8 Markdown. All paths reach
//! this module through native dialogs; imports read first and never replace a
//! live project. Tests use isolated temporary directories, never user writing.
use crate::{models::Project, storage::Store};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

const MAX_TEXT: u64 = 16 * 1024 * 1024;
const MAX_METADATA: u64 = 8 * 1024 * 1024;
const MAX_TOTAL: usize = 128 * 1024 * 1024;
const MAX_POEMS: usize = 1000;

#[cfg(test)]
#[path = "portable_tests.rs"]
mod tests;

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectTransfer {
    pub project: Project,
    /// Poem IDs only, not filesystem paths. Bodies are never written in JSON.
    pub documents: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PoemMetadata {
    pub schema_version: u32,
    pub title: String,
    pub form_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub template: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub composed_on: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tone: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub planning_notes: Option<String>,
    /// Labels are portable across projects; project-local IDs are resolved on import.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub themes: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PoemTransfer {
    pub metadata: PoemMetadata,
    pub body: String,
}

fn error(cause: impl std::fmt::Display) -> String {
    cause.to_string()
}

pub fn filename(title: &str) -> String {
    let name: String = title
        .chars()
        .filter(|c| c.is_alphanumeric() || [' ', '-', '_'].contains(c))
        .take(60)
        .collect();
    let name = name.trim();
    if name.is_empty() {
        "Untitled".into()
    } else {
        name.into()
    }
}

/// Export destinations cannot replace any managed manuscript/settings file.
pub fn outside_data(path: &Path, data_root: &Path) -> Result<(), String> {
    let destination = if path.exists() {
        path.canonicalize().map_err(error)?
    } else {
        path.parent()
            .ok_or("Choose a destination folder.")?
            .canonicalize()
            .map_err(error)?
            .join(path.file_name().ok_or("Choose a filename.")?)
    };
    if destination.starts_with(data_root.canonicalize().map_err(error)?) {
        return Err("Choose an export destination outside Versewold’s app data folder.".into());
    }
    Ok(())
}

fn read_text(path: &Path, limit: u64) -> Result<String, String> {
    let metadata =
        fs::symlink_metadata(path).map_err(|e| format!("Cannot read {}: {e}", path.display()))?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err(format!("Choose a regular file: {}", path.display()));
    }
    if metadata.len() > limit {
        return Err(format!("File is too large: {}", path.display()));
    }
    let mut bytes = Vec::new();
    fs::File::open(path)
        .map_err(error)?
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(error)?;
    if bytes.len() as u64 > limit {
        return Err("File grew beyond the import size limit.".into());
    }
    String::from_utf8(bytes).map_err(|_| format!("{} must be UTF-8 text.", path.display()))
}

fn write_sync(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(error)?;
    file.write_all(bytes).map_err(error)?;
    file.sync_all().map_err(error)
}

fn check_project(transfer: &ProjectTransfer) -> Result<(), String> {
    Store::validate_project(&transfer.project)?;
    if transfer.project.poems.len() > MAX_POEMS || transfer.project.templates.len() > MAX_POEMS {
        return Err("A portable project supports up to 1,000 poems/templates.".into());
    }
    if transfer.documents.len() != transfer.project.poems.len() {
        return Err("Project documents must match its poem list.".into());
    }
    let mut total = 0;
    for poem in &transfer.project.poems {
        let body = transfer
            .documents
            .get(&poem.id)
            .ok_or_else(|| format!("Missing poem: {}", poem.title))?;
        if body.len() as u64 > MAX_TEXT {
            return Err("A poem exceeds the 16 MiB import/export limit.".into());
        }
        total += body.len();
    }
    if total > MAX_TOTAL {
        return Err("Project text exceeds the 128 MiB import/export limit.".into());
    }
    if serde_json::to_vec_pretty(&transfer.project)
        .map_err(error)?
        .len() as u64
        > MAX_METADATA
    {
        return Err("Project metadata exceeds 8 MiB.".into());
    }
    Ok(())
}

/// A new uniquely named folder is retained only after every file succeeds.
/// Existing exports are never overwritten, and failed copies clean themselves up.
pub fn save_project(parent: &Path, transfer: &ProjectTransfer) -> Result<PathBuf, String> {
    check_project(transfer)?;
    let folder = tempfile::Builder::new()
        .prefix(&format!("{}-", filename(&transfer.project.title)))
        .tempdir_in(parent)
        .map_err(error)?;
    fs::create_dir(folder.path().join("poems")).map_err(error)?;
    for poem in &transfer.project.poems {
        write_sync(
            &folder.path().join(&poem.file),
            transfer.documents[&poem.id].as_bytes(),
        )?;
    }
    write_sync(
        &folder.path().join("project.json"),
        &serde_json::to_vec_pretty(&transfer.project).map_err(error)?,
    )?;
    Ok(folder.keep())
}

pub fn load_project(manifest: &Path) -> Result<ProjectTransfer, String> {
    let project: Project = serde_json::from_str(&read_text(manifest, MAX_METADATA)?)
        .map_err(|e| format!("Invalid project JSON: {e}"))?;
    Store::validate_project(&project)?;
    if project.poems.len() > MAX_POEMS {
        return Err("Project contains more than 1,000 poems.".into());
    }
    let root = manifest
        .parent()
        .ok_or("Project folder is unavailable.")?
        .canonicalize()
        .map_err(error)?;
    let poems = root.join("poems");
    if !project.poems.is_empty()
        && fs::symlink_metadata(&poems)
            .map_err(error)?
            .file_type()
            .is_symlink()
    {
        return Err("The project’s poems folder cannot be a symbolic link.".into());
    }
    let mut documents = BTreeMap::new();
    let mut total = 0;
    for poem in &project.poems {
        let path = root.join(&poem.file);
        if !path.canonicalize().map_err(error)?.starts_with(&root) {
            return Err("A poem points outside the project folder.".into());
        }
        let body = read_text(&path, MAX_TEXT)?;
        total += body.len();
        if total > MAX_TOTAL {
            return Err("Project text exceeds 128 MiB.".into());
        }
        documents.insert(poem.id.clone(), body);
    }
    let transfer = ProjectTransfer { project, documents };
    check_project(&transfer)?;
    Ok(transfer)
}

fn check_metadata(metadata: &PoemMetadata) -> Result<(), String> {
    crate::models::validate_poem_planning(metadata.tone.as_deref(), metadata.planning_notes.as_deref())?;
    Project { themes: metadata.themes.clone(), ..Project::default() }.validate_overview()?;
    crate::manuscript::validate_author(metadata.author.as_deref())?;
    crate::manuscript::validate_dates(
        metadata.composed_on.as_deref(),
        metadata.updated_at.as_deref(),
    )?;
    if metadata
        .kind
        .as_deref()
        .is_some_and(|kind| !["poem", "dedication", "about", "text"].contains(&kind))
    {
        return Err("Unknown poem/page type.".into());
    }
    if metadata.schema_version != 1 {
        return Err("Unsupported poem metadata version.".into());
    }
    crate::storage::validate_id(&metadata.form_id)?;
    if serde_json::to_vec_pretty(metadata).map_err(error)?.len() as u64 > MAX_METADATA {
        return Err("Poem metadata exceeds 8 MiB.".into());
    }
    Ok(())
}

fn sidecar(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".versewold.json");
    PathBuf::from(name)
}

pub fn save_poem(parent: &Path, transfer: &PoemTransfer) -> Result<PathBuf, String> {
    check_metadata(&transfer.metadata)?;
    if transfer.body.len() as u64 > MAX_TEXT {
        return Err("Poem text exceeds 16 MiB.".into());
    }
    let folder = tempfile::Builder::new()
        .prefix(&format!("{}-", filename(&transfer.metadata.title)))
        .tempdir_in(parent)
        .map_err(error)?;
    let path = folder.path().join("poem.md");
    write_sync(&path, transfer.body.as_bytes())?;
    write_sync(
        &sidecar(&path),
        &serde_json::to_vec_pretty(&transfer.metadata).map_err(error)?,
    )?;
    Ok(folder.keep())
}

pub fn load_poem(path: &Path) -> Result<PoemTransfer, String> {
    if !path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
    {
        return Err("Choose a Markdown (.md) poem.".into());
    }
    let body = read_text(path, MAX_TEXT)?;
    let sidecar = sidecar(path);
    let metadata = match fs::symlink_metadata(&sidecar) {
        Ok(_) => serde_json::from_str(&read_text(&sidecar, MAX_METADATA)?)
            .map_err(|e| format!("Invalid poem metadata: {e}"))?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => PoemMetadata {
            schema_version: 1,
            title: path
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or("Imported poem")
                .into(),
            form_id: "free-verse".into(),
            template: None,
            ..PoemMetadata::default()
        },
        Err(e) => return Err(error(e)),
    };
    check_metadata(&metadata)?;
    Ok(PoemTransfer { metadata, body })
}

pub fn load_poems(paths: &[PathBuf]) -> Result<Vec<PoemTransfer>, String> {
    if paths.len() > MAX_POEMS {
        return Err("Choose up to 1,000 poems at a time.".into());
    }
    let mut total = 0;
    paths
        .iter()
        .map(|path| {
            let poem = load_poem(path)?;
            total += poem.body.len();
            if total > MAX_TOTAL {
                return Err("Selected poems exceed 128 MiB.".into());
            }
            Ok(poem)
        })
        .collect()
}

/// Native Save dialog confirms replacing an existing export. Atomic replacement
/// leaves its old bytes intact if writing/syncing the temporary file fails.
pub fn export_markdown(path: &Path, body: &str) -> Result<(), String> {
    if !path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
    {
        return Err("Use a Markdown (.md) filename.".into());
    }
    if fs::symlink_metadata(path)
        .is_ok_and(|metadata| !metadata.is_file() || metadata.file_type().is_symlink())
    {
        return Err("Choose a regular Markdown file.".into());
    }
    let mut temporary =
        tempfile::NamedTempFile::new_in(path.parent().ok_or("Choose an export folder.")?)
            .map_err(error)?;
    temporary.write_all(body.as_bytes()).map_err(error)?;
    temporary.as_file().sync_all().map_err(error)?;
    temporary.persist(path).map_err(error)?;
    Ok(())
}
