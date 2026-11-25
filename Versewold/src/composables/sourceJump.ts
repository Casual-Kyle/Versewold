import { shallowRef } from 'vue';
import type { WordLocation } from '../domain/wordExplorer';

type SourceJump = WordLocation & { projectId: string; poemId: string };

// The jump belongs to this navigation and stays out of the URL and project files.
export const pendingSourceJump = shallowRef<SourceJump>();
