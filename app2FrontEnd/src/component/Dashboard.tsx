// src/component/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Users, Wallet, Loader2, WalletCards, Home, MapPin,
  UserPlus, Eye, EyeOff, Lock, ShoppingBag, Paintbrush,
  HelpCircle,
  ArrowUpRight, Percent, Activity, Briefcase, Zap, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, AreaChart, Area, RadialBarChart, RadialBar, Treemap,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/utils';
import MarkdownText from './common/MarkdownText';

interface Stats {
  investissement: number;
  encaissements: number;
  reservations: number;
  charges: number;
  cout_global: number;
  charges_details: {
    bureau: number;
    intervenants: number;
    contractors: number;
    achats: number;
    general_works: number;
  };
  biens_status: { [key: string]: number };
  biens_types: { [key: string]: number };
  chiffre_affaires: number;
  reste_a_recouvrer: number;
  benefice_estime: number;
  roi: number;
  margin_percentage: number;
  burn_rate: number;
  monthly_perf: {
    month: string;
    label: string;
    income: number;
    expenses: number;
  }[];
  recent_clients: any[];
  recent_payments: any[];
  recent_purchases: any[];
  terrains_stats?: {
    id: number;
    nom_terrain: string;
    investissement: number;
    encaissements: number;
    reservations: number;
    charges: number;
    charges_details: {
      bureau: number;
      intervenants: number;
      contractors: number;
      achats: number;
      general_works: number;
    };
    cout_global: number;
    biens_status: { [key: string]: number };
    biens_types: { [key: string]: number };
    chiffre_affaires: number;
    reste_a_recouvrer: number;
    benefice_estime: number;
    roi: number;
    margin_percentage: number;
  }[];
}


// Custom Tooltip Component (Premium, No Dependencies)
const TooltipInfo = ({ text, title }: { text: string; title?: string }) => (
  <div className="group relative inline-block ml-2 cursor-help z-50">
    <div className="p-1 rounded-full bg-slate-50 text-slate-400 hover:bg-amber-100 hover:text-amber-600 transition-all shadow-sm border border-slate-100">
      <HelpCircle size={14} />
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-64 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[999] animate-in fade-in zoom-in duration-200 border border-white/10 ring-1 ring-black/5">
      {title && <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1.5">{title}</p>}
      <p className="text-[11px] leading-relaxed font-medium text-slate-200">{text}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95" />
    </div>
  </div>
);

const Dashboard = () => {
  const [apiStats, setApiStats] = useState<Stats | null>(null);
  const [selectedTerrainId, setSelectedTerrainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Utilisateur');
  const [showStats, setShowStats] = useState(false);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!apiStats) return null;
    if (selectedTerrainId === null) return apiStats;

    const tStats = apiStats.terrains_stats?.find((t) => t.id === selectedTerrainId);
    if (!tStats) return apiStats;

    return {
      ...apiStats,
      investissement: tStats.investissement,
      encaissements: tStats.encaissements,
      reservations: tStats.reservations,
      charges: tStats.charges,
      charges_details: tStats.charges_details,
      cout_global: tStats.cout_global,
      biens_status: tStats.biens_status,
      biens_types: tStats.biens_types,
      chiffre_affaires: tStats.chiffre_affaires,
      reste_a_recouvrer: tStats.reste_a_recouvrer,
      benefice_estime: tStats.benefice_estime,
      roi: tStats.roi ?? 0,
      margin_percentage: tStats.margin_percentage ?? 0,
    };
  }, [apiStats, selectedTerrainId]);

  // Normalized stats for charts (Aggregates Soldé, Vendu, etc.)
  const normalizedStats = useMemo(() => {
    if (!stats) return null;
    const n = { ...stats };
    const bStatus = { Libre: 0, Réservé: 0, Vendu: 0 };

    Object.entries(stats.biens_status || {}).forEach(([k, v]) => {
      const key = k.toLowerCase();
      if (key.includes('libr')) bStatus.Libre += v;
      else if (key.includes('reserv') || key.includes('réserv')) bStatus.Réservé += v;
      else if (key.includes('vend') || key.includes('sold')) bStatus.Vendu += v;
      else bStatus[k as keyof typeof bStatus] = (bStatus[k as keyof typeof bStatus] || 0) + v;
    });

    n.biens_status = bStatus as any;
    return n;
  }, [stats]);

  const displayClients = useMemo(() => {
    if (!apiStats?.recent_clients) return [];
    if (selectedTerrainId === null) return apiStats?.recent_clients;
    return apiStats?.recent_clients.filter(c => c.biens && c.biens.some((b: any) => b.terrain_id === selectedTerrainId));
  }, [apiStats, selectedTerrainId]);

  const displayPayments = useMemo(() => {
    if (!apiStats?.recent_payments) return [];
    if (selectedTerrainId === null) return apiStats?.recent_payments;
    return apiStats?.recent_payments.filter(p => p.client?.biens && p.client.biens.some((b: any) => b.terrain_id === selectedTerrainId));
  }, [apiStats, selectedTerrainId]);


  const fetchData = async () => {
    try {
      const statsData = await apiFetch<Stats>('/stats');
      setApiStats(statsData);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement des statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserName(u.name || 'Utilisateur');
      } catch (e) { }
    }
    const savedVisibility = localStorage.getItem('dashboard_stats_visible');
    if (savedVisibility === 'true') {
      setShowStats(true);
    }
    fetchData();
  }, []);

  const toggleStats = () => {
    const newVal = !showStats;
    setShowStats(newVal);
    localStorage.setItem('dashboard_stats_visible', newVal.toString());
    if (newVal) {
      toast.success('Montants affichés', { icon: '👁️', duration: 1500 });
    } else {
      toast('Montants masqués', { icon: '🔒', duration: 1500 });
    }
  };

  if (loading || !stats || !normalizedStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-base font-black text-slate-500 uppercase tracking-widest">Initialisation...</p>
      </div>
    );
  }

  // Helper for masking financial data
  const renderAmount = (amount: number, sizeClass = "text-2xl", colorClass = "text-gray-900") => {
    if (!showStats) {
      return (
        <div className={`flex items-center gap-2 ${sizeClass} text-gray-300 font-bold`}>
          <Lock size={20} className="mb-1" />
          <span>••••••••</span>
        </div>
      );
    }
    return (
      <div className="flex items-baseline gap-1">
        <span className={`${sizeClass} font-bold ${colorClass}`}>
          {formatNumber(amount)}
        </span>
        <span className="text-sm font-medium text-gray-500">MAD</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">

      {/* ── 1. En-tête (Header) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 backdrop-blur-xl p-8 rounded-[32px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Bonjour, <span className="text-blue-600">{userName}</span>
          </h1>
          <p className="text-slate-500 font-medium text-base mt-2">
            Résumé détaillé de l'activité de <span className="text-slate-800 font-bold">Société les cinq elements</span>.
          </p>
        </div>

        <button
          onClick={toggleStats}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm focus:ring-4 focus:ring-blue-100 ${showStats
            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            : 'bg-slate-900 text-white hover:bg-black active:scale-[0.98]'
            }`}
        >
          {showStats ? (
            <><EyeOff size={18} /> Masquer</>
          ) : (
            <><Eye size={18} /> Afficher les montants</>
          )}
        </button>
      </div>

      {/* ── 1.2 Executive Highlights ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Percent size={18} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${stats.margin_percentage > 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {stats.margin_percentage > 20 ? 'Forte Marge' : 'Marge Stable'}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Profit sur Vente (%)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-800">{showStats ? `${stats.margin_percentage.toFixed(1)}%` : '•••%'}</p>
                <ArrowUpRight size={16} className="text-emerald-500 mb-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                <Zap size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Rentabilité</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rentabilité Projets</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-800">{showStats ? `${stats.roi.toFixed(1)}%` : '•••%'}</p>
                <Activity size={16} className="text-amber-500 mb-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] p-6 rounded-[28px] shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all group overflow-hidden relative text-white">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-white/10 text-white rounded-2xl">
                <Briefcase size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Trésorerie</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dépenses Moy. (Mensuel)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-white">{showStats ? `${formatNumber(Math.round(stats.burn_rate))} ` : '••••••'}</p>
                <span className="text-[10px] font-bold text-slate-400 uppercase">MAD</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-[28px] border transition-all group overflow-hidden relative ${stats.benefice_estime < 0 ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-2xl ${stats.benefice_estime < 0 ? 'bg-rose-200/50 text-rose-700' : 'bg-emerald-200/50 text-emerald-700'}`}>
                {stats.benefice_estime < 0 ? <AlertTriangle size={18} /> : <TrendingUp size={18} />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${stats.benefice_estime < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {stats.benefice_estime < 0 ? 'Perte Alerte' : 'Résultat Net'}
              </span>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stats.benefice_estime < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Profit Net Final (Total)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black">{showStats ? formatNumber(stats.benefice_estime) : '••••••'}</p>
                <span className="text-[10px] font-bold uppercase opacity-60">MAD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1.5. Scope Selector ── */}
      {
        stats.terrains_stats && stats.terrains_stats.length > 0 && (
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="text-blue-500" size={20} />
              <label htmlFor="terrain-select" className="text-sm font-black text-slate-700 uppercase tracking-wider">Filtrer par Projet :</label>
            </div>
            <select
              id="terrain-select"
              value={selectedTerrainId ?? ''}
              onChange={(e) => setSelectedTerrainId(e.target.value ? Number(e.target.value) : null)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-50/50 outline-none w-full sm:w-auto min-w-[300px]"
            >
              <option value="">Global (Tous les projets)</option>
              {stats.terrains_stats.map((t) => (
                <option key={t.id} value={t.id}>{t.nom_terrain}</option>
              ))}
            </select>
          </div>
        )
      }

      {/* ── 1.6. Smart Insights Pass ── */}
      <section className="bg-white/70 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
        <div className="p-4 bg-blue-600/10 text-blue-600 rounded-3xl">
          <Activity size={32} />
        </div>
        <div className="flex-grow">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Résumé en Direct</h4>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {stats.margin_percentage > 20 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <p className="text-sm font-bold text-slate-700">La profitabilité est excellente sur ce périmètre.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <p className="text-sm font-bold text-slate-700">Marge stable, mais optimisable sur les charges directes.</p>
              </div>
            )}

            {(stats.encaissements / (stats.chiffre_affaires || 1)) < 0.5 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <p className="text-sm font-bold text-slate-700">Recouvrement lent : priorisez les relances clients.</p>
              </div>
            )}

            {stats.burn_rate > (stats.encaissements / 12) && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <p className="text-sm font-bold text-slate-700">Les dépenses mensuelles sont supérieures à la moyenne des encaissements.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. Résumé Financier Global ── */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <Wallet className="text-gray-400" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Vue d'ensemble Financière</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Row 1: CA, Encaissements, Reste */}
          <div className="bg-[#1a0f0a] p-8 rounded-[32px] shadow-xl shadow-slate-200 transition-transform hover:scale-[1.02] duration-300 relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Chiffre d'Affaires</p>
                  <TooltipInfo
                    title="Chiffre d'Affaires (Objectif)"
                    text="Valeur totale cumulée de tous les biens sous contrat (Vendus + Réservés). C'est votre objectif de revenu brut."
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ventes & Réservations</p>
              </div>
              <div className="p-3 bg-white/10 text-white rounded-2xl">
                <TrendingUp size={24} />
              </div>
            </div>
            {renderAmount(stats.chiffre_affaires, "text-4xl", "text-white")}
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-transform hover:scale-[1.02] duration-300 relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Recouvré</p>
                  <TooltipInfo
                    title="Liquidités Encaissées"
                    text="Argent réel déjà déposé en banque. Ce montant provient des avances et des paiements de solde des clients."
                  />
                </div>
                <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Paiements Reçus</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Wallet size={24} />
              </div>
            </div>
            {renderAmount(stats.encaissements, "text-4xl", "text-slate-800")}

            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Taux de Recouvrement</span>
                <span className={`text-xs font-black ${showStats ? 'text-emerald-500' : 'text-slate-200'}`}>
                  {showStats && stats.chiffre_affaires > 0 ? `${((stats.encaissements / stats.chiffre_affaires) * 100).toFixed(1)}%` : '••%'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
                  style={{ width: `${showStats && stats.chiffre_affaires > 0 ? (stats.encaissements / stats.chiffre_affaires) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] transition-transform hover:scale-[1.02] duration-300 relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Reste à Recouvrer</p>
                  <TooltipInfo
                    title="Engagement Client Restant"
                    text="Différence entre le CA signé et l'argent déjà reçu. C'est ce que les clients doivent encore verser."
                  />
                </div>
                <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">Créances Clients</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Users size={24} />
              </div>
            </div>
            {renderAmount(stats.reste_a_recouvrer, "text-4xl", "text-slate-800")}
          </div>
        </div>
      </section>

      {/* ── 2. Analytics Visualizations ── */}
      <section className="grid grid-cols-1 xl:grid-cols-5 gap-8 mb-8 h-auto">
        {/* Graphique 1: Répartition des Dépenses (Treemap) */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-[450px] xl:col-span-2">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex justify-between items-center w-full">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Où va l'argent ?</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide italic">Répartition des dépenses par catégorie</p>
              </div>
              <TooltipInfo
                title="Décomposition des Charges"
                text="Visualisation proportionnelle de vos dépenses. Ce graphique vous aide à identifier les poches de dépenses les plus lourdes."
              />
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <ShoppingBag size={24} />
            </div>
          </div>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={[
                  { name: 'Matériaux', value: stats.charges_details.achats, fill: '#6366f1' },
                  { name: 'M.O Chantiers', value: stats.charges_details.contractors, fill: '#4f46e5' },
                  { name: 'Intervenants', value: stats.charges_details.intervenants, fill: '#4338ca' },
                  { name: 'Bureau', value: stats.charges_details.bureau, fill: '#3730a3' },
                  { name: 'Général', value: stats.charges_details.general_works, fill: '#312e81' },
                ]}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#4f46e5"
              >
                <RechartsTooltip
                  formatter={(value: any) => [`${formatNumber(value)} DH`, '']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2: Performance & Tendances */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-[450px] xl:col-span-3">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex justify-between items-center w-full">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Flux sur 12 Mois</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide italic">Evolution de l'argent reçu vs dépensé</p>
              </div>
              <TooltipInfo
                title="Performance Mensuelle"
                text="Suivi mensuel des revenus vs dépenses. L'écart entre les deux courbes représente votre profitabilité mensuelle réelle."
              />
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthly_perf} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${formatNumber(value)} DH`, '']}
                />
                <Area type="monotone" dataKey="income" name="Revenus" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 3: Analyse de Rentabilité */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-[450px] xl:col-span-12 mt-8">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex justify-between items-center w-full">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Indicateurs de Succès</h3>
                <p className="text-xs text-slate-400 font-medium">Capture des objectifs financiers</p>
              </div>
              <TooltipInfo
                title="Objectifs de Rentabilité"
                text="• Recouvrement : Progrès de l'encaissement vs CA total. • Marge : Pourcentage de profit final estimé. • ROI : Retour sur investissement global."
              />
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Zap size={24} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow items-center">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-3xl group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Argent Encaissé (%)</p>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ name: 'Progress', value: (stats.encaissements / (stats.chiffre_affaires || 1)) * 100, fill: '#10b981' }]}>
                    <RadialBar background dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-2xl font-black text-slate-800">{((stats.encaissements / (stats.chiffre_affaires || 1)) * 100).toFixed(0)}%</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Collecté</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-3xl group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rentabilité Réelle (%)</p>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ name: 'Margin', value: Math.max(0, stats.margin_percentage), fill: '#3b82f6' }]}>
                    <RadialBar background dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-2xl font-black text-slate-800">{stats.margin_percentage.toFixed(0)}%</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Objectif %</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-3xl group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Argent à Recevoir (MAD)</p>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Potentiel', value: stats.reste_a_recouvrer }]}>
                    <Bar dataKey="value" fill="#94a3b8" radius={[10, 10, 10, 10]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pt-8">
                  <p className="text-xs font-black text-slate-600 line-clamp-1">{formatNumber(stats.reste_a_recouvrer)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">A Venir</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Détails & Commercial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Détail des charges */}
        <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Répartition des Charges</h3>
              <p className="text-xs text-slate-500 font-medium">Analytique des dépenses par catégorie</p>
            </div>
            <TooltipInfo text="Détail des sorties d'argent par type : Gros oeuvre, matériaux (Achat), intervenants techniques, et frais de bureau." />
          </div>
          <div className="p-6 space-y-3 flex-grow">
            {[
              { label: 'Construction & Gros Œuvre', value: stats.charges_details.contractors, icon: Home, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Matériaux & Second Œuvre', value: stats.charges_details.achats, icon: ShoppingBag, color: 'text-slate-600', bg: 'bg-slate-50' },
              { label: 'Aménagements & Finitions', value: stats.charges_details.general_works, icon: Paintbrush, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Frais Techniques & Honoraires', value: stats.charges_details.intervenants, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Gestion & Administration', value: stats.charges_details.bureau, icon: Users, color: 'text-slate-400', bg: 'bg-slate-50' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon size={20} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </div>
                <div>
                  {renderAmount(item.value, "text-base", "text-slate-900")}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Commercial & Actions Rapides */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className="p-5 bg-amber-50 text-amber-600 rounded-[24px]">
              <Users size={32} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dossiers Clients</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-black text-slate-800">{stats.reservations}</p>
                <span className="text-xs text-slate-400 font-bold uppercase italic">Actifs</span>
              </div>
            </div>
          </div>

          <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex-grow">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Actions Rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Ajouter Unité', desc: 'Bloc / Local', path: '/add-property', icon: Home, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                { title: 'Nouveau Client', desc: 'Réservation directe', path: '/add-client', icon: UserPlus, color: 'text-slate-800', bg: 'bg-slate-50' },
                { title: 'Nouveau Projet', desc: 'Gestion foncière', path: '/add-terrain', icon: MapPin, color: 'text-slate-800', bg: 'bg-slate-50' },
                { title: 'Charges', desc: 'Saisie comptable', path: '/charges', icon: WalletCards, color: 'text-rose-600', bg: 'bg-rose-50/50' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 text-left hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
                >
                  <div className={`p-2.5 rounded-xl ${action.bg} ${action.color} shrink-0`}>
                    <action.icon size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 group-hover:text-amber-700 transition-colors uppercase tracking-tight">{action.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── 4. État du Parc ── */}
      <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">État du Parc Immobilier</h3>
            <p className="text-xs text-slate-400 font-medium">Disponibilité brute et typologie</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-center border border-slate-100 min-w-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase">Projets</p>
              <p className="text-lg font-black text-slate-800">{stats.terrains_stats?.length || 0}</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-center border border-slate-100 min-w-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase">Unités</p>
              <p className="text-lg font-black text-slate-800">{Object.values(stats.biens_status).reduce((a, b) => a + b, 0)}</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[24px] text-center relative group">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-xs font-black text-emerald-800 uppercase">Libres</p>
                <TooltipInfo text="Unités sans client associé et disponibles immédiatement à la vente." />
              </div>
              <p className="text-4xl font-black text-emerald-600">{normalizedStats.biens_status['Libre'] || 0}</p>
            </div>
            <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-[24px] text-center relative group">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-xs font-black text-amber-800 uppercase">Réservés</p>
                <TooltipInfo text="Unités avec un client attaché mais dont le dossier ou le paiement n'est pas encore finalisé." />
              </div>
              <p className="text-4xl font-black text-amber-600">{normalizedStats.biens_status['Réservé'] || 0}</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] text-center relative group">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-xs font-black text-slate-600 uppercase">Vendus</p>
                <TooltipInfo text="Dossiers bouclés et unités contractuellement cédées aux clients." />
              </div>
              <p className="text-4xl font-black text-slate-800">{normalizedStats.biens_status['Vendu'] || 0}</p>
            </div>
          </div>

          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Stock par Typologie</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.biens_types).map(([type, count]) => (
              <div key={type} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-100 flex gap-3">
                <span>{type}</span>
                <span className="text-amber-600">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Activités Récentes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Paiements */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30">
            <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-800">
              <TrendingUp size={18} className="text-emerald-500" /> Flux Entrants
            </h4>
          </div>
          <div className="p-6 space-y-3">
            {displayPayments.length > 0 ? displayPayments.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.client?.prenom} {p.client?.nom}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(p.payment_date).toLocaleDateString()}</p>
                  </div>
                </div>
                {renderAmount(p.amount, "text-base", "text-emerald-600")}
              </div>
            )) : <p className="text-center py-10 text-slate-400 text-xs italic font-medium">Aucun flux récent</p>}
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30">
            <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-800">
              <UserPlus size={18} className="text-amber-500" /> Réservations
            </h4>
          </div>
          <div className="p-6 space-y-3">
            {displayClients.length > 0 ? displayClients.map((c, idx) => (
              <div key={idx} className="flex flex-col p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{c.prenom} {c.nom}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase"><MarkdownText text={c.cin} /></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-amber-600 uppercase tracking-tighter">
                      {c.biens?.[0]?.type_bien || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {c.biens?.[0]?.num_appartement ? <>Bloc <MarkdownText text={c.biens[0].num_appartement} /></> : 'Sans unité'}
                    </p>
                  </div>
                </div>
              </div>
            )) : <p className="text-center py-10 text-slate-400 text-xs italic font-medium">Aucune réservation récente</p>}
          </div>
        </div>

      </div>

    </div >
  );
};

export default Dashboard;