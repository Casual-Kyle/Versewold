<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
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
import FindReplace from './FindReplace.vue';
import { selectedSearchMatch } from '../../domain/editor/search';
import {
  editorSearch,
  setEditorSearch,
  navigateEditorSearch,
  replaceEditorSearchMatch,
  replaceAllEditorSearchMatches,
} from '../../services/editorSearch';

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
const searching = ref(false);
const query = ref('');
const replacement = ref('');
const matchCase = ref(false);
const wholeWord = ref(false);
const matchCount = ref(0);
const currentMatch = ref(-1);
const announcement = ref('');
const searchPanel = ref<InstanceType<typeof FindReplace>>();

function searchStatus(state: EditorState) {
  const { matches } = state.field(editorSearch);
  matchCount.value = matches.length;
  currentMatch.value = selectedSearchMatch(matches, state.selection.main);
}
function navigateSearch(direction: -1 | 1, keepCurrent = false) {
  if (!editor || !searching.value) return;
  const transaction = navigateEditorSearch(editor.state, direction, keepCurrent);
  if (transaction) editor.dispatch(transaction);
}
function refreshSearch() {
  if (!editor) return;
  announcement.value = '';
  editor.dispatch({
    effects: setEditorSearch.of(
      searching.value
        ? { query: query.value, matchCase: matchCase.value, wholeWord: wholeWord.value }
        : null,
    ),
    annotations: Transaction.addToHistory.of(false),
  });
  navigateSearch(1, true);
}
async function openSearch(replace = false) {
  if (!editor) return;
  if (!searching.value) {
    const selection = editor.state.selection.main;
    const selected = editor.state.sliceDoc(selection.from, selection.to);
    if (selected && !selected.includes('\n')) query.value = selected;
    searching.value = true;
  }
  await nextTick();
  searchPanel.value?.focus(replace);
}
function closeSearch() {
  searching.value = false;
  editor?.focus();
}
function findNext(direction: -1 | 1) {
  if (!searching.value) void openSearch();
  else navigateSearch(direction);
}
function replaceMatch() {
  if (!editor) return;
  const transaction = replaceEditorSearchMatch(editor.state, replacement.value);
  if (transaction) editor.dispatch(transaction);
  navigateSearch(1);
  announcement.value = transaction ? 'Replaced one match.' : 'No text changed.';
}
function replaceAll() {
  if (!editor) return;
  const transaction = replaceAllEditorSearchMatches(editor.state, replacement.value);
  if (transaction) editor.dispatch(transaction);
  announcement.value = transaction ? 'Replaced all matching text.' : 'No text changed.';
}
watch([searching, query, matchCase, wholeWord], refreshSearch, { flush: 'sync' });
watch(replacement, () => (announcement.value = ''));

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
        editorSearch,
        highlightActiveLine(),
        // Enter remains normal text entry: one newline continues a stanza,
        // an empty line separates stanzas. No structural action intercepts it.
        keymap.of([
          {
            key: 'Escape',
            run: () => {
              if (!searching.value) return false;
              closeSearch();
              return true;
            },
          },
          { key: 'Enter', run: insertNewline },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        placeholder('Let the first line find you…'),
        guidedEditor(
          () => props.form,
          () => props.guided,
          () => props.strict,
        ),
        display.of(displayOptions()),
        EditorView.updateListener.of((update) => {
          searchStatus(update.state);
          if (update.docChanged) announcement.value = '';
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
function focusPassage(sourceLine: number, column: number, text: string) {
  if (!editor || sourceLine < 1 || sourceLine > editor.state.doc.lines) return;
  const line = editor.state.doc.line(sourceLine);
  if (column < 0 || !line.text.startsWith(text, column)) {
    focusLine(sourceLine);
    return;
  }
  const anchor = line.from + column;
  editor.dispatch({
    selection: { anchor, head: anchor + text.length },
    scrollIntoView: true,
    annotations: Transaction.addToHistory.of(false),
  });
  editor.focus();
}
defineExpose({ replaceLine, focusLine, focusPassage, openSearch, findNext });
</script>

<template>
  <FindReplace
    v-if="searching"
    ref="searchPanel"
    v-model:query="query"
    v-model:replacement="replacement"
    v-model:match-case="matchCase"
    v-model:whole-word="wholeWord"
    :count="matchCount"
    :current="currentMatch"
    :announcement="announcement"
    @navigate="navigateSearch"
    @replace="replaceMatch"
    @replace-all="replaceAll"
    @close="closeSearch"
  />
  <div ref="host" class="verse-editor" :class="{ 'is-guided': guided }" />
</template>
