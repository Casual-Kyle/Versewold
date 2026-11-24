import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EditorState, type StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import type { PoetryForm } from '../src/domain/forms/types.ts';
import { draftLayout } from '../src/domain/forms/composition.ts';
import {
  checkLineTargets,
  estimateEnglishSyllables,
  syllableTarget,
} from '../src/domain/forms/strict.ts';
import { guidedEditor, refreshGuidance } from '../src/components/editor/guidedEditor.ts';
import { defaultPreferences } from '../src/domain/preferences.ts';

const form = (id: string): PoetryForm =>
  JSON.parse(
    readFileSync(new URL(`../src/domain/forms/templates/${id}.json`, import.meta.url), 'utf8'),
  );
const checks = (id: string, body: string) => {
  const template = form(id);
  return draftLayout(body, template).rows.map((row) => checkLineTargets(template, row));
};

test('Strict detects a nine-syllable Habbie line against eight, without claiming scansion', () => {
  const [match, warning] = checks(
    'standard-habbie',
    'The autumn winds descend the hill\nThe autumn winds descend the green hill',
  );
  assert.equal(match.status, 'match');
  assert.equal(match.label, '≈ 8/8 syll.');
  assert.equal(warning.status, 'mismatch');
  assert.equal(warning.label, '≈ 9/8 syll.');
  assert.match(warning.detail, /1 estimated syllable over target/);
  assert.match(warning.detail, /pronunciation/);
  assert.equal(
    warning.estimate!.words.reduce((sum, word) => sum + word.count, 0),
    9,
  );
});

test('Habbie checks shorter fourth/sixth lines and repeats after natural stanza breaks', () => {
  const body =
    'The autumn winds descend the hill\nAnd turn the wheel beside the mill\nThe evening air grows cold and still\nThe embers glow\nI sit beside the windowsill\nAnd watch the snow\n\nThe autumn winds descend the green hill';
  const result = checks('standard-habbie', body);
  assert.equal(result[3].label, '≈ 4/4 syll.');
  assert.equal(result[5].label, '≈ 4/4 syll.');
  assert.equal(result[6].status, 'empty');
  assert.equal(result[7].label, '≈ 9/8 syll.');
  assert.equal(result[7].status, 'mismatch');
});

test('haiku and unbroken sonnet use their own syllable targets', () => {
  const haiku = checks(
    'haiku-575',
    'A quiet morning\nWater waits beneath the bridge\nOne leaf turns away',
  );
  assert.deepEqual(
    haiku.map((check) => check.label),
    ['≈ 5/5 syll.', '≈ 7/7 syll.', '≈ 5/5 syll.'],
  );
  assert.ok(haiku.every((check) => check.status === 'match'));
  const sonnet = checks(
    'shakespearean-sonnet',
    Array.from({ length: 14 }, () => 'The moon will rise above the silent lake').join('\n'),
  );
  assert.ok(sonnet.every((check) => check.label === '≈ 10/10 syll.'));
});

test('numbers, links, code and unsupported scripts/languages are explicitly unchecked', () => {
  for (const text of [
    '2026 lights',
    '月が昇る',
    'See https://example.com',
    '[light](https://example.com)',
    '`moon`',
  ])
    assert.equal(estimateEnglishSyllables(text), undefined);
  const template = structuredClone(form('haiku-575'));
  template.language = 'ja';
  const [row] = draftLayout('A quiet morning', template).rows;
  assert.equal(checkLineTargets(template, row).status, 'unchecked');
  assert.match(checkLineTargets(template, row).detail, /not checked/);
  assert.equal(estimateEnglishSyllables('“Don’t,” she said—wine-bottle. Café!')!.count, 8);
});

test('blank/prospective lines never warn, while written extra lines do', () => {
  assert.equal(checks('standard-habbie', '')[0].status, 'empty');
  assert.equal(checks('standard-habbie', 'light\n').at(-1)!.status, 'empty');
  assert.equal(checks('haiku-575', 'one\ntwo\nthree\nfour')[3].label, 'Extra line');
  assert.equal(checks('free-verse', 'The moon is bright')[0].status, 'unchecked');
});

test('word targets are checked while stress/mora/weight/optional targets stay distinct', () => {
  const template = structuredClone(form('haiku-575'));
  template.structure.stanzas[0].lines[0] = { wordCount: 2 };
  assert.equal(
    checkLineTargets(template, draftLayout('one two three', template).rows[0]).label,
    '3/2 words',
  );
  assert.equal(
    checkLineTargets(template, draftLayout('one two three', template).rows[0]).status,
    'mismatch',
  );
  assert.equal(syllableTarget({ system: 'accentual', beats: 4, strength: 'required' }), undefined);
  assert.equal(syllableTarget({ system: 'moraic', morae: 5, strength: 'required' }), undefined);
  assert.equal(
    syllableTarget({ system: 'quantitative', quantityPattern: '-u', strength: 'required' }),
    undefined,
  );
  assert.equal(
    syllableTarget({ system: 'syllabic', syllables: 8, strength: 'optional' }),
    undefined,
  );
});

test('Strict toggling refreshes line decorations without changing source or selection', () => {
  const template = form('standard-habbie');
  const text = 'The autumn winds descend the green hill';
  let strict = false;
  const extensions = guidedEditor(
    () => template,
    () => true,
    () => strict,
  );
  let state = EditorState.create({ doc: text, selection: { anchor: 4 }, extensions });
  const warnings = () => {
    let count = 0;
    // Inspect the actual state-field decorations without mounting a DOM editor.
    const value = state.field(extensions[0] as StateField<{ decorations: DecorationSet }>);
    value.decorations.between(0, state.doc.length, (_from, _to, decoration) => {
      if (decoration.spec.attributes?.class === 'cm-strict-warning') count++;
    });
    return count;
  };
  assert.equal(warnings(), 0);
  strict = true;
  state = state.update({ effects: refreshGuidance.of() }).state;
  assert.equal(warnings(), 1);
  assert.equal(state.doc.toString(), text);
  assert.equal(state.selection.main.anchor, 4);
  strict = false;
  state = state.update({ effects: refreshGuidance.of() }).state;
  assert.equal(warnings(), 0);
  assert.equal(defaultPreferences().writing.strictFormatting, false);
});
