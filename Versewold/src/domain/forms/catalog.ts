import { createFormValidator } from './validate';
import type { PoetryForm } from './types';

const validate = createFormValidator();
// Adding a bundled form means adding a JSON file, never changing an editor component.
const modules = import.meta.glob('./templates/*.json', { eager: true, import: 'default' });
export const bundledForms: PoetryForm[] = Object.values(modules)
  .map(validate)
  .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
