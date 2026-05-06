import { useNavigate } from 'react-router-dom';
import { Cpu, ShieldCheck, Zap, BarChart3, ArrowRight, Smartphone } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    return (
        <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden relative">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Cpu size={22} className="text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tight">TechStock <span className="text-indigo-400">ERP</span></span>
                </div>
                <div className="flex items-center gap-4">
                    {token ? (
                        <button onClick={() => navigate('/dashboard')} className="btn-primary">
                            Accéder au Dashboard <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-semibold">
                            Se connecter
                        </button>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 animate-fade-in tracking-wide uppercase">
                    <Zap size={12} /> Powered by Gemini 2.0 AI
                </div>

                <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 animate-fade-in">
                    Gérez votre stock High-Tech <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
                        avec une intelligence infinie.
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

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
                    {[
                        { title: 'Traçabilité Totale', icon: ShieldCheck, desc: 'Suivez chaque appareil par IMEI ou Numéro de Série, du rachat à la vente.' },
                        { title: 'Pricing IA', icon: Zap, desc: 'Laissez Gemini suggérer les meilleurs prix basés sur l\'état et le marché local.' },
                        { title: 'Analyse Ventes', icon: BarChart3, desc: 'Visualisez vos marges et vos produits phares avec des rapports cristallins.' }
                    ].map((f, i) => (
                        <div key={i} className="card p-8 text-left group hover:bg-white/[0.05] transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <f.icon size={24} className="text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Device Preview Mockup */}
                <div className="mt-32 w-full max-w-5xl relative animate-fade-in">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
                    <div className="relative card overflow-hidden border-white/10 bg-slate-900/40 backdrop-filter blur-sm p-4">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                            <div className="flex gap-1.5 focus:outline-none">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                            </div>
                            <div className="mx-auto bg-white/5 px-4 py-1 rounded-md text-[10px] text-slate-500 font-mono">techstock-erp.local/dashboard</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="skeleton h-32 col-span-1" />
                            <div className="skeleton h-32 col-span-1" />
                            <div className="skeleton h-32 col-span-1" />
                            <div className="skeleton h-32 col-span-1" />
                            <div className="skeleton h-60 col-span-4" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 animate-pulse ring-4 ring-indigo-500/20 rounded-full">
                        <div className="bg-indigo-500 p-4 rounded-full shadow-xl shadow-indigo-500/40">
                            <Smartphone size={32} className="text-white" />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-12 border-t border-white/5 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <Cpu size={18} />
                        <span className="text-sm font-bold">TechStock ERP 1.0</span>
                    </div>
                    <p className="text-slate-600 text-sm">© 2026 Conçu pour les revendeurs d'élite.</p>
                </div>
            </footer>
        </div>
    );
}
