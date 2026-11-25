import { normalizeNewlines } from './forms/composition.ts';

export interface WordSource {
  id: string;
  title: string;
  body: string;
}

export interface WordLocation {
  line: number;
  column: number;
  text: string;
}

export interface WordOccurrence extends WordLocation {
  poemId: string;
  poemTitle: string;
  before: string;
  after: string;
}

/** Include internal apostrophes and simple hyphens. Require at least one letter. */
const wordPattern = /[\p{L}\p{M}\p{N}]+(?:['’\u2010\u2011-][\p{L}\p{M}\p{N}]+)*/gu;

export const defaultIgnoredWords =
  'a, an, and, are, as, at, be, but, by, for, from, had, has, have, he, her, his, i, in, is, it, its, me, my, of, on, or, our, she, so, than, that, the, their, them, then, there, they, this, to, was, we, were, what, when, where, which, who, will, with, you, your';

export function wordKey(text: string, groupCase: boolean): string {
  const normalized = text.normalize('NFC').replace(/’/gu, "'").replace(/[\u2010\u2011]/gu, '-');
  return groupCase ? normalized.toLowerCase().normalize('NFC') : normalized;
}

export function* wordsInLine(line: string) {
  for (const match of line.matchAll(wordPattern)) {
    const text = match[0];
    if (/\p{L}/u.test(text)) yield { text, column: match.index };
  }
}

export function ignoredWordKeys(text: string): Set<string> {
  return new Set([...wordsInLine(text)].map((word) => wordKey(word.text, true)));
}

export function wordsPerThousand(count: number, total: number): number {
  return total ? 1_000 * count / total : 0;
}

export interface WordFrequency {
  key: string;
  label: string;
  count: number;
}

/** Count in one pass; keep only terms and poem totals until a word is selected. */
export function indexWords(sources: readonly WordSource[], groupCase: boolean) {
  const frequencies = new Map<string, WordFrequency>();
  const totals = new Map<string, number>();
  let total = 0;
  for (const source of sources) {
    let words = 0;
    for (const line of normalizeNewlines(source.body).split('\n')) {
      for (const { text } of wordsInLine(line)) {
        const key = wordKey(text, groupCase);
        const existing = frequencies.get(key);
        if (existing) existing.count++;
        else frequencies.set(key, { key, label: text, count: 1 });
        words++;
      }
    }
    totals.set(source.id, words);
    total += words;
  }
  return { frequencies: [...frequencies.values()], totals, total };
}

export function filterWords(
  frequencies: readonly WordFrequency[],
  query: string,
  ignored: ReadonlySet<string>,
  groupCase: boolean,
) {
  const needle = wordKey(query.trim(), groupCase);
  return frequencies
    .filter((word) => !ignored.has(wordKey(word.key, true)) && word.key.includes(needle))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
}

/** Count all matches while retaining only the requested page of source passages. */
export function locateWord(
  sources: readonly WordSource[],
  key: string,
  groupCase: boolean,
  limit: number,
) {
  const occurrences: WordOccurrence[] = [];
  const counts = new Map<string, number>();
  let count = 0;
  for (const source of sources) {
    let poemCount = 0;
    for (const [index, line] of normalizeNewlines(source.body).split('\n').entries()) {
      for (const token of wordsInLine(line)) {
        if (wordKey(token.text, groupCase) !== key) continue;
        poemCount++;
        if (occurrences.length < limit) {
          const tokenEnd = token.column + token.text.length;
          let start = Math.max(0, token.column - 48);
          let end = Math.min(line.length, tokenEnd + 48);
          // If a snippet boundary lands inside a surrogate pair, include the whole character.
          if (start > 0 && /[\uDC00-\uDFFF]/u.test(line.charAt(start))) start--;
          if (/[\uDC00-\uDFFF]/u.test(line.charAt(end))) end++;
          occurrences.push({
            poemId: source.id, poemTitle: source.title, line: index + 1, ...token,
            before: (start ? '…' : '') + line.slice(start, token.column),
            after: line.slice(tokenEnd, end) + (end < line.length ? '…' : ''),
          });
        }
      }
    }
    if (poemCount) counts.set(source.id, poemCount);
    count += poemCount;
  }
  return { occurrences, counts, count };
}
