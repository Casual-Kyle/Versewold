//! Personal preferences belong in Tauri's app_config_dir (Roaming on Windows),
//! beside projects, templates, and backups. No caller can supply a filesystem path.
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, io::Write, path::PathBuf, sync::Mutex};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UserPreferences {
    pub schema_version: u32,
    #[serde(default)]
    pub profile: AuthorProfile,
    pub appearance: Appearance,
    pub writing: Writing,
}
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthorProfile {
    pub author_name: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Appearance {
    pub preset: String,
    pub color_scheme: ColorScheme,
    pub colors: BTreeMap<String, String>,
    pub interface_font: String,
    pub heading_font: String,
    pub mono_font: String,
    pub interface_font_size: u32,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ColorScheme {
    Dark,
    Light,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Writing {
    pub font: String,
    pub font_size: u32,
    pub line_height: f64,
    pub max_width: u32,
    pub spellcheck: bool,
    pub soft_wrap: bool,
    pub show_statistics: bool,
    pub show_guidance: bool,
    // Optional in version 1 so existing roaming settings continue to load.
    #[serde(default)]
    pub strict_formatting: bool,
}
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyPreferences {
    pub show_guidance: Option<bool>,
    pub editor_font_size: Option<u32>,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedPreferences {
    pub preferences: UserPreferences,
    pub settings_directory: String,
    pub migrated: bool,
}
#[derive(Default)]
pub struct PreferencesState(pub Mutex<Option<PreferencesStore>>);
pub struct PreferencesStore {
    pub root: PathBuf,
    observed: Option<Vec<u8>>,
    loaded: bool,
}

impl Default for UserPreferences {
    fn default() -> Self {
        // One checked-in defaults file is shared with TypeScript; neither side drifts.
        serde_json::from_str(include_str!("../../src/domain/default-preferences.json"))
            .expect("bundled preference defaults must be valid")
    }
}
impl UserPreferences {
    pub fn validate(&self) -> Result<(), String> {
        if self.profile.author_name.chars().count() > 200
            || self.profile.author_name.chars().any(char::is_control)
        {
            return Err(
                "Author name must contain at most 200 characters without control characters."
                    .into(),
            );
        }
        if self.schema_version != 1 {
            return Err("Unsupported user-settings schema version.".into());
        }
        if !["heather-earth", "midnight-ink", "warm-parchment", "custom"]
            .contains(&self.appearance.preset.as_str())
        {
            return Err("Unknown theme preset.".into());
        }
        let expected = Self::default().appearance.colors;
        if self.appearance.colors.len() != expected.len()
            || expected
                .keys()
                .any(|key| !self.appearance.colors.contains_key(key))
        {
            return Err("The theme must specify every supported palette role.".into());
        }
        if self.appearance.colors.values().any(|value| {
            value.len() != 7
                || !value.starts_with('#')
                || !value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
        }) {
            return Err("Colors must use six-digit #RRGGBB values.".into());
        }
        for font in [
            &self.appearance.interface_font,
            &self.appearance.heading_font,
            &self.appearance.mono_font,
            &self.writing.font,
        ] {
            if font.trim().is_empty()
                || font.chars().count() > 120
                || font.chars().any(char::is_control)
            {
                return Err(
                    "Font families must be nonempty names of at most 120 characters.".into(),
                );
            }
        }
        if !(11..=22).contains(&self.appearance.interface_font_size)
            || !(12..=48).contains(&self.writing.font_size)
            || !(360..=1200).contains(&self.writing.max_width)
            || !self.writing.line_height.is_finite()
            || !(1.0..=3.0).contains(&self.writing.line_height)
        {
            return Err("Typography settings are outside the supported ranges.".into());
        }
        Ok(())
    }
}
impl PreferencesStore {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            observed: None,
            loaded: false,
        }
    }
    fn path(&self) -> Result<PathBuf, String> {
        let path = self.root.join("user-settings.json");
        for target in [&self.root, &path] {
            if fs::symlink_metadata(target).is_ok_and(|m| m.file_type().is_symlink()) {
                return Err(
                    "The preferences directory and file must not be symbolic links.".into(),
                );
            }
        }
        Ok(path)
    }
    fn read(&self) -> Result<Option<Vec<u8>>, String> {
        let path = self.path()?;
        if fs::metadata(&path).is_ok_and(|m| m.len() > 131_072) {
            return Err("The user-settings file exceeds 128 KiB.".into());
        }
        match fs::read(&path) {
            Ok(bytes) => Ok(Some(bytes)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(format!("Cannot read {}: {e}", path.display())),
        }
    }
    pub fn load(&mut self, legacy: LegacyPreferences) -> Result<LoadedPreferences, String> {
        self.loaded = false;
        self.observed = self.read()?;
        let exists = self.observed.is_some();
        let migrated =
            !exists && (legacy.show_guidance.is_some() || legacy.editor_font_size.is_some());
        let preferences = if let Some(bytes) = &self.observed {
            serde_json::from_slice::<UserPreferences>(bytes)
                .map_err(|e| format!("Invalid user-settings.json: {e}"))?
        } else {
            let mut defaults = UserPreferences::default();
            if let Some(size) = legacy.editor_font_size {
                defaults.writing.font_size = size.clamp(12, 48);
            }
            if let Some(show) = legacy.show_guidance {
                defaults.writing.show_guidance = show;
            }
            defaults
        };
        preferences.validate()?;
        self.loaded = true;
        if !exists {
            self.save(&preferences)?;
        }
        Ok(LoadedPreferences {
            preferences,
            settings_directory: self.root.to_string_lossy().into_owned(),
            migrated,
        })
    }
    pub fn save(&mut self, preferences: &UserPreferences) -> Result<(), String> {
        if !self.loaded {
            return Err("Load preferences successfully before saving.".into());
        }
        preferences.validate()?;
        let bytes = serde_json::to_vec_pretty(preferences).map_err(|e| e.to_string())?;
        if self.observed.as_ref() == Some(&bytes) {
            return Ok(());
        }
        if self.read()? != self.observed {
            return Err("user-settings.json changed outside Versewold. Reopen the app to load those changes before saving preferences.".into());
        }
        let path = self.path()?;
        fs::create_dir_all(&self.root)
            .map_err(|e| format!("Cannot create {}: {e}", self.root.display()))?;
        let mut temporary =
            tempfile::NamedTempFile::new_in(&self.root).map_err(|e| e.to_string())?;
        temporary.write_all(&bytes).map_err(|e| e.to_string())?;
        temporary.as_file().sync_all().map_err(|e| e.to_string())?;
        temporary.persist(path).map_err(|e| e.to_string())?;
        self.observed = Some(bytes);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migration_is_once_and_personal_preferences_survive_reopen() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = PreferencesStore::new(directory.path().join("roaming"));
        let loaded = store
            .load(LegacyPreferences {
                editor_font_size: Some(28),
                show_guidance: Some(false),
            })
            .unwrap();
        assert!(loaded.migrated);
        assert_eq!(loaded.preferences.writing.font_size, 28);
        assert!(!loaded.preferences.writing.show_guidance);
        let mut changed = loaded.preferences;
        changed.writing.font = "Yu Gothic".into();
        changed
            .appearance
            .colors
            .insert("lavender".into(), "#123456".into());
        store.save(&changed).unwrap();
        let reopened = PreferencesStore::new(store.root.clone())
            .load(LegacyPreferences {
                editor_font_size: Some(18),
                show_guidance: Some(true),
            })
            .unwrap();
        assert!(!reopened.migrated);
        assert_eq!(reopened.preferences.writing.font_size, 28);
        assert_eq!(reopened.preferences.writing.font, "Yu Gothic");
        assert_eq!(
            reopened.preferences.appearance.colors["lavender"],
            "#123456"
        );
    }
    #[test]
    fn malformed_preferences_and_external_changes_are_preserved() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = PreferencesStore::new(directory.path().to_owned());
        let original = store
            .load(LegacyPreferences::default())
            .unwrap()
            .preferences;
        fs::write(store.root.join("user-settings.json"), "External revision").unwrap();
        let mut changed = original;
        changed.writing.font_size = 24;
        assert!(store
            .save(&changed)
            .unwrap_err()
            .contains("changed outside"));
        assert!(PreferencesStore::new(store.root.clone())
            .load(LegacyPreferences::default())
            .is_err());
        assert_eq!(
            fs::read_to_string(store.root.join("user-settings.json")).unwrap(),
            "External revision"
        );
    }
    #[test]
    fn invalid_colors_ranges_and_versions_are_rejected() {
        let mut settings = UserPreferences::default();
        settings.validate().unwrap();
        settings
            .appearance
            .colors
            .insert("earth".into(), "red;display:none".into());
        assert!(settings.validate().is_err());
        settings = UserPreferences::default();
        settings.writing.line_height = f64::NAN;
        assert!(settings.validate().is_err());
        settings = UserPreferences::default();
        settings.schema_version = 2;
        assert!(settings.validate().is_err());
        settings = UserPreferences::default();
        settings.appearance.interface_font_size = 1;
        assert!(settings.validate().is_err());
    }
    #[test]
    fn strict_is_optional_in_old_settings_and_survives_reopen() {
        let directory = tempfile::tempdir().unwrap();
        let mut old = serde_json::to_value(UserPreferences::default()).unwrap();
        old["writing"]
            .as_object_mut()
            .unwrap()
            .remove("strictFormatting");
        old["writing"]["fontSize"] = 27.into();
        fs::write(
            directory.path().join("user-settings.json"),
            serde_json::to_vec_pretty(&old).unwrap(),
        )
        .unwrap();
        let mut store = PreferencesStore::new(directory.path().to_owned());
        let mut loaded = store
            .load(LegacyPreferences::default())
            .unwrap()
            .preferences;
        assert!(!loaded.writing.strict_formatting);
        assert_eq!(loaded.writing.font_size, 27);
        loaded.writing.strict_formatting = true;
        store.save(&loaded).unwrap();
        let reopened = PreferencesStore::new(directory.path().to_owned())
            .load(LegacyPreferences::default())
            .unwrap()
            .preferences;
        assert!(reopened.writing.strict_formatting);
        assert_eq!(reopened.writing.font_size, 27);
    }
    #[test]
    fn optional_author_profile_defaults_without_resetting_existing_settings() {
        let directory = tempfile::tempdir().unwrap();
        let mut old = serde_json::to_value(UserPreferences::default()).unwrap();
        old.as_object_mut().unwrap().remove("profile");
        old["writing"]["fontSize"] = 25.into();
        fs::write(
            directory.path().join("user-settings.json"),
            serde_json::to_vec(&old).unwrap(),
        )
        .unwrap();
        let mut store = PreferencesStore::new(directory.path().to_owned());
        let mut loaded = store
            .load(LegacyPreferences::default())
            .unwrap()
            .preferences;
        assert!(loaded.profile.author_name.is_empty());
        assert_eq!(loaded.writing.font_size, 25);
        loaded.profile.author_name = "A. Writer".into();
        store.save(&loaded).unwrap();
        assert_eq!(
            PreferencesStore::new(directory.path().to_owned())
                .load(LegacyPreferences::default())
                .unwrap()
                .preferences
                .profile
                .author_name,
            "A. Writer"
        );
        loaded.profile.author_name = "Invalid\nByline".into();
        assert!(loaded.validate().is_err());
    }
}
