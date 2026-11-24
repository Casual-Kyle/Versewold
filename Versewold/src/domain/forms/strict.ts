import { syllable } from 'syllable';
import type { DraftLine } from './composition.ts';
import type { MeterRule, PoetryForm } from './types.ts';

export interface SyllableEstimate {
  count: number;
  words: { text: string; count: number }[];
}

/** Offline English spelling-based estimates, not pronunciation/scansion. Tokenize
 * contractions together and hyphenated compounds separately. Never silently
 * count numbers, links/code, or unsupported scripts as zero syllables. */
export function estimateEnglishSyllables(text: string): SyllableEstimate | undefined {
  if (/\p{N}|https?:\/\/|www\.|`|\[[^\]]*\]\(/u.test(text)) return undefined;
  const tokens = text.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];
  if (!tokens.length) return undefined;
  const words: SyllableEstimate['words'] = [];
  for (const text of tokens) {
    const normalized = text.normalize('NFKD').replace(/\p{M}/gu, '').replace(/’/g, "'");
    if (!/^[a-z]+(?:'[a-z]+)*$/i.test(normalized)) return undefined;
    words.push({ text, count: Math.max(1, syllable(normalized)) });
  }
  return { count: words.reduce((total, word) => total + word.count, 0), words };
}

/** Strict count checking never treats stresses, morae, or quantitative lengths
 * as syllables. Conventional base counts are checked only when Strict is on. */
export function syllableTarget(meter?: MeterRule): number | undefined {
  if (!meter || meter.strength === 'optional') return undefined;
  if (meter.system === 'syllabic') return meter.syllables;
  if (meter.system === 'accentual-syllabic' && meter.pattern && meter.feet)
    return meter.pattern.length * meter.feet;
  return undefined;
}

export interface StrictLineCheck {
  status: 'empty' | 'unchecked' | 'match' | 'mismatch';
  label: string;
  detail: string;
  estimate?: SyllableEstimate;
}

/** Pure feedback over an existing layout row. Warnings never edit source text,
 * reject input, or invent missing verses. Rhyme/stress remain separate work. */
export function checkLineTargets(form: PoetryForm | undefined, row: DraftLine): StrictLineCheck {
  if (row.stanza === null || !row.text.trim()) return { status: 'empty', label: '', detail: '' };
  if (!form)
    return {
      status: 'unchecked',
      label: 'Not checked',
      detail: 'Choose an available form to check targets.',
    };
  if (!row.rule)
    return form.structure.kind === 'free'
      ? { status: 'unchecked', label: 'Open form', detail: 'No fixed count target for this line.' }
      : {
          status: 'mismatch',
          label: 'Extra line',
          detail: 'This line is outside the selected form’s line layout.',
        };
  const labels: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const target = syllableTarget(row.rule.meter);
  let estimate: SyllableEstimate | undefined;
  if (target !== undefined) {
    if (/^en(?:-|$)/i.test(form.language)) estimate = estimateEnglishSyllables(row.text);
    if (estimate) {
      labels.push(`≈ ${estimate.count}/${target} syll.`);
      const difference = estimate.count - target;
      if (difference)
        warnings.push(
          `${Math.abs(difference)} estimated syllable${Math.abs(difference) === 1 ? '' : 's'} ${difference > 0 ? 'over' : 'under'} target`,
        );
      notes.push('English spelling estimate; pronunciation and poetic elision may differ.');
    } else
      notes.push(
        'Syllables not checked: English words are required; numbers, links, code, and other scripts need a writer’s count.',
      );
  }
  if (row.rule.wordCount) {
    const count = row.text.trim().split(/\s+/u).length;
    labels.push(`${count}/${row.rule.wordCount} words`);
    if (count !== row.rule.wordCount) warnings.push('Word count differs from target');
  }
  return {
    status: warnings.length ? 'mismatch' : labels.length ? 'match' : 'unchecked',
    label: labels.join(' · ') || 'Not checked',
    detail:
      [...warnings, ...notes].join(' · ') ||
      'No syllable or word-count target. Rhyme, stress, morae, and syllable weight are not checked.',
    estimate,
  };
}
