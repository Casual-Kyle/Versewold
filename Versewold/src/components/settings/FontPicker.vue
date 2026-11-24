<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { usePreferences } from '../../composables/usePreferences';
import { bundledFontFamilies, fontStack } from '../../domain/preferences';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{
  id: string;
  label: string;
  description: string;
  fallback: 'serif' | 'sans-serif' | 'monospace';
  defaultValue: string;
}>();
const model = defineModel<string>({ required: true });
const { fonts, fontsLoading, fontError, loadFonts } = usePreferences();
const dialog = ref<HTMLDialogElement>();
const search = ref<HTMLInputElement>();
const query = ref('');
const pending = ref('');
const opener = ref<HTMLButtonElement>();
const filtered = computed(() =>
  fonts.value.filter((name) =>
    name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
  ),
);
async function open() {
  pending.value = model.value;
  query.value = '';
  dialog.value?.showModal();
  await nextTick();
  search.value?.focus();
  void loadFonts();
}
function close() {
  dialog.value?.close();
  opener.value?.focus();
}
function choose() {
  if (fonts.value.includes(pending.value)) model.value = pending.value;
  close();
}
</script>

<template>
  <div class="preference-row font-setting">
    <div>
      <strong :id="`${id}-label`">{{ label }}</strong>
      <small>{{ description }}</small>
    </div>
    <div class="preference-control">
      <button
        ref="opener"
        class="font-choice"
        :aria-labelledby="`${id}-label ${id}-value`"
        @click="open"
      >
        <span :id="`${id}-value`" :style="{ fontFamily: fontStack(model, fallback) }">
          {{ model }}
        </span>
        <AppIcon name="chevron" :size="13" />
      </button>
      <button
        class="reset-control"
        :aria-label="`Reset ${label.toLowerCase()}`"
        :title="`Default: ${defaultValue}`"
        :disabled="model === defaultValue"
        @click="model = defaultValue"
      >
        Reset
      </button>
    </div>
    <dialog
      ref="dialog"
      class="font-dialog"
      :aria-labelledby="`${id}-dialog-title`"
      @cancel.prevent="close"
      @click="$event.target === dialog && close()"
    >
      <header>
        <span class="eyebrow">A VOICE FOR YOUR WORDS</span>
        <button class="icon-button" aria-label="Close font picker" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <h2 :id="`${id}-dialog-title`">Choose {{ label.toLowerCase() }}</h2>
      <label class="search-field">
        <AppIcon name="search" />
        <input
          ref="search"
          v-model="query"
          :aria-label="`Search ${label.toLowerCase()}`"
          placeholder="Search font families…"
        />
      </label>
      <p class="muted" role="status">
        {{
          fontsLoading
            ? 'Reading installed fonts…'
            : `${filtered.length} matching families · includes bundled fonts`
        }}
      </p>
      <label class="sr-only" :for="`${id}-matches`">Matching font families</label>
      <select :id="`${id}-matches`" v-model="pending" class="font-list" size="8">
        <option v-for="font in filtered" :key="font" :value="font">
          {{ font }}{{ bundledFontFamilies.includes(font) ? ' · bundled' : '' }}
        </option>
      </select>
      <p v-if="!filtered.length" class="inline-notice">
        No matching font families. Try another name.
      </p>
      <p v-if="fontError" class="inline-notice">{{ fontError }}</p>
      <div class="font-specimen" :style="{ fontFamily: fontStack(pending || model, fallback) }">
        <span>The light that finds the page.</span>
        <small>Aa Bb Cc · 0123456789 · — &amp; ?</small>
      </div>
      <footer>
        <button class="text-button" :disabled="fontsLoading" @click="loadFonts(true)">
          Refresh installed fonts
        </button>
        <button class="button secondary" @click="close">Cancel</button>
        <button class="button primary" :disabled="!fonts.includes(pending)" @click="choose">
          Use font
        </button>
      </footer>
    </dialog>
  </div>
</template>
