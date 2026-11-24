import type { PoetryForm } from './types.ts';

/** Preserve the writer's exact whitespace elsewhere; normalize only for guidance. */
export function poemStats(body: string) {
  const text = body.trim();
  return {
    words: text ? (text.match(/\S+/gu)?.length ?? 0) : 0,
    lines: text ? text.split(/\r?\n/).filter((line) => line.trim()).length : 0,
    stanzas: text ? text.split(/\r?\n\s*\r?\n/).filter((stanza) => stanza.trim()).length : 0,
  };
}

export function structureIssues(form: PoetryForm, body: string): string[] {
  if (!body.trim() || form.structure.kind === 'free' || form.structure.unit === 'line') return [];
  const actual = body
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((s) => s.split(/\r?\n/).filter((l) => l.trim()));
  const expected = form.structure.stanzas;
  const issues: string[] = [];
  if (form.structure.lineMapping === 'poem') {
    const rules = expected.flatMap((stanza) => stanza.lines);
    const lines = actual.flat();
    if (lines.length !== rules.length)
      issues.push(`This form has ${rules.length} lines; your draft has ${lines.length}.`);
    lines.forEach((line, index) => {
      const target = rules[index]?.wordCount;
      const count = line.trim().split(/\s+/u).length;
      if (target && target !== count)
        issues.push(`Line ${index + 1}: ${count} of ${target} suggested words.`);
    });
    return issues;
  }
  if (form.structure.maxStanzas && actual.length > form.structure.maxStanzas)
    issues.push(
      `This variant suggests at most ${form.structure.maxStanzas} stanzas; your draft has ${actual.length}.`,
    );
  if (form.structure.kind === 'fixed' && actual.length !== expected.length) {
    issues.push(
      `This form has ${expected.length} stanza${expected.length === 1 ? '' : 's'}; your draft has ${actual.length}.`,
    );
  }
  actual.forEach((lines, i) => {
    const guide = form.structure.kind === 'repeating' ? expected[0] : expected[i];
    if (guide && lines.length !== guide.lines.length)
      issues.push(`Stanza ${i + 1}: ${lines.length} of ${guide.lines.length} suggested lines.`);
    lines.forEach((line, lineIndex) => {
      const target = guide?.lines[lineIndex]?.wordCount;
      const count = line.trim().split(/\s+/u).length;
      if (target && target !== count)
        issues.push(
          `Stanza ${i + 1}, line ${lineIndex + 1}: ${count} of ${target} suggested words.`,
        );
    });
  });
  return issues;
}
