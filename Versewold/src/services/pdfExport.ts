import { ref } from 'vue';
// Shared by the close handler, keyboard shortcuts, and route guard. The native
// print callback must finish before anything replaces the preview DOM.
export const pdfPrinting = ref(false);
