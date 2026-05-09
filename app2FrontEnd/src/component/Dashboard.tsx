import { useState, useEffect } from 'react';
import { Smartphone, TrendingUp, DollarSign, Users, ArrowUpRight, Cpu, Zap } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';

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
    { label: 'Stock Appareils', value: stats?.total_devices ?? 0, icon: Smartphone, color: 'bg-white border-[#f97316]/10', iconColor: 'text-[#f97316]' },
    { label: "Chiffre d'affaires", value: `${formatMoney(stats?.revenue ?? 0)} MAD`, icon: DollarSign, color: 'bg-white border-[#f97316]/10', iconColor: 'text-[#f97316]' },
    { label: 'Transactions', value: stats?.total_sales ?? 0, icon: TrendingUp, color: 'bg-white border-[#f97316]/10', iconColor: 'text-[#f97316]' },
    { label: 'Base Clients', value: stats?.total_customers ?? 0, icon: Users, color: 'bg-white border-[#f97316]/10', iconColor: 'text-[#f97316]' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Tableau de Bord</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">TechStock Control Center</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#fef2e0] text-[#ea580c] text-[9px] font-black uppercase tracking-widest border border-[#ea580c]/20 rounded">
          <Zap size={12} /> AI Live Analysis
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className={`stat-card ${loading ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">{s.label}</p>
                {loading
                  ? <div className="skeleton h-8 w-24 mt-2" />
                  : <p className="text-xl font-black text-[#0f172a] italic">{s.value}</p>
                }
              </div>
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
              <ArrowUpRight size={11} /> Real-time Update
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6 border-[#f97316]/5 shadow-sm">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-[#f97316]" /> Accès rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ajouter un appareil', to: '/devices/add', color: 'bg-[#fef2e0] border-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c]/10 shadow-sm' },
            { label: 'Nouvelle vente', to: '/sales/new', color: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 shadow-sm' },
            { label: 'Ajouter client', to: '/customers/add', color: 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100 shadow-sm' },
            { label: 'Voir rapports', to: '/reports', color: 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 shadow-sm' },
          ].map((a, i) => (
            <a key={i} href={`#${a.to}`} className={`border rounded-lg p-4 text-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${a.color}`}>
              {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* Stock Summary */}
      <div className="card p-6 border-[#f97316]/5 shadow-sm">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Smartphone size={14} className="text-[#f97316]" /> Répartition du stock
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Neuf', value: stats?.new_devices ?? 0, cls: 'badge-green' },
            { label: 'Occasion', value: stats?.used_devices ?? 0, cls: 'badge-yellow' },
            { label: 'Reconditionné', value: stats?.refurbished_devices ?? 0, cls: 'badge-blue' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xl font-black text-[#0f172a] italic">{loading ? '—' : s.value}</p>
              <span className={`badge ${s.cls} mt-2 text-[9px] uppercase italic font-black`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
