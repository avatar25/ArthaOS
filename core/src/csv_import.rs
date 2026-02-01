use anyhow::{anyhow, Context, Result};
use csv::ReaderBuilder;
use time::{macros::format_description, Date};

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
        &[
            "description",
            "memo",
            "details",
            "name",
            "transaction description",
            "narration",
            "particulars",
        ],
    )
    .context("CSV missing description column")?;
    let amount_idx = find_index(&headers, &["amount", "transaction amount"]).ok();
    let debit_idx = find_index(&headers, &["debit", "debit amount", "withdrawal amount"]);
    let credit_idx = find_index(&headers, &["credit", "credit amount", "deposit amount"]);

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

            let raw_date = record
                .get(date_idx)
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())?;

            // Normalize Date
            let date = normalize_date(&raw_date).unwrap_or(raw_date);

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
    // 1. Exact match first
    if let Some(idx) = candidates
        .iter()
        .find_map(|candidate| headers.iter().position(|header| header == candidate))
    {
        return Some(idx);
    }
    // 2. Contains match fallback (e.g. "Debit Amount" contains "debit")
    candidates.iter().find_map(|candidate| {
        headers
            .iter()
            .position(|header| header.contains(candidate))
    })
}

fn parse_amount(raw: &str) -> Result<f64> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(0.0);
    }

    let mut cleaned = trimmed.replace(',', "").replace('$', "");
    let negative =
        (cleaned.starts_with('(') && cleaned.ends_with(')')) || cleaned.starts_with('-');

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

fn normalize_date(raw: &str) -> Option<String> {
    // Try formats: DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD
    let formats = [
        format_description!("[day]/[month]/[year repr:last_two]"),
        format_description!("[day]/[month]/[year]"),
        format_description!("[day]-[month]-[year]"),
        format_description!("[year]-[month]-[day]"),
    ];

    for format in formats {
        if let Ok(date) = Date::parse(raw.trim(), &format) {
            // Found a match, return standard SQL format
            let standard_fmt = format_description!("[year]-[month]-[day]");
            return Some(date.format(&standard_fmt).unwrap_or_else(|_| raw.to_string()));
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_hdfc_format() {
        let csv_data = "Date     ,Narration                                                                                                                ,Value Dat,Debit Amount       ,Credit Amount      ,Chq/Ref Number   ,Closing Balance
 01/01/26  ,ACH D- ZERODHA BROKING LTD-73KQFQ6W1FS9E                                                                                 ,01/01/26 ,        7500.00     ,           0.00     ,0000003717021274       ,     1340633.53  
 06/01/26  ,UPI-BLINKIT-BLINKIT.RZP@HDFCBANK-HDFC0000001-102403299392-REFUND FOR RAZORPA                                             ,06/01/26 ,           0.00     ,         248.00     ,0000102403299392       ,     1294194.06  ";

        let rows = parse_csv(csv_data.as_bytes()).expect("Failed to parse CSV");

        assert_eq!(rows.len(), 2);

        // Row 1: Debit
        let row1 = &rows[0];
        assert_eq!(row1.date, "2026-01-01");
        assert!(row1.description.contains("ZERODHA"));
        assert_eq!(row1.amount, -7500.0); // Debit should be negative

        // Row 2: Credit
        let row2 = &rows[1];
        assert_eq!(row2.date, "2026-01-06");
        assert!(row2.description.contains("BLINKIT"));
        assert_eq!(row2.amount, 248.0); // Credit should be positive
    }
}
