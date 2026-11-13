// Parametres.tsx — application settings: prices, company identity (used on
// every PDF), preferences, AI key and database tools.

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Settings2, Loader2, Upload, Trash2, Eye, EyeOff, Database, Download, Check, Sparkles, FileText, Server } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { apiFetch } from '../lib/api';
import { useAppSettings, setAppSettings, logoUrl, stampUrl, MODULES, type AppSettings } from '../lib/appSettings';
import { useQuery } from '@tanstack/react-query';
import { testAiConnection } from '../lib/gemini';
import ConfigPrixBiens from './ConfigPrixBiens';
import { confirmDialog } from './common/ConfirmDialog';

type Tab = 'prix' | 'societe' | 'pages' | 'documents' | 'notifications' | 'preferences' | 'ia' | 'donnees' | 'apropos';
const TABS: { key: Tab; label: string }[] = [
    { key: 'societe', label: 'Société' },
    { key: 'prix', label: 'Prix' },
    { key: 'pages', label: 'Pages' },
    { key: 'documents', label: 'Documents' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'preferences', label: 'Préférences' },
    { key: 'ia', label: 'Intelligence artificielle' },
    { key: 'donnees', label: 'Données' },
    { key: 'apropos', label: 'À propos' },
];

const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label className={labelCls}>{label}</label>
            {children}
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-1 lg:grid-cols-3">
            <div className="p-6 lg:border-r border-b lg:border-b-0 border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
            </div>
            <div className="lg:col-span-2 p-6">{children}</div>
        </section>
    );
}

export default function Parametres() {
    const [params, setParams] = useSearchParams();
    const tab = (params.get('tab') as Tab) || 'societe';
    const setTab = (t: Tab) => { params.set('tab', t); setParams(params, { replace: true }); };
    const { settings, isLoading } = useAppSettings();

    return (
        <div className="space-y-5 pb-10">
            <div className="bg-white px-6 pt-6 rounded-xl border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <Settings2 className="text-slate-400 flex-shrink-0" size={26} /> Paramètres
                </h1>
                <p className="text-slate-500 text-sm mt-1">Identité de la société, prix, préférences et outils.</p>
                <nav className="mt-5 -mb-px flex gap-6 overflow-x-auto">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {isLoading && !['prix', 'donnees', 'apropos'].includes(tab) ? (
                <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ) : (
                <>
                    {tab === 'societe' && <CompanyTab initial={settings} />}
                    {tab === 'prix' && <ConfigPrixBiens embedded />}
                    {tab === 'pages' && <PagesTab initial={settings} />}
                    {tab === 'documents' && <DocumentsTab initial={settings} />}
                    {tab === 'notifications' && <NotificationsTab initial={settings} />}
                    {tab === 'preferences' && <PreferencesTab initial={settings} />}
                    {tab === 'ia' && <AiTab initial={settings} />}
                    {tab === 'donnees' && <DataTab />}
                    {tab === 'apropos' && <AboutTab />}
                </>
            )}
        </div>
    );
}

/** Saves one section of the settings and refreshes the cache. */
function useSaveSection() {
    const qc = useQueryClient();
    const [saving, setSaving] = useState(false);
    const saveSection = async (body: Partial<AppSettings>, message = 'Paramètres enregistrés') => {
        setSaving(true);
        try {
            const res = await apiFetch<{ settings: AppSettings }>('/settings/app', { method: 'PUT', body: JSON.stringify(body) });
            setAppSettings(res.settings);
            qc.setQueryData(['app-settings'], res.settings);
            toast.success(message);
            return true;
        } catch (e: any) { toast.error(e.message); return false; } finally { setSaving(false); }
    };
    return { saving, saveSection };
}

function SaveBar({ saving, dirty, onSave }: { saving: boolean; dirty: boolean; onSave: () => void }) {
    return (
        <div className="sticky bottom-4 flex justify-end pr-24">
            <button onClick={onSave} disabled={saving || !dirty}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium shadow-lg hover:bg-slate-800 disabled:opacity-40 disabled:shadow-none">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {dirty ? 'Enregistrer les modifications' : 'Enregistré'}
            </button>
        </div>
    );
}

// ── Société ───────────────────────────────────────────────────────────────────
function CompanyTab({ initial }: { initial: AppSettings }) {
    const qc = useQueryClient();
    const [c, setC] = useState(initial.company);
    const fileRef = useRef<HTMLInputElement>(null);
    const { saving, saveSection } = useSaveSection();
    const dirty = JSON.stringify(c) !== JSON.stringify(initial.company);
    const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) => setC({ ...c, [k]: e.target.value });

    const [uploadingKind, setUploadingKind] = useState<'logo' | 'stamp' | null>(null);
    const stampRef = useRef<HTMLInputElement>(null);
    const uploadImage = async (kind: 'logo' | 'stamp', f?: File) => {
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) return toast.error('Image trop lourde (max 2 Mo)');
        setUploadingKind(kind);
        try {
            const fd = new FormData(); fd.append('image', f);
            const res = await apiFetch<{ settings: AppSettings; message: string }>(`/settings/image/${kind}`, { method: 'POST', body: fd });
            setAppSettings(res.settings); qc.setQueryData(['app-settings'], res.settings);
            setC(prev => ({ ...prev, [`${kind}_path`]: res.settings.company[`${kind}_path`] }));
            toast.success(res.message);
        } catch (e: any) { toast.error(e.message); } finally {
            setUploadingKind(null);
            if (fileRef.current) fileRef.current.value = '';
            if (stampRef.current) stampRef.current.value = '';
        }
    };
    const removeImage = async (kind: 'logo' | 'stamp') => {
        try {
            const res = await apiFetch<{ settings: AppSettings; message: string }>(`/settings/image/${kind}`, { method: 'DELETE' });
            setAppSettings(res.settings); qc.setQueryData(['app-settings'], res.settings);
            setC(prev => ({ ...prev, [`${kind}_path`]: null }));
            toast.success(res.message);
        } catch (e: any) { toast.error(e.message); }
    };
    const uploadLogo = (f?: File) => uploadImage('logo', f);
    const removeLogo = () => removeImage('logo');
    const uploading = uploadingKind === 'logo';
    const stamp = stampUrl(initial);
    const logo = logoUrl(initial);

    return (
        <div className="space-y-5">
            <Section title="Logo" desc="Affiché en haut de tous les documents PDF (reçus, relevés, contrats, rapport mensuel).">
                <div className="flex items-center gap-5">
                    <div className="w-40 h-24 rounded-lg ring-1 ring-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {logo ? <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-400">Aucun logo</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => uploadLogo(e.target.files?.[0])} />
                        <button onClick={() => fileRef.current?.click()} disabled={uploadingKind !== null} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {logo ? 'Changer le logo' : 'Ajouter un logo'}
                        </button>
                        {logo && <button onClick={removeLogo} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600"><Trash2 size={15} /> Retirer</button>}
                        <p className="text-xs text-slate-400">PNG ou JPG, fond transparent idéalement, max 2 Mo.</p>
                    </div>
                </div>
            </Section>

            <Section title="Identité" desc="Nom et coordonnées imprimés dans l'en-tête des documents.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom de la société" className="sm:col-span-2"><input value={c.name} onChange={set('name')} className={inputCls} /></Field>
                    <Field label="Activité (sous le nom)" className="sm:col-span-2"><input value={c.tagline} onChange={set('tagline')} className={inputCls} /></Field>
                    <Field label="Forme juridique"><input value={c.legal_form} onChange={set('legal_form')} placeholder="S.A.R.L" className={inputCls} /></Field>
                    <Field label="Capital social"><input value={c.capital} onChange={set('capital')} placeholder="Ex : 200.000 DH" className={inputCls} /></Field>
                    <Field label="Adresse du siège" className="sm:col-span-2"><input value={c.address} onChange={set('address')} placeholder="Ex : 84, Rue Prince Moulay Abdellah" className={inputCls} /></Field>
                    <Field label="Ville"><input value={c.city} onChange={set('city')} className={inputCls} /></Field>
                    <Field label="Téléphone"><input value={c.phone} onChange={set('phone')} placeholder="05 22 …" className={inputCls} /></Field>
                    <Field label="E-mail"><input value={c.email} onChange={set('email')} className={inputCls} /></Field>
                    <Field label="Site web"><input value={c.website} onChange={set('website')} className={inputCls} /></Field>
                </div>
            </Section>

            <Section title="Identifiants légaux" desc="Imprimés en pied de page des documents et dans les contrats.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="ICE"><input value={c.ice} onChange={set('ice')} className={`${inputCls} tabular-nums`} /></Field>
                    <Field label="RC"><input value={c.rc} onChange={set('rc')} className={`${inputCls} tabular-nums`} /></Field>
                    <Field label="IF"><input value={c.if} onChange={set('if')} className={`${inputCls} tabular-nums`} /></Field>
                    <Field label="Patente"><input value={c.patente} onChange={set('patente')} className={`${inputCls} tabular-nums`} /></Field>
                    <Field label="CNSS"><input value={c.cnss} onChange={set('cnss')} className={`${inputCls} tabular-nums`} /></Field>
                </div>
            </Section>

            <Section title="Représentant légal" desc="Nom imprimé dans les contrats : « représentée par M. …, en sa qualité de gérant ».">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom et prénom"><input value={c.manager_name} onChange={set('manager_name')} placeholder="Ex : Aziz El …" className={inputCls} /></Field>
                    <Field label="Qualité"><input value={c.manager_title} onChange={set('manager_title')} placeholder="Gérant" className={inputCls} /></Field>
                </div>
            </Section>

            <Section title="Coordonnées bancaires" desc="Indiquées sur les relevés de compte pour les virements des clients.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Banque"><input value={c.bank_name} onChange={set('bank_name')} placeholder="Ex : Attijariwafa Bank" className={inputCls} /></Field>
                    <Field label="Agence"><input value={c.bank_agency} onChange={set('bank_agency')} className={inputCls} /></Field>
                    <Field label="RIB (24 chiffres)" className="sm:col-span-2" hint={c.rib && c.rib.replace(/\D/g, '').length !== 24 ? `${c.rib.replace(/\D/g, '').length} chiffres : un RIB marocain en compte 24.` : undefined}>
                        <input value={c.rib} onChange={set('rib')} placeholder="000 000 0000000000000000 00" className={`${inputCls} font-mono tracking-wide`} />
                    </Field>
                </div>
            </Section>

            <Section title="Cachet et signature" desc="Image placée dans la case « Cachet et signature » des reçus, contrats et attestations.">
                <div className="flex items-center gap-5">
                    <div className="w-40 h-24 rounded-lg ring-1 ring-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {stamp ? <img src={stamp} alt="Cachet" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-400">Aucun cachet</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <input ref={stampRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => uploadImage('stamp', e.target.files?.[0])} />
                        <button onClick={() => stampRef.current?.click()} disabled={uploadingKind !== null} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            {uploadingKind === 'stamp' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {stamp ? 'Changer le cachet' : 'Ajouter un cachet'}
                        </button>
                        {stamp && <button onClick={() => removeImage('stamp')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600"><Trash2 size={15} /> Retirer</button>}
                        <p className="text-xs text-slate-400">Scannez le cachet signé sur fond blanc (PNG transparent idéal).</p>
                    </div>
                </div>
            </Section>

            <Section title="Aperçu" desc="Ce qui apparaîtra en haut et en bas de vos documents.">
                <div className="rounded-lg ring-1 ring-slate-200 p-5 bg-white">
                    <div className="flex items-start gap-3 pb-3 border-b border-slate-200">
                        {logo && <img src={logo} alt="" className="h-10 w-auto object-contain" />}
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 uppercase">{c.name || '—'}</p>
                            <p className="text-xs text-slate-500">{c.tagline}</p>
                            <p className="text-[11px] text-slate-400">{[[c.address, c.city].filter(Boolean).join(', '), c.phone, c.email].filter(Boolean).join('  ·  ')}</p>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-700"><FileText size={13} /> REÇU DE PAIEMENT</span>
                    </div>
                    <div className="h-10" />
                    <p className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        {[c.legal_form && `${c.name} ${c.legal_form}`, c.ice && `ICE ${c.ice}`, c.rc && `RC ${c.rc}`, c.if && `IF ${c.if}`, c.patente && `Patente ${c.patente}`, c.cnss && `CNSS ${c.cnss}`, c.capital && `Capital ${c.capital}`].filter(Boolean).join('  ·  ') || 'Ajoutez vos identifiants pour les voir ici.'}
                    </p>
                </div>
            </Section>

            <SaveBar saving={saving} dirty={dirty} onSave={() => saveSection({ company: c }, 'Informations de la société enregistrées')} />
        </div>
    );
}

// ── Préférences ───────────────────────────────────────────────────────────────
function PreferencesTab({ initial }: { initial: AppSettings }) {
    const [p, setP] = useState(initial.preferences);
    const { saving, saveSection } = useSaveSection();
    const dirty = JSON.stringify(p) !== JSON.stringify(initial.preferences);

    const seg = <T extends string>(value: T, options: [T, string][], onChange: (v: T) => void) => (
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
            {options.map(([k, l]) => (
                <button key={k} onClick={() => onChange(k)} className={`px-3 py-1.5 rounded-md transition-colors ${value === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{l}</button>
            ))}
        </div>
    );

    return (
        <div className="space-y-5">
            <Section title="Accueil" desc="Comment l'application vous salue.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom affiché" hint="« Bonjour, M. Aziz » sur l'accueil et à la connexion.">
                        <input value={p.owner_name} onChange={e => setP({ ...p, owner_name: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Ville de signature" hint="« Fait à … » sur les contrats et attestations.">
                        <input value={p.signing_city} onChange={e => setP({ ...p, signing_city: e.target.value })} className={inputCls} />
                    </Field>
                </div>
            </Section>

            <Section title="Affichage" desc="Taille du texte dans toute l'application.">
                <div className="space-y-3">
                    {seg(p.text_scale, [['petit', 'Petit'], ['normal', 'Normal'], ['grand', 'Grand']], v => setP({ ...p, text_scale: v }))}
                    <p className="text-xs text-slate-400">L'aperçu s'applique après l'enregistrement.</p>
                </div>
            </Section>

            <Section title="Confidentialité" desc="Montants du tableau de bord à l'ouverture.">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={p.hide_amounts_default} onChange={e => setP({ ...p, hide_amounts_default: e.target.checked })} className="w-4 h-4 rounded border-slate-300 accent-slate-900" />
                    <span className="text-sm text-slate-700">Masquer les montants par défaut</span>
                </label>
                <p className="mt-2 text-xs text-slate-400">Utile si l'écran est visible par des visiteurs. Votre dernier choix sur le tableau de bord reste prioritaire.</p>
            </Section>

            <Section title="WhatsApp" desc="Langue proposée par défaut pour les envois groupés.">
                {seg(p.whatsapp_lang, [['fr', 'Français'], ['ar', 'العربية']], v => setP({ ...p, whatsapp_lang: v }))}
            </Section>

            <SaveBar saving={saving} dirty={dirty} onSave={() => saveSection({ preferences: p }, 'Préférences enregistrées')} />
        </div>
    );
}

// ── Intelligence artificielle ─────────────────────────────────────────────────
function AiTab({ initial }: { initial: AppSettings }) {
    const [a, setA] = useState(initial.ai);
    const [show, setShow] = useState(false);
    const [testing, setTesting] = useState(false);
    const { saving, saveSection } = useSaveSection();
    const dirty = JSON.stringify(a) !== JSON.stringify(initial.ai);

    const test = async () => {
        setTesting(true);
        try {
            if (dirty) await saveSection({ ai: a }, 'Paramètres IA enregistrés');
            const r = await testAiConnection();
            toast.success(`Connexion réussie (réponse : ${r.slice(0, 20)})`);
        } catch (e: any) {
            toast.error(`Échec : ${e.message || 'clé ou modèle invalide'}`, { duration: 7000 });
        } finally { setTesting(false); }
    };

    return (
        <div className="space-y-5">
            <Section title="Clé Google Gemini" desc="Utilisée par l'assistant Nova, l'analyse de factures, la dictée vocale et l'amélioration des messages.">
                <div className="space-y-4">
                    <Field label="Clé API" hint="Créez une clé gratuite sur aistudio.google.com → « Get API key ». Elle reste enregistrée sur ce PC.">
                        <div className="relative">
                            <input type={show ? 'text' : 'password'} value={a.gemini_key} onChange={e => setA({ ...a, gemini_key: e.target.value })}
                                placeholder={initial.ai.gemini_key ? '' : 'Aucune clé : la clé intégrée à l’application est utilisée si elle existe'}
                                className={`${inputCls} pr-10 font-mono`} autoComplete="off" spellCheck={false} />
                            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700" title={show ? 'Masquer' : 'Afficher'}>
                                {show ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </Field>
                    <button onClick={test} disabled={testing} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        {testing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Tester la connexion
                    </button>
                </div>
            </Section>

            <Section title="Modèles" desc="Laissez vide pour garder les modèles par défaut de l'application.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Texte (messages, e-mails, assistant)" hint="Le moins cher convient : ex. gemini-flash-lite-latest">
                        <input value={a.model_text} onChange={e => setA({ ...a, model_text: e.target.value })} placeholder="Par défaut" className={`${inputCls} font-mono`} />
                    </Field>
                    <Field label="Images & documents (factures, dictée)" hint="Plus précis : ex. gemini-flash-latest">
                        <input value={a.model_vision} onChange={e => setA({ ...a, model_vision: e.target.value })} placeholder="Par défaut" className={`${inputCls} font-mono`} />
                    </Field>
                </div>
            </Section>

            <SaveBar saving={saving} dirty={dirty} onSave={() => saveSection({ ai: a }, 'Paramètres IA enregistrés')} />
        </div>
    );
}

// ── Données ───────────────────────────────────────────────────────────────────
function DataTab() {
    const [path, setPath] = useState('');
    const [busy, setBusy] = useState<'import' | 'export' | null>(null);
    const isDesktop = !!(window as any).__TAURI_INTERNALS__;

    useEffect(() => {
        if (!isDesktop) { setPath('Disponible uniquement dans l’application de bureau'); return; }
        invoke<string>('get_database_path').then(setPath).catch(() => setPath('Indisponible'));
    }, [isDesktop]);

    const exportDb = async () => {
        try {
            const dest = await save({ defaultPath: `sauvegarde_${new Date().toISOString().slice(0, 10)}.sqlite`, filters: [{ name: 'Base SQLite', extensions: ['sqlite', 'db'] }] });
            if (!dest) return;
            setBusy('export');
            toast.success(await invoke<string>('export_database', { destinationPath: dest }));
        } catch (e: any) { toast.error(String(e) || "Erreur lors de l'exportation"); } finally { setBusy(null); }
    };
    const importDb = async () => {
        try {
            const src = await open({ multiple: false, filters: [{ name: 'Base SQLite', extensions: ['sqlite', 'db'] }] });
            if (!src) return;
            if (!await confirmDialog({ title: 'Restaurer la base de données', message: 'Toutes les données actuelles seront remplacées par celles du fichier choisi. Continuer ?', confirmLabel: 'Restaurer', variant: 'danger' })) return;
            setBusy('import');
            toast.success(await invoke<string>('import_database', { sourcePath: src }), { duration: 7000 });
        } catch (e: any) { toast.error(String(e) || "Erreur lors de l'importation"); } finally { setBusy(null); }
    };

    return (
        <div className="space-y-5">
            <Section title="Sauvegarde" desc="Exportez une copie complète de vos données (clients, paiements, projets…). Gardez-la sur une clé USB ou dans le cloud.">
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">Emplacement actuel</p>
                    <code className="block px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200 text-xs text-slate-700 break-all">{path || '…'}</code>
                    <button onClick={exportDb} disabled={!isDesktop || busy !== null} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                        {busy === 'export' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Exporter une sauvegarde
                    </button>
                </div>
            </Section>
            <Section title="Restauration" desc="Remplace toutes les données actuelles par celles d'un fichier de sauvegarde. Redémarrez l'application ensuite.">
                <button onClick={importDb} disabled={!isDesktop || busy !== null} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                    {busy === 'import' ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />} Restaurer depuis un fichier…
                </button>
                <p className="mt-2 text-xs text-slate-400">Conseil : exportez d'abord une sauvegarde des données actuelles.</p>
            </Section>
        </div>
    );
}

// ── Documents ─────────────────────────────────────────────────────────────────
function DocumentsTab({ initial }: { initial: AppSettings }) {
    const [d, setD] = useState(initial.documents);
    const { saving, saveSection } = useSaveSection();
    const dirty = JSON.stringify(d) !== JSON.stringify(initial.documents);
    const num = (k: 'penalty_percent' | 'notice_days') => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: Number(e.target.value) || 0 });
    const check = (k: 'show_stamp' | 'show_bank_on_statement', label: string, hint: string) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={d[k]} onChange={e => setD({ ...d, [k]: e.target.checked })} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-900" />
            <span><span className="block text-sm text-slate-700">{label}</span><span className="block text-xs text-slate-400">{hint}</span></span>
        </label>
    );
    return (
        <div className="space-y-5">
            <Section title="Reçus de paiement" desc="Numérotation et mention en bas de chaque reçu.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Préfixe du numéro" hint={`Exemple : ${d.receipt_prefix || 'R-'}00042`}>
                        <input value={d.receipt_prefix} onChange={e => setD({ ...d, receipt_prefix: e.target.value })} maxLength={12} className={`${inputCls} font-mono`} />
                    </Field>
                    <Field label="Mention en bas du reçu" className="sm:col-span-2" hint="Ex : « Ce reçu ne vaut quittance qu'après encaissement effectif du chèque. »">
                        <textarea value={d.receipt_note} onChange={e => setD({ ...d, receipt_note: e.target.value })} rows={2} maxLength={300} className={`${inputCls} resize-none`} />
                    </Field>
                </div>
            </Section>

            <Section title="Affichage" desc="Éléments ajoutés automatiquement aux PDF.">
                <div className="space-y-3">
                    {check('show_stamp', 'Apposer le cachet de la société', 'Dans la case signature des reçus, contrats et attestations (cachet à ajouter dans Société).')}
                    {check('show_bank_on_statement', 'Afficher le RIB sur les relevés de compte', 'Pour faciliter les virements des clients.')}
                </div>
            </Section>

            <Section title="Clauses des contrats" desc="Valeurs utilisées dans le contrat de réservation et le compromis de vente.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Frais de désistement (%)" hint="0 = « frais convenus entre les parties »">
                        <input type="number" min={0} max={100} value={d.penalty_percent} onChange={num('penalty_percent')} className={inputCls} />
                    </Field>
                    <Field label="Délai de mise en demeure (jours)">
                        <input type="number" min={1} max={180} value={d.notice_days} onChange={num('notice_days')} className={inputCls} />
                    </Field>
                    <Field label="Délai de livraison (mois)" hint="Vide = clause non incluse">
                        <input type="number" min={0} max={120} value={d.delivery_months as any} onChange={e => setD({ ...d, delivery_months: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Conditions particulières (ajoutées en dernier article)" className="sm:col-span-3">
                        <textarea value={d.extra_clause} onChange={e => setD({ ...d, extra_clause: e.target.value })} rows={4} maxLength={2000} placeholder="Ex : Le parking n° … est inclus dans le prix." className={`${inputCls} resize-y`} />
                    </Field>
                </div>
                <p className="mt-3 text-xs text-slate-400">Faites valider le texte des contrats par votre notaire.</p>
            </Section>

            <SaveBar saving={saving} dirty={dirty} onSave={() => saveSection({ documents: d }, 'Paramètres des documents enregistrés')} />
        </div>
    );
}

// ── Notifications ─────────────────────────────────────────────────────────────
function NotificationsTab({ initial }: { initial: AppSettings }) {
    const [n, setN] = useState(initial.notifications);
    const { saving, saveSection } = useSaveSection();
    const qc = useQueryClient();
    const dirty = JSON.stringify(n) !== JSON.stringify(initial.notifications);
    type BoolKey = 'echeances' | 'cheques' | 'contrats' | 'stock' | 'audiences' | 'taches';
    type NumKey = 'upcoming_days' | 'cheque_days' | 'hearing_days' | 'stock_threshold';
    const rows: { key: BoolKey; label: string; desc: string; num?: { key: NumKey; label: string; suffix: string } }[] = [
        { key: 'echeances', label: 'Échéances clients', desc: 'Retards de paiement et échéances à venir', num: { key: 'upcoming_days', label: 'Prévenir', suffix: 'jours avant' } },
        { key: 'cheques', label: 'Chèques', desc: 'Chèques à déposer et chèques déposés non encaissés', num: { key: 'cheque_days', label: 'Prévenir', suffix: 'jours avant la date' } },
        { key: 'taches', label: 'Tâches', desc: 'Tâches du jour et en retard' },
        { key: 'audiences', label: 'Audiences', desc: 'Prochaines audiences des affaires juridiques', num: { key: 'hearing_days', label: 'Prévenir', suffix: 'jours avant' } },
        { key: 'contrats', label: 'Contrats non signés', desc: 'Biens réservés sans contrat signé' },
        { key: 'stock', label: 'Stock faible', desc: 'Articles sous le seuil', num: { key: 'stock_threshold', label: 'Seuil', suffix: 'unités' } },
    ];
    return (
        <div className="space-y-5">
            <Section title="Alertes de la cloche" desc="Choisissez ce qui apparaît dans la cloche 🔔 et combien de temps à l'avance.">
                <ul className="divide-y divide-slate-100 -my-3">
                    {rows.map(r => (
                        <li key={r.key} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-[220px]">
                                <input type="checkbox" checked={n[r.key]} onChange={e => setN({ ...n, [r.key]: e.target.checked })} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-900" />
                                <span><span className="block text-sm font-medium text-slate-800">{r.label}</span><span className="block text-xs text-slate-500">{r.desc}</span></span>
                            </label>
                            {r.num && (
                                <span className={`flex items-center gap-2 text-sm ${n[r.key] ? 'text-slate-600' : 'text-slate-300'}`}>
                                    {r.num.label}
                                    <input type="number" min={0} disabled={!n[r.key]} value={n[r.num.key]} onChange={e => setN({ ...n, [r.num!.key]: Number(e.target.value) || 0 })}
                                        className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50" />
                                    {r.num.suffix}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </Section>
            <SaveBar saving={saving} dirty={dirty} onSave={async () => {
                if (await saveSection({ notifications: n }, 'Notifications enregistrées')) qc.invalidateQueries({ queryKey: ['notifications'] });
            }} />
        </div>
    );
}

// ── Pages ─────────────────────────────────────────────────────────────────────
function PagesTab({ initial }: { initial: AppSettings }) {
    const [m, setM] = useState(initial.modules);
    const { saving, saveSection } = useSaveSection();
    const dirty = JSON.stringify(m) !== JSON.stringify(initial.modules);
    const groups = [...new Set(MODULES.map(x => x.group))];
    return (
        <div className="space-y-5">
            <p className="text-sm text-slate-500 px-1">Décochez ce que la société n'utilise pas : la page disparaît du menu, de la recherche et des raccourcis. Les données sont conservées et la page revient dès qu'elle est réactivée.</p>
            {groups.map(g => {
                const items = MODULES.filter(x => x.group === g);
                const allOn = items.every(x => m[x.key]);
                return (
                    <Section key={g} title={g} desc={`${items.filter(x => m[x.key]).length} / ${items.length} activés`}>
                        <div className="flex justify-end -mt-2 mb-1">
                            <button type="button" onClick={() => setM({ ...m, ...Object.fromEntries(items.map(x => [x.key, !allOn])) })}
                                className="text-xs font-medium text-slate-500 hover:text-slate-900">
                                {allOn ? 'Tout masquer' : 'Tout afficher'}
                            </button>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                            {items.map(x => (
                                <li key={x.key} className="border-b border-slate-100">
                                    <label className="flex items-center justify-between gap-3 py-2.5 cursor-pointer">
                                        <span className={`text-sm font-medium ${m[x.key] ? 'text-slate-800' : 'text-slate-400'}`}>{x.label}</span>
                                        <input type="checkbox" role="switch" checked={m[x.key]} onChange={e => setM({ ...m, [x.key]: e.target.checked })}
                                            className="peer sr-only" />
                                        <span className="relative w-9 h-5 flex-shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </Section>
                );
            })}
            <SaveBar saving={saving} dirty={dirty} onSave={() => saveSection({ modules: m }, 'Pages enregistrées')} />
        </div>
    );
}

// ── À propos ──────────────────────────────────────────────────────────────────
function AboutTab() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['settings-about'],
        queryFn: () => apiFetch<{ counts: Record<string, number>; database_size: number | null; php_version: string; laravel_version: string; server_time: string }>('/settings/about'),
    });
    const [version, setVersion] = useState<string>('');
    useEffect(() => {
        if (!(window as any).__TAURI_INTERNALS__) { setVersion('navigateur (développement)'); return; }
        import('@tauri-apps/api/app').then(m => m.getVersion()).then(setVersion).catch(() => setVersion('—'));
    }, []);
    const size = (b?: number | null) => (b == null ? '—' : b > 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.round(b / 1024)} Ko`);
    const labels: Record<string, string> = { projets: 'Projets', biens: 'Biens', clients: 'Clients', paiements: 'Paiements', echeances: 'Échéances', taches: 'Tâches', fournisseurs: 'Fournisseurs', documents: 'Fichiers joints' };
    return (
        <div className="space-y-5">
            <Section title="Application" desc="Informations utiles en cas de support.">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div><dt className="text-xs text-slate-500">Version</dt><dd className="mt-0.5 font-medium text-slate-900">{version || '…'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Serveur</dt><dd className="mt-0.5 font-medium text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500' : isLoading ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                        {isError ? 'Hors ligne' : isLoading ? '…' : 'En ligne'}
                    </dd></div>
                    <div><dt className="text-xs text-slate-500">Taille des données</dt><dd className="mt-0.5 font-medium text-slate-900">{size(data?.database_size)}</dd></div>
                    <div><dt className="text-xs text-slate-500">PHP</dt><dd className="mt-0.5 font-medium text-slate-900">{data?.php_version ?? '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Laravel</dt><dd className="mt-0.5 font-medium text-slate-900">{data?.laravel_version ?? '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Heure du serveur</dt><dd className="mt-0.5 font-medium text-slate-900 tabular-nums">{data?.server_time ?? '—'}</dd></div>
                </dl>
            </Section>
            <Section title="Vos données" desc="Nombre d'enregistrements dans la base.">
                {isLoading ? <div className="h-20 rounded-lg bg-slate-100 animate-pulse" /> : (
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(data?.counts ?? {}).map(([k, v]) => (
                            <div key={k} className="rounded-lg ring-1 ring-inset ring-slate-200 px-4 py-3">
                                <dt className="text-xs text-slate-500">{labels[k] ?? k}</dt>
                                <dd className="mt-0.5 text-xl font-semibold text-slate-900 tabular-nums">{v}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </Section>
            <p className="flex items-center gap-2 text-xs text-slate-400"><Server size={13} /> Amical El Ouaha · logiciel de gestion immobilière</p>
        </div>
    );
}
