import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Smartphone, Loader2, Package, PieChart, Users, AlertCircle, TrendingDown } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';

interface ReportStats {
    revenue_history: { date: string, total: number }[];
    top_devices: { model: string, brand: string, sales_count: number }[];
    inventory_value: number;
    expected_profit: number;
    sales_by_condition: Record<string, number>;
    total_devices: number;
    total_revenue: number;
    net_profit_realized: number;
    total_purchases: number;
    unpaid_supplier_debt: number;
    top_customers: { name: string, purchases_count: number, total_spent: number }[];
    stock_by_brand: { brand: string, count: number }[];
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

            {/* Financial Overview - Top Core Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="stat-card">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest text-[10px] font-black tracking-widest uppercase">Chiffre d'Affaires Global</p>
                            <p className="text-2xl font-black text-white mt-1">{formatMoney(stats?.total_revenue || 0)} <span className="text-sm font-medium text-slate-500">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                <div className="stat-card !border-emerald-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Bénéfice Net Réalisé</p>
                            <p className="text-2xl font-black text-white mt-1">{formatMoney(stats?.net_profit_realized || 0)} <span className="text-sm font-medium text-slate-500">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>

                <div className="stat-card !border-orange-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Dépenses Achats</p>
                            <p className="text-2xl font-black text-white mt-1">{formatMoney(stats?.total_purchases || 0)} <span className="text-sm font-medium text-slate-500">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                </div>

                <div className="stat-card !border-red-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5"><AlertCircle size={10} /> Dette Fournisseurs</p>
                            <p className="text-2xl font-black text-white mt-1">{formatMoney(stats?.unpaid_supplier_debt || 0)} <span className="text-sm font-medium text-slate-500">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <Package size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="stat-card bg-[#050810] !border-indigo-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Valeur du Stock Actuel</p>
                            <p className="text-3xl font-black text-indigo-400 mt-1">{formatMoney(stats?.inventory_value || 0)} MAD</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-500">Stock total: {stats?.total_devices}</span>
                        </div>
                    </div>
                    <p className="mt-2 text-slate-500 text-xs">Basé sur le prix d'achat enregistré des articles non vendus.</p>
                </div>

                <div className="stat-card bg-[#050810] !border-violet-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Profit Potentiel Prévu</p>
                            <p className="text-3xl font-black text-violet-400 mt-1">{formatMoney(stats?.expected_profit || 0)} MAD</p>
                        </div>
                    </div>
                    <p className="mt-2 text-slate-500 text-xs">Marge latente, si le stock entier est vendu aux prix suggérés actuels.</p>
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
                                            <span className="text-[10px] font-bold bg-black/80 px-1.5 py-0.5 rounded">{formatMoney(h.total)}</span>
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
            </div>            {/* Customers & Brands */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Customers */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Users size={16} className="text-emerald-400" /> Meilleurs Clients
                    </h3>
                    <div className="space-y-4">
                        {(stats?.top_customers || []).map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/03 border border-white/05 hover:bg-white/05 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{c.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{c.purchases_count} achats</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-emerald-400">{formatMoney(c.total_spent)} MAD</p>
                                    <p className="text-[10px] text-slate-600 uppercase">Dépensé</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stock per Brand */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Smartphone size={16} className="text-blue-400" /> Stock par Marque
                    </h3>
                    <div className="space-y-4">
                        {(stats?.stock_by_brand || []).map((b, i) => {
                            const maxBrandCount = Math.max(...(stats?.stock_by_brand.map(x => x.count) || [1]));
                            return (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/03 border border-white/05">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                                            {b.brand.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{b.brand}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-32 h-1.5 bg-white/05 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${(b.count / (maxBrandCount || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-right w-12">
                                            <p className="text-sm font-black text-white">{b.count}</p>
                                            <p className="text-[10px] text-slate-600 uppercase">Appareils</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(stats?.stock_by_brand || []).length === 0 && <p className="text-sm text-slate-500">Aucun appareil en stock.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
