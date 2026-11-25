import type { Project } from './workspace.ts';
import {
  addCollectionTheme,
  collectionThemes,
  removeCollectionTheme,
  themeLimits,
  validateProjectThemes,
} from './projectThemes.ts';

export const overviewLimits = {
  title: 160,
  description: 20_000,
  intendedTone: 200,
  themes: themeLimits.count,
  theme: themeLimits.label,
} as const;

const length = (value: string) => [...value].length;
const control = /\p{Cc}/u;
// Descriptions permit ordinary paragraphs and indentation.
const descriptionControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;

/** Validation is shared by editing, loading, and portable project copies. */
export function validateProjectOverview(project: Project): void {
  validateProjectThemes(project);
  if (
    project.description !== undefined &&
    (typeof project.description !== 'string' ||
      length(project.description) > overviewLimits.description ||
      descriptionControl.test(project.description))
  )
    throw new Error('Description must be text of up to 20,000 characters.');
  if (
    project.intendedTone !== undefined &&
    (typeof project.intendedTone !== 'string' ||
      length(project.intendedTone) > overviewLimits.intendedTone ||
      control.test(project.intendedTone))
  )
    throw new Error('Intended tone must be one line of up to 200 characters.');
}

/** Rename the display title only. IDs, paths, selections, and poem dates stay stable. */
export function renameProject(project: Project, value: string, projects: readonly Project[]): boolean {
  // Existing titles remain loadable; these limits apply when a new name is committed.
  const title = value.trim();
  if (!title || length(title) > overviewLimits.title || control.test(title))
    throw new Error('Use a project name of 1–160 characters on one line.');
  if (
    projects.some(
      (other) => other.id !== project.id && other.title.trim().toLowerCase() === title.toLowerCase(),
    )
  )
    throw new Error('Another project already uses that name.');
  if (title === project.title) return false;
  project.title = title;
  return true;
}

export function setProjectPlanning(
  project: Project,
  field: 'description' | 'intendedTone',
  value: string,
): boolean {
  validateProjectOverview({ ...project, [field]: value });
  if ((project[field] ?? '') === value) return false;
  if (value === '') delete project[field];
  else project[field] = value;
  return true;
}

export function addProjectTheme(project: Project, value: string): boolean {
  validateProjectOverview(project);
  return Boolean(addCollectionTheme(project, value));
}

export function removeProjectTheme(project: Project, index: number): boolean {
  if (!Number.isInteger(index) || index < 0) return false;
  const theme = collectionThemes(project)[index];
  return theme ? removeCollectionTheme(project, theme.id) : false;
}
