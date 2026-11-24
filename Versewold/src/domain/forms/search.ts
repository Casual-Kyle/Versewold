import type { PoetryForm } from './types.ts';

export type CatalogFilter = 'all' | 'structured' | 'guided' | 'reference';

/** Match diacritics and punctuation permissively, including romanized aliases. */
export function searchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function findForms(
  forms: PoetryForm[],
  query: string,
  filter: CatalogFilter = 'all',
): PoetryForm[] {
  const terms = searchText(query).split(/\s+/u).filter(Boolean);
  return forms
    .filter((form) => {
      const status =
        form.catalog?.status ?? (form.structure.kind === 'free' ? 'guided' : 'structured');
      if (filter !== 'all' && status !== filter) return false;
      const text = searchText(
        [
          form.name,
          form.origin,
          form.summary,
          form.language,
          ...form.tags,
          ...(form.catalog?.aliases ?? []),
        ].join(' '),
      );
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

export function catalogStatus(form: PoetryForm) {
  return form.catalog?.status ?? (form.structure.kind === 'free' ? 'guided' : 'structured');
}
