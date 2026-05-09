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
                    <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Rapports & Analyses</h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Performance commerciale et santé du stock</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary !text-[10px] font-bold uppercase tracking-widest">Derniers 30 jours</button>
                    <button className="btn-primary !text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">Exporter PDF</button>
                </div>
            </div>

            {/* Financial Overview - Top Core Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="stat-card">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">CA Global</p>
                            <p className="text-xl font-black text-[#0f172a] mt-1 italic">{formatMoney(stats?.total_revenue || 0)} <span className="text-[10px] font-medium text-slate-400">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm border border-blue-500/10">
                            <DollarSign size={18} />
                        </div>
                    </div>
                </div>

                <div className="stat-card !border-emerald-500/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Bénéfice Net</p>
                            <p className="text-xl font-black text-[#0f172a] mt-1 italic">{formatMoney(stats?.net_profit_realized || 0)} <span className="text-[10px] font-medium text-slate-400">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-500/10">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                </div>

                <div className="stat-card !border-[#f97316]/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Dépenses Achats</p>
                            <p className="text-xl font-black text-[#0f172a] mt-1 italic">{formatMoney(stats?.total_purchases || 0)} <span className="text-[10px] font-medium text-slate-400">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316] shadow-sm border border-[#f97316]/10">
                            <TrendingDown size={18} />
                        </div>
                    </div>
                </div>

                <div className="stat-card !border-red-500/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5"><AlertCircle size={10} /> Dette Fourn.</p>
                            <p className="text-xl font-black text-[#0f172a] mt-1 italic">{formatMoney(stats?.unpaid_supplier_debt || 0)} <span className="text-[10px] font-medium text-slate-400">MAD</span></p>
                        </div>
                        <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center text-red-500 shadow-sm border border-red-500/10">
                            <Package size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="stat-card bg-[#fef2e0]/30 !border-[#f97316]/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Valeur du Stock Actuel</p>
                            <p className="text-2xl font-black text-[#ea580c] mt-1 italic">{formatMoney(stats?.inventory_value || 0)} MAD</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Stock total: {stats?.total_devices} units</span>
                        </div>
                    </div>
                    <p className="mt-2 text-slate-400 text-[10px] font-medium uppercase tracking-tight">Basé sur le prix d'achat enregistré des articles non vendus.</p>
                </div>

                <div className="stat-card bg-emerald-50/30 !border-emerald-500/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Profit Potentiel Prévu</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1 italic">{formatMoney(stats?.expected_profit || 0)} MAD</p>
                        </div>
                    </div>
                    <p className="mt-2 text-slate-400 text-[10px] font-medium uppercase tracking-tight">Marge latente, si le stock entier est vendu aux prix suggérés.</p>
                </div>
            </div>

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart Sim */}
                <div className="card p-6 border-[#f97316]/5 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={14} className="text-[#f97316]" /> Évolution des ventes
                    </h3>
                    <div className="flex items-end gap-2 h-48">
                        {stats?.revenue_history.map((h, i) => {
                            const max = Math.max(...stats.revenue_history.map(x => x.total));
                            const height = (h.total / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full bg-white border border-slate-100 rounded-t-lg flex items-end overflow-hidden h-full">
                                        <div
                                            className="w-full bg-gradient-to-t from-[#ea580c] to-[#f97316] transition-all duration-300 group-hover:to-[#fb923c]"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[9px] font-black bg-white border border-slate-200 text-[#0f172a] px-2 py-1 rounded shadow-lg">{formatMoney(h.total)}</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold -rotate-45 mt-2 uppercase tracking-tighter">{h.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Devices */}
                <div className="card p-6 border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <PieChart size={14} className="text-[#f97316]" /> Produits les plus vendus
                    </h3>
                    <div className="space-y-3">
                        {(stats?.top_devices || []).map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-[#f97316]/30 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-[#f97316] font-black text-[10px] uppercase group-hover:bg-[#f97316] group-hover:text-white transition-colors">
                                        {d.brand.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[#0f172a] uppercase italic">{d.brand} {d.model}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Smartphone</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-[#ea580c] italic">{d.sales_count}</p>
                                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Unités</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>            {/* Customers & Brands */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Meilleurs Clients */}
                <div className="card p-6 border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} className="text-[#f97316]" /> Meilleurs Clients
                    </h3>
                    <div className="space-y-3">
                        {(stats?.top_customers || []).map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 group hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-[10px] uppercase group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[#0f172a] uppercase italic">{c.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.purchases_count} achats</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600 italic">{formatMoney(c.total_spent)} <span className="text-[8px] font-bold">MAD</span></p>
                                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Dépensé</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stock per Brand */}
                <div className="card p-6 border-slate-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Smartphone size={14} className="text-[#f97316]" /> Stock par Marque
                    </h3>
                    <div className="space-y-3">
                        {(stats?.stock_by_brand || []).map((b, i) => {
                            const maxBrandCount = Math.max(...(stats?.stock_by_brand.map(x => x.count) || [1]));
                            return (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-[#f97316] font-black text-[10px] uppercase">
                                            {b.brand.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-[#0f172a] uppercase italic">{b.brand}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-1 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-full"
                                                style={{ width: `${(b.count / (maxBrandCount || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-right w-12">
                                            <p className="text-xs font-black text-[#0f172a] italic">{b.count}</p>
                                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Units</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(stats?.stock_by_brand || []).length === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-6">Aucun appareil en stock.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
