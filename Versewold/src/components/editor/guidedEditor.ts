import { RangeSet, StateEffect, StateField, type EditorState, type Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import { draftLayout, inlineTarget, rhymeTone } from '../../domain/forms/composition.ts';
import type { PoetryForm } from '../../domain/forms/types';
import { rhymeMarkerDescription } from '../../domain/forms/guidance.ts';
import { checkLineTargets } from '../../domain/forms/strict.ts';

export const refreshGuidance = StateEffect.define<void>();

class VerseMarker extends GutterMarker {
  readonly number: string;
  readonly rhyme: string;
  readonly title: string;
  constructor(number: string, rhyme: string, title: string) {
    super();
    this.number = number;
    this.rhyme = rhyme;
    this.title = title;
  }
  eq(other: VerseMarker) {
    return this.number === other.number && this.rhyme === other.rhyme && this.title === other.title;
  }
  toDOM() {
    const wrapper = document.createElement('span');
    wrapper.className = 'verse-marker';
    wrapper.title = this.title;
    const number = document.createElement('span');
    number.className = 'verse-number';
    number.textContent = this.number;
    wrapper.append(number);
    if (this.rhyme) {
      const rhyme = document.createElement('span');
      rhyme.className = `rhyme-label ${this.rhyme === '—' ? 'rhyme-unprescribed' : rhymeTone(this.rhyme)}`;
      rhyme.textContent = this.rhyme;
      wrapper.append(rhyme);
    }
    return wrapper;
  }
}

class StanzaHeading extends WidgetType {
  readonly label: string;
  readonly detail: string;
  constructor(label: string, detail: string) {
    super();
    this.label = label;
    this.detail = detail;
  }
  eq(other: StanzaHeading) {
    return this.label === other.label && this.detail === other.detail;
  }
  toDOM() {
    const heading = document.createElement('div');
    heading.className = 'stanza-heading';
    heading.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = this.label;
    const detail = document.createElement('small');
    detail.textContent = this.detail;
    heading.append(label, detail);
    return heading;
  }
}

class TargetHint extends WidgetType {
  readonly label: string;
  readonly warning: boolean;
  constructor(label: string, warning = false) {
    super();
    this.label = label;
    this.warning = warning;
  }
  eq(other: TargetHint) {
    return this.label === other.label && this.warning === other.warning;
  }
  toDOM() {
    const hint = document.createElement('span');
    hint.className = `verse-target${this.warning ? ' strict-target-warning' : ''}`;
    hint.textContent = this.label;
    hint.setAttribute('aria-hidden', 'true');
    return hint;
  }
}

/** Block headings must come from a state field, so CodeMirror can measure them
 * before layout. Its gutter then tracks wrapped lines and stanza widgets. */
export function guidedEditor(
  form: () => PoetryForm | undefined,
  enabled: () => boolean,
  strict: () => boolean = () => false,
) {
  function build(state: EditorState) {
    const { rows, stanzas } = draftLayout(state.doc.toString(), form());
    const decorations: Range<Decoration>[] = [];
    const markers: Range<GutterMarker>[] = [];
    for (const row of rows) {
      const check = strict() ? checkLineTargets(form(), row) : undefined;
      if (check?.status === 'mismatch')
        decorations.push(
          Decoration.line({
            attributes: { class: 'cm-strict-warning', title: check.detail },
          }).range(row.from),
        );
      const number = enabled()
        ? row.stanza === null
          ? ''
          : String(row.line)
        : String(row.sourceLine);
      const title =
        row.stanza === null
          ? 'Stanza break'
          : `Stanza ${row.stanza + 1}, line ${row.line} · poem line ${row.poemLine}`;
      markers.push(
        new VerseMarker(
          number,
          enabled() && row.stanza !== null ? (row.rule?.rhyme ?? '—') : '',
          title +
            (enabled() && row.stanza !== null && !row.rule?.rhyme
              ? ` · ${rhymeMarkerDescription(form(), Boolean(row.rule))}`
              : ''),
        ).range(row.from),
      );
      if (enabled() && row.stanzaStart) {
        const stanza = stanzas.find((entry) => entry.index === row.stanza)!;
        const label = `STANZA ${String(stanza.index + 1).padStart(2, '0')}`;
        const count = stanza.expected
          ? `${stanza.written}/${stanza.expected} lines`
          : `${stanza.written} ${stanza.written === 1 ? 'line' : 'lines'}`;
        decorations.push(
          Decoration.widget({
            widget: new StanzaHeading(label, [stanza.label, count].filter(Boolean).join(' · ')),
            block: true,
            side: -1,
          }).range(row.from),
        );
      }
      const hint =
        check && check.status !== 'empty'
          ? check.status === 'unchecked'
            ? `${enabled() ? inlineTarget(row) : ''} · not checked`.replace(/^ · /, '')
            : check.label
          : enabled()
            ? inlineTarget(row)
            : '';
      if (hint)
        decorations.push(
          Decoration.widget({
            widget: new TargetHint(hint, check?.status === 'mismatch'),
            side: 1,
          }).range(row.to),
        );
    }
    return { decorations: Decoration.set(decorations, true), markers: RangeSet.of(markers, true) };
  }
  const field = StateField.define<{ decorations: DecorationSet; markers: RangeSet<GutterMarker> }>({
    create: build,
    update(value, transaction) {
      return transaction.docChanged ||
        transaction.effects.some((effect) => effect.is(refreshGuidance))
        ? build(transaction.state)
        : value;
    },
    provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
  });
  return [
    field,
    gutter({ class: 'verse-gutter', markers: (view) => view.state.field(field).markers }),
  ];
}

export function activeDraftLine(state: EditorState): number {
  return state.doc.lineAt(state.selection.main.head).number;
}
