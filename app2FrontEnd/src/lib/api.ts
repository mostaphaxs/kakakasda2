const API = import.meta.env.VITE_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            ...(options.headers || {}),
        },
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
