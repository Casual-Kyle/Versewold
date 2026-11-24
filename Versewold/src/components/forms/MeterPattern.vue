<script setup lang="ts">
import { computed } from 'vue';
import type { MeterRule } from '../../domain/forms/types';
const props = defineProps<{ meter?: MeterRule }>();
const feet = computed(() =>
  props.meter?.system === 'accentual-syllabic'
    ? Array.from({ length: props.meter.feet ?? 0 }, () => [...(props.meter?.pattern ?? '')])
    : [],
);
</script>

<template>
  <div v-if="feet.length" class="meter-pattern" aria-label="Expected stress pattern">
    <div v-for="(foot, index) in feet" :key="index" class="meter-foot">
      <div>
        <span
          v-for="(beat, position) in foot"
          :key="position"
          class="stress-token"
          :class="{ stressed: beat === '/' }"
          :title="beat === '/' ? 'Stressed' : beat === 'u' ? 'Unstressed' : 'Either stress'"
        >
          {{ beat === 'u' ? '∪' : beat }}
        </span>
      </div>
      <small>{{ index + 1 }}</small>
    </div>
  </div>
  <div
    v-else-if="meter?.system === 'quantitative'"
    class="meter-pattern"
    aria-label="Expected syllable weights"
  >
    <span
      v-for="(weight, index) in meter.quantityPattern"
      :key="index"
      class="stress-token"
      :title="weight === '-' ? 'Long' : weight === 'u' ? 'Short' : 'Either weight'"
    >
      {{ weight === '-' ? '−' : weight === 'u' ? '∪' : weight }}
    </span>
  </div>
</template>
