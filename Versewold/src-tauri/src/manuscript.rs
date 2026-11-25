//! Validated project layout metadata. The same defaults are used by Vue, and
//! changing layout never changes the manuscript's Markdown files.
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ManuscriptSettings {
    pub paper: String,
    pub orientation: String,
    pub custom_width_mm: f64,
    pub custom_height_mm: f64,
    pub margins: Margins,
    pub font_family: String,
    pub font_size: f64,
    pub line_spacing: f64,
    pub title_size: f64,
    pub title_page: bool,
    pub title_word_count: bool,
    pub count_titles: bool,
    pub title_date: String,
    pub show_poem_author: bool,
    pub poem_date: String,
    #[serde(default = "default_poem_signature")]
    pub poem_signature: bool,
    pub section_pages: bool,
    pub poem_new_page: bool,
    pub page_numbers: bool,
}

fn default_poem_signature() -> bool {
    true
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Margins {
    pub top: f64,
    pub bottom: f64,
    pub left: f64,
    pub right: f64,
}

impl Default for ManuscriptSettings {
    fn default() -> Self {
        serde_json::from_str(include_str!("../../src/domain/manuscript/defaults.json"))
            .expect("valid bundled manuscript defaults")
    }
}
impl ManuscriptSettings {
    pub fn size(&self) -> (f64, f64) {
        let (width, height) = match self.paper.as_str() {
            "a4" => (210., 297.),
            "a5" => (148., 210.),
            "custom" => (self.custom_width_mm, self.custom_height_mm),
            _ => (215.9, 279.4),
        };
        if self.orientation == "landscape" {
            (height, width)
        } else {
            (width, height)
        }
    }
    pub fn validate(&self) -> Result<(), String> {
        let range =
            |value: f64, min: f64, max: f64| value.is_finite() && value >= min && value <= max;
        if !["letter", "a4", "a5", "custom"].contains(&self.paper.as_str())
            || !["portrait", "landscape"].contains(&self.orientation.as_str())
            || !["none", "today", "revised"].contains(&self.title_date.as_str())
            || !["none", "composed", "revised"].contains(&self.poem_date.as_str())
        {
            return Err("Unknown manuscript option.".into());
        }
        if !range(self.custom_width_mm, 100., 432.)
            || !range(self.custom_height_mm, 100., 610.)
            || !range(self.font_size, 8., 32.)
            || !range(self.title_size, 10., 40.)
            || !range(self.line_spacing, 1., 3.)
        {
            return Err("Invalid manuscript dimensions or typography.".into());
        }
        if self.font_family.trim().is_empty()
            || self.font_family.chars().count() > 120
            || self.font_family.chars().any(char::is_control)
        {
            return Err("Invalid manuscript font.".into());
        }
        if [
            self.margins.top,
            self.margins.bottom,
            self.margins.left,
            self.margins.right,
        ]
        .iter()
        .any(|value| !range(*value, 0., 100.))
        {
            return Err("Margins must be between 0 and 100 mm.".into());
        }
        let (width, height) = self.size();
        if width - self.margins.left - self.margins.right < 40.
            || height - self.margins.top - self.margins.bottom < 40.
        {
            return Err("Leave at least 40 mm of usable page width and height.".into());
        }
        Ok(())
    }
}

pub fn valid_date(date: &str) -> bool {
    if date.len() != 10 || date.as_bytes()[4] != b'-' || date.as_bytes()[7] != b'-' {
        return false;
    }
    let Ok(year) = date[..4].parse::<u32>() else {
        return false;
    };
    let Ok(month) = date[5..7].parse::<usize>() else {
        return false;
    };
    let Ok(day) = date[8..].parse::<u32>() else {
        return false;
    };
    let leap = year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400));
    let days = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    (1..=12).contains(&month) && day > 0 && day <= days[month - 1]
}
pub fn validate_author(value: Option<&str>) -> Result<(), String> {
    if value.is_some_and(|text| text.chars().count() > 200 || text.chars().any(char::is_control)) {
        return Err("Invalid author name.".into());
    }
    Ok(())
}
pub fn validate_dates(composed: Option<&str>, revised: Option<&str>) -> Result<(), String> {
    if composed.is_some_and(|date| !valid_date(date)) {
        return Err("Invalid composed date.".into());
    }
    if revised.is_some_and(|date| !valid_timestamp(date)) {
        return Err("Invalid revised timestamp.".into());
    }
    Ok(())
}

fn valid_timestamp(value: &str) -> bool {
    if !value.is_ascii() || value.len() < 20 || value.len() > 35 {
        return false;
    }
    let bytes = value.as_bytes();
    if !valid_date(&value[..10]) || bytes[10] != b'T' || bytes[13] != b':' || bytes[16] != b':' {
        return false;
    }
    let number = |part: &str, max: u32| {
        part.bytes().all(|byte| byte.is_ascii_digit())
            && part.parse::<u32>().is_ok_and(|number| number <= max)
    };
    if !number(&value[11..13], 23) || !number(&value[14..16], 59) || !number(&value[17..19], 59) {
        return false;
    }
    let mut rest = &value[19..];
    if rest.starts_with('.') {
        let digits = rest[1..].bytes().take_while(u8::is_ascii_digit).count();
        if digits == 0 {
            return false;
        }
        rest = &rest[digits + 1..];
    }
    rest == "Z"
        || (rest.len() == 6
            && [b'+', b'-'].contains(&rest.as_bytes()[0])
            && rest.as_bytes()[3] == b':'
            && number(&rest[1..3], 23)
            && number(&rest[4..6], 59))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn legacy_page_settings_enable_signatures_and_explicit_choices_roundtrip() {
        let mut legacy = serde_json::to_value(ManuscriptSettings::default()).unwrap();
        legacy.as_object_mut().unwrap().remove("poemSignature");
        let loaded: ManuscriptSettings = serde_json::from_value(legacy.clone()).unwrap();
        loaded.validate().unwrap();
        assert!(loaded.poem_signature);
        legacy["poemSignature"] = serde_json::json!(false);
        let loaded: ManuscriptSettings = serde_json::from_value(legacy.clone()).unwrap();
        assert!(!loaded.poem_signature);
        assert_eq!(serde_json::to_value(loaded).unwrap(), legacy);
        legacy["poemSignature"] = serde_json::json!("true");
        assert!(serde_json::from_value::<ManuscriptSettings>(legacy).is_err());
    }

    #[test]
    fn page_settings_reject_impossible_paper_and_margins() {
        let mut settings = ManuscriptSettings::default();
        settings.validate().unwrap();
        assert_eq!(settings.size(), (215.9, 279.4));
        settings.paper = "a4".into();
        settings.orientation = "landscape".into();
        assert_eq!(settings.size(), (297., 210.));
        settings.margins.left = 100.;
        settings.margins.right = 100.;
        settings.validate().unwrap();
        settings.paper = "a5".into();
        assert!(settings.validate().is_err());
        settings.margins.left = f64::NAN;
        assert!(settings.validate().is_err());
    }
    #[test]
    fn dates_are_real_calendar_dates_and_rfc3339_timestamps() {
        assert!(valid_date("2024-02-29"));
        assert!(!valid_date("2026-02-29"));
        assert!(valid_timestamp("2026-11-24T20:12:30.123Z"));
        assert!(valid_timestamp("2026-11-24T20:12:30-06:00"));
        for value in [
            "2026-11-24T99:12:30Z",
            "2026-02-30T20:12:30Z",
            "2026-11-24T20:12:30",
            "2026-11-24T20:12:30.Z",
            "2026-11-24T20:12:30+99:00",
        ] {
            assert!(!valid_timestamp(value), "{value}");
        }
    }
}
