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
        <p className="text-base font-medium text-gray-500">Chargement de votre tableau de bord...</p>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour, <span className="text-blue-600">{userName}</span>
          </h1>
          <p className="text-gray-600 text-base mt-2">
            Voici un résumé clair et détaillé de votre activité immobilière et financière.
          </p>
        </div>

        <button
          onClick={toggleStats}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 ${showStats
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {showStats ? (
            <><EyeOff size={20} /> Masquer les montants</>
          ) : (
            <><Eye size={20} /> Afficher les montants</>
          )}
        </button>
      </div>

      {/* ── 1.5. Scope Selector ── */}
      {apiStats?.terrains_stats && apiStats.terrains_stats.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="text-gray-400" size={24} />
            <label htmlFor="terrain-select" className="text-base font-bold text-gray-800">Périmètre des Statistiques :</label>
          </div>
          <select
            id="terrain-select"
            value={selectedTerrainId ?? ''}
            onChange={(e) => setSelectedTerrainId(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[250px]"
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
          <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Chiffre d'Affaires</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Ventes et réservations</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Wallet size={24} />
              </div>
            </div>
            {renderAmount(stats.chiffre_affaires, "text-4xl", "text-indigo-900")}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Total Recouvert</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Paiements reçus</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp size={24} />
              </div>
            </div>
            {renderAmount(stats.encaissements, "text-3xl", "text-emerald-700")}

            {/* Barre de progression simplifiée CA */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Sur le CA</span>
                <span className={`text-sm font-bold ${showStats ? 'text-emerald-600' : 'text-gray-300'}`}>
                  {showStats && stats.chiffre_affaires > 0 ? `${((stats.encaissements / stats.chiffre_affaires) * 100).toFixed(1)}%` : '••%'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-emerald-500 rounded-full transition-all duration-1000 ${!showStats ? 'opacity-20' : ''}`}
                  style={{ width: `${showStats && stats.chiffre_affaires > 0 ? (stats.encaissements / stats.chiffre_affaires) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Reste à Recouvrer</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Créances clients</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Users size={24} />
              </div>
            </div>
            {renderAmount(stats.reste_a_recouvrer, "text-3xl", "text-amber-700")}
          </div>

          {/* Row 2: Investissement, Charges, Bénéfice */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Investissement Fonciers</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Achat terrains & autorisations</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <MapPin size={24} />
              </div>
            </div>
            {renderAmount(stats.investissement, "text-3xl", "text-blue-700")}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Total des Charges</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Dépenses et travaux</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <WalletCards size={24} />
              </div>
            </div>
            {renderAmount(stats.charges, "text-3xl", "text-rose-700")}
          </div>

        </div>
      </section>

      {/* ── 3. Détails & Commercial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Détail des charges */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b border-gray-200 p-5">
            <h3 className="text-lg font-bold text-gray-800">Répartition des Charges</h3>
            <p className="text-sm text-gray-500">Où est dépensé l'argent exactement ?</p>
          </div>
          <div className="p-5 space-y-3 flex-grow">
            {[
              { label: 'Entreprises de construction (Travaux)', value: stats.charges_details.contractors, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Achats de Matériaux & Fournitures', value: stats.charges_details.achats, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Travaux Généraux & Entretien', value: stats.charges_details.general_works, icon: Paintbrush, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Intervenants Techniques (Notaires, Architectes...)', value: stats.charges_details.intervenants, icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Dépenses administratives & Bureau', value: stats.charges_details.bureau, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                    <item.icon size={20} />
                  </div>
                  <span className="text-base font-medium text-gray-700">{item.label}</span>
                </div>
                <div>
                  {renderAmount(item.value, "text-lg", "text-gray-800")}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50/50 p-4 border-t border-blue-100 flex items-start gap-3">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-800">Ces charges sont soustraites de vos encaissements pour calculer votre bénéfice réel.</p>
          </div>
        </section>

        {/* Commercial & Actions Rapides */}
        <div className="flex flex-col gap-6">
          {/* Réservations */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users size={32} />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-600">Clients & Réservations</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold text-indigo-900">{stats.reservations}</span>
                <span className="text-base text-gray-500 font-medium">dossiers actifs</span>
              </div>
            </div>
          </div>

          {/* Boutons d'actions */}
          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex-grow">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Actions Rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Ajouter un Bien', desc: 'Créer un nouvel appartement/lot', path: '/add-property', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
                { title: 'Nouveau Client', desc: 'Enregistrer une réservation', path: '/add-client', icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { title: 'Ajouter un Terrain', desc: 'Acquisition foncière', path: '/add-terrain', icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50' },
                { title: 'Saisir une Charge', desc: 'Dépenses administratives', path: '/charges', icon: WalletCards, color: 'text-rose-600', bg: 'bg-rose-50' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 text-left hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className={`p-2 rounded-lg ${action.bg} ${action.color} shrink-0`}>
                    <action.icon size={24} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-base font-bold text-gray-800 group-hover:text-blue-700">{action.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

      </div>

      {/* ── 4. Nouvelles Sections Détachées (Détails) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">

        {/* État du Parc Immobilier */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b border-gray-200 p-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">État du Parc Immobilier</h3>
            <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">Statuts</span>
          </div>
          <div className="p-5 flex-grow space-y-4">
            {stats.biens_status && Object.keys(stats.biens_status).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-emerald-700 mb-1">Disponibles</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.biens_status['Libre'] || 0}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-blue-700 mb-1">Réservés</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.biens_status['Réservé'] || 0}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-indigo-700 mb-1">Vendus</p>
                  <p className="text-3xl font-bold text-indigo-600">{(stats.biens_status['Vendu'] || 0) + (stats.biens_status['Vendu Définitivement'] || 0)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-4">Aucune donnée sur le statut des biens.</p>
            )}

            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-6 border-b border-gray-100 pb-2">Types de Biens (Actifs)</h4>
            {stats.biens_types && Object.keys(stats.biens_types).length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(stats.biens_types).map(([type, count]) => (
                  <div key={type} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium flex gap-2">
                    <span>{type}</span>
                    <span className="text-gray-500 bg-white px-1.5 rounded-md">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mt-3">Détails indisponibles.</p>
            )}
            <p className="text-sm text-gray-600 text-center mt-6 pt-4 border-t border-gray-100">
              Ce tableau vous montre quels biens sont encore disponibles à la vente et la répartition par type.
            </p>
          </div>
        </section>

      </div>

      {/* ── 5. Dernières Activités (Full Width) ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-8">
        <div className="bg-gray-50 border-b border-gray-200 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Dernières Activités</h3>
          <Clock className="text-gray-400" size={20} />
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonne 1: Paiements */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700 mb-4 border-b border-gray-100 pb-2">
              <TrendingUp size={18} /> Derniers Paiements Reçus
            </h4>
            <div className="space-y-3">
              {displayPayments.length > 0 ? (
                displayPayments.map((payment: any, idx: number) => {
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50/50 hover:bg-emerald-50/30 rounded-xl border border-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                          <Wallet size={16} />
                        </div>
                        <div>
                          {payment.client ? (
                            <p className="text-sm font-bold text-gray-900">{payment.client.prenom} {payment.client.nom}</p>
                          ) : (
                            <p className="text-sm font-bold text-gray-500 italic">Client inconnu</p>
                          )}
                        </div>
                      </div>
                      {renderAmount(payment.amount, "text-base sm:text-lg", "text-emerald-700")}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-500 italic">Aucun paiement récent pour cet espace.</p>
                </div>
              )}
            </div>
          </div>

          {/* Colonne 2: Clients */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-700 mb-4 border-b border-gray-100 pb-2">
              <UserPlus size={18} /> Dernières Réservations
            </h4>
            <div className="space-y-3">
              {displayClients.length > 0 ? (
                displayClients.map((client: any, idx: number) => {
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50/50 hover:bg-indigo-50/30 rounded-xl border border-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{client.prenom} {client.nom}</p>
                          {client.biens && client.biens.length > 0 && (
                            <p className="text-xs text-gray-600 font-medium">
                              {client.biens[0].type_bien}
                              {client.biens[0].immeuble ? ` - Imm. ${client.biens[0].immeuble}` : ''}
                              {client.biens[0].num_appartement ? ` - N° ${client.biens[0].num_appartement}` : ''}
                              {client.biens.length > 1 ? ` (+${client.biens.length - 1})` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-500 italic">Aucune réservation récente pour cet espace.</p>
                </div>
              )}
            </div>
          </div>

          {/* Colonne 3: Achats */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-700 mb-4 border-b border-gray-100 pb-2">
              <ShoppingBag size={18} /> Derniers Achats (Stock)
            </h4>
            <div className="space-y-3">
              {displayPurchases.length > 0 ? (
                displayPurchases.map((achat: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50/50 hover:bg-rose-50/30 rounded-xl border border-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{achat.supplier?.nom_societe || 'Fournisseur inconnu'}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{achat.invoice_no || 'SANS RÉF'}</p>
                      </div>
                    </div>
                    {renderAmount(achat.total_ttc, "text-base", "text-rose-700")}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-500 italic">Aucun achat récent.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Dashboard;