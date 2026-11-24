import { StateEffect, StateField } from '@codemirror/state';
import { invertedEffects } from '@codemirror/commands';
import { applySourceChanges, type SourceChange } from '../domain/forms/composition.ts';

/** Keep the original line endings alongside CodeMirror's normalized document.
 * Include that source in undo effects so undo restores even mixed CRLF/LF/CR. */
export function sourceDocument(initial: string) {
  const restore = StateEffect.define<string>();
  const field = StateField.define<string>({
    create: () => initial,
    update(value, transaction) {
      let restored: string | undefined;
      for (const effect of transaction.effects) if (effect.is(restore)) restored = effect.value;
      if (restored !== undefined) return restored;
      if (!transaction.docChanged) return value;
      const changes: SourceChange[] = [];
      transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
        changes.push({ from, to, insert: inserted.toString() }),
      );
      return applySourceChanges(value, changes);
    },
  });
  return {
    field,
    restore,
    extensions: [
      field,
      invertedEffects.of((transaction) =>
        transaction.docChanged ? [restore.of(transaction.startState.field(field))] : [],
      ),
    ],
  };
}
