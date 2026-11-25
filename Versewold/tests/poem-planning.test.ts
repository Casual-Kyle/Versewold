import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, type PoemEntry } from '../src/domain/workspace.ts';
import {
  addCollectionTheme, collectionThemes, removeCollectionTheme, renameCollectionTheme,
  themeUseCount, validateProjectThemes,
} from '../src/domain/projectThemes.ts';
import {
  browsePoems, poemThemeLabels, setPoemPlanning, setPoemThemes,
  validatePoemPlanning, validateProjectPlanning,
} from '../src/domain/poemPlanning.ts';

function fixture() {
  const workspace = createWorkspace();
  const poem = (id: string, sectionId?: string): PoemEntry => ({
    id, title: id, file: `poems/${id}.md`, formId: 'free-verse',
    composedOn: '2026-10-20', updatedAt: '2026-11-24T12:00:00Z',
    ...(sectionId ? { sectionId } : {}),
  });
  workspace.projects.push({
    schemaVersion: 1, id: 'book', title: 'Winter verses', themes: ['Home', 'Seasons'],
    sections: [{ id: 'first', title: 'Part I' }, { id: 'last', title: 'Part II' }],
    poems: [poem('late', 'last'), poem('early', 'first'), poem('unsectioned'), {
      ...poem('dedication'), kind: 'dedication',
    }],
  });
  for (const entry of workspace.projects[0].poems)
    workspace.documents[`book/${entry.id}`] = '  🌙 café\r\n\r\nA line.  \n';
  return workspace;
}

test('reading legacy themes, browsing, and empty planning edits never mutate a project', () => {
  const workspace = fixture();
  const before = structuredClone(workspace);
  const project = workspace.projects[0];
  assert.deepEqual(collectionThemes(project).map((theme) => theme.id), ['legacy-theme-1', 'legacy-theme-2']);
  assert.equal(browsePoems(project).total, 3);
  assert.equal(setPoemPlanning(project, project.poems[0], 'tone', ''), false);
  assert.equal(setPoemPlanning(project, project.poems[0], 'planningNotes', ''), false);
  assert.equal(setPoemThemes(project, project.poems[0], []), false);
  assert.deepEqual(workspace, before);
});

test('assigning a legacy theme freezes its identity; rename preserves links and poem source/dates', () => {
  const workspace = fixture();
  const project = workspace.projects[0];
  const bodies = structuredClone(workspace.documents);
  const original = project.poems.map((poem) => ({ id: poem.id, file: poem.file, composedOn: poem.composedOn, updatedAt: poem.updatedAt }));
  const id = collectionThemes(project)[0].id;
  assert.ok(setPoemThemes(project, project.poems[0], [id]));
  assert.ok(setPoemThemes(project, project.poems[1], [id]));
  assert.equal(project.themes, undefined);
  assert.equal(themeUseCount(project, id), 2);
  assert.ok(renameCollectionTheme(project, id, 'Belonging'));
  assert.deepEqual(project.poems[0].themeIds, [id]);
  assert.deepEqual(poemThemeLabels(project, project.poems[1]), ['Belonging']);
  const beforeRemoval = structuredClone(project);
  assert.throws(() => removeCollectionTheme(project, id), /Unassign/);
  assert.deepEqual(project, beforeRemoval);
  setPoemThemes(project, project.poems[0], []);
  setPoemThemes(project, project.poems[1], []);
  assert.ok(removeCollectionTheme(project, id));
  assert.equal(collectionThemes(project)[0].id, 'legacy-theme-2');
  assert.deepEqual(workspace.documents, bodies);
  assert.deepEqual(project.poems.map((poem) => ({ id: poem.id, file: poem.file, composedOn: poem.composedOn, updatedAt: poem.updatedAt })), original);
});

test('planning notes preserve Unicode and mixed whitespace and edits leave revision dates alone', () => {
  const workspace = fixture();
  const project = workspace.projects[0], poem = project.poems[0];
  const before = structuredClone(workspace);
  const notes = '  🌙 café\r\n\r\n\tRevise the ending.  \n';
  assert.ok(setPoemPlanning(project, poem, 'planningNotes', notes));
  assert.ok(setPoemPlanning(project, poem, 'tone', '🌙'.repeat(200)));
  assert.equal(poem.planningNotes, notes);
  assert.equal(setPoemPlanning(project, poem, 'planningNotes', notes), false);
  assert.throws(() => setPoemPlanning(project, poem, 'tone', '🌙'.repeat(201)));
  assert.throws(() => setPoemPlanning(project, poem, 'planningNotes', 'x'.repeat(20_001)));
  setPoemPlanning(project, poem, 'planningNotes', '');
  setPoemPlanning(project, poem, 'tone', '');
  assert.deepEqual(workspace, before);
});

test('bad links, invalid edits, and failed theme creation have no partial effects', () => {
  const project = fixture().projects[0], poem = project.poems[0];
  const before = structuredClone(project);
  for (const ids of [['missing'], ['legacy-theme-1', 'legacy-theme-1']])
    assert.throws(() => setPoemThemes(project, poem, ids));
  assert.throws(() => setPoemPlanning(project, { ...poem }, 'tone', 'Other collection'));
  assert.throws(() => setPoemPlanning(project, poem, 'tone', 'two\nlines'));
  assert.throws(() => setPoemPlanning(project, poem, 'planningNotes', 'bad\u0000notes'));
  assert.throws(() => addCollectionTheme(project, 'Other', () => 'legacy-theme-1'));
  assert.throws(() => addCollectionTheme(project, 'Other', () => '../bad'));
  assert.throws(() => addCollectionTheme(project, 'x'.repeat(81), () => 'new-theme'));
  assert.deepEqual(project, before);
  assert.equal(addCollectionTheme(project, 'home', () => 'unused'), undefined);
  assert.deepEqual(project, before);
});

test('tone/theme filters and groups preserve manuscript order and count unique poems', () => {
  const project = fixture().projects[0];
  const [home, seasons] = collectionThemes(project);
  setPoemThemes(project, project.poems[0], [home.id]);
  setPoemThemes(project, project.poems[1], [home.id, seasons.id]);
  setPoemPlanning(project, project.poems[0], 'tone', 'Reflective');
  setPoemPlanning(project, project.poems[1], 'tone', ' reflective ');
  const vocabulary = project.themeDefinitions;
  assert.equal(setPoemThemes(project, project.poems[1], [seasons.id, home.id]), false);
  assert.equal(project.themeDefinitions, vocabulary);
  const before = structuredClone(project);
  assert.deepEqual(browsePoems(project).matching.map((poem) => poem.id), ['unsectioned', 'early', 'late']);
  assert.deepEqual(browsePoems(project, { tone: 'REFLECTIVE' }).matching.map((poem) => poem.id), ['early', 'late']);
  assert.equal(browsePoems(project, { tone: null }).matching.length, 1);
  assert.equal(browsePoems(project, { themeId: null }).matching.length, 1);
  assert.equal(browsePoems(project, { themeId: seasons.id }).matching[0].id, 'early');
  const groups = browsePoems(project, { groupBy: 'theme' });
  assert.equal(groups.matching.length, 3);
  assert.equal(groups.groups.reduce((count, group) => count + group.poems.length, 0), 4);
  assert.equal(browsePoems(project, { tone: 'missing' }).groups.length, 0);
  assert.equal(browsePoems(project, { groupBy: 'tone' }).groups.length, 2);
  assert.deepEqual(project, before);
});

test('invalid vocabularies and dangling references are rejected at the project boundary', () => {
  const project = fixture().projects[0];
  assert.throws(() => validateProjectPlanning({ ...project, poems: [{ ...project.poems[0], themeIds: ['legacy-theme-1'] }] }));
  assert.throws(() => validateProjectThemes({ themeDefinitions: [{ id: 'same', label: 'A' }, { id: 'same', label: 'B' }] }));
  assert.throws(() => validateProjectThemes({ themes: ['Old'], themeDefinitions: [{ id: 'new', label: 'New' }] }));
  assert.throws(() => validatePoemPlanning({ themeIds: ['same', 'same'] }));
  assert.throws(() => validatePoemPlanning({ planningNotes: [] } as never));
});
