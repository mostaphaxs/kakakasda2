import { useState, useEffect } from 'react';
import { User, Shield, Key, Loader2, Save, Bell, Smartphone, Globe } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

export default function Settings() {
    const [user, setUser] = useState({ name: '', email: '' });
    const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'profile' | 'security' | 'app'>('profile');

    useEffect(() => {
        // En vrai, on récupère l'utilisateur depuis l'API ou un Context
        const storedUser = JSON.parse(localStorage.getItem('user') || '{"name":"Admin","email":"admin@techstock.ma"}');
        setUser(storedUser);
        setLoading(false);
    }, []);

    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await apiFetch('/profile', { method: 'PUT', body: JSON.stringify(user) });
            localStorage.setItem('user', JSON.stringify(res.user));
            toast.success(res.message);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const updatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await apiFetch('/password', { method: 'PUT', body: JSON.stringify(pw) });
            toast.success(res.message);
            setPw({ current_password: '', password: '', password_confirmation: '' });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Sécurité', icon: Shield },
        { id: 'app', label: 'Application', icon: Globe },
    ];

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-black text-white">Paramètres</h1>
                <p className="text-slate-500 text-sm mt-0.5">Gérez votre compte et vos préférences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Nav Sidebar */}
                <div className="w-full lg:w-64 space-y-1">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${tab === t.id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/05 hover:text-white'
                                }`}
                        >
                            <t.icon size={18} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {tab === 'profile' && (
                        <form onSubmit={updateProfile} className="card p-8 space-y-6 max-w-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <User size={20} className="text-indigo-400" /> Informations Personnelles
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nom complet</label>
                                    <input
                                        className="input-dark"
                                        value={user.name}
                                        onChange={e => setUser({ ...user, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Adresse Email</label>
                                    <input
                                        type="email"
                                        className="input-dark"
                                        value={user.email}
                                        onChange={e => setUser({ ...user, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Enregistrer les modifications
                            </button>
                        </form>
                    )}

                    {tab === 'security' && (
                        <form onSubmit={updatePassword} className="card p-8 space-y-6 max-w-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Key size={20} className="text-indigo-400" /> Mot de passe
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mot de passe actuel</label>
                                    <input
                                        type="password"
                                        className="input-dark"
                                        value={pw.current_password}
                                        onChange={e => setPw({ ...pw, current_password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nouveau mot de passe</label>
                                        <input
                                            type="password"
                                            className="input-dark"
                                            value={pw.password}
                                            onChange={e => setPw({ ...pw, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Confirmer</label>
                                        <input
                                            type="password"
                                            className="input-dark"
                                            value={pw.password_confirmation}
                                            onChange={e => setPw({ ...pw, password_confirmation: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Mettre à jour le mot de passe
                            </button>
                        </form>
                    )}

                    {tab === 'app' && (
                        <div className="card p-8 space-y-6 max-w-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Globe size={20} className="text-indigo-400" /> Préférences Système
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/03 border border-white/05">
                                    <div className="flex items-center gap-3">
                                        <Bell className="text-slate-500" size={18} />
                                        <div>
                                            <p className="text-sm font-semibold text-white">Notifications</p>
                                            <p className="text-xs text-slate-500">Alertes de stock et ventes</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-5 bg-indigo-500 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/03 border border-white/05">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="text-slate-500" size={18} />
                                        <div>
                                            <p className="text-sm font-semibold text-white">Mode Sidecar</p>
                                            <p className="text-xs text-slate-500">Optimisation pour Tauri</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-pointer">
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
