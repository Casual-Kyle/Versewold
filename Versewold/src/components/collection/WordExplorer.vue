<script lang="ts">
interface ExplorerState {
  scope: string;
  query: string;
  groupCase: boolean;
  hideIgnored: boolean;
  ignoredList: string;
  selected: string;
}

// Keep filters when opening a poem and returning to the explorer in this session.
const drafts = new Map<string, ExplorerState>();
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { Project } from '../../domain/workspace';
import { documentKey } from '../../domain/workspace';
import { isPoem, manuscriptGroups } from '../../domain/manuscript/structure';
import {
  defaultIgnoredWords,
  filterWords,
  ignoredWordKeys,
  indexWords,
  locateWord,
  wordsPerThousand,
  type WordOccurrence,
  type WordSource,
} from '../../domain/wordExplorer';

const props = defineProps<{ project: Project; documents: Record<string, string> }>();
const emit = defineEmits<{ open: [occurrence: WordOccurrence] }>();

const pageSize = 40;
const cloudSize = 24;
const projectId = props.project.id;
const draft = drafts.get(projectId);
const scope = ref(draft?.scope ?? 'project');
const query = ref(draft?.query ?? '');
const groupCase = ref(draft?.groupCase ?? true);
const hideIgnored = ref(draft?.hideIgnored ?? true);
const ignoredList = ref(draft?.ignoredList ?? defaultIgnoredWords);
const selected = ref(draft?.selected ?? '');
const wordLimit = ref(pageSize);
const passageLimit = ref(pageSize);
const comparisonLimit = ref(pageSize);
const passageHeading = ref<HTMLElement>();

const ordered = computed(() => manuscriptGroups(props.project).flatMap((group) => group.documents).filter(isPoem));
const availableParts = computed(() => {
  const used = new Set(ordered.value.map((poem) => poem.sectionId));
  return (props.project.sections ?? []).filter((part) => used.has(part.id));
});
const hasUnsectioned = computed(() => ordered.value.some((poem) => !poem.sectionId));
const scopeKeys = computed(() => new Set([
  'project',
  ...(hasUnsectioned.value ? ['unsectioned'] : []),
  ...availableParts.value.map((part) => 'part:' + part.id),
  ...ordered.value.map((poem) => 'poem:' + poem.id),
]));
watch(scopeKeys, (keys) => {
  if (keys.has(scope.value)) return;
  scope.value = 'project';
  selected.value = '';
}, { immediate: true });
const sources = computed<WordSource[]>(() => ordered.value
  .filter((poem) => {
    if (scope.value === 'project') return true;
    if (scope.value === 'unsectioned') return !poem.sectionId;
    if (scope.value.startsWith('part:')) return poem.sectionId === scope.value.slice(5);
    return poem.id === scope.value.slice(5);
  })
  .map((poem) => ({
    id: poem.id,
    title: poem.title || 'Untitled poem',
    body: props.documents[documentKey(props.project.id, poem.id)] ?? '',
  })));

const index = computed(() => indexWords(sources.value, groupCase.value));
const ignored = computed(() => hideIgnored.value ? ignoredWordKeys(ignoredList.value) : new Set<string>());
const visible = computed(() => filterWords(index.value.frequencies, query.value, ignored.value, groupCase.value));
const cloud = computed(() => visible.value.slice(0, cloudSize));
const active = computed(() => visible.value.find((entry) => entry.key === selected.value));
const matches = computed(() => {
  const word = active.value;
  if (!word) return undefined;
  return locateWord(sources.value, word.key, groupCase.value, passageLimit.value);
});
const comparisons = computed(() => {
  const found = matches.value;
  if (!found) return [];
  return sources.value.flatMap((poem) => {
    const count = found.counts.get(poem.id);
    if (!count) return [];
    const words = index.value.totals.get(poem.id) ?? 0;
    return [{ id: poem.id, title: poem.title, count, words, rate: wordsPerThousand(count, words) }];
  });
});
watch([scope, groupCase], () => {
  selected.value = '';
});
watch([scope, groupCase, query, ignored], () => {
  wordLimit.value = pageSize;
});
onBeforeUnmount(() => {
  drafts.set(projectId, {
    scope: scope.value,
    query: query.value,
    groupCase: groupCase.value,
    hideIgnored: hideIgnored.value,
    ignoredList: ignoredList.value,
    selected: selected.value,
  });
});
async function choose(key: string, event: MouseEvent) {
  if (key !== selected.value) {
    passageLimit.value = pageSize;
    comparisonLimit.value = pageSize;
    selected.value = key;
  }
  await nextTick();
  const heading = passageHeading.value;
  if (!heading) return;
  heading.scrollIntoView({ block: 'nearest' });
  // A keyboard click moves focus to the passages so Tab can reach their controls.
  if (event.detail === 0) heading.focus({ preventScroll: true });
}

const integer = new Intl.NumberFormat();
const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
function formatRate(rate: number) {
  return rate > 0 && rate < 0.01 ? '<' + decimal.format(0.01) : decimal.format(rate);
}
function cloudSizeFor(count: number) {
  const peak = cloud.value[0]?.count ?? 1;
  return 1 + Math.log(count) / Math.max(1, Math.log(peak)) * 0.85;
}
</script>

<template>
  <div class="word-explorer">
    <section class="collection-card word-controls" aria-label="Word explorer filters">
      <label>Scope
        <select v-model="scope">
          <option value="project">Whole collection</option>
          <optgroup v-if="availableParts.length || hasUnsectioned" label="Parts">
            <option v-if="hasUnsectioned" value="unsectioned">Unsectioned poems</option>
            <option v-for="part in availableParts" :key="part.id" :value="'part:' + part.id">{{ part.title }}</option>
          </optgroup>
          <optgroup v-if="ordered.length" label="Poems">
            <option v-for="poem in ordered" :key="poem.id" :value="'poem:' + poem.id">{{ poem.title || 'Untitled poem' }}</option>
          </optgroup>
        </select>
      </label>
      <label>Filter words
        <input v-model="query" type="search" />
      </label>
      <div class="word-options">
        <label><input v-model="groupCase" type="checkbox" /> Group uppercase and lowercase</label>
        <label><input v-model="hideIgnored" type="checkbox" /> Hide common words</label>
      </div>
      <details class="word-stop-list">
        <summary>Edit common-word list</summary>
        <label>Words to hide
          <textarea v-model="ignoredList" rows="3" spellcheck="false" />
        </label>
        <p class="collection-help">Separate words with commas or spaces. The list applies regardless of case.</p>
        <button type="button" class="text-button" @click="ignoredList = defaultIgnoredWords">Restore default list</button>
      </details>
      <p class="word-count-summary collection-help" role="status">
        {{ integer.format(visible.length) }} of {{ integer.format(index.frequencies.length) }} distinct words shown
        · {{ integer.format(index.total) }} words in this scope
      </p>
    </section>

    <p v-if="!index.total" class="word-results-empty">This scope has no poem text to count.</p>
    <p v-else-if="!visible.length" class="word-results-empty">No words match the current filters.</p>

    <section v-else class="word-results" aria-label="Word explorer results">
      <div class="word-ranking">
        <section class="collection-card" aria-labelledby="word-cloud-heading">
          <h2 id="word-cloud-heading">Word cloud <small>Top {{ cloud.length }}</small></h2>
          <div class="word-cloud">
            <button
              v-for="word in cloud" :key="word.key"
              type="button" :aria-pressed="selected === word.key"
              :style="{ '--word-size': cloudSizeFor(word.count) }"
              :title="integer.format(word.count) + ' occurrences'"
              @click="choose(word.key, $event)"
            >{{ word.label }}</button>
          </div>
        </section>
        <section class="collection-card" aria-labelledby="word-table-heading">
          <h2 id="word-table-heading">Word frequencies</h2>
          <div class="word-table-scroll">
            <table class="word-table">
              <thead><tr><th scope="col">Word</th><th scope="col">Count</th><th scope="col">Per 1,000 words</th></tr></thead>
              <tbody>
                <tr v-for="word in visible.slice(0, wordLimit)" :key="word.key">
                  <th scope="row"><button type="button" :aria-pressed="selected === word.key" @click="choose(word.key, $event)">{{ word.label }}</button></th>
                  <td>{{ integer.format(word.count) }}</td>
                  <td>{{ formatRate(wordsPerThousand(word.count, index.total)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button v-if="visible.length > wordLimit" class="text-button word-more" type="button" @click="wordLimit += pageSize">Show more words</button>
        </section>
      </div>

      <section class="collection-card word-passages-panel" aria-labelledby="word-passages-title">
        <h2 id="word-passages-title" ref="passageHeading" tabindex="-1">
          {{ active ? active.label : 'Word passages' }}
        </h2>
        <template v-if="active && matches">
          <p role="status" class="collection-help">
            {{ integer.format(matches.count) }} occurrences in {{ comparisons.length }} {{ comparisons.length === 1 ? 'poem' : 'poems' }}
          </p>
          <details v-if="sources.length > 1" class="word-comparison" open>
            <summary>Compare poems with matches</summary>
            <div class="word-table-scroll">
              <table class="word-table">
                <thead><tr><th scope="col">Poem</th><th scope="col">Count</th><th scope="col">Per 1,000 words</th></tr></thead>
                <tbody>
                  <tr v-for="poem in comparisons.slice(0, comparisonLimit)" :key="poem.id">
                    <th scope="row" :title="integer.format(poem.words) + ' total words'">{{ poem.title }}</th>
                    <td>{{ integer.format(poem.count) }}</td>
                    <td>{{ formatRate(poem.rate) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button v-if="comparisons.length > comparisonLimit" class="text-button word-more" type="button" @click="comparisonLimit += pageSize">Show more poems</button>
          </details>
          <ol class="word-passages">
            <li v-for="occurrence in matches.occurrences" :key="occurrence.poemId + ':' + occurrence.line + ':' + occurrence.column">
              <button type="button" @click="emit('open', occurrence)">
                <strong>{{ occurrence.poemTitle }} · Line {{ occurrence.line }}</strong>
                <span>{{ occurrence.before }}<mark>{{ occurrence.text }}</mark>{{ occurrence.after }}</span>
              </button>
            </li>
          </ol>
          <button v-if="matches.count > passageLimit" class="text-button word-more" type="button" @click="passageLimit += pageSize">Show more passages</button>
        </template>
        <p v-else class="collection-help">Choose a word to see where it appears.</p>
      </section>
    </section>

    <details class="word-method">
      <summary>How words are counted</summary>
      <p>
        Counts use poem Markdown, including words inside links and code. Titles, planning notes, and manuscript pages other than poems are excluded.
        Internal apostrophes and hyphens stay with the word. Counts group accented Unicode spellings with equivalent composed or decomposed forms.
        Straight and curly apostrophes group together, as do regular and nonbreaking hyphens.
        Rates use every word counted in the scope or poem, including hidden words.
      </p>
    </details>
  </div>
</template>
