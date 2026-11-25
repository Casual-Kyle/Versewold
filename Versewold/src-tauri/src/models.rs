use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tone: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tone_intensity: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub planning_notes: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub theme_ids: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectTheme {
    pub id: String,
    pub label: String,
}

pub fn validate_poem_planning(
    tone: Option<&str>,
    notes: Option<&str>,
    intensity: Option<u8>,
) -> Result<(), String> {
    if tone.is_some_and(|value| value.chars().count() > 200 || value.chars().any(char::is_control))
    {
        return Err("Poem tone must be one line of up to 200 characters.".into());
    }
    if intensity.is_some_and(|value| !(1..=5).contains(&value)) {
        return Err("Tone intensity must be a whole number from 1 to 5.".into());
    }
    if notes.is_some_and(|value| {
        value.chars().count() > 20_000
            || value
                .chars()
                .any(|c| c.is_control() && !['\n', '\r', '\t'].contains(&c))
    }) {
        return Err("Planning notes must be text of up to 20,000 characters.".into());
    }
    Ok(())
}

impl PoemEntry {
    pub fn validate_planning(&self) -> Result<(), String> {
        validate_poem_planning(
            self.tone.as_deref(),
            self.planning_notes.as_deref(),
            self.tone_intensity,
        )?;
        if self.theme_ids.len() > 50 {
            return Err("Too many poem theme links.".into());
        }
        let mut ids = HashSet::new();
        for id in &self.theme_ids {
            crate::storage::validate_id(id)?;
            if !ids.insert(id) {
                return Err("Duplicate poem theme link.".into());
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Project {
    pub schema_version: u32,
    pub id: String,
    pub title: String,
    pub poems: Vec<PoemEntry>,
    /// Optional collection planning, retained through native saves and portable copies.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub intended_tone: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub themes: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub theme_definitions: Vec<ProjectTheme>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme_canvas: Option<crate::theme_canvas::ThemeCanvas>,
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

impl Project {
    pub fn validate_overview(&self) -> Result<(), String> {
        if self.description.as_ref().is_some_and(|value| {
            value.chars().count() > 20_000
                || value
                    .chars()
                    .any(|c| c.is_control() && !['\n', '\r', '\t'].contains(&c))
        }) {
            return Err("Description must be text of up to 20,000 characters.".into());
        }
        if self
            .intended_tone
            .as_ref()
            .is_some_and(|value| value.chars().count() > 200 || value.chars().any(char::is_control))
        {
            return Err("Intended tone must be one line of up to 200 characters.".into());
        }
        if self.themes.len() > 50
            || self.themes.iter().any(|theme| {
                theme.trim().is_empty()
                    || theme.chars().count() > 80
                    || theme.chars().any(char::is_control)
            })
        {
            return Err("Use up to 50 themes, each with 1–80 characters on one line.".into());
        }
        if self.theme_definitions.len() > 50
            || (!self.theme_definitions.is_empty() && !self.themes.is_empty())
        {
            return Err("Invalid collection theme vocabulary.".into());
        }
        let mut ids = HashSet::new();
        for theme in &self.theme_definitions {
            crate::storage::validate_id(&theme.id)?;
            if !ids.insert(&theme.id)
                || theme.label.trim().is_empty()
                || theme.label.chars().count() > 80
                || theme.label.chars().any(char::is_control)
            {
                return Err("Invalid or duplicate collection theme.".into());
            }
        }
        Ok(())
    }
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

#[cfg(test)]
mod overview_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn older_poems_default_to_empty_planning_and_invalid_theme_links_are_rejected() {
        let mut poem: PoemEntry = serde_json::from_value(json!({
            "id":"poem", "title":"A poem", "file":"poems/poem.md", "formId":"free-verse"
        }))
        .unwrap();
        poem.validate_planning().unwrap();
        assert!(poem.tone.is_none() && poem.planning_notes.is_none() && poem.theme_ids.is_empty());
        let value = serde_json::to_value(&poem).unwrap();
        for field in ["tone", "planningNotes", "themeIds"] {
            assert!(value.get(field).is_none());
        }
        poem.theme_ids = vec!["same".into(), "same".into()];
        assert!(poem.validate_planning().is_err());
        poem.theme_ids.clear();
        poem.tone = Some("bad\ntone".into());
        assert!(poem.validate_planning().is_err());
        let project = Project {
            theme_definitions: vec![
                ProjectTheme {
                    id: "same".into(),
                    label: "Home".into(),
                },
                ProjectTheme {
                    id: "same".into(),
                    label: "Seasons".into(),
                },
            ],
            ..Project::default()
        };
        assert!(project.validate_overview().is_err());
    }

    #[test]
    fn old_projects_default_to_empty_planning_without_adding_manifest_fields() {
        let project: Project = serde_json::from_value(json!({
            "schemaVersion": 1, "id": "book", "title": "A book", "poems": []
        }))
        .unwrap();
        assert!(project.description.is_none());
        assert!(project.intended_tone.is_none());
        assert!(project.themes.is_empty());
        project.validate_overview().unwrap();
        let value = serde_json::to_value(project).unwrap();
        for field in ["description", "intendedTone", "themes"] {
            assert!(value.get(field).is_none());
        }
    }

    #[test]
    fn planning_limits_allow_paragraphs_and_count_unicode_characters() {
        let mut project = Project {
            description: Some("  Home — café\r\n\r\n\tA question.  \n".into()),
            intended_tone: Some("🌙".repeat(200)),
            themes: vec!["🌲".repeat(80)],
            ..Project::default()
        };
        project.validate_overview().unwrap();
        project.description = Some("🌲".repeat(20_000));
        project.validate_overview().unwrap();
        project.description = Some("🌲".repeat(20_001));
        assert!(project.validate_overview().is_err());
        project.description = None;
        project.intended_tone = Some("two\nlines".into());
        assert!(project.validate_overview().is_err());
        project.intended_tone = None;
        project.themes = vec![" ".into()];
        assert!(project.validate_overview().is_err());
        project.themes = vec!["bad\ttheme".into()];
        assert!(project.validate_overview().is_err());
        project.themes = vec!["Home".into(); 51];
        assert!(project.validate_overview().is_err());
    }
}
