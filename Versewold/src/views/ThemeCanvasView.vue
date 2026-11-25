<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useWorkspace } from '../composables/useWorkspace';
import CollectionCanvas from '../components/collection/CollectionCanvas.vue';
import AppIcon from '../components/ui/AppIcon.vue';

const { activeProject, selectPoem } = useWorkspace();
const router = useRouter();
function openPoem(id: string) {
  selectPoem(id);
  void router.push('/');
}
</script>

<template>
  <section class="theme-canvas-view">
    <header class="view-toolbar">
      <div class="breadcrumbs">
        <AppIcon name="folder" :size="16" />
        <span>Theme canvas</span>
        <AppIcon v-if="activeProject" name="chevron" :size="12" />
        <strong v-if="activeProject">{{ activeProject.title }}</strong>
      </div>
      <RouterLink to="/collection" class="text-button">Collection overview</RouterLink>
    </header>
    <CollectionCanvas
      v-if="activeProject"
      :key="activeProject.id"
      :project="activeProject"
      @open="openPoem"
    />
    <p v-else class="canvas-empty">Choose a collection in the sidebar to use its canvas.</p>
  </section>
</template>
