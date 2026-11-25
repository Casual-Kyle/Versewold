import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressionCounts,
  progressionParts,
  progressionWords,
} from '../src/domain/collectionProgression.ts';
import { setPoemIntensity } from '../src/domain/poemPlanning.ts';
import { wordsPerThousand } from '../src/domain/wordExplorer.ts';
import type { PoemEntry, Project } from '../src/domain/workspace.ts';

const poem = (id: string, details: Partial<PoemEntry> = {}): PoemEntry => ({
  id, title: id, file: 'poems/' + id + '.md', formId: 'free-verse', ...details,
});

function fixture(): Project {
  return {
    schemaVersion: 1,
    id: 'book',
    title: 'Tides',
    sections: [{ id: 'first', title: 'First part' }, { id: 'later', title: 'Later part' }],
    themeDefinitions: [{ id: 'return', label: 'Coming home' }],
    poems: [
      poem('dedication', { kind: 'dedication' }),
      poem('fourth', { sectionId: 'later' }),
      poem('second', { sectionId: 'first', tone: '  Reflective ', toneIntensity: 3, themeIds: ['return'] }),
      poem('opener'),
      poem('third', { sectionId: 'first' }),
      poem('endnote', { kind: 'text', sectionId: 'later' }),
    ],
  };
}

test('progression follows manuscript and part order and reads the current theme label', () => {
  const project = fixture();
  const before = structuredClone(project);
  const parts = progressionParts(project);
  assert.deepEqual(parts.map((part) => part.title), ['Unsectioned poems', 'First part', 'Later part']);
  assert.deepEqual(parts.flatMap((part) => part.poems.map(({ id, position }) => [id, position])), [
    ['opener', 1], ['second', 2], ['third', 3], ['fourth', 4],
  ]);
  assert.equal(parts[1].poems[0].tone, 'Reflective');
  assert.equal(parts[1].poems[0].intensity, 3);
  assert.equal(parts[1].poems[0].themes[0].label, 'Coming home');
  assert.equal(parts[1].poems[1].intensity, undefined);
  assert.deepEqual(project, before);
  project.themeDefinitions![0].label = 'Return';
  assert.equal(progressionParts(project)[1].poems[0].themes[0].label, 'Return');
});

test('tracked words use exact tokens and part rates use total words across their poems', () => {
  const project = fixture();
  const parts = progressionParts(project);
  const tracks = progressionWords([' Tide ', 'café']);
  const docs = {
    'book/second': ' A tide\r\nTIDE café',
    'book/third': 'a tidal stream and a cafe\u0301',
    'book/dedication': 'tide tide tide',
    'book/endnote': 'café',
    'other-project/third': 'tide',
  };
  const { poemCounts, partCounts } = progressionCounts(project.id, parts, docs, tracks);
  assert.deepEqual(poemCounts.get('second'), { total: 4, counts: [2, 1] });
  assert.deepEqual(poemCounts.get('third'), { total: 6, counts: [0, 1] });
  assert.deepEqual(poemCounts.get('fourth'), { total: 0, counts: [0, 0] });
  assert.equal(poemCounts.has('dedication'), false);
  const part = partCounts.get(parts[1].id)!;
  assert.deepEqual(part, { total: 10, counts: [2, 2] });
  assert.equal(wordsPerThousand(part.counts[0], part.total), 200);
  assert.equal(progressionCounts(project.id, parts, docs, []).poemCounts.size, 0);
});

test('word comparison rejects multiword text and the same token under a different spelling', () => {
  assert.deepEqual(progressionWords(['', '']), []);
  assert.deepEqual(progressionWords(['sea‑glass']), [{ label: 'sea‑glass', key: 'sea-glass' }]);
  assert.throws(() => progressionWords(['sea glass']), /one word/i);
  assert.throws(() => progressionWords(['café', 'CAFE\u0301']), /different words/i);
});

test('tone intensity can be set and cleared without touching poem dates', () => {
  const project = fixture();
  const entry = project.poems[1];
  entry.updatedAt = '2026-11-24T08:00:00Z';
  const before = structuredClone(entry);
  assert.throws(() => setPoemIntensity(project, entry, 0), /1 to 5/);
  assert.throws(() => setPoemIntensity(project, entry, 3.5), /1 to 5/);
  assert.deepEqual(entry, before);
  setPoemIntensity(project, entry, 5);
  assert.deepEqual(entry, { ...before, toneIntensity: 5 });
  setPoemIntensity(project, entry, undefined);
  assert.deepEqual(entry, before);
});
