use crate::dto::{AppSettings, BudgetConfig};
use anyhow::{Context, Result};
use rusqlite::{params, Connection};

pub fn get_app_settings(conn: &Connection) -> Result<AppSettings> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut theme = "system".to_string();
    let mut accounts = None;

    for row in rows {
        let (key, value) = row?;
        match key.as_str() {
            "theme" => theme = value,
            "accounts" => accounts = Some(value),
            _ => {}
        }
    }

    Ok(AppSettings { theme, accounts })
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )
    .context("Failed to update setting")?;
    Ok(())
}

pub fn get_budgets(conn: &Connection) -> Result<Vec<BudgetConfig>> {
    let mut stmt = conn.prepare("SELECT category, cap FROM budgets ORDER BY category")?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BudgetConfig {
                category: row.get(0)?,
                cap: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()
        .context("Failed to fetch budgets")?;
    Ok(rows)
}

pub fn set_budget(conn: &Connection, category: &str, cap: f64) -> Result<()> {
    conn.execute(
        "INSERT INTO budgets (category, cap) VALUES (?1, ?2) ON CONFLICT(category) DO UPDATE SET cap=excluded.cap",
        params![category, cap],
    )
    .context("Failed to update budget")?;
    Ok(())
}
