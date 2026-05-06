import { useState, useEffect } from 'react';
import { Smartphone, TrendingUp, DollarSign, Users, ArrowUpRight, Cpu, Zap } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Stats {
  total_devices: number;
  new_devices: number;
  used_devices: number;
  refurbished_devices: number;
  total_customers: number;
  total_sales: number;
  revenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/stats')
      .then(setStats)
      .catch(() => setStats({
        total_devices: 0, new_devices: 0, used_devices: 0,
        refurbished_devices: 0, total_customers: 0, total_sales: 0, revenue: 0,
      }))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Appareils', value: stats?.total_devices ?? 0, icon: Smartphone, color: 'from-indigo-500 to-violet-600', glow: 'shadow-indigo-500/20' },
    { label: "CA du mois", value: `${(stats?.revenue ?? 0).toLocaleString()} MAD`, icon: DollarSign, color: 'from-emerald-400 to-cyan-500', glow: 'shadow-emerald-500/20' },
    { label: 'Ventes', value: stats?.total_sales ?? 0, icon: TrendingUp, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/20' },
    { label: 'Clients', value: stats?.total_customers ?? 0, icon: Users, color: 'from-pink-400 to-rose-500', glow: 'shadow-pink-500/20' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Tableau de bord</h1>
          <p className="text-slate-500 text-sm mt-0.5">Bienvenue sur TechStock ERP</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Zap size={12} /> Gemini AI Actif
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className={`stat-card ${loading ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                {loading
                  ? <div className="skeleton h-8 w-24 mt-2" />
                  : <p className="text-2xl font-black text-white mt-1">{s.value}</p>
                }
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg ${s.glow} flex-shrink-0`}>
                <s.icon size={20} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-emerald-400 text-xs font-medium">
              <ArrowUpRight size={13} /> +0% ce mois
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-indigo-400" /> Accès rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ajouter un appareil', to: '/devices/add', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' },
            { label: 'Nouvelle vente', to: '/sales/new', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' },
            { label: 'Ajouter client', to: '/customers/add', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' },
            { label: 'Voir rapports', to: '/reports', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20' },
          ].map((a, i) => (
            <a key={i} href={`#${a.to}`} className={`border rounded-xl p-4 text-center text-xs font-semibold transition-all cursor-pointer ${a.color}`}>
              {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* Stock Summary */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Smartphone size={14} className="text-indigo-400" /> Répartition du stock
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Neuf', value: stats?.new_devices ?? 0, cls: 'badge-green' },
            { label: 'Occasion', value: stats?.used_devices ?? 0, cls: 'badge-yellow' },
            { label: 'Reconditionné', value: stats?.refurbished_devices ?? 0, cls: 'badge-blue' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-2xl font-black text-white">{loading ? '—' : s.value}</p>
              <span className={`badge ${s.cls} mt-2`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
