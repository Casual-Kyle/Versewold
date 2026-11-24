import { invoke } from '@tauri-apps/api/core';
import type { PoemTransfer, ProjectTransfer } from '../domain/portable';
import type { ManuscriptSettings } from '../domain/manuscript/types';

/** Only native commands open dialogs/read or write selected external files. */
export const fileRepository = {
  saveProject: (transfer: ProjectTransfer) =>
    invoke<string | null>('save_project_copy', { transfer }),
  loadProject: () => invoke<ProjectTransfer | null>('load_project_copy'),
  savePoem: (transfer: PoemTransfer) => invoke<string | null>('save_poem_copy', { transfer }),
  loadPoems: () => invoke<PoemTransfer[] | null>('load_poem_files'),
  exportMarkdown: (title: string, body: string) =>
    invoke<string | null>('export_markdown', { title, body }),
  exportPdf: (title: string, settings: ManuscriptSettings) =>
    invoke<string | null>('export_pdf', { title, settings }),
};
