import type { Project } from '../../src/domain/workspace.ts';

export const measure = (text: string, size: number) => [...text].length * size * 0.52;
export function fixture() {
  const project: Project = {
    schemaVersion: 1,
    id: 'book',
    title: 'Winter Verses',
    authorName: 'A. Writer',
    sections: [
      { id: 'autumn', title: 'Part I — Autumn' },
      { id: 'winter', title: 'Part II — Winter' },
    ],
    poems: [
      {
        id: 'snow',
        title: 'Snow',
        file: 'poems/snow.md',
        formId: 'free-verse',
        sectionId: 'winter',
        composedOn: '2026-10-20',
        updatedAt: '2026-11-24T12:00:00.000Z',
      },
      {
        id: 'about',
        title: 'About the Author',
        file: 'poems/about.md',
        formId: 'free-verse',
        kind: 'about',
      },
      {
        id: 'wind',
        title: 'Autumn Wind',
        file: 'poems/wind.md',
        formId: 'free-verse',
        sectionId: 'autumn',
        author: 'Guest Writer',
      },
      {
        id: 'dedication',
        title: 'Dedication',
        file: 'poems/dedication.md',
        formId: 'free-verse',
        kind: 'dedication',
      },
    ],
  };
  const documents = {
    'book/snow': '  Snow falls\r\n\r\nSilence.\n',
    'book/wind': 'The café waits.\n',
    'book/dedication': 'For everyone.',
    'book/about': 'I write poems.',
  };
  return { project, documents };
}
