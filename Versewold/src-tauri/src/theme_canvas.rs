use crate::{models::Project, storage::validate_id};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ThemeCanvas {
    pub cards: Vec<Card>,
    pub connections: Vec<Connection>,
    pub camera: Camera,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Camera {
    x: i32,
    y: i32,
    zoom: f64,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CardKind {
    Poem,
    Theme,
    Note,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Card {
    id: String,
    pub kind: CardKind,
    x: i32,
    y: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    text: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Connection {
    id: String,
    from: String,
    to: String,
    label: String,
}

fn valid_position(x: i32, y: i32, bound: i32) -> bool {
    (-bound..=bound).contains(&x) && (-bound..=bound).contains(&y)
}

impl ThemeCanvas {
    pub fn validate(&self, project: &Project) -> Result<(), String> {
        if self.cards.len() > 250
            || self.connections.len() > 500
            || !valid_position(self.camera.x, self.camera.y, 300_000)
            || !(0.4..=2.0).contains(&self.camera.zoom)
        {
            return Err("Invalid theme canvas layout.".into());
        }

        let poems: HashSet<_> = project
            .poems
            .iter()
            .filter(|poem| poem.kind.as_deref().unwrap_or("poem") == "poem")
            .map(|poem| poem.id.as_str())
            .collect();
        let themes: HashSet<_> = project
            .theme_definitions
            .iter()
            .map(|theme| theme.id.as_str())
            .collect();
        let mut cards = HashSet::new();
        let mut references = HashSet::new();
        for card in &self.cards {
            validate_id(&card.id)?;
            if !cards.insert(card.id.as_str()) || !valid_position(card.x, card.y, 100_000) {
                return Err("Invalid or duplicate canvas card.".into());
            }
            let target = card.target_id.as_deref();
            match (&card.kind, target, card.text.as_deref()) {
                (CardKind::Note, None, Some(text))
                    if text.chars().count() <= 2_000
                        && !text
                            .chars()
                            .any(|c| c.is_control() && !['\n', '\r', '\t'].contains(&c)) => {}
                (CardKind::Poem, Some(id), None) if poems.contains(id) => {
                    if !references.insert((&card.kind, id)) {
                        return Err("This poem is already on the canvas.".into());
                    }
                }
                (CardKind::Theme, Some(id), None) if themes.contains(id) => {
                    if !references.insert((&card.kind, id)) {
                        return Err("This theme is already on the canvas.".into());
                    }
                }
                _ => {
                    return Err(
                        "A canvas card is invalid or refers to a missing poem or theme.".into(),
                    )
                }
            }
        }

        let mut connections = HashSet::new();
        let mut pairs = HashSet::new();
        for connection in &self.connections {
            validate_id(&connection.id)?;
            let from = connection.from.as_str();
            let to = connection.to.as_str();
            if !connections.insert(connection.id.as_str())
                || !cards.contains(from)
                || !cards.contains(to)
                || from == to
                || !pairs.insert((from.min(to), from.max(to)))
                || connection.label.trim().is_empty()
                || connection.label.chars().count() > 100
                || connection.label.chars().any(char::is_control)
            {
                return Err("Invalid or duplicate canvas connection.".into());
            }
        }
        Ok(())
    }
}
