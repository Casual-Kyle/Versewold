import type { FormLine, MeterRule, PoetryForm } from './types.ts';

export interface DraftLine {
  sourceLine: number;
  from: number;
  to: number;
  text: string;
  stanza: number | null;
  line: number;
  poemLine: number;
  stanzaStart: boolean;
  prospective: boolean;
  rule?: FormLine;
  section?: { label: string; line: number; length: number };
}
export interface DraftStanza {
  index: number;
  from: number;
  written: number;
  expected?: number;
  label?: string;
}
export const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, '\n');

export function stanzaRule(form: PoetryForm | undefined, index: number) {
  return form?.structure.kind === 'repeating'
    ? form.structure.stanzas[0]
    : form?.structure.stanzas[index];
}

/** Blank lines remain separators, not invented verses. The final empty source
 * line is a writing position: Enter continues a stanza; Enter twice starts one. */
export function draftLayout(body: string, form?: PoetryForm) {
  const text = normalizeNewlines(body);
  const lines = text.split('\n');
  const rows: DraftLine[] = [];
  const sequence =
    form?.structure.lineMapping === 'poem'
      ? form.structure.stanzas.flatMap((stanza) =>
          stanza.lines.map((rule, index) => ({
            rule,
            section: { label: stanza.label, line: index + 1, length: stanza.lines.length },
          })),
        )
      : undefined;
  let stanza = -1;
  let line = 0;
  let poemLine = 0;
  let gap = true;
  let offset = 0;
  lines.forEach((value, index) => {
    const content = Boolean(value.trim());
    const prospective = !content && index === lines.length - 1;
    let stanzaStart = false;
    let currentStanza: number | null = null;
    let currentLine = 0;
    if (content) {
      stanzaStart = gap;
      if (gap) {
        stanza++;
        line = 0;
      }
      currentStanza = stanza;
      currentLine = ++line;
      poemLine++;
      gap = false;
    } else if (prospective) {
      stanzaStart = gap || stanza < 0;
      currentStanza = stanzaStart ? stanza + 1 : stanza;
      currentLine = stanzaStart ? 1 : line + 1;
    } else {
      gap = true;
    }
    const stanzaTarget = currentStanza === null ? undefined : stanzaRule(form, currentStanza);
    const sequenceLine =
      currentStanza === null ? undefined : sequence?.[poemLine + (prospective ? 1 : 0) - 1];
    const rule = sequence
      ? sequenceLine?.rule
      : form?.structure.unit === 'line' && currentStanza !== null
        ? form.structure.stanzas[0]?.lines[0]
        : stanzaTarget?.lines[currentLine - 1];
    rows.push({
      sourceLine: index + 1,
      from: offset,
      to: offset + value.length,
      text: value,
      stanza: currentStanza,
      line: currentLine,
      poemLine: currentStanza === null ? 0 : poemLine + (prospective ? 1 : 0),
      stanzaStart,
      prospective,
      rule,
      section: sequenceLine?.section,
    });
    offset += value.length + 1;
  });
  const stanzas: DraftStanza[] = [];
  for (const row of rows) {
    if (row.stanza === null) continue;
    let entry = stanzas.find((item) => item.index === row.stanza);
    if (!entry) {
      const target = stanzaRule(form, row.stanza);
      entry = {
        index: row.stanza,
        from: row.from,
        written: 0,
        expected: form?.structure.unit === 'line' || sequence ? undefined : target?.lines.length,
        label: form?.structure.kind === 'fixed' && !sequence ? target?.label : undefined,
      };
      stanzas.push(entry);
    }
    if (!row.prospective) entry.written++;
  }
  return { rows, stanzas };
}

export function meterSummary(meter?: MeterRule): string {
  if (!meter || meter.system === 'free') return 'Open rhythm';
  if (meter.system === 'syllabic') return `${meter.syllables} syllables`;
  if (meter.system === 'accentual') return `${meter.beats} stresses`;
  if (meter.system === 'moraic') return `${meter.morae} morae`;
  if (meter.system === 'quantitative') return `Weight: ${meter.quantityPattern}`;
  if (meter.pattern === 'u/' && meter.feet === 5) return 'Iambic pentameter · 5 feet';
  return `${meter.pattern} × ${meter.feet} feet`;
}

/** A base syllable target is never a count of the writer's pronunciation. */
export function inlineTarget(row: DraftLine): string {
  if (row.stanza === null) return '';
  if (row.rule?.wordCount) {
    const words = row.text.trim() ? row.text.trim().split(/\s+/u).length : 0;
    return `${words}/${row.rule.wordCount} words`;
  }
  const meter = row.rule?.meter;
  if (!meter || meter.system === 'free') return '';
  if (meter.system === 'syllabic') return `${meter.syllables} syll. target`;
  if (meter.system === 'accentual-syllabic')
    return `${(meter.pattern?.length ?? 0) * (meter.feet ?? 0)} syll. target`;
  return `${meterSummary(meter)} target`;
}

export function rhymeTone(group = '') {
  return `rhyme-tone-${Math.abs([...group.toUpperCase()].reduce((sum, letter) => sum + letter.charCodeAt(0), -65)) % 5}`;
}

export function lineGuidance(form: PoetryForm, rows: DraftLine[], active: DraftLine) {
  const group = active.rule?.rhyme;
  const endings = new Map<string, string>();
  if (group)
    for (const row of rows) {
      if (row.sourceLine === active.sourceLine || row.rule?.rhyme !== group || !row.text.trim())
        continue;
      if (form.structure.rhymeScope === 'stanza' && row.stanza !== active.stanza) continue;
      const word = row.text.match(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu)?.at(-1);
      if (word) endings.set(word.toLocaleLowerCase(), word);
    }
  const refrain = active.rule?.refrain;
  const original =
    refrain?.role === 'repeat'
      ? rows.find(
          (row) =>
            row.rule?.refrain?.id === refrain.id &&
            row.rule.refrain.role === 'define' &&
            row.text.trim(),
        )
      : undefined;
  return { endings: [...endings.values()], refrain: original?.text };
}

export interface SourceChange {
  from: number;
  to: number;
  insert: string;
}

/** CodeMirror uses LF offsets. Translate only changed spans back to the exact
 * stored text, retaining untouched CRLF/CR/LF, whitespace, and trailing newlines. */
export function applySourceChanges(source: string, changes: SourceChange[]): string {
  const offsets = [0];
  for (let raw = 0; raw < source.length;) {
    raw += source[raw] === '\r' && source[raw + 1] === '\n' ? 2 : 1;
    offsets.push(raw);
  }
  const ending = source.match(/\r\n|\r|\n/)?.[0] ?? '\n';
  let result = source;
  for (const change of [...changes].sort((a, b) => b.from - a.from)) {
    if (change.from < 0 || change.to < change.from || change.to >= offsets.length)
      throw new Error('The editor change is outside the source document.');
    result =
      result.slice(0, offsets[change.from]) +
      normalizeNewlines(change.insert).replace(/\n/g, ending) +
      result.slice(offsets[change.to]);
  }
  return result;
}
