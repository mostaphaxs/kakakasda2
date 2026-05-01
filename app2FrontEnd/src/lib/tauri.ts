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
    const cleanUrl = url.split('?')[0].toLowerCase();

    // Very permissive check: if it's from our API storage and is a viewable file type
    const isInternal = url.includes('sidecar-serve') || url.includes('/storage/');
    const isViewable = cleanUrl.endsWith('.pdf') ||
        /\.(png|jpg|jpeg|webp|jfif|gif)$/.test(cleanUrl) ||
        url.includes('/scanned_docs/') ||
        url.includes('/receipts/') ||
        url.includes('/clients/') ||
        url.includes('/ouvriers/') ||
        url.includes('/salaries/') ||
        url.includes('/contentieux_docs/') ||
        url.includes('/contentieux_scans/') ||
        url.includes('/commissaire_scans/') ||
        url.includes('/invoice_scans/') ||
        url.includes('/contracts/');

    const isDoc = isInternal && isViewable;

    // 2. If it's a document and the handler is ready, show internal preview
    if (isDoc && previewHandler) {
        console.log('[tauri] INTERCEPTED for internal preview:', url);
        previewHandler(url);
        return;
    }

    // fallback log to see if it missed
    if (isDoc && !previewHandler) {
        console.warn('[tauri] Document detected but previewHandler is NULL:', url);
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
