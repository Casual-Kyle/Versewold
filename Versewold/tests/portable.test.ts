import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reactive, toRaw } from 'vue';
import { createWorkspace, type Project } from '../src/domain/workspace.ts';
import type { PoetryForm } from '../src/domain/forms/types.ts';
import {
  manuscriptMarkdown,
  poemCopy,
  preparePoemImports,
  prepareProjectImport,
  projectCopy,
  projectForms,
  validateProjectTemplates,
} from '../src/domain/portable.ts';

const form = (id: string): PoetryForm =>
  JSON.parse(
    readFileSync(new URL(`../src/domain/forms/templates/${id}.json`, import.meta.url), 'utf8'),
  );
function fixture() {
  const workspace = createWorkspace();
  workspace.projects = [
    {
      schemaVersion: 1,
      id: 'project-1',
      title: 'Winter verses',
      poems: [
        { id: 'poem-2', title: 'Second light', file: 'poems/poem-2.md', formId: 'standard-habbie' },
        { id: 'poem-1', title: 'First light', file: 'poems/poem-1.md', formId: 'haiku-575' },
      ],
    },
  ];
  workspace.documents = {
    'project-1/poem-1': '  Rain — café\r\n\r\nSnow.\n',
    'project-1/poem-2': '# Actual heading\rLine two  \n',
  };
  return workspace;
}
const ids = () => {
  let next = 0;
  return () => `fresh-${++next}`;
};

test('collection planning survives copies and import with independent metadata and unchanged poem dates', () => {
  const workspace = fixture();
  const project = workspace.projects[0];
  project.description = '  Home — café\r\n\r\nA collection about return.\n';
  project.intendedTone = 'Reflective';
  project.themes = ['Home', 'Seasons'];
  project.poems[0].updatedAt = '2026-11-24T12:00:00Z';
  const before = structuredClone(workspace);
  const transfer = projectCopy(workspace, project, []);
  const imported = prepareProjectImport(transfer, workspace.projects, ids());
  assert.equal(imported.project.description, project.description);
  assert.equal(imported.project.intendedTone, project.intendedTone);
  assert.deepEqual(imported.project.themes, project.themes);
  assert.equal(imported.project.poems[0].updatedAt, project.poems[0].updatedAt);
  assert.equal(imported.documents['fresh-1/fresh-2'], workspace.documents['project-1/poem-2']);
  imported.project.themes![0] = 'Changed on the copy';
  assert.deepEqual(transfer.project.themes, ['Home', 'Seasons']);
  assert.deepEqual(workspace, before);
  const broken = structuredClone(transfer);
  broken.project.themes = [''];
  assert.throws(() => prepareProjectImport(broken, workspace.projects, ids()), /themes/);
  assert.deepEqual(workspace, before);
});

test('project import remaps theme identities and poem links together', () => {
  const workspace = fixture(), project = workspace.projects[0];
  project.themeDefinitions = [{ id: 'home', label: 'Home' }, { id: 'seasons', label: 'Seasons' }];
  project.poems[0].themeIds = ['home', 'seasons'];
  project.poems[0].tone = 'Reflective';
  project.poems[0].planningNotes = '  🌙 Notes\r\n\tAn ending.\n';
  const before = structuredClone(workspace);
  const transfer = projectCopy(workspace, project, []);
  const imported = prepareProjectImport(transfer, workspace.projects, ids());
  const themeIds = imported.project.themeDefinitions!.map((theme) => theme.id);
  assert.ok(themeIds.every((id) => !['home', 'seasons'].includes(id)));
  assert.deepEqual(imported.project.poems[0].themeIds, themeIds);
  assert.equal(imported.project.poems[0].planningNotes, project.poems[0].planningNotes);
  assert.equal(imported.project.poems[0].tone, 'Reflective');
  assert.equal(imported.documents[`${imported.project.id}/${imported.project.poems[0].id}`], workspace.documents['project-1/poem-2']);
  transfer.project.poems[0].themeIds = ['missing'];
  assert.throws(() => prepareProjectImport(transfer, workspace.projects, ids()), /missing collection theme/);
  assert.deepEqual(workspace, before);
});

test('poem copies carry planning labels and merge them into destination-local identities atomically', () => {
  const source = fixture(), project = source.projects[0];
  project.themeDefinitions = [{ id: 'source-home', label: 'Home' }, { id: 'source-season', label: 'Seasons' }];
  project.poems[0].themeIds = ['source-home', 'source-season'];
  project.poems[0].tone = 'Tender';
  project.poems[0].planningNotes = '  🌲 Notes\r\n\n';
  const transfer = poemCopy(project.poems[0], source.documents['project-1/poem-2'], [], project);
  assert.deepEqual(transfer.metadata.themes, ['Home', 'Seasons']);
  assert.ok(!('themeIds' in transfer.metadata));
  assert.throws(() => poemCopy(project.poems[0], 'A line', []), /theme vocabulary/);
  const destination = fixture().projects[0];
  destination.themes = ['home'];
  const before = structuredClone(destination);
  const staged = preparePoemImports([transfer], destination, [], ids());
  assert.equal(staged.themeDefinitions!.length, 2);
  assert.equal(staged.entries[0].themeIds![0], 'legacy-theme-1');
  assert.ok(!staged.entries[0].themeIds!.includes('source-home'));
  assert.equal(staged.entries[0].tone, 'Tender');
  assert.equal(staged.entries[0].planningNotes, transfer.metadata.planningNotes);
  assert.equal(staged.documents[`${destination.id}/${staged.entries[0].id}`], transfer.body);
  assert.deepEqual(destination, before);
  const bad = structuredClone(transfer);
  bad.metadata.tone = 'invalid\ntone';
  assert.throws(() => preparePoemImports([transfer, bad], destination, [], ids()));
  assert.deepEqual(destination, before);
});

test('project copies carry exact bodies, ordering and only used form snapshots', () => {
  const workspace = fixture();
  const before = structuredClone(workspace);
  const transfer = projectCopy(workspace, workspace.projects[0], [
    form('standard-habbie'),
    form('haiku-575'),
    form('free-verse'),
  ]);
  assert.deepEqual(
    transfer.project.poems.map((poem) => poem.id),
    ['poem-2', 'poem-1'],
  );
  assert.equal(transfer.documents['poem-1'], workspace.documents['project-1/poem-1']);
  assert.deepEqual(
    transfer.project.templates!.map((form) => form.id),
    ['standard-habbie', 'haiku-575'],
  );
  assert.ok(!JSON.stringify(transfer.project).includes('Actual heading'));
  assert.deepEqual(workspace, before);
});

test('load as copy remaps every ID/path without changing originals or newline bytes', () => {
  const workspace = fixture();
  const transfer = projectCopy(workspace, workspace.projects[0], [
    form('standard-habbie'),
    form('haiku-575'),
  ]);
  const original = structuredClone(transfer);
  const prepared = prepareProjectImport(transfer, workspace.projects, ids());
  assert.equal(prepared.project.title, 'Winter verses (imported)');
  assert.equal(prepared.project.id, 'fresh-1');
  assert.equal(prepared.project.poems[0].file, 'poems/fresh-2.md');
  assert.equal(prepared.documents['fresh-1/fresh-3'], workspace.documents['project-1/poem-1']);
  assert.deepEqual(transfer, original);
  const second = prepareProjectImport(transfer, [...workspace.projects, prepared.project], ids());
  assert.equal(second.project.title, 'Winter verses (imported 2)');
});

test('project form snapshots are scoped locally and old version 1 projects still work', () => {
  const library = [form('haiku-575')];
  const project: Project = { schemaVersion: 1, id: 'book', title: 'A book', poems: [] };
  assert.deepEqual(validateProjectTemplates(project), []);
  const custom = { ...form('haiku-575'), name: 'My haiku variant' };
  project.templates = [custom];
  assert.equal(projectForms(library, project)[0].name, 'My haiku variant');
  assert.equal(library[0].name, 'Haiku · 5–7–5 practice');
  project.templates = [custom, custom];
  assert.throws(() => validateProjectTemplates(project), /Duplicate/);
  project.templates = [{ ...custom, schemaVersion: 2 } as unknown as PoetryForm];
  assert.throws(() => validateProjectTemplates(project));
});

test('poem copies restore title/form and differing forms never change existing poems', () => {
  const workspace = fixture();
  const project = workspace.projects[0];
  const library = [form('standard-habbie'), form('haiku-575')];
  const transfer = poemCopy(project.poems[0], workspace.documents['project-1/poem-2'], library);
  transfer.metadata.template!.summary = 'A changed imported form';
  const before = structuredClone(project);
  const prepared = preparePoemImports([transfer], project, library, ids());
  assert.equal(prepared.entries[0].formId, 'imported-fresh-1');
  assert.equal(prepared.entries[0].title, 'Second light');
  assert.equal(prepared.documents['project-1/fresh-2'], transfer.body);
  assert.equal(prepared.templates[0].id, prepared.entries[0].formId);
  assert.deepEqual(project, before);
});

test('a template roundtrip with reordered JSON keys keeps its original form ID', () => {
  const workspace = fixture();
  const original = form('standard-habbie');
  const incoming = poemCopy(workspace.projects[0].poems[0], 'A line', [original]);
  incoming.metadata.template = Object.fromEntries(
    Object.entries(original).reverse(),
  ) as unknown as PoetryForm;
  const prepared = preparePoemImports([incoming], workspace.projects[0], [original], ids());
  assert.equal(prepared.entries[0].formId, 'standard-habbie');
  assert.equal(prepared.templates[0].id, 'standard-habbie');
});

test('invalid or incomplete imports are staged without partial workspace mutation', () => {
  const workspace = fixture();
  const before = structuredClone(workspace);
  const transfer = projectCopy(workspace, workspace.projects[0], []);
  delete transfer.documents['poem-1'];
  assert.throws(() => prepareProjectImport(transfer, workspace.projects, ids()), /Missing text/);
  const incoming = poemCopy(workspace.projects[0].poems[0], 'A line', [form('standard-habbie')]);
  const broken = structuredClone(incoming);
  broken.metadata.formId = 'wrong-form';
  assert.throws(
    () => preparePoemImports([incoming, broken], workspace.projects[0], [], ids()),
    /IDs differ/,
  );
  assert.deepEqual(workspace, before);
});

test('manuscript export keeps order and original source, escapes heading syntax', () => {
  const workspace = fixture();
  const transfer = projectCopy(workspace, workspace.projects[0], []);
  transfer.project.title = '*Winter*\nverses';
  const output = manuscriptMarkdown(transfer);
  assert.ok(output.startsWith('# \\*Winter\\* verses\n\n'));
  assert.ok(output.indexOf('## Second light') < output.indexOf('## First light'));
  assert.ok(output.includes(transfer.documents['poem-1']));
  assert.ok(output.includes(transfer.documents['poem-2']));
});

test('reactive workspace snapshots serialize with project-scoped templates', () => {
  const workspace = reactive(fixture());
  workspace.projects[0].templates = [form('standard-habbie')];
  const forms = projectForms([form('haiku-575')], workspace.projects[0]);
  const plainForms = structuredClone(toRaw(forms).map((form) => toRaw(form)));
  const transfer = projectCopy(
    structuredClone(toRaw(workspace)),
    structuredClone(toRaw(workspace.projects[0])),
    plainForms,
  );
  assert.equal(transfer.project.templates!.length, 2);
});
