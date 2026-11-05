// Echeancier.tsx — payment schedules and late payments.
// Instalment status is computed server-side from real payments (oldest first),
// so recording a payment anywhere updates this page automatically.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, Plus, Search, X, MessageCircle, Wallet, FileDown, Trash2, Loader2, Eye, Paperclip, Receipt, FileSignature, ListTodo } from 'lucide-react';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { formatNumber, parseNumber, localISODate } from '../lib/utils';
import { downloadStatement, downloadReceipt } from '../lib/documents';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import { confirmDialog } from './common/ConfirmDialog';
import { openQuickPayment, useClientsLite } from './common/QuickPayment';
import { openWhatsAppReminder } from './common/WhatsAppReminder';
import { openClientDocuments } from './common/ClientDocuments';
import { openTaskEditor } from './common/TaskEditor';

type Status = 'en_retard' | 'a_venir' | 'partielle' | 'payee';
interface Allocation {
    payment_id: number; applied: number; payment_amount: number; payment_date: string;
    type?: string; method?: string; reference_no?: string | null; bank_name?: string | null; receipt_path?: string | null;
}
interface Row {
    id: number; client_id: number; bien_id?: number | null; due_date: string; amount: number; label?: string;
    paid: number; remaining: number; status: Status; days_late: number; allocations?: Allocation[];
    client?: { id: number; nom: string; prenom: string; tel?: string; tel_2?: string | null; cin?: string };
    bien?: { id: number; type_bien?: string; num_appartement?: string; nom?: string } | null;
}
interface Summary {
    overdue_count: number; overdue_amount: number; overdue_clients: number;
    upcoming_count: number; upcoming_amount: number; planned_total: number; remaining_total: number;
}

const STATUS: Record<Status, { label: string; cls: string }> = {
    en_retard: { label: 'En retard', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
    partielle: { label: 'Partielle', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    a_venir: { label: 'À venir', cls: 'bg-slate-50 text-slate-600 ring-slate-500/20' },
    payee: { label: 'Payée', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
};
const TABS: { key: 'all' | Status; label: string }[] = [
    { key: 'all', label: 'Toutes' }, { key: 'en_retard', label: 'En retard' },
    { key: 'a_venir', label: 'À venir' }, { key: 'payee', label: 'Payées' },
];

const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const ghost = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100';
const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';

const numDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR');

/** Pre-written reminder (FR + AR) for one instalment; opens the shared number → language → editor flow. */
function whatsappReminder(r: Row, all: Row[]) {
    const late = all.filter(x => x.client_id === r.client_id && x.status === 'en_retard');
    const lateTotal = late.reduce((a, x) => a + x.remaining, 0);
    const bienFr = r.bien ? ` pour votre bien *${[r.bien.type_bien, r.bien.num_appartement || r.bien.nom].filter(Boolean).join(' ')}*` : '';
    const bienAr = r.bien ? ` الخاص بعقاركم ${[r.bien.type_bien, r.bien.num_appartement || r.bien.nom].filter(Boolean).join(' ')}` : '';
    const name = `${r.client?.nom ?? ''} ${r.client?.prenom ?? ''}`.trim();
    const isLate = r.status === 'en_retard';

    const fr = [
        `Bonjour ${name},`,
        '',
        isLate
            ? `Sauf erreur de notre part, l'échéance ${r.label ? `(${r.label}) ` : ''}de *${formatNumber(r.remaining)} DH*${bienFr}, prévue le ${numDate(r.due_date)}, n'a pas encore été réglée (${r.days_late} jours de retard).`
            : `Nous vous rappelons que l'échéance ${r.label ? `(${r.label}) ` : ''}de *${formatNumber(r.remaining)} DH*${bienFr} est prévue le *${numDate(r.due_date)}*.`,
        ...(late.length > 1 ? ['', `Montant total en retard : *${formatNumber(lateTotal)} DH* (${late.length} échéances).`] : []),
        '',
        'Merci de nous contacter pour toute question.',
        'Société Les Cinq Éléments',
    ].join('\n');

    const ar = [
        `مرحباً ${name}،`,
        '',
        isLate
            ? `نذكركم بأن القسط${r.label ? ` (${r.label})` : ''} بمبلغ *${formatNumber(r.remaining)} درهم*${bienAr}، الذي كان مستحقاً بتاريخ ${numDate(r.due_date)}، لم يتم أداؤه بعد (تأخير ${r.days_late} يوم).`
            : `نذكركم بأن القسط${r.label ? ` (${r.label})` : ''} بمبلغ *${formatNumber(r.remaining)} درهم*${bienAr} مستحق بتاريخ *${numDate(r.due_date)}*.`,
        ...(late.length > 1 ? ['', `المبلغ الإجمالي المتأخر: *${formatNumber(lateTotal)} درهم* (${late.length} أقساط).`] : []),
        '',
        'يرجى الاتصال بنا لأي استفسار. شكراً.',
        'شركة الخمسة عناصر',
    ].join('\n');

    openWhatsAppReminder({ client: r.client ?? {}, messages: { fr, ar } });
}

export default function Echeancier() {
    const qc = useQueryClient();
    const [params, setParams] = useSearchParams();
    const clientFilter = params.get('client') ? Number(params.get('client')) : undefined;
    const [tab, setTab] = usePersistedState<'all' | Status>('Echeancier.tab', 'all');
    const [searchTerm, setSearchTerm] = usePersistedState('Echeancier.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [planOpen, setPlanOpen] = useState(false);
    const [detailId, setDetailId] = useState<number | null>(null);


    const { data, isLoading } = useQuery({
        queryKey: ['echeances', clientFilter],
        queryFn: () => apiFetch<{ data: Row[]; summary: Summary }>(`/echeances${clientFilter ? `?client_id=${clientFilter}` : ''}`),
    });
    const rows = data?.data ?? [];
    const detail = detailId ? rows.find(r => r.id === detailId) : undefined;
    const s = data?.summary;

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return rows
            .filter(r => tab === 'all' || (tab === 'a_venir' ? (r.status === 'a_venir' || r.status === 'partielle') : r.status === tab))
            .filter(r => !q || `${r.client?.prenom} ${r.client?.nom} ${r.client?.cin} ${r.client?.tel} ${r.label}`.toLowerCase().includes(q))
            .sort((a, b) => (a.status === 'en_retard' ? 0 : 1) - (b.status === 'en_retard' ? 0 : 1) || a.due_date.localeCompare(b.due_date));
    }, [rows, tab, searchTerm]);

    const filteredClientName = clientFilter ? rows.find(r => r.client_id === clientFilter)?.client : undefined;

    const remove = async (r: Row) => {
        if (!await confirmDialog(`Supprimer « ${r.label || 'cette échéance'} » de ${r.client?.prenom} ${r.client?.nom} ?`)) return;
        try {
            await apiFetch(`/echeances/${r.id}`, { method: 'DELETE' });
            toast.success('Échéance supprimée');
            qc.invalidateQueries({ queryKey: ['echeances'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
        } catch (e: any) { toast.error(e.message); }
    };

    const kpis = [
        { label: 'En retard', value: s?.overdue_amount ?? 0, hint: s ? `${s.overdue_count} échéance(s) · ${s.overdue_clients} client(s)` : '', danger: (s?.overdue_amount ?? 0) > 0 },
        { label: 'Dans les 7 jours', value: s?.upcoming_amount ?? 0, hint: s ? `${s.upcoming_count} échéance(s)` : '' },
        { label: 'Reste à encaisser', value: s?.remaining_total ?? 0, hint: 'Sur les plans en cours' },
        { label: 'Total planifié', value: s?.planned_total ?? 0, hint: 'Toutes échéances' },
    ];

    return (
        <div className="space-y-5 pb-10">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <CalendarClock className="text-slate-400" size={26} /> Échéancier
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Plans de paiement clients et retards. Les paiements enregistrés sont imputés automatiquement.</p>
                    </div>
                    <button onClick={() => setPlanOpen(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium text-sm bg-slate-900 hover:bg-slate-800 transition">
                        <Plus size={16} /> Nouveau plan
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-100">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher un client, CIN…" className={`${inputCls} pl-9`} />
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`px-3 py-1.5 rounded-md transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                                {t.label}
                                {t.key === 'en_retard' && (s?.overdue_count ?? 0) > 0 && <span className="ml-1.5 text-xs text-red-600 tabular-nums">{s?.overdue_count}</span>}
                            </button>
                        ))}
                    </div>
                    {clientFilter && (
                        <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md bg-slate-100 text-sm text-slate-700">
                            Client : <span className="font-medium capitalize">{filteredClientName ? `${filteredClientName.prenom} ${filteredClientName.nom}` : `#${clientFilter}`}</span>
                            <button onClick={() => { params.delete('client'); setParams(params); }} className="p-0.5 rounded hover:bg-slate-200" title="Retirer le filtre"><X size={13} /></button>
                        </span>
                    )}
                </div>
            </div>

            <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4">
                {kpis.map((k, i) => (
                    <div key={k.label} className={`p-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-200' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                        <p className="text-sm text-slate-500">{k.label}</p>
                        {isLoading ? <div className="mt-2 h-7 w-28 rounded bg-slate-100 animate-pulse" /> : (
                            <p className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${k.danger ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatNumber(k.value)}<span className="ml-1 text-sm font-medium text-slate-400">DH</span>
                            </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">{k.hint}</p>
                    </div>
                ))}
            </section>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-200">
                            <tr>
                                {['Client', 'Échéance', 'Date', 'Montant', 'Payé', 'Reste', 'Statut'].map((h, i) => (
                                    <th key={h} className={`px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap ${i >= 3 && i <= 5 ? 'text-right' : ''}`}>{h}</th>
                                ))}
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" /></td></tr>
                            ))}
                            {!isLoading && filtered.length === 0 && (
                                <tr><td colSpan={8} className="px-4 py-14 text-center">
                                    <p className="text-sm text-slate-500">{rows.length === 0 ? 'Aucun plan de paiement pour le moment.' : 'Aucune échéance pour ce filtre.'}</p>
                                    {rows.length === 0 && <button onClick={() => setPlanOpen(true)} className="mt-3 text-sm font-medium text-slate-900 underline underline-offset-2">Créer un premier plan</button>}
                                </td></tr>
                            )}
                            {filtered.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-900 capitalize">{r.client?.prenom} {r.client?.nom}</p>
                                        <p className="text-xs text-slate-500">{r.client?.tel || r.client?.cin?.toUpperCase()}</p>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <button onClick={() => setDetailId(r.id)} className="text-slate-700 hover:text-slate-900 hover:underline underline-offset-2">{r.label || '—'}</button>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={r.status === 'en_retard' ? 'text-red-600 font-medium' : 'text-slate-700'}>{fmtDate(r.due_date)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-900 tabular-nums whitespace-nowrap">{formatNumber(r.amount)}</td>
                                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{formatNumber(r.paid)}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">{formatNumber(r.remaining)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${STATUS[r.status].cls}`}>
                                            {STATUS[r.status].label}{r.status === 'en_retard' && ` · ${r.days_late} j`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <button onClick={() => setDetailId(r.id)} className={ghost} title="Détails"><Eye size={16} /></button>
                                            {r.status !== 'payee' && (
                                                <>
                                                    <button onClick={() => whatsappReminder(r, rows)} className={ghost} title="Envoyer un rappel WhatsApp"><MessageCircle size={16} /></button>
                                                    <button onClick={() => openQuickPayment({ clientId: r.client_id })} className={ghost} title="Encaisser"><Wallet size={16} /></button>
                                                </>
                                            )}
                                            <button onClick={() => toast.promise(downloadStatement(r.client_id), { loading: 'Génération du relevé…', success: 'Relevé téléchargé', error: (e: Error) => e.message })} className={ghost} title="Relevé de compte (PDF)"><FileDown size={16} /></button>
                                            <button onClick={() => remove(r)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {detail && <DetailModal row={detail} all={rows} onClose={() => setDetailId(null)} onSelect={setDetailId} />}
            {planOpen && <PlanModal defaultClientId={clientFilter} onClose={() => setPlanOpen(false)} />}
        </div>
    );
}

// ── Plan generator ────────────────────────────────────────────────────────────
function PlanModal({ defaultClientId, onClose }: { defaultClientId?: number; onClose: () => void }) {
    const qc = useQueryClient();
    const { data: clients = [] } = useClientsLite();
    const [clientId, setClientId] = useState<number | ''>(defaultClientId ?? '');
    const [total, setTotal] = useState('');
    const [count, setCount] = useState(12);
    const [interval, setIntervalMonths] = useState(1);
    const [start, setStart] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
        return localISODate(d);
    });
    const [saving, setSaving] = useState(false);

    const client = clients.find(c => c.id === clientId);
    const reste = useMemo(() => {
        if (!client) return 0;
        const prix = (client.biens ?? []).reduce((a, b) => a + (Number(client.avec_finition ? b.prix_global_finition : b.prix_global_non_finition) || 0), 0);
        const paid = (client.payments ?? []).filter(p => p.status !== 'Cancelled').reduce((a, p) => a + (Number(p.amount) || 0), 0);
        return Math.max(0, prix - paid);
    }, [client]);

    const totalNum = parseNumber(total) || reste;
    const preview = useMemo(() => {
        if (!totalNum || !count) return [];
        const base = Math.floor((totalNum / count) * 100) / 100;
        return Array.from({ length: count }, (_, i) => {
            const d = new Date(start + 'T00:00:00'); d.setMonth(d.getMonth() + i * interval);
            return { i: i + 1, date: d, amount: i === count - 1 ? Math.round((totalNum - base * (count - 1)) * 100) / 100 : base };
        });
    }, [totalNum, count, start, interval]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) return toast.error('Choisissez un client');
        if (!totalNum) return toast.error('Montant total invalide');
        if (!await confirmDialog({
            title: 'Créer le plan de paiement',
            message: `${count} échéances de ~${formatNumber(preview[0]?.amount ?? 0)} DH pour ${client.prenom} ${client.nom}. Un plan existant pour ce client sera remplacé.`,
            confirmLabel: 'Créer le plan', variant: 'default',
        })) return;
        setSaving(true);
        try {
            await apiFetch('/echeances/plan', {
                method: 'POST',
                body: JSON.stringify({ client_id: client.id, bien_id: client.biens?.[0]?.id ?? null, total: totalNum, count, start_date: start, interval_months: interval }),
            });
            toast.success(`${count} échéances créées`);
            qc.invalidateQueries({ queryKey: ['echeances'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
            onClose();
        } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden ring-1 ring-slate-900/5 animate-dialog-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">Nouveau plan de paiement</h3>
                    <button onClick={onClose} className={ghost} title="Fermer"><X size={16} /></button>
                </div>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className={labelCls}>Client</label>
                            <select value={clientId} onChange={e => { setClientId(Number(e.target.value)); setTotal(''); }} className={inputCls} required>
                                <option value="">— Choisir un client —</option>
                                {[...clients].filter(c => c.statut !== 'Annulé').sort((a, b) => `${a.nom}`.localeCompare(`${b.nom}`)).map(c => (
                                    <option key={c.id} value={c.id}>{c.nom?.toUpperCase()} {c.prenom} {c.cin ? `· ${c.cin.toUpperCase()}` : ''}</option>
                                ))}
                            </select>
                            {client && <p className="mt-1.5 text-xs text-slate-500">Reste à payer actuel : <span className="font-medium text-slate-700">{formatNumber(reste)} DH</span></p>}
                        </div>
                        <div>
                            <label className={labelCls}>Montant total à échelonner (DH)</label>
                            <input value={total} placeholder={reste ? formatNumber(reste) : '0'} inputMode="decimal"
                                onChange={e => setTotal(e.target.value.replace(/[^\d.,\s]/g, ''))}
                                onBlur={() => total && setTotal(formatNumber(parseNumber(total)))}
                                className={`${inputCls} tabular-nums`} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Nombre d’échéances</label>
                                <input type="number" min={1} max={120} value={count} onChange={e => setCount(Math.max(1, Math.min(120, Number(e.target.value) || 1)))} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Fréquence</label>
                                <select value={interval} onChange={e => setIntervalMonths(Number(e.target.value))} className={inputCls}>
                                    <option value={1}>Mensuelle</option>
                                    <option value={2}>Bimestrielle</option>
                                    <option value={3}>Trimestrielle</option>
                                    <option value={6}>Semestrielle</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Première échéance</label>
                            <input type="date" value={start} onChange={e => setStart(e.target.value)} className={inputCls} required />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col">
                        <p className="text-xs font-medium text-slate-500 mb-2">Aperçu</p>
                        <ul className="flex-1 max-h-72 overflow-y-auto divide-y divide-slate-200/70 text-sm">
                            {preview.length === 0 && <li className="py-6 text-center text-slate-400">Choisissez un client et un montant</li>}
                            {preview.map(p => (
                                <li key={p.i} className="flex items-center justify-between py-1.5 tabular-nums">
                                    <span className="text-slate-500">{p.i}. {p.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    <span className="font-medium text-slate-900">{formatNumber(p.amount)} DH</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Annuler</button>
                            <button type="submit" disabled={saving || !client} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50">
                                {saving && <Loader2 size={14} className="animate-spin" />} Créer le plan
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Instalment details: which payments covered it, proofs, client's full plan ─
function DetailModal({ row, all, onClose, onSelect }: { row: Row; all: Row[]; onClose: () => void; onSelect: (id: number) => void }) {
    const plan = all.filter(x => x.client_id === row.client_id).sort((a, b) => a.due_date.localeCompare(b.due_date));
    const pctPaid = row.amount > 0 ? Math.min(100, Math.round((row.paid / row.amount) * 100)) : 0;
    const allocs = row.allocations ?? [];
    const planPaid = plan.reduce((a, x) => a + x.paid, 0);
    const planTotal = plan.reduce((a, x) => a + x.amount, 0);

    const receipt = (paymentId: number) =>
        toast.promise(downloadReceipt(row.client_id, paymentId), { loading: 'Génération du reçu…', success: 'Reçu téléchargé', error: (e: Error) => e.message });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-dialog-in">
                {/* header */}
                <div className="flex items-start gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">{row.label || 'Échéance'}</h3>
                            <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${STATUS[row.status].cls}`}>
                                {STATUS[row.status].label}{row.status === 'en_retard' && ` · ${row.days_late} j`}
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 truncate">
                            <span className="capitalize">{row.client?.prenom} {row.client?.nom}</span>
                            {row.client?.tel && ` · ${row.client.tel}`}
                            {row.bien && ` · ${[row.bien.type_bien, row.bien.num_appartement || row.bien.nom].filter(Boolean).join(' ')}`}
                        </p>
                    </div>
                    <button onClick={onClose} className={ghost} title="Fermer"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* figures */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-100">
                        {[
                            { k: 'Date prévue', v: fmtDate(row.due_date), danger: row.status === 'en_retard' },
                            { k: 'Montant', v: `${formatNumber(row.amount)} DH` },
                            { k: 'Payé', v: `${formatNumber(row.paid)} DH` },
                            { k: 'Reste', v: `${formatNumber(row.remaining)} DH`, strong: true },
                        ].map((f, i) => (
                            <div key={f.k} className={`px-6 py-4 ${i > 0 ? 'sm:border-l border-slate-100' : ''} ${i % 2 === 1 ? 'border-l sm:border-l' : ''}`}>
                                <p className="text-xs text-slate-500">{f.k}</p>
                                <p className={`mt-1 text-base tabular-nums ${f.danger ? 'text-red-600 font-semibold' : f.strong ? 'text-slate-900 font-semibold' : 'text-slate-900'}`}>{f.v}</p>
                            </div>
                        ))}
                    </div>
                    <div className="px-6 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full ${row.status === 'payee' ? 'bg-emerald-600' : 'bg-slate-900'}`} style={{ width: `${pctPaid}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums">{pctPaid}% payé</span>
                        </div>
                    </div>

                    {/* payments applied */}
                    <section className="px-6 py-5">
                        <h4 className="text-sm font-semibold text-slate-900">Paiements imputés à cette échéance</h4>
                        {allocs.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">Aucun paiement imputé pour le moment.</p>
                        ) : (
                            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {allocs.map(a => (
                                    <li key={a.payment_id} className="flex items-center gap-3 px-4 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-slate-900">
                                                {fmtDate(a.payment_date)} · {a.method || '—'}{a.type ? ` · ${a.type}` : ''}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {[a.reference_no && `Réf. ${a.reference_no}`, a.bank_name].filter(Boolean).join(' · ') || `Paiement n° ${a.payment_id}`}
                                                {a.applied < a.payment_amount && ` · ${formatNumber(a.applied)} sur un paiement de ${formatNumber(a.payment_amount)} DH`}
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium text-slate-900 tabular-nums whitespace-nowrap">+{formatNumber(a.applied)} DH</span>
                                        <div className="flex items-center gap-0.5">
                                            {a.receipt_path ? (
                                                <button onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${a.receipt_path}`))} className={ghost} title="Voir la preuve de paiement">
                                                    <Paperclip size={16} />
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center justify-center w-8 h-8 text-slate-200" title="Pas de preuve jointe"><Paperclip size={16} /></span>
                                            )}
                                            <button onClick={() => receipt(a.payment_id)} className={ghost} title="Télécharger le reçu (PDF)"><Receipt size={16} /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* client's whole plan */}
                    <section className="px-6 pb-6">
                        <div className="flex items-baseline justify-between">
                            <h4 className="text-sm font-semibold text-slate-900">Plan complet du client</h4>
                            <span className="text-xs text-slate-500 tabular-nums">{formatNumber(planPaid)} / {formatNumber(planTotal)} DH payés</span>
                        </div>
                        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                            {plan.map(p => (
                                <li key={p.id}>
                                    <button onClick={() => onSelect(p.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${p.id === row.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.id === row.id ? 'bg-slate-900' : 'bg-transparent'}`} />
                                        <span className="w-28 text-slate-700">{p.label || '—'}</span>
                                        <span className={`flex-1 tabular-nums ${p.status === 'en_retard' ? 'text-red-600' : 'text-slate-500'}`}>{fmtDate(p.due_date)}</span>
                                        <span className="tabular-nums text-slate-900 whitespace-nowrap">{formatNumber(p.paid)} / {formatNumber(p.amount)}</span>
                                        <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                {/* actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                    <button onClick={() => openClientDocuments(row.client_id)} className="mr-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                        <FileSignature size={15} /> Documents
                    </button>
                    <button onClick={() => openTaskEditor({ clientId: row.client_id, title: `Relancer ${row.client?.prenom ?? ''} ${row.client?.nom ?? ''} – ${row.label ?? 'échéance'}`.replace(/\s+/g, ' ') })}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                        <ListTodo size={15} /> Rappel
                    </button>
                    <button onClick={() => toast.promise(downloadStatement(row.client_id), { loading: 'Génération du relevé…', success: 'Relevé téléchargé', error: (e: Error) => e.message })}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                        <FileDown size={15} /> Relevé PDF
                    </button>
                    {row.status !== 'payee' && (
                        <>
                            <button onClick={() => whatsappReminder(row, all)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                                <MessageCircle size={15} /> Rappel WhatsApp
                            </button>
                            <button onClick={() => { onClose(); openQuickPayment({ clientId: row.client_id }); }} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800">
                                <Wallet size={15} /> Encaisser
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
