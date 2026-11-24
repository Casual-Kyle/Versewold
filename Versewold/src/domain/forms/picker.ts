import { catalogStatus, findForms, searchText } from './search.ts';
import { formGuidance } from './guidance.ts';
import type { PoetryForm } from './types.ts';

export type WritingFilter = 'all' | 'targets' | 'other';

/** Shared catalog matching, with exact names/aliases before descriptive matches.
 * Reference entries are never offered as writing templates. */
export function writingFormResults(
  forms: PoetryForm[],
  query: string,
  filter: WritingFilter = 'all',
) {
  const needle = searchText(query);
  const rank = (form: PoetryForm) => {
    const name = searchText(form.name);
    const aliases = (form.catalog?.aliases ?? []).map(searchText);
    if (!needle || name === needle) return 0;
    if (aliases.includes(needle)) return 1;
    if (name.startsWith(needle)) return 2;
    if (aliases.some((alias) => alias.startsWith(needle))) return 3;
    return 4;
  };
  return findForms(forms, query)
    .filter((form) => {
      if (catalogStatus(form) === 'reference') return false;
      const targets = formGuidance(form).level === 'line';
      return filter === 'all' || (filter === 'targets' ? targets : !targets);
    })
    .sort((a, b) => rank(a) - rank(b));
}
