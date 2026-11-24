import type { PoetryForm } from './types.ts';

/** Report the actual available rules, rather than implying every catalog entry
 * has a fully specified rhyme/meter plan merely because Guided view is enabled. */
export function formGuidance(form?: PoetryForm) {
  const lines = form?.structure.stanzas.flatMap((stanza) => stanza.lines) ?? [];
  const targets = lines.some(
    (line) =>
      line.rhyme ||
      line.wordCount ||
      line.endWord ||
      line.refrain ||
      line.internalRhymes?.length ||
      (line.meter && line.meter.system !== 'free'),
  );
  const level = !form ? 'missing' : targets ? 'line' : lines.length ? 'layout' : 'notes';
  const label = {
    missing: 'Template unavailable',
    line: 'Line-by-line guidance',
    layout: 'Layout-only guidance',
    notes: 'Notes-only guidance',
  }[level];
  const hasRhyme = lines.some((line) => line.rhyme);
  const scheme = hasRhyme
    ? form!.structure.stanzas
        .map((stanza) => stanza.lines.map((line) => line.rhyme ?? '—').join(''))
        .join(' ')
    : '';
  const count =
    form?.structure.unit === 'line'
      ? 'Continuous line targets'
      : lines.length
        ? `${lines.length} ${lines.length === 1 ? 'line' : 'lines'}${form?.structure.kind === 'repeating' ? ' per stanza' : ''}`
        : '';
  const syllabic =
    lines.length && lines.length <= 16 && lines.every((line) => line.meter?.system === 'syllabic')
      ? `${lines.map((line) => line.meter!.syllables).join('–')} syllable targets`
      : '';
  const rhyme = hasRhyme
    ? `Rhyme ${scheme}`
    : targets
      ? 'No prescribed end rhyme'
      : 'No end-rhyme scheme specified';
  const detail = !form
    ? 'Restore its template or choose another form.'
    : [count || 'No fixed line targets', syllabic, rhyme].filter(Boolean).join(' · ');
  return { level, label, detail, hasRhyme, totalLines: lines.length };
}

export function rhymeMarkerDescription(form: PoetryForm | undefined, hasRule: boolean) {
  if (hasRule) return 'No prescribed end rhyme for this line';
  const profile = formGuidance(form);
  if (profile.level === 'notes') return 'Notes-only guidance; no fixed line targets';
  if (profile.level === 'missing') return 'Template unavailable';
  return 'Line beyond the template';
}
