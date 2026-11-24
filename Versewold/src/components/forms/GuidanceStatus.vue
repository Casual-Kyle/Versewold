<script setup lang="ts">
import { computed } from 'vue';
import type { PoetryForm } from '../../domain/forms/types';
import { formGuidance } from '../../domain/forms/guidance';
const props = defineProps<{ form?: PoetryForm; forms: PoetryForm[] }>();
const emit = defineEmits<{ choose: [id: string] }>();
const profile = computed(() => formGuidance(props.form));
const variants = computed(() =>
  (props.form?.catalog?.variants ?? []).flatMap((id) => {
    const form = props.forms.find(
      (entry) => entry.id === id && entry.catalog?.status !== 'reference',
    );
    return form ? [form] : [];
  }),
);
</script>

<template>
  <div class="guidance-status" :class="`guidance-${profile.level}`" role="status">
    <div>
      <strong>{{ profile.label }}</strong>
      <span>{{ profile.detail }}</span>
    </div>
    <div v-if="variants.length" class="guidance-variants">
      <span>For specific line targets:</span>
      <button
        v-for="variant in variants"
        :key="variant.id"
        class="text-button"
        @click="emit('choose', variant.id)"
      >
        Use {{ variant.name }}
      </button>
    </div>
  </div>
</template>
