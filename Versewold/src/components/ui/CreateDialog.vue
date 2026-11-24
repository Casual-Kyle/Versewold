<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ kind: 'project' | 'poem' }>();
const emit = defineEmits<{ close: []; create: [title: string] }>();
const dialog = ref<HTMLDialogElement>();
const input = ref<HTMLInputElement>();
const title = ref('');
const previousFocus = document.activeElement as HTMLElement | null;
onMounted(() => {
  dialog.value?.showModal();
  input.value?.focus();
});
onUnmounted(() => previousFocus?.focus());
</script>

<template>
  <dialog
    ref="dialog"
    class="create-dialog"
    @cancel.prevent="emit('close')"
    @click="$event.target === dialog && emit('close')"
  >
    <form @submit.prevent="emit('create', title)">
      <button
        type="button"
        class="icon-button dialog-close"
        aria-label="Close dialog"
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
      <span class="eyebrow">A NEW BEGINNING</span>
      <h2>
        {{
          props.kind === 'project' ? 'Make room for a collection.' : 'Every poem starts somewhere.'
        }}
      </h2>
      <label for="new-title">{{ props.kind === 'project' ? 'Project title' : 'Poem title' }}</label>
      <input
        id="new-title"
        ref="input"
        v-model="title"
        maxlength="160"
        :placeholder="props.kind === 'project' ? 'e.g. A field of small things' : 'Untitled poem'"
      />
      <button type="submit" class="button primary">
        Create {{ props.kind }}
        <AppIcon name="arrow" :size="16" />
      </button>
    </form>
  </dialog>
</template>
