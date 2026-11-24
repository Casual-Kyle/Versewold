<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { Annotation, Compartment, EditorState, Transaction } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap, placeholder } from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  insertNewline,
  isolateHistory,
} from '@codemirror/commands';
import { normalizeNewlines } from '../../domain/forms/composition';
import { sourceDocument } from '../../services/editorSource';
import type { PoetryForm } from '../../domain/forms/types';
import { activeDraftLine, guidedEditor, refreshGuidance } from './guidedEditor';

const props = defineProps<{
  form?: PoetryForm;
  guided: boolean;
  strict: boolean;
  spellcheck: boolean;
  softWrap: boolean;
}>();
const body = defineModel<string>({ required: true });
const emit = defineEmits<{ inspect: [sourceLine: number] }>();
const host = ref<HTMLElement>();
const display = new Compartment();
const external = Annotation.define<boolean>();
let editor: EditorView | undefined;
const source = sourceDocument(body.value);

function displayOptions() {
  return [
    ...(props.softWrap ? [EditorView.lineWrapping] : []),
    EditorView.contentAttributes.of({
      'aria-label': 'Poem text in Markdown',
      'aria-multiline': 'true',
      spellcheck: String(props.spellcheck),
      autocapitalize: 'off',
    }),
  ];
}
onMounted(() => {
  editor = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: normalizeNewlines(body.value),
      extensions: [
        history(),
        source.extensions,
        highlightActiveLine(),
        // Enter remains normal text entry: one newline continues a stanza,
        // an empty line separates stanzas. No structural action intercepts it.
        keymap.of([{ key: 'Enter', run: insertNewline }, ...defaultKeymap, ...historyKeymap]),
        placeholder('Let the first line find you…'),
        guidedEditor(
          () => props.form,
          () => props.guided,
          () => props.strict,
        ),
        display.of(displayOptions()),
        EditorView.updateListener.of((update) => {
          if (
            update.docChanged &&
            !update.transactions.some((transaction) => transaction.annotation(external))
          ) {
            body.value = update.state.field(source.field);
          }
          if (update.docChanged || update.selectionSet || update.focusChanged)
            emit('inspect', activeDraftLine(update.state));
        }),
      ],
    }),
  });
  emit('inspect', 1);
});
watch(body, (value) => {
  if (!editor || value === editor.state.field(source.field)) return;
  const normalized = normalizeNewlines(value);
  editor.dispatch({
    changes:
      editor.state.doc.toString() === normalized
        ? undefined
        : { from: 0, to: editor.state.doc.length, insert: normalized },
    effects: source.restore.of(value),
    annotations: [external.of(true), Transaction.addToHistory.of(false)],
  });
});
watch(
  () => [props.form, props.guided, props.strict, props.spellcheck, props.softWrap],
  () => {
    editor?.dispatch({ effects: [refreshGuidance.of(), display.reconfigure(displayOptions())] });
  },
);
onBeforeUnmount(() => editor?.destroy());

function replaceLine(sourceLine: number, text: string) {
  if (!editor || sourceLine < 1 || sourceLine > editor.state.doc.lines) return;
  const line = editor.state.doc.line(sourceLine);
  editor.dispatch({
    changes: { from: line.from, to: line.to, insert: text },
    selection: { anchor: line.from + text.length },
    scrollIntoView: true,
    annotations: [Transaction.userEvent.of('input.refrain'), isolateHistory.of('full')],
  });
  editor.focus();
}
function focusLine(sourceLine: number) {
  if (!editor || sourceLine < 1 || sourceLine > editor.state.doc.lines) return;
  editor.dispatch({
    selection: { anchor: editor.state.doc.line(sourceLine).from },
    scrollIntoView: true,
  });
  editor.focus();
}
defineExpose({ replaceLine, focusLine });
</script>

<template><div ref="host" class="verse-editor" :class="{ 'is-guided': guided }" /></template>
