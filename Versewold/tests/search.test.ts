import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findSearchMatches,
  nextSearchMatch,
  selectedSearchMatch,
  type SearchOptions,
} from '../src/domain/editor/search.ts';

const options = (query: string, extra: Partial<SearchOptions> = {}): SearchOptions => ({
  query,
  matchCase: false,
  wholeWord: false,
  ...extra,
});

test('search is literal and preserves exact UTF-16 source offsets after Unicode', () => {
  const text = '🌙 İ [sea.*] SEA [sea.*]';
  const matches = findSearchMatches(text, options('[sea.*]'));
  assert.equal(matches.length, 2);
  assert.deepEqual(matches[0], { from: 5, to: 12 });
  assert.ok(matches.every((match) => text.slice(match.from, match.to) === '[sea.*]'));
  assert.equal(findSearchMatches(text, options('.*')).length, 2);
  assert.equal(findSearchMatches(text, options('\\')).length, 0);
});

test('case matching uses Unicode case rules without folding accents or changing source lengths', () => {
  const text = 'Été été ETE 🌲 𐐀 𐐨';
  assert.equal(findSearchMatches(text, options('été')).length, 2);
  assert.deepEqual(findSearchMatches(text, options('été', { matchCase: true })), [
    { from: 4, to: 7 },
  ]);
  assert.equal(findSearchMatches(text, options('𐐨')).length, 2);
  assert.equal(findSearchMatches(text, options('ete')).length, 1);
});

test('whole words respect Unicode letters, combining marks, digits, and underscores', () => {
  const text = 'sea seashore _sea sea2 ésea seaé 𐐀sea sea𐐀 sea\u0301 sea-sea sea’s';
  const matches = findSearchMatches(text, options('sea', { wholeWord: true }));
  assert.equal(matches.length, 4);
  assert.ok(matches.every((match) => text.slice(match.from, match.to) === 'sea'));
  assert.equal(
    findSearchMatches('cafe\u0301 café', options('cafe', { wholeWord: true })).length,
    0,
  );
});

test('search handles empty queries, no results, whitespace, and non-overlapping matches', () => {
  assert.deepEqual(findSearchMatches('sea', options('')), []);
  assert.deepEqual(findSearchMatches('', options('sea')), []);
  assert.deepEqual(findSearchMatches('sea', options('moon')), []);
  assert.equal(findSearchMatches('  sea  ', options('  ')).length, 2);
  assert.deepEqual(findSearchMatches('aaaaa', options('aa')), [
    { from: 0, to: 2 },
    { from: 2, to: 4 },
  ]);
});

test('multiline searches use normalized Markdown offsets across all line endings', () => {
  const text = '🌙\r\nsea\r\n\r\nmoon\rsea\n\nmoon';
  const matches = findSearchMatches(text, options('sea\r\n\r\nmoon'));
  assert.deepEqual(matches, [
    { from: 3, to: 12 },
    { from: 13, to: 22 },
  ]);
});

test('editing the query keeps the current occurrence when its selection length changes', () => {
  const matches = findSearchMatches('sea seal sea', options('se'));
  assert.deepEqual(nextSearchMatch(matches, { from: 0, to: 1 }, 1, true), matches[0]);
  assert.deepEqual(nextSearchMatch(matches, { from: 4, to: 5 }, 1, true), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, { from: 4, to: 8 }, 1, true), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, { from: 4, to: 8 }, -1, true), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, { from: 0, to: 1 }, 1), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, { from: 4, to: 8 }, -1), matches[0]);
});

test('next and previous search wrap around the selected occurrence or start at the cursor', () => {
  const matches = findSearchMatches('sea moon sea sun sea', options('sea'));
  assert.equal(selectedSearchMatch(matches, { from: 1, to: 1 }), -1);
  assert.deepEqual(nextSearchMatch(matches, matches[0], 1), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, matches[0], -1), matches[2]);
  assert.deepEqual(nextSearchMatch(matches, matches[2], 1), matches[0]);
  assert.deepEqual(nextSearchMatch(matches, matches[1], 1, true), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, { from: 4, to: 4 }, 1), matches[1]);
  assert.deepEqual(nextSearchMatch(matches, { from: 4, to: 4 }, -1), matches[0]);
  assert.equal(nextSearchMatch([], { from: 0, to: 0 }, 1), undefined);
});
