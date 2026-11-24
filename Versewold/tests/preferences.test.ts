import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appearanceVariables,
  defaultPreferences,
  fontStack,
  hexToRgb,
  migrateLegacyPreferences,
  paletteRoles,
  rgbToHex,
  themePresets,
} from '../src/domain/preferences.ts';

test('every palette preset covers all theme roles with valid six-digit colors', () => {
  const expected = paletteRoles.map((role) => role.key).sort();
  for (const preset of themePresets) {
    assert.deepEqual(Object.keys(preset.colors).sort(), expected);
    assert.ok(Object.values(preset.colors).every((color) => /^#[0-9a-f]{6}$/i.test(color)));
  }
  assert.deepEqual(themePresets[0].colors, defaultPreferences().appearance.colors);
});

test('legacy editor preferences migrate while keeping defaults independent', () => {
  const migrated = migrateLegacyPreferences({ editorFontSize: 28, showGuidance: false });
  assert.equal(migrated.writing.fontSize, 28);
  assert.equal(migrated.writing.showGuidance, false);
  assert.equal(defaultPreferences().writing.fontSize, 21);
  assert.equal(migrateLegacyPreferences({ editorFontSize: 999 }).writing.fontSize, 48);
  assert.equal(migrateLegacyPreferences({ editorFontSize: NaN }).writing.fontSize, 21);
  migrated.appearance.colors.earth = '#ffffff';
  assert.equal(defaultPreferences().appearance.colors.earth, '#24211f');
});

test('RGB editing roundtrips and constrains channel inputs', () => {
  assert.deepEqual(hexToRgb('#b5a0c7'), [181, 160, 199]);
  assert.equal(rgbToHex([181, 160, 199]), '#b5a0c7');
  assert.equal(rgbToHex([-2, 400, 128.4]), '#00ff80');
  assert.equal(rgbToHex([NaN, 0, 0]), '#000000');
});

test('appearance variables keep interface and writing metrics separate and quote font names', () => {
  const preferences = defaultPreferences();
  preferences.appearance.interfaceFontSize = 20;
  preferences.writing.fontSize = 30;
  preferences.writing.lineHeight = 2.2;
  const css = appearanceVariables(preferences);
  assert.equal(css['--ui-scale'], String(20 / 13));
  assert.equal(css['--editor-font-size'], '30px');
  assert.equal(css['--editor-line-height'], '2.2');
  assert.equal(css['--earth'], preferences.appearance.colors.earth);
  assert.equal(fontStack('A "quoted" family', 'serif'), '"A \\"quoted\\" family", serif');
});
