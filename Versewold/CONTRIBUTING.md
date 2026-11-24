# Working on Versewold

See the repository-root README and `docs/architecture.md` for setup and code ownership.

- Compose screens in `src/views`; extract reusable presentation into `src/components`.
- Keep business rules under `src/domain`, reactivity under `src/composables`, and native calls under `src/services`.
- Keep filesystem logic in native `storage.rs` (writing), `backups.rs`, `migration.rs`, and `preferences.rs`, not in Vue components or unrestricted frontend plugins. All user data uses native `app.path().app_config_dir()`; the executable directory is read only for one-time legacy import.
- Keep default CSS tokens in `styles/tokens.css`, shared preference defaults in `domain/default-preferences.json`, and reactive overrides in `useAppearance.ts`. Keep shell, component, view, and preference styles in their respective files. Use palette variables for derived surfaces so custom and light themes work consistently.
- Comment intent and non-obvious behavior, especially persistence, pronunciation uncertainty, and schema decisions. Generated validator code is deliberately machine-produced.
- Add forms as JSON, validate with `npm test`, and keep source citations and variant notes with each definition.
- The complete category survey is curated in `../research/poetic-forms/definitions.mjs`; use `npm run catalog:build` and then `npm run format` to regenerate its runtime JSON. Preserve the inventory-to-template coverage checks and keep historical traditions distinct from universal fixed forms.
- Run `npm test`, `npm run build`, and the Rust storage tests after changing relevant logic. Format Rust with `cargo fmt --manifest-path src-tauri/Cargo.toml`.
- Never commit user data. Research belongs in the repository-root `research/`, outside the Tauri application.

`npm run dev`, `npm run build`, and `npm test` regenerate the committed schema validator. When the schema changes, include the generated validator in the same change. The generator converts Ajv helper imports to static ESM so native script CSP can remain strict.
