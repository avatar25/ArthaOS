use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FlowKind {
    Debit,
    Credit,
}

impl FlowKind {
    pub fn from_amount(amount: f64) -> Self {
        if amount >= 0.0 {
            FlowKind::Credit
        } else {
            FlowKind::Debit
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            FlowKind::Debit => "debit",
            FlowKind::Credit => "credit",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InboxItem {
    pub temp_id: String,
    pub date: String,
    pub description: String,
    pub amount: f64,
    pub flow: FlowKind,
    pub suggested_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryResponse {
    pub month: String,
    pub total_spend: f64,
    pub by_category: Vec<CategoryAmount>,
    pub budgets: Vec<BudgetUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryAmount {
    pub category: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetUsage {
    pub category: String,
    pub cap: f64,
    pub spent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetWorthPoint {
    pub date: String,
    pub net_worth: f64,
    pub cash: f64,
    pub invested: f64,
    pub debt: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetCategoryResponse {
    pub ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub accounts: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetConfig {
    pub category: String,
    pub cap: f64,
}
