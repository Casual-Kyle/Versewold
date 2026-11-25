import { ref, toRaw } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspace } from './useWorkspace';
import { fileRepository } from '../services/fileRepository';
import { manuscriptMarkdown, poemCopy, projectCopy } from '../domain/portable';

const opened = ref(false);
const busy = ref(false);
const message = ref('');
const error = ref('');
const savedPath = ref('');
export type FileAction =
  | 'save'
  | 'load-project'
  | 'save-project'
  | 'export-project'
  | 'load-poems'
  | 'save-poem'
  | 'export-poem';

/** Flush before dialogs and after imports. Failures keep the editor/workspace
 * available for recovery; cancellation has no side effects. */
export function useProjectFiles() {
  const store = useWorkspace();
  const router = useRouter();
  async function run(action: FileAction) {
    if (busy.value) return;
    opened.value = true;
    message.value = '';
    error.value = '';
    savedPath.value = '';
    if (!store.desktop) {
      error.value = 'Save, load, and export are available in the desktop app.';
      return;
    }
    busy.value = true;
    try {
      await store.flush();
      if (action === 'save') {
        message.value = 'All writing and settings saved.';
        return;
      }
      if (action === 'load-project') {
        const incoming = await fileRepository.loadProject();
        if (!incoming) return;
        const project = store.importProject(incoming);
        await store.flush();
        await router.push('/');
        message.value = `Loaded “${project.title}” as a new library project.`;
        return;
      }
      if (action === 'load-poems') {
        const incoming = await fileRepository.loadPoems();
        if (!incoming?.length) return;
        store.importPoems(incoming);
        await store.flush();
        await router.push('/');
        message.value = `Loaded ${incoming.length} ${incoming.length === 1 ? 'poem' : 'poems'} into your project.`;
        return;
      }
      const project = store.activeProject.value;
      if (!project) throw new Error('Choose a project first.');
      const forms = structuredClone(toRaw(store.forms.value).map((form) => toRaw(form)));
      let path: string | null;
      if (action === 'save-project' || action === 'export-project') {
        const snapshot = projectCopy(
          structuredClone(toRaw(store.workspace.value)),
          structuredClone(toRaw(project)),
          forms,
        );
        path =
          action === 'save-project'
            ? await fileRepository.saveProject(snapshot)
            : await fileRepository.exportMarkdown(project.title, manuscriptMarkdown(snapshot));
      } else {
        const poem = store.activePoem.value;
        if (!poem) throw new Error('Choose a poem first.');
        path =
          action === 'save-poem'
            ? await fileRepository.savePoem(poemCopy(toRaw(poem), store.body.value, forms, toRaw(project)))
            : await fileRepository.exportMarkdown(poem.title, store.body.value);
      }
      if (path) {
        savedPath.value = path;
        message.value = action.startsWith('save-')
          ? 'Portable copy saved. Keep the whole folder together.'
          : 'Markdown exported.';
      }
    } catch (cause) {
      error.value = String(cause);
    } finally {
      busy.value = false;
    }
  }
  return { opened, busy, message, error, savedPath, run };
}
