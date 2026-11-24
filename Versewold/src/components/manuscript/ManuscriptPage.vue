<script setup lang="ts">
import { fontStack } from '../../domain/preferences';
import type { ManuscriptPage, ManuscriptSettings } from '../../domain/manuscript/types';
defineProps<{
  page: ManuscriptPage;
  settings: ManuscriptSettings;
  width: number;
  height: number;
  zoom: number;
  index: number;
  guides: boolean;
}>();
</script>

<template>
  <figure class="paper-figure">
    <figcaption class="page-caption">
      {{ index + 1 }}
      <span>{{ page.label }}</span>
    </figcaption>
    <div
      class="paper-frame"
      :style="{ width: `${((width * 4) / 3) * zoom}px`, height: `${((height * 4) / 3) * zoom}px` }"
    >
      <article
        class="manuscript-page"
        :aria-label="`Page ${index + 1}: ${page.label}`"
        :style="{
          width: `${width}pt`,
          height: `${height}pt`,
          fontFamily: fontStack(settings.fontFamily, 'serif'),
          transform: `scale(${zoom})`,
        }"
      >
        <div
          v-if="guides"
          class="margin-guides"
          aria-hidden="true"
          :style="{
            top: `${settings.margins.top}mm`,
            bottom: `${settings.margins.bottom}mm`,
            left: `${settings.margins.left}mm`,
            right: `${settings.margins.right}mm`,
          }"
        />
        <span
          v-for="(line, i) in page.lines"
          :key="i"
          class="manuscript-line"
          :class="`print-${line.role}`"
          :style="{
            left: `${line.x}pt`,
            top: `${line.y}pt`,
            width: `${line.width}pt`,
            fontSize: `${line.size}pt`,
            fontWeight: line.weight,
            textAlign: line.align,
          }"
        >
          {{ line.text }}
        </span>
      </article>
    </div>
  </figure>
</template>
