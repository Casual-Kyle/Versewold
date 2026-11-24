<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 });
const paths: Record<string, string> = {
  pen: 'm16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5M3 21h18',
  book: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3V4Zm9 2v15',
  folder: 'M3 6h7l2 3h9v11H3V6Z',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  file: 'M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z',
  leaf: 'M20 3C7 2 2 8 5 15c4 9 16 1 15-12ZM4 21 17 7',
  focus: 'M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  check: 'm5 12 4 4L19 6',
  save: 'M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8',
  export: 'M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6',
  close: 'm6 6 12 12M6 18 18 6',
};
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] ?? paths.leaf" />
  </svg>
</template>
