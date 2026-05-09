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
                <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Paramètres</h1>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Gérez votre compte et vos préférences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-64 space-y-1">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-black text-[10px] uppercase tracking-widest ${tab === t.id ? 'bg-[#fef2e0] text-[#ea580c] border border-[#ea580c]/10' : 'text-slate-400 hover:bg-slate-50 hover:text-[#0f172a]'
                                }`}
                        >
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {tab === 'profile' && (
                        <form onSubmit={updateProfile} className="card p-8 space-y-8 max-w-xl border-[#f97316]/5 shadow-sm">
                            <h3 className="text-xs font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter italic">
                                <User size={18} className="text-[#f97316]" /> Informations Personnelles
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Nom complet</label>
                                    <input
                                        className="input-dark font-bold font-italic"
                                        value={user.name}
                                        onChange={e => setUser({ ...user, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Adresse Email</label>
                                    <input
                                        type="email"
                                        className="input-dark font-bold font-italic"
                                        value={user.email}
                                        onChange={e => setUser({ ...user, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary w-full justify-center py-4 text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-orange-500/10" disabled={saving}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Enregistrer les modifications
                            </button>
                        </form>
                    )}

                    {tab === 'security' && (
                        <form onSubmit={updatePassword} className="card p-8 space-y-8 max-w-xl border-[#f97316]/5 shadow-sm">
                            <h3 className="text-xs font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter italic">
                                <Key size={18} className="text-[#f97316]" /> Sécurité du compte
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Mot de passe actuel</label>
                                    <input
                                        type="password"
                                        className="input-dark font-bold"
                                        value={pw.current_password}
                                        onChange={e => setPw({ ...pw, current_password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Nouveau</label>
                                        <input
                                            type="password"
                                            className="input-dark font-bold"
                                            value={pw.password}
                                            onChange={e => setPw({ ...pw, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Confirmer</label>
                                        <input
                                            type="password"
                                            className="input-dark font-bold"
                                            value={pw.password_confirmation}
                                            onChange={e => setPw({ ...pw, password_confirmation: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="btn-primary w-full justify-center py-4 text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-orange-500/10" disabled={saving}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Mettre à jour le mot de passe
                            </button>
                        </form>
                    )}

                    {tab === 'app' && (
                        <div className="card p-8 space-y-8 max-w-xl border-[#f97316]/5 shadow-sm">
                            <h3 className="text-xs font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter italic">
                                <Globe size={18} className="text-[#f97316]" /> Préférences Système
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Bell className="text-[#f97316]" size={18} />
                                        <div>
                                            <p className="text-xs font-black text-[#0f172a] uppercase italic tracking-tighter">Notifications</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Alertes de stock et ventes</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-5 bg-[#f97316] rounded-full relative cursor-pointer shadow-sm">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="text-slate-400" size={18} />
                                        <div>
                                            <p className="text-xs font-black text-[#0f172a] uppercase italic tracking-tighter">Mode Sidecar</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Optimisation pour Desktop</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-pointer">
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
