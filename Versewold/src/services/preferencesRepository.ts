import { invoke } from '@tauri-apps/api/core';
import { desktop } from './workspaceRepository';
import {
  migrateLegacyPreferences,
  type LegacyPreferences,
  type UserPreferences,
} from '../domain/preferences';

export const preferencesRepository = {
  async load(
    legacy: LegacyPreferences,
  ): Promise<{ preferences: UserPreferences; settingsDirectory: string; migrated: boolean }> {
    return desktop
      ? invoke('load_user_settings', { legacy })
      : {
          preferences: migrateLegacyPreferences(legacy),
          settingsDirectory: 'Desktop app only',
          migrated: false,
        };
  },
  async save(preferences: UserPreferences): Promise<void> {
    if (desktop) await invoke('save_user_settings', { preferences });
  },
  async fonts(): Promise<string[]> {
    return desktop ? invoke('list_system_fonts') : [];
  },
  async reveal(): Promise<void> {
    if (desktop) await invoke('reveal_settings_folder');
  },
};
