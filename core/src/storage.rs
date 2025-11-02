use std::{fs, path::Path};

use anyhow::{Context, Result};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;

pub fn connection_pool(path: &Path, key: &[u8; 32]) -> Result<Pool<SqliteConnectionManager>> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create storage directory: {}", parent.display()))?;
    }

    let key_hex = hex::encode(key);
    let key_statement = format!("PRAGMA key = \"x'{}'\";", key_hex);

    let manager = SqliteConnectionManager::file(path).with_init(move |conn| {
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")
            .ok();

        // SQLCipher pragma. Ignored silently if the binary is not compiled with SQLCipher.
        if let Err(error) = conn.execute_batch(&key_statement) {
            log::warn!("PRAGMA key failed (is SQLCipher installed?): {error}");
        }

        Ok(())
    });

    let pool = Pool::new(manager).context("Failed to create SQLite pool")?;
    {
        let conn = pool.get().context("Pool checkout failed during migration")?;
        migrate(&conn)?;
    }
    Ok(pool)
}

pub fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS inbox (
            temp_id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            flow TEXT NOT NULL,
            suggested_category TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            flow TEXT NOT NULL,
            category TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS categorization_memory (
            token TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            hit_count INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS budgets (
            category TEXT PRIMARY KEY,
            cap REAL NOT NULL
        );
    "#,
    )
    .context("Base schema migration failed")?;

    seed_default_budgets(conn)?;
    Ok(())
}

fn seed_default_budgets(conn: &Connection) -> Result<()> {
    let existing: i64 = conn
        .query_row("SELECT COUNT(1) FROM budgets", [], |row| row.get(0))
        .unwrap_or(0);

    if existing > 0 {
        return Ok(());
    }

    let defaults = [
        ("Housing", 1800.0),
        ("Groceries", 700.0),
        ("Dining", 350.0),
        ("Transportation", 250.0),
        ("Discretionary", 500.0),
    ];

    let tx = conn.transaction().context("Failed to open tx for budgets seed")?;
    {
        let mut stmt =
            tx.prepare("INSERT INTO budgets (category, cap) VALUES (?1, ?2)")?;
        for (category, cap) in defaults {
            stmt.execute((category, cap))
                .with_context(|| format!("Seed insert failed for {category}"))?;
        }
    }
    tx.commit().context("Commit budgets seed failed")?;
    Ok(())
}
