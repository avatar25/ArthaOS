#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod keychain;

use std::{path::PathBuf, sync::Arc};

use anyhow::{Context, Result};
use artha_core::{
    dto::{AppSettings, BudgetConfig, InboxItem, NetWorthPoint, SetCategoryResponse, SummaryResponse},
    ArthaCore,
};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tauri::State;

struct AppState {
    core: RwLock<Option<Arc<ArthaCore>>>,
}

impl AppState {
    fn new() -> Self {
        Self {
            core: RwLock::new(None),
        }
    }

    fn set_core(&self, core: ArthaCore) -> Arc<ArthaCore> {
        let arc = Arc::new(core);
        *self.core.write() = Some(arc.clone());
        arc
    }

    fn require_core(&self) -> Result<Arc<ArthaCore>> {
        self.core
            .read()
            .clone()
            .context("Vault locked. Unlock before accessing data.")
    }
}

#[derive(Serialize)]
struct UnlockVaultResponse {
    ok: bool,
    message: String,
}

#[derive(Deserialize)]
struct ImportCsvPayload {
    bytes: Vec<u8>,
    name: Option<String>,
}

#[derive(Deserialize)]
struct SetInboxCategoryPayload {
    temp_id: String,
    category: String,
}

#[derive(Deserialize)]
struct SetSettingPayload {
    key: String,
    value: String,
}

#[derive(Deserialize)]
struct SetBudgetPayload {
    category: String,
    cap: f64,
}

fn vault_path() -> Result<PathBuf> {
    let mut base = dirs::data_dir().context("Could not resolve application support directory")?;
    base.push("ArthaOS");
    std::fs::create_dir_all(&base)?;
    base.push("vault.db.enc");
    Ok(base)
}

#[tauri::command]
async fn unlock_vault(state: State<'_, AppState>) -> Result<UnlockVaultResponse, String> {
    let key = keychain::get_or_create_vault_key()
        .map_err(|error| format!("Keychain failure: {error}"))?;

    let db_path = vault_path().map_err(|error| format!("Storage failure: {error}"))?;

    let core = ArthaCore::bootstrap(db_path, key)
        .map_err(|error| format!("Vault bootstrap failed: {error}"))?;

    state.set_core(core);

    Ok(UnlockVaultResponse {
        ok: true,
        message: "Vault unlocked".into(),
    })
}

#[tauri::command]
async fn import_csv(payload: ImportCsvPayload, state: State<'_, AppState>) -> Result<Vec<InboxItem>, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.import_csv(&payload.bytes)
        .await
        .map_err(|error| format!("Import failed: {error}"))
}

#[tauri::command]
async fn get_inbox(state: State<'_, AppState>) -> Result<Vec<InboxItem>, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.get_inbox()
        .await
        .map_err(|error| format!("Inbox fetch failed: {error}"))
}

#[tauri::command]
async fn set_inbox_category(
    payload: SetInboxCategoryPayload,
    state: State<'_, AppState>,
) -> Result<SetCategoryResponse, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.set_inbox_category(&payload.temp_id, &payload.category)
        .await
        .map_err(|error| format!("Update failed: {error}"))
}

#[tauri::command]
async fn commit_inbox(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.commit_inbox()
        .await
        .map(|count| serde_json::json!({ "committedCount": count }))
        .map_err(|error| format!("Commit failed: {error}"))
}

#[tauri::command]
async fn get_summary(month: String, state: State<'_, AppState>) -> Result<SummaryResponse, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.get_summary(&month)
        .await
        .map_err(|error| format!("Summary failed: {error}"))
}

#[tauri::command]
async fn get_networth_curve(state: State<'_, AppState>) -> Result<Vec<NetWorthPoint>, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

}

#[tauri::command]
async fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.get_app_settings()
        .await
        .map_err(|error| format!("Settings fetch failed: {error}"))
}

#[tauri::command]
async fn update_setting(payload: SetSettingPayload, state: State<'_, AppState>) -> Result<(), String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.update_setting(&payload.key, &payload.value)
        .await
        .map_err(|error| format!("Settings update failed: {error}"))
}

#[tauri::command]
async fn get_budget_configs(state: State<'_, AppState>) -> Result<Vec<BudgetConfig>, String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.get_budget_configs()
        .await
        .map_err(|error| format!("Budgets fetch failed: {error}"))
}

#[tauri::command]
async fn set_budget_config(
    payload: SetBudgetPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let core = state
        .require_core()
        .map_err(|error| format!("Locked: {error}"))?;

    core.set_budget_config(&payload.category, payload.cap)
        .await
        .map_err(|error| format!("Budget update failed: {error}"))
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            unlock_vault,
            import_csv,
            get_inbox,
            set_inbox_category,
            commit_inbox,
            get_summary,
            get_networth_curve,
            get_app_settings,
            update_setting,
            get_budget_configs,
            set_budget_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
