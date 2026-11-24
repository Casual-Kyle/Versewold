import type { PoetryForm } from '../types';
declare const validate: {
  (input: unknown): input is PoetryForm;
  errors: null | { instancePath: string; message?: string }[];
};
export default validate;
