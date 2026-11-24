use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PoemEntry {
    pub id: String,
    pub title: String,
    pub file: String,
    pub form_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub section_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub composed_on: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Project {
    pub schema_version: u32,
    pub id: String,
    pub title: String,
    pub poems: Vec<PoemEntry>,
    /// Project-scoped form snapshots make portable copies self-contained.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub templates: Vec<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub sections: Vec<Section>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manuscript: Option<crate::manuscript::ManuscriptSettings>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Section {
    pub id: String,
    pub title: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub schema_version: u32,
    pub active_project_id: Option<String>,
    pub active_poem_id: Option<String>,
    // Keep legacy choices during failed preference migration. Vue removes them
    // only after the roaming preferences file has loaded/saved successfully.
    #[serde(
        default,
        rename = "showGuidance",
        skip_serializing_if = "Option::is_none"
    )]
    pub legacy_show_guidance: Option<bool>,
    #[serde(
        default,
        rename = "editorFontSize",
        skip_serializing_if = "Option::is_none"
    )]
    pub legacy_editor_font_size: Option<u32>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            active_project_id: None,
            active_poem_id: None,
            legacy_show_guidance: None,
            legacy_editor_font_size: None,
        }
    }
}

/// Documents are an IPC transport only; on disk each value is a separate .md file.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Workspace {
    pub settings: Settings,
    pub projects: Vec<Project>,
    pub documents: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedWorkspace {
    pub workspace: Workspace,
    pub data_directory: String,
    pub legacy_preferences: crate::preferences::LegacyPreferences,
}
