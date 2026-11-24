import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createFormValidator } from '../src/domain/forms/validate.ts';
import { catalogStatus, findForms } from '../src/domain/forms/search.ts';
import { structureIssues } from '../src/domain/forms/structure.ts';

const root = new URL('../../', import.meta.url);
const read = (relative: string) => JSON.parse(readFileSync(new URL(relative, root), 'utf8'));
const validate = createFormValidator();
const directory = new URL('Versewold/src/domain/forms/templates/', root);
const forms = readdirSync(directory)
  .filter((name) => name.endsWith('.json'))
  .map((name) => validate(JSON.parse(readFileSync(new URL(name, directory), 'utf8'))));
const find = (id: string) => forms.find((form) => form.id === id)!;

test('all 149 source members have a unique, attributed runtime entry', () => {
  const inventory = read('research/poetic-forms/inventory.json');
  const coverage = read('research/poetic-forms/coverage.json');
  assert.equal(inventory.count, 149);
  assert.equal(coverage.entries.length, inventory.count);
  assert.equal(
    new Set(coverage.entries.map((entry: { templateId: string }) => entry.templateId)).size,
    149,
  );
  for (const source of inventory.entries) {
    const record = coverage.entries.find(
      (entry: { sourceTitle: string }) => entry.sourceTitle === source.title,
    );
    assert.ok(record, `Missing source member: ${source.title}`);
    const form = find(record.templateId);
    assert.ok(form, `Missing runtime JSON: ${record.templateId}`);
    assert.equal(form.catalog?.sourceRevisionId, source.revisionId);
    assert.ok(form.sources.some((entry) => entry.url === source.revisionUrl));
  }
  assert.equal(forms.length, coverage.entries.length + 3);
});

test('references remain distinct from writing templates, and open guidance has no invented layout', () => {
  assert.equal(catalogStatus(find('poetic-meter-and-poetic-form')), 'reference');
  assert.equal(catalogStatus(find('emi-omo-eso')), 'reference');
  assert.equal(catalogStatus(find('modernist-poetry')), 'guided');
  for (const form of forms.filter((entry) => catalogStatus(entry) === 'reference'))
    assert.equal(form.structure.kind, 'free');
});

test('search finds aliases and unaccented spellings, combines terms, and filters by support', () => {
  assert.ok(findForms(forms, 'buttenrede').some((form) => form.id === 'buttenrede'));
  assert.ok(findForms(forms, 'duong luat').some((form) => form.id === 'duong-luat'));
  assert.ok(findForms(forms, 'shahrashub').some((form) => form.id === 'shahr-ashob'));
  assert.ok(findForms(forms, 'Tamil couplet').some((form) => form.id === 'kural'));
  assert.ok(findForms(forms, 'not-a-poetic-form-xyz').length === 0);
  assert.ok(
    findForms(forms, '', 'structured').every((form) => catalogStatus(form) === 'structured'),
  );
  assert.ok(findForms(forms, '', 'reference').every((form) => catalogStatus(form) === 'reference'));
});

test('morae, stress beats, word counts, and Tamil metrical feet are not conflated', () => {
  assert.deepEqual(
    find('dodoitsu').structure.stanzas[0].lines.map((line) => [
      line.meter?.system,
      line.meter?.morae,
    ]),
    [
      ['moraic', 7],
      ['moraic', 7],
      ['moraic', 7],
      ['moraic', 5],
    ],
  );
  assert.deepEqual(
    find('limerick').structure.stanzas[0].lines.map((line) => line.meter?.beats),
    [3, 3, 2, 2, 3],
  );
  assert.deepEqual(
    find('elevenie').structure.stanzas[0].lines.map((line) => line.wordCount),
    [1, 2, 3, 4, 1],
  );
  assert.ok(find('kural').structure.stanzas[0].lines.every((line) => line.wordCount === undefined));
  assert.equal(find('haiku').structure.kind, 'free');
  assert.equal(find('elegiac-couplet').structure.stanzas[0].lines[0].meter?.system, 'quantitative');
});

test('rondel, roundel, pantoum, terzanelle, and pentina retain their distinct structures', () => {
  const count = (id: string) => find(id).structure.stanzas.flatMap((stanza) => stanza.lines).length;
  assert.equal(count('rondel'), 13);
  assert.equal(count('roundel'), 11);
  assert.equal(count('pantoum'), 16);
  assert.equal(count('terzanelle'), 19);
  assert.equal(count('pentina'), 27);
  const pantoum = find('pantoum').structure.stanzas.map((stanza) =>
    stanza.lines.map((line) => line.refrain?.id),
  );
  assert.deepEqual(pantoum[1], ['L2', 'L5', 'L4', 'L6']);
  assert.deepEqual(pantoum[3], ['L7', 'L3', 'L8', 'L1']);
  assert.deepEqual(
    find('pentina')
      .structure.stanzas.slice(0, 5)
      .map((stanza) => stanza.lines.map((line) => line.endWord).join('')),
    ['ABCDE', 'EADBC', 'CEBAD', 'DCAEB', 'BDECA'],
  );
});

test('internal rhyme is encoded at syllable positions instead of invented end-rhyme groups', () => {
  const lines = find('thanbauk').structure.stanzas[0].lines;
  assert.deepEqual(
    lines.map((line) => line.internalRhymes?.[0].syllable),
    [4, 3, 2],
  );
  assert.ok(lines.every((line) => line.rhyme === undefined));
  const bad = structuredClone(find('thanbauk'));
  bad.structure.stanzas[0].lines[0].internalRhymes![0].syllable = 8;
  assert.throws(() => validate(bad), /outside the line/);
});

test('continuous metrical lines do not require one-line stanzas; word targets receive layout feedback', () => {
  assert.deepEqual(structureIssues(find('blank-verse'), 'First line\nSecond line\nThird line'), []);
  assert.deepEqual(structureIssues(find('verso-sciolto'), 'Prima riga\nSeconda riga'), []);
  assert.deepEqual(
    structureIssues(
      find('elevenie'),
      'rain\nsoft drops\nfalling on stone\na garden drinks slowly\npeace',
    ),
    [],
  );
  assert.ok(
    structureIssues(
      find('elevenie'),
      'rain falls\nsoft drops\nfalling on stone\na garden drinks slowly\npeace',
    ).some((issue) => issue.includes('suggested words')),
  );
  assert.ok(
    structureIssues(find('yadu'), Array(4).fill('a\nb\nc\nd\ne').join('\n\n')).some((issue) =>
      issue.includes('at most 3'),
    ),
  );
});

test('new meter systems require their own fields and old version 1 files still validate', () => {
  for (const id of ['dodoitsu', 'limerick', 'elegiac-couplet']) {
    const bad = structuredClone(find(id));
    const line = bad.structure.stanzas[0].lines[0];
    delete line.meter?.morae;
    delete line.meter?.beats;
    delete line.meter?.quantityPattern;
    assert.throws(() => validate(bad));
  }
  const old = structuredClone(find('standard-habbie'));
  delete old.catalog;
  assert.equal(validate(old).schemaVersion, 1);
});
