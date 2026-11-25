import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Compartment, EditorState, Transaction, type TransactionSpec } from '@codemirror/state';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { normalizeNewlines } from '../src/domain/forms/composition.ts';
import { sourceDocument } from '../src/services/editorSource.ts';
import {
  editorSearch,
  navigateEditorSearch,
  replaceAllEditorSearchMatches,
  replaceEditorSearchMatch,
  setEditorSearch,
} from '../src/services/editorSearch.ts';
import type { SearchOptions } from '../src/domain/editor/search.ts';

function draft(initial: string) {
  const source = sourceDocument(initial);
  const display = new Compartment();
  let state = EditorState.create({
    doc: normalizeNewlines(initial),
    extensions: [history(), source.extensions, editorSearch, display.of([])],
  });
  let textChanges = 0;
  function dispatch(spec: TransactionSpec | Transaction | undefined) {
    if (!spec) return;
    const transaction = spec instanceof Transaction ? spec : state.update(spec);
    if (transaction.docChanged) textChanges++;
    state = transaction.state;
  }
  return {
    get state() {
      return state;
    },
    get body() {
      return state.field(source.field);
    },
    get textChanges() {
      return textChanges;
    },
    display,
    dispatch,
    search(query: string, extra: Partial<SearchOptions> = {}) {
      dispatch({
        effects: setEditorSearch.of({ query, matchCase: false, wholeWord: false, ...extra }),
        annotations: Transaction.addToHistory.of(false),
      });
    },
    navigate(direction: -1 | 1 = 1) {
      dispatch(navigateEditorSearch(state, direction));
    },
  };
}

test('opening, changing, navigating, and closing search never edits source or undo history', () => {
  const initial = '  🌙 sea\r\n\r\nSea\rwind  \n';
  const editor = draft(initial);
  editor.search('sea');
  assert.equal(editor.state.field(editorSearch).matches.length, 2);
  editor.navigate();
  editor.navigate(-1);
  editor.search('sea', { matchCase: true, wholeWord: true });
  editor.navigate();
  editor.dispatch({ effects: setEditorSearch.of(null) });
  assert.equal(editor.body, initial);
  assert.equal(editor.textChanges, 0);
  assert.equal(undoDepth(editor.state), 0);
  assert.equal(editor.state.field(editorSearch).decorations.size, 0);
});

test('replace one acts only on an exact selected match and supports byte-exact undo/redo', () => {
  const initial = '🌙 sea\r\nSEA\n\rsea  ';
  const editor = draft(initial);
  editor.search('sea');
  assert.equal(replaceEditorSearchMatch(editor.state, 'shore'), undefined);
  editor.navigate();
  editor.dispatch(replaceEditorSearchMatch(editor.state, 'shore'));
  const changed = '🌙 shore\r\nSEA\n\rsea  ';
  assert.equal(editor.body, changed);
  assert.equal(editor.state.field(editorSearch).matches.length, 2);
  assert.ok(undo(editor));
  assert.equal(editor.body, initial);
  assert.ok(redo(editor));
  assert.equal(editor.body, changed);
});

test('replace all is one undo step and retains untouched Markdown, whitespace, and line endings', () => {
  const initial = '\t**sea**  \r\n\r\n🌙 Sea\n\tsea\rwind  \r\n';
  const editor = draft(initial);
  editor.search('sea');
  editor.dispatch(replaceAllEditorSearchMatches(editor.state, '$&\\shore'));
  const changed = '\t**$&\\shore**  \r\n\r\n🌙 $&\\shore\n\t$&\\shore\rwind  \r\n';
  assert.equal(editor.body, changed);
  assert.equal(editor.textChanges, 1);
  assert.equal(undoDepth(editor.state), 1);
  assert.ok(undo(editor));
  assert.equal(editor.body, initial);
  assert.equal(undoDepth(editor.state), 0);
  assert.ok(redo(editor));
  assert.equal(editor.body, changed);
});

test('replacement supports deletion and multiline text without normalizing unrelated breaks', () => {
  const initial = 'sea\r\nwind\nsea\rmoon';
  const editor = draft(initial);
  editor.search('sea');
  editor.dispatch(replaceAllEditorSearchMatches(editor.state, 'shore\nlight'));
  assert.equal(editor.body, 'shore\r\nlight\r\nwind\nshore\r\nlight\rmoon');
  assert.ok(undo(editor));
  assert.equal(editor.body, initial);
  editor.dispatch(replaceAllEditorSearchMatches(editor.state, ''));
  assert.equal(editor.body, '\r\nwind\n\rmoon');
  assert.ok(undo(editor));
  assert.equal(editor.body, initial);
});

test('identical replacements and no-result searches produce no editing transaction', () => {
  const initial = 'sea\r\nsea  ';
  const editor = draft(initial);
  editor.search('sea');
  editor.navigate();
  assert.equal(replaceEditorSearchMatch(editor.state, 'sea'), undefined);
  assert.equal(replaceAllEditorSearchMatches(editor.state, 'sea'), undefined);
  editor.search('');
  assert.equal(replaceAllEditorSearchMatches(editor.state, 'shore'), undefined);
  editor.search('absent');
  assert.equal(replaceEditorSearchMatch(editor.state, 'shore'), undefined);
  assert.equal(replaceAllEditorSearchMatches(editor.state, 'shore'), undefined);
  assert.equal(editor.body, initial);
  assert.equal(editor.textChanges, 0);
  assert.equal(undoDepth(editor.state), 0);
});

test('replacement is isolated from typing before and after it', () => {
  const editor = draft('sea');
  editor.dispatch({ changes: { from: 3, insert: '!' }, userEvent: 'input.type' });
  editor.search('sea');
  editor.dispatch(replaceAllEditorSearchMatches(editor.state, 'shore'));
  editor.dispatch({ changes: { from: 6, insert: '?' }, userEvent: 'input.type' });
  assert.ok(undo(editor));
  assert.equal(editor.body, 'shore!');
  assert.ok(undo(editor));
  assert.equal(editor.body, 'sea!');
  assert.ok(undo(editor));
  assert.equal(editor.body, 'sea');
});

test('matches refresh after edits, undo, and display reconfiguration without using annotation text', () => {
  const editor = draft('🌙 sea\n\nsea');
  editor.search('sea');
  const matches = editor.state.field(editorSearch).matches;
  editor.dispatch({ effects: editor.display.reconfigure(EditorView.lineWrapping) });
  assert.deepEqual(editor.state.field(editorSearch).matches, matches);
  editor.dispatch({ changes: { from: 3, to: 6, insert: 'wind' } });
  assert.deepEqual(editor.state.field(editorSearch).matches, [{ from: 9, to: 12 }]);
  assert.ok(undo(editor));
  assert.deepEqual(editor.state.field(editorSearch).matches, matches);
  editor.search('STANZA');
  assert.equal(editor.state.field(editorSearch).matches.length, 0);
});

test('a new poem editor starts without the previous poem search or selection', () => {
  const first = draft('sea sea');
  first.search('sea');
  first.navigate();
  first.navigate();
  const second = draft('s');
  assert.equal(second.state.field(editorSearch).options, null);
  assert.deepEqual(second.state.field(editorSearch).matches, []);
  assert.equal(replaceEditorSearchMatch(second.state, 'shore'), undefined);
  assert.equal(second.body, 's');
  assert.equal(first.body, 'sea sea');
});
