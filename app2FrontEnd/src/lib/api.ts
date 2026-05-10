const API = import.meta.env.VITE_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...(options.headers as Record<string, string> || {}),
    };

    // Auto-omit Content-Type for FormData to let browser set boundary
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API}${path}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur serveur' }));
        throw new Error(err.message || 'Erreur serveur');
    }

    return res.status === 204 ? null : res.json();
}

export const formatMoney = (val: number | string | null | undefined) => {
    if (!val) return "0.00";
    return Number(val).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
