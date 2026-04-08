// src/component/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Wallet, Loader2, WalletCards, Home, MapPin, UserPlus, Eye, EyeOff, Lock, Info, Clock, ShoppingBag, Paintbrush } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/utils';

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
  }[];
}

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
    };
  }, [apiStats, selectedTerrainId]);

  const displayClients = useMemo(() => {
    if (!apiStats?.recent_clients) return [];
    if (selectedTerrainId === null) return apiStats.recent_clients;
    return apiStats.recent_clients.filter(c => c.biens && c.biens.some((b: any) => b.terrain_id === selectedTerrainId));
  }, [apiStats, selectedTerrainId]);

  const displayPayments = useMemo(() => {
    if (!apiStats?.recent_payments) return [];
    if (selectedTerrainId === null) return apiStats.recent_payments;
    return apiStats.recent_payments.filter(p => p.client?.biens && p.client.biens.some((b: any) => b.terrain_id === selectedTerrainId));
  }, [apiStats, selectedTerrainId]);

  const displayPurchases = useMemo(() => {
    if (!apiStats?.recent_purchases) return [];
    // Purchases are global for now
    return apiStats.recent_purchases;
  }, [apiStats]);

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

  if (loading || !stats) {
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

      {/* ── 1.5. Scope Selector ── */}
      {apiStats?.terrains_stats && apiStats.terrains_stats.length > 0 && (
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="text-blue-500" size={20} />
            <label htmlFor="terrain-select" className="text-sm font-black text-slate-700 uppercase tracking-wider">Périmètre d'analyse :</label>
          </div>
          <select
            id="terrain-select"
            value={selectedTerrainId ?? ''}
            onChange={(e) => setSelectedTerrainId(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-50/50 outline-none w-full sm:w-auto min-w-[300px]"
          >
            <option value="">Global (Tous les projets)</option>
            {apiStats.terrains_stats.map((t) => (
              <option key={t.id} value={t.id}>{t.nom_terrain}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── 2. Résumé Financier Global ── */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <Wallet className="text-gray-400" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Vue d'ensemble Financière</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Row 1: CA, Encaissements, Reste */}
          <div className="bg-[#1a0f0a] p-8 rounded-[32px] shadow-xl shadow-slate-200 transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Chiffre d'Affaires</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ventes & Réservations</p>
              </div>
              <div className="p-3 bg-white/10 text-white rounded-2xl">
                <TrendingUp size={24} />
              </div>
            </div>
            {renderAmount(stats.chiffre_affaires, "text-4xl", "text-white")}
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Recouvré</p>
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

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Reste à Recouvrer</p>
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

      {/* ── 3. Détails & Commercial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Détail des charges */}
        <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50/50 border-b border-slate-100 p-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Répartition des Charges</h3>
            <p className="text-xs text-slate-500 font-medium">Analytique des dépenses par catégorie</p>
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
                { title: 'Ajouter Unité', desc: 'Appartement / Local', path: '/add-property', icon: Home, color: 'text-amber-600', bg: 'bg-amber-50/50' },
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
              <p className="text-lg font-black text-slate-800">{apiStats.terrains_stats?.length || 0}</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-center border border-slate-100 min-w-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase">Unités</p>
              <p className="text-lg font-black text-slate-800">{Object.values(stats.biens_status).reduce((a, b) => a + b, 0)}</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[24px] text-center">
              <p className="text-xs font-black text-emerald-800 uppercase mb-2">Libres</p>
              <p className="text-4xl font-black text-emerald-600">{stats.biens_status['Libre'] || 0}</p>
            </div>
            <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-[24px] text-center">
              <p className="text-xs font-black text-amber-800 uppercase mb-2">Réservés</p>
              <p className="text-4xl font-black text-amber-600">{stats.biens_status['Réservé'] || 0}</p>
            </div>
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] text-center">
              <p className="text-xs font-black text-slate-600 uppercase mb-2">Vendus</p>
              <p className="text-4xl font-black text-slate-800">{(stats.biens_status['Vendu'] || 0) + (stats.biens_status['Vendu Définitivement'] || 0)}</p>
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
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{c.cin}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-amber-600 uppercase tracking-tighter">
                      {c.biens?.[0]?.type_bien || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {c.biens?.[0]?.num_appartement ? `Unit. ${c.biens[0].num_appartement}` : 'Sans unité'}
                    </p>
                  </div>
                </div>
              </div>
            )) : <p className="text-center py-10 text-slate-400 text-xs italic font-medium">Aucune réservation récente</p>}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;