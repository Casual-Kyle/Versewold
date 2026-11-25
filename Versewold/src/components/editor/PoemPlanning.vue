<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { PoemEntry, Project } from '../../domain/workspace';
import { collectionThemes } from '../../domain/projectThemes';
import {
  poemPlanningLimits,
  setPoemIntensity,
  setPoemPlanning,
  setPoemThemes,
  toneIntensityLevels,
} from '../../domain/poemPlanning';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{ project: Project; poem: PoemEntry }>();
const themes = computed(() => collectionThemes(props.project));
const errors = reactive({ tone: '', planningNotes: '', intensity: '' });
const themeError = ref('');
function text(field: 'tone' | 'planningNotes', event: Event) {
  errors[field] = '';
  try { setPoemPlanning(props.project, props.poem, field, (event.target as HTMLInputElement).value); }
  catch (cause) { errors[field] = cause instanceof Error ? cause.message : String(cause); }
}
function intensity(event: Event) {
  const input = event.target as HTMLSelectElement;
  errors.intensity = '';
  try {
    setPoemIntensity(props.project, props.poem, input.value === '' ? undefined : Number(input.value));
  } catch (cause) {
    input.value = String(props.poem.toneIntensity ?? '');
    errors.intensity = cause instanceof Error ? cause.message : String(cause);
  }
}
function toggle(id: string, event: Event) {
  themeError.value = '';
  const input = event.target as HTMLInputElement;
  const ids = new Set(props.poem.themeIds ?? []);
  if (input.checked) ids.add(id);
  else ids.delete(id);
  try { setPoemThemes(props.project, props.poem, [...ids]); }
  catch (cause) {
    input.checked = props.poem.themeIds?.includes(id) ?? false;
    themeError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <details class="poem-planning">
    <summary>
      Planning
      <span>{{ poem.tone?.trim() || 'Tone, themes & notes' }}<template v-if="poem.themeIds?.length"> · {{ poem.themeIds.length }} {{ poem.themeIds.length === 1 ? 'theme' : 'themes' }}</template></span>
      <AppIcon name="chevron" :size="13" />
    </summary>
    <div class="poem-planning-fields">
      <label for="poem-tone">Tone</label>
      <input
        id="poem-tone" :value="poem.tone ?? ''" :maxlength="poemPlanningLimits.tone * 2"
        placeholder="For example: wistful, defiant, tender" :aria-invalid="Boolean(errors.tone)"
        :aria-describedby="errors.tone ? 'poem-tone-error' : undefined" @input="text('tone', $event)"
      />
      <p v-if="errors.tone" id="poem-tone-error" class="collection-error" role="alert">{{ errors.tone }}</p>
      <label for="poem-intensity">Tone intensity (optional)</label>
      <select
        id="poem-intensity"
        :value="poem.toneIntensity ?? ''"
        :aria-invalid="Boolean(errors.intensity)"
        :aria-describedby="errors.intensity ? 'poem-intensity-error' : undefined"
        @change="intensity"
      >
        <option value="">Not rated</option>
        <option v-for="level in toneIntensityLevels" :key="level" :value="level">
          {{ level }}{{ level === 1 ? ' · Subtle' : level === 5 ? ' · Very strong' : '' }}
        </option>
      </select>
      <p v-if="errors.intensity" id="poem-intensity-error" class="collection-error" role="alert">
        {{ errors.intensity }}
      </p>
      <fieldset>
        <legend>Themes</legend>
        <div class="poem-theme-options">
          <label v-for="theme in themes" :key="theme.id">
            <input type="checkbox" :checked="poem.themeIds?.includes(theme.id) ?? false" @change="toggle(theme.id, $event)" />
            {{ theme.label }}
          </label>
        </div>
        <p v-if="!themes.length" class="collection-help">Add collection themes to start assigning them here.</p>
        <RouterLink to="/collection" class="planning-link">Manage collection themes</RouterLink>
        <p v-if="themeError" class="collection-error" role="alert">{{ themeError }}</p>
      </fieldset>
      <label for="poem-planning-notes">Planning notes</label>
      <textarea
        id="poem-planning-notes" :value="poem.planningNotes ?? ''" rows="4"
        :maxlength="poemPlanningLimits.notes * 2" placeholder="Ideas, images, or revision reminders for this poem."
        :aria-invalid="Boolean(errors.planningNotes)"
        :aria-describedby="errors.planningNotes ? 'poem-notes-error' : undefined"
        @input="text('planningNotes', $event)"
      />
      <p v-if="errors.planningNotes" id="poem-notes-error" class="collection-error" role="alert">{{ errors.planningNotes }}</p>
    </div>
  </details>
</template>
