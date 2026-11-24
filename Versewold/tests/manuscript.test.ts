import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultManuscript,
  mmToPt,
  paperSize,
  validateManuscript,
} from '../src/domain/manuscript/settings.ts';
import { paginateManuscript, wrapLine } from '../src/domain/manuscript/paginate.ts';
import {
  manuscriptGroups,
  projectWordCount,
  validateProjectStructure,
  validDate,
  displayDate,
} from '../src/domain/manuscript/structure.ts';
import {
  manuscriptMarkdown,
  prepareProjectImport,
  poemCopy,
  preparePoemImports,
} from '../src/domain/portable.ts';
import type { Project } from '../src/domain/workspace.ts';

const measure = (text: string, size: number) => [...text].length * size * 0.52;
function fixture() {
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
test('front matter, ordered parts, poems and back matter appear once in preview and Markdown', () => {
  const { project, documents } = fixture();
  assert.deepEqual(
    manuscriptGroups(project).flatMap((group) => group.documents.map((doc) => doc.id)),
    ['dedication', 'wind', 'snow', 'about'],
  );
  const snapshot = structuredClone({ project, documents });
  const layout = paginateManuscript(project, documents, defaultManuscript(), 'Fallback', measure);
  assert.deepEqual(
    layout.pages.map((page) => page.label),
    [
      'Title page',
      'Dedication',
      'Part I — Autumn',
      'Autumn Wind',
      'Part II — Winter',
      'Snow',
      'About the Author',
    ],
  );
  const markdown = manuscriptMarkdown({
    project,
    documents: Object.fromEntries(
      Object.entries(documents).map(([key, body]) => [key.split('/')[1], body]),
    ),
  });
  assert.ok(markdown.indexOf('## Dedication') < markdown.indexOf('## Part I'));
  assert.ok(markdown.includes('### Autumn Wind'));
  assert.ok(markdown.includes(documents['book/snow']));
  assert.deepEqual({ project, documents }, snapshot);
});
test('publisher word count includes all bodies; titles are an explicit separate choice', () => {
  const { project, documents } = fixture();
  assert.equal(projectWordCount(project, documents), 11);
  assert.equal(projectWordCount(project, documents, true), 28);
  const settings = defaultManuscript();
  const layout = paginateManuscript(project, documents, settings, 'Fallback', measure);
  assert.ok(layout.pages[0].lines.some((line) => line.text === '11 words'));
  settings.titleWordCount = false;
  assert.ok(
    !paginateManuscript(project, documents, settings, '', measure).pages[0].lines.some((line) =>
      /words$/.test(line.text),
    ),
  );
  assert.throws(() => projectWordCount(project, {}), /Missing text/);
});
test('physical paper dimensions, landscape and constrained margins are validated', () => {
  const settings = defaultManuscript();
  assert.ok(Math.abs(mmToPt(paperSize(settings).width) - 612) < 0.0001);
  settings.paper = 'a4';
  settings.orientation = 'landscape';
  assert.deepEqual(paperSize(settings), { width: 297, height: 210 });
  settings.margins.left = 100;
  settings.margins.right = 100;
  validateManuscript(settings);
  settings.paper = 'a5';
  assert.throws(() => validateManuscript(settings), /usable/);
  settings.margins.left = NaN;
  assert.throws(() => validateManuscript(settings), /Margins/);
  assert.throws(() => validateManuscript({ ...defaultManuscript(), fontSize: 0 }));
  assert.throws(() => validateManuscript({ ...defaultManuscript(), unexpected: true }));
});
test('long lines paginate without loss, overlap or margin overflow, preserving source bytes', () => {
  const { project, documents } = fixture();
  project.poems = project.poems.slice(0, 1);
  project.sections = [];
  delete project.poems[0].sectionId;
  documents['book/snow'] =
    Array.from(
      { length: 180 },
      (_, i) => `Line ${i + 1}: the moon watches over the quiet water.`,
    ).join('\r\n') + '\r\n';
  const original = documents['book/snow'];
  const settings = defaultManuscript();
  settings.paper = 'a5';
  settings.lineSpacing = 2;
  const layout = paginateManuscript(project, documents, settings, '', measure);
  assert.ok(layout.pages.length > 5);
  for (const page of layout.pages) {
    const body = page.lines.filter((line) => line.role === 'body');
    for (let i = 0; i < body.length; i++) {
      const line = body[i];
      assert.ok(line.x >= mmToPt(settings.margins.left));
      assert.ok(measure(line.text, line.size) <= line.width + 0.01);
      assert.ok(line.y + line.size * 1.2 <= layout.height - mmToPt(settings.margins.bottom) + 0.01);
      if (i) assert.ok(line.y >= body[i - 1].y + body[i - 1].size * 1.2);
    }
  }
  const actual = layout.pages
    .flatMap((page) => page.lines.filter((line) => line.role === 'body').map((line) => line.text))
    .join('');
  assert.equal(actual, original.replace(/\r\n/g, ''));
  assert.equal(documents['book/snow'], original);
});
test('wrapping keeps graphemes and every whitespace character, and fails visibly for impossible glyphs', () => {
  const text = '  café e\u0301 👩‍💻 — averylongword   tail';
  const wrapped = wrapLine(
    text,
    10,
    (text) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length,
  );
  assert.equal(wrapped.join(''), text);
  assert.ok(wrapped.every((line) => !line.startsWith('\u0301') && !line.startsWith('\u200d')));
  assert.throws(() => wrapLine('hello', 1, () => 2), /character/);
});
test('inline part headings stay with the first document and page numbers omit the title page', () => {
  const { project, documents } = fixture();
  const settings = defaultManuscript();
  settings.sectionPages = false;
  const layout = paginateManuscript(project, documents, settings, '', measure);
  const autumn = layout.pages.find((page) => page.label === 'Part I — Autumn')!;
  assert.ok(autumn.lines.some((line) => line.text === 'Autumn Wind'));
  assert.equal(
    layout.pages[0].lines.some((line) => line.role === 'footer'),
    false,
  );
  assert.deepEqual(
    layout.pages.slice(1).map((page) => page.lines.find((line) => line.role === 'footer')?.text),
    layout.pages.slice(1).map((_, i) => String(i + 1)),
  );
});
test('author fallbacks and stable composition/automatic revision dates have explicit output choices', () => {
  const { project, documents } = fixture();
  const settings = defaultManuscript();
  settings.showPoemAuthor = true;
  settings.poemDate = 'composed';
  settings.titleDate = 'today';
  const layout = paginateManuscript(
    project,
    documents,
    settings,
    'Fallback',
    measure,
    '2026-11-24',
  );
  assert.ok(layout.pages[0].lines.some((line) => line.text === 'A. Writer'));
  assert.ok(layout.pages[0].lines.some((line) => line.text === 'November 24, 2026'));
  assert.ok(
    layout.pages
      .find((page) => page.label === 'Autumn Wind')!
      .lines.some((line) => line.text === 'Guest Writer'),
  );
  assert.ok(
    layout.pages
      .find((page) => page.label === 'Snow')!
      .lines.some((line) => line.text === 'Composed October 20, 2026'),
  );
  settings.poemDate = 'revised';
  assert.ok(
    paginateManuscript(project, documents, settings, '', measure)
      .pages.find((page) => page.label === 'Snow')!
      .lines.some((line) => line.text.startsWith('Revised ')),
  );
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(displayDate('2026-10-20'), 'October 20, 2026');
});
test('portable copies remap parts, retain layout/bylines/dates and reject unknown parts before mutation', () => {
  const { project, documents } = fixture();
  project.manuscript = defaultManuscript();
  let next = 0;
  const transfer = {
    project,
    documents: Object.fromEntries(
      Object.entries(documents).map(([key, body]) => [key.split('/')[1], body]),
    ),
  };
  const loaded = prepareProjectImport(transfer, [], () => `new-${++next}`);
  assert.notEqual(loaded.project.sections![0].id, 'autumn');
  assert.equal(loaded.project.poems[2].sectionId, loaded.project.sections![0].id);
  assert.deepEqual(loaded.project.manuscript, project.manuscript);
  assert.equal(loaded.project.poems[0].composedOn, '2026-10-20');
  const copy = poemCopy(project.poems[0], documents['book/snow'], []);
  assert.equal(copy.metadata.updatedAt, project.poems[0].updatedAt);
  assert.equal(
    preparePoemImports([copy], project, [], () => `poem-${++next}`).entries[0].composedOn,
    '2026-10-20',
  );
  const bad = structuredClone(project);
  bad.poems[0].sectionId = 'missing';
  assert.throws(() => validateProjectStructure(bad), /Unknown section/);
  bad.poems[0].sectionId = 'winter';
  bad.poems[0].composedOn = '2026-02-30';
  assert.throws(() => validateProjectStructure(bad), /composed date/);
});
