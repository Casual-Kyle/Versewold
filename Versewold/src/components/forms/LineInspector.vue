<script setup lang="ts">
import { computed } from 'vue';
import type { PoetryForm } from '../../domain/forms/types';
import {
  draftLayout,
  inlineTarget,
  lineGuidance,
  meterSummary,
  rhymeTone,
} from '../../domain/forms/composition';
import MeterPattern from './MeterPattern.vue';
import { formGuidance } from '../../domain/forms/guidance';
import { checkLineTargets } from '../../domain/forms/strict';
const props = defineProps<{
  form: PoetryForm;
  body: string;
  sourceLine: number;
  strict?: boolean;
}>();
const emit = defineEmits<{ 'insert-refrain': [sourceLine: number, text: string] }>();
const layout = computed(() => draftLayout(props.body, props.form));
const active = computed(
  () =>
    layout.value.rows[Math.min(props.sourceLine, layout.value.rows.length) - 1] ??
    layout.value.rows[0],
);
const guidance = computed(() => lineGuidance(props.form, layout.value.rows, active.value));
const stanza = computed(() =>
  layout.value.stanzas.find((entry) => entry.index === active.value.stanza),
);
const profile = computed(() => formGuidance(props.form));
const strictCheck = computed(() =>
  props.strict ? checkLineTargets(props.form, active.value) : undefined,
);
const writtenLines = computed(
  () => layout.value.rows.filter((row) => row.stanza !== null && !row.prospective).length,
);
</script>

<template>
  <section class="line-inspector" aria-label="Current line inspector">
    <h2>{{ form.name }}</h2>
    <div class="active-line-heading">
      <span>
        {{
          active.stanza === null
            ? 'Stanza break'
            : `Stanza ${active.stanza + 1} · Line ${active.line}`
        }}
      </span>
      <span v-if="active.rule?.rhyme" class="rhyme-label" :class="rhymeTone(active.rule.rhyme)">
        {{ active.rule.rhyme }}
      </span>
      <span
        v-else-if="active.stanza !== null"
        class="rhyme-label rhyme-unprescribed"
        title="No prescribed rhyme letter"
      >
        —
      </span>
    </div>
    <template v-if="active.stanza !== null">
      <p v-if="form.structure.lineMapping === 'poem'" class="line-progress">
        {{ writtenLines }} of {{ profile.totalLines }} lines in this poem
        <span v-if="active.section">
          · {{ active.section.label }}, {{ active.section.line }}/{{ active.section.length }}
        </span>
      </p>
      <p v-if="stanza?.expected" class="line-progress">
        {{ stanza.written }} of {{ stanza.expected }} lines in this stanza
      </p>
      <div class="line-target-card">
        <span class="eyebrow">
          {{ active.rule?.meter?.system === 'quantitative' ? 'WEIGHT TARGET' : 'LINE TARGET' }}
        </span>
        <strong>{{ meterSummary(active.rule?.meter) }}</strong>
        <MeterPattern :meter="active.rule?.meter" />
        <small v-if="inlineTarget(active)">{{ inlineTarget(active) }}</small>
        <p v-if="active.rule?.meter && active.rule.meter.system !== 'free'" class="target-note">
          {{
            {
              required: 'Form target',
              conventional: 'Conventional target',
              optional: 'Optional target',
            }[active.rule.meter.strength]
          }}
          · pronunciation is not checked.
        </p>
      </div>
      <section
        v-if="strictCheck && strictCheck.status !== 'empty'"
        class="strict-line-feedback"
        :class="{ warning: strictCheck.status === 'mismatch' }"
        aria-label="Strict line check"
      >
        <strong>{{ strictCheck.label }}</strong>
        <p>{{ strictCheck.detail }}</p>
        <details v-if="strictCheck.estimate">
          <summary>Estimated syllables by word</summary>
          <p>
            {{
              strictCheck.estimate.words.map((word) => `${word.text} (${word.count})`).join(' · ')
            }}
          </p>
        </details>
      </section>
      <section v-if="active.rule?.rhyme" class="line-suggestion">
        <h3>
          RHYME {{ active.rule.rhyme
          }}{{ form.structure.rhymeScope === 'stanza' ? ' · THIS STANZA' : '' }}
        </h3>
        <template v-if="guidance.endings.length">
          <p>Shape this ending around:</p>
          <div class="rhyme-endings">
            <span
              v-for="word in guidance.endings"
              :key="word"
              :class="rhymeTone(active.rule.rhyme)"
            >
              {{ word }}
            </span>
          </div>
          <small>End words from your draft, grouped by the form.</small>
        </template>
        <p v-else>
          Choose an ending sound for group {{ active.rule.rhyme }}. Matching letters share that
          sound.
        </p>
      </section>
      <section v-else-if="active.rule" class="line-suggestion">
        <h3>{{ profile.hasRhyme ? 'OPEN RHYME POSITION' : 'NO PRESCRIBED END RHYME' }}</h3>
        <p>
          {{
            profile.level === 'layout'
              ? 'This template supplies a layout without a specific rhyme or meter. Choose a named variant for those targets.'
              : 'The dash means this line has no prescribed rhyme letter. Keep following its other form targets.'
          }}
        </p>
      </section>
      <section v-if="active.rule?.refrain" class="line-suggestion">
        <h3>
          {{ active.rule.refrain.role === 'define' ? 'INTRODUCE' : 'REPEAT' }} REFRAIN
          {{ active.rule.refrain.id }}
        </h3>
        <template v-if="guidance.refrain">
          <blockquote>{{ guidance.refrain }}</blockquote>
          <button
            class="button secondary"
            :disabled="active.text === guidance.refrain"
            :title="`Replace this line with refrain ${active.rule.refrain.id}`"
            @click="emit('insert-refrain', active.sourceLine, guidance.refrain)"
          >
            Insert refrain
          </button>
        </template>
        <p v-else>
          {{
            active.rule.refrain.role === 'define'
              ? 'This line will return later in the poem.'
              : 'Write the original refrain first; its text will appear here.'
          }}
        </p>
      </section>
      <section v-if="active.rule?.endWord" class="line-suggestion">
        <h3>END-WORD {{ active.rule.endWord }}</h3>
        <p>
          Return to the word assigned to {{ active.rule.endWord
          }}{{
            active.rule.containsEndWords
              ? `; include ${active.rule.containsEndWords.join(', ')}`
              : ''
          }}.
        </p>
      </section>
      <section v-if="active.rule?.internalRhymes?.length" class="line-suggestion">
        <h3>INTERNAL RHYME TARGETS</h3>
        <p v-for="(target, index) in active.rule.internalRhymes" :key="index">
          Group {{ target.group }} · syllable {{ target.syllable }}
        </p>
        <small>Positions declared by this form; pronunciation is not checked.</small>
      </section>
      <p v-if="!active.rule" class="target-note">
        {{
          form.structure.kind === 'free'
            ? 'Open form. Let the line follow your ear.'
            : form.structure.kind === 'repeating'
              ? 'This line extends beyond the stanza target. Keep it, or use a blank line to start the next stanza.'
              : 'This line extends beyond the template. Keep it, or revise the poem’s line and stanza layout.'
        }}
      </p>
    </template>
    <p v-else class="target-note">
      A blank line separates stanzas. Continue below to begin the next one.
    </p>
  </section>
</template>
