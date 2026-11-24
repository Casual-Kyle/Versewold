import validate from './generated/validate.js';
import type { PoetryForm } from './types.ts';

/** Uses a precompiled schema: custom JSON never executes code or needs unsafe-eval. */
export function createFormValidator() {
  return (input: unknown): PoetryForm => {
    if (!validate(input))
      throw new Error(
        validate.errors?.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; '),
      );
    const refrains = new Set<string>();
    const endWords = new Set<string>();
    if (input.catalog?.variants?.includes(input.id))
      throw new Error('A form cannot link to itself as a variant.');
    if (input.structure.lineMapping === 'poem' && input.structure.kind !== 'fixed')
      throw new Error('Whole-poem line mapping requires a fixed line sequence.');
    if (input.catalog?.status === 'reference' && input.structure.kind !== 'free')
      throw new Error('Reference entries must not prescribe a writing layout.');
    if (input.catalog?.status === 'structured' && input.structure.kind === 'free')
      throw new Error('A structural template must supply a layout.');
    if (
      input.structure.unit === 'line' &&
      (input.structure.kind !== 'repeating' || input.structure.stanzas[0]?.lines.length !== 1)
    )
      throw new Error('Continuous line units require one repeatable line.');
    for (const stanza of input.structure.stanzas) {
      for (const line of stanza.lines) {
        for (const rhyme of line.internalRhymes ?? []) {
          if (line.meter?.system === 'syllabic' && rhyme.syllable > line.meter.syllables!)
            throw new Error(`Internal rhyme ${rhyme.group} falls outside the line.`);
        }
        if (line.endWord) endWords.add(line.endWord);
        if (!line.refrain) continue;
        const { id, role } = line.refrain;
        if (role === 'define') {
          if (refrains.has(id)) throw new Error(`Refrain ${id} is defined twice.`);
          refrains.add(id);
        } else if (!refrains.has(id)) {
          throw new Error(`Refrain ${id} repeats before its definition.`);
        }
      }
    }
    for (const stanza of input.structure.stanzas) {
      for (const line of stanza.lines) {
        for (const word of line.containsEndWords ?? []) {
          if (!endWords.has(word)) throw new Error(`Unknown end-word group ${word}.`);
        }
      }
    }
    return input;
  };
}
