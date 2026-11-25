import { normalizeNewlines } from './forms/composition.ts';
import { isPoem, manuscriptGroups } from './manuscript/structure.ts';
import { collectionThemes } from './projectThemes.ts';
import { wordKey, wordsInLine } from './wordExplorer.ts';
import { documentKey, type Project, type ProjectTheme } from './workspace.ts';

export interface ProgressionPoem {
  id: string;
  position: number;
  title: string;
  tone?: string;
  intensity?: number;
  themes: ProjectTheme[];
}

export interface ProgressionPart {
  id: string;
  title: string;
  poems: ProgressionPoem[];
}

/** Follow the print order. Titles and theme labels come from the current manifest. */
export function progressionParts(project: Project): ProgressionPart[] {
  const themes = new Map(collectionThemes(project).map((theme) => [theme.id, theme]));
  let position = 0;
  return manuscriptGroups(project).flatMap((part, index) => {
    const poems = part.documents.filter(isPoem).map((poem) => ({
      id: poem.id,
      position: ++position,
      title: poem.title.trim() || 'Untitled poem',
      tone: poem.tone?.trim() || undefined,
      intensity: poem.toneIntensity,
      themes: (poem.themeIds ?? []).flatMap((id) => {
        const theme = themes.get(id);
        return theme ? [theme] : [];
      }),
    }));
    if (!poems.length) return [];
    return [{ id: index + ':' + part.id, title: part.title || 'Unsectioned poems', poems }];
  });
}

export interface ProgressionWord {
  label: string;
  key: string;
}

/** The comparison uses Word Explorer's exact token boundaries and normalization. */
export function progressionWords(inputs: readonly string[]): ProgressionWord[] {
  const selected = new Map<string, ProgressionWord>();
  for (const input of inputs) {
    const label = input.trim();
    if (!label) continue;
    const match = wordsInLine(label).next().value;
    if (!match || match.text !== label) throw new Error('Enter one word in each comparison field.');
    const key = wordKey(label, true);
    if (selected.has(key)) throw new Error('Choose two different words to compare.');
    selected.set(key, { label, key });
  }
  return [...selected.values()];
}

export interface ProgressionCounts {
  total: number;
  counts: number[];
}

/** Compute occurrence counts for tracked words and whole-poem denominators together. */
export function progressionCounts(
  projectId: string,
  parts: readonly ProgressionPart[],
  documents: Record<string, string>,
  tracks: readonly ProgressionWord[],
) {
  const poemCounts = new Map<string, ProgressionCounts>();
  const partCounts = new Map<string, ProgressionCounts>();
  if (!tracks.length) return { poemCounts, partCounts };
  const trackIndex = new Map(tracks.map((word, index) => [word.key, index]));
  for (const part of parts) {
    const partTotal = { total: 0, counts: tracks.map(() => 0) };
    for (const poem of part.poems) {
      const result = { total: 0, counts: tracks.map(() => 0) };
      const body = documents[documentKey(projectId, poem.id)] ?? '';
      for (const line of normalizeNewlines(body).split('\n')) {
        for (const token of wordsInLine(line)) {
          result.total++;
          const index = trackIndex.get(wordKey(token.text, true));
          if (index !== undefined) result.counts[index]++;
        }
      }
      poemCounts.set(poem.id, result);
      partTotal.total += result.total;
      result.counts.forEach((count, index) => {
        partTotal.counts[index] += count;
      });
    }
    partCounts.set(part.id, partTotal);
  }
  return { poemCounts, partCounts };
}
