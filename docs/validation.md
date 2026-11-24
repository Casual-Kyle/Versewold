# Foundation validation

Verified on Windows on 23 November 2026.

- `npm test`: sixteen tests pass, covering all 152 catalog entries, complete 149-member source mapping, the research authoring example, aliases and accent-insensitive search, support filters, refrain positions, end-word rotations, metrical-unit distinctions, internal-rhyme positions, word-count feedback, continuous lines, malformed definitions, structural feedback, concurrent saves, and retry after failure.
- `npm run build`: TypeScript/Vue checks and the production Vite build pass.
- `npm run format:check`: consistent formatting across application source and configuration.
- `cargo test --manifest-path src-tauri/Cargo.toml`: four storage tests pass, including exact Markdown roundtrips, Windows file replacement, external-edit conflicts, path/version rejection, and missing referenced files.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --offline -- -D warnings`: passes.
- `npm run tauri build -- --debug --no-bundle`: builds the native Windows executable with embedded frontend assets.
- Browser interaction checks cover project creation, poem editing, form changes, and form-library navigation. No browser console errors were observed during those checks.
- Expanded-library browser checks confirm all 152 entries load, the structural filter has 48 matches, the reference filter has 19 matches and no compose actions, unaccented `buttenrede` finds `Büttenrede`, “Show more” expands from 24 to 48 visible records, and a new Dodoitsu draft displays mora targets rather than English syllable labels. The browser console remains clear.
- Native interaction checks create a project, autosave Markdown, close the app, and reopen it with the same project and poem selected. A direct file comparison confirms indentation, Unicode, stanza breaks, and a trailing newline are preserved. A custom form copied from the research example is visible in the native library after restart.

The native verification project is disposable development data, kept outside version control. The application itself starts with an empty library. This validation does not claim a packaged installer, signed release, macOS/Linux verification, linguistic analysis, or publication export.
