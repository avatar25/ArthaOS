use anyhow::{anyhow, Context, Result};
use csv::ReaderBuilder;

#[derive(Debug, Clone)]
pub struct ParsedRow {
    pub date: String,
    pub description: String,
    pub amount: f64,
}

pub fn parse_csv(bytes: &[u8]) -> Result<Vec<ParsedRow>> {
    let mut reader = ReaderBuilder::new()
        .flexible(true)
        .has_headers(true)
        .from_reader(bytes);

    let headers = reader
        .headers()
        .context("CSV missing header row")?
        .iter()
        .map(|h| h.trim().to_lowercase())
        .collect::<Vec<_>>();

    let date_idx = find_index(&headers, &["date", "transaction date", "posted date"])
        .context("CSV missing date column")?;
    let desc_idx = find_index(
        &headers,
        &["description", "memo", "details", "name", "transaction description"],
    )
    .context("CSV missing description column")?;
    let amount_idx = find_index(&headers, &["amount", "transaction amount"]).ok();
    let debit_idx = find_index(&headers, &["debit"]);
    let credit_idx = find_index(&headers, &["credit"]);

    let rows = reader
        .records()
        .filter_map(|record| {
            let record = match record {
                Ok(record) => record,
                Err(error) => {
                    log::warn!("Skipping malformed row: {error}");
                    return None;
                }
            };

            let date = record
                .get(date_idx)
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())?;
            let description = record
                .get(desc_idx)
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "Transaction".to_string());

            let amount = match amount_idx {
                Some(idx) => parse_amount(record.get(idx).unwrap_or("0")).ok(),
                None => {
                    let debit = debit_idx
                        .and_then(|idx| parse_amount(record.get(idx).unwrap_or("0")).ok())
                        .unwrap_or(0.0);
                    let credit = credit_idx
                        .and_then(|idx| parse_amount(record.get(idx).unwrap_or("0")).ok())
                        .unwrap_or(0.0);
                    Some(credit - debit)
                }
            };

            Some(ParsedRow {
                date,
                description,
                amount: amount.unwrap_or(0.0),
            })
        })
        .collect::<Vec<_>>();

    if rows.is_empty() {
        Err(anyhow!("CSV produced zero rows"))
    } else {
        Ok(rows)
    }
}

fn find_index(headers: &[String], candidates: &[&str]) -> Option<usize> {
    candidates
        .iter()
        .find_map(|candidate| headers.iter().position(|header| header == candidate))
}

fn parse_amount(raw: &str) -> Result<f64> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(0.0);
    }

    let mut cleaned = trimmed.replace(',', "").replace('$', "");
    let negative = (cleaned.starts_with('(') && cleaned.ends_with(')'))
        || cleaned.starts_with('-');

    cleaned = cleaned
        .trim_start_matches('(')
        .trim_end_matches(')')
        .trim_start_matches('-')
        .trim()
        .to_string();

    let value: f64 = cleaned
        .parse()
        .with_context(|| format!("Failed to parse amount: {trimmed}"))?;

    if negative {
        Ok(-value)
    } else {
        Ok(value)
    }
}
