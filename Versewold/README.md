# Versewold application

See the [repository README](../README.md) for setup, [architecture notes](../docs/architecture.md) for code ownership, and [poetry research](../research/README.md) for sourced form and phonetics guidance.

```powershell
npm install
npm run tauri dev
```

`npm run dev` runs a temporary browser preview. The desktop runtime saves all user data—Markdown manuscripts, JSON manifests/settings, custom forms, and backups—in Tauri’s roaming app folder (`%APPDATA%\com.client.versewold\` on Windows). See [storage migration](../docs/storage-migration.md).
