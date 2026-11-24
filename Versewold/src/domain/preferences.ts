/** Personal preferences and manuscript metadata use separate JSON files in the app data folder. */
import defaults from './default-preferences.json' with { type: 'json' };
export const paletteRoles = [
  { key: 'earth', label: 'App background', variable: '--earth' },
  { key: 'walnut', label: 'Writing surface', variable: '--walnut' },
  { key: 'surfaceDeep', label: 'Sidebar background', variable: '--surface-deep' },
  { key: 'surfaceRaised', label: 'Raised surfaces', variable: '--surface-raised' },
  { key: 'bark', label: 'Borders', variable: '--bark' },
  { key: 'line', label: 'Dividers', variable: '--line' },
  { key: 'lavender', label: 'Primary accent', variable: '--lavender' },
  { key: 'heather', label: 'Secondary accent', variable: '--heather' },
  { key: 'parchment', label: 'Primary text', variable: '--parchment' },
  { key: 'linen', label: 'Secondary text', variable: '--linen' },
  { key: 'textFaint', label: 'Muted text', variable: '--text-faint' },
  { key: 'sage', label: 'Positive & rhyme B', variable: '--sage' },
  { key: 'ochre', label: 'Attention & rhyme C', variable: '--ochre' },
  { key: 'slate', label: 'Reference & rhyme D', variable: '--slate' },
  { key: 'clay', label: 'Error & rhyme E', variable: '--clay' },
] as const;
export type PaletteKey = (typeof paletteRoles)[number]['key'];
export type Palette = Record<PaletteKey, string>;
export type ColorScheme = 'dark' | 'light';

export const themePresets: { id: string; name: string; scheme: ColorScheme; colors: Palette }[] = [
  {
    id: 'heather-earth',
    name: 'Heather & Earth',
    scheme: 'dark',
    colors: {
      earth: '#24211f',
      walnut: '#302b27',
      bark: '#453b34',
      lavender: '#b5a0c7',
      heather: '#8d78a3',
      sage: '#8b9a83',
      parchment: '#e9e0d3',
      linen: '#b1a69b',
      ochre: '#c3a16e',
      slate: '#8daab8',
      clay: '#c28d87',
      surfaceDeep: '#211e1c',
      surfaceRaised: '#37302b',
      line: '#3a332e',
      textFaint: '#a2968b',
    },
  },
  {
    id: 'midnight-ink',
    name: 'Midnight Ink',
    scheme: 'dark',
    colors: {
      earth: '#171e27',
      walnut: '#202a35',
      bark: '#3c4b5c',
      lavender: '#a5bed2',
      heather: '#829db6',
      sage: '#97b4a3',
      parchment: '#e6eaf0',
      linen: '#b0bdcc',
      ochre: '#d7b881',
      slate: '#91b6cc',
      clay: '#d39b9b',
      surfaceDeep: '#141a22',
      surfaceRaised: '#2b3847',
      line: '#303e4e',
      textFaint: '#9aaabc',
    },
  },
  {
    id: 'warm-parchment',
    name: 'Warm Parchment',
    scheme: 'light',
    colors: {
      earth: '#f4efe6',
      walnut: '#fffaf1',
      bark: '#cfc3b1',
      lavender: '#684d80',
      heather: '#80668d',
      sage: '#4e6c48',
      parchment: '#302920',
      linen: '#665a4d',
      ochre: '#815c22',
      slate: '#3f687b',
      clay: '#984c45',
      surfaceDeep: '#eae2d5',
      surfaceRaised: '#e5dacc',
      line: '#d9cebf',
      textFaint: '#756858',
    },
  },
];

export interface UserPreferences {
  schemaVersion: 1;
  profile: { authorName: string };
  appearance: {
    preset: string;
    colorScheme: ColorScheme;
    colors: Palette;
    interfaceFont: string;
    headingFont: string;
    monoFont: string;
    interfaceFontSize: number;
  };
  writing: {
    font: string;
    fontSize: number;
    lineHeight: number;
    maxWidth: number;
    spellcheck: boolean;
    softWrap: boolean;
    showStatistics: boolean;
    showGuidance: boolean;
    strictFormatting: boolean;
  };
}

export interface LegacyPreferences {
  showGuidance?: boolean | null;
  editorFontSize?: number | null;
}
export const bundledFontFamilies = ['Inter', 'Cormorant Garamond', 'EB Garamond', 'IBM Plex Mono'];

export function defaultPreferences(): UserPreferences {
  return structuredClone(defaults) as UserPreferences;
}

export function migrateLegacyPreferences(legacy: LegacyPreferences): UserPreferences {
  const settings = defaultPreferences();
  if (typeof legacy.showGuidance === 'boolean') settings.writing.showGuidance = legacy.showGuidance;
  if (typeof legacy.editorFontSize === 'number' && Number.isFinite(legacy.editorFontSize))
    settings.writing.fontSize = Math.min(48, Math.max(12, legacy.editorFontSize));
  return settings;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}
export function rgbToHex(rgb: number[]): string {
  return `#${rgb
    .map((value) =>
      Math.round(Math.min(255, Math.max(0, Number.isFinite(value) ? value : 0)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Quote a family as a CSS string so names never become extra CSS declarations. */
export function fontStack(family: string, fallback: string): string {
  return `${JSON.stringify(family)}, ${fallback}`;
}

export function appearanceVariables(settings: UserPreferences): Record<string, string> {
  return {
    ...Object.fromEntries(
      paletteRoles.map((role) => [role.variable, settings.appearance.colors[role.key]]),
    ),
    '--font-ui': fontStack(settings.appearance.interfaceFont, 'sans-serif'),
    '--font-heading': fontStack(settings.appearance.headingFont, 'serif'),
    '--font-mono': fontStack(settings.appearance.monoFont, 'monospace'),
    '--font-poem': fontStack(settings.writing.font, 'serif'),
    '--ui-scale': String(settings.appearance.interfaceFontSize / 13),
    '--editor-font-size': `${settings.writing.fontSize}px`,
    '--editor-line-height': String(settings.writing.lineHeight),
    '--editor-max-width': `${settings.writing.maxWidth}px`,
  };
}
