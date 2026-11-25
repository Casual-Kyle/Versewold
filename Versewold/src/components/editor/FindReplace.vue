<script setup lang="ts">
import { computed, ref } from 'vue';
import AppIcon from '../ui/AppIcon.vue';

const query = defineModel<string>('query', { required: true });
const replacement = defineModel<string>('replacement', { required: true });
const matchCase = defineModel<boolean>('matchCase', { required: true });
const wholeWord = defineModel<boolean>('wholeWord', { required: true });
const props = defineProps<{ count: number; current: number; announcement: string }>();
const emit = defineEmits<{
  navigate: [direction: -1 | 1];
  replace: [];
  replaceAll: [];
  close: [];
}>();
const findInput = ref<HTMLInputElement>();
const replaceInput = ref<HTMLInputElement>();
const status = computed(() => {
  if (!query.value) return 'Enter text to find';
  if (!props.count) return 'No matches';
  return props.current >= 0
    ? `${props.current + 1} of ${props.count}`
    : `${props.count} ${props.count === 1 ? 'match' : 'matches'}`;
});
defineExpose({
  focus: (replace = false) => {
    const input = replace ? replaceInput.value : findInput.value;
    input?.focus();
    input?.select();
  },
});
</script>

<template>
  <section
    class="find-replace"
    role="search"
    aria-label="Find and replace in current poem"
    @keydown.esc.stop.prevent="emit('close')"
  >
    <div class="find-replace-heading">
      <span>
        Find &amp; replace
        <small>Current poem</small>
      </span>
      <button class="icon-button" aria-label="Close find and replace" @click="emit('close')">
        <AppIcon name="close" :size="15" />
      </button>
    </div>
    <div class="find-replace-row">
      <label>
        <span class="sr-only">Find in current poem</span>
        <input
          ref="findInput"
          v-model="query"
          placeholder="Find in poem"
          autocomplete="off"
          :spellcheck="false"
          @keydown.enter.stop.prevent="emit('navigate', $event.shiftKey ? -1 : 1)"
        />
      </label>
      <span class="search-count" role="status">{{ status }}</span>
      <button
        class="text-button"
        :disabled="!count"
        title="Previous match (Shift+Enter)"
        @click="emit('navigate', -1)"
      >
        Previous
      </button>
      <button
        class="text-button"
        :disabled="!count"
        title="Next match (Enter)"
        @click="emit('navigate', 1)"
      >
        Next
      </button>
    </div>
    <div class="find-replace-row">
      <label>
        <span class="sr-only">Replace with</span>
        <input
          ref="replaceInput"
          v-model="replacement"
          placeholder="Replace with"
          autocomplete="off"
          :spellcheck="false"
          @keydown.enter.stop.prevent="emit('replace')"
        />
      </label>
      <button class="text-button" :disabled="current < 0" @click="emit('replace')">Replace</button>
      <button class="text-button" :disabled="!count" @click="emit('replaceAll')">
        Replace all
      </button>
    </div>
    <div class="find-replace-options">
      <label>
        <input v-model="matchCase" type="checkbox" />
        Match case
      </label>
      <label>
        <input v-model="wholeWord" type="checkbox" />
        Whole words
      </label>
      <span>Enter: next · Shift+Enter: previous · Esc: close</span>
    </div>
    <p v-if="announcement" class="search-announcement" role="status">{{ announcement }}</p>
  </section>
</template>
