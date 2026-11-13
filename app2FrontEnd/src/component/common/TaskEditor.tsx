// TaskEditor.tsx — create / edit a task from anywhere.
//   openTaskEditor()                      new task
//   openTaskEditor({ clientId: 12 })      new task about a client
//   openTaskEditor({ task })              edit
// <TaskEditorHost /> is mounted once in App.tsx.

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, Flag } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { localISODate } from '../../lib/utils';
import { useClientsLite } from './QuickPayment';

export interface Task {
    id: number; title: string; notes?: string | null; due_date?: string | null; due_time?: string | null;
    priority: 'normale' | 'haute'; client_id?: number | null; contact_name?: string | null; contact_phone?: string | null;
    done_at?: string | null; created_at?: string;
    client?: { id: number; nom: string; prenom: string; tel?: string | null; tel_2?: string | null; cin?: string } | null;
}
type Opts = { task?: Task; clientId?: number; title?: string };

let current: Opts | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const openTaskEditor = (o: Opts = {}) => { current = o; emit(); };
const close = () => { current = null; emit(); };

export function TaskEditorHost() {
    const o = useSyncExternalStore(subscribe, () => current);
    if (!o) return null;
    return <Editor key={o.task?.id ?? `new-${o.clientId ?? ''}`} opts={o} />;
}

const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localISODate(d); };
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return localISODate(d); };
const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';

function Editor({ opts }: { opts: Opts }) {
    const qc = useQueryClient();
    const t = opts.task;
    const { data: clients = [] } = useClientsLite();
    const [title, setTitle] = useState(t?.title ?? opts.title ?? '');
    const [dueDate, setDueDate] = useState(t?.due_date ?? (t ? '' : addDays(0)));
    const [dueTime, setDueTime] = useState(t?.due_time ?? '');
    const [priority, setPriority] = useState<'normale' | 'haute'>(t?.priority ?? 'normale');
    const [who, setWho] = useState<'client' | 'autre' | 'aucun'>(t ? (t.client_id ? 'client' : t.contact_name ? 'autre' : 'aucun') : opts.clientId ? 'client' : 'aucun');
    const [clientId, setClientId] = useState<number | ''>(t?.client_id ?? opts.clientId ?? '');
    const [clientQ, setClientQ] = useState('');
    const [contactName, setContactName] = useState(t?.contact_name ?? '');
    const [contactPhone, setContactPhone] = useState(t?.contact_phone ?? '');
    const [notes, setNotes] = useState(t?.notes ?? '');
    const [saving, setSaving] = useState(false);

    const client = clients.find(c => c.id === clientId);
    const results = useMemo(() => {
        const q = clientQ.trim().toLowerCase();
        return clients.filter(c => c.statut !== 'Annulé' && (!q || `${c.prenom} ${c.nom} ${c.cin} ${c.tel}`.toLowerCase().includes(q))).slice(0, 6);
    }, [clients, clientQ]);

    const chips = [
        { label: "Aujourd'hui", v: addDays(0) }, { label: 'Demain', v: addDays(1) },
        { label: 'Lundi prochain', v: nextMonday() }, { label: 'Dans 1 semaine', v: addDays(7) }, { label: 'Sans date', v: '' },
    ];

    const save = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!title.trim()) return toast.error('Écrivez la tâche');
        if (who === 'client' && !clientId) return toast.error('Choisissez le client');
        setSaving(true);
        const body = {
            title: title.trim(), notes: notes.trim() || null, due_date: dueDate || null, due_time: dueDate && dueTime ? dueTime : null, priority,
            client_id: who === 'client' ? clientId : null,
            contact_name: who === 'autre' ? contactName.trim() || null : null,
            contact_phone: who === 'autre' ? contactPhone.trim() || null : null,
        };
        try {
            await apiFetch(t ? `/tasks/${t.id}` : '/tasks', { method: t ? 'PUT' : 'POST', body: JSON.stringify(body) });
            toast.success(t ? 'Tâche modifiée' : 'Tâche ajoutée');
            qc.invalidateQueries({ queryKey: ['tasks'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
            close();
        } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[890] flex items-start justify-center p-4 pt-[8vh] bg-slate-950/50 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
            <div className="w-full max-w-lg max-h-[86vh] flex flex-col bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-dialog-in">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">{t ? 'Modifier la tâche' : 'Nouvelle tâche'}</h3>
                    <button onClick={close} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="Fermer"><X size={16} /></button>
                </div>
                <form onSubmit={save} className="p-5 space-y-4 overflow-y-auto">
                    <div>
                        <label className={labelCls}>Tâche</label>
                        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Rappeler pour la signature du compromis" className={`${inputCls} text-[15px]`} />
                    </div>

                    <div>
                        <label className={labelCls}>Quand</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {chips.map(c => (
                                <button type="button" key={c.label} onClick={() => setDueDate(c.v)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset transition-colors ${dueDate === c.v ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-[1fr_120px] gap-2">
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                            <input type="time" value={dueTime} disabled={!dueDate} onChange={e => setDueTime(e.target.value)} className={`${inputCls} disabled:bg-slate-50`} title="Heure (optionnelle)" />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Concerne</label>
                        <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100 text-sm font-medium">
                            {([['client', 'Un client'], ['autre', 'Autre personne'], ['aucun', 'Personne']] as const).map(([k, l]) => (
                                <button type="button" key={k} onClick={() => setWho(k)} className={`py-1.5 rounded-md transition-colors ${who === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{l}</button>
                            ))}
                        </div>
                        {who === 'client' && (
                            client ? (
                                <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                                    <span className="flex-1 min-w-0 text-sm"><span className="font-medium text-slate-900 capitalize">{client.prenom} {client.nom}</span><span className="text-slate-500"> · {client.tel || client.cin}</span></span>
                                    <button type="button" onClick={() => setClientId('')} className="text-xs font-medium text-slate-500 hover:text-slate-900">Changer</button>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <input value={clientQ} onChange={e => setClientQ(e.target.value)} placeholder="Rechercher un client…" className={inputCls} />
                                    <ul className="mt-1.5 max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Aucun client</li>}
                                        {results.map(c => (
                                            <li key={c.id}><button type="button" onClick={() => setClientId(c.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                                                <span className="font-medium text-slate-900 capitalize">{c.prenom} {c.nom}</span><span className="text-slate-500"> · {c.tel || c.cin}</span>
                                            </button></li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        )}
                        {who === 'autre' && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nom (notaire, fournisseur…)" className={inputCls} />
                                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Téléphone" className={inputCls} />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Détails, ce qu'il faut dire ou préparer…" className={`${inputCls} resize-none`} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <button type="button" onClick={() => setPriority(p => p === 'haute' ? 'normale' : 'haute')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium ring-1 ring-inset transition-colors ${priority === 'haute' ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'}`}>
                            <Flag size={13} /> {priority === 'haute' ? 'Priorité haute' : 'Priorité normale'}
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={close} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Annuler</button>
                            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50">
                                {saving && <Loader2 size={14} className="animate-spin" />} {t ? 'Enregistrer' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
