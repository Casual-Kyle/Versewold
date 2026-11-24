import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import type { PoetryForm } from '../src/domain/forms/types.ts';
import { writingFormResults } from '../src/domain/forms/picker.ts';
import { formLineMap } from '../src/domain/forms/lineMap.ts';
import { formGuidance } from '../src/domain/forms/guidance.ts';

const directory = new URL('../src/domain/forms/templates/', import.meta.url);
const forms: PoetryForm[] = readdirSync(directory)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(new URL(name, directory), 'utf8')));
const form = (id: string) => forms.find((entry) => entry.id === id)!;

test('writing search ranks exact names, matches aliases/accents and descriptive terms', () => {
  assert.equal(writingFormResults(forms, 'haiku')[0].id, 'haiku');
  assert.equal(writingFormResults(forms, 'haiku practice')[0].id, 'haiku-575');
  assert.equal(writingFormResults(forms, 'Burns stanza')[0].id, 'standard-habbie');
  const accented = structuredClone(form('haiku'));
  accented.name = 'Büttenréde';
  assert.equal(writingFormResults([accented], 'buttenrede')[0].id, 'haiku');
  assert.equal(writingFormResults(forms, 'not-a-real-form-qzx').length, 0);
});

test('writing filters reflect actual targets, never offer references, and preserve catalog order', () => {
  const ids = forms.map((form) => form.id);
  const all = writingFormResults(forms, '');
  assert.ok(all.length > 100);
  assert.ok(all.every((form) => form.catalog?.status !== 'reference'));
  assert.ok(
    writingFormResults(forms, '', 'targets').every((form) => formGuidance(form).level === 'line'),
  );
  const other = writingFormResults(forms, '', 'other');
  assert.ok(other.some((form) => form.id === 'haiku'));
  assert.ok(other.some((form) => form.id === 'sonnet'));
  assert.ok(!other.some((form) => form.id === 'shakespearean-sonnet'));
  assert.deepEqual(
    forms.map((form) => form.id),
    ids,
  );
});

test('sonnet line map follows fourteen verses across physical blank lines', () => {
  const body = [
    'one\ntwo\nthree\nfour',
    'five\nsix\nseven\neight',
    'nine\nten\neleven\ntwelve',
    'thirteen\nfourteen',
  ].join('\r\n\r\n');
  const map = formLineMap(form('shakespearean-sonnet'), body, 6);
  const entries = map.sections.flatMap((section) => section.entries);
  assert.equal(entries.length, 14);
  assert.equal(entries.map((entry) => entry.rule.rhyme).join(''), 'ABABCDCDEFEFGG');
  assert.equal(entries[4].number, 5);
  assert.equal(entries[4].sourceLine, 6);
  assert.equal(entries[4].active, true);
  assert.equal(entries[13].sourceLine, 17);
  assert.equal(map.sections[3].label, 'Closing couplet');
});

test('repeating line map uses the cursor stanza and never manufactures missing lines', () => {
  const body = 'hill\nmill\nstill\nglow\nsill\nsnow\n\nsea\nfree\n';
  const map = formLineMap(form('standard-habbie'), body, 9);
  assert.match(map.sections[0].label, /Stanza 2/);
  const entries = map.sections[0].entries;
  assert.deepEqual(
    entries.map((entry) => entry.sourceLine),
    [8, 9, 10, undefined, undefined, undefined],
  );
  assert.equal(entries[1].active, true);
  assert.equal(entries[2].active, false);
  assert.equal(formLineMap(form('standard-habbie'), body, 7).sections[0].entries[0].sourceLine, 1);
});

test('haiku map supplies three unrhymed targets with only real source positions enabled', () => {
  const map = formLineMap(form('haiku-575'), '', 1);
  assert.deepEqual(
    map.sections[0].entries.map((entry) => entry.sourceLine),
    [1, undefined, undefined],
  );
  assert.ok(map.sections[0].entries.every((entry) => !entry.rule.rhyme));
  assert.equal(formLineMap(form('haiku'), '', 1).sections.length, 0);
  const continuous = formLineMap(form('blank-verse'), 'first\nsecond', 2);
  assert.equal(continuous.sections[0].entries[0].sourceLine, 2);
  assert.equal(continuous.sections[0].entries[0].number, 2);
});

test('large custom maps stay bounded while retaining the omitted-target count', () => {
  const custom = structuredClone(form('haiku-575'));
  custom.structure.stanzas[0].lines = Array.from({ length: 1000 }, () => ({}));
  const map = formLineMap(custom, '', 1);
  assert.equal(map.sections.flatMap((section) => section.entries).length, 80);
  assert.equal(map.omitted, 920);
});
