import { normalizeNewlines } from '../forms/composition.ts';

export interface SearchOptions {
  query: string;
  matchCase: boolean;
  wholeWord: boolean;
}
export interface SearchMatch {
  from: number;
  to: number;
}

// Letters, combining marks, numbers, and connector punctuation (including _)
// stay inside words. Apostrophes and hyphens separate words for this option.
const wordCharacter = /[\p{L}\p{M}\p{N}\p{Pc}]/u;

/** Literal search in Markdown, using CodeMirror's normalized UTF-16 offsets.
 * Unicode case matching must not lowercase the source: that can shift offsets. */
export function findSearchMatches(text: string, options: SearchOptions): SearchMatch[] {
  const query = normalizeNewlines(options.query);
  if (!query) return [];
  const source = normalizeNewlines(text);
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(literal, options.matchCase ? 'gu' : 'giu');
  const matches: SearchMatch[] = [];
  for (const match of source.matchAll(pattern)) {
    const from = match.index;
    const to = from + match[0].length;
    if (options.wholeWord) {
      // Slicing two code units also handles astral letters without splitting
      // the code point immediately before or after the candidate.
      const before = Array.from(source.slice(Math.max(0, from - 2), from)).at(-1) ?? '';
      const after = String.fromCodePoint(source.codePointAt(to) ?? 0);
      if (wordCharacter.test(before) || wordCharacter.test(after)) continue;
    }
    matches.push({ from, to });
  }
  return matches;
}

export function selectedSearchMatch(
  matches: readonly SearchMatch[],
  selection: SearchMatch,
): number {
  return matches.findIndex((match) => match.from === selection.from && match.to === selection.to);
}

/** Start at the cursor/selection and wrap in either direction. */
export function nextSearchMatch(
  matches: readonly SearchMatch[],
  selection: SearchMatch,
  direction: -1 | 1,
  keepCurrent = false,
): SearchMatch | undefined {
  if (!matches.length) return;
  const current = selectedSearchMatch(matches, selection);
  if (current >= 0)
    return matches[(current + (keepCurrent ? 0 : direction) + matches.length) % matches.length];
  // While the query changes, search from the start of the old selection.
  // Its end may belong to a shorter/longer query; using it skips this occurrence.
  if (direction === 1)
    return (
      matches.find((match) => match.from >= (keepCurrent ? selection.from : selection.to)) ??
      matches[0]
    );
  return (
    [...matches]
      .reverse()
      .find((match) => match.to <= (keepCurrent ? selection.to : selection.from)) ?? matches.at(-1)
  );
}
