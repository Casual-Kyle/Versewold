<script setup lang="ts">
const props = defineProps<{
  id: string;
  label: string;
  description?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue: number;
}>();
const model = defineModel<number>({ required: true });
function update(event: Event, commit = false) {
  const input = event.target as HTMLInputElement;
  if (!Number.isFinite(input.valueAsNumber)) {
    if (commit) input.value = String(model.value);
    return;
  }
  // Let a partly typed number exist in the field without saving invalid values.
  if (!commit && (input.valueAsNumber < props.min || input.valueAsNumber > props.max)) return;
  const step = props.step ?? 1;
  const clamped = Math.max(props.min, Math.min(props.max, input.valueAsNumber));
  model.value = Number((props.min + Math.round((clamped - props.min) / step) * step).toFixed(3));
  input.value = String(model.value);
}
</script>

<template>
  <div class="preference-row range-setting">
    <label :for="id">
      <strong>{{ label }}</strong>
      <small v-if="description" :id="`${id}-help`">{{ description }}</small>
    </label>
    <div class="range-controls">
      <input
        :id="id"
        type="range"
        :min="min"
        :max="max"
        :step="step ?? 1"
        :value="model"
        :aria-describedby="description ? `${id}-help` : undefined"
        @input="update"
      />
      <input
        class="range-number"
        type="number"
        :min="min"
        :max="max"
        :step="step ?? 1"
        :value="model"
        :aria-label="`${label} value`"
        @input="update($event)"
        @change="update($event, true)"
      />
      <span v-if="unit" class="range-unit">{{ unit }}</span>
      <button
        class="reset-control"
        :aria-label="`Reset ${label.toLowerCase()}`"
        :title="`Default: ${defaultValue}${unit ? ` ${unit}` : ''}`"
        :disabled="model === defaultValue"
        @click="model = defaultValue"
      >
        Reset
      </button>
    </div>
  </div>
</template>
