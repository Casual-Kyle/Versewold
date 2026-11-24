//! Thin IPC boundary: Vue cannot select arbitrary filesystem paths.
use crate::preferences::{
    LegacyPreferences, LoadedPreferences, PreferencesState, PreferencesStore, UserPreferences,
};
use crate::{
    models::{LoadedWorkspace, Workspace},
    storage::{StorageState, Store},
};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn load_user_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, PreferencesState>,
    legacy: LegacyPreferences,
) -> Result<LoadedPreferences, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(PreferencesStore::new(
            app.path().app_config_dir().map_err(|e| e.to_string())?,
        ));
    }
    guard.as_mut().unwrap().load(legacy)
}
#[tauri::command]
pub fn save_user_settings(
    preferences: UserPreferences,
    state: tauri::State<'_, PreferencesState>,
) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .as_mut()
        .ok_or("Load preferences first.")?
        .save(&preferences)
}
#[tauri::command]
pub fn reveal_settings_folder(
    app: tauri::AppHandle,
    state: tauri::State<'_, PreferencesState>,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let root = &guard.as_ref().ok_or("Load preferences first.")?.root;
    app.opener()
        .open_path(root.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
    crate::fonts::system_fonts()
}

#[tauri::command]
pub fn load_workspace(
    app: tauri::AppHandle,
    state: tauri::State<'_, StorageState>,
) -> Result<LoadedWorkspace, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        let executable = std::env::current_exe().map_err(|e| e.to_string())?;
        let legacy_root = executable
            .parent()
            .ok_or("Cannot locate the previous data folder.")?
            .join("Versewold-data");
        *guard = Some(Store::app_data(
            app.path().app_config_dir().map_err(|e| e.to_string())?,
            legacy_root,
        )?);
    }
    guard.as_mut().unwrap().load()
}

#[tauri::command]
pub fn save_workspace(
    workspace: Workspace,
    state: tauri::State<'_, StorageState>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    guard
        .as_mut()
        .ok_or("Load the workspace before saving.")?
        .save(&workspace)
}

#[tauri::command]
pub fn load_custom_forms(
    state: tauri::State<'_, StorageState>,
) -> Result<Vec<serde_json::Value>, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard
        .as_ref()
        .ok_or("Load the workspace first.")?
        .custom_forms()
}

#[tauri::command]
pub fn reveal_data_folder(
    app: tauri::AppHandle,
    state: tauri::State<'_, StorageState>,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let root = &guard.as_ref().ok_or("Load the workspace first.")?.root;
    app.opener()
        .open_path(root.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reveal_backups_folder(
    app: tauri::AppHandle,
    state: tauri::State<'_, StorageState>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let root = guard
        .as_mut()
        .ok_or("Load the workspace first.")?
        .backups_directory()?;
    app.opener()
        .open_path(root.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}
