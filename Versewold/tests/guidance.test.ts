import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createFormValidator } from '../src/domain/forms/validate.ts';
import { formGuidance, rhymeMarkerDescription } from '../src/domain/forms/guidance.ts';
import { draftLayout, inlineTarget } from '../src/domain/forms/composition.ts';
import { structureIssues } from '../src/domain/forms/structure.ts';

const validate = createFormValidator();
const directory = new URL('../src/domain/forms/templates/', import.meta.url);
const form = (id: string) =>
  validate(JSON.parse(readFileSync(new URL(`${id}.json`, directory), 'utf8')));

test('guidance reports notes, layout, line targets, and missing templates distinctly', () => {
  assert.equal(formGuidance(form('haiku')).label, 'Notes-only guidance');
  assert.equal(formGuidance(form('sonnet')).label, 'Layout-only guidance');
  assert.equal(formGuidance(form('sonnet')).totalLines, 14);
  assert.equal(formGuidance(form('haiku-575')).label, 'Line-by-line guidance');
  assert.equal(formGuidance(form('shakespearean-sonnet')).label, 'Line-by-line guidance');
  assert.equal(formGuidance().label, 'Template unavailable');
  assert.equal(
    formGuidance(form('blank-verse')).detail.startsWith('Continuous line targets'),
    true,
  );
});

test('haiku practice supplies 5–7–5 targets without invented rhyme letters', () => {
  const haiku = form('haiku-575');
  const layout = draftLayout(
    'A quiet morning\nWater waits beneath the bridge\nOne leaf turns away',
    haiku,
  );
  assert.deepEqual(
    layout.rows.map((row) => inlineTarget(row)),
    ['5 syll. target', '7 syll. target', '5 syll. target'],
  );
  assert.ok(layout.rows.every((row) => !row.rule?.rhyme));
  assert.match(formGuidance(haiku).detail, /5–7–5 syllable targets/);
  assert.match(formGuidance(haiku).detail, /No prescribed end rhyme/);
  assert.match(rhymeMarkerDescription(haiku, true), /No prescribed end rhyme/);
  assert.ok(draftLayout('', form('standard-habbie')).rows[0].rule?.rhyme);
});

test('Shakespearean sonnets retain all fourteen rhyme/meter targets in a single printed stanza', () => {
  const sonnet = form('shakespearean-sonnet');
  const body = Array.from({ length: 14 }, (_, index) => `Verse ${index + 1}`).join('\n');
  const layout = draftLayout(body, sonnet);
  assert.equal(layout.stanzas.length, 1);
  assert.equal(layout.stanzas[0].expected, undefined);
  assert.equal(layout.rows.map((row) => row.rule?.rhyme).join(''), 'ABABCDCDEFEFGG');
  assert.ok(
    layout.rows.every((row) => row.rule?.meter?.pattern === 'u/' && row.rule.meter.feet === 5),
  );
  assert.ok(layout.rows.every((row) => inlineTarget(row) === '10 syll. target'));
  assert.equal(layout.rows[12].section?.label, 'Closing couplet');
  assert.equal(layout.rows[13].section?.line, 2);
  assert.deepEqual(structureIssues(sonnet, body), []);
  assert.match(formGuidance(sonnet).detail, /ABAB CDCD EFEF GG/);
});

test('blank-line quatrains/couplet and unbroken sonnets use the same sequence without forcing formatting', () => {
  const sonnet = form('shakespearean-sonnet');
  const verses = Array.from({ length: 14 }, (_, index) => `Verse ${index + 1}`);
  const separated = [verses.slice(0, 4), verses.slice(4, 8), verses.slice(8, 12), verses.slice(12)]
    .map((block) => block.join('\r\n'))
    .join('\r\n\r\n');
  const layout = draftLayout(separated, sonnet);
  assert.equal(layout.stanzas.length, 4);
  assert.equal(
    layout.rows
      .filter((row) => row.stanza !== null)
      .map((row) => row.rule?.rhyme)
      .join(''),
    'ABABCDCDEFEFGG',
  );
  assert.ok(layout.rows.filter((row) => row.stanza === null).every((row) => !row.rule));
  assert.deepEqual(structureIssues(sonnet, separated), []);
  assert.match(structureIssues(sonnet, verses.slice(0, 13).join('\n'))[0], /14 lines.*13/);
  const extra = draftLayout(verses.join('\n') + '\nExtra verse', sonnet);
  assert.equal(extra.rows.at(-1)!.rule, undefined);
  assert.match(structureIssues(sonnet, verses.join('\n') + '\nExtra verse')[0], /14 lines.*15/);
});

test('named variant links resolve to actual bundled writing templates', () => {
  assert.deepEqual(form('haiku').catalog?.variants, ['haiku-575']);
  assert.deepEqual(form('sonnet').catalog?.variants, ['shakespearean-sonnet']);
  const forms = readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => form(name.slice(0, -5)));
  for (const entry of forms)
    for (const id of entry.catalog?.variants ?? [])
      assert.ok(
        forms.some((candidate) => candidate.id === id && candidate.catalog?.status !== 'reference'),
      );
});

test('new optional fields preserve version 1 compatibility and reject contradictory mapping', () => {
  const old = structuredClone(form('shakespearean-sonnet'));
  delete old.structure.lineMapping;
  validate(old);
  const repeating = structuredClone(form('standard-habbie'));
  repeating.structure.lineMapping = 'poem';
  assert.throws(() => validate(repeating), /fixed line sequence/);
  const selfLink = structuredClone(form('sonnet'));
  selfLink.catalog!.variants = ['sonnet'];
  assert.throws(() => validate(selfLink), /itself/);
});
