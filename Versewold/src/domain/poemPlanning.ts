import type { PoemEntry, Project } from './workspace.ts';
import { collectionThemes, commitThemeDefinitions, validateProjectThemes } from './projectThemes.ts';
import { isPoem, manuscriptGroups } from './manuscript/structure.ts';

export const poemPlanningLimits = { tone: 200, notes: 20_000, themes: 50 } as const;
const control = /\p{Cc}/u;
const notesControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
export const toneKey = (value: string) => value.trim().toLowerCase();

export function validatePoemPlanning(poem: Pick<PoemEntry, 'tone' | 'planningNotes' | 'themeIds'>): void {
  if (poem.tone !== undefined && (typeof poem.tone !== 'string' ||
    [...poem.tone].length > poemPlanningLimits.tone || control.test(poem.tone)))
    throw new Error('Poem tone must be one line of up to 200 characters.');
  if (poem.planningNotes !== undefined && (typeof poem.planningNotes !== 'string' ||
    [...poem.planningNotes].length > poemPlanningLimits.notes || notesControl.test(poem.planningNotes)))
    throw new Error('Planning notes must be text of up to 20,000 characters.');
  if (poem.themeIds !== undefined && (!Array.isArray(poem.themeIds) ||
    poem.themeIds.length > poemPlanningLimits.themes ||
    poem.themeIds.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9-]{1,100}$/.test(id)) ||
    new Set(poem.themeIds).size !== poem.themeIds.length))
    throw new Error('Invalid or duplicate poem theme links.');
}

export function validateProjectPlanning(project: Project): void {
  validateProjectThemes(project);
  const ids = new Set((project.themeDefinitions ?? []).map((theme) => theme.id));
  for (const poem of project.poems) {
    validatePoemPlanning(poem);
    if (poem.themeIds?.some((id) => !ids.has(id)))
      throw new Error('A poem refers to a missing collection theme.');
  }
}

function belongsTo(project: Project, poem: PoemEntry): void {
  if (!project.poems.includes(poem)) throw new Error('Choose a poem from this collection.');
}

export function setPoemPlanning(
  project: Project,
  poem: PoemEntry,
  field: 'tone' | 'planningNotes',
  value: string,
): boolean {
  belongsTo(project, poem);
  validatePoemPlanning({ ...poem, [field]: value });
  if ((poem[field] ?? '') === value) return false;
  if (value === '') delete poem[field];
  else poem[field] = value;
  return true;
}

export function setPoemThemes(project: Project, poem: PoemEntry, ids: readonly string[]): boolean {
  belongsTo(project, poem);
  validateProjectThemes(project);
  if (!Array.isArray(ids)) throw new Error('Invalid poem theme links.');
  validatePoemPlanning({ ...poem, themeIds: [...ids] });
  const definitions = collectionThemes(project).map((theme) => ({ ...theme }));
  if (ids.some((id) => !definitions.some((theme) => theme.id === id)))
    throw new Error('Choose themes from this collection.');
  const next = definitions.filter((theme) => ids.includes(theme.id)).map((theme) => theme.id);
  const current = poem.themeIds ?? [];
  if (current.length === next.length && next.every((id) => current.includes(id))) return false;
  const candidate = { ...poem, themeIds: next };
  validateProjectPlanning({
    ...project, themes: undefined, themeDefinitions: definitions,
    poems: project.poems.map((entry) => entry === poem ? candidate : entry),
  });
  commitThemeDefinitions(project, definitions);
  if (next.length) poem.themeIds = next;
  else delete poem.themeIds;
  return true;
}

export function poemThemeLabels(project: Project, poem: PoemEntry): string[] {
  return collectionThemes(project).filter((theme) => poem.themeIds?.includes(theme.id)).map((theme) => theme.label);
}

export interface PoemBrowseFilters {
  tone?: string | null;
  themeId?: string | null;
  groupBy?: 'manuscript' | 'tone' | 'theme';
}
export interface PoemBrowseGroup {
  id: string;
  label: string;
  poems: PoemEntry[];
}

/** Filtering/grouping is a read-only projection of the manuscript order. */
export function browsePoems(project: Project, filters: PoemBrowseFilters = {}) {
  const all = manuscriptGroups(project).flatMap((group) => group.documents).filter(isPoem);
  const matching = all.filter((poem) =>
    (filters.tone === undefined || (filters.tone === null
      ? !poem.tone?.trim() : toneKey(poem.tone ?? '') === toneKey(filters.tone))) &&
    (filters.themeId === undefined || (filters.themeId === null
      ? !poem.themeIds?.length : poem.themeIds?.includes(filters.themeId))));
  const groups: PoemBrowseGroup[] = [];
  if (filters.groupBy === 'theme') {
    for (const theme of collectionThemes(project)) {
      const poems = matching.filter((poem) => poem.themeIds?.includes(theme.id));
      if (poems.length) groups.push({ id: 'theme:value:' + theme.id, label: theme.label, poems });
    }
    const poems = matching.filter((poem) => !poem.themeIds?.length);
    if (poems.length) groups.push({ id: 'theme:none', label: 'No themes assigned', poems });
  } else if (filters.groupBy === 'tone') {
    const tones = new Map<string, PoemBrowseGroup>();
    for (const poem of matching) {
      const key = toneKey(poem.tone ?? '');
      if (!tones.has(key)) tones.set(key, {
        id: key ? 'tone:value:' + key : 'tone:none',
        label: poem.tone?.trim() || 'Tone not set', poems: [],
      });
      tones.get(key)!.poems.push(poem);
    }
    groups.push(...tones.values());
  } else if (matching.length) {
    groups.push({ id: 'manuscript', label: '', poems: matching });
  }
  return { total: all.length, matching, groups };
}
