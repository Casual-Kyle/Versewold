//! Bounded, readable saved-version snapshots. The storage layer supplies a
//! validated directory; no frontend command accepts arbitrary backup paths.
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub const RETAIN_REVISIONS: usize = 50;

struct Snapshot {
    sequence: u64,
    path: PathBuf,
}

fn snapshot_sequence(name: &str, extension: &str) -> Option<u64> {
    let stem = name.strip_suffix(&format!(".{extension}"))?;
    let (sequence, timestamp) = stem.split_once('-')?;
    if sequence.len() != 20
        || !sequence.bytes().all(|c| c.is_ascii_digit())
        || timestamp.is_empty()
        || !timestamp.bytes().all(|c| c.is_ascii_digit())
    {
        return None;
    }
    sequence.parse().ok()
}

fn snapshots(folder: &Path, extension: &str) -> Result<Vec<Snapshot>, String> {
    let mut versions = Vec::new();
    for entry in fs::read_dir(folder).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let Some(sequence) = entry
            .file_name()
            .to_str()
            .and_then(|name| snapshot_sequence(name, extension))
        else {
            // Leave notes, interrupted temporary files, and other formats alone.
            continue;
        };
        if !entry.file_type().map_err(|e| e.to_string())?.is_file() {
            return Err(
                "A backup revision must be a regular file, not a link or directory.".into(),
            );
        }
        versions.push(Snapshot {
            sequence,
            path: entry.path(),
        });
    }
    versions.sort_by_key(|version| version.sequence);
    if versions
        .windows(2)
        .any(|pair| pair[0].sequence == pair[1].sequence)
    {
        return Err(
            "Duplicate backup sequence numbers; preserve the files and inspect the backup folder."
                .into(),
        );
    }
    Ok(versions)
}

/// Snapshot both the previous on-disk version and the incoming text before the
/// canonical file changes. Consecutive identical content is stored only once.
/// A failed primary write can therefore leave a recoverable incoming draft.
pub fn preserve(
    folder: &Path,
    extension: &str,
    previous: Option<&[u8]>,
    incoming: &[u8],
) -> Result<(), String> {
    let mut versions = snapshots(folder, extension)?;
    let mut latest = versions
        .last()
        .map(|version| fs::read(&version.path))
        .transpose()
        .map_err(|e| e.to_string())?;
    for bytes in previous.into_iter().chain(std::iter::once(incoming)) {
        if latest.as_deref() == Some(bytes) {
            continue;
        }
        // Sequence, rather than wall time, determines retention across clock changes.
        let sequence = versions
            .last()
            .map_or(Some(1), |v| v.sequence.checked_add(1))
            .ok_or("The backup revision sequence is exhausted.")?;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis();
        let destination = folder.join(format!("{sequence:020}-{timestamp}.{extension}"));
        let mut temporary = tempfile::Builder::new()
            .prefix(".pending-")
            .suffix(".tmp")
            .tempfile_in(folder)
            .map_err(|e| e.to_string())?;
        temporary.write_all(bytes).map_err(|e| e.to_string())?;
        temporary.as_file().sync_all().map_err(|e| e.to_string())?;
        // Never replace an existing revision, including one from another process.
        temporary
            .persist_noclobber(&destination)
            .map_err(|e| e.to_string())?;
        versions.push(Snapshot {
            sequence,
            path: destination,
        });
        latest = Some(bytes.to_vec());
    }
    // Only recognized revisions in this one validated document directory rotate.
    // The previous draft and incoming draft are the newest entries and survive.
    for old in versions
        .iter()
        .take(versions.len().saturating_sub(RETAIN_REVISIONS))
    {
        if !fs::symlink_metadata(&old.path)
            .map_err(|e| e.to_string())?
            .file_type()
            .is_file()
        {
            return Err("A backup revision changed into a link or directory.".into());
        }
        fs::remove_file(&old.path)
            .map_err(|e| format!("Cannot rotate backup {}: {e}", old.path.display()))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotation_survives_reopen_and_preserves_unrelated_files() {
        let directory = tempfile::tempdir().unwrap();
        fs::write(directory.path().join("my-notes.md"), "Keep me").unwrap();
        let mut previous = "First draft\n".as_bytes().to_vec();
        preserve(directory.path(), "md", None, &previous).unwrap();
        for number in 1..=RETAIN_REVISIONS + 3 {
            let incoming = format!("Draft {number} — café\n").into_bytes();
            preserve(directory.path(), "md", Some(&previous), &incoming).unwrap();
            previous = incoming;
        }
        let versions = snapshots(directory.path(), "md").unwrap();
        assert_eq!(versions.len(), RETAIN_REVISIONS);
        assert_eq!(fs::read(&versions.last().unwrap().path).unwrap(), previous);
        assert_eq!(
            fs::read_to_string(&versions[versions.len() - 2].path).unwrap(),
            format!("Draft {} — café\n", RETAIN_REVISIONS + 2)
        );
        assert_eq!(
            fs::read_to_string(directory.path().join("my-notes.md")).unwrap(),
            "Keep me"
        );
        preserve(directory.path(), "md", Some(&previous), &previous).unwrap();
        assert_eq!(
            snapshots(directory.path(), "md").unwrap().len(),
            RETAIN_REVISIONS
        );
    }

    #[test]
    fn existing_draft_is_preserved_when_history_is_first_enabled() {
        let directory = tempfile::tempdir().unwrap();
        let original = b"  Original\r\n\r\n";
        preserve(directory.path(), "md", Some(original), b"").unwrap();
        let versions = snapshots(directory.path(), "md").unwrap();
        assert_eq!(versions.len(), 2);
        assert_eq!(fs::read(&versions[0].path).unwrap(), original);
        assert!(fs::read(&versions[1].path).unwrap().is_empty());
    }

    #[test]
    fn recognized_nonfiles_are_rejected_without_touching_other_data() {
        let directory = tempfile::tempdir().unwrap();
        let invalid = directory.path().join("00000000000000000001-1000.md");
        fs::create_dir(&invalid).unwrap();
        assert!(preserve(directory.path(), "md", None, b"New draft").is_err());
        assert!(invalid.is_dir());
    }
}
