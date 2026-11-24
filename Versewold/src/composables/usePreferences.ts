import { ref, toRaw, watch } from 'vue';
import {
  bundledFontFamilies,
  defaultPreferences,
  type LegacyPreferences,
} from '../domain/preferences';
import { preferencesRepository } from '../services/preferencesRepository';
import { createSaveQueue } from '../services/saveQueue';

const preferences = ref(defaultPreferences());
const ready = ref(false);
const settingsDirectory = ref('');
const migrated = ref(false);
const error = ref('');
const saveState = ref<'saved' | 'pending' | 'saving' | 'error'>('saved');
const fonts = ref([...bundledFontFamilies]);
const fontError = ref('');
const fontsLoading = ref(false);
let fontsLoaded = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let initialization: Promise<void> | undefined;
const queue = createSaveQueue(
  () => structuredClone(toRaw(preferences.value)),
  preferencesRepository.save,
);

async function flush() {
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

watch(
  preferences,
  () => {
    if (!ready.value) return;
    queue.markDirty();
    saveState.value = 'pending';
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 400);
  },
  { deep: true, flush: 'sync' },
);

async function initialize(legacy: LegacyPreferences = {}) {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      const loaded = await preferencesRepository.load(legacy);
      preferences.value = loaded.preferences;
      settingsDirectory.value = loaded.settingsDirectory;
      migrated.value = loaded.migrated;
      ready.value = true;
    } catch (cause) {
      error.value = `Preferences could not be loaded. The existing settings file was preserved. ${String(cause)}`;
      saveState.value = 'error';
    }
  })();
  return initialization;
}

async function loadFonts(refresh = false) {
  if (fontsLoading.value || (fontsLoaded && !refresh)) return;
  fontsLoading.value = true;
  try {
    fonts.value = [
      ...new Set([...bundledFontFamilies, ...(await preferencesRepository.fonts())]),
    ].sort((a, b) => a.localeCompare(b));
    fontsLoaded = true;
    fontError.value = '';
  } catch (cause) {
    fontError.value = `Installed fonts could not be read. Bundled fonts remain available. ${String(cause)}`;
  } finally {
    fontsLoading.value = false;
  }
}

export function usePreferences() {
  return {
    preferences,
    ready,
    error,
    saveState,
    settingsDirectory,
    migrated,
    fonts,
    fontsLoading,
    fontError,
    initialize,
    flush,
    loadFonts,
    isDirty: () => queue.dirty,
    reveal: preferencesRepository.reveal,
    resetAppearance: () => {
      preferences.value.appearance = defaultPreferences().appearance;
    },
    resetWriting: () => {
      preferences.value.writing = defaultPreferences().writing;
    },
  };
}
