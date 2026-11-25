import { documentKey, type Project, type PoemEntry } from '../workspace.ts';
import { poemStats } from '../forms/structure.ts';

export const documentKind = (poem: PoemEntry) => poem.kind ?? 'poem';
export const isPoem = (poem: PoemEntry) => documentKind(poem) === 'poem';

export function removeManuscriptPart(project: Project, id: string): boolean {
  const sections = project.sections;
  if (!sections) return false;
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return false;
  for (const poem of project.poems)
    if (poem.sectionId === id) delete poem.sectionId;
  // Keep the existing reactive array so a replacement array can't carry
  // proxied entries into the raw workspace used for save and export.
  sections.splice(index, 1);
  return true;
}

/** Front matter, unsectioned writing, ordered parts, then the author page.
 * Every document appears once, including older projects with no sections. */
export function manuscriptGroups(project: Project) {
  const front = project.poems.filter((poem) => documentKind(poem) === 'dedication');
  const back = project.poems.filter((poem) => documentKind(poem) === 'about');
  const middle = project.poems.filter((poem) => !front.includes(poem) && !back.includes(poem));
  const sectionIds = new Set((project.sections ?? []).map((section) => section.id));
  return [
    { id: 'front', title: '', documents: front },
    {
      id: 'unsectioned',
      title: '',
      documents: middle.filter((poem) => !poem.sectionId || !sectionIds.has(poem.sectionId)),
    },
    ...(project.sections ?? []).map((section) => ({
      ...section,
      documents: middle.filter((poem) => poem.sectionId === section.id),
    })),
    { id: 'back', title: '', documents: back },
  ];
}

export function projectWordCount(
  project: Project,
  documents: Record<string, string>,
  countTitles = false,
) {
  let count = 0;
  for (const poem of project.poems) {
    const body = documents[documentKey(project.id, poem.id)];
    if (typeof body !== 'string') throw new Error(`Missing text for ${poem.title}.`);
    count += poemStats(body).words + (countTitles ? poemStats(poem.title).words : 0);
  }
  if (countTitles)
    count +=
      poemStats(project.title).words +
      (project.sections ?? []).reduce((sum, section) => sum + poemStats(section.title).words, 0);
  return count;
}

export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function displayDate(value?: string) {
  if (!value) return '';
  const date = value.includes('T') ? localDate(new Date(value)) : value;
  if (!validDate(date)) return '';
  // Date-only formatting avoids timezone shifts when a collection travels.
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Composition is a calendar date, so a signature never shifts with timezone
 * or substitutes the export/revision date for an unknown historical date. */
export function poemSignature(poem: PoemEntry, fallbackAuthor: string) {
  const author = poem.author?.trim() || fallbackAuthor.trim();
  const date =
    poem.composedOn && validDate(poem.composedOn)
      ? `${poem.composedOn.slice(5, 7)}/${poem.composedOn.slice(8, 10)}/${poem.composedOn.slice(0, 4)}`
      : '';
  const parts = [author, date].filter(Boolean);
  return parts.length ? `- ${parts.join(', ')}` : '';
}

export function validateProjectStructure(project: Project) {
  const sections = project.sections ?? [];
  if (!Array.isArray(sections) || sections.length > 500)
    throw new Error('Invalid project sections.');
  const ids = new Set<string>();
  for (const section of sections) {
    if (
      !section ||
      typeof section.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(section.id) ||
      typeof section.title !== 'string' ||
      !section.title.trim() ||
      section.title.length > 300 ||
      ids.has(section.id)
    )
      throw new Error('Invalid or duplicate project section.');
    ids.add(section.id);
  }
  if (
    project.authorName !== undefined &&
    (typeof project.authorName !== 'string' ||
      project.authorName.length > 200 ||
      /[\p{Cc}]/u.test(project.authorName))
  )
    throw new Error('Invalid project author.');
  for (const poem of project.poems) {
    if (!['poem', 'dedication', 'about', 'text'].includes(documentKind(poem)))
      throw new Error('Unknown project page type.');
    if (poem.sectionId && !ids.has(poem.sectionId))
      throw new Error(`Unknown section for ${poem.title}.`);
    if (
      poem.author !== undefined &&
      (typeof poem.author !== 'string' || poem.author.length > 200 || /[\p{Cc}]/u.test(poem.author))
    )
      throw new Error('Invalid poem author.');
    if (poem.composedOn && !validDate(poem.composedOn)) throw new Error('Invalid composed date.');
    if (
      poem.updatedAt &&
      (!/^\d{4}-\d{2}-\d{2}T/.test(poem.updatedAt) || !Number.isFinite(Date.parse(poem.updatedAt)))
    )
      throw new Error('Invalid revised timestamp.');
  }
}
