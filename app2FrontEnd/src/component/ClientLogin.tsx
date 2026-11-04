import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, ArrowRight, Loader2, Home } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

const ClientLogin = () => {
    const [cin, setCin] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCin = cin.trim();
        if (!cleanCin) return;

        setLoading(true);
        try {
            // Use our new public endpoint
            const clientData = await apiFetch(`/clients/portal-login/${cleanCin}`) as any;
            localStorage.setItem('clientUser', JSON.stringify(clientData));
            toast.success(`Bienvenue, M./Mme ${clientData.nom} !`);
            navigate('/portal/dashboard');
        } catch (err: any) {
            const msg = err.response?.message || `CIN "${cleanCin}" introuvable.`;
            const suggestions = err.response?.suggestions || [];

            if (suggestions.length > 0) {
                toast.error(`${msg} Essayez : ${suggestions.join(', ')}`, { duration: 6000 });
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 space-y-8 duration-500 ring-1 ring-slate-900/5 animate-dialog-in">
                <div className="text-center space-y-2">
                    <div className="hidden">
                        <Home size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Espace Acquéreur</h1>
                    <p className="text-sm font-medium text-slate-400">Société Les Cinq Éléments</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-medium pl-1 text-slate-600">Votre Identifiant (CIN)</label>
                        <div className="relative group">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={cin}
                                onChange={(e) => setCin(e.target.value.toUpperCase())}
                                placeholder="Tapez votre CIN ici..."
                                required
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 text-white rounded-lg font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 group disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                Accéder à mon dossier
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="pt-8 border-t border-slate-50 text-center">
                    <p className="text-xs text-slate-400 font-medium">© 2024 Société Les Cinq Éléments</p>
                </div>
            </div>
        </div>
    );
};

export default ClientLogin;
