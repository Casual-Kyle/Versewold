<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Project } from '../../domain/workspace';
import { collectionThemes } from '../../domain/projectThemes';
import { browsePoems, poemThemeLabels, toneKey } from '../../domain/poemPlanning';

const props = defineProps<{ project: Project }>();
const emit = defineEmits<{ open: [id: string] }>();
const tone = ref('all');
const theme = ref('all');
const grouping = ref<'manuscript' | 'tone' | 'theme'>('manuscript');
const themes = computed(() => collectionThemes(props.project));
const all = computed(() => browsePoems(props.project));
const tones = computed(() => {
  const labels = new Map<string, string>();
  for (const poem of all.value.matching) {
    if (poem.tone?.trim() && !labels.has(toneKey(poem.tone)))
      labels.set(toneKey(poem.tone), poem.tone.trim());
  }
  return [...labels].map(([key, label]) => ({ key, label }));
});
watch(themes, (values) => {
  if (theme.value.startsWith('value:') && !values.some((entry) => entry.id === theme.value.slice(6))) theme.value = 'all';
});
watch(tones, (values) => {
  if (tone.value.startsWith('value:') && !values.some((entry) => entry.key === tone.value.slice(6))) tone.value = 'all';
});
const results = computed(() => browsePoems(props.project, {
  tone: tone.value === 'all' ? undefined : tone.value === 'none' ? null : tone.value.slice(6),
  themeId: theme.value === 'all' ? undefined : theme.value === 'none' ? null : theme.value.slice(6),
  groupBy: grouping.value,
}));
function clear() { tone.value = 'all'; theme.value = 'all'; }
</script>

<template>
  <section class="collection-card" aria-labelledby="collection-poems-heading">
    <h2 id="collection-poems-heading">Poems in this collection</h2>
    <div class="collection-poem-filters">
      <label>Tone
        <select v-model="tone">
          <option value="all">All tones</option><option value="none">Tone not set</option>
          <option v-for="entry in tones" :key="entry.key" :value="'value:' + entry.key">{{ entry.label }}</option>
        </select>
      </label>
      <label>Theme
        <select v-model="theme">
          <option value="all">All themes</option><option value="none">No themes assigned</option>
          <option v-for="entry in themes" :key="entry.id" :value="'value:' + entry.id">{{ entry.label }}</option>
        </select>
      </label>
      <label>Group by
        <select v-model="grouping">
          <option value="manuscript">Manuscript order</option><option value="tone">Tone</option><option value="theme">Theme</option>
        </select>
      </label>
    </div>
    <p class="collection-help" role="status">{{ results.matching.length }} of {{ results.total }} poems</p>
    <p v-if="grouping === 'theme'" class="collection-help">A poem with several themes appears in each matching group.</p>
    <div v-for="group in results.groups" :key="group.id" class="collection-poem-group">
      <h3 v-if="group.label">{{ group.label }} <span>({{ group.poems.length }})</span></h3>
      <button v-for="poem in group.poems" :key="poem.id" class="collection-poem-row" type="button" @click="emit('open', poem.id)">
        <strong>{{ poem.title || 'Untitled poem' }}</strong>
        <span>{{ poem.tone?.trim() || 'Tone not set' }}</span>
        <small v-if="poem.themeIds?.length">{{ poemThemeLabels(project, poem).join(' · ') }}</small>
        <small v-if="poem.planningNotes?.trim()">Planning notes</small>
      </button>
    </div>
    <p v-if="!results.total" class="collection-help">Add your first poem from the sidebar.</p>
    <template v-else-if="!results.matching.length">
      <p class="collection-help">No poems match these filters.</p>
      <button type="button" class="text-button" @click="clear">Clear filters</button>
    </template>
  </section>
</template>
