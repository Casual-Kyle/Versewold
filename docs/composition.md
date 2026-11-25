# Stanza-aware composition

The writing desk has **Guided** and **Markdown** views of the same saved text. Guided view adds stanza headings, line numbers within each stanza, rhyme letters, and per-line targets from the selected form. Markdown view hides these annotations and shows physical source-line numbers. Neither mode stores labels or placeholders in the poem.

## Natural stanza detection

- One Enter continues the current stanza. A blank line (two consecutive newline characters) separates stanzas.
- Additional empty lines remain unchanged in the file and still represent one separation, rather than empty stanzas.
- Soft wrapping never creates a new poetic line or stanza.
- The final empty source line is treated as the next writing position. After one Enter it previews the next line of the current stanza; after a blank line it previews the first line of the next stanza.
- There is no Add stanza action, forced line count, or automatic restructuring. Existing poems and form changes retain their exact text. Extra lines/stanzas remain editable even when outside the chosen template.

Repeating stanza templates reuse their declared line rules; continuous-line templates apply their meter to every verse without inventing one-line stanzas. Open forms retain numbering/stanza labels without imposing a fixed layout. Fixed forms use their declared stanza order and labels.

Fixed templates can opt into `structure.lineMapping: "poem"` when their formal sections need not be printed as separate stanzas. The Shakespearean sonnet does this: its ABAB CDCD EFEF GG sequence and iambic-pentameter targets continue through all fourteen lines, with or without visual stanza breaks. Actual stanza labels still follow the writer's blank lines; the inspector separately identifies the formal quatrain/couplet and overall line progress. No blank lines are inserted or removed.

## Support labels and popular variants

Guided view explicitly identifies **Line-by-line guidance**, **Layout-only guidance**, **Notes-only guidance**, or an unavailable template, based on the rules actually present. A dash in the rhyme gutter means no prescribed rhyme letter for that line; its tooltip distinguishes an unprescribed rhyme position, notes-only entry, missing template, or extra line beyond the template.

- **Haiku** is the broad tradition overview, marked Notes-only. Its button selects **Haiku · 5–7–5 practice**, which supplies three syllabic targets without inventing rhyme letters. The support strip and inspector explain that no end-rhyme scheme is prescribed. Japanese morae and English syllables remain distinct; the practice variant is explicitly labeled as an English teaching exercise.
- **Sonnet** supplies fourteen lines without imposing one subtype's rhyme/meter. It is marked Layout-only and links directly to **Shakespearean sonnet** for the complete English pattern.
- **Shakespearean sonnet** supplies fourteen lines, three quatrains and a closing couplet as formal sections, ABAB CDCD EFEF GG, and conventional iambic pentameter. [Academy of American Poets: Sonnet](https://poets.org/glossary/sonnet) is the template's supporting reference.

Optional `catalog.variants` IDs drive those buttons. They resolve only to available writing templates; there is no per-form branching in Vue. Both additions are optional in schema version 1, and older custom templates retain their existing stanza-based mapping.

## Inline guidance and the inspector

**Writing in** is a searchable combobox. It matches all search terms across names, aliases, traditions, languages, tags, and summaries, ignoring accents/case. Exact names and aliases sort first. Filters distinguish forms with line targets from notes/layout entries, and reference-only catalog entries are excluded. Arrow keys browse results, Enter chooses, and Escape cancels without changing the current form. The highlighted candidate shows its summary and actual support before selection. No results leaves the current form intact.

The Form inspector follows the cursor. It shows the active stanza/line, stanza progress, declared meter/weight targets, and expected stress-foot diagrams when the template supplies them. Full form/craft notes remain available in an expandable section.

## Strict count and layout feedback

**Strict**, beside Form guide, enables yellow highlighting on written lines that miss a count target or extend beyond the form's line layout. It defaults off and saves in roaming `user-settings.json` as `writing.strictFormatting`; older settings without this field load with it off. It is also available in Preferences → Writing. Form-guide visibility and Guided/Markdown display are independent of Strict. It never rejects typing, inserts stanza breaks, or changes saved Markdown.

English syllabic and accentual-syllabic forms display an approximate current/target count, such as `≈ 9/8 syll.`. Standard Habbie checks 8/8/8/4/8/4 in each detected stanza, including its conventional base counts when the writer explicitly enables Strict. Optional meter targets are not enforced. Word-count targets use actual whitespace-delimited word counts. Blank separators, empty writing positions, and unwritten future lines are not warnings.

The offline [syllable estimator](https://github.com/words/syllable) uses English spelling rules and exceptions. The inspector explains over/under counts and offers an expandable per-word breakdown. These are estimates, including for names, Scots vocabulary, dialect, and poetic elision; a matching count does not validate stress or rhyme. Numeric tokens, URLs, Markdown links/code, unsupported scripts, and non-English template languages are explicitly not checked for syllables. Stress beats, morae, quantitative weight, and end-rhyme matching are not tested by this toggle. Dependency notices ship with the application.

The compact **Line map** highlights the current verse and shows the form's rhyme sequence, syllabic targets, or word targets. Clicking a written position moves the cursor and scrolls the editor without changing text. Existing empty writing positions are also navigable; missing positions stay disabled. Repeating stanza maps follow the current stanza, while whole-poem maps retain their formal sections across printed stanza breaks. Continuous-line forms show the current target. The compact map caps large custom templates at 80 positions and refers to the full guide for remaining targets.

Rhyme hints group existing end words by the template's rhyme letters and scope. These are writing prompts, not pronunciation-based rhyme validation or dictionary suggestions. Repeated refrains display their actual defining line; Insert refrain replaces only the active line and is a separate, undoable action. End-word and internal-rhyme constraints are visible beside the active line and in the full form guide.

Syllable targets, stress counts, morae, quantitative weight, and word counts remain distinct. Accentual-syllabic forms display the base syllable target implied by the declared foot pattern. Strict adds explicitly approximate English syllable counts; no pronunciation/scansion match percentage is invented. Automatic scansion, dictionary rhyme suggestions, and pronunciation overrides remain planned work.

## Find and replace

**Find & replace** in the writing toolbar searches the current poem's Markdown source in either writing view. Ctrl+F (Command+F on macOS) opens the find field; Ctrl+H/Command+H focuses the replacement field. Opening from a single-line text selection uses that text as the query. Enter and Shift+Enter in the find field navigate next/previous; F3/Shift+F3 and Ctrl+G/Ctrl+Shift+G also navigate. Navigation wraps at either end. Escape closes search and returns focus to the editor; switching poems closes the panel so old selections cannot affect another document.

The panel shows a match count and highlights actual source text, excluding stanza headings, rhyme letters, and target annotations. Search is literal, including punctuation and replacement characters such as `$&`; it does not interpret regular expressions. Match case is optional. Whole words treats Unicode letters, combining marks, numbers, and underscores as word characters; apostrophes and hyphens are separators. Case-insensitive matching follows Unicode case rules without removing accents or normalizing composed/decomposed spelling.

**Replace** changes the selected match and selects the next occurrence. It is enabled only while an exact match is selected. **Replace all** changes all current matches as one undoable action. Return to the editor with Escape to use normal Ctrl+Z/Ctrl+Shift+Z undo/redo. Replacement uses the same source-preserving editor transaction as typing, retaining unrelated Unicode, indentation, stanza breaks, original line endings, and trailing whitespace. Identical replacements and empty/no-result searches produce no edit or undo entry. Opening, changing, navigating, or closing search never writes text or updates the poem's revision date; actual replacement and undo/redo of changed text do.

## Cursor navigation layout

Stanza headings are CodeMirror block widgets. Their vertical spacing must be padding inside the measured widget, with zero vertical margins; otherwise the visible lines and the editor's coordinate map can disagree. The 25 November correction moves the former 8px bottom margin into bottom padding. This follows [CodeMirror's block-widget layout rule](https://codemirror.net/docs/ref/#view.Decoration^widget). Up/Down and Home/End retain the standard editor commands, including wrapped-line navigation and Shift selection.

A 24-stanza fixture passed browser and Windows desktop checks in Guided and Markdown views with soft wrap on and off. The checks covered Up/Down across stanza breaks and wrapped rows, End and Shift+Home within a row, and Ctrl+Home/End at document boundaries. Navigation preserved the exact Markdown and its revision timestamp. The original report's window size and typography are unknown.

## Editor and persistence boundary

`VerseEditor.vue` wraps CodeMirror's state/view/commands packages. `guidedEditor.ts` supplies measured gutter markers, block stanza headings, and inline decorations. `domain/forms/composition.ts` interprets data-driven form rules independently of Vue and native storage. `FormPicker.vue` uses pure search ranking in `domain/forms/picker.ts`; `FormMap.vue` uses source-position mapping in `domain/forms/lineMap.ts`. `LineInspector.vue` and `MeterPattern.vue` present the active rule. No form-specific branching or executable template scripts are introduced.

CodeMirror edits normalized LF positions; `services/editorSource.ts` retains the original raw source alongside that document. Only changed spans are translated back, preserving untouched Unicode, indentation, mixed CRLF/LF/CR, and trailing newlines. Exact source snapshots participate in undo/redo. Copying from Guided view copies manuscript text, excluding annotation widgets. The existing workspace autosave and rotating backups still store plain `.md` files under `%APPDATA%\com.client.versewold\`.

Undo history remains scoped to the mounted poem editor. It survives display-mode/form changes, but retaining it across poem/view switches is still EDIT-02. Font, size, line spacing, soft-wrap, and spellcheck preferences apply to this editor. The editor requires no online service; dependency licenses ship under `public/licenses/editor-dependencies.txt`.

## Verification

The domain and CodeMirror tests pass for Unicode and whole-word matching, normalized offsets, query changes, exact-source undo/redo, no-ops, history isolation, and separate poem states. Browser and Windows desktop checks exercised Ctrl+F/Ctrl+H, next/previous navigation, Replace all, undo, and redo. Native saves confirmed exact mixed line endings and a revision timestamp that advanced only on text changes.

Domain/editor-state tests cover empty drafts, prospective lines, automatic blank-line stanza boundaries, repeating/fixed/open/continuous forms, distinct metrical units, scoped end words, actual refrain text, Unicode/raw-newline preservation, and grouped undo/redo. Browser checks cover typing, wrapped lines, form switching without text changes, single/double Enter behavior, refrain insertion/undo, and copy excluding visual annotations.

The searchable picker and line-map pass adds tests for ranking/aliases, support filters, exclusion of reference entries, non-mutating searches, source positions across sonnet stanza breaks, current repeating stanzas, prospective/missing lines, and large-template bounds. Browser checks cover keyboard selection/cancellation, empty results, alias search, haiku variants, and cursor navigation without text changes.

Strict tests cover 9/8 and 4/4 Habbie lines, repeating stanzas, haiku/sonnet targets, per-word estimates, unsupported input/languages, optional and non-syllabic meter, word counts, blank/extra rows, and toggling actual editor decorations without changing source or cursor. Native tests cover loading older settings and persisting the toggle across reopen.
