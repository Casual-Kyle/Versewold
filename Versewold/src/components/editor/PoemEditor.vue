<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWorkspace } from '../../composables/useWorkspace';
import { poemStats } from '../../domain/forms/structure';
import { usePreferences } from '../../composables/usePreferences';
import VerseEditor from './VerseEditor.vue';
import GuidanceStatus from '../forms/GuidanceStatus.vue';
import DocumentDetails from './DocumentDetails.vue';
import PoemPlanning from './PoemPlanning.vue';
import { isPoem } from '../../domain/manuscript/structure';
const { activeProject, activePoem, activeForm, forms, body } = useWorkspace();
const { preferences } = usePreferences();
const stats = computed(() => poemStats(body.value));
const guided = ref(true);
const editor = ref<InstanceType<typeof VerseEditor>>();
const emit = defineEmits<{ inspect: [sourceLine: number] }>();
defineExpose({
  replaceLine: (sourceLine: number, text: string) => editor.value?.replaceLine(sourceLine, text),
  focusLine: (sourceLine: number) => editor.value?.focusLine(sourceLine),
  openSearch: (replace = false) => editor.value?.openSearch(replace),
  findNext: (direction: -1 | 1) => editor.value?.findNext(direction),
});
</script>

<template>
  <div v-if="activePoem" class="poem-editor">
    <div class="manuscript-kicker">
      <span class="small-rule" />
      A WORK IN PROGRESS
    </div>
    <label class="sr-only" for="poem-title">Poem title</label>
    <input
      id="poem-title"
      v-model="activePoem.title"
      class="poem-title"
      placeholder="Untitled poem"
      maxlength="160"
    />
    <DocumentDetails :key="activePoem.id" />
    <PoemPlanning
      v-if="activeProject"
      :key="`${activeProject.id}/${activePoem.id}`"
      :project="activeProject"
      :poem="activePoem"
    />
    <div class="manuscript-rule"><span>✧</span></div>
    <div v-if="isPoem(activePoem)" class="editor-mode-bar">
      <div class="editor-mode" role="group" aria-label="Writing view">
        <button :aria-pressed="guided" @click="guided = true">Guided</button>
        <button :aria-pressed="!guided" @click="guided = false">Markdown</button>
      </div>
      <span>Blank lines separate stanzas</span>
    </div>
    <GuidanceStatus
      v-if="guided && isPoem(activePoem)"
      :form="activeForm"
      :forms="forms"
      @choose="activePoem.formId = $event"
    />
    <p
      v-if="preferences.writing.strictFormatting && isPoem(activePoem)"
      class="strict-mode-note"
      role="status"
    >
      Strict · Yellow marks count or extra-line warnings. English syllables are estimates; rhyme and
      stress aren’t checked.
    </p>
    <VerseEditor
      ref="editor"
      :key="`${activeProject?.id}/${activePoem.id}`"
      v-model="body"
      :form="activeForm"
      :guided="guided && isPoem(activePoem)"
      :strict="preferences.writing.strictFormatting && isPoem(activePoem)"
      :spellcheck="preferences.writing.spellcheck"
      :soft-wrap="preferences.writing.softWrap"
      @inspect="emit('inspect', $event)"
    />
    <footer class="editor-footer">
      <span v-if="preferences.writing.showStatistics">
        {{ stats.words }} {{ stats.words === 1 ? 'word' : 'words' }}
        <i>·</i>
        {{ stats.lines }} {{ stats.lines === 1 ? 'line' : 'lines' }}
        <i>·</i>
        {{ stats.stanzas }} {{ stats.stanzas === 1 ? 'stanza' : 'stanzas' }}
      </span>
      <span>Markdown</span>
    </footer>
  </div>
</template>
