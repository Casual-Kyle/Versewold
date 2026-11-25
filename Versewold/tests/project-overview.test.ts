import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, type Project } from '../src/domain/workspace.ts';
import { collectionThemes } from '../src/domain/projectThemes.ts';
import {
  addProjectTheme,
  overviewLimits,
  removeProjectTheme,
  renameProject,
  setProjectPlanning,
  validateProjectOverview,
} from '../src/domain/projectOverview.ts';

function fixture() {
  const workspace = createWorkspace();
  workspace.settings.activeProjectId = 'book';
  workspace.settings.activePoemId = 'poem';
  workspace.projects.push({
    schemaVersion: 1,
    id: 'book',
    title: 'Winter verses',
    poems: [{
      id: 'poem',
      title: 'First light',
      formId: 'free-verse',
      file: 'poems/poem.md',
      composedOn: '2026-10-20',
      updatedAt: '2026-11-24T12:00:00Z',
    }],
  });
  workspace.documents['book/poem'] = '  🌙 café\r\n\r\nA line.  \n';
  return workspace;
}

test('renaming preserves project identity, poem paths, selection, dates, and exact Markdown', () => {
  const workspace = fixture();
  const before = structuredClone(workspace);
  assert.ok(renameProject(workspace.projects[0], '  Seasons & home  ', workspace.projects));
  const expected = structuredClone(before);
  expected.projects[0].title = 'Seasons & home';
  assert.deepEqual(workspace, expected);
  assert.equal(renameProject(workspace.projects[0], 'Seasons & home', workspace.projects), false);
  assert.deepEqual(workspace, expected);
});

test('invalid or duplicate names leave every workspace field unchanged', () => {
  const workspace = fixture();
  workspace.projects.push({ schemaVersion: 1, id: 'other', title: ' Summer ', poems: [] });
  const before = structuredClone(workspace);
  for (const name of ['', '   ', 'summer', 'winter\nverses', 'x'.repeat(161)]) {
    assert.throws(() => renameProject(workspace.projects[0], name, workspace.projects));
    assert.deepEqual(workspace, before);
  }
});

test('planning and theme edits preserve poem data and retain exact description whitespace', () => {
  const workspace = fixture();
  const project = workspace.projects[0];
  const before = structuredClone(workspace);
  const description = '  Home — café 🌲\r\n\r\n\tWhat makes a place ours?  \n';
  assert.ok(setProjectPlanning(project, 'description', description));
  assert.ok(setProjectPlanning(project, 'intendedTone', 'Reflective, quietly hopeful'));
  assert.ok(addProjectTheme(project, '  Belonging  '));
  assert.ok(addProjectTheme(project, 'Seasons'));
  assert.deepEqual(collectionThemes(project).map((theme) => theme.label), ['Belonging', 'Seasons']);
  assert.equal(project.description, description);
  assert.deepEqual(project.poems, before.projects[0].poems);
  assert.deepEqual(workspace.documents, before.documents);
  assert.deepEqual(workspace.settings, before.settings);
  assert.equal(setProjectPlanning(project, 'description', description), false);
  const populated = structuredClone(project);
  assert.equal(addProjectTheme(project, 'belonging'), false);
  assert.deepEqual(project, populated);
  assert.ok(removeProjectTheme(project, 0));
  assert.deepEqual(collectionThemes(project).map((theme) => theme.label), ['Seasons']);
  assert.ok(removeProjectTheme(project, 0));
  assert.ok(setProjectPlanning(project, 'description', ''));
  assert.ok(setProjectPlanning(project, 'intendedTone', ''));
  assert.deepEqual(workspace, before);
});

test('older projects need no planning fields and validation is read-only', () => {
  const project = fixture().projects[0];
  const before = structuredClone(project);
  validateProjectOverview(project);
  assert.deepEqual(project, before);
  assert.equal(removeProjectTheme(project, 0), false);
  assert.deepEqual(project, before);
});

test('planning limits and invalid imported values fail before editing the project', () => {
  const project = fixture().projects[0];
  const before = structuredClone(project);
  assert.throws(() => setProjectPlanning(project, 'description', 'x'.repeat(20_001)));
  assert.throws(() => setProjectPlanning(project, 'description', 'text\u0000'));
  assert.throws(() => setProjectPlanning(project, 'intendedTone', 'two\nlines'));
  assert.throws(() => addProjectTheme(project, 'x'.repeat(81)));
  assert.throws(() => addProjectTheme(project, '   '));
  assert.deepEqual(project, before);
  for (const invalid of [
    { description: 12 },
    { intendedTone: [] },
    { themes: 'home' },
    { themes: [''] },
    { themes: [null] },
    { themes: ['bad\ttheme'] },
  ])
    assert.throws(() => validateProjectOverview({ ...project, ...invalid } as unknown as Project));
  project.themes = Array.from({ length: overviewLimits.themes }, (_, index) => `Theme ${index}`);
  const full = structuredClone(project);
  assert.throws(() => addProjectTheme(project, 'Another theme'));
  assert.deepEqual(project, full);
  for (const index of [-1, 50, 0.5, NaN]) assert.equal(removeProjectTheme(project, index), false);
  assert.deepEqual(project, full);
});

test('Unicode limits count code points consistently with the native model', () => {
  const project = fixture().projects[0];
  assert.ok(renameProject(project, '🌙'.repeat(160), [project]));
  assert.throws(() => renameProject(project, '🌙'.repeat(161), [project]));
  assert.ok(setProjectPlanning(project, 'description', '🌲'.repeat(20_000)));
  assert.throws(() => setProjectPlanning(project, 'description', '🌲'.repeat(20_001)));
  assert.ok(addProjectTheme(project, '🌙'.repeat(80)));
  assert.throws(() => addProjectTheme(project, '🌙'.repeat(81)));
});
