import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterWords,
  ignoredWordKeys,
  indexWords,
  locateWord,
  wordKey,
  wordsPerThousand,
} from '../src/domain/wordExplorer.ts';

test('counts Unicode forms and compound words without dropping original spellings', () => {
  const sources = [{
    id: 'first',
    title: 'First',
    body: 'Café CAFE\u0301 cafe\r\nDon’t don\'t sea‑glass sea-glass — 123 2nd',
  }];
  const grouped = indexWords(sources, true);
  assert.equal(grouped.total, 8);
  assert.deepEqual(grouped.frequencies.map(({ key, count }) => [key, count]), [
    ['café', 2], ['cafe', 1], ["don't", 2], ['sea-glass', 2], ['2nd', 1],
  ]);
  assert.equal(grouped.frequencies[0].label, 'Café');
  assert.equal(indexWords(sources, false).frequencies.find((word) => word.key === 'CAFÉ')?.count, 1);
});

test('source passages retain exact line/UTF-16 column through CRLF, CR, and repeated words', () => {
  const body = 'first\r\n🌙 Rose and rose\rlast rose';
  const sources = [{ id: 'rose', title: 'Rose', body }];
  const results = locateWord(sources, 'rose', true, 50);
  assert.deepEqual(results.occurrences.map(({ line, column, text }) => [line, column, text]), [
    [2, 3, 'Rose'], [2, 12, 'rose'], [3, 5, 'rose'],
  ]);
  assert.equal(results.occurrences[1].before, '🌙 Rose and ');
  assert.equal(results.occurrences[0].after, ' and rose');
  const limited = locateWord(sources, 'rose', true, 1);
  assert.equal(limited.occurrences.length, 1);
  assert.equal(limited.counts.get('rose'), 3);
  assert.equal(limited.count, 3);
});

test('common-word edits leave exact counts and poem-length denominators intact', () => {
  const sources = [
    { id: 'short', title: 'Short', body: 'The tide' },
    { id: 'long', title: 'Long', body: 'the tide came and the tide went away' },
  ];
  const index = indexWords(sources, false);
  const ignored = ignoredWordKeys('tHe, and');
  assert.deepEqual(filterWords(index.frequencies, 'ti', ignored, false), [
    { key: 'tide', label: 'tide', count: 3 },
  ]);
  assert.ok(filterWords(index.frequencies, '', ignored, false).every((word) => wordKey(word.key, true) !== 'the'));
  assert.equal(index.total, 10);
  const count = locateWord(sources, 'tide', false, 2).counts;
  assert.equal(wordsPerThousand(count.get('short')!, index.totals.get('short')!), 500);
  assert.equal(wordsPerThousand(count.get('long')!, index.totals.get('long')!), 250);
  assert.equal(wordsPerThousand(0, 0), 0);
});
