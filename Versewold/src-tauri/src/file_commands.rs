//! Dialog-scoped IPC: JavaScript supplies content, never filesystem paths.
//! Blocking native dialogs and disk I/O run off the UI thread. Cancellation is
//! a successful no-op, and the storage mutex is never held while choosing files.
use crate::portable::{self, PoemTransfer, ProjectTransfer};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn save_project_copy(
    app: tauri::AppHandle,
    transfer: ProjectTransfer,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(parent) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Main window is unavailable.")?,
            )
            .set_title("Save project copy — choose a parent folder")
            .blocking_pick_folder()
        else {
            return Ok(None);
        };
        let parent = parent.into_path().map_err(|e| e.to_string())?;
        portable::outside_data(
            &parent,
            &app.path().app_config_dir().map_err(|e| e.to_string())?,
        )?;
        Ok(Some(
            portable::save_project(&parent, &transfer)?
                .to_string_lossy()
                .into_owned(),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn load_project_copy(app: tauri::AppHandle) -> Result<Option<ProjectTransfer>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(path) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Main window is unavailable.")?,
            )
            .set_title("Load project — choose project.json")
            .add_filter("Versewold project", &["json"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        portable::load_project(&path).map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_poem_copy(
    app: tauri::AppHandle,
    transfer: PoemTransfer,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(parent) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Main window is unavailable.")?,
            )
            .set_title("Save poem copy — choose a parent folder")
            .blocking_pick_folder()
        else {
            return Ok(None);
        };
        let parent = parent.into_path().map_err(|e| e.to_string())?;
        portable::outside_data(
            &parent,
            &app.path().app_config_dir().map_err(|e| e.to_string())?,
        )?;
        Ok(Some(
            portable::save_poem(&parent, &transfer)?
                .to_string_lossy()
                .into_owned(),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn load_poem_files(app: tauri::AppHandle) -> Result<Option<Vec<PoemTransfer>>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(paths) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Main window is unavailable.")?,
            )
            .set_title("Load poems — Markdown files")
            .add_filter("Markdown poems", &["md"])
            .blocking_pick_files()
        else {
            return Ok(None);
        };
        let paths = paths
            .into_iter()
            .map(|path| path.into_path().map_err(|e| e.to_string()))
            .collect::<Result<Vec<_>, _>>()?;
        portable::load_poems(&paths).map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn export_markdown(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(path) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Main window is unavailable.")?,
            )
            .set_title("Export Markdown")
            .set_file_name(format!("{}.md", portable::filename(&title)))
            .add_filter("Markdown", &["md"])
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        portable::outside_data(
            &path,
            &app.path().app_config_dir().map_err(|e| e.to_string())?,
        )?;
        portable::export_markdown(&path, &body)?;
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}
