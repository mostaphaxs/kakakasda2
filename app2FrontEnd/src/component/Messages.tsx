// Messages.tsx — WhatsApp: bulk sending (one by one) and message templates.
// WhatsApp links cannot send automatically: each message opens ready in
// WhatsApp and the user presses "Envoyer"; this page walks through the list.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessagesSquare, Search, Send, SkipForward, Check, Plus, Pencil, Trash2, X, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { usePersistedState } from '../lib/usePersistedState';
import { useProjectFilter } from '../lib/activeProject';
import { CATEGORIES, VARIABLES, fillTemplate, useMessageContext, type MessageTemplate } from '../lib/messageTemplates';
import { toWhatsAppNumber } from './common/WhatsAppReminder';
import { confirmDialog } from './common/ConfirmDialog';
import { getAppSettings } from '../lib/appSettings';

const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const ghost = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100';

/** WhatsApp-style preview with *bold*. */
function Preview({ text }: { text: string }) {
    return (
        <div dir="auto" className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {text.split('\n').map((line, i) => (
                <div key={i} className="min-h-[1.25em]">
                    {line.split(/(\*.*?\*)/g).map((part, j) =>
                        part.startsWith('*') && part.endsWith('*') && part.length > 2
                            ? <strong key={j} className="font-semibold text-slate-900">{part.slice(1, -1)}</strong>
                            : <span key={j} className={/\{\w+\}/.test(part) ? '' : ''}>{part}</span>)}
                </div>
            ))}
        </div>
    );
}

export default function Messages() {
    const [tab, setTab] = usePersistedState<'bulk' | 'templates'>('Messages.tab', 'bulk');
    return (
        <div className="space-y-5 pb-10">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <MessagesSquare className="text-slate-400" size={26} /> Messages WhatsApp
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Envoyez un message personnalisé à plusieurs clients et gérez vos modèles.</p>
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
                        {([['bulk', 'Envoi groupé'], ['templates', 'Modèles']] as const).map(([k, l]) => (
                            <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-md transition-colors ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{l}</button>
                        ))}
                    </div>
                </div>
            </div>
            {tab === 'bulk' ? <BulkSend /> : <Templates />}
        </div>
    );
}

// ── Bulk sending ──────────────────────────────────────────────────────────────
type Audience = 'actifs' | 'retard' | 'non_signe' | 'avec_bien' | 'sans_bien';
const AUDIENCES: Record<Audience, string> = {
    actifs: 'Tous les clients actifs',
    retard: 'En retard de paiement',
    non_signe: 'Contrat non signé',
    avec_bien: 'Avec un bien réservé',
    sans_bien: 'Sans bien',
};

function BulkSend() {
    const ctx = useMessageContext();
    const [projet, setProjet] = useProjectFilter<string>('Messages.projet', 'all', p => String(p.id));
    const [audience, setAudience] = usePersistedState<Audience>('Messages.audience', 'actifs');
    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [useSecond, setUseSecond] = useState<Set<number>>(new Set());
    const [tplId, setTplId] = useState<string>('');
    const [lang, setLang] = useState<'fr' | 'ar'>(getAppSettings().preferences.whatsapp_lang ?? 'fr');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState<number[] | null>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);

    const lateIds = useMemo(() => new Set(ctx.echeances.filter(e => e.status === 'en_retard').map(e => e.client_id)), [ctx.echeances]);

    const audienceList = useMemo(() => {
        const s = q.trim().toLowerCase();
        return ctx.clients
            .filter(c => c.statut !== 'Annulé')
            .filter(c => projet === 'all' || (c.biens ?? []).some((b: any) => String(b.terrain_id) === projet))
            .filter(c => {
                const hasBien = (c.biens?.length ?? 0) > 0;
                switch (audience) {
                    case 'retard': return lateIds.has(c.id);
                    case 'non_signe': return hasBien && (c as any).statut_choix !== 'CONTRAT_SIGNE';
                    case 'avec_bien': return hasBien;
                    case 'sans_bien': return !hasBien;
                    default: return true;
                }
            })
            .filter(c => !s || `${c.prenom} ${c.nom} ${c.cin} ${c.tel}`.toLowerCase().includes(s));
    }, [ctx.clients, projet, audience, q, lateIds]);

    // select everyone with a phone whenever the audience changes
    useEffect(() => {
        setSelected(new Set(audienceList.filter(c => c.tel || (c as any).tel_2).map(c => c.id)));
    }, [projet, audience, ctx.clients.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyTemplate = (id: string, l = lang) => {
        setTplId(id);
        const t = ctx.templates.find(x => String(x.id) === id);
        if (t) setBody((l === 'ar' ? t.body_ar : t.body_fr) || t.body_fr);
    };
    const switchLang = (l: 'fr' | 'ar') => { setLang(l); if (tplId) applyTemplate(tplId, l); };

    const insertVar = (k: string) => {
        const el = textRef.current;
        const token = `{${k}}`;
        if (!el) return setBody(b => b + token);
        const start = el.selectionStart ?? body.length;
        const end = el.selectionEnd ?? body.length;
        const next = body.slice(0, start) + token + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
    };

    const recipients = audienceList.filter(c => selected.has(c.id));
    const sample = recipients[0];
    const phoneOf = (c: any) => (useSecond.has(c.id) && c.tel_2) ? c.tel_2 : (c.tel || c.tel_2);

    if (sending) {
        return <SendQueue ids={sending} body={body} phoneOf={phoneOf} onExit={() => setSending(null)} />;
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            {/* recipients */}
            <section className="xl:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-220px)] min-h-[420px]">
                <div className="p-5 space-y-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">1. Destinataires</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={projet} onChange={e => setProjet(e.target.value)} className={inputCls}>
                            <option value="all">Tous les projets</option>
                            {ctx.terrains.map(t => <option key={t.id} value={t.id}>{t.nom_projet || t.nom_terrain}</option>)}
                        </select>
                        <select value={audience} onChange={e => setAudience(e.target.value as Audience)} className={inputCls}>
                            {(Object.keys(AUDIENCES) as Audience[]).map(a => <option key={a} value={a}>{AUDIENCES[a]}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer…" className={`${inputCls} pl-9`} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{selected.size} sélectionné(s) sur {audienceList.length}</span>
                        <span className="flex gap-3">
                            <button onClick={() => setSelected(new Set(audienceList.filter(c => c.tel || (c as any).tel_2).map(c => c.id)))} className="font-medium text-slate-600 hover:text-slate-900">Tout</button>
                            <button onClick={() => setSelected(new Set())} className="font-medium text-slate-600 hover:text-slate-900">Aucun</button>
                        </span>
                    </div>
                </div>
                <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {ctx.loading && <li className="p-5 text-sm text-slate-400">Chargement…</li>}
                    {!ctx.loading && audienceList.length === 0 && <li className="p-8 text-center text-sm text-slate-400">Aucun client pour ce filtre</li>}
                    {audienceList.map(c => {
                        const cc = c as any;
                        const noPhone = !c.tel && !cc.tel_2;
                        const b = c.biens?.[0] as any;
                        return (
                            <li key={c.id} className={`flex items-center gap-3 px-5 py-2.5 ${noPhone ? 'opacity-50' : ''}`}>
                                <input type="checkbox" disabled={noPhone} checked={selected.has(c.id)}
                                    onChange={e => setSelected(s => { const n = new Set(s); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })}
                                    className="w-4 h-4 rounded border-slate-300 accent-slate-900" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-slate-900 capitalize truncate">{c.prenom} {c.nom}</span>
                                    <span className="block text-xs text-slate-500 truncate">
                                        {noPhone ? 'Pas de téléphone' : phoneOf(c)}{b ? ` · ${b.type_bien ?? ''} ${b.num_appartement || b.nom || ''}` : ''}
                                    </span>
                                </span>
                                {c.tel && cc.tel_2 && (
                                    <button onClick={() => setUseSecond(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                                        className="px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 whitespace-nowrap"
                                        title="Ce client a deux numéros : cliquer pour changer">
                                        {useSecond.has(c.id) ? 'N° 2' : 'N° 1'}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* message */}
            <section className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">2. Message</h3>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <select value={tplId} onChange={e => applyTemplate(e.target.value)} className={inputCls}>
                        <option value="">— Choisir un modèle (ou écrire librement) —</option>
                        {ctx.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
                        {([['fr', 'Français'], ['ar', 'العربية']] as const).map(([k, l]) => (
                            <button key={k} onClick={() => switchLang(k)} className={`px-3 py-1.5 rounded-md transition-colors ${lang === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{l}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Texte (les {'{variables}'} sont remplacées pour chaque client · *texte* = gras)</label>
                    <textarea ref={textRef} value={body} onChange={e => setBody(e.target.value)} rows={8} dir="auto"
                        placeholder="Bonjour {prenom}, …" className={`${inputCls} resize-y`} />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {VARIABLES.map(v => (
                            <button key={v.key} onClick={() => insertVar(v.key)} title={v.label}
                                className="px-2 py-0.5 rounded-md text-xs font-mono text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200 hover:bg-slate-100">
                                {`{${v.key}}`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/60 ring-1 ring-inset ring-emerald-600/10">
                    <p className="text-xs font-medium text-emerald-700 mb-2">Aperçu {sample ? <>pour <span className="capitalize">{sample.prenom} {sample.nom}</span></> : ''}</p>
                    {body.trim() ? <Preview text={fillTemplate(body, ctx.varsFor(sample?.id))} /> : <p className="text-sm text-slate-400">Choisissez un modèle ou écrivez un message.</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-500">WhatsApp s'ouvrira pour chaque client avec le message prêt : il suffit d'appuyer sur Envoyer.</p>
                    <button disabled={!body.trim() || recipients.length === 0}
                        onClick={() => setSending(recipients.map(c => c.id))}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                        <Send size={15} /> Commencer l'envoi ({recipients.length})
                    </button>
                </div>
            </section>
        </div>
    );
}

function SendQueue({ ids, body, phoneOf, onExit }: { ids: number[]; body: string; phoneOf: (c: any) => string; onExit: () => void }) {
    const ctx = useMessageContext();
    const [i, setI] = useState(0);
    const [status, setStatus] = useState<Record<number, 'sent' | 'skipped'>>({});
    const list = ids.map(id => ctx.clients.find(c => c.id === id)).filter(Boolean) as any[];
    const current = list[i];
    const done = i >= list.length;
    const sentCount = Object.values(status).filter(s => s === 'sent').length;

    const open = () => {
        if (!current) return;
        const msg = fillTemplate(body, ctx.varsFor(current.id));
        openExternal(`https://wa.me/${toWhatsAppNumber(phoneOf(current))}?text=${encodeURIComponent(msg)}`);
        setStatus(s => ({ ...s, [current.id]: 'sent' }));
    };
    const next = () => setI(x => x + 1);
    const skip = () => { if (current) setStatus(s => ({ ...s, [current.id]: 'skipped' })); next(); };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
            if (e.key === 'Enter') { e.preventDefault(); if (current && !status[current.id]) open(); else next(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <section className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                    <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Retour</button>
                    <span className="text-sm text-slate-500 tabular-nums">{Math.min(i + 1, list.length)} / {list.length} · {sentCount} ouvert(s)</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-slate-900 transition-[width]" style={{ width: `${(Math.min(i, list.length) / Math.max(1, list.length)) * 100}%` }} />
                </div>

                {done ? (
                    <div className="py-14 text-center">
                        <div className="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check size={22} /></div>
                        <p className="mt-3 text-base font-semibold text-slate-900">Envoi terminé</p>
                        <p className="text-sm text-slate-500">{sentCount} message(s) ouvert(s) dans WhatsApp, {list.length - sentCount} passé(s).</p>
                        <button onClick={onExit} className="mt-5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Terminer</button>
                    </div>
                ) : current && (
                    <>
                        <div className="mt-6">
                            <p className="text-lg font-semibold text-slate-900 capitalize">{current.prenom} {current.nom}</p>
                            <p className="text-sm text-slate-500 tabular-nums">{phoneOf(current)}</p>
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 ring-1 ring-inset ring-emerald-600/10 max-h-72 overflow-y-auto">
                            <Preview text={fillTemplate(body, ctx.varsFor(current.id))} />
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <button onClick={open} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
                                <ExternalLink size={15} /> {status[current.id] === 'sent' ? 'Rouvrir WhatsApp' : 'Ouvrir dans WhatsApp'}
                            </button>
                            <button onClick={next} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Suivant <SkipForward size={15} />
                            </button>
                            <button onClick={skip} className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900">Passer</button>
                            <span className="ml-auto text-xs text-slate-400">Entrée : ouvrir puis suivant · → : suivant</span>
                        </div>
                    </>
                )}
            </section>

            <section className="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <header className="px-5 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Liste d'envoi</header>
                <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                    {list.map((c, k) => (
                        <li key={c.id}>
                            <button onClick={() => setI(k)} className={`w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm ${k === i ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${status[c.id] === 'sent' ? 'bg-emerald-600 text-white' : status[c.id] === 'skipped' ? 'bg-slate-200 text-slate-500' : 'ring-1 ring-inset ring-slate-300'}`}>
                                    {status[c.id] === 'sent' && <Check size={12} strokeWidth={3} />}
                                    {status[c.id] === 'skipped' && <X size={11} />}
                                </span>
                                <span className="flex-1 min-w-0 truncate capitalize text-slate-900">{c.prenom} {c.nom}</span>
                                <span className="text-xs text-slate-400 tabular-nums">{phoneOf(c)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

// ── Templates management ──────────────────────────────────────────────────────
function Templates() {
    const qc = useQueryClient();
    const ctx = useMessageContext();
    const [editing, setEditing] = useState<Partial<MessageTemplate> | null>(null);
    const sampleVars = ctx.varsFor(ctx.clients.find(c => (c.biens?.length ?? 0) > 0)?.id ?? ctx.clients[0]?.id);

    const remove = async (t: MessageTemplate) => {
        if (!await confirmDialog(`Supprimer le modèle « ${t.name} » ?`)) return;
        try { await apiFetch(`/message-templates/${t.id}`, { method: 'DELETE' }); qc.invalidateQueries({ queryKey: ['message-templates'] }); toast.success('Modèle supprimé'); }
        catch (e: any) { toast.error(e.message); }
    };

    return (
        <>
            <div className="flex justify-end">
                <button onClick={() => setEditing({ category: 'autre', body_fr: '', body_ar: '' })} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
                    <Plus size={16} /> Nouveau modèle
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {ctx.templates.map(t => (
                    <article key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
                        <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                                <span className="text-xs text-slate-500">{CATEGORIES[t.category] ?? t.category}{t.body_ar ? ' · FR + AR' : ' · FR'}</span>
                            </div>
                            <button onClick={() => setEditing(t)} className={ghost} title="Modifier"><Pencil size={15} /></button>
                            <button onClick={() => remove(t)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={15} /></button>
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-slate-50 text-xs max-h-40 overflow-hidden relative">
                            <Preview text={fillTemplate(t.body_fr, sampleVars)} />
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50" />
                        </div>
                    </article>
                ))}
            </div>
            {editing && <TemplateEditor tpl={editing} sampleVars={sampleVars} onClose={() => setEditing(null)} />}
        </>
    );
}

function TemplateEditor({ tpl, sampleVars, onClose }: { tpl: Partial<MessageTemplate>; sampleVars: Record<string, string>; onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState(tpl.name ?? '');
    const [category, setCategory] = useState(tpl.category ?? 'autre');
    const [fr, setFr] = useState(tpl.body_fr ?? '');
    const [ar, setAr] = useState(tpl.body_ar ?? '');
    const [focus, setFocus] = useState<'fr' | 'ar'>('fr');
    const [saving, setSaving] = useState(false);
    const frRef = useRef<HTMLTextAreaElement>(null);
    const arRef = useRef<HTMLTextAreaElement>(null);

    const insertVar = (k: string) => {
        const el = focus === 'fr' ? frRef.current : arRef.current;
        const val = focus === 'fr' ? fr : ar;
        const set = focus === 'fr' ? setFr : setAr;
        const token = `{${k}}`;
        const s = el?.selectionStart ?? val.length;
        const e = el?.selectionEnd ?? val.length;
        set(val.slice(0, s) + token + val.slice(e));
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + token.length, s + token.length); });
    };

    const save = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!name.trim() || !fr.trim()) return toast.error('Nom et message en français obligatoires');
        setSaving(true);
        try {
            await apiFetch(tpl.id ? `/message-templates/${tpl.id}` : '/message-templates', {
                method: tpl.id ? 'PUT' : 'POST',
                body: JSON.stringify({ name: name.trim(), category, body_fr: fr, body_ar: ar.trim() || null }),
            });
            qc.invalidateQueries({ queryKey: ['message-templates'] });
            toast.success(tpl.id ? 'Modèle modifié' : 'Modèle créé');
            onClose();
        } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <form onSubmit={save} className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-dialog-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">{tpl.id ? 'Modifier le modèle' : 'Nouveau modèle'}</h3>
                    <button type="button" onClick={onClose} className={ghost} title="Fermer"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
                        <div><label className={labelCls}>Nom du modèle</label><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Rappel de paiement" className={inputCls} /></div>
                        <div><label className={labelCls}>Catégorie</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                                {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1.5">Insérer une variable (dans le champ sélectionné) :</p>
                        <div className="flex flex-wrap gap-1.5">
                            {VARIABLES.map(v => (
                                <button type="button" key={v.key} onClick={() => insertVar(v.key)} title={v.label}
                                    className="px-2 py-0.5 rounded-md text-xs font-mono text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200 hover:bg-slate-100">{`{${v.key}}`}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Message en français</label>
                            <textarea ref={frRef} value={fr} onFocus={() => setFocus('fr')} onChange={e => setFr(e.target.value)} rows={9} className={`${inputCls} resize-y`} />
                            <div className="mt-2 p-3 rounded-lg bg-emerald-50/60 ring-1 ring-inset ring-emerald-600/10"><Preview text={fillTemplate(fr, sampleVars)} /></div>
                        </div>
                        <div>
                            <label className={labelCls}>Message en arabe (optionnel)</label>
                            <textarea ref={arRef} dir="rtl" value={ar} onFocus={() => setFocus('ar')} onChange={e => setAr(e.target.value)} rows={9} className={`${inputCls} resize-y`} />
                            {ar.trim() && <div className="mt-2 p-3 rounded-lg bg-emerald-50/60 ring-1 ring-inset ring-emerald-600/10"><Preview text={fillTemplate(ar, sampleVars)} /></div>}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Annuler</button>
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50">
                        {saving && <Loader2 size={14} className="animate-spin" />} Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
}
