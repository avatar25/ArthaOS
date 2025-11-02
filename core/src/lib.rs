mod categorization;
mod csv_import;
pub mod dto;
mod storage;

use std::{collections::HashMap, path::PathBuf, sync::Arc};

use anyhow::{anyhow, Context, Result};
use categorization::{CategorizationMemory, SharedMemory};
use dto::{InboxItem, NetWorthPoint, SetCategoryResponse, SummaryResponse};
use parking_lot::RwLock;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, OptionalExtension};
use time::{macros::format_description, Date, Month, OffsetDateTime};
use tokio::task;
use uuid::Uuid;

pub struct ArthaCore {
    pool: Pool<SqliteConnectionManager>,
    memory: SharedMemory,
}

impl ArthaCore {
    pub fn bootstrap(path: PathBuf, key: [u8; 32]) -> Result<Self> {
        let pool = storage::connection_pool(&path, &key)?;
        let conn = pool
            .get()
            .context("Failed to obtain connection for categorization load")?;
        let memory = CategorizationMemory::load(&conn).unwrap_or_else(|error| {
            log::warn!("Failed to load categorization memory: {error}");
            CategorizationMemory::default()
        });

        Ok(Self {
            pool,
            memory: Arc::new(RwLock::new(memory)),
        })
    }

    pub async fn import_csv(&self, bytes: &[u8]) -> Result<Vec<InboxItem>> {
        let payload = bytes.to_vec();
        let pool = self.pool.clone();
        let memory = self.memory.clone();

        task::spawn_blocking(move || {
            let parsed = csv_import::parse_csv(&payload)?;
            let conn = pool.get().context("Checkout failed during import")?;
            let mut guard = memory.write();

            let tx = conn
                .transaction()
                .context("Failed to start inbox import transaction")?;

            let mut results = Vec::with_capacity(parsed.len());

            for row in parsed {
                let temp_id = Uuid::new_v4().to_string();
                let suggestion = guard.suggest(&row.description);
                let flow_kind = dto::FlowKind::from_amount(row.amount);

                tx.execute(
                    r#"
                    INSERT INTO inbox (temp_id, date, description, amount, flow, suggested_category)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                    ON CONFLICT(temp_id) DO UPDATE SET
                        date=excluded.date,
                        description=excluded.description,
                        amount=excluded.amount,
                        flow=excluded.flow,
                        suggested_category=excluded.suggested_category
                    "#,
                    params![
                        temp_id,
                        row.date,
                        row.description,
                        row.amount,
                        flow_kind.as_str(),
                        suggestion.clone()
                    ],
                )?;

                results.push(InboxItem {
                    temp_id: temp_id.clone(),
                    date: row.date,
                    description: row.description,
                    amount: row.amount,
                    flow: flow_kind,
                    suggested_category: suggestion,
                });
            }

            tx.commit().context("Commit inbox import failed")?;

            Ok::<_, anyhow::Error>(results)
        })
        .await
        .map_err(|error| anyhow!("Blocking task failed: {error}"))?
    }

    pub async fn get_inbox(&self) -> Result<Vec<InboxItem>> {
        let pool = self.pool.clone();

        task::spawn_blocking(move || {
            let conn = pool.get().context("Checkout failed during inbox fetch")?;
            let mut stmt = conn
                .prepare(
                    "SELECT temp_id, date, description, amount, flow, suggested_category FROM inbox ORDER BY date DESC",
                )
                .context("Prepare inbox select failed")?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(InboxItem {
                        temp_id: row.get(0)?,
                        date: row.get(1)?,
                        description: row.get(2)?,
                        amount: row.get(3)?,
                        flow: match row.get::<_, String>(4)?.as_str() {
                            "credit" => dto::FlowKind::Credit,
                            _ => dto::FlowKind::Debit,
                        },
                        suggested_category: row.get::<_, Option<String>>(5)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()
                .context("Hydrate inbox rows failed")?;

            Ok::<_, anyhow::Error>(rows)
        })
        .await
        .map_err(|error| anyhow!("Blocking task failed: {error}"))?
    }

    pub async fn set_inbox_category(
        &self,
        temp_id: &str,
        category: &str,
    ) -> Result<SetCategoryResponse> {
        let temp_id = temp_id.to_string();
        let category = category.to_string();
        let pool = self.pool.clone();
        let memory = self.memory.clone();

        task::spawn_blocking(move || {
            let conn = pool.get().context("Checkout failed during category set")?;
            let affected = conn.execute(
                "UPDATE inbox SET suggested_category=?1 WHERE temp_id=?2",
                params![category, temp_id],
            )?;

            if affected == 0 {
                return Ok(SetCategoryResponse { ok: false });
            }

            if let Ok(entry) = conn.query_row(
                "SELECT description FROM inbox WHERE temp_id=?1",
                params![temp_id],
                |row| row.get::<_, String>(0),
            ) {
                let mut guard = memory.write();
                if let Err(error) = guard.learn(&conn, &entry, &category) {
                    log::warn!("Failed to persist categorization memory: {error}");
                }
            }

            Ok::<_, anyhow::Error>(SetCategoryResponse { ok: true })
        })
        .await
        .map_err(|error| anyhow!("Blocking task failed: {error}"))?
    }

    pub async fn commit_inbox(&self) -> Result<usize> {
        let pool = self.pool.clone();
        let memory = self.memory.clone();

        task::spawn_blocking(move || {
            let conn = pool.get().context("Checkout failed during commit")?;
            let tx = conn
                .transaction()
                .context("Failed to start commit transaction")?;

            let mut stmt = tx
                .prepare(
                    "SELECT temp_id, date, description, amount, flow, suggested_category FROM inbox",
                )
                .context("Prepare inbox select for commit failed")?;

            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, f64>(3)?,
                        row.get::<_, String>(4)?,
                        row.get::<_, Option<String>>(5)?,
                    ))
                })?
                .collect::<Result<Vec<_>, _>>()
                .context("Hydrate inbox rows for commit failed")?;

            let committed = rows.len();

            let mut guard = memory.write();

            for (temp_id, date, description, amount, flow, category) in rows {
                tx.execute(
                    "INSERT INTO transactions (date, description, amount, flow, category) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![date, description, amount, flow, category],
                )?;
                tx.execute(
                    "DELETE FROM inbox WHERE temp_id=?1",
                    params![temp_id],
                )?;

                if let Some(category) = &category {
                    if let Err(error) = guard.learn(&tx, &description, category) {
                        log::warn!("Categorization memory update failed: {error}");
                    }
                }
            }

            drop(guard);

            tx.commit().context("Commit inbox transaction failed")?;
            Ok::<_, anyhow::Error>(committed)
        })
        .await
        .map_err(|error| anyhow!("Blocking task failed: {error}"))?
    }

    pub async fn get_summary(&self, month: &str) -> Result<SummaryResponse> {
        let month = month.to_string();
        let pool = self.pool.clone();

        task::spawn_blocking(move || {
            let conn = pool.get().context("Checkout failed during summary")?;
            let like = format!("{month}-%");

            let total_spend: f64 = conn
                .query_row(
                    "SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions WHERE amount < 0 AND date LIKE ?1",
                    params![&like],
                    |row| row.get(0),
                )
                .unwrap_or(0.0);

            let mut stmt = conn.prepare(
                "SELECT COALESCE(category, 'Uncategorized') AS cat, SUM(ABS(amount)) FROM transactions WHERE amount < 0 AND date LIKE ?1 GROUP BY cat ORDER BY SUM(ABS(amount)) DESC",
            )?;
            let by_category = stmt
                .query_map(params![&like], |row| {
                    Ok(dto::CategoryAmount {
                        category: row.get(0)?,
                        amount: row.get(1)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            let mut budget_stmt = conn.prepare(
                "SELECT b.category, b.cap, COALESCE(spent.total, 0) FROM budgets b LEFT JOIN (SELECT category, SUM(ABS(amount)) AS total FROM transactions WHERE amount < 0 AND date LIKE ?1 GROUP BY category) spent ON spent.category = b.category ORDER BY b.category",
            )?;

            let budgets = budget_stmt
                .query_map(params![&like], |row| {
                    Ok(dto::BudgetUsage {
                        category: row.get(0)?,
                        cap: row.get(1)?,
                        spent: row.get(2)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok::<_, anyhow::Error>(SummaryResponse {
                month,
                total_spend,
                by_category,
                budgets,
            })
        })
        .await
        .map_err(|error| anyhow!("Blocking task failed: {error}"))?
    }

    pub async fn get_networth_curve(&self) -> Result<Vec<NetWorthPoint>> {
        let pool = self.pool.clone();

        task::spawn_blocking(move || {
            let conn = pool.get().context("Checkout failed during net-worth curve")?;

            let mut stmt = conn.prepare(
                "SELECT strftime('%Y-%m-01', date) AS bucket, SUM(amount) FROM transactions GROUP BY bucket",
            )?;

            let format = format_description!("[year]-[month]-[day]");
            let mut monthly_totals: HashMap<Date, f64> = HashMap::new();

            let rows = stmt.query_map([], |row| {
                let bucket: String = row.get(0)?;
                let amount: f64 = row.get(1)?;
                Ok((bucket, amount))
            })?;

            for row in rows {
                let (bucket, amount) = row?;
                if let Ok(date) = Date::parse(&bucket, &format) {
                    monthly_totals
                        .entry(date)
                        .and_modify(|value| *value += amount)
                        .or_insert(amount);
                }
            }

            let now = OffsetDateTime::now_utc().date();
            let mut cursor_year = now.year();
            let mut cursor_month = now.month().number_from_month() as i32;

            let mut months: Vec<Date> = Vec::new();
            for _ in 0..12 {
                let month_enum = Month::try_from(cursor_month as u8)
                    .context("Invalid month value while building curve")?;
                let date = Date::from_calendar_date(cursor_year, month_enum, 1)
                    .context("Failed to construct calendar date")?;
                months.push(date);

                cursor_month -= 1;
                if cursor_month == 0 {
                    cursor_month = 12;
                    cursor_year -= 1;
                }
            }
            months.reverse();

            let mut cumulative = 0.0;
            let mut curve = Vec::with_capacity(months.len());

            for date in months {
                let key = monthly_totals.get(&date).copied().unwrap_or(0.0);
                cumulative += key;
                let cash = (cumulative * 0.4).max(0.0);
                let invested = (cumulative * 0.55).max(0.0);
                let debt = (-cumulative * 0.2).max(0.0);

                curve.push(NetWorthPoint {
                    date: date.format(&format)?.to_string(),
                    net_worth: cumulative,
                    cash,
                    invested,
                    debt,
                });
            }

            Ok::<_, anyhow::Error>(curve)
        })
        .await
        .map_err(|error| anyhow!("Blocking task failed: {error}"))?
    }
}
