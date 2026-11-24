import { draftLayout } from './composition.ts';
import type { FormLine, PoetryForm } from './types.ts';

export interface LineMapEntry {
  number: number;
  rule: FormLine;
  sourceLine?: number;
  active: boolean;
  label: string;
}

/** Navigate existing source positions only. Missing verses stay disabled rather
 * than inserting placeholders or forcing the writer's stanza layout. */
export function formLineMap(form: PoetryForm, body: string, sourceLine: number) {
  const { rows } = draftLayout(body, form);
  const active = rows[Math.max(0, Math.min(sourceLine, rows.length) - 1)]!;
  const stanza =
    active.stanza ??
    rows
      .slice(0, active.sourceLine)
      .reverse()
      .find((row) => row.stanza !== null)?.stanza ??
    0;
  const continuous = form.structure.unit === 'line';
  const repeating = form.structure.kind === 'repeating';
  const targets = continuous
    ? form.structure.stanzas.slice(0, 1)
    : repeating
      ? form.structure.stanzas.slice(0, 1)
      : form.structure.stanzas;
  let number = 0;
  let omitted = 0;
  const sections = targets
    .map((target, section) => ({
      label: continuous
        ? 'Continuous line target'
        : repeating
          ? `Stanza ${stanza + 1} · ${target.label}`
          : target.label,
      entries: target.lines.flatMap((rule, index): LineMapEntry[] => {
        const poemLine = ++number;
        // Bound the compact map for large custom templates. Full rules remain in
        // the expandable guide; no source text is limited or discarded.
        if (poemLine > 80) {
          omitted++;
          return [];
        }
        const row = continuous
          ? active.stanza === null
            ? undefined
            : active
          : rows.find((row) =>
              form.structure.lineMapping === 'poem'
                ? row.poemLine === poemLine && row.stanza !== null
                : row.stanza === (repeating ? stanza : section) && row.line === index + 1,
            );
        const displayNumber = continuous
          ? active.poemLine || 1
          : form.structure.lineMapping === 'poem'
            ? poemLine
            : index + 1;
        return [
          {
            number: displayNumber,
            rule,
            sourceLine: row?.sourceLine,
            active: row?.sourceLine === active.sourceLine,
            label:
              continuous || form.structure.lineMapping === 'poem'
                ? `poem line ${displayNumber}`
                : `stanza ${(repeating ? stanza : section) + 1}, line ${displayNumber}`,
          },
        ];
      }),
    }))
    .filter((section) => section.entries.length);
  return { sections, omitted };
}
