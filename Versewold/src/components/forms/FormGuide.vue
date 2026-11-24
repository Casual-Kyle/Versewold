<script setup lang="ts">
import type { PoetryForm } from '../../domain/forms/types';
import { meterSummary, rhymeTone } from '../../domain/forms/composition';
import AppIcon from '../ui/AppIcon.vue';
import { catalogStatus } from '../../domain/forms/search';
defineProps<{ form: PoetryForm }>();
</script>

<template>
  <div class="form-guide">
    <div class="eyebrow">
      {{ catalogStatus(form) === 'reference' ? 'A NOTE FROM THE STUDY' : 'THE SHAPE OF YOUR POEM' }}
    </div>
    <h2>{{ form.name }}</h2>
    <p class="form-origin">{{ form.origin }}</p>
    <p class="form-summary">{{ form.summary }}</p>
    <p v-if="form.catalog" class="catalog-support" :class="form.catalog.status">
      {{
        {
          structured: 'Structural template',
          guided: 'Guided writing · read the form notes',
          reference: 'Reference entry · not a writing template',
        }[form.catalog.status]
      }}
    </p>
    <p
      v-for="limitation in form.catalog?.limitations ?? []"
      :key="limitation"
      class="catalog-limitation"
    >
      {{ limitation }}
    </p>
    <div
      v-if="form.structure.kind === 'free' && catalogStatus(form) !== 'reference'"
      class="open-form-note"
    >
      <AppIcon name="leaf" :size="25" />
      <p>
        Follow the rhythm
        <br />
        of your own voice.
      </p>
    </div>
    <section v-for="(stanza, index) in form.structure.stanzas" :key="index" class="stanza-guide">
      <h3>{{ stanza.label }}</h3>
      <div v-for="(line, lineIndex) in stanza.lines" :key="lineIndex" class="guide-line">
        <span class="guide-number">{{ lineIndex + 1 }}</span>
        <span class="rhyme-label" :class="rhymeTone(line.rhyme)">
          {{ line.rhyme ?? '—' }}
        </span>
        <span class="meter-label">
          {{ meterSummary(line.meter) }}
          <small v-if="line.wordCount">
            {{ line.wordCount }} {{ line.wordCount === 1 ? 'word' : 'words' }}
          </small>
          <small
            v-for="rhyme in line.internalRhymes ?? []"
            :key="`${rhyme.group}-${rhyme.syllable}`"
          >
            Rhyme {{ rhyme.group }} · syllable {{ rhyme.syllable }}
          </small>
          <small v-if="line.refrain">
            {{ line.refrain.role === 'define' ? 'Introduce' : 'Repeat' }} {{ line.refrain.id }}
          </small>
          <small v-if="line.endWord">
            End-word {{ line.endWord
            }}{{ line.containsEndWords ? ` · includes ${line.containsEndWords.join(', ')}` : '' }}
          </small>
        </span>
      </div>
    </section>
    <section class="craft-notes">
      <h3>A NOTE ON THE CRAFT</h3>
      <p v-for="note in form.notes" :key="note">{{ note }}</p>
    </section>
    <p
      v-if="
        form.structure.stanzas.some((stanza) =>
          stanza.lines.some((line) => line.meter?.system === 'accentual-syllabic'),
        )
      "
      class="guide-key"
    >
      <code>u</code>
      unstressed
      <span>·</span>
      <code>/</code>
      stressed
      <br />
      Patterns are targets, not an analysis of your draft.
    </p>
    <p
      v-if="
        form.structure.stanzas.some((stanza) =>
          stanza.lines.some((line) => line.meter?.system === 'quantitative'),
        )
      "
      class="guide-key"
    >
      Quantity: − long, u short, x either. This describes syllable weight, not stress.
    </p>
    <p
      v-if="
        form.structure.stanzas.some((stanza) =>
          stanza.lines.some((line) => line.meter?.system === 'moraic'),
        )
      "
      class="guide-key"
    >
      Morae are language-specific sound units and are not equivalent to English syllables.
    </p>
  </div>
</template>
