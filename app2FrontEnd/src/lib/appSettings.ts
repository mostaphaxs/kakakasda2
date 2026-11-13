// appSettings.ts — Paramètres (company identity, preferences, AI), loaded once
// and cached so non-React code (PDFs, AI, messages) can read them synchronously.

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, STORAGE_BASE } from './api';

export interface CompanySettings {
    name: string; tagline: string; legal_form: string; address: string; city: string;
    phone: string; email: string; website: string; ice: string; rc: string; if: string;
    patente: string; cnss: string; capital: string; logo_path: string | null;
    manager_name: string; manager_title: string; bank_name: string; bank_agency: string; rib: string; stamp_path: string | null;
}
export interface DocumentSettings {
    receipt_prefix: string; receipt_note: string; show_stamp: boolean; show_bank_on_statement: boolean;
    penalty_percent: number; notice_days: number; delivery_months: string | number; extra_clause: string;
}
export interface NotificationSettings {
    echeances: boolean; cheques: boolean; contrats: boolean; stock: boolean; audiences: boolean; taches: boolean;
    upcoming_days: number; cheque_days: number; hearing_days: number; stock_threshold: number;
}
export interface PreferenceSettings {
    owner_name: string; signing_city: string; whatsapp_lang: 'fr' | 'ar';
    text_scale: 'petit' | 'normal' | 'grand'; hide_amounts_default: boolean;
}
export interface AiSettings { gemini_key: string; model_text: string; model_vision: string }

// ── Pages & modules (Paramètres → Pages): a company can switch off what it doesn't use ──
export const MODULES = [
    { key: 'taches', label: 'Tâches', group: 'Général', paths: ['/taches'] },
    { key: 'dashboard', label: 'Dashboard', group: 'Général', paths: ['/dashboard'] },
    { key: 'transactions', label: 'Historique', group: 'Général', paths: ['/transactions'] },
    { key: 'notifications', label: 'Cloche de notifications', group: 'Général', paths: [] },
    { key: 'assistant', label: 'Assistant IA', group: 'Général', paths: [] },
    { key: 'terrains', label: 'Projets', group: 'Immobilier', paths: ['/terrains', '/add-terrain', '/edit-terrain', '/terrain-map'] },
    { key: 'properties', label: 'Biens', group: 'Immobilier', paths: ['/properties', '/add-property', '/edit-property'] },
    { key: 'disponibilites', label: 'Disponibilités', group: 'Immobilier', paths: ['/disponibilites'] },
    { key: 'clients', label: 'Clients', group: 'Immobilier', paths: ['/clients', '/add-client'] },
    { key: 'echeancier', label: 'Échéancier', group: 'Immobilier', paths: ['/echeancier'] },
    { key: 'messages', label: 'Messages WhatsApp', group: 'Immobilier', paths: ['/messages'] },
    { key: 'contentieux', label: 'Affaires Juridiques', group: 'Immobilier', paths: ['/contentieux'] },
    { key: 'contractors', label: 'Construction', group: 'Chantier & Équipes', paths: ['/contractors'] },
    { key: 'intervenants', label: 'Intervenants', group: 'Chantier & Équipes', paths: ['/intervenants'] },
    { key: 'workers', label: 'Gestion Ouvriers', group: 'Chantier & Équipes', paths: ['/workers'] },
    { key: 'salaries', label: 'Gestion Salariés', group: 'Chantier & Équipes', paths: ['/salaries'] },
    { key: 'travaux', label: 'Travaux Généraux', group: 'Chantier & Équipes', paths: ['/travaux', '/add-travaux'] },
    { key: 'articles', label: 'Catalogue Articles', group: 'Achats & Stock', paths: ['/articles', '/add-article'] },
    { key: 'suppliers', label: 'Fournisseurs', group: 'Achats & Stock', paths: ['/suppliers', '/add-supplier'] },
    { key: 'achats', label: 'Achats / Entrées', group: 'Achats & Stock', paths: ['/achats', '/add-achat'] },
    { key: 'stock_exit', label: 'Sortie Stock', group: 'Achats & Stock', paths: ['/add-stock-exit'] },
    { key: 'stock', label: 'Inventaire Stock', group: 'Achats & Stock', paths: ['/stock'] },
    { key: 'cheques', label: 'Chèques clients', group: 'Finance', paths: ['/cheques'] },
    { key: 'rentabilite', label: 'Rentabilité', group: 'Finance', paths: ['/rentabilite'] },
    { key: 'charges', label: 'Charges', group: 'Finance', paths: ['/charges'] },
    { key: 'services_tiers', label: 'Sociétés Services', group: 'Finance', paths: ['/services-tiers'] },
    { key: 'factures', label: 'Factures', group: 'Finance', paths: ['/factures', '/factures-list'] },
] as const;
export type ModuleKey = typeof MODULES[number]['key'];
export type ModuleSettings = Record<ModuleKey, boolean>;

export interface AppSettings {
    company: CompanySettings; preferences: PreferenceSettings; documents: DocumentSettings;
    notifications: NotificationSettings; ai: AiSettings; modules: ModuleSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
    company: {
        name: 'Amical El Ouaha', tagline: 'Promotion Immobilière & Travaux Divers', legal_form: 'S.A.R.L',
        address: '', city: 'Casablanca', phone: '', email: '', website: '', ice: '', rc: '', if: '',
        patente: '', cnss: '', capital: '', logo_path: null,
        manager_name: '', manager_title: 'Gérant', bank_name: '', bank_agency: '', rib: '', stamp_path: null,
    },
    documents: {
        receipt_prefix: 'R-', receipt_note: '', show_stamp: true, show_bank_on_statement: true,
        penalty_percent: 10, notice_days: 15, delivery_months: '', extra_clause: '',
    },
    notifications: {
        echeances: true, cheques: true, contrats: true, stock: true, audiences: true, taches: true,
        upcoming_days: 7, cheque_days: 7, hearing_days: 14, stock_threshold: 10,
    },
    preferences: { owner_name: 'M. Aziz', signing_city: 'Casablanca', whatsapp_lang: 'fr', text_scale: 'normal', hide_amounts_default: true },
    ai: { gemini_key: '', model_text: '', model_vision: '' },
    modules: Object.fromEntries(MODULES.map(m => [m.key, true])) as ModuleSettings,
};

const CACHE_KEY = 'app-settings';

/** Section with defaults; null values (Laravel stores empty text as null) fall back to the default. */
function section<T extends object>(def: T, saved?: Partial<T> | null): T {
    const out = { ...def } as Record<string, unknown>;
    Object.entries(saved ?? {}).forEach(([k, v]) => {
        if (v !== null && v !== undefined) out[k] = v;
    });
    return out as T;
}

function merge(s: Partial<AppSettings>): AppSettings {
    return {
        company: section(DEFAULT_SETTINGS.company, s.company),
        preferences: section(DEFAULT_SETTINGS.preferences, s.preferences),
        documents: section(DEFAULT_SETTINGS.documents, s.documents),
        notifications: section(DEFAULT_SETTINGS.notifications, s.notifications),
        ai: section(DEFAULT_SETTINGS.ai, s.ai),
        modules: section(DEFAULT_SETTINGS.modules, s.modules),
    };
}

function readCache(): AppSettings {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        return merge(JSON.parse(raw));
    } catch { return DEFAULT_SETTINGS; }
}

let current: AppSettings = readCache();

/** Latest known settings (synchronous; safe anywhere). */
export const getAppSettings = () => current;

/** Is this feature switched on in Paramètres → Pages? */
export const isModuleEnabled = (key: ModuleKey, s = current) => s.modules[key] !== false;

/** False when the page at `path` belongs to a module that was switched off. */
export function isPathEnabled(path: string, s = current) {
    const clean = path.split('?')[0];
    const m = MODULES.find(mod => mod.paths.some(p => clean === p || clean.startsWith(p + '/')));
    return !m || isModuleEnabled(m.key, s);
}

export function setAppSettings(s: AppSettings) {
    current = merge(s);
    // keep the AI key out of the plain cache used before login
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...current, ai: { ...current.ai, gemini_key: current.ai.gemini_key ? '•' : '' } })); } catch { /* ignore */ }
    applyTextScale(current.preferences.text_scale);
    imageCache = {};
}

const SCALE: Record<PreferenceSettings['text_scale'], string> = { petit: '0.8', normal: '0.88', grand: '1' };
export function applyTextScale(scale: PreferenceSettings['text_scale']) {
    document.documentElement.style.setProperty('--text-scale', SCALE[scale] ?? '0.88');
}
applyTextScale(current.preferences.text_scale);

export const logoUrl = (s = current) => (s.company.logo_path ? `${STORAGE_BASE}/${s.company.logo_path}` : null);
export const stampUrl = (s = current) => (s.company.stamp_path ? `${STORAGE_BASE}/${s.company.stamp_path}` : null);

/** Loads settings from the backend (once logged in) and keeps the cache fresh. */
export function useAppSettings(enabled = true) {
    const q = useQuery({
        queryKey: ['app-settings'],
        queryFn: () => apiFetch<AppSettings>('/settings/app'),
        staleTime: 5 * 60_000,
        enabled,
    });
    useEffect(() => { if (q.data) setAppSettings(q.data); }, [q.data]);
    return { ...q, settings: q.data ? merge(q.data) : current };
}

// ── images for PDFs (jsPDF needs PNG data URLs) ───────────────────────────────
type PdfImage = { dataUrl: string; w: number; h: number };
let imageCache: Partial<Record<'logo' | 'stamp', PdfImage | null>> = {};

async function loadPdfImage(url: string | null): Promise<PdfImage | null> {
    if (!url) return null;
    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await img.decode();
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
    } catch {
        return null;
    }
}

export async function getLogoForPdf(): Promise<PdfImage | null> {
    if (imageCache.logo === undefined) imageCache.logo = await loadPdfImage(logoUrl());
    return imageCache.logo;
}
export async function getStampForPdf(): Promise<PdfImage | null> {
    if (imageCache.stamp === undefined) imageCache.stamp = await loadPdfImage(stampUrl());
    return imageCache.stamp;
}
