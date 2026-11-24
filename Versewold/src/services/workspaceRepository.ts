import { invoke, isTauri } from '@tauri-apps/api/core';
import { createWorkspace, type Workspace } from '../domain/workspace';
import type { LegacyPreferences } from '../domain/preferences';

export const desktop = isTauri();

/** The browser is a temporary UI preview. Only the native app persists writing. */
export const workspaceRepository = {
  async load(): Promise<{
    workspace: Workspace;
    dataDirectory: string;
    legacyPreferences: LegacyPreferences;
  }> {
    return desktop
      ? invoke('load_workspace')
      : { workspace: createWorkspace(), dataDirectory: 'Desktop app only', legacyPreferences: {} };
  },
  async save(workspace: Workspace): Promise<void> {
    if (desktop) await invoke('save_workspace', { workspace });
  },
  async customForms(): Promise<unknown[]> {
    return desktop ? invoke('load_custom_forms') : [];
  },
  async reveal(): Promise<void> {
    if (desktop) await invoke('reveal_data_folder');
  },
  async revealBackups(): Promise<void> {
    if (desktop) await invoke('reveal_backups_folder');
  },
};
