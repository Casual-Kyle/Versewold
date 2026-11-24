import { watch } from 'vue';
import { appearanceVariables } from '../domain/preferences';
import { usePreferences } from './usePreferences';

/** Apply tokens once at the root; every view and native modal inherits the theme. */
export function useAppearance() {
  const { preferences } = usePreferences();
  watch(
    preferences,
    (settings) => {
      for (const [name, value] of Object.entries(appearanceVariables(settings)))
        document.documentElement.style.setProperty(name, value);
      document.documentElement.style.colorScheme = settings.appearance.colorScheme;
    },
    { immediate: true, deep: true, flush: 'sync' },
  );
}
