mod backups;
mod commands;
mod file_commands;
mod fonts;
mod manuscript;
mod migration;
mod models;
mod pdf;
mod portable;
mod preferences;
mod storage;
mod theme_canvas;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(storage::StorageState::default())
        .manage(preferences::PreferencesState::default())
        .manage(pdf::PrintState::default())
        .invoke_handler(tauri::generate_handler![
            commands::load_workspace,
            commands::save_workspace,
            commands::load_custom_forms,
            commands::reveal_data_folder,
            commands::reveal_backups_folder,
            commands::load_user_settings,
            commands::save_user_settings,
            commands::reveal_settings_folder,
            commands::list_system_fonts,
            file_commands::save_project_copy,
            file_commands::load_project_copy,
            file_commands::save_poem_copy,
            file_commands::load_poem_files,
            file_commands::export_markdown,
            pdf::export_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Versewold");
}
