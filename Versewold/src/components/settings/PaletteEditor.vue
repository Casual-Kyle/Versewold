<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePreferences } from '../../composables/usePreferences';
import {
  hexToRgb,
  paletteRoles,
  rgbToHex,
  themePresets,
  type PaletteKey,
} from '../../domain/preferences';
const { preferences, resetAppearance } = usePreferences();
const active = ref<PaletteKey>('lavender');
const colorError = ref('');
const role = computed(() => paletteRoles.find((entry) => entry.key === active.value)!);
const color = computed(() => preferences.value.appearance.colors[active.value]);
const channels = computed(() => hexToRgb(color.value));
function preset(id: string) {
  const theme = themePresets.find((entry) => entry.id === id)!;
  preferences.value.appearance.colors = { ...theme.colors };
  preferences.value.appearance.colorScheme = theme.scheme;
  preferences.value.appearance.preset = theme.id;
}
function update(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    colorError.value = 'Use a six-digit hex color, such as #B5A0C7.';
    return;
  }
  preferences.value.appearance.colors[active.value] = hex.toLowerCase();
  preferences.value.appearance.preset = 'custom';
  colorError.value = '';
}
function channel(index: number, event: Event, commit = false) {
  const input = event.target as HTMLInputElement;
  if (!Number.isFinite(input.valueAsNumber)) {
    if (commit) input.value = String(channels.value[index]);
    return;
  }
  if (!commit && (input.valueAsNumber < 0 || input.valueAsNumber > 255)) return;
  const next = [...channels.value];
  next[index] = input.valueAsNumber;
  const hex = rgbToHex(next);
  update(hex);
  input.value = String(hexToRgb(hex)[index]);
}
function editHex(event: Event, commit = false) {
  const value = (event.target as HTMLInputElement).value;
  if (/^#[0-9a-f]{6}$/i.test(value) || commit) update(value);
}
</script>

<template>
  <section class="preference-section">
    <div class="preference-section-title">
      <div>
        <h2>Color &amp; atmosphere</h2>
        <p>Begin with a palette, then make each color your own.</p>
      </div>
      <button class="text-button" @click="resetAppearance">Reset appearance</button>
    </div>
    <div class="theme-presets">
      <button
        v-for="theme in themePresets"
        :key="theme.id"
        class="theme-preset"
        :class="{ selected: preferences.appearance.preset === theme.id }"
        :aria-pressed="preferences.appearance.preset === theme.id"
        @click="preset(theme.id)"
      >
        <span class="preset-colors">
          <i
            v-for="key in ['earth', 'walnut', 'lavender', 'parchment'] as const"
            :key="key"
            :style="{ backgroundColor: theme.colors[key] }"
          />
        </span>
        <span>{{ theme.name }}</span>
      </button>
    </div>
    <div class="palette-workbench">
      <div class="palette-roles" aria-label="Palette roles">
        <button
          v-for="entry in paletteRoles"
          :key="entry.key"
          :aria-pressed="active === entry.key"
          :class="{ selected: active === entry.key }"
          @click="
            active = entry.key;
            colorError = '';
          "
        >
          <i :style="{ backgroundColor: preferences.appearance.colors[entry.key] }" />
          <span>{{ entry.label }}</span>
        </button>
      </div>
      <div class="color-controls">
        <h3>{{ role.label }}</h3>
        <div class="hex-color">
          <input
            type="color"
            :value="color"
            :aria-label="`${role.label} color picker`"
            @input="update(($event.target as HTMLInputElement).value)"
          />
          <label>
            <span class="sr-only">{{ role.label }} hex value</span>
            <input
              :key="active"
              :value="color"
              maxlength="7"
              spellcheck="false"
              :aria-invalid="!!colorError"
              @input="editHex($event)"
              @change="editHex($event, true)"
            />
          </label>
        </div>
        <div v-for="(label, index) in ['Red', 'Green', 'Blue']" :key="label" class="rgb-channel">
          <label :for="`palette-${label}`">{{ label }}</label>
          <input
            :id="`palette-${label}`"
            type="range"
            min="0"
            max="255"
            :value="channels[index]"
            @input="channel(index, $event)"
          />
          <input
            type="number"
            min="0"
            max="255"
            :value="channels[index]"
            :aria-label="`${label} channel value`"
            @input="channel(index, $event)"
            @change="channel(index, $event, true)"
          />
        </div>
        <p v-if="colorError" class="inline-notice" role="alert">{{ colorError }}</p>
        <label class="color-scheme-choice">
          Native control style
          <select v-model="preferences.appearance.colorScheme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <p class="muted">
          Your palette also colors selections, form guidance, and rhyme annotations.
        </p>
      </div>
    </div>
  </section>
</template>
