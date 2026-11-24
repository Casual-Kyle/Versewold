<script setup lang="ts">
import { computed } from 'vue';
import { useWorkspace } from '../../composables/useWorkspace';
import { usePreferences } from '../../composables/usePreferences';
import { displayDate, documentKind } from '../../domain/manuscript/structure';
const { activeProject, activePoem, movePoem } = useWorkspace();
const { preferences } = usePreferences();
const section = computed({
  get: () => activePoem.value?.sectionId ?? '',
  set: (value: string) => {
    if (activePoem.value) {
      if (value) activePoem.value.sectionId = value;
      else delete activePoem.value.sectionId;
    }
  },
});
function date(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  if (activePoem.value) {
    if (value) activePoem.value.composedOn = value;
    else delete activePoem.value.composedOn;
  }
}
</script>

<template>
  <details v-if="activePoem && activeProject" class="document-details">
    <summary>
      Details
      <span>
        {{
          activePoem.author ||
          activeProject.authorName ||
          preferences.profile.authorName ||
          'Author, dates & project order'
        }}
      </span>
    </summary>
    <div class="document-detail-fields">
      <label>
        Author
        <input
          v-model="activePoem.author"
          maxlength="200"
          :placeholder="activeProject.authorName || preferences.profile.authorName || 'Author name'"
        />
      </label>
      <label>
        Date composed
        <input type="date" :value="activePoem.composedOn" @change="date" />
      </label>
      <label v-if="['poem', 'text'].includes(documentKind(activePoem))">
        Part
        <select v-model="section">
          <option value="">Unsectioned</option>
          <option v-for="part in activeProject.sections ?? []" :key="part.id" :value="part.id">
            {{ part.title }}
          </option>
        </select>
      </label>
      <p>
        Last revised: {{ displayDate(activePoem.updatedAt) || 'Not recorded yet' }}
        <small>
          Revision dates update automatically when you edit. Choose which date appears in
          Manuscript.
        </small>
      </p>
      <div class="document-order">
        <span>Project order</span>
        <button class="text-button" @click="movePoem(activePoem.id, -1)">Move up</button>
        <button class="text-button" @click="movePoem(activePoem.id, 1)">Move down</button>
      </div>
    </div>
  </details>
</template>
