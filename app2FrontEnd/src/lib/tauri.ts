import { STORAGE_BASE } from './api';
import { invoke } from '@tauri-apps/api/core';

// Simple event bus to trigger the global previewer
type PreviewHandler = (url: string) => void;
let previewHandler: PreviewHandler | null = null;

export function registerPreviewHandler(handler: PreviewHandler) {
    previewHandler = handler;
}

/**
 * Enhanced openExternal that intercepts local storage URLs 
 * to show them in the internal previewer instead of a browser.
 */
export async function openExternal(url: string): Promise<void> {
    // 1. Check if it's a document/receipt from our storage
    const isDoc = url.includes('/storage/') && (
        url.toLowerCase().endsWith('.pdf') ||
        url.toLowerCase().endsWith('.png') ||
        url.toLowerCase().endsWith('.jpg') ||
        url.toLowerCase().endsWith('.jpeg') ||
        url.toLowerCase().endsWith('.webp') ||
        url.includes('/scanned_docs/') ||
        url.includes('/receipts/')
    );

    // 2. If it's a document and the handler is ready, show internal preview
    if (isDoc && previewHandler) {
        console.log('[tauri] Intercepting document for internal preview:', url);
        previewHandler(url);
        return;
    }

    // 3. Fallback: Open in system browser
    console.log('[tauri] Opening external URL:', url);
    try {
        await invoke('open_url', { url });
    } catch (err) {
        console.error('Failed to open external URL:', err);
        window.open(url, '_blank');
    }
}
