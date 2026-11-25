<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { Project } from '../../domain/workspace';
import {
  overviewLimits,
  renameProject,
  setProjectPlanning,
} from '../../domain/projectOverview';
import { isPoem, projectWordCount } from '../../domain/manuscript/structure';
import ThemeManager from './ThemeManager.vue';
import CollectionPoems from './CollectionPoems.vue';

const props = defineProps<{
  project: Project;
  projects: Project[];
  documents: Record<string, string>;
}>();
// HTML maxlength uses UTF-16 units. Its 2x guard admits every valid Unicode
// value; the domain helpers enforce the actual character limits before saving.
const title = ref(props.project.title);
const emit = defineEmits<{ open: [id: string] }>();
const nameError = ref('');
const planningErrors = reactive({ description: '', intendedTone: '' });
const poems = computed(() => props.project.poems.filter(isPoem).length);
const words = computed(() => projectWordCount(props.project, props.documents));

function resetName() {
  title.value = props.project.title;
  nameError.value = '';
}
watch(
  () => props.project.title,
  resetName,
);
function rename() {
  nameError.value = '';
  try {
    renameProject(props.project, title.value, props.projects);
    resetName();
  } catch (cause) {
    nameError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
function planning(field: 'description' | 'intendedTone', event: Event) {
  planningErrors[field] = '';
  try {
    setProjectPlanning(props.project, field, (event.target as HTMLInputElement).value);
  } catch (cause) {
    planningErrors[field] = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <div class="collection-overview">
    <span class="eyebrow">YOUR COLLECTION</span>
    <h1>Give your collection a direction.</h1>
    <p class="collection-intro">
      Describe what connects these poems and where you want the collection to go.
    </p>
    <dl class="collection-statistics" aria-label="Collection statistics">
      <div>
        <dt>Poems</dt>
        <dd>{{ poems }}</dd>
      </div>
      <div>
        <dt>Parts</dt>
        <dd>{{ project.sections?.length ?? 0 }}</dd>
      </div>
      <div>
        <dt>Manuscript words</dt>
        <dd>{{ words.toLocaleString() }}</dd>
      </div>
    </dl>

    <section class="collection-card" aria-labelledby="collection-name-heading">
      <h2 id="collection-name-heading">Project name</h2>
      <form class="collection-rename" @submit.prevent="rename">
        <label class="sr-only" for="collection-name">Project name</label>
        <input
          id="collection-name"
          v-model="title"
          :maxlength="overviewLimits.title * 2"
          :aria-invalid="Boolean(nameError)"
          :aria-describedby="nameError ? 'collection-name-error' : undefined"
          required
          @input="nameError = ''"
          @keydown.esc.prevent="resetName"
        />
        <button class="button primary" type="submit" :disabled="title.trim() === project.title">
          Rename project
        </button>
        <button
          v-if="title !== project.title"
          class="text-button"
          type="button"
          @click="resetName"
        >
          Cancel
        </button>
      </form>
      <p v-if="nameError" id="collection-name-error" class="collection-error" role="alert">
        {{ nameError }}
      </p>
    </section>

    <section class="collection-card" aria-labelledby="collection-description-heading">
      <h2 id="collection-description-heading">Description &amp; intention</h2>
      <label class="sr-only" for="collection-description">Description and intention</label>
      <textarea
        id="collection-description"
        :value="project.description ?? ''"
        :maxlength="overviewLimits.description * 2"
        :aria-invalid="Boolean(planningErrors.description)"
        :aria-describedby="planningErrors.description ? 'collection-description-error' : undefined"
        rows="7"
        placeholder="What brings these poems together? What would you like a reader to carry away?"
        @input="planning('description', $event)"
      />
      <p
        v-if="planningErrors.description"
        id="collection-description-error"
        class="collection-error"
        role="alert"
      >
        {{ planningErrors.description }}
      </p>
      <label class="collection-label" for="collection-tone">Intended tone</label>
      <input
        id="collection-tone"
        :value="project.intendedTone ?? ''"
        :maxlength="overviewLimits.intendedTone * 2"
        :aria-invalid="Boolean(planningErrors.intendedTone)"
        :aria-describedby="planningErrors.intendedTone ? 'collection-tone-error' : undefined"
        placeholder="For example: reflective, intimate, quietly hopeful"
        @input="planning('intendedTone', $event)"
      />
      <p
        v-if="planningErrors.intendedTone"
        id="collection-tone-error"
        class="collection-error"
        role="alert"
      >
        {{ planningErrors.intendedTone }}
      </p>
    </section>

    <ThemeManager :project="project" />
    <CollectionPoems :project="project" @open="emit('open', $event)" />
  </div>
</template>
