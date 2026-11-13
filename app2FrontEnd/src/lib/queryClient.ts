import { QueryClient } from '@tanstack/react-query';

/** Shared data cache for the whole app. */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

let pending: ReturnType<typeof setTimeout> | null = null;
/**
 * Called after any successful save (POST/PUT/DELETE) anywhere in the app, so
 * every screen that shows cached data (home, bell, échéancier, search…)
 * refreshes — even when the change was made on an older page.
 * Debounced so a burst of saves triggers a single refresh.
 */
export function notifyDataChanged() {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
        pending = null;
        queryClient.invalidateQueries();
    }, 150);
}
