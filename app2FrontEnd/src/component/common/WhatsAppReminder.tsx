// WhatsAppReminder.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Same flow as the Clients page "Envoyer un rappel":
//   1. choose the number (only asked when the client has two)
//   2. choose the language (Français / العربية)
//   3. edit the message (optional "Améliorer avec l'IA") and send via WhatsApp
//
//   openWhatsAppReminder({ client, messages: { fr: '…', ar: '…' } });
//
// <WhatsAppReminderHost /> is mounted once in App.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import { X, MessageCircle, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { openExternal } from '../../lib/tauri';
import { improveWhatsAppMessage } from '../../lib/gemini';
import { fillTemplate, useMessageContext } from '../../lib/messageTemplates';

export interface ReminderClient { id?: number; nom?: string; prenom?: string; tel?: string | null; tel_2?: string | null }
export interface ReminderRequest {
    client: ReminderClient;
    /** Pre-written message per language. */
    messages: { fr: string; ar: string };
}

let current: ReminderRequest | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

export function openWhatsAppReminder(req: ReminderRequest) {
    if (!req.client.tel && !req.client.tel_2) {
        toast.error("Le client n'a pas de numéro de téléphone.");
        return;
    }
    current = req;
    emit();
}
const close = () => { current = null; emit(); };

/** Moroccan numbers → international format for wa.me (same rule as the Clients page). */
export function toWhatsAppNumber(phone: string) {
    let clean = phone.replace(/\s/g, '').replace(/[^0-9+]/g, '');
    if (/^0[67]\d{8}$/.test(clean)) clean = '212' + clean.slice(1);
    else if (!clean.startsWith('+') && !clean.startsWith('212') && clean.length === 9) clean = '212' + clean;
    return clean.replace(/^\+/, '');
}

export function WhatsAppReminderHost() {
    const req = useSyncExternalStore(subscribe, () => current);
    if (!req) return null;
    return <Flow key={`${req.client.tel}-${req.client.tel_2}-${req.messages.fr.length}`} req={req} />;
}

type Step = 'phone' | 'lang' | 'edit';
const overlay = 'fixed inset-0 z-[880] flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in';
const panel = 'bg-white rounded-2xl shadow-xl w-full overflow-hidden ring-1 ring-slate-900/5 animate-dialog-in';
const closeBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100';
const choice = 'flex flex-col gap-1 p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition text-left';

function Flow({ req }: { req: ReminderRequest }) {
    const { client } = req;
    const both = !!(client.tel && client.tel_2);
    const [step, setStep] = useState<Step>(both ? 'phone' : 'lang');
    const [phone, setPhone] = useState<string>((client.tel || client.tel_2) as string);
    const [message, setMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [lang, setLang] = useState<'fr' | 'ar'>('fr');
    const ctx = useMessageContext();

    const pickLang = (l: 'fr' | 'ar') => { setLang(l); setMessage(req.messages[l]); setStep('edit'); };
    const applyTemplate = (id: string) => {
        if (id === '') { setMessage(req.messages[lang]); return; }
        const t = ctx.templates.find(x => String(x.id) === id);
        if (!t) return;
        const body = (lang === 'ar' ? t.body_ar : t.body_fr) || t.body_fr;
        setMessage(fillTemplate(body, ctx.varsFor(client.id, client)));
    };

    // Échap closes only this window (not the one underneath)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, []);

    const improve = async () => {
        try {
            setAiLoading(true);
            setMessage(await improveWhatsAppMessage(message));
            toast.success("Message amélioré par l'IA");
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'amélioration IA.");
        } finally {
            setAiLoading(false);
        }
    };

    const send = () => {
        openExternal(`https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`);
        close();
    };

    const name = `${client.prenom ?? ''} ${client.nom ?? ''}`.trim();
    const Header = ({ title, back }: { title: string; back?: Step }) => (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            {back && <button onClick={() => setStep(back)} className={closeBtn} title="Retour"><ArrowLeft size={16} /></button>}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 truncate capitalize">{name}{step !== 'phone' && ` · ${phone}`}</p>
            </div>
            <button onClick={close} className={closeBtn} title="Fermer"><X size={16} /></button>
        </div>
    );

    return (
        <div className={overlay} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
            {step === 'phone' && (
                <div className={`${panel} max-w-sm`}>
                    <Header title="Sélectionner le numéro" />
                    <div className="p-5 flex flex-col gap-3">
                        {[{ label: 'Numéro principal', v: client.tel }, { label: 'Numéro secondaire', v: client.tel_2 }].map(o => o.v && (
                            <button key={o.label} onClick={() => { setPhone(o.v as string); setStep('lang'); }} className={choice}>
                                <span className="text-xs text-slate-500">{o.label}</span>
                                <span className="text-sm font-semibold text-slate-900 tabular-nums">{o.v}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 'lang' && (
                <div className={`${panel} max-w-sm`}>
                    <Header title="Choisir la langue / اختر اللغة" back={both ? 'phone' : undefined} />
                    <div className="p-5 grid grid-cols-2 gap-3">
                        <button onClick={() => pickLang('fr')} className={`${choice} items-center py-6`}>
                            <span className="text-3xl">🇫🇷</span>
                            <span className="text-sm font-semibold text-slate-900">Français</span>
                        </button>
                        <button onClick={() => pickLang('ar')} className={`${choice} items-center py-6`}>
                            <span className="text-3xl">🇲🇦</span>
                            <span className="text-sm font-semibold text-slate-900">العربية</span>
                        </button>
                    </div>
                </div>
            )}

            {step === 'edit' && (
                <div className={`${panel} max-w-lg max-h-[90vh] flex flex-col`}>
                    <Header title="Modifier le message" back="lang" />
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Modèle</label>
                            <select defaultValue="" onChange={e => applyTemplate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                                <option value="">Message proposé</option>
                                {ctx.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-600">Message (*texte* pour le gras)</label>
                                <button onClick={improve} disabled={aiLoading || !message.trim()}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
                                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Améliorer avec l'IA
                                </button>
                            </div>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                rows={9}
                                dir="auto"
                                autoFocus
                                className="w-full resize-none px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50/60 ring-1 ring-inset ring-emerald-600/10">
                            <p className="text-xs font-medium text-emerald-700 mb-2">Aperçu WhatsApp</p>
                            <div dir="auto" className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {message.split('\n').map((line, i) => (
                                    <div key={i} className="min-h-[1.25em]">
                                        {line.split(/(\*.*?\*)/g).map((part, j) =>
                                            part.startsWith('*') && part.endsWith('*') && part.length > 2
                                                ? <strong key={j} className="font-semibold text-slate-900">{part.slice(1, -1)}</strong>
                                                : part)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                        <button onClick={close} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Annuler</button>
                        <button onClick={send} disabled={!message.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50">
                            <MessageCircle size={16} /> Envoyer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
