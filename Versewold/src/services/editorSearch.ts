import { StateEffect, StateField, Transaction, type TransactionSpec } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { isolateHistory } from '@codemirror/commands';
import type { EditorState } from '@codemirror/state';
import {
  findSearchMatches,
  nextSearchMatch,
  selectedSearchMatch,
  type SearchMatch,
  type SearchOptions,
} from '../domain/editor/search.ts';
import { normalizeNewlines } from '../domain/forms/composition.ts';

export const setEditorSearch = StateEffect.define<SearchOptions | null>();
interface EditorSearchState {
  options: SearchOptions | null;
  matches: SearchMatch[];
  decorations: DecorationSet;
}

/** Search state and highlights never enter the Markdown or its undo history. */
export const editorSearch = StateField.define<EditorSearchState>({
  create: () => ({ options: null, matches: [], decorations: Decoration.none }),
  update(value, transaction) {
    let options = value.options;
    for (const effect of transaction.effects)
      if (effect.is(setEditorSearch)) options = effect.value;
    const changed = options !== value.options || transaction.docChanged;
    if (!changed && !transaction.selection) return value;
    const matches = changed
      ? options
        ? findSearchMatches(transaction.newDoc.toString(), options)
        : []
      : value.matches;
    const selected = selectedSearchMatch(matches, transaction.newSelection.main);
    return {
      options,
      matches,
      decorations: Decoration.set(
        matches.map((match, index) =>
          Decoration.mark({
            class: `cm-poem-search-match${index === selected ? ' cm-poem-search-current' : ''}`,
          }).range(match.from, match.to),
        ),
      ),
    };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export function navigateEditorSearch(
  state: EditorState,
  direction: -1 | 1,
  keepCurrent = false,
): TransactionSpec | undefined {
  const match = nextSearchMatch(
    state.field(editorSearch).matches,
    state.selection.main,
    direction,
    keepCurrent,
  );
  if (!match) return;
  return {
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true,
    annotations: Transaction.addToHistory.of(false),
  };
}

const replacementAnnotations = () => [
  Transaction.userEvent.of('input.replace'),
  isolateHistory.of('full'),
];

export function replaceEditorSearchMatch(
  state: EditorState,
  replacement: string,
): TransactionSpec | undefined {
  const matches = state.field(editorSearch).matches;
  const match = matches[selectedSearchMatch(matches, state.selection.main)];
  const insert = normalizeNewlines(replacement);
  if (!match || state.sliceDoc(match.from, match.to) === insert) return;
  return {
    changes: { ...match, insert },
    selection: { anchor: match.from + insert.length },
    scrollIntoView: true,
    annotations: replacementAnnotations(),
  };
}

export function replaceAllEditorSearchMatches(
  state: EditorState,
  replacement: string,
): TransactionSpec | undefined {
  const insert = normalizeNewlines(replacement);
  const changes = state
    .field(editorSearch)
    .matches.filter((match) => state.sliceDoc(match.from, match.to) !== insert)
    .map((match) => ({ ...match, insert }));
  if (!changes.length) return;
  return { changes, annotations: replacementAnnotations(), scrollIntoView: true };
}
