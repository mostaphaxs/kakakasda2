// Taches.tsx — follow-ups / to-dos, grouped by due date.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ListTodo, Plus, Search, Check, Pencil, Trash2, Flag, Phone, MessageCircle, ChevronDown, StickyNote } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { localISODate } from '../lib/utils';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import { openExternal } from '../lib/tauri';
import { confirmDialog } from './common/ConfirmDialog';
import { openTaskEditor, type Task } from './common/TaskEditor';
import { toWhatsAppNumber } from './common/WhatsAppReminder';

const ghost = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100';
const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localISODate(d); };
type GroupKey = 'retard' | 'today' | 'tomorrow' | 'week' | 'later' | 'nodate';
const GROUPS: { key: GroupKey; label: string; tone?: string }[] = [
    { key: 'retard', label: 'En retard', tone: 'text-red-600' },
    { key: 'today', label: "Aujourd'hui", tone: 'text-slate-900' },
    { key: 'tomorrow', label: 'Demain' },
    { key: 'week', label: 'Cette semaine' },
    { key: 'later', label: 'Plus tard' },
    { key: 'nodate', label: 'Sans date' },
];
function groupOf(t: Task): GroupKey {
    if (!t.due_date) return 'nodate';
    const today = day(0);
    if (t.due_date < today) return 'retard';
    if (t.due_date === today) return 'today';
    if (t.due_date === day(1)) return 'tomorrow';
    if (t.due_date <= day(7)) return 'week';
    return 'later';
}
const fmtDue = (t: Task) => {
    if (!t.due_date) return '';
    const d = new Date(t.due_date + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + (t.due_time ? ` · ${t.due_time}` : '');
};

export default function Taches() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [view, setView] = usePersistedState<'open' | 'done'>('Taches.view', 'open');
    const [searchTerm, setSearchTerm] = usePersistedState('Taches.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [quick, setQuick] = useState('');
    const [quickDay, setQuickDay] = useState(0);

    const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => apiFetch<Task[]>('/tasks') });
    const refresh = () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); };

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return tasks
            .filter(t => (view === 'open' ? !t.done_at : !!t.done_at))
            .filter(t => !q || `${t.title} ${t.notes ?? ''} ${t.client?.prenom ?? ''} ${t.client?.nom ?? ''} ${t.contact_name ?? ''}`.toLowerCase().includes(q));
    }, [tasks, view, searchTerm]);
    const grouped = useMemo(() => {
        const m = new Map<GroupKey, Task[]>();
        filtered.forEach(t => { const g = groupOf(t); m.set(g, [...(m.get(g) ?? []), t]); });
        return m;
    }, [filtered]);
    const openCount = tasks.filter(t => !t.done_at).length;
    const lateCount = tasks.filter(t => !t.done_at && groupOf(t) === 'retard').length;
    const todayCount = tasks.filter(t => !t.done_at && groupOf(t) === 'today').length;

    const addQuick = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quick.trim()) return;
        try {
            await apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ title: quick.trim(), due_date: quickDay < 0 ? null : day(quickDay) }) });
            setQuick(''); refresh(); toast.success('Tâche ajoutée');
        } catch (err: any) { toast.error(err.message); }
    };

    const toggle = async (t: Task) => {
        // optimistic: tick immediately
        qc.setQueryData<Task[]>(['tasks'], old => old?.map(x => x.id === t.id ? { ...x, done_at: t.done_at ? null : new Date().toISOString() } : x));
        try { await apiFetch(`/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ done: !t.done_at }) }); if (!t.done_at) toast.success('Tâche terminée'); }
        catch (err: any) { toast.error(err.message); }
        finally { refresh(); }
    };

    const remove = async (t: Task) => {
        if (!await confirmDialog(`Supprimer la tâche « ${t.title} » ?`)) return;
        try { await apiFetch(`/tasks/${t.id}`, { method: 'DELETE' }); refresh(); toast.success('Tâche supprimée'); } catch (err: any) { toast.error(err.message); }
    };

    const phoneOf = (t: Task) => t.client?.tel || t.client?.tel_2 || t.contact_phone || '';

    return (
        <div className="space-y-5 pb-10 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <ListTodo className="text-slate-400" size={26} /> Tâches
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {openCount} à faire{todayCount > 0 && ` · ${todayCount} aujourd'hui`}{lateCount > 0 && <span className="text-red-600"> · {lateCount} en retard</span>}
                        </p>
                    </div>
                    <button onClick={() => openTaskEditor()} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium text-sm bg-slate-900 hover:bg-slate-800 transition" title="Raccourci : T">
                        <Plus size={16} /> Nouvelle tâche
                    </button>
                </div>

                {/* quick add */}
                <form onSubmit={addQuick} className="flex flex-wrap gap-2">
                    <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Ajouter rapidement une tâche… (Entrée)" className={`${inputCls} flex-1 min-w-[220px]`} />
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
                        {[[0, "Aujourd'hui"], [1, 'Demain'], [-1, 'Sans date']].map(([v, l]) => (
                            <button type="button" key={v} onClick={() => setQuickDay(v as number)} className={`px-2.5 py-1.5 rounded-md transition-colors ${quickDay === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{l}</button>
                        ))}
                    </div>
                </form>

                <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-100">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher une tâche, un client…" className={`${inputCls} pl-9`} />
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
                        {([['open', 'À faire'], ['done', 'Terminées']] as const).map(([k, l]) => (
                            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 rounded-md transition-colors ${view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{l}</button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading && <div className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse" />}
            {!isLoading && filtered.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
                    <ListTodo size={22} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">{view === 'open' ? 'Rien à faire. Bravo !' : 'Aucune tâche terminée.'}</p>
                </div>
            )}

            {(view === 'done' ? [{ key: 'done' as const, label: 'Terminées' }] : GROUPS).map(g => {
                const list = view === 'done' ? filtered : grouped.get(g.key as GroupKey) ?? [];
                if (!list.length) return null;
                return (
                    <section key={g.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <header className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
                            <ChevronDown size={14} className="text-slate-300" />
                            <h3 className={`text-sm font-semibold ${'tone' in g && g.tone ? g.tone : 'text-slate-700'}`}>{g.label}</h3>
                            <span className="text-xs text-slate-400 tabular-nums">{list.length}</span>
                        </header>
                        <ul className="divide-y divide-slate-100">
                            {list.map(t => {
                                const late = !t.done_at && groupOf(t) === 'retard';
                                const phone = phoneOf(t);
                                const person = t.client ? `${t.client.prenom} ${t.client.nom}` : t.contact_name;
                                return (
                                    <li key={t.id} className="group flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                        <button onClick={() => toggle(t)} title={t.done_at ? 'Marquer à faire' : 'Marquer terminée'}
                                            className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full ring-1 ring-inset flex items-center justify-center transition-colors ${t.done_at ? 'bg-emerald-600 ring-emerald-600 text-white' : t.priority === 'haute' ? 'ring-red-400 hover:bg-red-50' : 'ring-slate-300 hover:bg-slate-100'}`}>
                                            {t.done_at && <Check size={12} strokeWidth={3} />}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm ${t.done_at ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                {t.priority === 'haute' && !t.done_at && <Flag size={12} className="inline -mt-0.5 mr-1 text-red-500" />}
                                                {t.title}
                                            </p>
                                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                                {t.due_date && <span className={late ? 'text-red-600 font-medium' : ''}>{fmtDue(t)}</span>}
                                                {person && (
                                                    t.client
                                                        ? <button onClick={() => navigate(`/clients?search=${encodeURIComponent(t.client!.cin || t.client!.nom)}`)} className="capitalize hover:text-slate-900 hover:underline underline-offset-2">{person}</button>
                                                        : <span className="capitalize">{person}</span>
                                                )}
                                                {phone && <span className="tabular-nums">{phone}</span>}
                                                {t.notes && <span className="inline-flex items-center gap-1" title={t.notes}><StickyNote size={11} /> note</span>}
                                            </p>
                                            {t.notes && <p className="mt-1 text-xs text-slate-500 line-clamp-2 whitespace-pre-line">{t.notes}</p>}
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            {phone && !t.done_at && (
                                                <>
                                                    <button onClick={() => openExternal(`https://wa.me/${toWhatsAppNumber(phone)}`)} className={ghost} title="Ouvrir WhatsApp"><MessageCircle size={16} /></button>
                                                    <button onClick={() => openExternal(`tel:${phone.replace(/\s/g, '')}`)} className={ghost} title="Appeler"><Phone size={16} /></button>
                                                </>
                                            )}
                                            <button onClick={() => openTaskEditor({ task: t })} className={ghost} title="Modifier"><Pencil size={16} /></button>
                                            <button onClick={() => remove(t)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={16} /></button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
