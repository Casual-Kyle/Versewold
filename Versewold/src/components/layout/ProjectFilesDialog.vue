<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from '../../composables/useWorkspace';
import { useProjectFiles } from '../../composables/useProjectFiles';
import AppIcon from '../ui/AppIcon.vue';
const { activeProject, activePoem, dataDirectory, desktop } = useWorkspace();
const { busy, message, error, savedPath, run } = useProjectFiles();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const router = useRouter();
function pdf() {
  emit('close');
  void router.push('/manuscript');
}
const previousFocus = document.activeElement as HTMLElement | null;
onMounted(() => dialog.value?.showModal());
onUnmounted(() => previousFocus?.focus());
</script>

<template>
  <dialog
    ref="dialog"
    class="project-files-dialog"
    aria-labelledby="files-title"
    :aria-busy="busy"
    @cancel.prevent="!busy && emit('close')"
    @click="$event.target === dialog && !busy && emit('close')"
  >
    <button
      class="icon-button dialog-close"
      aria-label="Close files dialog"
      :disabled="busy"
      @click="emit('close')"
    >
      <AppIcon name="close" />
    </button>
    <span class="eyebrow">YOUR WRITING, TO GO</span>
    <h2 id="files-title">Save, load &amp; export</h2>
    <p class="files-intro">
      Writing autosaves in your app data folder. Save now commits pending edits; portable copies and
      Markdown exports go wherever you choose.
    </p>
    <div class="files-save-bar">
      <button class="button primary" :disabled="busy || !desktop" @click="run('save')">
        <AppIcon name="save" :size="16" />
        Save now
        <kbd>Ctrl+S</kbd>
      </button>
      <span v-if="desktop">
        Working folder
        <code>{{ dataDirectory }}</code>
      </span>
      <span v-else>Save, load, and export are available in the desktop app.</span>
    </div>
    <div class="files-sections">
      <section aria-label="Project files">
        <h3>Project</h3>
        <p class="files-current">{{ activeProject?.title ?? 'No project selected' }}</p>
        <button class="file-action" :disabled="busy || !desktop" @click="run('load-project')">
          <AppIcon name="folder" />
          <span>
            <strong>Load project…</strong>
            <small>Choose project.json; add a new copy to your library.</small>
          </span>
        </button>
        <button
          class="file-action"
          :disabled="busy || !desktop || !activeProject"
          @click="run('save-project')"
        >
          <AppIcon name="save" />
          <span>
            <strong>Save project copy…</strong>
            <small>New folder with JSON, Markdown, and form definitions.</small>
          </span>
        </button>
        <button
          class="file-action"
          :disabled="busy || !desktop || !activeProject?.poems.length"
          @click="run('export-project')"
        >
          <AppIcon name="export" />
          <span>
            <strong>Export Markdown manuscript…</strong>
            <small>One Markdown file with titles and poems in project order.</small>
          </span>
        </button>
        <button class="file-action" :disabled="busy || !activeProject" @click="pdf">
          <AppIcon name="file" />
          <span>
            <strong>PDF · page setup &amp; preview</strong>
            <small>Paper, margins, title page, bylines, and word count.</small>
          </span>
        </button>
      </section>
      <section aria-label="Poem files">
        <h3>Poem</h3>
        <p class="files-current">{{ activePoem?.title ?? 'No poem selected' }}</p>
        <button class="file-action" :disabled="busy || !desktop" @click="run('load-poems')">
          <AppIcon name="file" />
          <span>
            <strong>Load poems…</strong>
            <small>Choose Markdown files; add them to the current project.</small>
          </span>
        </button>
        <button
          class="file-action"
          :disabled="busy || !desktop || !activePoem"
          @click="run('save-poem')"
        >
          <AppIcon name="save" />
          <span>
            <strong>Save poem copy…</strong>
            <small>New folder with exact Markdown and title/form metadata.</small>
          </span>
        </button>
        <button
          class="file-action"
          :disabled="busy || !desktop || !activePoem"
          @click="run('export-poem')"
        >
          <AppIcon name="export" />
          <span>
            <strong>Export poem…</strong>
            <small>A single Markdown file containing your exact text.</small>
          </span>
        </button>
      </section>
    </div>
    <p class="files-footnote">
      Copy folders keep their files together. Plain Markdown loads as Free verse; saved poem copies
      restore their title and form. Loading leaves the selected source files unchanged.
    </p>
    <div
      v-if="busy || message || error"
      class="file-feedback"
      :class="{ failed: error }"
      :role="error ? 'alert' : 'status'"
      aria-live="polite"
    >
      <p>{{ busy ? 'Working…' : error || message }}</p>
      <code v-if="savedPath">{{ savedPath }}</code>
    </div>
    <footer>
      <button class="button secondary" :disabled="busy" @click="emit('close')">
        Back to writing
      </button>
    </footer>
  </dialog>
</template>
