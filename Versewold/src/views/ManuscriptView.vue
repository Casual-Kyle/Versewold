<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, toRaw, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useWorkspace } from '../composables/useWorkspace';
import { usePreferences } from '../composables/usePreferences';
import { defaultManuscript, validateManuscript } from '../domain/manuscript/settings';
import { paginateManuscript } from '../domain/manuscript/paginate';
import { manuscriptMeasure } from '../services/manuscriptMeasure';
import { fileRepository } from '../services/fileRepository';
import { pdfPrinting } from '../services/pdfExport';
import PageSetup from '../components/manuscript/PageSetup.vue';
import ManuscriptPage from '../components/manuscript/ManuscriptPage.vue';
import AppIcon from '../components/ui/AppIcon.vue';

const { activeProject, workspace, desktop, flush } = useWorkspace();
const { preferences } = usePreferences();
const draft = ref(defaultManuscript());
const layout = ref<ReturnType<typeof paginateManuscript>>();
const layoutError = ref(''),
  exportError = ref(''),
  savedPath = ref(''),
  status = ref('');
const rendering = ref(false),
  zoom = ref(0.85),
  guides = ref(false);
const busyDialog = ref<HTMLDialogElement>();
let loading = false,
  revision = 0,
  timer: ReturnType<typeof setTimeout>;
watch(
  () => activeProject.value?.id,
  () => {
    loading = true;
    draft.value = validateManuscript(
      structuredClone(toRaw(activeProject.value?.manuscript ?? defaultManuscript())),
    );
    loading = false;
    savedPath.value = '';
    status.value = '';
  },
  { immediate: true, flush: 'sync' },
);
// Invalid partial numeric input is preview-only. Persist only complete settings.
watch(
  draft,
  () => {
    if (loading || !activeProject.value) return;
    try {
      validateManuscript(draft.value);
      activeProject.value.manuscript = structuredClone(toRaw(draft.value));
    } catch {
      /* validation is shown beside the preview */
    }
  },
  { deep: true, flush: 'sync' },
);
async function render() {
  const generation = ++revision;
  if (!activeProject.value) {
    layout.value = undefined;
    return;
  }
  rendering.value = true;
  try {
    const settings = structuredClone(toRaw(draft.value));
    validateManuscript(settings);
    const project = structuredClone(toRaw(activeProject.value));
    const documents = structuredClone(toRaw(workspace.value.documents));
    const measure = await manuscriptMeasure(settings.fontFamily);
    const result = paginateManuscript(
      project,
      documents,
      settings,
      preferences.value.profile.authorName,
      measure,
    );
    if (generation === revision) {
      layout.value = result;
      layoutError.value = '';
    }
  } catch (cause) {
    if (generation === revision) {
      layoutError.value = String(cause).replace(/^Error: /, '');
      layout.value = undefined;
    }
  } finally {
    if (generation === revision) rendering.value = false;
  }
}
watch(
  [
    activeProject,
    () => workspace.value.documents,
    draft,
    () => preferences.value.profile.authorName,
  ],
  () => {
    rendering.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => void render(), 80);
  },
  { deep: true, immediate: true },
);
onUnmounted(() => {
  clearTimeout(timer);
  revision++;
});
onBeforeRouteLeave(() => !pdfPrinting.value);
const canExport = computed(
  () =>
    desktop &&
    !!layout.value?.pages.length &&
    !rendering.value &&
    !layoutError.value &&
    !pdfPrinting.value,
);
const printStyle = computed(() =>
  layout.value
    ? `@page { size: ${layout.value.widthMm}mm ${layout.value.heightMm}mm; margin: 0; }`
    : '',
);
function jump(event: Event) {
  document
    .getElementById((event.target as HTMLSelectElement).value)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function exportPdf() {
  if (!canExport.value || !activeProject.value) return;
  pdfPrinting.value = true;
  exportError.value = '';
  savedPath.value = '';
  status.value = '';
  await nextTick();
  busyDialog.value?.showModal();
  try {
    await flush();
    clearTimeout(timer);
    await render();
    await nextTick();
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (layoutError.value || !layout.value?.pages.length)
      throw new Error(layoutError.value || 'There are no pages to export.');
    const result = await fileRepository.exportPdf(
      activeProject.value.title,
      structuredClone(toRaw(draft.value)),
    );
    if (result) {
      savedPath.value = result;
      status.value = 'PDF exported';
    } else status.value = 'Export canceled';
  } catch (cause) {
    exportError.value = String(cause).replace(/^Error: /, '');
  } finally {
    busyDialog.value?.close();
    pdfPrinting.value = false;
  }
}
</script>

<template>
  <section class="manuscript-view">
    <header class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="book" :size="16" />
        <strong>{{ activeProject?.title ?? 'Manuscript' }}</strong>
        <span>/ Page setup</span>
      </div>
      <button class="button primary" :disabled="!canExport" @click="exportPdf">
        <AppIcon name="export" :size="16" />
        Export PDF…
      </button>
    </header>
    <div v-if="activeProject" class="manuscript-workspace">
      <aside class="manuscript-controls" aria-label="Manuscript settings">
        <div class="setup-intro">
          <span class="eyebrow">PREPARE YOUR COLLECTION</span>
          <h1>On the page.</h1>
          <p>Arrange your writing in the library. Shape the printed manuscript here.</p>
        </div>
        <label class="setup-author">
          Project author
          <input
            v-model="activeProject.authorName"
            maxlength="200"
            :placeholder="preferences.profile.authorName || 'Set your author name'"
          />
          <small>
            Overrides the author in
            <RouterLink to="/settings">Preferences</RouterLink>
            .
          </small>
        </label>
        <PageSetup v-model="draft" />
        <button class="text-button reset-layout" @click="draft = defaultManuscript()">
          Reset page setup
        </button>
        <p class="setup-footnote">
          Layout autosaves with this project. PDFs contain clean text, without form guidance.
          Markdown formatting characters print as written.
        </p>
      </aside>
      <div class="manuscript-preview">
        <div class="preview-toolbar">
          <span role="status">
            {{
              rendering
                ? 'Updating preview…'
                : `${layout?.pages.length ?? 0} pages · ${(layout?.wordCount ?? 0).toLocaleString()} words`
            }}
          </span>
          <label class="sr-only" for="preview-page">Jump to page</label>
          <select v-if="layout" id="preview-page" @change="jump">
            <option v-for="(page, i) in layout.pages" :key="page.id" :value="page.id">
              {{ i + 1 }} · {{ page.label }}
            </option>
          </select>
          <label class="preview-guides">
            <input v-model="guides" type="checkbox" />
            Margins
          </label>
          <label class="sr-only" for="preview-zoom">Preview zoom</label>
          <select id="preview-zoom" v-model.number="zoom">
            <option :value="0.5">50%</option>
            <option :value="0.65">65%</option>
            <option :value="0.85">85%</option>
            <option :value="1">100%</option>
            <option :value="1.25">125%</option>
          </select>
        </div>
        <p v-if="!desktop" class="preview-notice">
          PDF saving is available in the Windows desktop app. This preview is temporary.
        </p>
        <p v-if="layoutError || exportError" class="preview-notice failed" role="alert">
          {{ layoutError || exportError }}
        </p>
        <p v-if="status" class="preview-notice" role="status">
          {{ status }}
          <code v-if="savedPath">{{ savedPath }}</code>
        </p>
        <div class="preview-scroll">
          <div v-if="layout" class="manuscript-pages">
            <component :is="'style'">{{ printStyle }}</component>
            <ManuscriptPage
              v-for="(page, i) in layout.pages"
              :id="page.id"
              :key="page.id"
              :page="page"
              :index="i"
              :settings="draft"
              :width="layout.width"
              :height="layout.height"
              :zoom="zoom"
              :guides="guides"
            />
            <p v-if="!layout.pages.length" class="preview-notice">
              Add writing or enable a title page to begin.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <h1>A manuscript starts with a project.</h1>
      <p>Create or load a project from your library.</p>
    </div>
    <dialog
      ref="busyDialog"
      class="pdf-busy-dialog"
      aria-labelledby="pdf-busy-title"
      @cancel.prevent
    >
      <h2 id="pdf-busy-title">Preparing your PDF…</h2>
      <p>Choose a destination in the Save dialog. Keep Versewold open until the export finishes.</p>
    </dialog>
  </section>
</template>
