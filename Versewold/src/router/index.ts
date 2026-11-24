import { createRouter, createWebHashHistory } from 'vue-router';

// Hash history also works when Tauri serves the production bundle without a web server.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'desk', component: () => import('../views/WritingDeskView.vue') },
    { path: '/forms', name: 'forms', component: () => import('../views/FormLibraryView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
    {
      path: '/manuscript',
      name: 'manuscript',
      component: () => import('../views/ManuscriptView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
