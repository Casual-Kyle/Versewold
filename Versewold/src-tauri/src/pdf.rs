//! Print the already paginated manuscript DOM with the WebView's font shaping.
//! Only the native Save dialog chooses the destination. WebView2 writes a
//! temporary sibling; the confirmed destination changes only after success.
use crate::manuscript::ManuscriptSettings;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

#[derive(Default)]
pub struct PrintState(Arc<AtomicBool>);
struct PrintGuard(Arc<AtomicBool>);
impl Drop for PrintGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

#[tauri::command]
pub async fn export_pdf(
    app: tauri::AppHandle,
    state: tauri::State<'_, PrintState>,
    title: String,
    settings: ManuscriptSettings,
) -> Result<Option<String>, String> {
    settings.validate()?;
    if state.0.swap(true, Ordering::AcqRel) {
        return Err("A PDF export is already running.".into());
    }
    let guard = PrintGuard(state.0.clone());
    #[cfg(windows)]
    return tauri::async_runtime::spawn_blocking(move || {
        print_windows(app, title, settings, guard)
    })
    .await
    .map_err(|e| e.to_string())?;
    #[cfg(not(windows))]
    {
        let _ = (app, title, settings, guard);
        Err("PDF export currently requires the Windows desktop app.".into())
    }
}

#[cfg(windows)]
fn print_windows(
    app: tauri::AppHandle,
    title: String,
    settings: ManuscriptSettings,
    guard: PrintGuard,
) -> Result<Option<String>, String> {
    use std::{fs, sync::mpsc, time::Duration};
    use tauri::Manager;
    use tauri_plugin_dialog::DialogExt;
    use webview2_com::{
        Microsoft::Web::WebView2::Win32::{ICoreWebView2Environment6, ICoreWebView2_7},
        PrintToPdfCompletedHandler,
    };
    use windows::core::{Interface, HSTRING, PCWSTR};
    let window = app
        .get_webview_window("main")
        .ok_or("Main window is unavailable.")?;
    let Some(path) = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Export manuscript as PDF")
        .set_file_name(format!("{}.pdf", crate::portable::filename(&title)))
        .add_filter("PDF manuscript", &["pdf"])
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    crate::portable::outside_data(
        &path,
        &app.path().app_config_dir().map_err(|e| e.to_string())?,
    )?;
    if !path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"))
    {
        return Err("Use a PDF (.pdf) filename.".into());
    }
    if fs::symlink_metadata(&path)
        .is_ok_and(|metadata| !metadata.is_file() || metadata.file_type().is_symlink())
    {
        return Err("Choose a regular PDF file.".into());
    }
    // Closing the handle lets WebView2 open the temporary path on Windows.
    let temporary =
        tempfile::NamedTempFile::new_in(path.parent().ok_or("Choose an export folder.")?)
            .map_err(|e| e.to_string())?
            .into_temp_path();
    let (sender, receiver) =
        mpsc::sync_channel::<Result<(tempfile::TempPath, PrintGuard), String>>(1);
    let setup_sender = sender.clone();
    let (width, height) = settings.size();
    window
        .with_webview(move |webview| {
            // COM interfaces stay on the WebView UI thread. The completion handler
            // owns the temporary path and lock even if the waiting command times out.
            let start = || -> windows::core::Result<()> {
                unsafe {
                    let core: ICoreWebView2_7 = webview.controller().CoreWebView2()?.cast()?;
                    let environment: ICoreWebView2Environment6 = webview.environment().cast()?;
                    let print = environment.CreatePrintSettings()?;
                    print.SetPageWidth(width / 25.4)?;
                    print.SetPageHeight(height / 25.4)?;
                    print.SetMarginTop(0.0)?;
                    print.SetMarginBottom(0.0)?;
                    print.SetMarginLeft(0.0)?;
                    print.SetMarginRight(0.0)?;
                    print.SetScaleFactor(1.0)?;
                    print.SetShouldPrintBackgrounds(true)?;
                    print.SetShouldPrintHeaderAndFooter(false)?;
                    let output = HSTRING::from(temporary.as_os_str());
                    let handler =
                        PrintToPdfCompletedHandler::create(Box::new(move |result, success| {
                            let completed = result.map_err(|e| e.to_string()).and_then(|()| {
                                if success {
                                    Ok((temporary, guard))
                                } else {
                                    Err("The WebView could not produce this PDF.".into())
                                }
                            });
                            let _ = sender.send(completed);
                            Ok(())
                        }));
                    core.PrintToPdf(PCWSTR(output.as_ptr()), &print, &handler)
                }
            };
            if let Err(error) = start() {
                let _ = setup_sender.send(Err(format!("PDF printing could not start: {error}")));
            }
        })
        .map_err(|e| e.to_string())?;
    let (temporary, _guard) = receiver
        .recv_timeout(Duration::from_secs(120))
        .map_err(|_| {
            "PDF printing did not finish in time. Your existing export was preserved.".to_string()
        })??;
    finish_pdf(temporary, &path)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[cfg(windows)]
fn finish_pdf(temporary: tempfile::TempPath, path: &std::path::Path) -> Result<(), String> {
    use std::{fs::OpenOptions, io::Read};
    // FlushFileBuffers requires write access on Windows, including when the
    // bytes were produced by WebView2 rather than written through this handle.
    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(&temporary)
        .map_err(|e| format!("Could not open the generated PDF: {e}"))?;
    let mut header = [0; 5];
    file.read_exact(&mut header)
        .map_err(|e| format!("Could not read the generated PDF: {e}"))?;
    if &header != b"%PDF-" {
        return Err("The generated file was not a PDF. Your existing export was preserved.".into());
    }
    file.sync_all()
        .map_err(|e| format!("Could not sync the generated PDF: {e}"))?;
    drop(file);
    temporary
        .persist(path)
        .map_err(|e| format!("Could not save the PDF: {e}"))?;
    Ok(())
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use std::fs;
    #[test]
    fn completed_pdf_replaces_atomically_and_invalid_output_preserves_existing_export() {
        let directory = tempfile::tempdir().unwrap();
        let target = directory.path().join("book.pdf");
        fs::write(&target, b"existing export").unwrap();
        let temporary = tempfile::NamedTempFile::new_in(directory.path())
            .unwrap()
            .into_temp_path();
        fs::write(&temporary, b"bad output").unwrap();
        assert!(finish_pdf(temporary, &target).is_err());
        assert_eq!(fs::read(&target).unwrap(), b"existing export");
        let temporary = tempfile::NamedTempFile::new_in(directory.path())
            .unwrap()
            .into_temp_path();
        fs::write(&temporary, b"%PDF-test file finalization").unwrap();
        finish_pdf(temporary, &target).unwrap();
        assert_eq!(fs::read(&target).unwrap(), b"%PDF-test file finalization");
    }
}
