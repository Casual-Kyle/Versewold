import { openUrl } from '@tauri-apps/plugin-opener';
import { desktop } from './workspaceRepository';

/** Tauri needs its opener for external links; the browser preview uses a normal tab. */
export async function openSource(url: string) {
  if (!url.startsWith('https://')) throw new Error('Source links must use HTTPS.');
  if (desktop) await openUrl(url);
  else globalThis.open(url, '_blank', 'noopener,noreferrer');
}
