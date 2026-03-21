import { invoke } from '@tauri-apps/api/core';

/**
 * Opens a URL in the system's default browser.
 * This bypasses Tauri's internal navigation restrictions.
 */
export async function openExternal(url: string): Promise<void> {
    try {
        await invoke('open_url', { url });
    } catch (err) {
        console.error('Failed to open external URL:', err);
        // Fallback: try standard navigation, though likely blocked
        window.open(url, '_blank');
    }
}
