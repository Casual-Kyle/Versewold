import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createFormValidator } from '../src/domain/forms/validate.ts';
import { poemStats, structureIssues } from '../src/domain/forms/structure.ts';

const directory = new URL('../src/domain/forms/', import.meta.url);
const validate = createFormValidator();
const forms = readdirSync(new URL('templates/', directory))
  .filter((name) => name.endsWith('.json'))
  .map((name) =>
    validate(JSON.parse(readFileSync(new URL(`templates/${name}`, directory), 'utf8'))),
  );
const find = (id: string) => forms.find((form) => form.id === id)!;

test('every bundled form validates and IDs are unique', () => {
  assert.equal(forms.length, 152);
  assert.equal(new Set(forms.map((f) => f.id)).size, forms.length);
});

test('the research authoring example is a valid custom template', () => {
  const example = JSON.parse(
    readFileSync(
      new URL('../../research/examples/my-iambic-couplet.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(validate(example).id, 'my-iambic-couplet');
});

test('villanelle has nineteen lines and refrain references in the correct positions', () => {
  const lines = find('villanelle').structure.stanzas.flatMap((s) => s.lines);
  assert.equal(lines.length, 19);
  assert.deepEqual(
    lines.flatMap((l, i) => (l.refrain?.id === 'A1' ? [i + 1] : [])),
    [1, 6, 12, 18],
  );
  assert.deepEqual(
    lines.flatMap((l, i) => (l.refrain?.id === 'A2' ? [i + 1] : [])),
    [3, 9, 15, 19],
  );
});

test('sestina rotation is end-word identity, with all six words in the envoi', () => {
  const stanzas = find('sestina').structure.stanzas;
  assert.deepEqual(
    stanzas.slice(0, 6).map((s) => s.lines.map((l) => l.endWord).join('')),
    ['ABCDEF', 'FAEBDC', 'CFDABE', 'ECBFAD', 'DEACFB', 'BDFECA'],
  );
  assert.equal(stanzas.flatMap((s) => s.lines).length, 39);
  assert.deepEqual(
    new Set(stanzas[6].lines.flatMap((l) => [l.endWord, ...(l.containsEndWords ?? [])])),
    new Set(['A', 'B', 'C', 'D', 'E', 'F']),
  );
});

test('malformed templates and unbound refrains are rejected', () => {
  assert.throws(() => validate({ ...find('free-verse'), script: 'arbitrary code' }));
  assert.throws(() => validate({ ...find('free-verse'), schemaVersion: 2 }));
  const bad = structuredClone(find('villanelle'));
  bad.structure.stanzas[0].lines[0].refrain!.role = 'repeat';
  assert.throws(() => validate(bad), /before its definition/);
  const meter = structuredClone(find('standard-habbie'));
  delete meter.structure.stanzas[0].lines[0].meter!.feet;
  assert.throws(() => validate(meter));
});

test('structural feedback handles CRLF, repeating stanzas, and blank drafts', () => {
  const body =
    'one\r\ntwo\r\nthree\r\nfour\r\nfive\r\nsix\r\n\r\none\r\ntwo\r\nthree\r\nfour\r\nfive\r\nsix';
  assert.equal(structureIssues(find('standard-habbie'), body).length, 0);
  assert.equal(structureIssues(find('standard-habbie'), '').length, 0);
  assert.equal(structureIssues(find('haiku-575'), 'one\ntwo\nthree\nfour').length, 1);
  assert.equal(structureIssues(find('free-verse'), body).length, 0);
  assert.deepEqual(poemStats('one two\nthree\n\nfour'), { words: 4, lines: 3, stanzas: 2 });
});
