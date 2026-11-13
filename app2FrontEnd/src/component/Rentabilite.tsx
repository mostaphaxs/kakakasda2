// Rentabilite.tsx — profit per project: revenue minus every cost recorded for it.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Info } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { EXPENSE_LABELS } from '../lib/documents';
import MonthlyReportButton from './common/MonthlyReportButton';

type CostKey = 'terrain' | 'construction' | 'intervenants' | 'achats' | 'travaux' | 'ouvriers' | 'bureau';
interface Project {
    id: number; name: string; revenue: number; collected: number; remaining: number;
    costs: Record<CostKey, number>; total_cost: number; profit: number; margin: number | null; cash_result: number;
    units: { total: number; libre: number; reserve: number; vendu: number };
    progress: { gros_oeuvre: number; finition: number };
}
interface ProfitData {
    projects: Project[];
    unassigned: Partial<Record<CostKey, number>>;
    totals: { revenue: number; total_cost: number; profit: number; collected: number };
}

// Categorical palette, fixed order per cost category (validated reference palette, light mode)
const COST_ORDER: CostKey[] = ['terrain', 'construction', 'intervenants', 'achats', 'travaux', 'ouvriers', 'bureau'];
const COST_COLOR: Record<CostKey, string> = {
    terrain: '#2a78d6', construction: '#eb6834', intervenants: '#1baf7a', achats: '#eda100',
    travaux: '#e87ba4', ouvriers: '#008300', bureau: '#6250d6',
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function Rentabilite() {
    const { data, isLoading } = useQuery({ queryKey: ['reports-profit'], queryFn: () => apiFetch<ProfitData>('/reports/profit'), staleTime: 60_000 });
    const projects = useMemo(() => [...(data?.projects ?? [])].sort((a, b) => b.profit - a.profit), [data]);
    const [selected, setSelected] = useState<number | null>(null);
    const current = projects.find(p => p.id === selected) ?? projects[0];
    const t = data?.totals;
    const unassignedTotal = Object.values(data?.unassigned ?? {}).reduce((a, b) => a + (b || 0), 0);
    const maxAbsProfit = Math.max(1, ...projects.map(p => Math.abs(p.profit)));

    const kpis = [
        { label: "Chiffre d'affaires", v: t?.revenue ?? 0, hint: `${formatNumber(t?.collected ?? 0)} DH encaissés` },
        { label: 'Coûts totaux', v: t?.total_cost ?? 0, hint: unassignedTotal ? `dont ${formatNumber(unassignedTotal)} DH hors projet` : 'Tous projets confondus' },
        { label: 'Bénéfice estimé', v: t?.profit ?? 0, hint: 'Chiffre d’affaires − coûts', sign: true },
        { label: 'Marge globale', v: null as number | null, text: t && t.revenue > 0 ? `${Math.round((t.profit / t.revenue) * 100)} %` : '—', hint: 'Bénéfice / chiffre d’affaires' },
    ];

    return (
        <div className="space-y-5 pb-10">
            <div className="flex flex-wrap items-end justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <TrendingUp className="text-slate-400" size={26} /> Rentabilité par projet
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Chiffre d’affaires moins tous les coûts enregistrés : terrain, construction, intervenants, achats, travaux, ouvriers et charges.</p>
                </div>
                <MonthlyReportButton />
            </div>

            <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4">
                {kpis.map((k, i) => (
                    <div key={k.label} className={`p-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-200' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                        <p className="text-sm text-slate-500">{k.label}</p>
                        {isLoading ? <div className="mt-2 h-7 w-28 rounded bg-slate-100 animate-pulse" /> : (
                            <p className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${k.sign && (k.v ?? 0) < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {k.text ?? <>{formatNumber(k.v ?? 0)}<span className="ml-1 text-sm font-medium text-slate-400">DH</span></>}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">{k.hint}</p>
                    </div>
                ))}
            </section>

            {/* Ranking */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <header className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold text-slate-900">Classement des projets</h3></header>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-y border-slate-200">
                            <tr className="text-xs text-slate-500">
                                <th className="text-left font-medium px-5 py-2">Projet</th>
                                <th className="text-right font-medium px-3 py-2 whitespace-nowrap">Chiffre d'affaires</th>
                                <th className="text-right font-medium px-3 py-2">Coûts</th>
                                <th className="text-left font-medium px-3 py-2 w-[26%]">Bénéfice estimé</th>
                                <th className="text-right font-medium px-3 py-2">Marge</th>
                                <th className="text-right font-medium px-5 py-2 whitespace-nowrap" title="Encaissé − coûts déjà engagés">Trésorerie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                            {isLoading && <tr><td colSpan={6} className="px-5 py-3"><div className="h-4 rounded bg-slate-100 animate-pulse" /></td></tr>}
                            {!isLoading && projects.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Aucun projet</td></tr>}
                            {projects.map(p => (
                                <tr key={p.id} onClick={() => setSelected(p.id)} className={`cursor-pointer transition-colors ${current?.id === p.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-5 py-3 font-medium text-slate-900 capitalize">{p.name}</td>
                                    <td className="px-3 py-3 text-right text-slate-900">{formatNumber(p.revenue)}</td>
                                    <td className="px-3 py-3 text-right text-slate-600">{formatNumber(p.total_cost)}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full ${p.profit < 0 ? 'bg-red-500' : 'bg-slate-900'}`} style={{ width: `${(Math.abs(p.profit) / maxAbsProfit) * 100}%` }} />
                                            </div>
                                            <span className={`w-24 text-right font-medium ${p.profit < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatNumber(p.profit)}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-right text-slate-600">{p.margin === null ? '—' : `${p.margin} %`}</td>
                                    <td className={`px-5 py-3 text-right ${p.cash_result < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatNumber(p.cash_result)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Selected project detail */}
            {current && (
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-baseline justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-900">Répartition des coûts · <span className="capitalize">{current.name}</span></h3>
                            <span className="text-sm text-slate-500 tabular-nums">{formatNumber(current.total_cost)} DH</span>
                        </div>
                        {current.total_cost > 0 ? (
                            <>
                                <div className="mt-4 flex h-3 gap-0.5 rounded-full overflow-hidden bg-slate-100">
                                    {COST_ORDER.filter(k => current.costs[k] > 0).map(k => (
                                        <div key={k} title={`${EXPENSE_LABELS[k]} : ${formatNumber(current.costs[k])} DH`} style={{ width: `${(current.costs[k] / current.total_cost) * 100}%`, background: COST_COLOR[k] }} />
                                    ))}
                                </div>
                                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                                    {COST_ORDER.map(k => (
                                        <li key={k} className="flex items-center gap-2.5">
                                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COST_COLOR[k] }} />
                                            <span className="text-slate-600">{EXPENSE_LABELS[k]}</span>
                                            <span className="ml-auto font-medium text-slate-900 tabular-nums">{formatNumber(current.costs[k])}</span>
                                            <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{pct(current.costs[k], current.total_cost)}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : <p className="mt-4 text-sm text-slate-500">Aucun coût enregistré pour ce projet.</p>}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Ventes</h3>
                            <div className="mt-3 grid grid-cols-3 text-center">
                                {[['Vendus', current.units.vendu], ['Réservés', current.units.reserve], ['Libres', current.units.libre]].map(([l, v]) => (
                                    <div key={l as string}><p className="text-xl font-semibold text-slate-900 tabular-nums">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Recouvrement</h3>
                            <div className="mt-3 flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-slate-900" style={{ width: `${pct(current.collected, current.revenue)}%` }} /></div>
                                <span className="text-xs text-slate-500 tabular-nums">{pct(current.collected, current.revenue)}%</span>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">{formatNumber(current.collected)} DH encaissés · reste {formatNumber(current.remaining)} DH</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Avancement des travaux</h3>
                            {[['Gros œuvre', current.progress.gros_oeuvre], ['Finition', current.progress.finition]].map(([l, v]) => (
                                <div key={l as string} className="mt-3">
                                    <div className="flex justify-between text-xs text-slate-500"><span>{l}</span><span className="tabular-nums">{v}%</span></div>
                                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-slate-900" style={{ width: `${v}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {unassignedTotal > 0 && (
                <p className="flex items-start gap-2 text-xs text-slate-500">
                    <Info size={14} className="mt-0.5 flex-shrink-0" />
                    {formatNumber(unassignedTotal)} DH de dépenses ne sont rattachées à aucun projet ({Object.entries(data?.unassigned ?? {}).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `${EXPENSE_LABELS[k]} ${formatNumber(v ?? 0)}`).join(', ')}). Elles sont comptées dans les totaux, pas dans les projets. Les salaires saisis dans « Gestion Salariés » ne sont pas inclus (seules les charges « employés bureau » le sont).
                </p>
            )}
        </div>
    );
}
