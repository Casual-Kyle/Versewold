import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EditorState, Transaction } from '@codemirror/state';
import { history, undo, redo } from '@codemirror/commands';
import {
  draftLayout,
  inlineTarget,
  lineGuidance,
  normalizeNewlines,
  applySourceChanges,
} from '../src/domain/forms/composition.ts';
import type { PoetryForm } from '../src/domain/forms/types.ts';
import { sourceDocument } from '../src/services/editorSource.ts';

const form = (id: string): PoetryForm =>
  JSON.parse(
    readFileSync(new URL(`../src/domain/forms/templates/${id}.json`, import.meta.url), 'utf8'),
  );

test('single Enter continues a stanza; one or several blank lines start one new stanza', () => {
  const single = draftLayout('First\n', form('standard-habbie'));
  assert.deepEqual(
    single.rows.map((row) => [row.stanza, row.line]),
    [
      [0, 1],
      [0, 2],
    ],
  );
  const separated = draftLayout('First\n\n\nSecond\n\n', form('standard-habbie'));
  assert.deepEqual(
    separated.stanzas.map((stanza) => stanza.written),
    [1, 1, 0],
  );
  assert.equal(separated.rows[1].stanza, null);
  assert.equal(separated.rows.at(-1)!.stanza, 2);
  assert.equal(separated.rows.at(-1)!.line, 1);
  assert.equal(separated.rows.at(-1)!.prospective, true);
});

test('empty drafts have one editable target without creating placeholder text', () => {
  const body = '';
  const layout = draftLayout(body, form('standard-habbie'));
  assert.equal(layout.rows.length, 1);
  assert.equal(layout.rows[0].rule?.rhyme, 'A');
  assert.equal(layout.stanzas[0].expected, 6);
  assert.equal(layout.stanzas[0].written, 0);
  assert.equal(inlineTarget(layout.rows[0]), '8 syll. target');
  assert.equal(body, '');
});

test('repeating stanzas retain short-line targets and scope rhyme endings to their stanza', () => {
  const habbie = form('standard-habbie');
  const body = 'hill\nmill\nstill\nglow\nsill\nsnow\n\nsea\nfree\n';
  const layout = draftLayout(body, habbie);
  assert.deepEqual(
    layout.rows.slice(0, 6).map((row) => row.rule?.rhyme),
    ['A', 'A', 'A', 'B', 'A', 'B'],
  );
  assert.equal(inlineTarget(layout.rows[3]), '4 syll. target');
  assert.deepEqual(lineGuidance(habbie, layout.rows, layout.rows.at(-1)!).endings, ['sea', 'free']);
  assert.equal(layout.rows[7].line, 1);
  assert.equal(layout.rows[7].poemLine, 7);
});

test('fixed and open forms keep extra text; continuous-line templates do not invent stanzas', () => {
  const fixed = draftLayout('a\nb\nc\nd\ne\n\nExtra stanza', form('balliol-rhyme'));
  assert.equal(fixed.rows[4].rule, undefined);
  assert.equal(fixed.rows.at(-1)!.rule, undefined);
  assert.equal(fixed.stanzas.length, 2);
  const continuous = draftLayout('a\nb\nc', form('blank-verse'));
  assert.equal(continuous.stanzas.length, 1);
  assert.ok(continuous.rows.every((row) => row.rule?.meter?.feet === 5));
  const free = draftLayout('a\n\nb', form('free-verse'));
  assert.equal(free.stanzas.length, 2);
  assert.ok(free.rows.every((row) => !row.rule));
});

test('stress, mora, word, and syllable targets remain different units', () => {
  assert.equal(inlineTarget(draftLayout('', form('balliol-rhyme')).rows[0]), '4 stresses target');
  assert.equal(inlineTarget(draftLayout('', form('haiku-575')).rows[0]), '5 syll. target');
  assert.match(inlineTarget(draftLayout('', form('dodoitsu')).rows[0]), /morae target/);
  const wordForm = form('elevenie');
  assert.equal(inlineTarget(draftLayout('One two', wordForm).rows[0]), '2/1 words');
});

test('refrain suggestions use the actual defining line and do not rewrite the poem', () => {
  const villanelle = form('villanelle');
  const body =
    'First refrain here.\nA quiet lake.\nSecond refrain here.\n\nNew verse.\nA new ending.\n';
  const layout = draftLayout(body, villanelle);
  const active = layout.rows.at(-1)!;
  assert.equal(active.rule?.refrain?.id, 'A1');
  assert.equal(lineGuidance(villanelle, layout.rows, active).refrain, 'First refrain here.');
  assert.equal(normalizeNewlines(body), body);
});

test('normalized-offset edits preserve untouched Unicode, mixed line endings, and trailing whitespace', () => {
  const body = '  café\r\n🪶 words\n\rEnding\r\n';
  const normalized = normalizeNewlines(body);
  const at = normalized.indexOf('words');
  const changed = applySourceChanges(body, [{ from: at, to: at + 5, insert: 'verse\nnew' }]);
  assert.equal(changed, '  café\r\n🪶 verse\r\nnew\n\rEnding\r\n');
  assert.throws(() => applySourceChanges(body, [{ from: 0, to: 1000, insert: '' }]));
});

test('joining a bare CR to LF keeps both logical line breaks without changing other bytes', () => {
  const original = 'header\r\nfirst\rremove\nlast  \r';
  const from = normalizeNewlines(original).indexOf('remove');
  assert.equal(
    applySourceChanges(original, [{ from, to: from + 'remove'.length, insert: '' }]),
    'header\r\nfirst\r\n\nlast  \r',
  );

  const beforeInsert = 'header\nfirst\r🪶last';
  const at = normalizeNewlines(beforeInsert).indexOf('🪶');
  assert.equal(
    applySourceChanges(beforeInsert, [{ from: at, to: at, insert: '\nadded' }]),
    'header\nfirst\r\n\nadded🪶last',
  );
});

test('undo and redo restore the exact source, including a deleted mixed-style newline', () => {
  const initial = 'Rain\r\nMoon\nSea\rWind\n';
  const source = sourceDocument(initial);
  let state = EditorState.create({
    doc: normalizeNewlines(initial),
    extensions: [history(), source.extensions],
  });
  const target = {
    get state() {
      return state;
    },
    dispatch(transaction: Transaction) {
      state = transaction.state;
    },
  };
  state = state.update({ changes: { from: 9, to: 10, insert: '' } }).state;
  const changed = state.field(source.field);
  assert.equal(changed, 'Rain\r\nMoonSea\rWind\n');
  assert.ok(undo(target));
  assert.equal(state.field(source.field), initial);
  assert.equal(state.doc.toString(), normalizeNewlines(initial));
  assert.ok(redo(target));
  assert.equal(state.field(source.field), changed);
});

test('grouped typing undoes as a group without retaining an intermediate source value', () => {
  const initial = 'one\r\ntwo\n';
  const source = sourceDocument(initial);
  let state = EditorState.create({
    doc: normalizeNewlines(initial),
    extensions: [history(), source.extensions],
  });
  const target = {
    get state() {
      return state;
    },
    dispatch(transaction: Transaction) {
      state = transaction.state;
    },
  };
  state = state.update({
    changes: { from: 3, insert: 'a' },
    annotations: Transaction.userEvent.of('input.type'),
  }).state;
  state = state.update({
    changes: { from: 4, insert: 'b' },
    annotations: Transaction.userEvent.of('input.type'),
  }).state;
  assert.ok(undo(target));
  assert.equal(state.doc.toString(), normalizeNewlines(initial));
  assert.equal(state.field(source.field), initial);
});
