import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultManuscript,
  mmToPt,
  validateManuscript,
} from '../src/domain/manuscript/settings.ts';
import { paginateManuscript } from '../src/domain/manuscript/paginate.ts';
import { poemSignature } from '../src/domain/manuscript/structure.ts';
import { fixture, measure } from './fixtures/manuscript.ts';

test('signatures use the composition date, author fallbacks and only known metadata', () => {
  const { project, documents } = fixture();
  const snapshot = structuredClone({ project, documents });
  const settings = defaultManuscript();
  const layout = paginateManuscript(project, documents, settings, 'Profile Author', measure);
  const snow = layout.pages.find((page) => page.label === 'Snow')!;
  assert.equal(
    snow.lines.find((line) => line.role === 'signature')?.text,
    '- A. Writer, 10/20/2026',
  );
  const wind = layout.pages.find((page) => page.label === 'Autumn Wind')!;
  assert.equal(wind.lines.find((line) => line.role === 'signature')?.text, '- Guest Writer');
  assert.ok(
    layout.pages
      .filter((page) => !['Snow', 'Autumn Wind'].includes(page.label))
      .every((page) => page.lines.every((line) => line.role !== 'signature')),
  );
  project.authorName = '';
  const fallback = paginateManuscript(project, documents, settings, 'Profile Author', measure);
  assert.equal(
    fallback.pages
      .find((page) => page.label === 'Snow')!
      .lines.find((line) => line.role === 'signature')?.text,
    '- Profile Author, 10/20/2026',
  );
  project.authorName = snapshot.project.authorName;
  assert.deepEqual({ project, documents }, snapshot);
  const poem = project.poems[0];
  assert.equal(
    poemSignature({ ...poem, author: '  Kyle Johnston  ' }, ''),
    '- Kyle Johnston, 10/20/2026',
  );
  assert.equal(poemSignature(poem, ''), '- 10/20/2026');
  assert.equal(poemSignature({ ...poem, composedOn: undefined }, ''), '');
  settings.poemSignature = false;
  assert.ok(
    paginateManuscript(project, documents, settings, '', measure).pages.every((page) =>
      page.lines.every((line) => line.role !== 'signature'),
    ),
  );
});

test('a multipage poem is signed only on its final page, above its page number', () => {
  const { project, documents } = fixture();
  project.poems = [project.poems[0]];
  project.sections = [];
  delete project.poems[0].sectionId;
  documents['book/snow'] = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\r\n');
  const original = documents['book/snow'];
  const settings = defaultManuscript();
  settings.paper = 'a5';
  const layout = paginateManuscript(project, documents, settings, '', measure);
  const poemPages = layout.pages.filter((page) => page.documentId === 'snow');
  assert.ok(poemPages.length > 1);
  assert.ok(
    poemPages.slice(0, -1).every((page) => page.lines.every((line) => line.role !== 'signature')),
  );
  const final = poemPages.at(-1)!;
  const signature = final.lines.find((line) => line.role === 'signature')!;
  assert.equal(signature.text, '- A. Writer, 10/20/2026');
  assert.equal(signature.align, 'right');
  assert.equal(signature.x, mmToPt(settings.margins.left));
  assert.ok(
    Math.abs(signature.x + signature.width - (layout.width - mmToPt(settings.margins.right))) <
      0.001,
  );
  assert.ok(
    Math.abs(
      signature.y + signature.size * 1.2 - (layout.height - mmToPt(settings.margins.bottom)),
    ) < 0.001,
  );
  assert.ok(final.lines.some((line) => line.role === 'body' && line.text === 'Line 100'));
  assert.ok(
    final.lines
      .filter((line) => line.role === 'body')
      .every((line) => line.y + line.size * 1.2 <= signature.y - 12),
  );
  assert.ok(
    signature.y + signature.size * 1.2 < final.lines.find((line) => line.role === 'footer')!.y,
  );
  assert.equal(documents['book/snow'], original);
});

test('the final written line stays with its signature when the footer needs another page', () => {
  const { project, documents } = fixture();
  project.poems = [project.poems[0]];
  project.sections = [];
  delete project.poems[0].sectionId;
  documents['book/snow'] = Array.from({ length: 28 }, (_, i) => `Line ${i + 1}`).join('\n');
  const settings = defaultManuscript();
  settings.titlePage = false;
  settings.poemSignature = false;
  assert.equal(paginateManuscript(project, documents, settings, '', measure).pages.length, 1);
  settings.poemSignature = true;
  const layout = paginateManuscript(project, documents, settings, '', measure);
  assert.equal(layout.pages.length, 2);
  assert.ok(layout.pages[0].lines.every((line) => line.role !== 'signature'));
  assert.deepEqual(
    layout.pages[1].lines.filter((line) => line.role === 'body').map((line) => line.text),
    ['Line 28'],
  );
  assert.ok(layout.pages[1].lines.some((line) => line.role === 'signature'));
});

test('a short poem fits with its signature on a compact page', () => {
  const { project, documents } = fixture();
  project.poems = [project.poems[0]];
  delete project.poems[0].sectionId;
  project.sections = [];
  documents['book/snow'] = 'Snow falls.';
  const settings = {
    ...defaultManuscript(),
    paper: 'custom' as const,
    customWidthMm: 100,
    customHeightMm: 100,
    margins: { top: 20, bottom: 40, left: 10, right: 10 },
    titlePage: false,
    fontSize: 16,
    lineSpacing: 1.75,
  };

  const { pages } = paginateManuscript(project, documents, settings, '', measure);
  assert.equal(pages.length, 1);
  const body = pages[0].lines.find((line) => line.role === 'body')!;
  const signature = pages[0].lines.find((line) => line.role === 'signature')!;
  assert.equal(body.text, 'Snow falls.');
  assert.equal(signature.text, '- A. Writer, 10/20/2026');
  assert.ok(body.y + body.size * 1.2 <= signature.y - 12);
});

test('shared pages and wrapped signatures reserve space for every completed poem', () => {
  const { project, documents } = fixture();
  project.poems = [project.poems[2], project.poems[0]];
  project.sections = [];
  project.poems.forEach((poem) => delete poem.sectionId);
  project.poems[0].author = 'Guest Writer '.repeat(12).trim();
  const settings = defaultManuscript();
  settings.titlePage = false;
  settings.poemNewPage = false;
  settings.paper = 'a5';
  settings.margins.bottom = 0;
  const layout = paginateManuscript(project, documents, settings, '', measure);
  assert.equal(layout.pages.length, 1);
  const page = layout.pages[0];
  const signatures = page.lines.filter((line) => line.role === 'signature');
  assert.ok(signatures.length > 2);
  assert.equal(
    signatures
      .slice(0, -1)
      .map((line) => line.text)
      .join(''),
    `- ${project.poems[0].author}`,
  );
  assert.equal(signatures.at(-1)!.text, '- A. Writer, 10/20/2026');
  for (let i = 0; i < signatures.length; i++) {
    const line = signatures[i];
    assert.ok(measure(line.text, line.size) <= line.width + 0.001);
    if (i) assert.ok(signatures[i - 1].y + signatures[i - 1].size * 1.2 <= line.y);
  }
  assert.ok(
    page.lines
      .filter((line) => line.role === 'body')
      .every((line) => line.y + line.size * 1.2 <= signatures[0].y - 12),
  );
  assert.ok(signatures.at(-1)!.y + 12 < page.lines.find((line) => line.role === 'footer')!.y);
});

test('legacy page settings enable signatures without changing saved choices or source objects', () => {
  const legacy = { ...defaultManuscript() } as Partial<ReturnType<typeof defaultManuscript>>;
  delete legacy.poemSignature;
  const snapshot = structuredClone(legacy);
  const settings = validateManuscript(legacy);
  assert.equal(settings.poemSignature, true);
  assert.deepEqual(legacy, snapshot);
  assert.equal(validateManuscript({ ...legacy, poemSignature: false }).poemSignature, false);
  assert.throws(() => validateManuscript({ ...legacy, poemSignature: 'true' }), /toggle/);
  const { project, documents } = fixture();
  project.manuscript = legacy as ReturnType<typeof defaultManuscript>;
  assert.ok(
    paginateManuscript(project, documents, project.manuscript, '', measure).pages.some((page) =>
      page.lines.some((line) => line.role === 'signature'),
    ),
  );
});
