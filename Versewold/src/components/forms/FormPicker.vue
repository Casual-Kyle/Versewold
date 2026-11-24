<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PoetryForm } from '../../domain/forms/types';
import { writingFormResults, type WritingFilter } from '../../domain/forms/picker';
import { formGuidance } from '../../domain/forms/guidance';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{ forms: PoetryForm[] }>();
const model = defineModel<string>({ required: true });
const root = ref<HTMLElement>();
const input = ref<HTMLInputElement>();
const list = ref<HTMLElement>();
const open = ref(false);
const query = ref('');
const filter = ref<WritingFilter>('all');
const active = ref(0);
const current = computed(() => props.forms.find((form) => form.id === model.value));
const results = computed(() => writingFormResults(props.forms, query.value, filter.value));
const preview = computed(() => results.value[active.value]);
watch(
  [query, filter, () => props.forms],
  () => {
    active.value = 0;
    void nextTick(() => {
      if (list.value) list.value.scrollTop = 0;
    });
  },
  { flush: 'sync' },
);

function begin() {
  if (open.value) return;
  query.value = '';
  active.value = 0;
  open.value = true;
}
function close(returnFocus = false) {
  // Focus while open so its focus handler cannot immediately reopen the popup.
  if (returnFocus) input.value?.focus();
  open.value = false;
  if (returnFocus) void nextTick(() => input.value?.select());
}
function choose(form: PoetryForm) {
  model.value = form.id;
  close(true);
}
function search(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  open.value = true;
}
async function keydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.key === 'Escape' && open.value) {
    event.preventDefault();
    close(true);
    return;
  }
  if (event.key === 'Enter' && open.value) {
    event.preventDefault();
    if (preview.value) choose(preview.value);
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  if (!open.value) {
    begin();
    active.value = event.key === 'ArrowUp' ? Math.max(0, results.value.length - 1) : 0;
  } else
    active.value = Math.max(
      0,
      Math.min(results.value.length - 1, active.value + (event.key === 'ArrowDown' ? 1 : -1)),
    );
  await nextTick();
  list.value?.children.item(active.value)?.scrollIntoView({ block: 'nearest' });
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close();
}
function focusout(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) close();
}
onMounted(() => document.addEventListener('pointerdown', outside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside));
</script>

<template>
  <div ref="root" class="form-picker" @focusout="focusout" @keydown.esc.stop.prevent="close(true)">
    <label class="field-label" for="writing-form-search">Writing in</label>
    <div class="form-picker-field">
      <AppIcon name="search" :size="16" />
      <input
        ref="input"
        id="writing-form-search"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :value="open ? query : (current?.name ?? 'Unavailable custom form')"
        placeholder="Search forms or aliases…"
        aria-autocomplete="list"
        aria-controls="writing-form-results"
        :aria-expanded="open"
        :aria-activedescendant="open && preview ? `writing-form-${preview.id}` : undefined"
        @focus="begin"
        @click="begin"
        @input="search"
        @keydown="keydown"
      />
    </div>
    <div v-if="open" class="form-picker-popup">
      <div class="form-picker-filters" aria-label="Form search filters">
        <button :aria-pressed="filter === 'all'" @click="filter = 'all'">All forms</button>
        <button :aria-pressed="filter === 'targets'" @click="filter = 'targets'">
          Line targets
        </button>
        <button :aria-pressed="filter === 'other'" @click="filter = 'other'">
          Notes &amp; layout
        </button>
      </div>
      <p class="form-picker-count" role="status">
        {{ results.length }} {{ results.length === 1 ? 'match' : 'matches' }} · names, aliases, and
        traditions
      </p>
      <ul
        ref="list"
        id="writing-form-results"
        role="listbox"
        aria-label="Matching writing forms"
        class="form-picker-results"
      >
        <li
          v-for="(form, index) in results"
          :key="form.id"
          :id="`writing-form-${form.id}`"
          role="option"
          :aria-selected="index === active"
          :class="{ highlighted: index === active, current: form.id === model }"
          @mouseenter="active = index"
          @mousedown.prevent
          @click="choose(form)"
        >
          <span>
            <strong>{{ form.name }}</strong>
            <small>{{ formGuidance(form).label }}</small>
          </span>
          <span v-if="form.id === model" class="form-picker-selected" aria-label="Current form">
            ✓
          </span>
        </li>
      </ul>
      <p v-if="!results.length" class="form-picker-empty">
        No writing forms match. Try a shorter name or choose All forms.
      </p>
      <div v-if="preview" class="form-picker-preview">
        <strong>{{ preview.name }}</strong>
        <p>{{ preview.summary }}</p>
        <small>{{ formGuidance(preview).detail }}</small>
      </div>
      <small class="form-picker-help">↑ ↓ Browse · Enter Choose · Esc Cancel</small>
    </div>
  </div>
</template>
