import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { ArrowRight, Plus, UserPlus, Wallet, UserRound, ChevronRight, AlertTriangle, CalendarClock, ListTodo } from 'lucide-react';
import { openQuickPayment } from './common/QuickPayment';
import MonthlyReportButton from './common/MonthlyReportButton';
import type { Task } from './common/TaskEditor';
import { apiFetch } from '../lib/api';
import { formatNumber, parseDate } from '../lib/utils';
import { useCountUp } from '../lib/useCountUp';
import { getAppSettings, useAppSettings } from '../lib/appSettings';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MonthPerf { month: string; label: string; income: number; expenses: number }
interface TerrainStat {
    id: number; nom_terrain?: string; nom_projet?: string;
    chiffre_affaires: number; encaissements: number; reste_a_recouvrer: number;
    biens_status?: Record<string, number>;
}
interface RecentClient { id: number; nom: string; prenom: string; created_at?: string }
interface RecentPayment {
    id: number; amount: number | string; payment_date?: string; created_at?: string; method?: string;
    client?: { nom?: string; prenom?: string };
}
interface HomeStats {
    chiffre_affaires: number; encaissements: number; reste_a_recouvrer: number;
    reservations: number; charges: number;
    biens_status?: Record<string, number>;
    monthly_perf?: MonthPerf[];
    terrains_stats?: TerrainStat[];
    recent_clients?: RecentClient[];
    recent_payments?: RecentPayment[];
}

// ── Chart colours (validated: colour-blind-safe pair, ≥3:1 contrast on white) ─
const C_INCOME = '#2a78d6';
const C_EXPENSE = '#eb6834';

// ── Helpers ───────────────────────────────────────────────────────────────────
const num = (v: unknown) => Number(v) || 0;
const compact = (v: number) => {
    const a = Math.abs(v);
    if (a >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
    if (a >= 1_000) return `${(v / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} k`;
    return String(v);
};
const pct = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
const greeting = () => (new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir');
// The owner, greeted on the home page
const ownerName = () => getAppSettings().preferences.owner_name || '';

/** Amount that counts up from 0 on first display. */
const CountUp = ({ value }: { value: number }) => {
    const v = useCountUp(value);
    return <>{formatNumber(Math.round(v))}</>;
};

const Skel = ({ className = '' }: { className?: string }) => (
    <div className={`rounded bg-slate-100 animate-pulse ${className}`} />
);

const Card = ({ title, action, children, className = '' }: {
    title: string; action?: ReactNode; children: ReactNode; className?: string;
}) => (
    <section className={`bg-white rounded-xl border border-slate-200 ${className}`}>
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {action}
        </header>
        {children}
    </section>
);

const LinkBtn = ({ to, children }: { to: string; children: ReactNode }) => {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate(to)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap">
            {children} <ArrowRight size={12} />
        </button>
    );
};

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-slate-900/10 text-xs">
            <p className="font-medium text-slate-900 mb-1 capitalize">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
                    {p.name}
                    <span className="ml-auto pl-4 font-medium text-slate-900 tabular-nums">{formatNumber(p.value)} DH</span>
                </p>
            ))}
        </div>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Home = () => {
    const navigate = useNavigate();
    useAppSettings(); // re-render when Paramètres change (owner name)
    const [chartView, setChartView] = useState<'chart' | 'table'>('chart');

    const { data: s, isLoading } = useQuery({
        queryKey: ['home-stats'],
        queryFn: () => apiFetch<HomeStats>('/stats'),
        staleTime: 60_000,
    });
    const { data: ech } = useQuery({
        queryKey: ['echeances', undefined],
        queryFn: () => apiFetch<{ summary: { overdue_count: number; overdue_amount: number; overdue_clients: number; upcoming_count: number; upcoming_amount: number } }>('/echeances'),
        staleTime: 60_000,
    });
    const late = ech?.summary;
    const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => apiFetch<Task[]>('/tasks?status=open'), staleTime: 30_000 });
    const todayISO = new Date().toLocaleDateString('en-CA');
    const tasksDue = tasks.filter(t => !t.done_at && t.due_date && t.due_date <= todayISO);
    const tasksLate = tasksDue.filter(t => t.due_date! < todayISO).length;

    const ca = num(s?.chiffre_affaires);
    const encaisse = num(s?.encaissements);
    const reste = num(s?.reste_a_recouvrer);
    const charges = num(s?.charges);
    const recouvrement = pct(encaisse, ca);
    const nbResa = num(s?.reservations);

    const monthly = s?.monthly_perf ?? [];
    const monthlyEmpty = monthly.every(m => !num(m.income) && !num(m.expenses));

    const stock = useMemo(() => {
        const st = s?.biens_status ?? {};
        const vendu = num(st.Vendu), reserve = num(st.Reserve), libre = num(st.Libre);
        return { vendu, reserve, libre, total: vendu + reserve + libre };
    }, [s?.biens_status]);

    const activity = useMemo(() => {
        const items: { key: string; date: Date; kind: 'payment' | 'client'; title: string; meta: string; amount?: number }[] = [];
        (s?.recent_payments ?? []).forEach(p => items.push({
            key: `p${p.id}`, kind: 'payment',
            date: parseDate(p.payment_date || p.created_at),
            title: `${p.client?.prenom ?? ''} ${p.client?.nom ?? ''}`.trim() || 'Paiement',
            meta: p.method ? `Paiement · ${p.method}` : 'Paiement reçu',
            amount: num(p.amount),
        }));
        (s?.recent_clients ?? []).forEach(c => items.push({
            key: `c${c.id}`, kind: 'client',
            date: parseDate(c.created_at),
            title: `${c.prenom} ${c.nom}`,
            meta: 'Nouveau client',
        }));
        return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
    }, [s?.recent_payments, s?.recent_clients]);

    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    const kpis: { label: string; value: number; hint: string; progress?: number; warn?: boolean }[] = [
        { label: "Chiffre d'affaires", value: ca, hint: `${nbResa} réservation${nbResa > 1 ? 's' : ''}` },
        { label: 'Encaissé', value: encaisse, progress: recouvrement, hint: `${recouvrement}% recouvré` },
        { label: 'Reste à recouvrer', value: reste, hint: 'Créances clients', warn: reste > 0 },
        { label: 'Dépenses totales', value: charges, hint: 'Charges, travaux, achats' },
    ];

    const stockRows = [
        { label: 'Vendus', v: stock.vendu, c: 'bg-slate-900' },
        { label: 'Réservés', v: stock.reserve, c: 'bg-slate-500' },
        { label: 'Disponibles', v: stock.libre, c: 'bg-slate-300' },
    ];

    return (
        <div className="space-y-5 pb-10">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
                <div>
                    <p className="text-sm text-slate-500 first-letter:uppercase">{today}</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                        {greeting()}{ownerName() ? `, ${ownerName()}` : ''}
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <MonthlyReportButton />
                    <button onClick={() => navigate('/add-terrain')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        <Plus size={15} /> Nouveau projet
                    </button>
                    <button onClick={() => openQuickPayment()} title="Raccourci : E" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        <Wallet size={15} /> Encaisser
                    </button>
                    <button onClick={() => navigate('/add-client')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
                        <UserPlus size={15} /> Nouveau client
                    </button>
                </div>
            </header>

            {/* ── Payment alerts ─────────────────────────────────────── */}
            {((late && (late.overdue_count > 0 || late.upcoming_count > 0)) || tasksDue.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {tasksDue.length > 0 && (
                        <button onClick={() => navigate('/taches')} className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-left ring-1 ring-inset transition-colors ${tasksLate ? 'bg-red-50 ring-red-600/15 hover:bg-red-100/70' : 'bg-white ring-slate-200 hover:bg-slate-50'}`}>
                            <ListTodo size={18} className={tasksLate ? 'text-red-600 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                            <span className="flex-1 min-w-0">
                                <span className={`block text-sm font-semibold ${tasksLate ? 'text-red-900' : 'text-slate-900'}`}>{tasksDue.length} tâche{tasksDue.length > 1 ? 's' : ''} pour aujourd'hui</span>
                                <span className={`block text-xs truncate ${tasksLate ? 'text-red-700' : 'text-slate-500'}`}>{tasksLate ? `dont ${tasksLate} en retard · ` : ''}{tasksDue[0]?.title}</span>
                            </span>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-700 transition-colors" />
                        </button>
                    )}
                    {late && late.overdue_count > 0 && (
                        <button onClick={() => navigate('/echeancier')} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 ring-1 ring-inset ring-red-600/15 text-left hover:bg-red-100/70 transition-colors">
                            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-semibold text-red-900">
                                    {late.overdue_clients} client{late.overdue_clients > 1 ? 's' : ''} en retard de paiement
                                </span>
                                <span className="block text-xs text-red-700">{late.overdue_count} échéance{late.overdue_count > 1 ? 's' : ''} · {formatNumber(late.overdue_amount)} DH à relancer</span>
                            </span>
                            <ArrowRight size={16} className="text-red-400 group-hover:text-red-700 transition-colors" />
                        </button>
                    )}
                    {late && late.upcoming_count > 0 && (
                        <button onClick={() => navigate('/echeancier')} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white ring-1 ring-inset ring-slate-200 text-left hover:bg-slate-50 transition-colors">
                            <CalendarClock size={18} className="text-slate-400 flex-shrink-0" />
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-semibold text-slate-900">{late.upcoming_count} échéance{late.upcoming_count > 1 ? 's' : ''} cette semaine</span>
                                <span className="block text-xs text-slate-500">{formatNumber(late.upcoming_amount)} DH attendus dans les 7 jours</span>
                            </span>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-700 transition-colors" />
                        </button>
                    )}
                </div>
            )}

            {/* ── KPI strip ──────────────────────────────────────────── */}
            <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4">
                {kpis.map((k, i) => (
                    <div
                        key={k.label}
                        className={`p-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-200' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
                    >
                        <p className="text-sm text-slate-500">{k.label}</p>
                        {isLoading ? <Skel className="mt-2 h-7 w-28" /> : (
                            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                                <CountUp value={k.value} /><span className="ml-1 text-sm font-medium text-slate-400">DH</span>
                            </p>
                        )}
                        {k.progress !== undefined ? (
                            <div className="mt-3 flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${k.progress}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{k.hint}</span>
                            </div>
                        ) : (
                            <p className={`mt-3 text-xs ${k.warn ? 'text-amber-700' : 'text-slate-500'}`}>{k.hint}</p>
                        )}
                    </div>
                ))}
            </section>

            {/* ── Chart + stock ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <Card
                    className="xl:col-span-2"
                    title="Encaissements et dépenses · 12 derniers mois"
                    action={
                        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                            {(['chart', 'table'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setChartView(v)}
                                    className={`px-2.5 py-1 rounded-md transition-colors ${chartView === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    {v === 'chart' ? 'Graphique' : 'Tableau'}
                                </button>
                            ))}
                        </div>
                    }
                >
                    <div className="px-5 pb-5">
                        <div className="flex items-center gap-4 text-xs text-slate-600 mb-3">
                            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_INCOME }} />Encaissements</span>
                            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_EXPENSE }} />Dépenses</span>
                        </div>
                        {isLoading ? <Skel className="h-60 w-full" /> : chartView === 'chart' ? (
                            <div className="relative h-60">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthly} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={compact} width={44} />
                                        <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="income" name="Encaissements" fill={C_INCOME} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
                                        <Bar dataKey="expenses" name="Dépenses" fill={C_EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                                {monthlyEmpty && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-sm text-slate-400 bg-white px-3 py-1 rounded-md">Aucun mouvement sur la période</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-60 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="text-xs text-slate-500 border-b border-slate-200">
                                            <th className="text-left font-medium py-2">Mois</th>
                                            <th className="text-right font-medium py-2">Encaissements</th>
                                            <th className="text-right font-medium py-2">Dépenses</th>
                                            <th className="text-right font-medium py-2">Solde</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 tabular-nums">
                                        {[...monthly].reverse().map(m => {
                                            const net = num(m.income) - num(m.expenses);
                                            return (
                                                <tr key={m.month}>
                                                    <td className="py-2 text-slate-700 capitalize">{m.label}</td>
                                                    <td className="py-2 text-right text-slate-900">{formatNumber(num(m.income))}</td>
                                                    <td className="py-2 text-right text-slate-900">{formatNumber(num(m.expenses))}</td>
                                                    <td className={`py-2 text-right font-medium ${net < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatNumber(net)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>

                <Card title="Stock de biens" action={<LinkBtn to="/properties">Voir les biens</LinkBtn>}>
                    <div className="px-5 pb-5">
                        {isLoading ? <Skel className="h-28 w-full" /> : (
                            <>
                                <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                                    {stock.total}<span className="ml-1.5 text-sm font-medium text-slate-400">unités</span>
                                </p>
                                {/* one hue, dark → light = vendu → disponible */}
                                <div className="mt-4 flex h-2 gap-0.5 rounded-full overflow-hidden bg-slate-100">
                                    {stock.total > 0 && stockRows.filter(x => x.v > 0).map(x => (
                                        <div key={x.label} className={x.c} style={{ width: `${(x.v / stock.total) * 100}%` }} />
                                    ))}
                                </div>
                                <ul className="mt-4 space-y-2.5 text-sm">
                                    {stockRows.map(r => (
                                        <li key={r.label} className="flex items-center gap-2.5">
                                            <span className={`w-2 h-2 rounded-sm ${r.c}`} />
                                            <span className="text-slate-600">{r.label}</span>
                                            <span className="ml-auto font-medium text-slate-900 tabular-nums">{r.v}</span>
                                            <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{pct(r.v, stock.total)}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Projects + activity ────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <Card className="xl:col-span-2" title="Projets" action={<LinkBtn to="/terrains">Tous les projets</LinkBtn>}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-y border-slate-200">
                                <tr className="text-xs text-slate-500">
                                    <th className="text-left font-medium px-5 py-2">Projet</th>
                                    <th className="text-right font-medium px-3 py-2">Biens</th>
                                    <th className="text-right font-medium px-3 py-2 whitespace-nowrap">Chiffre d'affaires</th>
                                    <th className="text-left font-medium px-3 py-2 w-[28%]">Recouvrement</th>
                                    <th className="text-right font-medium px-5 py-2">Reste</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 tabular-nums">
                                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-5 py-3"><Skel className="h-4 w-full" /></td></tr>
                                ))}
                                {!isLoading && (s?.terrains_stats?.length ?? 0) === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Aucun projet pour le moment</td></tr>
                                )}
                                {s?.terrains_stats?.slice(0, 6).map(t => {
                                    const biens = Object.values(t.biens_status ?? {}).reduce((a, b) => a + num(b), 0);
                                    const r = pct(num(t.encaissements), num(t.chiffre_affaires));
                                    return (
                                        <tr key={t.id} onClick={() => navigate('/terrains')} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                            <td className="px-5 py-3 font-medium text-slate-900 capitalize">{t.nom_projet || t.nom_terrain || `Projet #${t.id}`}</td>
                                            <td className="px-3 py-3 text-right text-slate-600">{biens}</td>
                                            <td className="px-3 py-3 text-right text-slate-900 whitespace-nowrap">{formatNumber(num(t.chiffre_affaires))}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${r}%` }} />
                                                    </div>
                                                    <span className="w-9 text-right text-xs text-slate-500">{r}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right text-slate-900 whitespace-nowrap">{formatNumber(num(t.reste_a_recouvrer))}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="Activité récente" action={<LinkBtn to="/transactions">Historique</LinkBtn>}>
                    <ul className="divide-y divide-slate-100 border-t border-slate-200">
                        {isLoading && Array.from({ length: 4 }).map((_, i) => (
                            <li key={i} className="px-5 py-3 flex items-center gap-3">
                                <Skel className="w-7 h-7 rounded-full" />
                                <div className="flex-1 space-y-1.5"><Skel className="h-3 w-1/2" /><Skel className="h-3 w-1/3" /></div>
                            </li>
                        ))}
                        {!isLoading && activity.length === 0 && (
                            <li className="px-5 py-10 text-center text-sm text-slate-400">Aucune activité récente</li>
                        )}
                        {activity.map(a => (
                            <li key={a.key}>
                                <button
                                    onClick={() => navigate(a.kind === 'payment' ? '/transactions' : '/clients')}
                                    className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors group last:rounded-b-xl"
                                >
                                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                                        {a.kind === 'payment' ? <Wallet size={14} /> : <UserRound size={14} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-slate-900 truncate capitalize">{a.title}</span>
                                        <span className="block text-xs text-slate-500 truncate">
                                            {a.meta} · {a.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </span>
                                    {a.amount !== undefined ? (
                                        <span className="text-sm font-medium text-slate-900 tabular-nums whitespace-nowrap">+{formatNumber(a.amount)}</span>
                                    ) : (
                                        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    );
};

export default Home;
