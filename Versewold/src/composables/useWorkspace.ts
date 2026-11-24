import { computed, ref, toRaw, watch } from 'vue';
import { createWorkspace, documentKey, type Project } from '../domain/workspace';
import { bundledForms } from '../domain/forms/catalog';
import { createFormValidator } from '../domain/forms/validate';
import { desktop, workspaceRepository } from '../services/workspaceRepository';
import { createSaveQueue } from '../services/saveQueue';
import { catalogStatus } from '../domain/forms/search';
import { usePreferences } from './usePreferences';
import { localDate, documentKind } from '../domain/manuscript/structure';
import { pdfPrinting } from '../services/pdfExport';
import {
  projectForms,
  prepareProjectImport,
  preparePoemImports,
  validateProjectTemplates,
  type ProjectTransfer,
  type PoemTransfer,
} from '../domain/portable';
const userPreferences = usePreferences();

// A single workspace instance is shared by views. Domain rules and disk I/O stay outside Vue.
const workspace = ref(createWorkspace());
const libraryForms = ref([...bundledForms]);
const ready = ref(false);
const error = ref('');
const formError = ref('');
const dataDirectory = ref('');
const saveState = ref<'saved' | 'pending' | 'saving' | 'error'>('saved');
let timer: ReturnType<typeof setTimeout> | undefined;
let initialized: Promise<void> | undefined;

const queue = createSaveQueue(
  () => structuredClone(toRaw(workspace.value)),
  (snapshot) => workspaceRepository.save(snapshot),
);

async function flushWorkspace() {
  clearTimeout(timer);
  if (!ready.value || !queue.dirty) return;
  saveState.value = 'saving';
  try {
    await queue.flush();
    saveState.value = 'saved';
    error.value = '';
  } catch (cause) {
    saveState.value = 'error';
    error.value = String(cause);
    throw cause;
  }
}

// Flush both independent stores even when one fails; neither queue acknowledges
// an unsaved revision. Native window closure uses this same boundary.
async function flush() {
  const results = await Promise.allSettled([flushWorkspace(), userPreferences.flush()]);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
}

watch(
  workspace,
  () => {
    if (!ready.value) return;
    queue.markDirty();
    saveState.value = 'pending';
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 600);
  },
  { deep: true, flush: 'sync' },
);

const activeProject = computed(() =>
  workspace.value.projects.find((p) => p.id === workspace.value.settings.activeProjectId),
);
const activePoem = computed(() =>
  activeProject.value?.poems.find((p) => p.id === workspace.value.settings.activePoemId),
);
const forms = computed(() => projectForms(libraryForms.value, activeProject.value));
const activeForm = computed(() => forms.value.find((f) => f.id === activePoem.value?.formId));
const body = computed({
  get: () =>
    activeProject.value && activePoem.value
      ? (workspace.value.documents[documentKey(activeProject.value.id, activePoem.value.id)] ?? '')
      : '',
  set: (value: string) => {
    if (activeProject.value && activePoem.value && value !== body.value) {
      workspace.value.documents[documentKey(activeProject.value.id, activePoem.value.id)] = value;
      touchPoem();
    }
  },
});

function touchPoem(setComposition = true) {
  if (!activePoem.value) return;
  const now = new Date();
  if (setComposition) activePoem.value.composedOn ??= localDate(now);
  activePoem.value.updatedAt = now.toISOString();
}
// Selection, autosaves, form checks and display changes never advance revision dates.
watch(
  () => [
    activeProject.value?.id,
    activePoem.value?.id,
    activePoem.value?.title,
    activePoem.value?.author,
    activePoem.value?.composedOn,
  ],
  (current, previous) => {
    if (
      current[0] === previous[0] &&
      current[1] === previous[1] &&
      current.slice(2).some((value, index) => value !== previous[index + 2])
    )
      touchPoem(false);
  },
  { flush: 'sync' },
);

function selectProject(id: string) {
  const project = workspace.value.projects.find((p) => p.id === id);
  workspace.value.settings.activeProjectId = project?.id ?? null;
  workspace.value.settings.activePoemId = project?.poems[0]?.id ?? null;
}

function selectPoem(id: string) {
  workspace.value.settings.activePoemId = id;
}

function createProject(title: string): Project {
  const project: Project = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: title.trim() || 'My poems',
    poems: [],
    authorName: userPreferences.preferences.value.profile.authorName.trim(),
  };
  workspace.value.projects.push(project);
  selectProject(project.id);
  return workspace.value.projects.find((entry) => entry.id === project.id)!;
}

function createPoem(
  title: string,
  formId = 'free-verse',
  kind: NonNullable<Project['poems'][number]['kind']> = 'poem',
  sectionId?: string,
) {
  const form = forms.value.find((entry) => entry.id === formId);
  if (form && catalogStatus(form) === 'reference') return;
  const project = activeProject.value ?? createProject('My poems');
  const id = crypto.randomUUID();
  project.poems.push({
    id,
    title: title.trim() || 'Untitled poem',
    file: `poems/${id}.md`,
    formId,
    kind,
    ...(sectionId ? { sectionId } : {}),
    author:
      project.authorName?.trim() || userPreferences.preferences.value.profile.authorName.trim(),
    composedOn: localDate(),
    updatedAt: new Date().toISOString(),
  });
  workspace.value.documents[documentKey(project.id, id)] = '';
  selectPoem(id);
}

function createSection(title: string) {
  const project = activeProject.value;
  if (!project) return;
  const section = { id: crypto.randomUUID(), title: title.trim() || 'Untitled part' };
  project.sections ??= [];
  project.sections.push(section);
  return section;
}
function frontMatter(kind: 'dedication' | 'about') {
  const existing = activeProject.value?.poems.find((poem) => poem.kind === kind);
  if (existing) selectPoem(existing.id);
  else createPoem(kind === 'dedication' ? 'Dedication' : 'About the Author', 'free-verse', kind);
}
function movePoem(id: string, direction: -1 | 1) {
  const project = activeProject.value;
  const poem = project?.poems.find((poem) => poem.id === id);
  if (!project || !poem) return;
  const siblings = project.poems.filter(
    (entry) => documentKind(entry) === documentKind(poem) && entry.sectionId === poem.sectionId,
  );
  const target = siblings[siblings.indexOf(poem) + direction];
  if (!target) return;
  const first = project.poems.indexOf(poem),
    second = project.poems.indexOf(target);
  [project.poems[first], project.poems[second]] = [project.poems[second], project.poems[first]];
}
function moveSection(id: string, direction: -1 | 1) {
  const sections = activeProject.value?.sections;
  if (!sections) return;
  const index = sections.findIndex((section) => section.id === id),
    next = index + direction;
  if (index < 0 || next < 0 || next >= sections.length) return;
  [sections[index], sections[next]] = [sections[next], sections[index]];
}

async function reloadForms() {
  try {
    const validate = createFormValidator();
    const custom = (await workspaceRepository.customForms()).map(validate);
    const ids = new Set(bundledForms.map((f) => f.id));
    for (const form of custom) {
      if (ids.has(form.id))
        throw new Error(`Duplicate form ID: ${form.id}. Give custom variants their own IDs.`);
      ids.add(form.id);
    }
    libraryForms.value = [...bundledForms, ...custom];
    formError.value = '';
  } catch (cause) {
    formError.value = `Custom templates could not be loaded: ${String(cause)}`;
  }
}

async function initialize() {
  if (initialized) return initialized;
  initialized = (async () => {
    try {
      const loaded = await workspaceRepository.load();
      for (const project of loaded.workspace.projects) validateProjectTemplates(project);
      workspace.value = loaded.workspace;
      dataDirectory.value = loaded.dataDirectory;
      await userPreferences.initialize(loaded.legacyPreferences);
      // Repair stale selections without discarding projects or text.
      if (!activeProject.value) selectProject(workspace.value.projects[0]?.id ?? '');
      if (!activePoem.value && activeProject.value)
        selectPoem(activeProject.value.poems[0]?.id ?? '');
      ready.value = true;
      // Never remove the only saved copy if loading/migrating preferences failed.
      if (userPreferences.ready.value) {
        delete workspace.value.settings.showGuidance;
        delete workspace.value.settings.editorFontSize;
      }
      await reloadForms();
      if (desktop) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const window = getCurrentWindow();
        await window.onCloseRequested(async (event) => {
          event.preventDefault();
          if (pdfPrinting.value) return;
          try {
            await flush();
            await window.destroy();
          } catch {
            /* Save error remains visible; keep the draft open. */
          }
        });
      }
      globalThis.addEventListener('beforeunload', (event) => {
        if (queue.dirty || userPreferences.isDirty()) {
          event.preventDefault();
          event.returnValue = '';
        }
      });
    } catch (cause) {
      error.value = String(cause);
    }
  })();
  return initialized;
}

function importProject(transfer: ProjectTransfer) {
  const staged = prepareProjectImport(transfer, workspace.value.projects, () =>
    crypto.randomUUID(),
  );
  workspace.value.projects.push(staged.project);
  Object.assign(workspace.value.documents, staged.documents);
  selectProject(staged.project.id);
  return staged.project;
}

function importPoems(incoming: PoemTransfer[]) {
  if (!incoming.length) return;
  const existing = activeProject.value;
  const destination: Project = existing ?? {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: 'Imported poems',
    poems: [],
  };
  const staged = preparePoemImports(incoming, toRaw(destination), libraryForms.value, () =>
    crypto.randomUUID(),
  );
  if (existing) {
    existing.poems.push(...staged.entries);
    existing.templates = staged.templates;
  } else
    workspace.value.projects.push({
      ...destination,
      poems: staged.entries,
      templates: staged.templates,
    });
  Object.assign(workspace.value.documents, staged.documents);
  workspace.value.settings.activeProjectId = destination.id;
  selectPoem(staged.entries[0].id);
}

export function useWorkspace() {
  return {
    workspace,
    forms,
    ready,
    error,
    formError,
    dataDirectory,
    saveState,
    desktop,
    activeProject,
    activePoem,
    activeForm,
    body,
    initialize,
    flush,
    reloadForms,
    selectProject,
    selectPoem,
    createProject,
    createPoem,
    createSection,
    frontMatter,
    movePoem,
    moveSection,
    importProject,
    importPoems,
    revealData: workspaceRepository.reveal,
    revealBackups: workspaceRepository.revealBackups,
  };
}
