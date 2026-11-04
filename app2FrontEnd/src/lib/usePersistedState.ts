// usePersistedState.ts
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for useState that remembers the value between visits
// (used for page searches and filters). Stored per key in localStorage.
//
//   const [searchTerm, setSearchTerm] = usePersistedState('clients.searchTerm', '');
//
// useUrlSearch(setSearchTerm) lets other screens deep-link into a page with a
// pre-filled search, e.g. navigate('/clients?search=AB1234').
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';

const PREFIX = 'filters:';

export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw !== null ? (JSON.parse(raw) as T) : initial;
        } catch {
            return initial;
        }
    });

    useEffect(() => {
        try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }, [key, value]);

    return [value, setValue];
}

/** Apply `?search=` from the URL (deep links from the command palette / notifications). */
export function useUrlSearch(setSearch: (v: string) => void) {
    const [params] = useSearchParams();
    const q = params.get('search');
    useEffect(() => {
        if (q) setSearch(q);
    }, [q, setSearch]);
}

/** Forget all remembered filters (e.g. "Réinitialiser partout"). */
export function clearPersistedFilters() {
    try {
        Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
}
