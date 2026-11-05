// CommandPalette.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Ctrl+K: search everything (clients, biens, projets, factures, fournisseurs,
// pages) and run actions. Also hosts the global keyboard shortcuts.
//
// Mounted once in App.tsx: <CommandPaletteHost /> + useGlobalShortcuts().
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Search, UserPlus, Wallet, Plus, Building2, MapPin, FileText, Truck, Users, CalendarClock,
    Home, BarChart3, History, Scale, HardHat, UserCheck, Wrench, Package, ShoppingCart, Layers,
    WalletCards, Building, Settings2, Keyboard, CornerDownLeft, FileDown, LayoutGrid, Banknote, TrendingUp, FileBarChart, FileSignature, ListTodo, MessagesSquare,
} from 'lucide-react';
import { generateMonthlyReport } from './MonthlyReportButton';
import { openClientDocuments } from './ClientDocuments';
import { openTaskEditor } from './TaskEditor';
import { apiFetch } from '../../lib/api';
import { downloadStatement } from '../../lib/lazyDocs';
import { openQuickPayment, useClientsLite } from './QuickPayment';

// ── store ─────────────────────────────────────────────────────────────────────
type Mode = 'search' | 'shortcuts';
let mode: Mode | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export const openPalette = (m: Mode = 'search') => { mode = m; emit(); };
const closePalette = () => { mode = null; emit(); };
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

// ── shortcuts (single source for the handler and the help screen) ────────────
export const SHORTCUTS: { keys: string[]; label: string }[] = [
    { keys: ['Ctrl', 'K'], label: 'Recherche globale et actions' },
    { keys: ['E'], label: 'Encaisser un paiement' },
    { keys: ['T'], label: 'Nouvelle tâche / rappel' },
    { keys: ['N'], label: 'Nouveau (client, projet, bien… selon la page)' },
    { keys: ['/'], label: 'Aller au champ de recherche de la page' },
    { keys: ['Ctrl', 'S'], label: 'Enregistrer le formulaire ouvert' },
    { keys: ['Échap'], label: 'Fermer la fenêtre ouverte' },
    { keys: ['G', 'H'], label: 'Aller à l’accueil' },
    { keys: ['G', 'D'], label: 'Aller au dashboard' },
    { keys: ['G', 'C'], label: 'Aller aux clients' },
    { keys: ['G', 'B'], label: 'Aller aux biens' },
    { keys: ['G', 'P'], label: 'Aller aux projets' },
    { keys: ['G', 'E'], label: 'Aller à l’échéancier' },
    { keys: ['G', 'T'], label: 'Aller à l’historique' },
    { keys: ['G', 'A'], label: 'Aller aux tâches' },
    { keys: ['?'], label: 'Afficher cette aide' },
];

const GOTO: Record<string, string> = { h: '/home', d: '/dashboard', c: '/clients', b: '/properties', p: '/terrains', e: '/echeancier', t: '/transactions', a: '/taches' };

const PAGES: { label: string; path: string; icon: ComponentType<{ size?: number }> }[] = [
    { label: 'Accueil', path: '/home', icon: Home },
    { label: 'Tâches', path: '/taches', icon: ListTodo },
    { label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { label: 'Historique / Livre de caisse', path: '/transactions', icon: History },
    { label: 'Échéancier', path: '/echeancier', icon: CalendarClock },
    { label: 'Chèques clients', path: '/cheques', icon: Banknote },
    { label: 'Messages WhatsApp (envoi groupé, modèles)', path: '/messages', icon: MessagesSquare },
    { label: 'Rentabilité par projet', path: '/rentabilite', icon: TrendingUp },
    { label: 'Disponibilités (grille des biens)', path: '/disponibilites', icon: LayoutGrid },
    { label: 'Projets', path: '/terrains', icon: MapPin },
    { label: 'Biens', path: '/properties', icon: Building2 },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Affaires juridiques', path: '/contentieux', icon: Scale },
    { label: 'Construction', path: '/contractors', icon: HardHat },
    { label: 'Intervenants', path: '/intervenants', icon: Users },
    { label: 'Ouvriers', path: '/workers', icon: UserCheck },
    { label: 'Salariés', path: '/salaries', icon: Users },
    { label: 'Travaux généraux', path: '/travaux', icon: Wrench },
    { label: 'Catalogue articles', path: '/articles', icon: Package },
    { label: 'Fournisseurs', path: '/suppliers', icon: Truck },
    { label: 'Achats / Entrées', path: '/achats', icon: ShoppingCart },
    { label: 'Inventaire stock', path: '/stock', icon: Layers },
    { label: 'Charges', path: '/charges', icon: WalletCards },
    { label: 'Sociétés de services', path: '/services-tiers', icon: Building },
    { label: 'Factures', path: '/factures-list', icon: FileText },
    { label: 'Paramètres (société, logo, préférences, IA)', path: '/parametres', icon: Settings2 },
    { label: 'Configuration des prix', path: '/parametres?tab=prix', icon: Settings2 },
    { label: 'Sauvegarde / restauration des données', path: '/parametres?tab=donnees', icon: Settings2 },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const matches = (hay: string, q: string) => q.split(/\s+/).filter(Boolean).every(w => hay.includes(w));
const isTyping = (el: EventTarget | null) => {
    const t = el as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};
const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || getComputedStyle(el).position === 'fixed';
/** Topmost open modal overlay (fixed full-screen layer), if any. */
const topOverlay = () => {
    const list = Array.from(document.querySelectorAll<HTMLElement>('div.fixed.inset-0'))
        .filter(el => visible(el) && el.children.length > 0)
        .map((el, i) => ({ el, i, z: Number(getComputedStyle(el).zIndex) || 0 }));
    // highest stacking order wins; for equal z-index, the later one in the page is on top
    list.sort((a, b) => a.z - b.z || a.i - b.i);
    return list[list.length - 1]?.el;
};

type Item = {
    id: string; group: string; title: string; subtitle?: string;
    icon: ComponentType<{ size?: number }>; run: () => void;
    secondary?: { label: string; run: () => void }[];
};

// ── host ──────────────────────────────────────────────────────────────────────
export function CommandPaletteHost() {
    const m = useSyncExternalStore(subscribe, () => mode);
    if (!m) return null;
    return <Palette initialMode={m} />;
}

function Palette({ initialMode }: { initialMode: Mode }) {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [view, setView] = useState<Mode>(initialMode);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const opts = { staleTime: 60_000 };
    const clients = useClientsLite();
    const biens = useQuery({ queryKey: ['palette-biens'], queryFn: () => apiFetch<any[]>('/biens'), ...opts });
    const terrains = useQuery({ queryKey: ['palette-terrains'], queryFn: () => apiFetch<any[]>('/terrains'), ...opts });
    const factures = useQuery({ queryKey: ['palette-factures'], queryFn: () => apiFetch<any>('/factures'), ...opts });
    const suppliers = useQuery({ queryKey: ['palette-suppliers'], queryFn: () => apiFetch<any[]>('/suppliers'), ...opts });

    useEffect(() => { inputRef.current?.focus(); }, [view]);

    const go = (path: string) => { closePalette(); navigate(path); };

    const items: Item[] = useMemo(() => {
        const query = norm(q.trim());
        const out: Item[] = [];
        const push = (group: string, list: Item[], limit = 5) => out.push(...list.slice(0, limit).map(i => ({ ...i, group })));

        const actions: Item[] = [
            { id: 'a-pay', group: '', title: 'Encaisser un paiement', subtitle: 'E', icon: Wallet, run: () => { closePalette(); openQuickPayment(); } },
            { id: 'a-task', group: '', title: 'Nouvelle tâche / rappel', subtitle: 'T', icon: ListTodo, run: () => { closePalette(); openTaskEditor(); } },
            { id: 'a-client', group: '', title: 'Nouveau client', icon: UserPlus, run: () => go('/add-client') },
            { id: 'a-projet', group: '', title: 'Nouveau projet', icon: Plus, run: () => go('/add-terrain') },
            { id: 'a-bien', group: '', title: 'Nouveau bien', icon: Building2, run: () => go('/add-property') },
            { id: 'a-facture', group: '', title: 'Nouvelle facture', icon: FileText, run: () => go('/factures') },
            { id: 'a-ech', group: '', title: 'Échéancier et retards de paiement', icon: CalendarClock, run: () => go('/echeancier') },
            { id: 'a-report', group: '', title: 'Rapport mensuel (PDF, mois en cours)', icon: FileBarChart, run: () => { closePalette(); generateMonthlyReport(); } },
            { id: 'a-dispo', group: '', title: 'Disponibilités des biens', icon: LayoutGrid, run: () => go('/disponibilites') },
            { id: 'a-bulk', group: '', title: 'Envoi groupé WhatsApp', icon: MessagesSquare, run: () => go('/messages') },
            { id: 'a-keys', group: '', title: 'Raccourcis clavier', subtitle: '?', icon: Keyboard, run: () => { setView('shortcuts'); } },
        ];
        push('Actions', query ? actions.filter(a => matches(norm(a.title), query)) : actions, query ? 4 : 11);
        if (!query) return out;

        push('Clients', (clients.data ?? [])
            .filter(c => matches(norm(`${c.prenom} ${c.nom} ${c.cin} ${c.tel}`), query))
            .map(c => ({
                id: `c-${c.id}`, group: '', icon: Users,
                title: `${c.prenom} ${c.nom}`,
                subtitle: [c.cin?.toUpperCase(), c.tel].filter(Boolean).join(' · '),
                run: () => go(`/clients?search=${encodeURIComponent(c.cin || c.nom)}`),
                secondary: [
                    { label: 'Encaisser', run: () => { closePalette(); openQuickPayment({ clientId: c.id }); } },
                    { label: 'Relevé PDF', run: () => { closePalette(); toast.promise(downloadStatement(c.id), { loading: 'Génération du relevé…', success: 'Relevé téléchargé', error: (e: Error) => e.message }); } },
                    { label: 'Documents', run: () => { closePalette(); openClientDocuments(c.id); } },
                    { label: 'Tâche', run: () => { closePalette(); openTaskEditor({ clientId: c.id }); } },
                ],
            })));
        push('Biens', (biens.data ?? [])
            .filter(b => matches(norm(`${b.type_bien} ${b.num_appartement} ${b.nom} ${b.immeuble} ${b.terrain?.nom_projet} ${b.statut}`), query))
            .map(b => ({
                id: `b-${b.id}`, group: '', icon: Building2,
                title: `${b.type_bien ?? 'Bien'} ${b.num_appartement || b.nom || ''}`.trim(),
                subtitle: [b.terrain?.nom_projet, b.statut, b.surface_m2 ? `${b.surface_m2} m²` : ''].filter(Boolean).join(' · '),
                run: () => go(`/properties?search=${encodeURIComponent(b.num_appartement || b.nom || '')}`),
            })));
        push('Projets', (terrains.data ?? [])
            .filter(t => matches(norm(`${t.nom_projet} ${t.nom_terrain} ${t.numero_TF}`), query))
            .map(t => ({
                id: `t-${t.id}`, group: '', icon: MapPin,
                title: t.nom_projet || t.nom_terrain || `Projet #${t.id}`,
                subtitle: t.numero_TF ? `TF ${t.numero_TF}` : undefined,
                run: () => go(`/terrains?search=${encodeURIComponent(t.nom_projet || t.nom_terrain || '')}`),
            })));
        const facts: any[] = Array.isArray(factures.data) ? factures.data : (factures.data?.data ?? []);
        push('Factures', facts
            .filter(f => matches(norm(`${f.invoice_no} ${f.client_name} ${f.supplier_name}`), query))
            .map(f => ({
                id: `f-${f.id}`, group: '', icon: FileText,
                title: f.invoice_no || `Facture #${f.id}`,
                subtitle: [f.client_name, f.date].filter(Boolean).join(' · '),
                run: () => go(`/factures-list?search=${encodeURIComponent(f.invoice_no || '')}`),
            })));
        push('Fournisseurs', (suppliers.data ?? [])
            .filter(s => matches(norm(`${s.nom_societe} ${s.nom_gerant} ${s.tel} ${s.ice}`), query))
            .map(s => ({
                id: `s-${s.id}`, group: '', icon: Truck,
                title: s.nom_societe, subtitle: [s.nom_gerant, s.tel].filter(Boolean).join(' · '),
                run: () => go(`/suppliers?search=${encodeURIComponent(s.nom_societe || '')}`),
            })));
        push('Pages', PAGES.filter(p => matches(norm(p.label), query)).map(p => ({
            id: `p-${p.path}`, group: '', icon: p.icon, title: p.label, run: () => go(p.path),
        })), 4);
        return out;
    }, [q, clients.data, biens.data, terrains.data, factures.data, suppliers.data]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { setActive(0); }, [q]);
    useEffect(() => {
        listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (view === 'shortcuts' && initialMode === 'search') setView('search'); else closePalette(); return; }
        if (view !== 'search') return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const it = items[active];
            if (!it) return;
            if ((e.ctrlKey || e.metaKey) && it.secondary?.[0]) it.secondary[0].run(); else it.run();
        }
    };

    const loading = [clients, biens, terrains, factures, suppliers].some(x => x.isLoading) && q.trim().length > 0;

    return (
        <div className="fixed inset-0 z-[950] flex items-start justify-center p-4 pt-[12vh] bg-slate-950/40 animate-fade-in"
            onMouseDown={e => { if (e.target === e.currentTarget) closePalette(); }} onKeyDown={onKey}>
            <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden animate-dialog-in">
                {view === 'search' ? (
                    <>
                        <div className="flex items-center gap-3 px-4 border-b border-slate-200">
                            <Search size={17} className="text-slate-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Rechercher un client, CIN, bien, projet, facture… ou une action"
                                className="flex-1 h-12 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 outline-none"
                            />
                            <kbd className="hidden sm:inline text-[11px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">Échap</kbd>
                        </div>
                        <div ref={listRef} className="max-h-[56vh] overflow-y-auto py-2">
                            {items.length === 0 && (
                                <p className="px-4 py-8 text-center text-sm text-slate-400">{loading ? 'Recherche…' : 'Aucun résultat'}</p>
                            )}
                            {items.map((it, i) => (
                                <div key={it.id}>
                                    {(i === 0 || items[i - 1].group !== it.group) && (
                                        <p className="px-4 pt-2 pb-1 text-[11px] font-medium text-slate-400">{it.group}</p>
                                    )}
                                    <div
                                        data-idx={i}
                                        onMouseMove={() => setActive(i)}
                                        onClick={() => it.run()}
                                        className={`mx-2 px-2.5 py-2 rounded-lg flex items-center gap-3 cursor-pointer ${active === i ? 'bg-slate-100' : ''}`}
                                    >
                                        <span className="text-slate-400 flex-shrink-0"><it.icon size={16} /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm text-slate-900 truncate capitalize">{it.title}</span>
                                            {it.subtitle && <span className="block text-xs text-slate-500 truncate">{it.subtitle}</span>}
                                        </span>
                                        {it.secondary && active === i && (
                                            <span className="flex gap-1">
                                                {it.secondary.map(s => (
                                                    <button key={s.label} onClick={e => { e.stopPropagation(); s.run(); }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                                                        {s.label === 'Relevé PDF' ? <FileDown size={12} /> : s.label === 'Documents' ? <FileSignature size={12} /> : s.label === 'Tâche' ? <ListTodo size={12} /> : <Wallet size={12} />}{s.label}
                                                    </button>
                                                ))}
                                            </span>
                                        )}
                                        {active === i && !it.secondary && <CornerDownLeft size={14} className="text-slate-400" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
                            <span>↑↓ naviguer</span><span>Entrée ouvrir</span><span>Ctrl+Entrée encaisser (client)</span>
                            <button onClick={() => setView('shortcuts')} className="ml-auto hover:text-slate-700">Raccourcis ?</button>
                        </div>
                    </>
                ) : (
                    <div tabIndex={-1} ref={el => el?.focus()} className="outline-none">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-900">Raccourcis clavier</h3>
                            <kbd className="text-[11px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">Échap</kbd>
                        </div>
                        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                            {SHORTCUTS.map(s => (
                                <li key={s.label} className="flex items-center justify-between px-5 py-2.5 text-sm">
                                    <span className="text-slate-700">{s.label}</span>
                                    <span className="flex items-center gap-1">
                                        {s.keys.map((k, i) => (
                                            <span key={i} className="flex items-center gap-1">
                                                {i > 0 && <span className="text-xs text-slate-300">{s.keys[0] === 'G' ? 'puis' : '+'}</span>}
                                                <kbd className="min-w-6 text-center text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{k}</kbd>
                                            </span>
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── global shortcuts ──────────────────────────────────────────────────────────
export function useGlobalShortcuts(enabled: boolean) {
    const navigate = useNavigate();
    useEffect(() => {
        if (!enabled) return;
        let gPending = 0;

        const handler = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const mod = e.ctrlKey || e.metaKey;

            // Ctrl+K — palette (works even while typing)
            if (mod && key === 'k') { e.preventDefault(); mode ? closePalette() : openPalette(); return; }
            if (mode) return; // palette handles its own keys

            // A confirmation dialog handles its own keys
            if (document.querySelector('[role="alertdialog"]')) return;

            // Ctrl+S / Ctrl+Enter — submit the open form (modal first, then page)
            if (mod && (key === 's' || key === 'enter')) {
                const scope = topOverlay() ?? document.querySelector('main');
                const form = scope?.querySelector('form') as HTMLFormElement | null;
                if (form) { e.preventDefault(); form.requestSubmit(); }
                else if (key === 's') e.preventDefault();
                return;
            }

            // Esc — close the topmost modal
            if (key === 'escape') {
                const ov = topOverlay();
                if (!ov) return;
                const btns = Array.from(ov.querySelectorAll('button'));
                const closeBtn = btns.find(b => /fermer|close/i.test(b.title || b.getAttribute('aria-label') || ''))
                    ?? btns.find(b => b.querySelector('svg.lucide-x'))
                    ?? btns.find(b => /^\s*(annuler|fermer)\s*$/i.test(b.textContent || ''));
                if (closeBtn) { e.preventDefault(); closeBtn.click(); }
                return;
            }

            if (mod || e.altKey || isTyping(e.target)) return;
            if (topOverlay()) return; // single-key shortcuts only on the page itself

            // G then letter — go to page
            if (gPending && Date.now() - gPending < 1200 && GOTO[key]) { e.preventDefault(); gPending = 0; navigate(GOTO[key]); return; }
            gPending = key === 'g' ? Date.now() : 0;
            if (key === 'g') return;

            if (e.key === '?') { e.preventDefault(); openPalette('shortcuts'); return; }
            if (key === 'e') { e.preventDefault(); openQuickPayment(); return; }
            if (key === 't') { e.preventDefault(); openTaskEditor(); return; }
            if (key === '/') {
                const input = Array.from(document.querySelectorAll<HTMLInputElement>('main input'))
                    .find(i => visible(i) && /rech|search/i.test(i.placeholder || ''))
                    ?? Array.from(document.querySelectorAll<HTMLInputElement>('main input[type="text"], main input:not([type])')).find(visible);
                if (input) { e.preventDefault(); input.focus(); input.select(); }
                return;
            }
            if (key === 'n') {
                const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('main button'))
                    .find(b => visible(b) && /^\s*(\+\s*)?(nouveau|nouvelle|ajouter)\b/i.test(b.textContent || ''));
                if (btn) { e.preventDefault(); btn.click(); }
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled, navigate]);
}
