<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useWorkspace } from './composables/useWorkspace';
import AppIcon from './components/ui/AppIcon.vue';
import ProjectSidebar from './components/layout/ProjectSidebar.vue';
import { usePreferences } from './composables/usePreferences';
import { useAppearance } from './composables/useAppearance';
import { useProjectFiles } from './composables/useProjectFiles';
import { pdfPrinting } from './services/pdfExport';
const files = useProjectFiles();

const { initialize, ready, desktop, error, saveState, flush } = useWorkspace();
const personal = usePreferences();
useAppearance();
const visibleError = computed(() => error.value || personal.error.value);
const combinedSaveState = computed(() => {
  const values = [saveState.value, personal.saveState.value];
  return values.includes('error')
    ? 'error'
    : values.includes('saving')
      ? 'saving'
      : values.includes('pending')
        ? 'pending'
        : 'saved';
});
const labels = {
  saved: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Could not save',
};
function saveShortcut(event: KeyboardEvent) {
  if (pdfPrinting.value && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    return;
  }
  if (
    (event.ctrlKey || event.metaKey) &&
    (event.key.toLowerCase() === 'o' || (event.shiftKey && event.key.toLowerCase() === 's'))
  ) {
    event.preventDefault();
    if (ready.value) files.opened.value = true;
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    void flush().catch(() => {});
  }
}
onMounted(() => {
  void initialize();
  globalThis.addEventListener('keydown', saveShortcut);
});
onUnmounted(() => globalThis.removeEventListener('keydown', saveShortcut));
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="app-header">
      <RouterLink to="/" class="brand">
        <img src="/versewold.svg" alt="" width="43" height="43" />
        <span>
          Versewold
          <small>THE CRAFT OF VERSE</small>
        </span>
      </RouterLink>
      <nav class="primary-nav" aria-label="Main navigation">
        <RouterLink to="/" exact-active-class="active">
          <AppIcon name="pen" :size="16" />
          Writing desk
        </RouterLink>
        <RouterLink to="/forms" active-class="active">
          <AppIcon name="book" :size="17" />
          Form library
        </RouterLink>
        <RouterLink to="/manuscript" active-class="active">
          <AppIcon name="file" :size="17" />
          Manuscript
        </RouterLink>
      </nav>
      <span class="save-status" role="status" aria-live="polite">
        <span class="status-dot" :class="combinedSaveState" />
        {{ desktop ? labels[combinedSaveState] : 'Browser preview · temporary' }}
      </span>
    </header>
    <div v-if="visibleError" class="error-banner" role="alert">
      <span>{{ visibleError }}</span>
      <button v-if="ready" class="text-button" @click="flush().catch(() => {})">Retry save</button>
    </div>
    <div v-if="ready" class="app-body">
      <ProjectSidebar />
      <main id="main-content" class="main-content"><RouterView /></main>
    </div>
    <div v-else class="loading-state">
      <img src="/versewold.svg" alt="" width="64" height="64" />
      <p>{{ error ? 'Your writing has been left untouched.' : 'Opening your study…' }}</p>
    </div>
  </div>
</template>
