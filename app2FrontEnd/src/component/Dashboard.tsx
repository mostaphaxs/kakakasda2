// src/component/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Loader2, WalletCards, Home, MapPin, UserPlus, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { formatNumber, parseDate } from '../lib/utils';

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

const Dashboard = () => {
  const [apiStats, setApiStats] = useState<Stats | null>(null);
  const [selectedTerrainId, setSelectedTerrainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <p className="text-base font-semibold text-slate-500">Initialisation...</p>
      </div>
    );
  }



  return (
    <div className="space-y-5 pb-10">

      {/* ── 1. Header: title, project scope, show/hide amounts ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <BarChart3 className="text-slate-400 flex-shrink-0" size={26} /> Tableau de bord
          </h1>
          <p className="text-slate-500 text-sm mt-1">Analyse financière détaillée de Société Les Cinq Éléments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.terrains_stats && stats.terrains_stats.length > 0 && (
            <select
              id="terrain-select"
              value={selectedTerrainId ?? ''}
              onChange={(e) => setSelectedTerrainId(e.target.value ? Number(e.target.value) : null)}
              className="min-w-[220px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Tous les projets</option>
              {stats.terrains_stats.map((t) => (
                <option key={t.id} value={t.id}>{t.nom_terrain}</option>
              ))}
            </select>
          )}
          <button
            onClick={toggleStats}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${showStats
              ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            {showStats ? <><EyeOff size={15} /> Masquer les montants</> : <><Eye size={15} /> Afficher les montants</>}
          </button>
        </div>
      </div>

      {/* ── 1.2 Key figures ── */}
      <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Marge sur ventes', value: showStats ? `${stats.margin_percentage.toFixed(1)} %` : '•••', hint: stats.margin_percentage > 20 ? 'Forte marge' : 'Marge à surveiller', tone: stats.margin_percentage > 20 ? 'text-emerald-700' : 'text-amber-700' },
          { label: 'Rentabilité des projets', value: showStats ? `${stats.roi.toFixed(1)} %` : '•••', hint: 'Bénéfice / coûts', tone: 'text-slate-500' },
          { label: 'Dépenses moyennes / mois', value: showStats ? `${formatNumber(Math.round(stats.burn_rate))} DH` : '••••••', hint: 'Moyenne des 3 derniers mois', tone: 'text-slate-500' },
          { label: 'Résultat net estimé', value: showStats ? `${formatNumber(stats.benefice_estime)} DH` : '••••••', hint: stats.benefice_estime < 0 ? 'Perte : à surveiller' : 'Bénéfice', tone: stats.benefice_estime < 0 ? 'text-red-700' : 'text-emerald-700', danger: stats.benefice_estime < 0 },
        ].map((k, i) => (
          <div key={k.label} className={`p-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-200' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${k.danger ? 'text-red-600' : 'text-slate-900'}`}>{k.value}</p>
            <p className={`mt-2 text-xs ${k.tone}`}>{k.hint}</p>
          </div>
        ))}
      </section>

      {/* ── 1.6 Live insights ── */}
      <section className="bg-white px-5 py-4 rounded-xl border border-slate-200">
        <h4 className="text-xs font-medium text-slate-500 mb-2">À retenir</h4>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2.5 text-sm text-slate-700">
            <span className={`w-1.5 h-1.5 rounded-full ${stats.margin_percentage > 20 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {stats.margin_percentage > 20 ? 'La profitabilité est excellente sur ce périmètre.' : 'Marge stable, mais optimisable sur les charges directes.'}
          </li>
          {(stats.encaissements / (stats.chiffre_affaires || 1)) < 0.5 && (
            <li className="flex items-center gap-2.5 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Recouvrement lent : priorisez les relances clients (voir l'Échéancier).
            </li>
          )}
          {stats.burn_rate > (stats.encaissements / 12) && (
            <li className="flex items-center gap-2.5 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Les dépenses mensuelles dépassent la moyenne des encaissements.
            </li>
          )}
        </ul>
      </section>

      {/* ── 2. Financial overview ── */}
      <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4">
        {(() => {
          const recouvrement = stats.chiffre_affaires > 0 ? Math.min(100, Math.round((stats.encaissements / stats.chiffre_affaires) * 100)) : 0;
          const items: { label: string; v: number; hint?: string; bar?: number; warn?: boolean }[] = [
            { label: "Chiffre d'affaires", v: stats.chiffre_affaires, hint: `${stats.reservations} réservation(s)` },
            { label: 'Encaissé', v: stats.encaissements, bar: recouvrement },
            { label: 'Reste à recouvrer', v: stats.reste_a_recouvrer, hint: 'Créances clients', warn: stats.reste_a_recouvrer > 0 },
            { label: 'Coût global', v: stats.cout_global, hint: 'Terrain + toutes les charges' },
          ];
          return items.map((k, i) => (
            <div key={k.label} className={`p-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-200' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
              <p className="text-sm text-slate-500">{k.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {showStats ? <>{formatNumber(k.v)}<span className="ml-1 text-sm font-medium text-slate-400">DH</span></> : <span className="text-slate-300">••••••</span>}
              </p>
              {k.bar !== undefined ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-slate-900" style={{ width: `${showStats ? k.bar : 0}%` }} /></div>
                  <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{showStats ? `${k.bar}% recouvré` : '••• recouvré'}</span>
                </div>
              ) : <p className={`mt-3 text-xs ${k.warn ? 'text-amber-700' : 'text-slate-500'}`}>{k.hint}</p>}
            </div>
          ));
        })()}
      </section>

      {/* ── 3. Where the money goes + cumulative cash ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <section className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          {(() => {
            const cats = [
              { label: 'Construction (BTP)', v: Number(stats.charges_details.contractors) || 0, color: '#eb6834' },
              { label: 'Achats matériaux', v: Number(stats.charges_details.achats) || 0, color: '#eda100' },
              { label: 'Travaux généraux', v: Number(stats.charges_details.general_works) || 0, color: '#e87ba4' },
              { label: 'Intervenants', v: Number(stats.charges_details.intervenants) || 0, color: '#1baf7a' },
              { label: 'Charges bureau', v: Number(stats.charges_details.bureau) || 0, color: '#6250d6' },
            ].sort((x, y) => y.v - x.v);
            const total = cats.reduce((acc, c) => acc + c.v, 0);
            return (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Où va l'argent ?</h3>
                  <span className="text-sm text-slate-500 tabular-nums">{showStats ? `${formatNumber(total)} DH` : '••••'}</span>
                </div>
                <p className="text-xs text-slate-500">Dépenses par catégorie (hors terrain)</p>
                {total === 0 ? (
                  <p className="mt-10 text-center text-sm text-slate-400">Aucune dépense enregistrée</p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {cats.map(c => {
                      const pct = total > 0 ? Math.round((c.v / total) * 100) : 0;
                      return (
                        <li key={c.label}>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                            <span className="text-slate-700">{c.label}</span>
                            <span className="ml-auto font-medium text-slate-900 tabular-nums">{showStats ? formatNumber(c.v) : '••••'}</span>
                            <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{pct}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            );
          })()}
        </section>

        <section className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          {(() => {
            let run = 0;
            const data = (stats.monthly_perf ?? []).map(m => {
              const net = (Number(m.income) || 0) - (Number(m.expenses) || 0);
              run += net;
              return { label: m.label, cumul: run, net };
            });
            const last = data[data.length - 1]?.cumul ?? 0;
            const negative = last < 0;
            const color = negative ? '#e11d48' : '#2a78d6';
            const compact = (v: number) => Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)} k` : String(v);
            return (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Trésorerie cumulée · 12 mois</h3>
                  <span className={`text-sm font-medium tabular-nums ${negative ? 'text-red-600' : 'text-slate-900'}`}>{showStats ? `${formatNumber(last)} DH` : '••••'}</span>
                </div>
                <p className="text-xs text-slate-500">Encaissements moins dépenses, cumulés mois après mois</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 6, right: 6, left: showStats ? -6 : -40, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cumulFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} tick={showStats ? { fontSize: 11, fill: '#94a3b8' } : false} tickFormatter={compact} width={50} />
                      {showStats && (
                        <RechartsTooltip
                          cursor={{ stroke: '#cbd5e1' }}
                          content={({ active, payload, label }: any) => active && payload?.length ? (
                            <div className="rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-slate-900/10 text-xs">
                              <p className="font-medium text-slate-900 capitalize mb-1">{label}</p>
                              <p className="text-slate-600">Solde du mois <span className="ml-3 font-medium text-slate-900 tabular-nums">{formatNumber(payload[0].payload.net)} DH</span></p>
                              <p className="text-slate-600">Cumul <span className="ml-3 font-medium text-slate-900 tabular-nums">{formatNumber(payload[0].payload.cumul)} DH</span></p>
                            </div>
                          ) : null}
                        />
                      )}
                      <Area type="monotone" dataKey="cumul" stroke={color} strokeWidth={2} fill="url(#cumulFill)" isAnimationActive={false} dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()}
        </section>
      </div>

      {/* ── 4. Indicators + stock ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Indicateurs clés</h3>
          {(() => {
            const units = Object.values(normalizedStats.biens_status).reduce((a, b) => a + (Number(b) || 0), 0);
            const sold = (normalizedStats.biens_status['Vendu'] || 0) + (normalizedStats.biens_status['Réservé'] || 0);
            const rows = [
              { label: 'Taux de recouvrement', v: stats.chiffre_affaires > 0 ? (stats.encaissements / stats.chiffre_affaires) * 100 : 0, hint: 'Encaissé / chiffre d’affaires', masked: !showStats },
              { label: 'Marge sur ventes', v: stats.margin_percentage, hint: 'Bénéfice / chiffre d’affaires', masked: !showStats },
              { label: 'Taux de commercialisation', v: units > 0 ? (sold / units) * 100 : 0, hint: `${sold} vendu(s) ou réservé(s) sur ${units}`, masked: false },
            ];
            return (
              <ul className="mt-4 space-y-5">
                {rows.map(r => {
                  const pct = Math.max(0, Math.min(100, r.v));
                  return (
                    <li key={r.label}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-slate-700">{r.label}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">{r.masked ? '•••' : `${Math.round(r.v)} %`}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-slate-900 transition-[width] duration-700" style={{ width: r.masked ? '0%' : `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{r.hint}</p>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          {(() => {
            const st = normalizedStats.biens_status as Record<string, number>;
            const rows = [
              { label: 'Vendus', v: st['Vendu'] || 0, c: 'bg-slate-900' },
              { label: 'Réservés', v: st['Réservé'] || 0, c: 'bg-slate-500' },
              { label: 'Libres', v: st['Libre'] || 0, c: 'bg-slate-300' },
            ];
            const total = rows.reduce((a, r) => a + r.v, 0);
            return (
              <>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">État du parc immobilier</h3>
                  <button onClick={() => navigate('/disponibilites')} className="text-xs font-medium text-slate-500 hover:text-slate-900">Voir la grille →</button>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{total}<span className="ml-1.5 text-sm font-medium text-slate-400">unités · {stats.terrains_stats?.length || 0} projet(s)</span></p>
                <div className="mt-4 flex h-2 gap-0.5 rounded-full overflow-hidden bg-slate-100">
                  {total > 0 && rows.filter(r => r.v > 0).map(r => <div key={r.label} className={r.c} style={{ width: `${(r.v / total) * 100}%` }} />)}
                </div>
                <ul className="mt-4 grid grid-cols-3 gap-3">
                  {rows.map(r => (
                    <li key={r.label}>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className={`w-2 h-2 rounded-sm ${r.c}`} />{r.label}</span>
                      <span className="block mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">{r.v}</span>
                    </li>
                  ))}
                </ul>
                {Object.keys(stats.biens_types || {}).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {Object.entries(stats.biens_types).map(([type, count]) => (
                      <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200">
                        {type} <span className="font-semibold text-slate-900">{count as number}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      </div>

      {/* ── 5. Recent activity + quick actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {[
          {
            title: 'Derniers encaissements', empty: 'Aucun encaissement récent', link: '/transactions',
            rows: displayPayments.slice(0, 5).map((p: any, i: number) => ({
              key: `p${i}`, title: `${p.client?.prenom ?? ''} ${p.client?.nom ?? ''}`, sub: `${p.method ?? 'Paiement'} · ${parseDate(p.payment_date).toLocaleDateString('fr-FR')}`,
              right: showStats ? `+${formatNumber(p.amount)}` : '••••',
            })),
          },
          {
            title: 'Dernières réservations', empty: 'Aucune réservation récente', link: '/clients',
            rows: displayClients.slice(0, 5).map((c: any, i: number) => ({
              key: `c${i}`, title: `${c.prenom} ${c.nom}`, sub: c.cin ? String(c.cin).toUpperCase() : '—',
              right: c.biens?.[0] ? `${c.biens[0].type_bien ?? ''} ${c.biens[0].num_appartement ?? ''}`.trim() : 'Sans bien',
            })),
          },
        ].map(block => (
          <section key={block.title} className="bg-white rounded-xl border border-slate-200">
            <header className="flex items-center justify-between px-5 pt-4 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">{block.title}</h3>
              <button onClick={() => navigate(block.link)} className="text-xs font-medium text-slate-500 hover:text-slate-900">Tout voir →</button>
            </header>
            <ul className="divide-y divide-slate-100 border-t border-slate-200">
              {block.rows.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">{block.empty}</li>}
              {block.rows.map(r => (
                <li key={r.key} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 truncate capitalize">{r.title}</span>
                    <span className="block text-xs text-slate-500 truncate">{r.sub}</span>
                  </span>
                  <span className="text-sm font-medium text-slate-900 tabular-nums whitespace-nowrap">{r.right}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="bg-white rounded-xl border border-slate-200">
          <header className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold text-slate-900">Actions rapides</h3></header>
          <ul className="divide-y divide-slate-100 border-t border-slate-200">
            {[
              { title: 'Nouveau client', desc: 'Réservation directe', path: '/add-client', icon: UserPlus },
              { title: 'Ajouter une unité', desc: 'Bloc, appartement, local', path: '/add-property', icon: Home },
              { title: 'Nouveau projet', desc: 'Acquisition foncière', path: '/add-terrain', icon: MapPin },
              { title: 'Saisir une charge', desc: 'Frais de fonctionnement', path: '/charges', icon: WalletCards },
              { title: 'Rentabilité par projet', desc: 'Coûts, marge, bénéfice', path: '/rentabilite', icon: TrendingUp },
            ].map(a => (
              <li key={a.path}>
                <button onClick={() => navigate(a.path)} className="group w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors">
                  <a.icon size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{a.title}</span>
                    <span className="block text-xs text-slate-500">{a.desc}</span>
                  </span>
                  <span className="text-slate-300 group-hover:text-slate-700 transition-colors">→</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;