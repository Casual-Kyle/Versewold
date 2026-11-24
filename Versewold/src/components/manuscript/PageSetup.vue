<script setup lang="ts">
import { ref } from 'vue';
import FontPicker from '../settings/FontPicker.vue';
import { defaultManuscript } from '../../domain/manuscript/settings';
import type { ManuscriptSettings } from '../../domain/manuscript/types';
const model = defineModel<ManuscriptSettings>({ required: true });
const units = ref<'in' | 'mm'>('in');
const defaults = defaultManuscript();
const display = (mm: number) => Number((units.value === 'in' ? mm / 25.4 : mm).toFixed(3));
function millimetres(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber;
  return value * (units.value === 'in' ? 25.4 : 1);
}
</script>

<template>
  <div class="page-setup">
    <details open>
      <summary>Paper &amp; margins</summary>
      <div class="setup-fields">
        <label>
          Page size
          <select v-model="model.paper">
            <option value="letter">US Letter · 8.5 × 11 in</option>
            <option value="a4">A4 · 210 × 297 mm</option>
            <option value="a5">A5 · 148 × 210 mm</option>
            <option value="custom">Custom size</option>
          </select>
        </label>
        <label>
          Orientation
          <select v-model="model.orientation">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
        <label>
          Measurement
          <select v-model="units">
            <option value="in">Inches</option>
            <option value="mm">Millimetres</option>
          </select>
        </label>
        <div v-if="model.paper === 'custom'" class="setup-pair">
          <label>
            Width ({{ units }})
            <input
              type="number"
              :value="display(model.customWidthMm)"
              :step="units === 'in' ? 0.05 : 1"
              @input="model.customWidthMm = millimetres($event)"
            />
          </label>
          <label>
            Height ({{ units }})
            <input
              type="number"
              :value="display(model.customHeightMm)"
              :step="units === 'in' ? 0.05 : 1"
              @input="model.customHeightMm = millimetres($event)"
            />
          </label>
        </div>
        <div class="setup-pair">
          <label
            v-for="side in ['top', 'bottom', 'left', 'right'] as const"
            :key="side"
            class="capitalize"
          >
            {{ side }} ({{ units }})
            <input
              type="number"
              :value="display(model.margins[side])"
              min="0"
              :max="units === 'in' ? 3.937 : 100"
              :step="units === 'in' ? 0.05 : 1"
              @input="model.margins[side] = millimetres($event)"
            />
          </label>
        </div>
      </div>
    </details>
    <details open>
      <summary>Manuscript type</summary>
      <div class="setup-fields">
        <FontPicker
          id="export-font"
          v-model="model.fontFamily"
          label="Print font"
          description="Installed and bundled families"
          fallback="serif"
          :default-value="defaults.fontFamily"
        />
        <div class="setup-pair">
          <label>
            Body size (pt)
            <input v-model.number="model.fontSize" type="number" min="8" max="32" step="0.5" />
          </label>
          <label>
            Title size (pt)
            <input v-model.number="model.titleSize" type="number" min="10" max="40" />
          </label>
        </div>
        <label>
          Line spacing
          <select v-model.number="model.lineSpacing">
            <option :value="1">Single</option>
            <option :value="1.15">1.15</option>
            <option :value="1.5">1.5 lines</option>
            <option :value="2">Double</option>
            <option :value="2.5">2.5 lines</option>
            <option :value="3">Triple</option>
          </select>
        </label>
      </div>
    </details>
    <details open>
      <summary>Title page &amp; word count</summary>
      <div class="setup-fields">
        <label class="setup-check">
          <input v-model="model.titlePage" type="checkbox" />
          Include title page
        </label>
        <label class="setup-check">
          <input v-model="model.titleWordCount" :disabled="!model.titlePage" type="checkbox" />
          Total project word count
        </label>
        <label class="setup-check">
          <input v-model="model.countTitles" type="checkbox" />
          Include titles in word count
        </label>
        <small>
          Counts every document, including dedication and author pages. Generated dates and bylines
          are excluded.
        </small>
        <label>
          Title page date
          <select v-model="model.titleDate" :disabled="!model.titlePage">
            <option value="none">No date</option>
            <option value="today">Today · autofill on export</option>
            <option value="revised">Latest document revision</option>
          </select>
        </label>
      </div>
    </details>
    <details>
      <summary>Bylines &amp; page flow</summary>
      <div class="setup-fields">
        <label class="setup-check">
          <input v-model="model.showPoemAuthor" type="checkbox" />
          Author below each title
        </label>
        <label>
          Document date
          <select v-model="model.poemDate">
            <option value="none">No date</option>
            <option value="composed">Date composed</option>
            <option value="revised">Last revised · automatic</option>
          </select>
        </label>
        <small>
          Composition dates stay fixed. Revision dates update when you edit writing or its
          title/byline. Older, undated documents stay undated until edited.
        </small>
        <label class="setup-check">
          <input v-model="model.sectionPages" type="checkbox" />
          Separate page for each part
        </label>
        <label class="setup-check">
          <input v-model="model.poemNewPage" type="checkbox" />
          Start each document on a new page
        </label>
        <label class="setup-check">
          <input v-model="model.pageNumbers" type="checkbox" />
          Page numbers · skip title page
        </label>
      </div>
    </details>
  </div>
</template>
