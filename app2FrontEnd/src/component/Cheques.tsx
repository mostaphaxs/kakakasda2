// Cheques.tsx — client cheques life cycle: reçu → déposé → encaissé / rejeté.
// Rejecting a cheque cancels its payment server-side, so the client's balance
// and échéancier go back to "unpaid" automatically.

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Banknote, Search, Landmark, CheckCircle2, XCircle, Undo2, Paperclip, Loader2, X } from 'lucide-react';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { formatNumber, localISODate } from '../lib/utils';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import { confirmDialog } from './common/ConfirmDialog';

type CStatus = 'recu' | 'depose' | 'encaisse' | 'rejete';
interface Cheque {
    id: number; client_id: number; amount: number; cheque_date: string; reference_no?: string | null; bank_name?: string | null;
    type?: string; receipt_path?: string | null; cheque_status: CStatus; deposited_at?: string | null; cashed_at?: string | null;
    rejected_at?: string | null; reject_reason?: string | null; due: boolean; stale: boolean;
    client?: { id: number; nom: string; prenom: string; tel?: string; cin?: string };
    bien?: { type_bien?: string; num_appartement?: string; nom?: string } | null;
}
interface Summary { recu: { count: number; amount: number }; depose: { count: number; amount: number }; encaisse: { count: number; amount: number }; rejete: { count: number; amount: number }; due: { count: number; amount: number } }

const STATUS: Record<CStatus, { label: string; cls: string }> = {
    recu: { label: 'À déposer', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    depose: { label: 'Déposé', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
    encaisse: { label: 'Encaissé', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    rejete: { label: 'Rejeté', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};
const TABS: { key: 'all' | CStatus; label: string }[] = [
    { key: 'recu', label: 'À déposer' }, { key: 'depose', label: 'Déposés' },
    { key: 'encaisse', label: 'Encaissés' }, { key: 'rejete', label: 'Rejetés' }, { key: 'all', label: 'Tous' },
];
const fmt = (iso?: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const ghost = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100';
const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export default function Cheques() {
    const qc = useQueryClient();
    const [tab, setTab] = usePersistedState<'all' | CStatus>('Cheques.tab', 'recu');
    const [searchTerm, setSearchTerm] = usePersistedState('Cheques.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [busy, setBusy] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<Cheque | null>(null);

    const { data, isLoading } = useQuery({ queryKey: ['cheques'], queryFn: () => apiFetch<{ data: Cheque[]; summary: Summary }>('/cheques') });
    const rows = data?.data ?? [];
    const s = data?.summary;

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return rows
            .filter(r => tab === 'all' || r.cheque_status === tab)
            .filter(r => !q || `${r.client?.prenom} ${r.client?.nom} ${r.client?.cin} ${r.reference_no} ${r.bank_name}`.toLowerCase().includes(q))
            .sort((a, b) => Number(b.due) - Number(a.due) || a.cheque_date.localeCompare(b.cheque_date));
    }, [rows, tab, searchTerm]);

    const setStatus = async (c: Cheque, status: CStatus, extra: { reason?: string; date?: string } = {}) => {
        setBusy(c.id);
        try {
            const res = await apiFetch<{ message: string }>(`/cheques/${c.id}/status`, { method: 'POST', body: JSON.stringify({ status, ...extra }) });
            toast.success(res.message);
            ['cheques', 'notifications', 'echeances', 'home-stats', 'clients-lite'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
        } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
    };

    const kpis = [
        { label: 'À déposer', v: s?.recu, hint: s?.due.count ? `${s.due.count} dont la date est arrivée` : 'Aucun en attente', warn: (s?.due.count ?? 0) > 0 },
        { label: 'Déposés (en attente)', v: s?.depose, hint: 'À confirmer par la banque' },
        { label: 'Encaissés', v: s?.encaisse, hint: 'Argent reçu sur le compte' },
        { label: 'Rejetés', v: s?.rejete, hint: 'Paiements annulés', danger: (s?.rejete.count ?? 0) > 0 },
    ];

    return (
        <div className="space-y-5 pb-10">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Banknote className="text-slate-400" size={26} /> Chèques clients
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Suivez chaque chèque du dépôt à l'encaissement. Un chèque rejeté annule son paiement et remet l'échéance en retard.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-100">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher client, n° chèque, banque…" className={`${inputCls} pl-9`} />
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`px-3 py-1.5 rounded-md transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                                {t.label}
                                {t.key !== 'all' && (s?.[t.key]?.count ?? 0) > 0 && <span className="ml-1.5 text-xs text-slate-400 tabular-nums">{s?.[t.key].count}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-4">
                {kpis.map((k, i) => (
                    <div key={k.label} className={`p-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-200' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                        <p className="text-sm text-slate-500">{k.label}</p>
                        {isLoading ? <div className="mt-2 h-7 w-24 rounded bg-slate-100 animate-pulse" /> : (
                            <p className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${k.danger ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatNumber(k.v?.amount ?? 0)}<span className="ml-1 text-sm font-medium text-slate-400">DH</span>
                            </p>
                        )}
                        <p className={`mt-2 text-xs ${k.warn ? 'text-amber-700' : 'text-slate-500'}`}>{k.v?.count ?? 0} chèque(s) · {k.hint}</p>
                    </div>
                ))}
            </section>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-200">
                            <tr>
                                {['Client', 'N° / Banque', 'Date du chèque', 'Montant', 'Statut', 'Suivi'].map((h, i) => (
                                    <th key={h} className={`px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                                ))}
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" /></td></tr>
                            ))}
                            {!isLoading && filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500">Aucun chèque {tab !== 'all' ? `« ${STATUS[tab].label.toLowerCase()} »` : ''}.</td></tr>
                            )}
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-900 capitalize">{c.client?.prenom} {c.client?.nom}</p>
                                        <p className="text-xs text-slate-500">{c.bien ? [c.bien.type_bien, c.bien.num_appartement || c.bien.nom].filter(Boolean).join(' ') : c.client?.tel}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-slate-900 tabular-nums">{c.reference_no || '—'}</p>
                                        <p className="text-xs text-slate-500">{c.bank_name || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={c.due ? 'text-amber-700 font-medium' : 'text-slate-700'}>{fmt(c.cheque_date)}</span>
                                        {c.due && <p className="text-xs text-amber-700">à déposer maintenant</p>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">{formatNumber(c.amount)} DH</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${STATUS[c.cheque_status].cls}`}>{STATUS[c.cheque_status].label}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                        {c.cheque_status === 'depose' && <>Déposé le {fmt(c.deposited_at)}{c.stale && <span className="block text-amber-700">plus de 7 jours sans encaissement</span>}</>}
                                        {c.cheque_status === 'encaisse' && <>Encaissé le {fmt(c.cashed_at)}</>}
                                        {c.cheque_status === 'rejete' && <span className="text-red-700">Rejeté le {fmt(c.rejected_at)}{c.reject_reason && <span className="block text-slate-500 max-w-[200px] truncate">{c.reject_reason}</span>}</span>}
                                        {c.cheque_status === 'recu' && '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {busy === c.id && <Loader2 size={15} className="animate-spin text-slate-400 mr-1" />}
                                            {c.receipt_path && (
                                                <button onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${c.receipt_path}`))} className={ghost} title="Voir la photo du chèque"><Paperclip size={16} /></button>
                                            )}
                                            {c.cheque_status === 'recu' && (
                                                <button disabled={busy === c.id} onClick={() => setStatus(c, 'depose')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                                                    <Landmark size={13} /> Déposé
                                                </button>
                                            )}
                                            {c.cheque_status === 'depose' && (
                                                <>
                                                    <button disabled={busy === c.id} onClick={() => setStatus(c, 'encaisse')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-white bg-slate-900 hover:bg-slate-800">
                                                        <CheckCircle2 size={13} /> Encaissé
                                                    </button>
                                                    <button disabled={busy === c.id} onClick={() => setRejecting(c)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50">
                                                        <XCircle size={13} /> Rejeté
                                                    </button>
                                                </>
                                            )}
                                            {c.cheque_status !== 'recu' && (
                                                <button disabled={busy === c.id}
                                                    onClick={async () => {
                                                        const back: CStatus = c.cheque_status === 'encaisse' || c.cheque_status === 'rejete' ? 'depose' : 'recu';
                                                        if (await confirmDialog({ title: 'Revenir en arrière', message: `Remettre ce chèque à l'étape « ${STATUS[back].label} » ?${c.cheque_status === 'rejete' ? ' Le paiement sera de nouveau compté.' : ''}`, confirmLabel: 'Confirmer', variant: 'default' })) setStatus(c, back);
                                                    }}
                                                    className={ghost} title="Revenir à l'étape précédente"><Undo2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {rejecting && <RejectModal cheque={rejecting} onClose={() => setRejecting(null)} onConfirm={(reason, date) => { setStatus(rejecting, 'rejete', { reason, date }); setRejecting(null); }} />}
        </div>
    );
}

function RejectModal({ cheque, onClose, onConfirm }: { cheque: Cheque; onClose: () => void; onConfirm: (reason: string, date: string) => void }) {
    const [reason, setReason] = useState('Provision insuffisante');
    const [date, setDate] = useState(localISODate());
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/5 animate-dialog-in">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">Chèque rejeté</h3>
                    <button onClick={onClose} className={ghost} title="Fermer"><X size={16} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onConfirm(reason, date); }} className="p-5 space-y-4">
                    <p className="text-sm text-slate-600">
                        Le paiement de <span className="font-medium text-slate-900">{formatNumber(cheque.amount)} DH</span> de <span className="capitalize font-medium text-slate-900">{cheque.client?.prenom} {cheque.client?.nom}</span> sera annulé et l'échéance correspondante repassera en retard.
                    </p>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Motif</label>
                        <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
                            {['Provision insuffisante', 'Signature non conforme', 'Chèque opposé', 'Compte clôturé', 'Erreur sur le chèque', 'Autre'].map(r => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Date du rejet</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Annuler</button>
                        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700">Marquer rejeté</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
