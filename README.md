# ArthaOS

**Personal Finance Vault for macOS – Offline-first, Encrypted, and Extensible**

---

## Overview

**ArthaOS** is a macOS desktop app designed for personal use to replace clunky Google Sheets or Excel budgeting workflows. It’s **fast**, **offline-first**, **fully local**, and built with a modern UI that makes tracking money actually enjoyable.

* **Stack:** Tauri + Vite + React (TypeScript) + Rust
* **Database:** Encrypted SQLite (SQLCipher)
* **Security:** macOS Keychain + Touch ID unlock
* **Design goals:** Elegant UI, privacy, speed, and easy migration to personal cloud later.

The app reads your bank statement CSVs, categorizes transactions intelligently, lets you set budgets, and shows clear trends for spending, savings, and overall net worth—all all locally on your machine with a support of adding to cloud later.

---

## 🧩 Architecture

```
root
│
├── app/         → React + Vite frontend (UI layer)
├── local/       → Tauri shell + Rust commands (local backend)
├── core/        → Shared Rust crate (models, CSV parsing, categorization, projections)
├── schema/      → JSON response shapes (API contract for future remote mode)
└── docs/        → Architecture, threat model, roadmap
```

### Core Components

| Component           | Tech                        | Purpose                                                        |
| ------------------- | --------------------------- | -------------------------------------------------------------- |
| **Frontend (app)**  | React + Tailwind + Recharts | UI for import, categorization, dashboard, settings             |
| **Backend (local)** | Rust (Tauri commands)       | Invokes `/core` crate for parsing, categorization, encryption  |
| **Core crate**      | Rust                        | Shared domain logic: transactions, categorization, projections |
| **Storage**         | SQLite (SQLCipher)          | Local encrypted data file (`vault.db.enc`)                     |
| **Security**        | macOS Keychain              | Secure key storage + Touch ID unlock                           |

---

## 🧠 Philosophy

1. **Local-first:** Everything runs locally by default; no cloud dependencies.
2. **Fast start:** Opens instantly, like a native Mac app.
3. **Trustless privacy:** Nothing leaves your machine unless you explicitly export or push.
4. **Composable:** Clear API boundaries make future migration to a personal backend trivial.
5. **Developer-friendly:** All logic isolated from UI; React and Rust code communicate via stable API contracts.

---

## 🧮 Core Features (M1)

* 🔐 **Encrypted Vault:** SQLite database encrypted with a key stored securely in macOS Keychain.
* 📂 **CSV Import:** Parse your bank statements; see transactions in an inbox view.
* 🧠 **Smart Categorization:** App remembers how you categorized merchants before (token-based memory).
* 💸 **Budgets:** Set monthly caps per category; track overspending visually.
* 📈 **Dashboard:** View net worth curve, liquidity vs. invested split, and category breakdowns.
* 💾 **Offline:** No internet access required; app runs entirely locally.
* 🧰 **Keyboard Shortcuts:** Quick add (⌘K), import (⌘I), and navigation.

---

## 🧱 Roadmap

### M1 – Scaffold / Local MVP

* [x] Tauri + React setup
* [x] Encrypted SQLite via Keychain key
* [x] CSV import → Inbox → Commit
* [x] Categorization memory (token map)
* [x] Basic dashboard (budgets, net worth, spend)

### M2 – Local Polish

* [ ] PDF parser for Indian banks
* [ ] Recurring expenses & projections
* [ ] Quick add + reports

### M3 – Transport Switch

* [ ] Abstract API calls through `apiClient`
* [ ] Allow local/remote switch (same data contracts)

### M4 – Personal Cloud Mirror

* [ ] Single-tenant Rust backend (Axum + Postgres)
* [ ] One-way push sync (Mac → Cloud)
* [ ] Read-only web dashboard via Vercel

### M5 – LLM support

* [ ] LLM support for categorization
* [ ] LLM support for budget suggestions
* [ ] LLM support for transaction suggestions
* [ ] LLM support for net worth projection
* [ ] LLM support for expense tracking
* [ ] LLM support for income tracking
* [ ] LLM support for financial advice
* [ ] LLM support for financial planning
---

## ☁️ Future Cloud Mode

In the future, you can host your own backend (Rust + Axum) with the same API contract. The frontend can connect via a toggle:

```json
{
  "data_source": "local" | "remote",
  "remote_url": "https://myvault.fly.dev",
  "auth_token": "<personal-key>"
}
```

* **Local mode:** Runs offline (default).
* **Remote mode:** Push snapshots to your personal backend for backup or remote viewing.
* **Sync model:** One-way push → read-only dashboard (no merge conflicts).

---

## 🧰 Developer Setup

### Prerequisites

* macOS (with Touch ID)
* Node.js ≥ 18
* Rust toolchain (stable)
* SQLite + SQLCipher

### Setup

```bash
# 1. Clone
 git clone https://github.com/<user>/<repo>.git
 cd <repo>

# 2. Install frontend deps
 cd app && npm install

# 3. Build Tauri
 cd ../local && cargo tauri dev
```

App opens instantly with lock screen → unlocks via Touch ID → shows dashboard.

---

## 🔒 Security Model

| Layer              | Mechanism                                       |
| ------------------ | ----------------------------------------------- |
| **Encryption**     | SQLCipher (AES-256) on DB file                  |
| **Key Storage**    | macOS Keychain (never stored in plaintext)      |
| **Authentication** | macOS LocalAuthentication (Touch ID / password) |
| **Data Export**    | Encrypted bundle (`.wvault`) only               |
| **Networking**     | No outbound calls in local mode                 |

---

## 🧠 Categorization Engine

| Rule Type | Example               | Description                                    |
| --------- | --------------------- | ---------------------------------------------- |
| Memory    | `RAPIDO → Transport`  | Learns once, applies automatically next import |
| Heuristic | `SIP → Investment`    | Built-in pattern for Indian vendors            |
| Manual    | Editable via Inbox UI | You can override or refine categories          |

The engine improves over time as you correct categories, building a personalized token map.

---

## 🪄 Visual Design

Minimal. Native. High-contrast.

* Font: SF Pro / System UI
* Palette: neutral background, accent by category
* Layout: left nav (Dashboard, Import, Settings)
* Charts: clean, rounded edges, soft motion (Framer Motion + Recharts)

---

## 🪶 License

MIT License © 2025 – Built for personal use and future open-source contribution.

Use freely, learn from it, improve your own financial clarity.

---

## 🧩 Author Notes

Built with ❤️ by **Shiben** — a software engineer who got tired of spreadsheets and wanted his money data to feel like a cockpit, not a chore.

> “The goal isn’t to track expenses—it’s to understand momentum.”

---


