<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useWorkspace } from '../../composables/useWorkspace';
import { manuscriptGroups, documentKind } from '../../domain/manuscript/structure';
import AppIcon from '../ui/AppIcon.vue';
const { activeProject, activePoem, forms, createSection, moveSection, frontMatter } =
  useWorkspace();
const emit = defineEmits<{ open: [id: string] }>();
const groups = computed(() => (activeProject.value ? manuscriptGroups(activeProject.value) : []));
const adding = ref(false),
  partTitle = ref(''),
  partInput = ref<HTMLInputElement>(),
  editing = ref('');
async function newPart() {
  adding.value = true;
  await nextTick();
  partInput.value?.focus();
}
function addPart() {
  if (!partTitle.value.trim()) return;
  createSection(partTitle.value);
  partTitle.value = '';
  adding.value = false;
}
function rename(id: string, event: Event) {
  const section = activeProject.value?.sections?.find((section) => section.id === id);
  const input = event.target as HTMLInputElement;
  if (section && input.value.trim()) section.title = input.value.trim();
  else if (section) input.value = section.title;
  editing.value = '';
}
function removePart(id: string) {
  const project = activeProject.value;
  if (!project) return;
  for (const poem of project.poems) if (poem.sectionId === id) delete poem.sectionId;
  project.sections = project.sections?.filter((section) => section.id !== id);
  editing.value = '';
}
</script>

<template>
  <nav class="poem-list project-outline" aria-label="Project structure">
    <RouterLink v-if="activeProject" class="outline-title-page" to="/manuscript">
      <AppIcon name="file" :size="15" />
      Title page &amp; PDF setup
    </RouterLink>
    <template v-for="group in groups" :key="group.id">
      <div v-if="group.title" class="outline-part">
        <div class="outline-part-heading">
          <AppIcon name="folder" :size="14" />
          <strong>{{ group.title }}</strong>
          <button
            class="icon-button"
            :aria-label="`Edit ${group.title}`"
            @click="editing = editing === group.id ? '' : group.id"
          >
            <AppIcon name="settings" :size="13" />
          </button>
        </div>
        <div v-if="editing === group.id" class="part-editor">
          <label :for="`part-${group.id}`" class="sr-only">Part title</label>
          <input
            :id="`part-${group.id}`"
            :value="group.title"
            maxlength="300"
            @change="rename(group.id, $event)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <div>
            <button class="text-button" @click="moveSection(group.id, -1)">Move up</button>
            <button class="text-button" @click="moveSection(group.id, 1)">Move down</button>
          </div>
          <button class="text-button" @click="removePart(group.id)">
            Remove part · keep writing
          </button>
        </div>
      </div>
      <button
        v-for="poem in group.documents"
        :key="poem.id"
        class="poem-link"
        :class="{ selected: activePoem?.id === poem.id, 'in-part': !!group.title }"
        :aria-current="activePoem?.id === poem.id ? 'page' : undefined"
        @click="emit('open', poem.id)"
      >
        <AppIcon name="file" :size="16" />
        <span>
          <strong>{{ poem.title || 'Untitled poem' }}</strong>
          <small>
            {{
              documentKind(poem) === 'poem'
                ? (forms.find((form) => form.id === poem.formId)?.name ?? 'Custom form unavailable')
                : documentKind(poem) === 'about'
                  ? 'Author page'
                  : documentKind(poem) === 'dedication'
                    ? 'Front matter'
                    : 'Text page'
            }}
          </small>
        </span>
      </button>
      <p v-if="group.title && !group.documents.length" class="empty-part">
        Assign writing here in its Details.
      </p>
    </template>
    <p v-if="!activeProject?.poems.length" class="sidebar-empty">
      {{ activeProject ? 'Add your first poem below.' : 'Create a project to start writing.' }}
    </p>
    <div v-if="activeProject" class="outline-tools">
      <form v-if="adding" @submit.prevent="addPart">
        <label class="sr-only" for="new-part-title">New part title</label>
        <input
          id="new-part-title"
          ref="partInput"
          v-model="partTitle"
          maxlength="300"
          placeholder="Part I — Autumn"
          @keydown.esc="adding = false"
        />
        <div>
          <button class="text-button" type="submit" :disabled="!partTitle.trim()">Add part</button>
          <button class="text-button" type="button" @click="adding = false">Cancel</button>
        </div>
      </form>
      <button v-else class="text-button" @click="newPart">
        <AppIcon name="folder" :size="14" />
        New part
      </button>
      <details class="add-matter">
        <summary>Front &amp; back matter</summary>
        <button
          class="text-button"
          @click="
            frontMatter('dedication');
            activePoem && emit('open', activePoem.id);
          "
        >
          Dedication
        </button>
        <button
          class="text-button"
          @click="
            frontMatter('about');
            activePoem && emit('open', activePoem.id);
          "
        >
          About the Author
        </button>
      </details>
    </div>
  </nav>
</template>
