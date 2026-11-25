<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from '../composables/useWorkspace';
import { pendingSourceJump } from '../composables/sourceJump';
import WordExplorer from '../components/collection/WordExplorer.vue';
import type { WordOccurrence } from '../domain/wordExplorer';
import AppIcon from '../components/ui/AppIcon.vue';

const { activeProject, workspace, selectPoem } = useWorkspace();
const router = useRouter();
const error = ref('');

async function openPassage(occurrence: WordOccurrence) {
  const project = activeProject.value;
  if (!project?.poems.some((poem) => poem.id === occurrence.poemId)) return;
  const jump = {
    projectId: project.id,
    poemId: occurrence.poemId,
    line: occurrence.line,
    column: occurrence.column,
    text: occurrence.text,
  };
  error.value = '';
  selectPoem(occurrence.poemId);
  pendingSourceJump.value = jump;
  try {
    const failure = await router.push({ name: 'desk' });
    if (!failure) return;
    error.value = 'Could not open this passage.';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
  if (pendingSourceJump.value === jump) pendingSourceJump.value = undefined;
}
</script>

<template>
  <section class="collection-view">
    <header class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="search" :size="16" />
        <span>Word explorer</span>
        <AppIcon v-if="activeProject" name="chevron" :size="12" />
        <strong v-if="activeProject">{{ activeProject.title }}</strong>
      </div>
      <RouterLink to="/collection" class="text-button">Collection overview</RouterLink>
    </header>
    <div class="collection-scroll">
      <p v-if="error" class="collection-error" role="alert">{{ error }}</p>
      <WordExplorer
        v-if="activeProject" :key="activeProject.id"
        :project="activeProject" :documents="workspace.documents" @open="openPassage"
      />
      <p v-else class="word-results-empty">Choose a collection to explore its words.</p>
    </div>
  </section>
</template>
