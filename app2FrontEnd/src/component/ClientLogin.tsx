import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, ArrowRight, Loader2 } from 'lucide-react';
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
        <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
            <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 text-white p-12">
                <img src="/assets/hero.png" alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-45" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
                <div className="relative flex items-center gap-3">
                    <img src="/assets/logoLogin.png" alt="" className="h-10 w-auto rounded-md bg-white/90 p-1" />
                    <div className="leading-tight">
                        <p className="text-sm font-semibold">El Ouaha</p>
                        <p className="text-xs text-white/60">Espace acquéreur</p>
                    </div>
                </div>
                <div className="relative max-w-md">
                    <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight">
                        Suivez votre futur logement, <span className="text-brand-400">en toute transparence.</span>
                    </h1>
                    <p className="mt-4 text-sm text-white/75">Vos paiements, votre échéancier et l'avancement des travaux de votre bien, à tout moment.</p>
                </div>
                <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Amical El Ouaha</p>
            </aside>

            <main className="flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Espace acquéreur</h2>
                    <p className="mt-1.5 text-sm text-slate-500">Entrez le numéro de votre CIN pour accéder à votre dossier.</p>

                    <form onSubmit={handleLogin} className="mt-8 space-y-5">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Numéro de CIN</label>
                            <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={cin}
                                    autoFocus
                                    onChange={(e) => setCin(e.target.value.toUpperCase())}
                                    placeholder="Ex : AB123456"
                                    required
                                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 tracking-wide placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-colors group"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Accéder à mon dossier <ArrowRight className="group-hover:translate-x-0.5 transition-transform" size={16} /></>}
                        </button>
                    </form>

                    <button type="button" onClick={() => navigate('/login')} className="mt-10 pt-6 w-full border-t border-slate-100 text-left text-sm text-slate-500 hover:text-slate-900">
                        ← Espace administration
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ClientLogin;
