use std::collections::HashMap;

use anyhow::{Context, Result};
use parking_lot::RwLock;
use std::sync::Arc;
use rusqlite::{params, Connection};

#[derive(Default)]
pub struct CategorizationMemory {
    tokens: HashMap<String, String>,
}

impl CategorizationMemory {
    pub fn load(conn: &Connection) -> Result<Self> {
        let mut stmt = conn
            .prepare("SELECT token, category FROM categorization_memory")
            .context("Prepare categorization load failed")?;

        let map = stmt
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?
            .collect::<Result<HashMap<_, _>, _>>()
            .context("Iterate categorization rows failed")?;

        Ok(Self { tokens: map })
    }

    pub fn suggest(&self, description: &str) -> Option<String> {
        tokenize(description)
            .into_iter()
            .find_map(|token| self.tokens.get(&token).cloned())
    }

    pub fn learn(&mut self, conn: &Connection, description: &str, category: &str) -> Result<()> {
        let tokens = tokenize(description);

        let tx = conn
            .transaction()
            .context("Categorization learn transaction failed")?;

        for token in tokens {
            self.tokens.insert(token.clone(), category.to_string());
            tx.execute(
                r#"
                INSERT INTO categorization_memory (token, category, hit_count, updated_at)
                VALUES (?1, ?2, 1, datetime('now'))
                ON CONFLICT(token) DO UPDATE SET
                    category=excluded.category,
                    hit_count=hit_count + 1,
                    updated_at=datetime('now')
                "#,
                params![token, category],
            )
            .context("Upsert categorization token failed")?;
        }

        tx.commit().context("Commit categorization learn failed")?;
        Ok(())
    }
}

fn tokenize(input: &str) -> Vec<String> {
    input
        .split(|c: char| !c.is_alphanumeric())
        .filter(|token| token.len() > 2)
        .map(|token| token.to_lowercase())
        .collect()
}

pub type SharedMemory = Arc<RwLock<CategorizationMemory>>;
