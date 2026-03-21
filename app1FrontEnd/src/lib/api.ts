// src/lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all API communication.
// Reads the base URL from the Vite environment variable VITE_API_URL so it
// is never hard-coded in component files.
// ─────────────────────────────────────────────────────────────────────────────

// Fail fast at build time if the env variable is missing.
let RAW_URL = import.meta.env.VITE_API_URL as string | undefined;

// Robustness check: if the user accidentally included the key (e.g. VITE_API_URL=http://...)
if (RAW_URL && RAW_URL.includes('VITE_API_URL=')) {
    RAW_URL = RAW_URL.split('VITE_API_URL=')[1];
}

if (!RAW_URL || !RAW_URL.startsWith('http')) {
    throw new Error(
        `[api] VITE_API_URL is invalid or missing: "${RAW_URL}". ` +
        'It MUST be an absolute URL starting with http:// or https://'
    );
}

// Strip any accidental trailing slash for consistent concatenation.
export const API_BASE = RAW_URL.replace(/\/+$/, '');
export const STORAGE_BASE = API_BASE.replace(/\/api$/, '') + '/storage';

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

    console.log(`[api] Fetching: ${options.method || 'GET'} ${API_BASE}${path}`);
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
        console.log(`[api] Response Status: ${response.status}`);
        console.log(`[api] Content-Type: ${response.headers.get('Content-Type')}`);

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

    return data as T;
}
