<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from '../composables/useWorkspace';
import AppIcon from '../components/ui/AppIcon.vue';
import { collectionThemes } from '../domain/projectThemes';
import { wordsPerThousand } from '../domain/wordExplorer';
import {
  progressionCounts,
  progressionParts,
  progressionWords,
  type ProgressionCounts,
  type ProgressionWord,
} from '../domain/collectionProgression';

const { activeProject, workspace, selectPoem } = useWorkspace();
const router = useRouter();
const display = ref<'timeline' | 'table'>('timeline');
const metric = ref<'rate' | 'count'>('rate');
const selectedTheme = ref('');
const firstWord = ref('');
const secondWord = ref('');
const tracks = ref<ProgressionWord[]>([]);
const error = ref('');
const parts = computed(() => activeProject.value ? progressionParts(activeProject.value) : []);
const poems = computed(() => parts.value.flatMap((part) => part.poems));
const themes = computed(() => activeProject.value ? collectionThemes(activeProject.value) : []);
const selectedThemeLabel = computed(() => themes.value.find((theme) => theme.id === selectedTheme.value)?.label);
const assigned = computed(() => poems.value.filter((poem) => poem.themes.some((theme) => theme.id === selectedTheme.value)).length);
const counts = computed(() => progressionCounts(
  activeProject.value?.id ?? '',
  parts.value,
  workspace.value.documents,
  tracks.value,
));

function valueFor(stats: ProgressionCounts | undefined, index: number): number {
  const count = stats?.counts[index] ?? 0;
  return metric.value === 'count' ? count : wordsPerThousand(count, stats?.total ?? 0);
}

const maximum = computed(() => {
  let peak = 0;
  for (const stats of counts.value.poemCounts.values())
    stats.counts.forEach((_, index) => { peak = Math.max(peak, valueFor(stats, index)); });
  return peak;
});

const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
function formattedValue(stats: ProgressionCounts | undefined, index: number): string {
  if (!stats || (metric.value === 'rate' && !stats.total)) return '—';
  const value = valueFor(stats, index);
  return value > 0 && value < 0.01 ? '<' + decimal.format(0.01) : decimal.format(value);
}

function barWidth(poemId: string, index: number): string {
  const score = valueFor(counts.value.poemCounts.get(poemId), index);
  return (maximum.value ? 100 * score / maximum.value : 0) + '%';
}

function applyWords() {
  error.value = '';
  try {
    tracks.value = progressionWords([firstWord.value, secondWord.value]);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function clearWords() {
  firstWord.value = '';
  secondWord.value = '';
  tracks.value = [];
  error.value = '';
}

watch(() => activeProject.value?.id, () => {
  selectedTheme.value = '';
  clearWords();
});

function openPoem(id: string) {
  selectPoem(id);
  void router.push({ name: 'desk' });
}
</script>

<template>
  <section class="collection-view">
    <header class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="folder" :size="16" />
        <span>Collection progression</span>
        <AppIcon v-if="activeProject" name="chevron" :size="12" />
        <strong v-if="activeProject">{{ activeProject.title }}</strong>
      </div>
      <RouterLink to="/collection" class="text-button">Collection overview</RouterLink>
    </header>

    <div class="collection-scroll">
      <div v-if="poems.length" class="progression">
        <section class="collection-card progression-options" aria-label="Progression controls">
          <div class="progression-controls">
            <div class="editor-mode" role="group" aria-label="Display">
              <button type="button" :aria-pressed="display === 'timeline'" @click="display = 'timeline'">Timeline</button>
              <button type="button" :aria-pressed="display === 'table'" @click="display = 'table'">Table</button>
            </div>
            <label v-if="themes.length">Highlight a theme
              <select v-model="selectedTheme">
                <option value="">All themes</option>
                <option v-for="theme in themes" :key="theme.id" :value="theme.id">{{ theme.label }}</option>
              </select>
            </label>
          </div>

          <p v-if="selectedThemeLabel" class="collection-help" role="status">
            {{ selectedThemeLabel }} is assigned to {{ assigned }} of {{ poems.length }} poems.
          </p>
          <form class="progression-words" aria-label="Track words" @submit.prevent="applyWords">
            <label>Track a word
              <input v-model="firstWord" type="text" maxlength="120" @input="error = ''" />
            </label>
            <label>Compare with (optional)
              <input v-model="secondWord" type="text" maxlength="120" @input="error = ''" />
            </label>
            <label>Word comparison metric
              <select v-model="metric">
                <option value="rate">Per 1,000 words</option>
                <option value="count">Occurrences</option>
              </select>
            </label>
            <div class="progression-actions">
              <button class="button primary" type="submit">Apply</button>
              <button v-if="tracks.length || firstWord || secondWord" class="text-button" type="button" @click="clearWords">
                Clear words
              </button>
            </div>
            <p v-if="error" class="collection-error" role="alert">{{ error }}</p>
          </form>
          <p class="collection-help progression-method">
            Themes reflect your assignments. Word counts use exact words in the Markdown body with case grouped.
            <template v-if="tracks.length && metric === 'rate'"> A dash means there are no words to calculate a rate.</template>
          </p>
        </section>

        <div v-if="display === 'timeline'" aria-label="Poems in manuscript order">
          <section v-for="part in parts" :key="part.id" class="progression-part">
            <h2>{{ part.title }}</h2>
            <p v-if="tracks.length" class="progression-part-total">
              <strong>Part {{ metric === 'rate' ? 'per 1,000 words' : 'occurrences' }}</strong>
              <span v-for="(word, index) in tracks" :key="word.key">
                {{ word.label }} · {{ formattedValue(counts.partCounts.get(part.id), index) }}
              </span>
            </p>
            <ol class="progression-timeline" :start="part.poems[0].position">
              <li v-for="poem in part.poems" :key="poem.id" class="progression-poem">
                <button class="progression-open" type="button" @click="openPoem(poem.id)">
                  {{ poem.title }}
                </button>
                <div class="progression-poem-labels">
                  <span>{{ poem.tone ?? 'Tone not set' }}</span>
                  <span v-if="poem.intensity !== undefined" class="progression-intensity">
                    <meter min="0" max="5" :value="poem.intensity" aria-label="Tone intensity"></meter>
                    {{ poem.intensity }}/5
                  </span>
                  <ul v-if="poem.themes.length" class="progression-themes" aria-label="Assigned themes">
                    <li v-for="theme in poem.themes" :key="theme.id" :class="{ highlighted: theme.id === selectedTheme }">
                      {{ theme.label }}
                    </li>
                  </ul>
                </div>
                <ul v-if="tracks.length" class="progression-bars"
                  :aria-label="metric === 'rate' ? 'Words per 1,000 words' : 'Word occurrences'"
                >
                  <li v-for="(word, index) in tracks" :key="word.key" :class="{ second: index === 1 }">
                    <span>{{ word.label }}</span>
                    <span class="progression-bar" aria-hidden="true">
                      <span :style="{ width: barWidth(poem.id, index) }"></span>
                    </span>
                    <span>{{ formattedValue(counts.poemCounts.get(poem.id), index) }}</span>
                  </li>
                </ul>
              </li>
            </ol>
          </section>
        </div>

        <div v-else class="collection-card progression-table-scroll">
          <table class="progression-table">
            <caption class="sr-only">Poems in manuscript order</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Poem</th>
                <th scope="col">Tone</th>
                <th scope="col">Intensity</th>
                <th scope="col">Assigned themes</th>
                <th v-for="word in tracks" :key="word.key" scope="col">
                  {{ word.label }}
                  <small>{{ metric === 'rate' ? 'Per 1,000 words' : 'Occurrences' }}</small>
                </th>
              </tr>
            </thead>
            <tbody v-for="part in parts" :key="part.id">
              <tr class="progression-table-part">
                <th scope="rowgroup" colspan="5">{{ part.title }}</th>
                <td v-for="(word, index) in tracks" :key="word.key">
                  {{ formattedValue(counts.partCounts.get(part.id), index) }}
                </td>
              </tr>
              <tr v-for="poem in part.poems" :key="poem.id">
                <td>{{ poem.position }}</td>
                <th scope="row">
                  <button class="progression-open" type="button" @click="openPoem(poem.id)">{{ poem.title }}</button>
                </th>
                <td>{{ poem.tone ?? '—' }}</td>
                <td>{{ poem.intensity === undefined ? '—' : poem.intensity + '/5' }}</td>
                <td>
                  <ul v-if="poem.themes.length" class="progression-themes" aria-label="Assigned themes">
                    <li v-for="theme in poem.themes" :key="theme.id" :class="{ highlighted: theme.id === selectedTheme }">
                      {{ theme.label }}
                    </li>
                  </ul>
                  <span v-else>—</span>
                </td>
                <td v-for="(word, index) in tracks" :key="word.key">
                  {{ formattedValue(counts.poemCounts.get(poem.id), index) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p v-else class="collection-help">
        {{ activeProject ? 'Add a poem to see how the collection develops.' : 'Choose a collection in the sidebar.' }}
      </p>
    </div>
  </section>
</template>
