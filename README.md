# ArthaOS

Local-first personal finance desktop app. M1 ships a macOS-only vault with no outbound network calls.

## Monorepo layout

- `app/` – React 19 + Vite UI with Tailwind, Zustand, TanStack Query, Recharts.
- `local/` – Tauri shell exposing Rust commands and wiring the macOS Keychain gate.
- `core/` – Shared Rust crate with encrypted SQLite facade, CSV import pipeline, categorization memory.
- `schema/` – JSON examples for the initial API surface.
- `docs/` – Stack notes, threat model, roadmap, and decision logs.

## Quick start

```bash
# Install dependencies
cd app && npm install

# Run web UI alongside Tauri shell
npm run dev
```

Tauri dev/build commands live in `/local` and expect the UI to be built in `/app/dist` during packaging (`npm run build --prefix ../app`).

