<script setup lang="ts">
import { ref } from 'vue';
import { useWorkspace } from '../composables/useWorkspace';
import { usePreferences } from '../composables/usePreferences';
import AppIcon from '../components/ui/AppIcon.vue';
import PaletteEditor from '../components/settings/PaletteEditor.vue';
import FontPicker from '../components/settings/FontPicker.vue';
import SettingRange from '../components/settings/SettingRange.vue';
import WritingPreview from '../components/settings/WritingPreview.vue';
import { defaultPreferences } from '../domain/preferences';

const { desktop, dataDirectory, revealData, revealBackups, reloadForms, formError } =
  useWorkspace();
const { preferences, ready, migrated, resetWriting, error } = usePreferences();
const defaults = defaultPreferences();
const section = ref<'appearance' | 'writing' | 'files' | 'author'>('appearance');
const folderError = ref('');
async function openFolder(kind: 'data' | 'backups') {
  try {
    await (kind === 'backups' ? revealBackups() : revealData());
    folderError.value = '';
  } catch (cause) {
    folderError.value = String(cause);
  }
}
</script>

<template>
  <section class="settings-view">
    <div class="preferences-layout">
      <nav class="preferences-nav" aria-label="Preference categories">
        <span class="eyebrow">CUSTOMIZE</span>
        <button
          :aria-current="section === 'appearance' ? 'page' : undefined"
          @click="section = 'appearance'"
        >
          <AppIcon name="leaf" :size="16" />
          Appearance
        </button>
        <button
          :aria-current="section === 'writing' ? 'page' : undefined"
          @click="section = 'writing'"
        >
          <AppIcon name="pen" :size="16" />
          Writing
        </button>
        <button :aria-current="section === 'files' ? 'page' : undefined" @click="section = 'files'">
          <AppIcon name="folder" :size="16" />
          Files &amp; storage
        </button>
        <button
          :aria-current="section === 'author' ? 'page' : undefined"
          @click="section = 'author'"
        >
          <AppIcon name="file" :size="16" />
          Author profile
        </button>
      </nav>
      <div class="preferences-content">
        <header class="preferences-intro">
          <span class="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>
            {{
              section === 'appearance'
                ? 'Your study, your way.'
                : section === 'writing'
                  ? 'Room for your words.'
                  : section === 'author'
                    ? 'Put your name to it.'
                    : 'A home for everything.'
            }}
          </h1>
          <p>
            {{
              section === 'appearance'
                ? 'A familiar palette. A different perspective. Make it feel like yours.'
                : section === 'writing'
                  ? 'Set the type, rhythm, and breathing room of your writing desk.'
                  : section === 'author'
                    ? 'A default byline for new writing and manuscript exports.'
                    : 'Your writing, templates, settings, and backups share one app folder.'
            }}
          </p>
        </header>
        <p v-if="error" class="inline-notice" role="alert">{{ error }}</p>
        <p v-if="folderError" class="inline-notice" role="alert">{{ folderError }}</p>
        <fieldset v-if="section !== 'files'" :disabled="!ready" class="preferences-fields">
          <template v-if="section === 'author'">
            <section class="preference-section">
              <h2>Your byline</h2>
              <label class="preference-row">
                <span>
                  <strong>Author name</strong>
                  <small>
                    Used for new projects and poems. Existing bylines remain as you set them.
                  </small>
                </span>
                <input
                  v-model="preferences.profile.authorName"
                  type="text"
                  maxlength="200"
                  placeholder="Name or pen name"
                />
              </label>
              <p>
                Set a different author for a project in Manuscript, or for an individual poem in
                Details. Dates are recorded automatically when writing changes.
              </p>
            </section>
          </template>
          <template v-else-if="section === 'appearance'">
            <PaletteEditor />
            <section class="preference-section">
              <div class="preference-section-title">
                <div>
                  <h2>The type of your study</h2>
                  <p>Use bundled families or choose from the fonts installed on this computer.</p>
                </div>
              </div>
              <FontPicker
                id="interface-font"
                v-model="preferences.appearance.interfaceFont"
                label="Interface font"
                description="Menus, labels, and navigation."
                fallback="sans-serif"
                :default-value="defaults.appearance.interfaceFont"
              />
              <SettingRange
                id="interface-size"
                v-model="preferences.appearance.interfaceFontSize"
                label="Interface text size"
                description="Scale text throughout the app independently of your poem."
                :min="11"
                :max="22"
                unit="px"
                :default-value="defaults.appearance.interfaceFontSize"
              />
              <FontPicker
                id="heading-font"
                v-model="preferences.appearance.headingFont"
                label="Heading font"
                description="Titles and the literary headings of the study."
                fallback="serif"
                :default-value="defaults.appearance.headingFont"
              />
              <FontPicker
                id="mono-font"
                v-model="preferences.appearance.monoFont"
                label="Analysis font"
                description="Rhyme, meter, and technical annotations."
                fallback="monospace"
                :default-value="defaults.appearance.monoFont"
              />
            </section>
          </template>
          <template v-else>
            <section class="preference-section">
              <div class="preference-section-title">
                <div>
                  <h2>The manuscript</h2>
                  <p>These choices affect how you see your writing, without changing the text.</p>
                </div>
                <button class="text-button" @click="resetWriting">Reset writing preferences</button>
              </div>
              <FontPicker
                id="writing-font"
                v-model="preferences.writing.font"
                label="Writing font"
                description="A separate voice for the poem itself."
                fallback="serif"
                :default-value="defaults.writing.font"
              />
              <SettingRange
                id="writing-size"
                v-model="preferences.writing.fontSize"
                label="Writing text size"
                :min="12"
                :max="48"
                unit="px"
                :default-value="defaults.writing.fontSize"
              />
              <SettingRange
                id="writing-line-height"
                v-model="preferences.writing.lineHeight"
                label="Line spacing"
                description="Space between displayed lines; your Markdown stays the same."
                :min="1"
                :max="3"
                :step="0.05"
                unit="×"
                :default-value="defaults.writing.lineHeight"
              />
              <SettingRange
                id="writing-width"
                v-model="preferences.writing.maxWidth"
                label="Maximum writing width"
                description="A comfortable measure when the window has room."
                :min="360"
                :max="1200"
                :step="20"
                unit="px"
                :default-value="defaults.writing.maxWidth"
              />
            </section>
            <section class="preference-section">
              <h2>While you write</h2>
              <label class="preference-row">
                <span>
                  <strong>Soft-wrap long lines</strong>
                  <small>Wrap on screen without adding line breaks to the poem.</small>
                </span>
                <input v-model="preferences.writing.softWrap" type="checkbox" />
              </label>
              <label class="preference-row">
                <span>
                  <strong>Spellcheck</strong>
                  <small>Use the spelling support provided by the desktop webview.</small>
                </span>
                <input v-model="preferences.writing.spellcheck" type="checkbox" />
              </label>
              <label class="preference-row">
                <span>
                  <strong>Show writing statistics</strong>
                  <small>Keep word, line, and stanza counts at the bottom of the page.</small>
                </span>
                <input v-model="preferences.writing.showStatistics" type="checkbox" />
              </label>
              <label class="preference-row">
                <span>
                  <strong>Show form guidance</strong>
                  <small>Keep the selected form’s structure beside your draft.</small>
                </span>
                <input v-model="preferences.writing.showGuidance" type="checkbox" />
              </label>
              <label class="preference-row">
                <span>
                  <strong>Strict formatting</strong>
                  <small>
                    Highlight count and extra-line warnings. English syllables are estimates.
                  </small>
                </span>
                <input v-model="preferences.writing.strictFormatting" type="checkbox" />
              </label>
            </section>
          </template>
          <WritingPreview />
        </fieldset>
        <template v-else>
          <section class="preference-section">
            <h2>Application data</h2>
            <p>
              Projects, Markdown files, custom forms, settings, and backups are stored together in
              your Windows roaming app folder. Your poems remain readable outside Versewold.
            </p>
            <code class="storage-path">{{ dataDirectory || 'Available in the desktop app' }}</code>
            <button v-if="desktop" class="button secondary" @click="openFolder('data')">
              Open app data folder
              <AppIcon name="folder" :size="16" />
            </button>
            <p v-if="migrated" class="muted">
              Your earlier font-size and form-guide choices were brought into these preferences.
            </p>
            <p v-if="!desktop" class="inline-notice">
              This browser preview is temporary. Open the desktop app to save preferences and
              writing.
            </p>
          </section>
          <section class="preference-section">
            <h2>Saved versions</h2>
            <p>
              Automatic backups keep the 50 most recent versions of each poem and project manifest
              inside your writing folder. Earlier drafts stay readable as Markdown.
            </p>
            <button v-if="desktop" class="button secondary" @click="openFolder('backups')">
              Open backups folder
              <AppIcon name="folder" :size="16" />
            </button>
            <p class="muted">
              To recover a version for now, close Versewold and copy its contents into the matching
              original file. Saved versions do not include typing that has not reached autosave.
            </p>
            <p v-if="!desktop" class="inline-notice">Backups are available in the desktop app.</p>
          </section>
          <section class="preference-section">
            <h2>Room for new forms</h2>
            <p>
              Place version 1 JSON form templates in
              <code>forms/</code>
              inside your writing folder. Give each template a unique ID, then reload the library.
            </p>
            <button class="button secondary" :disabled="!desktop" @click="reloadForms">
              Reload custom forms
              <AppIcon name="book" :size="16" />
            </button>
            <p v-if="formError" class="inline-notice">{{ formError }}</p>
          </section>
        </template>
      </div>
    </div>
  </section>
</template>
