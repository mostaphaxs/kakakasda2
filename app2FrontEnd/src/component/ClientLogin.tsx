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
            <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-white overflow-hidden p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mb-2">
                        <Home size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Espace Acquéreur</h1>
                    <p className="text-sm font-medium text-slate-400"> Amical El Ouaha </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Votre Identifiant (CIN)</label>
                        <div className="relative group">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={cin}
                                onChange={(e) => setCin(e.target.value.toUpperCase())}
                                placeholder="Tapez votre CIN ici..."
                                required
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-amber-200 outline-none transition-all font-bold text-slate-700 tracking-wider"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group disabled:opacity-50"
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
                    <p className="text-[10px] text-slate-400 font-medium">© 2026 Amical El Ouaha </p>
                </div>
            </div>
        </div>
    );
};

export default ClientLogin;
