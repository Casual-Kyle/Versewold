use super::*;
use serde_json::json;

fn project() -> ProjectTransfer {
    serde_json::from_value(json!({
        "project": {"schemaVersion":1,"id":"original-project","title":"Winter verses","poems":[
            {"id":"second","title":"Second light","file":"poems/second.md","formId":"standard-habbie"},
            {"id":"first","title":"First light","file":"poems/first.md","formId":"free-verse"}
        ],"templates":[serde_json::from_str::<serde_json::Value>(include_str!("../../src/domain/forms/templates/standard-habbie.json")).unwrap()]},
        "documents":{"second":"  Rain — café\r\n\r\nSnow.  \n","first":"# Actual source\rFinal line"}
    })).unwrap()
}

#[test]
fn collection_planning_survives_portable_project_copies() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer = project();
    transfer.project.title = "Seasons & home".into();
    transfer.project.description = Some("  Home — café\r\n\r\nA question.\n".into());
    transfer.project.intended_tone = Some("Reflective".into());
    transfer.project.themes = vec!["Home".into(), "Seasons".into()];
    let saved = save_project(directory.path(), &transfer).unwrap();
    let loaded = load_project(&saved.join("project.json")).unwrap();
    assert_eq!(loaded.project.title, transfer.project.title);
    assert_eq!(loaded.project.description, transfer.project.description);
    assert_eq!(loaded.project.intended_tone, transfer.project.intended_tone);
    assert_eq!(loaded.project.themes, transfer.project.themes);
    assert_eq!(loaded.documents, transfer.documents);
    transfer.project.intended_tone = Some("invalid\ntone".into());
    assert!(save_project(directory.path(), &transfer).is_err());
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
}

#[test]
fn project_copies_retain_theme_links_and_reject_dangling_references() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer = project();
    transfer.project.theme_definitions = vec![crate::models::ProjectTheme {
        id: "theme-home".into(), label: "Home".into(),
    }];
    transfer.project.poems[0].theme_ids = vec!["theme-home".into()];
    transfer.project.poems[0].tone = Some("Reflective".into());
    transfer.project.poems[0].planning_notes = Some("  Notes\r\n\tAn ending.\n".into());
    let saved = save_project(directory.path(), &transfer).unwrap();
    let loaded = load_project(&saved.join("project.json")).unwrap();
    assert_eq!(loaded.project.poems[0].theme_ids, vec!["theme-home"]);
    assert_eq!(loaded.project.poems[0].tone.as_deref(), Some("Reflective"));
    assert_eq!(loaded.project.poems[0].planning_notes, transfer.project.poems[0].planning_notes);
    assert_eq!(loaded.documents, transfer.documents);
    transfer.project.poems[0].theme_ids = vec!["missing".into()];
    assert!(save_project(directory.path(), &transfer).is_err());
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
}

#[test]
fn poem_sidecars_roundtrip_tone_notes_and_theme_labels_with_exact_markdown() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer: PoemTransfer = serde_json::from_value(json!({
        "metadata": {"schemaVersion":1,"title":"A poem","formId":"free-verse",
            "tone":"Tender","planningNotes":"  Notes\r\n\r\n\tAn ending.\n","themes":["Home","Seasons"]},
        "body":"  🌙 café\r\n\r\nA line.  \n"
    })).unwrap();
    let saved = save_poem(directory.path(), &transfer).unwrap();
    let loaded = load_poem(&saved.join("poem.md")).unwrap();
    assert_eq!(loaded.body, transfer.body);
    assert_eq!(loaded.metadata.tone, transfer.metadata.tone);
    assert_eq!(loaded.metadata.planning_notes, transfer.metadata.planning_notes);
    assert_eq!(loaded.metadata.themes, transfer.metadata.themes);
    let metadata: serde_json::Value = serde_json::from_str(&fs::read_to_string(saved.join("poem.md.versewold.json")).unwrap()).unwrap();
    assert!(metadata.get("themeIds").is_none());
    transfer.metadata.themes = vec!["bad\ntheme".into()];
    assert!(save_poem(directory.path(), &transfer).is_err());
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
}

#[test]
fn theme_canvas_round_trips_in_project_copies_and_rejects_broken_connections() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer = project();
    let value = json!({
        "camera": {"x": -120,"y": 12,"zoom": 1.5},
        "cards": [
            {"id":"poem-card","kind":"poem","targetId":"second","x":24,"y":24},
            {"id":"note-card","kind":"note","text":"  Café\r\n🌙","x":250,"y":24}
        ],
        "connections":[{"id":"link","from":"poem-card","to":"note-card","label":"Echoes"}]
    });
    transfer.project.theme_canvas = Some(serde_json::from_value(value.clone()).unwrap());
    let saved = save_project(directory.path(), &transfer).unwrap();
    let loaded = load_project(&saved.join("project.json")).unwrap();
    assert_eq!(serde_json::to_value(loaded.project.theme_canvas).unwrap(), value);
    assert_eq!(loaded.documents, transfer.documents);

    let mut invalid = value;
    invalid["connections"][0]["to"] = json!("missing-card");
    transfer.project.theme_canvas = Some(serde_json::from_value(invalid).unwrap());
    assert!(save_project(directory.path(), &transfer).is_err());
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
}

#[test]
fn project_roundtrip_preserves_order_metadata_forms_and_exact_markdown() {
    let directory = tempfile::tempdir().unwrap();
    let transfer = project();
    let saved = save_project(directory.path(), &transfer).unwrap();
    let loaded = load_project(&saved.join("project.json")).unwrap();
    assert_eq!(loaded.documents, transfer.documents);
    assert_eq!(loaded.project.poems[0].id, "second");
    assert_eq!(loaded.project.templates, transfer.project.templates);
    let manifest = fs::read_to_string(saved.join("project.json")).unwrap();
    assert!(!manifest.contains("Rain"));
    assert_eq!(
        fs::read(saved.join("poems/second.md")).unwrap(),
        transfer.documents["second"].as_bytes()
    );
    let second_copy = save_project(directory.path(), &transfer).unwrap();
    assert_ne!(second_copy, saved);
    assert_eq!(
        load_project(&saved.join("project.json")).unwrap().documents,
        transfer.documents
    );
}

#[test]
fn old_project_manifest_and_empty_projects_remain_loadable() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer = project();
    transfer.project.templates.clear();
    transfer.project.poems.clear();
    transfer.documents.clear();
    let path = save_project(directory.path(), &transfer).unwrap();
    assert!(!fs::read_to_string(path.join("project.json"))
        .unwrap()
        .contains("templates"));
    assert!(load_project(&path.join("project.json"))
        .unwrap()
        .project
        .poems
        .is_empty());
}

#[test]
fn poem_copy_keeps_sidecar_separate_and_plain_markdown_import_has_defaults() {
    let directory = tempfile::tempdir().unwrap();
    let transfer = PoemTransfer {
        metadata: PoemMetadata {
            schema_version: 1,
            title: "A title".into(),
            form_id: "standard-habbie".into(),
            template: Some(project().project.templates[0].clone()),
            kind: Some("poem".into()),
            author: Some("A. Writer".into()),
            composed_on: Some("2026-10-20".into()),
            updated_at: Some("2026-11-24T20:12:30.123Z".into()),
            ..PoemMetadata::default()
        },
        body: "\u{feff}  Rain — café\r\n\nEnd  \n".into(),
    };
    let saved = save_poem(directory.path(), &transfer).unwrap();
    let loaded = load_poem(&saved.join("poem.md")).unwrap();
    assert_eq!(loaded.body, transfer.body);
    assert_eq!(loaded.metadata.title, "A title");
    assert_eq!(loaded.metadata.author, transfer.metadata.author);
    assert_eq!(loaded.metadata.composed_on, transfer.metadata.composed_on);
    assert_eq!(loaded.metadata.updated_at, transfer.metadata.updated_at);
    assert_eq!(loaded.metadata.template, transfer.metadata.template);
    assert!(!fs::read_to_string(saved.join("poem.md.versewold.json"))
        .unwrap()
        .contains("Rain"));
    let plain = directory.path().join("Morning.md");
    fs::write(&plain, "A line\r\n\r\n").unwrap();
    let loaded = load_poem(&plain).unwrap();
    assert_eq!(loaded.metadata.title, "Morning");
    assert_eq!(loaded.metadata.form_id, "free-verse");
    assert_eq!(loaded.body, "A line\r\n\r\n");
}

#[test]
fn manuscript_structure_and_layout_survive_a_portable_roundtrip() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer = project();
    transfer.project.author_name = Some("A. Writer".into());
    transfer.project.sections.push(crate::models::Section {
        id: "autumn".into(),
        title: "Part I — Autumn".into(),
    });
    transfer.project.poems[0].section_id = Some("autumn".into());
    transfer.project.poems[0].composed_on = Some("2026-10-20".into());
    transfer.project.manuscript = Some(crate::manuscript::ManuscriptSettings::default());
    let saved = save_project(directory.path(), &transfer).unwrap();
    let loaded = load_project(&saved.join("project.json")).unwrap();
    assert_eq!(
        serde_json::to_value(&loaded.project).unwrap(),
        serde_json::to_value(&transfer.project).unwrap()
    );
    assert_eq!(loaded.documents, transfer.documents);
    transfer.project.poems[0].section_id = Some("missing".into());
    assert!(save_project(directory.path(), &transfer).is_err());
    assert_eq!(
        load_project(&saved.join("project.json")).unwrap().documents,
        loaded.documents
    );
}

#[test]
fn invalid_paths_versions_and_missing_files_fail_without_writing() {
    let directory = tempfile::tempdir().unwrap();
    let mut transfer = project();
    transfer.project.poems[0].file = "../outside.md".into();
    assert!(save_project(directory.path(), &transfer).is_err());
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 0);
    transfer = project();
    transfer.project.schema_version = 2;
    assert!(save_project(directory.path(), &transfer).is_err());
    let saved = save_project(directory.path(), &project()).unwrap();
    fs::remove_file(saved.join("poems/first.md")).unwrap();
    assert!(load_project(&saved.join("project.json")).is_err());
    assert!(saved.join("poems/second.md").is_file());
}

#[test]
fn damaged_metadata_non_utf8_and_oversized_files_are_not_imported() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("poem.md");
    fs::write(&path, [0xff, 0xfe]).unwrap();
    assert!(load_poem(&path).unwrap_err().contains("UTF-8"));
    fs::write(&path, "Exact existing source").unwrap();
    fs::write(sidecar(&path), "broken json").unwrap();
    assert!(load_poem(&path).unwrap_err().contains("metadata"));
    assert_eq!(fs::read_to_string(&path).unwrap(), "Exact existing source");
    fs::remove_file(sidecar(&path)).unwrap();
    fs::OpenOptions::new()
        .write(true)
        .open(&path)
        .unwrap()
        .set_len(MAX_TEXT + 1)
        .unwrap();
    assert!(load_poem(&path).unwrap_err().contains("too large"));
}

#[test]
fn exports_are_exact_atomic_replacements_and_cannot_target_managed_data() {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("roaming");
    fs::create_dir(&data).unwrap();
    assert!(outside_data(&data.join("new.md"), &data).is_err());
    let path = directory.path().join("Export.md");
    outside_data(&path, &data).unwrap();
    fs::write(&path, "Earlier export").unwrap();
    let body = "  Snow\r\n\r\nA leaf — café\n";
    export_markdown(&path, body).unwrap();
    assert_eq!(fs::read(&path).unwrap(), body.as_bytes());
    assert!(export_markdown(&directory.path().join("wrong.txt"), body).is_err());
    assert!(!directory.path().join("wrong.txt").exists());
}

#[test]
fn batch_read_is_all_or_nothing_and_never_edits_sources() {
    let directory = tempfile::tempdir().unwrap();
    let first = directory.path().join("first.md");
    let second = directory.path().join("second.md");
    fs::write(&first, "Original\r\n").unwrap();
    fs::write(&second, [0xff]).unwrap();
    assert!(load_poems(&[first.clone(), second]).is_err());
    assert_eq!(fs::read_to_string(first).unwrap(), "Original\r\n");
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 2);
}
