// activeProject.ts — the project chosen in the sidebar ("Projet actif").
// Every page that has a project filter follows it, so the whole app can be
// switched to one project in a single click instead of filtering page by page.
//
//   const [filterTerrain, setFilterTerrain] = useProjectFilter('Clients.filterTerrain', 'all', p => String(p.id));
//
// The page filter stays editable: it is only moved when the active project changes.

import { useEffect, useRef, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { usePersistedState } from './usePersistedState';

export interface ActiveProject { id: number; name: string }

const KEY = 'activeProject';
const read = (): ActiveProject | null => {
    try {
        const p = JSON.parse(localStorage.getItem(KEY) || 'null');
        return p && typeof p.id === 'number' ? p : null;
    } catch { return null; }
};

let current: ActiveProject | null = read();
const subs = new Set<() => void>();

export const getActiveProject = () => current;

export function setActiveProject(p: ActiveProject | null) {
    if ((p?.id ?? null) === (current?.id ?? null) && (p?.name ?? '') === (current?.name ?? '')) return;
    current = p;
    try { p ? localStorage.setItem(KEY, JSON.stringify(p)) : localStorage.removeItem(KEY); } catch { /* ignore */ }
    subs.forEach(f => f());
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** The project chosen in the sidebar, or null for "all projects". */
export const useActiveProject = () => useSyncExternalStore(subscribe, getActiveProject);

/**
 * A page's project filter that follows the active project.
 * `allValue` is the page's "all projects" value; `toValue` converts the active
 * project to the page's own filter value (id as text, id as number, project name…).
 */
export function useProjectFilter<T>(key: string, allValue: T, toValue: (p: ActiveProject) => T): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = usePersistedState<T>(key, allValue);
    const active = useActiveProject();
    const mounted = useRef(false);
    useEffect(() => {
        if (active) setValue(toValue(active));
        else if (mounted.current) setValue(allValue); // switched back to "all" while on the page
        mounted.current = true;
    }, [active?.id, active?.name]); // eslint-disable-line react-hooks/exhaustive-deps
    return [value, setValue];
}
