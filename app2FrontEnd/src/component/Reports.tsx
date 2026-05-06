import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Smartphone, Loader2, Package, PieChart } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ReportStats {
    revenue_history: { date: string, total: number }[];
    top_devices: { model: string, brand: string, sales_count: number }[];
    inventory_value: number;
    expected_profit: number;
    sales_by_condition: Record<string, number>;
    total_devices: number;
}

export default function Reports() {
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/reports')
            .then(setStats)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Rapports & Analyses</h1>
                    <p className="text-slate-500 text-sm">Performance commerciale et santé du stock</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary !text-xs">Derniers 30 jours</button>
                    <button className="btn-primary !text-xs">Exporter PDF</button>
                </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="stat-card">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">Chiffre d'Affaires</p>
                            <p className="text-3xl font-black text-white mt-1">{(stats?.revenue_history.reduce((a, b) => a + b.total, 0) || 0).toLocaleString()} MAD</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <TrendingUp size={14} /> +12.5% vs mois dernier
                    </div>
                </div>

                <div className="stat-card !border-indigo-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">Valeur du Stock</p>
                            <p className="text-3xl font-black text-white mt-1">{(stats?.inventory_value || 0).toLocaleString()} MAD</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <Package size={24} />
                        </div>
                    </div>
                    <p className="mt-4 text-slate-500 text-xs">Basé sur le prix d'achat actuel</p>
                </div>

                <div className="stat-card !border-violet-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">Profit Prévu</p>
                            <p className="text-3xl font-black text-white mt-1">{(stats?.expected_profit || 0).toLocaleString()} MAD</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                        Marges suggérées par Gemini AI actives
                    </div>
                </div>
            </div>

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart Sim */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-400" /> Évolution des ventes
                    </h3>
                    <div className="flex items-end gap-2 h-48">
                        {stats?.revenue_history.map((h, i) => {
                            const max = Math.max(...stats.revenue_history.map(x => x.total));
                            const height = (h.total / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full bg-white/05 rounded-t-lg flex items-end overflow-hidden h-full">
                                        <div
                                            className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500 group-hover:to-indigo-300"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-bold bg-black/80 px-1.5 py-0.5 rounded">{h.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono -rotate-45 mt-2">{h.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Devices */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                        <PieChart size={16} className="text-violet-400" /> Produits les plus vendus
                    </h3>
                    <div className="space-y-4">
                        {(stats?.top_devices || []).map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/03 border border-white/05 hover:bg-white/05 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                                        {d.brand.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{d.brand} {d.model}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Smartphone</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-indigo-400">{d.sales_count}</p>
                                    <p className="text-[10px] text-slate-600 uppercase">Unités</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Condition Distribution */}
            <div className="card p-6">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone size={16} className="text-emerald-400" /> Répartition par état
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(stats?.sales_by_condition || {}).map(([c, count]) => (
                        <div key={c} className="p-4 rounded-2xl bg-white/02 border border-white/05 text-center">
                            <p className="text-2xl font-black text-white">{count}</p>
                            <p className="text-xs text-slate-500 uppercase mt-1">
                                {c === 'New' ? 'Neuf' : c === 'Used' ? 'Occasion' : 'Reconditionné'}
                            </p>
                            <div className="w-full h-1 bg-white/05 rounded-full mt-3 overflow-hidden">
                                <div
                                    className={`h-full ${c === 'New' ? 'bg-emerald-500' : c === 'Used' ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${(count / (stats?.total_devices || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
