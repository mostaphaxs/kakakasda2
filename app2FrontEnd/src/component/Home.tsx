import { useNavigate } from 'react-router-dom';
import { Cpu, ShieldCheck, Zap, BarChart3, ArrowRight, Smartphone } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    return (
        <div className="min-h-screen bg-white text-[#0f172a] overflow-hidden relative">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#f97316]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-100 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#f97316] flex items-center justify-center shadow-lg shadow-[#f97316]/30">
                        <Cpu size={22} className="text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase italic">TechStock <span className="text-[#f97316]">ERP</span></span>
                </div>
                <div className="flex items-center gap-4">
                    {token ? (
                        <button onClick={() => navigate('/dashboard')} className="btn-primary shadow-lg shadow-[#f97316]/20 py-2.5">
                            Accéder au Dashboard <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest italic">
                            Se connecter
                        </button>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fef2e0] border border-[#ea580c]/10 text-[#ea580c] text-[10px] font-black mb-8 animate-fade-in tracking-[0.2em] uppercase italic">
                    <Zap size={12} /> Powered by Gemini 2.0 AI
                </div>

                <h1 className="text-5xl lg:text-8xl font-black tracking-tighter mb-6 animate-fade-in text-[#0f172a] uppercase italic leading-[0.9]">
                    Gérez votre stock <br />
                    <span className="text-[#f97316]">
                        High-Tech d'élite.
                    </span>
                </h1>

                <p className="text-slate-400 text-lg lg:text-xl max-w-2xl mb-12 animate-fade-in text-balance">
                    TechStock ERP transforme la gestion de votre boutique d'électronique. Traçabilité IMEI,
                    pricing intelligent par IA, et rapports en temps réel dans une interface native ultra-rapide.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
                    <button onClick={() => navigate(token ? '/dashboard' : '/login')} className="btn-primary !px-10 !py-4 text-base">
                        {token ? 'Reprendre le travail' : 'Démarrer maintenant'} <ArrowRight size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
                    {[
                        { title: 'Traçabilité Totale', icon: ShieldCheck, desc: 'Suivez chaque appareil par IMEI ou Numéro de Série, du rachat à la vente.' },
                        { title: 'Pricing IA', icon: Zap, desc: 'Laissez Gemini suggérer les meilleurs prix basés sur l\'état et le marché local.' },
                        { title: 'Analyse Ventes', icon: BarChart3, desc: 'Visualisez vos marges et vos produits phares avec des rapports cristallins.' }
                    ].map((f, i) => (
                        <div key={i} className="card p-8 text-left group hover:bg-[#f97316]/5 hover:border-[#f97316]/20 transition-all shadow-sm border-slate-100">
                            <div className="w-12 h-12 rounded-lg bg-[#f97316]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                                <f.icon size={24} className="text-[#f97316]" />
                            </div>
                            <h3 className="text-lg font-black mb-3 uppercase tracking-tighter text-[#0f172a] italic">{f.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-[13px] font-medium">{f.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Device Preview Mockup */}
                <div className="mt-32 w-full max-w-5xl relative animate-fade-in">
                    <div className="absolute inset-0 bg-[#f97316]/5 blur-[100px] rounded-full" />
                    <div className="relative card overflow-hidden border-slate-200 bg-white shadow-2xl p-4">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                            <div className="flex gap-1.5 focus:outline-none">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                            </div>
                            <div className="mx-auto bg-slate-50 px-4 py-1 rounded-md text-[10px] text-slate-400 font-black uppercase tracking-widest">techstock-erp.local/dashboard</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="skeleton h-32 col-span-1 border border-slate-100" />
                            <div className="skeleton h-32 col-span-1 border border-slate-100" />
                            <div className="skeleton h-32 col-span-1 border border-slate-100" />
                            <div className="skeleton h-32 col-span-1 border border-slate-100" />
                            <div className="skeleton h-60 col-span-4 border border-slate-100" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 animate-pulse ring-4 ring-[#f97316]/20 rounded-full">
                        <div className="bg-[#f97316] p-4 rounded-full shadow-xl shadow-[#f97316]/40">
                            <Smartphone size={32} className="text-white" />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-12 border-t border-slate-100 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 italic">
                        <Cpu size={18} className="text-[#f97316]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">TechStock Control Center 1.0</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">© 2026 Conçu pour les revendeurs d'élite.</p>
                </div>
            </footer>
        </div>
    );
}
