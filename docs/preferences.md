# Personal preferences, version 1

Preferences save automatically to `user-settings.json` in Rust's `app.path().app_config_dir()`. For the current Windows identifier, the location is `%APPDATA%\com.client.versewold\user-settings.json`. The Files & storage category displays the shared app directory and can open it. Projects, Markdown, manifests, custom forms, selection state, and backups all live in this same roaming folder.

## Controls and defaults

| Area                    | Options                                                          | Default                            |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| Palette                 | Heather & Earth, Midnight Ink, Warm Parchment; 15 editable roles | Heather & Earth                    |
| Color editing           | RGB sliders and numbers, native picker, six-digit hex            | Supplied earth/lavender palette    |
| Native controls         | Light or dark color scheme                                       | Dark                               |
| Interface type          | Search installed/bundled families; 11–22 px                      | Inter, 13 px                       |
| Heading / analysis type | Independent searchable font families                             | Cormorant Garamond / IBM Plex Mono |
| Writing type            | Independent family; 12–48 px                                     | EB Garamond, 21 px                 |
| Line spacing            | 1–3 times writing size                                           | 1.9                                |
| Maximum writing width   | 360–1200 px, constrained by available space                      | 720 px                             |
| Writing behavior        | Soft wrap, webview spellcheck, statistics, form guidance         | All enabled                        |
| Strict formatting       | Yellow count/layout warnings; approximate English syllables      | Disabled                           |
| Author profile          | Default author/pen name for new writing and export fallbacks     | Blank                              |

Display changes never rewrite Markdown. Wrapping inserts no newline characters. Interface text scales independently of manuscript text. The preview uses original sample text. Each font, font size, line-spacing control, and writing-width control has its own Reset button; its tooltip shows the default, and it is disabled when already at that default. Appearance and writing can also each be reset as a category.

## JSON contract and lifecycle

The complete checked-in default document is [`default-preferences.json`](../Versewold/src/domain/default-preferences.json), shared by Rust and TypeScript. Version 1 has `schemaVersion`, `appearance`, `writing`, and optional `profile: {"authorName":""}`. Missing profiles default to a blank byline without resetting existing choices. Appearance stores the preset ID (`custom` after a color edit), native color scheme, named palette colors, three font families, and interface size. Writing stores its font family, size, line-height multiplier, width, and behavior booleans. Font names are family names, not paths; colors are `#RRGGBB` strings. Export typography is independently saved with each project's [manuscript layout](manuscript-pdf.md).

Loading validates the full document, version, palette keys, colors, font names, and typography ranges. Unsupported or damaged documents show an error and are preserved. Saving uses a serialized queue, 400 ms debounce, synchronized temporary file, and atomic replacement. Ctrl/Cmd+S and normal native window close flush both writing and preference queues. An external modification causes a visible conflict on the next changed save; reopen to load that version. There is no live watcher, multi-process lock, or preference history.

`writing.strictFormatting` is an optional addition to version 1. Missing values default to false without resetting other preferences. Strict can be changed beside Form guide or in Writing preferences. It highlights count/layout deviations without changing manuscript content; [composition](composition.md) documents the estimate's scope and limitations.

On first load with no personal file, the app imports earlier `editorFontSize` and `showGuidance` choices from `settings.json`, then writes the personal settings file. An existing personal file takes precedence. Legacy values are retained if personal preferences cannot load; after success, a normal workspace save removes them. [Storage migration](storage-migration.md) also imports the earlier executable-adjacent projects, forms, and backups into the shared roaming folder while preserving the original copy.

The browser preview keeps all choices in memory and offers only bundled fonts. The Windows desktop app queries DirectWrite's system font collection on demand and supports refreshing it after font installation. Missing fonts fall back to CSS serif/sans-serif/monospace families; the saved family name is retained. Other operating systems currently offer the bundled font list. Fonts are not copied, downloaded, or installed by Versewold. Spellcheck behavior and available dictionaries come from the operating system/webview.

## References and design choices

- [Obsidian Appearance](https://obsidian.md/help/appearance) informed the familiar appearance category and light/dark theme organization. Separate interface and manuscript typography, a live writing sample, and explicit reset buttons are Versewold choices for long writing sessions.
- [Tauri PathResolver](https://docs.rs/tauri/latest/tauri/path/struct.PathResolver.html) defines `app_config_dir()` as the platform configuration directory joined with the bundle identifier; Windows uses RoamingAppData. The location is resolved by native code, not guessed or supplied by the frontend.
- [Microsoft DirectWrite system font collection](https://learn.microsoft.com/en-us/windows/win32/api/dwrite/nf-dwrite-idwritefactory-getsystemfontcollection) provides installed font families and an update check. Versewold uses this API instead of requiring browser font-access permission or enumerating font files.
