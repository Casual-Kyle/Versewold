import { documentKey, type PoemEntry, type Project, type Workspace } from './workspace.ts';
import type { PoetryForm } from './forms/types.ts';
import { createFormValidator } from './forms/validate.ts';
import { validateProjectStructure, manuscriptGroups } from './manuscript/structure.ts';
import { validateManuscript } from './manuscript/settings.ts';

export interface ProjectTransfer {
  project: Project;
  documents: Record<string, string>;
}
export interface PoemTransfer {
  metadata: {
    schemaVersion: 1;
    title: string;
    formId: string;
    template?: PoetryForm;
    kind?: PoemEntry['kind'];
    author?: string;
    composedOn?: string;
    updatedAt?: string;
  };
  body: string;
}

/** Form snapshots belong to their project, never overwrite the global library. */
export function validateProjectTemplates(project: Project): PoetryForm[] {
  validateProjectStructure(project);
  if (project.manuscript) validateManuscript(project.manuscript);
  if (project.templates === undefined) return [];
  if (!Array.isArray(project.templates) || project.templates.length > 1000)
    throw new Error('Invalid project templates.');
  const validate = createFormValidator();
  const ids = new Set<string>();
  return project.templates.map((template) => {
    const form = validate(template);
    if (ids.has(form.id)) throw new Error(`Duplicate project template: ${form.id}`);
    ids.add(form.id);
    return form;
  });
}

export function projectForms(library: PoetryForm[], project?: Project): PoetryForm[] {
  const merged = new Map(library.map((form) => [form.id, form]));
  for (const form of project?.templates ?? []) merged.set(form.id, form);
  return [...merged.values()];
}

export function projectCopy(
  workspace: Workspace,
  project: Project,
  forms: PoetryForm[],
): ProjectTransfer {
  const used = new Set(project.poems.map((poem) => poem.formId));
  const copy = structuredClone(project);
  copy.templates = structuredClone(forms.filter((form) => used.has(form.id)));
  validateProjectTemplates(copy);
  const documents: Record<string, string> = {};
  for (const poem of project.poems) {
    const body = workspace.documents[documentKey(project.id, poem.id)];
    if (typeof body !== 'string') throw new Error(`Missing text for ${poem.title}.`);
    documents[poem.id] = body;
  }
  return { project: copy, documents };
}

export function poemCopy(poem: PoemEntry, body: string, forms: PoetryForm[]): PoemTransfer {
  const template = forms.find((form) => form.id === poem.formId);
  return {
    metadata: {
      schemaVersion: 1,
      title: poem.title,
      formId: poem.formId,
      ...(poem.kind ? { kind: poem.kind } : {}),
      ...(poem.author !== undefined ? { author: poem.author } : {}),
      ...(poem.composedOn ? { composedOn: poem.composedOn } : {}),
      ...(poem.updatedAt ? { updatedAt: poem.updatedAt } : {}),
      ...(template ? { template: structuredClone(template) } : {}),
    },
    body,
  };
}

function uniqueTitle(title: string, existing: Project[]) {
  const used = new Set(existing.map((project) => project.title.toLocaleLowerCase()));
  if (!used.has(title.toLocaleLowerCase())) return title;
  let index = 1;
  let candidate: string;
  do {
    candidate = `${title} (imported${index === 1 ? '' : ` ${index}`})`;
    index++;
  } while (used.has(candidate.toLocaleLowerCase()));
  return candidate;
}

/** Validate everything before a view mutates the live workspace. Fresh IDs make
 * loading a copy safe even when its original project is already open. */
export function prepareProjectImport(
  transfer: ProjectTransfer,
  existing: Project[],
  id: () => string,
) {
  const templates = validateProjectTemplates(transfer.project);
  const projectId = id();
  const sectionIds = new Map(
    (transfer.project.sections ?? []).map((section) => [section.id, id()]),
  );
  const seen = new Set<string>();
  const documents: Record<string, string> = {};
  const poems = transfer.project.poems.map((poem) => {
    if (seen.has(poem.id)) throw new Error('Duplicate poem ID in imported project.');
    seen.add(poem.id);
    const body = transfer.documents[poem.id];
    if (typeof body !== 'string') throw new Error(`Missing text for ${poem.title}.`);
    const poemId = id();
    documents[documentKey(projectId, poemId)] = body;
    return {
      ...poem,
      id: poemId,
      file: `poems/${poemId}.md`,
      ...(poem.sectionId ? { sectionId: sectionIds.get(poem.sectionId)! } : {}),
    };
  });
  return {
    project: {
      ...structuredClone(transfer.project),
      id: projectId,
      title: uniqueTitle(transfer.project.title, existing),
      poems,
      templates: structuredClone(templates),
      ...(transfer.project.sections
        ? {
            sections: transfer.project.sections.map((section) => ({
              ...section,
              id: sectionIds.get(section.id)!,
            })),
          }
        : {}),
    },
    documents,
  };
}

export function preparePoemImports(
  incoming: PoemTransfer[],
  project: Project,
  library: PoetryForm[],
  id: () => string,
) {
  const templates = structuredClone(project.templates ?? []);
  const known = new Map(projectForms(library, project).map((form) => [form.id, form]));
  const validate = createFormValidator();
  const entries: PoemEntry[] = [];
  const documents: Record<string, string> = {};
  for (const poem of incoming) {
    if (poem.metadata.schemaVersion !== 1 || typeof poem.body !== 'string')
      throw new Error('Invalid poem copy.');
    let formId = poem.metadata.formId;
    if (poem.metadata.template) {
      let template = structuredClone(validate(poem.metadata.template));
      if (template.id !== formId) throw new Error('Poem metadata and template IDs differ.');
      const existing = known.get(formId);
      if (existing && formSignature(existing) !== formSignature(template)) {
        // A differing imported definition must not change earlier poems.
        formId = `imported-${id()}`;
        template = { ...template, id: formId, name: `${template.name} (imported)` };
        validate(template);
      }
      if (!templates.some((form) => form.id === formId)) templates.push(template);
      known.set(formId, template);
    }
    const poemId = id();
    const { kind, author, composedOn, updatedAt } = poem.metadata;
    entries.push({
      id: poemId,
      title: poem.metadata.title,
      file: `poems/${poemId}.md`,
      formId,
      ...(kind ? { kind } : {}),
      ...(author !== undefined ? { author } : {}),
      ...(composedOn ? { composedOn } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    });
    documents[documentKey(project.id, poemId)] = poem.body;
  }
  validateProjectStructure({ ...project, poems: [...project.poems, ...entries] });
  return { entries, documents, templates };
}

// Rust's JSON maps can serialize keys in a different order. Compare definitions
// structurally, while retaining the meaningful ordering of stanza/line arrays.
function formSignature(form: PoetryForm): string {
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, canonical(value)]),
      );
    return value;
  }
  return JSON.stringify(canonical(form));
}

const heading = (title: string) =>
  title
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/[\\`*_{}\[\]<>()#!|]/gu, '\\$&');

/** Export adds collection/poem headings and separators around exact source
 * bodies. A standalone poem export remains byte-for-byte manuscript text. */
export function manuscriptMarkdown(transfer: ProjectTransfer): string {
  return (
    `# ${heading(transfer.project.title)}\n\n` +
    manuscriptGroups(transfer.project)
      .filter((group) => group.title || group.documents.length)
      .map(
        (group) =>
          (group.title ? `## ${heading(group.title)}\n\n` : '') +
          group.documents
            .map((poem) => {
              const body = transfer.documents[poem.id];
              if (typeof body !== 'string') throw new Error(`Missing text for ${poem.title}.`);
              return `${group.title ? '###' : '##'} ${heading(poem.title)}\n\n${body}`;
            })
            .join('\n\n---\n\n'),
      )
      .join('\n\n---\n\n')
  );
}
