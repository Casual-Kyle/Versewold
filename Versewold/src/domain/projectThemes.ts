import type { Project, ProjectTheme } from './workspace.ts';

export const themeLimits = { count: 50, label: 80 } as const;
const validId = /^[A-Za-z0-9-]{1,100}$/;
const control = /\p{Cc}/u;
const sameLabel = (value: string) => value.trim().toLowerCase();

export function validateProjectThemes(project: Pick<Project, 'themes' | 'themeDefinitions'>): void {
  const legacy = project.themes;
  if (legacy !== undefined && (!Array.isArray(legacy) || legacy.length > themeLimits.count ||
    legacy.some((label) => typeof label !== 'string' || !label.trim() ||
      [...label].length > themeLimits.label || control.test(label))))
    throw new Error('Use up to 50 themes, each with 1–80 characters on one line.');
  const definitions = project.themeDefinitions;
  if (definitions === undefined) return;
  if (!Array.isArray(definitions) || definitions.length > themeLimits.count)
    throw new Error('Invalid collection theme definitions.');
  if (definitions.length && legacy?.length)
    throw new Error('Collection themes must use one vocabulary format.');
  const seen = new Set<string>();
  for (const theme of definitions) {
    if (!theme || typeof theme.id !== 'string' || !validId.test(theme.id) || seen.has(theme.id) ||
      typeof theme.label !== 'string' || !theme.label.trim() ||
      [...theme.label].length > themeLimits.label || control.test(theme.label))
      throw new Error('Invalid or duplicate collection theme.');
    seen.add(theme.id);
  }
}

/** Reading an older collection is non-mutating. The first theme edit freezes
 * these project-local legacy identities and removes the older string list. */
export function collectionThemes(project: Pick<Project, 'themes' | 'themeDefinitions'>): ProjectTheme[] {
  return project.themeDefinitions?.length
    ? project.themeDefinitions
    : (project.themes ?? []).map((label, index) => ({ id: 'legacy-theme-' + (index + 1), label }));
}

export function commitThemeDefinitions(project: Project, definitions: ProjectTheme[]): void {
  validateProjectThemes({ themeDefinitions: definitions });
  if (definitions.length) project.themeDefinitions = definitions;
  else delete project.themeDefinitions;
  delete project.themes;
}

export function themeUseCount(project: Project, id: string): number {
  return project.poems.filter((poem) => poem.themeIds?.includes(id)).length;
}

export function addCollectionTheme(
  project: Project,
  value: string,
  id: () => string = () => crypto.randomUUID(),
): ProjectTheme | undefined {
  validateProjectThemes(project);
  const label = value.trim();
  if (!label) throw new Error('Enter a theme before adding it.');
  const definitions = collectionThemes(project);
  if (definitions.some((theme) => sameLabel(theme.label) === sameLabel(label))) return;
  const theme = { id: id(), label };
  commitThemeDefinitions(project, [...definitions.map((entry) => ({ ...entry })), theme]);
  return theme;
}

export function renameCollectionTheme(project: Project, id: string, value: string): boolean {
  validateProjectThemes(project);
  const definitions = collectionThemes(project);
  const theme = definitions.find((entry) => entry.id === id);
  if (!theme) throw new Error('This theme is no longer in the collection.');
  const label = value.trim();
  if (label === theme.label) return false;
  if (definitions.some((entry) => entry.id !== id && sameLabel(entry.label) === sameLabel(label)))
    throw new Error('Another theme already uses that name.');
  commitThemeDefinitions(project, definitions.map((entry) => ({ ...entry, label: entry.id === id ? label : entry.label })));
  return true;
}

export function removeCollectionTheme(project: Project, id: string): boolean {
  validateProjectThemes(project);
  const definitions = collectionThemes(project);
  if (!definitions.some((theme) => theme.id === id)) return false;
  if (themeUseCount(project, id))
    throw new Error('Unassign this theme from its poems before removing it.');
  if (project.themeCanvas?.cards.some((card) => card.kind === 'theme' && card.targetId === id))
    throw new Error('Remove this theme’s card from the canvas first.');
  commitThemeDefinitions(project, definitions.filter((theme) => theme.id !== id).map((theme) => ({ ...theme })));
  return true;
}
