//! Read installed family names through DirectWrite. Font files are never copied,
//! installed, or exposed to the webview; all COM values remain on this call's thread.
#[cfg(target_os = "windows")]
pub fn system_fonts() -> Result<Vec<String>, String> {
    use windows::{
        core::{w, BOOL},
        Win32::Graphics::DirectWrite::{
            DWriteCreateFactory, IDWriteFactory, DWRITE_FACTORY_TYPE_SHARED,
        },
    };
    // SAFETY: DirectWrite owns the returned interfaces. Buffers are allocated from
    // reported UTF-16 lengths plus the terminator and live through each API call.
    unsafe {
        let factory: IDWriteFactory =
            DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED).map_err(|e| e.to_string())?;
        let mut collection = None;
        factory
            .GetSystemFontCollection(&mut collection, true)
            .map_err(|e| e.to_string())?;
        let collection = collection.ok_or("Windows returned no font collection.")?;
        let mut families = std::collections::BTreeSet::new();
        for index in 0..collection.GetFontFamilyCount() {
            let names = collection
                .GetFontFamily(index)
                .and_then(|family| family.GetFamilyNames())
                .map_err(|e| e.to_string())?;
            let mut locale_index = 0;
            let mut exists = BOOL::default();
            names
                .FindLocaleName(w!("en-us"), &mut locale_index, &mut exists)
                .map_err(|e| e.to_string())?;
            if !exists.as_bool() {
                locale_index = 0;
            }
            let length = names
                .GetStringLength(locale_index)
                .map_err(|e| e.to_string())? as usize;
            let mut buffer = vec![0u16; length + 1];
            names
                .GetString(locale_index, &mut buffer)
                .map_err(|e| e.to_string())?;
            let name = String::from_utf16(&buffer[..length]).map_err(|e| e.to_string())?;
            if !name.trim().is_empty() {
                families.insert(name);
            }
        }
        Ok(families.into_iter().collect())
    }
}
#[cfg(not(target_os = "windows"))]
pub fn system_fonts() -> Result<Vec<String>, String> {
    Ok(Vec::new())
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    #[test]
    fn installed_fonts_are_nonempty_and_unique() {
        let families = super::system_fonts().unwrap();
        assert!(!families.is_empty());
        assert_eq!(
            families.len(),
            families
                .iter()
                .collect::<std::collections::BTreeSet<_>>()
                .len()
        );
        assert!(families.iter().all(|name| !name.is_empty()));
    }
}
