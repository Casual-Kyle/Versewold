<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { Project } from '../../domain/workspace';
import {
  addCollectionTheme, collectionThemes, renameCollectionTheme,
  removeCollectionTheme, themeLimits, themeUseCount,
} from '../../domain/projectThemes';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{ project: Project }>();
const themes = computed(() => collectionThemes(props.project));
const draft = ref('');
const editing = ref('');
const renamed = ref('');
const editInputs = new Map<string, HTMLInputElement>();
const addError = ref('');
const editError = ref('');
const removeError = ref('');
function setEditInput(id: string, element: unknown) {
  if (element instanceof HTMLInputElement) editInputs.set(id, element);
  else editInputs.delete(id);
}
async function beginRename(id: string, label: string) {
  editing.value = id;
  renamed.value = label;
  editError.value = '';
  await nextTick();
  editInputs.get(id)?.focus();
  editInputs.get(id)?.select();
}
function rename() {
  editError.value = '';
  try {
    renameCollectionTheme(props.project, editing.value, renamed.value);
    editing.value = '';
  } catch (cause) {
    editError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
function add() {
  addError.value = '';
  try {
    if (!addCollectionTheme(props.project, draft.value)) {
      addError.value = 'That theme is already listed.';
      return;
    }
    draft.value = '';
  } catch (cause) {
    addError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
function remove(id: string) {
  removeError.value = '';
  try { removeCollectionTheme(props.project, id); }
  catch (cause) { removeError.value = cause instanceof Error ? cause.message : String(cause); }
}
</script>

<template>
  <section class="collection-card" aria-labelledby="collection-themes-heading">
    <h2 id="collection-themes-heading">Collection themes</h2>
    <p class="collection-help">
      Reuse these themes in each poem's Planning panel. Renaming a theme keeps its assignments.
    </p>
    <ul v-if="themes.length" class="theme-manager-list" aria-label="Collection themes">
      <li v-for="theme in themes" :key="theme.id">
        <form v-if="editing === theme.id" class="theme-rename" @submit.prevent="rename">
          <label class="sr-only" for="rename-theme">Rename theme</label>
          <input
            id="rename-theme" :ref="(element) => setEditInput(theme.id, element)" v-model="renamed" :maxlength="themeLimits.label * 2"
            :aria-invalid="Boolean(editError)" :aria-describedby="editError ? 'theme-edit-error' : undefined"
            required @keydown.esc.prevent="editing = ''"
          />
          <button class="text-button" type="submit">Apply</button>
          <button class="text-button" type="button" @click="editing = ''">Cancel</button>
          <p v-if="editError" id="theme-edit-error" class="collection-error" role="alert">{{ editError }}</p>
        </form>
        <template v-else>
          <span class="theme-name">{{ theme.label }}</span>
          <small>{{ themeUseCount(project, theme.id) }} {{ themeUseCount(project, theme.id) === 1 ? 'document' : 'documents' }}</small>
          <button class="text-button" type="button" :aria-label="`Rename theme ${theme.label}`" @click="beginRename(theme.id, theme.label)">Rename</button>
          <button
            class="icon-button" type="button" :aria-label="`Remove theme ${theme.label}`"
            :disabled="themeUseCount(project, theme.id) > 0"
            :title="themeUseCount(project, theme.id) ? 'Unassign this theme from its documents before removing it.' : 'Remove unused theme'"
            @click="remove(theme.id)"
          ><AppIcon name="close" :size="13" /></button>
        </template>
      </li>
    </ul>
    <p v-if="themes.some((theme) => themeUseCount(project, theme.id) > 0)" class="collection-help">
      Unassign a theme from its documents before removing it.
    </p>
    <p v-if="removeError" class="collection-error" role="alert">{{ removeError }}</p>
    <form class="collection-theme-add" @submit.prevent="add">
      <label class="sr-only" for="collection-theme">Add a theme</label>
      <input
        id="collection-theme" v-model="draft" :maxlength="themeLimits.label * 2"
        placeholder="For example: belonging" :disabled="themes.length >= themeLimits.count"
        :aria-invalid="Boolean(addError)" :aria-describedby="addError ? 'theme-add-error' : undefined"
        @input="addError = ''"
      />
      <button class="text-button" type="submit" :disabled="!draft.trim() || themes.length >= themeLimits.count">
        <AppIcon name="plus" :size="15" /> Add theme
      </button>
    </form>
    <p v-if="themes.length >= themeLimits.count" class="collection-help">All 50 theme spaces are in use.</p>
    <p v-if="addError" id="theme-add-error" class="collection-error" role="alert">{{ addError }}</p>
  </section>
</template>
