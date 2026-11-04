// QuickPayment.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Encaisser" from anywhere: pick a client, type the amount, done.
//
//   openQuickPayment();                 // from a button / shortcut / palette
//   openQuickPayment({ clientId: 12 }); // pre-selected client
//
// <QuickPaymentHost /> is mounted once in App.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Download, Loader2, Search, X, FileText, Upload } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatNumber, parseNumber, localISODate } from '../../lib/utils';
import { downloadReceipt, downloadStatement } from '../../lib/documents';

// ── tiny global store ─────────────────────────────────────────────────────────
type Opts = { clientId?: number };
let state: Opts | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export function openQuickPayment(opts: Opts = {}) { state = { ...opts }; emit(); }
function close() { state = null; emit(); }
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

// ── types ─────────────────────────────────────────────────────────────────────
interface Bien { id: number; type_bien?: string; num_appartement?: string; nom?: string; prix_global_finition?: number; prix_global_non_finition?: number }
interface ClientLite {
    id: number; nom: string; prenom: string; cin?: string; tel?: string; avec_finition?: number | boolean; statut?: string;
    biens?: Bien[]; payments?: { amount: number | string; status?: string }[];
}

const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const todayISO = () => localISODate();

export function useClientsLite(enabled = true) {
    return useQuery({
        queryKey: ['clients-lite'],
        queryFn: () => apiFetch<ClientLite[]>('/clients'),
        staleTime: 30_000,
        enabled,
    });
}

function balance(c?: ClientLite) {
    if (!c) return { prix: 0, paid: 0, reste: 0 };
    const prix = (c.biens ?? []).reduce((a, b) => a + (Number(c.avec_finition ? b.prix_global_finition : b.prix_global_non_finition) || 0), 0);
    const paid = (c.payments ?? []).filter(p => p.status !== 'Cancelled').reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return { prix, paid, reste: Math.max(0, prix - paid) };
}

export function QuickPaymentHost() {
    const opts = useSyncExternalStore(subscribe, () => state);
    if (!opts) return null;
    return <QuickPaymentModal key={opts.clientId ?? 'new'} initialClientId={opts.clientId} />;
}

function QuickPaymentModal({ initialClientId }: { initialClientId?: number }) {
    const qc = useQueryClient();
    const { data: clients = [], isLoading } = useClientsLite();
    const [clientId, setClientId] = useState<number | undefined>(initialClientId);
    const [query, setQuery] = useState('');
    const [bienId, setBienId] = useState<number | ''>('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayISO());
    const [type, setType] = useState('Tranche');
    const [method, setMethod] = useState('Espèces');
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState('');
    const [proof, setProof] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState<{ paymentId: number; clientId: number; amount: number } | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);

    const client = clients.find(c => c.id === clientId);
    const bal = balance(client);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = clients.filter(c => c.statut !== 'Annulé');
        if (!q) return list.slice(0, 6);
        return list.filter(c =>
            `${c.prenom} ${c.nom} ${c.nom} ${c.prenom} ${c.cin ?? ''} ${c.tel ?? ''}`.toLowerCase().includes(q)
        ).slice(0, 6);
    }, [clients, query]);

    // sensible defaults once a client is chosen
    useEffect(() => {
        if (!client) return;
        setBienId(client.biens?.[0]?.id ?? '');
        setType((client.payments ?? []).length === 0 ? 'Avance' : 'Tranche');
        setTimeout(() => amountRef.current?.focus(), 0);
    }, [client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!clientId) setTimeout(() => searchRef.current?.focus(), 0);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [clientId]);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const value = parseNumber(amount);
        if (!client) return toast.error('Choisissez un client');
        if (!value || value <= 0) return toast.error('Montant invalide');
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('client_id', String(client.id));
            if (bienId) fd.append('bien_id', String(bienId));
            fd.append('amount', String(value));
            fd.append('payment_date', date);
            fd.append('type', type);
            fd.append('method', method);
            if (reference) fd.append('reference_no', reference);
            if (bank) fd.append('bank_name', bank);
            if (proof) fd.append('receipt', proof);
            const res = await apiFetch<{ payment: { id: number } }>('/payments', { method: 'POST', body: fd });
            toast.success(`Paiement de ${formatNumber(value)} DH enregistré`);
            ['clients-lite', 'home-stats', 'notifications', 'echeances'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
            setDone({ paymentId: res.payment.id, clientId: client.id, amount: value });
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    const needsRef = method === 'Chèque' || method === 'Virement';

    return (
        <div className="fixed inset-0 z-[900] flex items-start justify-center p-4 pt-[10vh] bg-slate-950/50 animate-fade-in"
            onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
            <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-dialog-in">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">{done ? 'Paiement enregistré' : 'Encaisser un paiement'}</h3>
                    <button onClick={close} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Fermer (Échap)">
                        <X size={16} />
                    </button>
                </div>

                {done ? (
                    <div className="p-6 text-center">
                        <div className="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Check size={22} />
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                            {formatNumber(done.amount)} DH encaissés pour <span className="font-medium text-slate-900 capitalize">{client?.prenom} {client?.nom}</span>
                        </p>
                        <div className="mt-5 flex flex-col gap-2">
                            <button
                                onClick={() => downloadReceipt(done.clientId, done.paymentId).catch(e => toast.error(e.message))}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                autoFocus
                            >
                                <Download size={16} /> Télécharger le reçu
                            </button>
                            <button
                                onClick={() => downloadStatement(done.clientId).catch(e => toast.error(e.message))}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                <FileText size={16} /> Relevé de compte
                            </button>
                            <button onClick={() => { setDone(null); setAmount(''); setReference(''); setProof(null); setClientId(undefined); setQuery(''); }} className="mt-1 text-sm text-slate-500 hover:text-slate-900">
                                Encaisser un autre paiement
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto">
                        {/* Client picker */}
                        {client ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 capitalize truncate">{client.prenom} {client.nom}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {client.cin?.toUpperCase()} · Reste à payer <span className="font-medium text-slate-700">{formatNumber(bal.reste)} DH</span>
                                    </p>
                                </div>
                                <button type="button" onClick={() => { setClientId(undefined); setQuery(''); }} className="text-xs font-medium text-slate-500 hover:text-slate-900">Changer</button>
                            </div>
                        ) : (
                            <div>
                                <label className={labelCls}>Client</label>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (results[0]) setClientId(results[0].id); } }}
                                        placeholder="Nom, CIN ou téléphone…"
                                        className={`${inputCls} pl-9`}
                                    />
                                </div>
                                <ul className="mt-2 max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                                    {isLoading && <li className="p-3 text-sm text-slate-400"><Loader2 size={14} className="inline animate-spin mr-2" />Chargement…</li>}
                                    {!isLoading && results.length === 0 && <li className="p-3 text-sm text-slate-400">Aucun client trouvé</li>}
                                    {results.map(c => {
                                        const b = balance(c);
                                        return (
                                            <li key={c.id}>
                                                <button type="button" onClick={() => setClientId(c.id)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-medium text-slate-900 capitalize truncate">{c.prenom} {c.nom}</span>
                                                        <span className="block text-xs text-slate-500 truncate">{c.cin?.toUpperCase()} · {c.tel}</span>
                                                    </span>
                                                    <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">reste {formatNumber(b.reste)}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {client && (
                            <>
                                {(client.biens?.length ?? 0) > 1 && (
                                    <div>
                                        <label className={labelCls}>Bien</label>
                                        <select value={bienId} onChange={e => setBienId(Number(e.target.value))} className={inputCls}>
                                            {client.biens!.map(b => <option key={b.id} value={b.id}>{b.type_bien} {b.num_appartement || b.nom}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className={labelCls}>Montant (DH)</label>
                                        <input
                                            ref={amountRef}
                                            inputMode="decimal"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value.replace(/[^\d.,\s]/g, ''))}
                                            onBlur={() => amount && setAmount(formatNumber(parseNumber(amount)))}
                                            placeholder="0"
                                            className={`${inputCls} text-lg font-semibold tabular-nums`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Date</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Type</label>
                                        <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                                            {['Avance', 'Tranche', 'Reliquat', 'Caution'].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Mode de paiement</label>
                                        <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100">
                                            {['Espèces', 'Chèque', 'Virement'].map(m => (
                                                <button type="button" key={m} onClick={() => setMethod(m)}
                                                    className={`py-1.5 rounded-md text-sm font-medium transition-colors ${method === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Preuve de paiement (Image/PDF)</label>
                                        <input
                                            id="quickpay-proof"
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={e => {
                                                const f = e.target.files?.[0] ?? null;
                                                if (f && f.size > 5 * 1024 * 1024) { toast.error('Fichier trop lourd (max 5 Mo)'); e.target.value = ''; return; }
                                                setProof(f);
                                                e.target.value = '';
                                            }}
                                        />
                                        <label
                                            htmlFor="quickpay-proof"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors"
                                        >
                                            <Upload size={16} className="text-slate-400 flex-shrink-0" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium text-slate-700 truncate">{proof ? proof.name : 'Choisir un fichier'}</span>
                                                <span className="block text-xs text-slate-400">{proof ? `${Math.max(1, Math.round(proof.size / 1024))} Ko` : 'Photo du chèque, reçu de virement… · JPG, PNG, PDF · max 5 Mo'}</span>
                                            </span>
                                            {proof && (
                                                <button type="button" onClick={e => { e.preventDefault(); setProof(null); }}
                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-white" title="Retirer le fichier">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </label>
                                    </div>
                                    {needsRef && (
                                        <>
                                            <div>
                                                <label className={labelCls}>{method === 'Chèque' ? 'N° du chèque' : 'Référence'}</label>
                                                <input value={reference} onChange={e => setReference(e.target.value)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Banque</label>
                                                <input value={bank} onChange={e => setBank(e.target.value)} className={inputCls} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-slate-400"><kbd className="font-sans">Ctrl</kbd>+<kbd className="font-sans">Entrée</kbd> pour valider</span>
                            <div className="flex gap-2">
                                <button type="button" onClick={close} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Annuler</button>
                                <button type="submit" disabled={!client || saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {saving && <Loader2 size={14} className="animate-spin" />} Encaisser
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
