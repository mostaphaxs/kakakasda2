// src/lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all API communication.
// Reads the base URL from the Vite environment variable VITE_API_URL so it
// is never hard-coded in component files.
// ─────────────────────────────────────────────────────────────────────────────

import { invoke } from '@tauri-apps/api/core';
import { notifyDataChanged } from './queryClient';

/** Request logging only while developing. */
const debug = (...a: unknown[]) => { if (import.meta.env.DEV) console.log(...a); };

// Default values from .env as a safe fallback
const GET_VITE_URL = () => {
    const url = import.meta.env.VITE_API_URL;
    if (typeof url === 'string' && url.includes('VITE_API_URL=')) {
        return url.split('VITE_API_URL=')[1];
    }
    return url;
};

/** True inside the desktop app (Tauri), false in a normal browser. */
export const isDesktopApp = () => !!(window as any).__TAURI_INTERNALS__;

// Opened in a browser from the main PC's address ("Accès réseau"): the backend
// that served the page is the API, whatever its IP and port.
const SERVED_BY_BACKEND = import.meta.env.PROD && !isDesktopApp() && /^https?:$/.test(window.location.protocol);

const DEFAULT_URL = SERVED_BY_BACKEND ? `${window.location.origin}/api` : (GET_VITE_URL() || 'http://127.0.0.1:8000/api');

export let API_BASE = DEFAULT_URL.replace(/\/+$/, '');
export let STORAGE_BASE = API_BASE + '/sidecar-serve';


/**
 * Initializes the API configuration by fetching the dynamic port/URL from Tauri.
 * This should be called in main.tsx before the app renders.
 */
export async function initializeApiConfig() {
    try {
        if (!(window as any).__TAURI_INTERNALS__) {
            debug("[api] Not running in Tauri, skipping dynamic config.");
            return;
        }
        // Attempt to get the dynamic URL from Rust
        const tauriUrl = await invoke<string>('get_api_config');
        if (tauriUrl && tauriUrl.startsWith('http')) {
            API_BASE = tauriUrl.replace(/\/+$/, '');
            STORAGE_BASE = API_BASE + '/sidecar-serve';
            debug(`[api] Dynamic configuration loaded:`);
            debug(`      API_BASE:     ${API_BASE}`);
            debug(`      STORAGE_BASE: ${STORAGE_BASE}`);
        }
    } catch (error: any) {
        console.warn("[api] Failed to fetch dynamic config from Tauri, using .env fallback:", error?.message || error);
    }
}

// ── Auth headers ──────────────────────────────────────────────────────────────

/**
 * Returns JSON + Accept headers, plus Authorization if a token exists.
 * The token is read fresh on every call so logout updates take effect immediately.
 */
export function authHeaders(isFormData = false): HeadersInit {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Tells Laravel this is an AJAX/API call
    };

    // Only set Content-Type if NOT FormData. 
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// ── Generic fetch wrapper ─────────────────────────────────────────────────────

interface ApiOptions extends RequestInit {
    /** Skip attaching the Bearer token (e.g. for the public /login route). */
    public?: boolean;
}

/**
 * Wrapper around fetch that:
 *  - Prepends API_BASE automatically
 *  - Attaches auth headers unless `options.public` is true
 *  - Parses JSON and throws a normalised Error on non-2xx responses
 *  - Surfaces Laravel validation errors as a readable string
 */
export async function apiFetch<T = unknown>(
    path: string,
    options: ApiOptions = {}
): Promise<T> {
    const { public: isPublic, ...fetchOptions } = options;

    const isFormData = fetchOptions.body instanceof FormData;

    debug(`[api] Fetching: ${options.method || 'GET'} ${API_BASE}${path}`);
    let data: any = null;
    const response = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(isPublic
                ? (!isFormData ? { 'Content-Type': 'application/json' } : {})
                : authHeaders(isFormData)),
            ...(options.headers as any || {})
        }
    });

    if (response.status !== 204) {
        const text = await response.text();
        debug(`[api] Response Status: ${response.status}`);
        debug(`[api] Content-Type: ${response.headers.get('Content-Type')}`);

        try {
            data = JSON.parse(text);
        } catch {
            console.error('[api] Invalid JSON response. First 500 chars:', text.slice(0, 500));
            throw new Error(`Réponse invalide du serveur (${response.status}). Le contenu n'est pas du JSON.`);
        }
    }

    if (!response.ok) {
        // Surface the first Laravel validation message when available.
        if (data?.errors) {
            const first = Object.values(data.errors as Record<string, string[]>)[0][0];
            const error = new Error(first) as any;
            error.errors = data.errors; // Attach the full errors object
            throw error;
        }
        throw new Error(data?.message || `Erreur serveur (${response.status}).`);
    }

    // any successful save refreshes the cached data shown elsewhere
    const method = (fetchOptions.method || 'GET').toUpperCase();
    if (method !== 'GET' && path !== '/login') notifyDataChanged();

    return data as T;
}
