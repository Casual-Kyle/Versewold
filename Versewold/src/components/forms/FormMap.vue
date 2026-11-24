<script setup lang="ts">
import { computed } from 'vue';
import type { PoetryForm } from '../../domain/forms/types';
import { formLineMap } from '../../domain/forms/lineMap';
import { meterSummary, rhymeTone } from '../../domain/forms/composition';
const props = defineProps<{ form: PoetryForm; body: string; sourceLine: number }>();
const emit = defineEmits<{ jump: [sourceLine: number] }>();
const map = computed(() => formLineMap(props.form, props.body, props.sourceLine));
</script>

<template>
  <section v-if="map.sections.length" class="form-map" aria-label="Form line map">
    <h3>LINE MAP</h3>
    <p>Jump to a line. Faded positions are still unwritten.</p>
    <div v-for="(section, index) in map.sections" :key="index" class="form-map-section">
      <h4>{{ section.label }}</h4>
      <div class="form-map-lines">
        <button
          v-for="entry in section.entries"
          :key="entry.number"
          :disabled="entry.sourceLine === undefined"
          :aria-current="entry.active ? 'step' : undefined"
          :aria-label="`Go to ${entry.label}`"
          :title="`${entry.label} · ${meterSummary(entry.rule.meter)}${entry.sourceLine === undefined ? ' · Not written yet' : ''}`"
          @click="entry.sourceLine !== undefined && emit('jump', entry.sourceLine)"
        >
          <span>{{ entry.number }}</span>
          <strong :class="entry.rule.rhyme ? rhymeTone(entry.rule.rhyme) : 'rhyme-unprescribed'">
            {{ entry.rule.rhyme ?? '—' }}
          </strong>
          <small v-if="entry.rule.meter?.system === 'syllabic'">
            {{ entry.rule.meter.syllables }} syll.
          </small>
          <small v-else-if="entry.rule.wordCount">{{ entry.rule.wordCount }} words</small>
        </button>
      </div>
    </div>
    <p v-if="map.omitted">{{ map.omitted }} more targets in Full form &amp; craft notes.</p>
  </section>
</template>
