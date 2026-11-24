import type { PoetryForm } from './forms/types.ts';
import type { ManuscriptSettings } from './manuscript/types.ts';
/** Disk manifests contain metadata and ordering; poem bodies live only in Markdown. */
export interface PoemEntry {
  id: string;
  title: string;
  file: string;
  formId: string;
  kind?: 'poem' | 'dedication' | 'about' | 'text';
  sectionId?: string;
  author?: string;
  composedOn?: string;
  updatedAt?: string;
}

export interface Project {
  schemaVersion: 1;
  id: string;
  title: string;
  poems: PoemEntry[];
  /** Optional version 1 addition: portable, project-scoped form definitions. */
  templates?: PoetryForm[];
  sections?: { id: string; title: string }[];
  authorName?: string;
  manuscript?: ManuscriptSettings;
}

export interface WorkspaceSettings {
  schemaVersion: 1;
  activeProjectId: string | null;
  activePoemId: string | null;
  /** Retained only until the old choices reach the roaming preferences file. */
  showGuidance?: boolean;
  editorFontSize?: number;
}

export interface Workspace {
  settings: WorkspaceSettings;
  projects: Project[];
  /** Transient transport map, never serialized into project.json or settings.json. */
  documents: Record<string, string>;
}

export function createWorkspace(): Workspace {
  return {
    settings: {
      schemaVersion: 1,
      activeProjectId: null,
      activePoemId: null,
    },
    projects: [],
    documents: {},
  };
}

export const documentKey = (projectId: string, poemId: string) => `${projectId}/${poemId}`;
