import React, { useState, useRef, useEffect } from 'react';
import {
    Menu, X, Building2, LogOut, ChevronDown,
    Home, MapPin, UserPlus, WalletCards, HardHat,
    Users, Layers, Download, Database, Package,
    ShoppingCart, Truck, Wrench, Settings2, FileText,
    ChevronRight, BarChart3, UserCheck, History, Scale, Building, CalendarClock, Search, LayoutGrid, Banknote, TrendingUp, ListTodo, MessagesSquare
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { toast } from 'react-hot-toast';
import NotificationBell from './common/NotificationBell';
import { clientPaid, clientPrice } from '../lib/clientBalance';
import { openPalette } from './common/CommandPalette';
import { parseDate } from '../lib/utils';
import { useAppSettings, isPathEnabled, isModuleEnabled } from '../lib/appSettings';
import { useQuery } from '@tanstack/react-query';
import { useActiveProject, setActiveProject } from '../lib/activeProject';

interface NavItem {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    path: string;
}

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}


const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
    });
    useEffect(() => {
        try { localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0'); } catch { /* ignore */ }
    }, [isCollapsed]);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');
    const { settings } = useAppSettings(!!token);
    const showBell = isModuleEnabled('notifications', settings);

    // Projet actif — every page with a project filter follows this choice
    const activeProject = useActiveProject();
    const projectsQ = useQuery({
        queryKey: ['palette-terrains'],
        queryFn: () => apiFetch<{ id: number; nom_projet?: string; nom_terrain?: string }[]>('/terrains'),
        staleTime: 60_000, enabled: !!token,
    });
    const projects = projectsQ.data ?? [];
    const projectName = (t: { id: number; nom_projet?: string; nom_terrain?: string }) => t.nom_projet || t.nom_terrain || `Projet #${t.id}`;
    useEffect(() => {
        if (!activeProject || !projectsQ.data) return;
        const t = projectsQ.data.find(x => x.id === activeProject.id);
        setActiveProject(t ? { id: t.id, name: projectName(t) } : null); // renamed or deleted project
    }, [projectsQ.data, activeProject]);

    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // Sync user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { console.error("Failed to parse user", e); }
        }
    }, [token]);

    // Sync layout margin
    useEffect(() => {
        const updateMargin = () => {
            if (token && window.innerWidth >= 1024) {
                document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '260px');
            } else {
                document.documentElement.style.setProperty('--sidebar-width', '0px');
            }
        };

        updateMargin();
        window.addEventListener('resize', updateMargin);
        return () => window.removeEventListener('resize', updateMargin);
    }, [isCollapsed, token]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) setIsExportOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        const collapsedPref = localStorage.getItem('sidebarCollapsed');
        localStorage.clear();
        if (collapsedPref) localStorage.setItem('sidebarCollapsed', collapsedPref);
        setUser(null);
        navigate('/login');
        window.location.reload();
    };


    const allNavGroups: { title: string; items: NavItem[] }[] = [
        {
            title: 'Général',
            items: [
                { icon: Home, label: 'Accueil', path: '/home' },
                { icon: ListTodo, label: 'Tâches', path: '/taches' },
                { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
                { icon: History, label: 'Historique', path: '/transactions' },
            ],
        },
        {
            title: 'Immobilier',
            items: [
                { icon: MapPin, label: 'Projets', path: '/terrains' },
                { icon: Building2, label: 'Biens', path: '/properties' },
                { icon: LayoutGrid, label: 'Disponibilités', path: '/disponibilites' },
                { icon: UserPlus, label: 'Clients', path: '/clients' },
                { icon: CalendarClock, label: 'Échéancier', path: '/echeancier' },
                { icon: MessagesSquare, label: 'Messages WhatsApp', path: '/messages' },
                { icon: Scale, label: 'Affaires Juridiques', path: '/contentieux' },
            ],
        },
        {
            title: 'Chantier & Équipes',
            items: [
                { icon: HardHat, label: 'Construction', path: '/contractors' },
                { icon: Users, label: 'Intervenants', path: '/intervenants' },
                { icon: UserCheck, label: 'Gestion Ouvriers', path: '/workers' },
                { icon: Users, label: 'Gestion Salariés', path: '/salaries' },
                { icon: Wrench, label: 'Travaux Généraux', path: '/travaux' },
            ],
        },
        {
            title: 'Achats & Stock',
            items: [
                { icon: Package, label: 'Catalogue Articles', path: '/articles' },
                { icon: Truck, label: 'Fournisseurs', path: '/suppliers' },
                { icon: ShoppingCart, label: 'Achats / Entrées', path: '/achats' },
                { icon: LogOut, label: 'Sortie Stock', path: '/add-stock-exit' },
                { icon: Layers, label: 'Inventaire Stock', path: '/stock' },
            ],
        },
        {
            title: 'Finance',
            items: [
                { icon: Banknote, label: 'Chèques clients', path: '/cheques' },
                { icon: TrendingUp, label: 'Rentabilité', path: '/rentabilite' },
                { icon: WalletCards, label: 'Charges', path: '/charges' },
                { icon: Building, label: 'Sociétés Services', path: '/services-tiers' },
                { icon: FileText, label: 'Liste Factures', path: '/factures-list' },
            ],
        },
    ];
    // pages switched off in Paramètres → Pages disappear from the menu
    const navGroups = allNavGroups
        .map(g => ({ ...g, items: g.items.filter(i => isPathEnabled(i.path, settings)) }))
        .filter(g => g.items.length > 0);

    const exportItems = [
        { label: 'Toute la base de données', endpoint: 'all', fileName: 'database_complet', icon: Database },
        { label: 'Tous les Projets', endpoint: '/terrains', fileName: 'terrains_complet' },
        { label: 'Tous les Biens', endpoint: '/biens', fileName: 'biens_complet' },
        { label: 'Tous les Clients', endpoint: '/clients', fileName: 'clients_complet' },
        { label: 'Intervenants', endpoint: '/intervenants', fileName: 'intervenants_complet' },
        { label: 'Construction', endpoint: '/contractors', fileName: 'entreprises_complet' },
        { label: 'Salariés', endpoint: '/salaries', fileName: 'salaries_complet' },
        { label: 'Charges', endpoint: '/charges', fileName: 'charges_complet' },
    ];

    const mapExportData = (endpoint: string, data: any[]) => {
        switch (endpoint) {
            case '/terrains':
                return data.map(t => ({
                    'ID': t.id, 'NOM DU PROJET': t.nom_projet?.toUpperCase() || `PROJET #${t.id}`,
                    'NUMÉRO TF': t.numero_TF || 'N/A', 'PRIX ACHAT (DH)': t.cout_global || 0,
                    'FRAIS ENREG. (DH)': t.frais_enregistrement || 0, 'FRAIS IMMAT. (DH)': t.frais_immatriculation || 0,
                    'FRAIS NOTAIRE (DH)': t.honoraires_notaire || 0, 'TOTAL INVESTI (DH)': t.total || 0,
                    'DATE ACQUISITION': t.created_at ? parseDate(t.created_at).toLocaleDateString('fr-MA') : 'N/A',
                    "F. Construction (DH)": t.autorisation_construction || 0,
                    "F. d'equipement (DH)": t.autorisation_equipement || 0, "F. Pompier (DH)": t.frais_pompier || 0,
                }));
            case '/biens':
                return data.map(b => ({
                    'ID': b.id, 'RÉF BLOC': b.num_appartement?.toUpperCase(), 'CATÉGORIE': b.type_bien?.toUpperCase(),
                    'PROJET ID': b.terrain_id, 'ÉTAGE': b.etage || 'RDC', 'SURFACE (M²)': b.surface_m2,
                    'PRIX DE VENTE (DH)': b.prix_global, 'STATUT ACTUEL': b.statut?.toUpperCase(), 'OBSERVATIONS': b.description || ''
                }));
            case '/clients':
                return data.map(c => {
                    // same rule as every other screen (server balance when available)
                    const prixGlobal = clientPrice(c);
                    const totalVerse = clientPaid(c);
                    return {
                        'ID': c.id, 'CLIENT NOM': c.nom?.toUpperCase(), 'CLIENT PRÉNOM': c.prenom?.toUpperCase(),
                        'TEL': c.tel, 'CIN': c.cin?.toUpperCase(),
                        'DATE SIGNATURE': c.date_reservation ? parseDate(c.date_reservation).toLocaleDateString('fr-MA') : 'N/A',
                        'BIEN ASSIGNÉ': c.biens?.[0]?.type_bien || 'N/A', 'BLOC': c.biens?.[0]?.num_appartement || 'N/A',
                        'PRIX VENTE (DH)': prixGlobal, 'TOTAL VERSÉ (DH)': totalVerse,
                        'SOLDE RESTANT (DH)': Math.max(0, prixGlobal - totalVerse),
                        'NB PAIEMENTS': c.payments?.length || 0, 'STATUT DOSSIER': c.biens?.[0]?.statut || 'EN ATTENTE'
                    };
                });
            case '/intervenants':
            case '/contractors':
                return data.map(i => {
                    const totalVerse = i.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                    return {
                        'ID': i.id, 'MODULE': endpoint.includes('contractor') ? 'CONSTRUCTION' : 'INTERVENANT',
                        'CATÉGORIE': i.categorie?.toUpperCase(), 'SOCIÉTÉ': i.nom_societe?.toUpperCase(),
                        'GÉRANT': i.nom_gerant?.toUpperCase(), 'TÉLÉPHONE': i.tel,
                        'PROJET LIÉ': i.terrain?.nom_projet || 'N/A', 'MARCHÉ GLOBAL (DH)': i.montant_global,
                        'TOTAL PAYÉ (DH)': totalVerse, 'RESTE À PAYER (DH)': Math.max(0, i.montant_global - totalVerse),
                        'IDENTIFIANT FISCAL': i.if || '', 'ICE': i.ice || '', 'RC': i.rc || ''
                    };
                });
            case '/charges':
                return data.map(c => {
                    const totalMois = Number(c.frais_tel) + Number(c.internet) + Number(c.loyer_bureau) +
                        Number(c.fournitures_bureau) + Number(c.employes_bureau) + Number(c.impots) + Number(c.gasoil);
                    return {
                        'ID': c.id, 'MOIS / PÉRIODE': parseDate(c.periode).toLocaleDateString('fr-MA').toUpperCase(),
                        'TOTAL GÉNÉRAL (DH)': totalMois, 'LOYER (DH)': c.loyer_bureau, 'SALAIRES (DH)': c.employes_bureau,
                        'FOURNITURES (DH)': c.fournitures_bureau,
                        'COMMUNICATIONS (DH)': Number(c.frais_tel) + Number(c.internet), 'LOGISTIQUE (DH)': c.gasoil,
                        'IMPÔTS & TAXES (DH)': c.impots, 'AFFECTATION': c.terrain?.nom_projet || 'FRAIS GÉNÉRAUX'
                    };
                });
            case '/salaries':
                return data.map(s => ({
                    'ID': s.id, 'NOM': s.name.toUpperCase(), 'CIN': s.cin || '',
                    'TÉL': s.phone || '', 'SPÉCIALITÉ': s.speciality,
                    'GRADE': s.grade || '', 'FORMATION': s.education || '',
                    'SALAIRE (DH)': s.monthly_salary, 'DATE EMBAUCHE': s.hiring_date
                }));
            default:
                return data;
        }
    };

    const handleGlobalExport = async (item: typeof exportItems[0]) => {
        const toastId = 'export-status';
        try {
            const { exportToExcel, exportMultiSheetToExcel } = await import('../lib/excel'); // loaded on demand
            toast.loading(`Préparation de l'export ${item.label}...`, { id: toastId });
            if (item.endpoint === 'all') {
                const endpoints = exportItems.filter(i => i.endpoint !== 'all');
                const results = await Promise.all(
                    endpoints.map(async (i) => {
                        try {
                            const data: any = await apiFetch(i.endpoint);
                            const rawData = Array.isArray(data) ? data : (data.data || []);
                            return { label: i.label, sheetName: i.label.replace('Tous les ', '').replace('Tous ', '').substring(0, 30), data: mapExportData(i.endpoint, rawData), includeSummary: true };
                        } catch (err) {
                            console.error(`Failed to fetch ${i.label}`, err);
                            return { label: i.label, sheetName: i.label.substring(0, 30), data: [], includeSummary: false };
                        }
                    })
                );
                const validSheets = results.filter(s => s.data.length > 0);
                if (validSheets.length === 0) { toast.error("Aucune donnée trouvée dans la base de données", { id: toastId }); return; }
                const summaryData = validSheets.map(s => {
                    const numericKeys = Object.keys(s.data[0] || {}).filter(k => k.includes('(DH)'));
                    const totals: any = {};
                    numericKeys.forEach(k => { totals[k] = s.data.reduce((sum, row) => sum + (parseFloat(row[k]) || 0), 0); });
                    return { 'MODULE': s.label, 'NOMBRE D\'ENTRÉES': s.data.length, 'VALEUR TOTALE (DH)': totals[numericKeys[0]] || 0, 'RESTE / SOLDE (DH)': totals[numericKeys.find(k => k.includes('RESTE') || k.includes('SOLDE')) || ''] || 0 };
                });
                exportMultiSheetToExcel([{ sheetName: 'RÉCAPITULATIF GLOBAL', data: summaryData, includeSummary: true }, ...validSheets.map(s => ({ sheetName: s.sheetName, data: s.data, includeSummary: true }))], item.fileName);
            } else {
                const data: any = await apiFetch(item.endpoint);
                const rawData = Array.isArray(data) ? data : (data.data || []);
                const mappedData = mapExportData(item.endpoint, rawData);
                if (mappedData.length === 0) { toast.error("Aucune donnée à exporter pour ce module", { id: toastId }); return; }
                exportToExcel(mappedData, item.fileName, true);
            }
            toast.success("Export réussi !", { id: toastId });
            setIsExportOpen(false);
        } catch (error: any) {
            console.error("Export failed", error);
            toast.error(`Échec de l'exportation: ${error.message || 'Erreur inconnue'}`, { id: toastId });
        }
    };

    if (!token) return null;

    const go = (path: string) => { navigate(path); setIsMobileOpen(false); setTooltip(null); };

    // Collapsed-mode labels are rendered with fixed positioning so the
    // scrollable nav container doesn't clip them.
    const showTooltip = (e: React.MouseEvent<HTMLElement>, label: string) => {
        if (!isCollapsed) return;
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ label, top: r.top + r.height / 2, left: r.right + 12 });
    };

    const NavButton = ({ item, active }: { item: NavItem; active: boolean }) => (
        <button
            onClick={() => go(item.path)}
            onMouseEnter={(e) => showTooltip(e, item.label)}
            onMouseLeave={() => setTooltip(null)}
            className={`
                group/nav relative w-full flex items-center gap-3 rounded-lg text-[11.4px] font-medium transition-colors
                ${isCollapsed ? 'justify-center h-10' : 'px-3 h-9'}
                ${active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'}
            `}
            aria-current={active ? 'page' : undefined}
        >
            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-500" />}
            <item.icon size={17} className={`flex-shrink-0 transition-colors ${active ? 'text-brand-400' : 'text-slate-500 group-hover/nav:text-slate-300'}`} />
            {!isCollapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
        </button>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-[120] lg:hidden animate-fade-in" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-full bg-sidebar text-slate-300 z-[130]
                    border-r border-sidebar-border transition-all duration-300 flex flex-col
                    ${isCollapsed ? 'w-20' : 'w-[260px]'}
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo Section */}
                <div className={`h-16 flex items-center border-b border-white/[0.06] flex-shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
                    {!isCollapsed && (
                        <button onClick={() => go('/home')} className="flex items-center gap-3 overflow-hidden">
                            <img src="/assets/logoLogin.png" alt="" className="h-8 w-auto flex-shrink-0" />
                            <div className="flex flex-col leading-tight text-left min-w-0">
                                <span className="font-semibold text-white tracking-tight text-sm truncate">El Ouaha</span>
                                <span className="text-[8.8px] text-slate-500 font-medium truncate">Gestion immobilière</span>
                            </div>
                        </button>
                    )}
                    {!isCollapsed && showBell && <div className="ml-auto mr-1 hidden lg:block"><NotificationBell /></div>}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors lg:block hidden flex-shrink-0"
                        title={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
                    </button>
                    <button onClick={() => setIsMobileOpen(false)} className="lg:hidden flex-shrink-0 p-1.5 rounded-md hover:bg-white/[0.06]">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <div className={`flex-grow flex flex-col py-4 overflow-y-auto overflow-x-hidden custom-scrollbar-white ${isCollapsed ? 'px-2' : 'px-3'}`}>
                    {/* Search / command palette */}
                    {isCollapsed ? (
                        <button onClick={() => setIsCollapsed(false)}
                            onMouseEnter={(e) => showTooltip(e, activeProject ? `Projet : ${activeProject.name}` : 'Projet : tous')} onMouseLeave={() => setTooltip(null)}
                            className={`mx-auto mb-1 w-10 h-10 flex-shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-white/[0.06] ${activeProject ? 'text-brand-400' : 'text-slate-400 hover:text-white'}`}>
                            <MapPin size={17} />
                        </button>
                    ) : (
                        <label className="block mb-3">
                            <span className="block px-1 mb-1 text-[8.8px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Projet actif</span>
                            <select
                                value={activeProject?.id ?? ''}
                                onChange={(e) => {
                                    const t = projects.find(x => x.id === Number(e.target.value));
                                    setActiveProject(t ? { id: t.id, name: projectName(t) } : null);
                                }}
                                className={`w-full h-9 px-2.5 rounded-lg bg-white/[0.05] ring-1 ring-inset text-[11.4px] font-medium outline-none cursor-pointer transition-colors hover:bg-white/[0.08] ${activeProject ? 'ring-brand-500/60 text-white' : 'ring-white/[0.06] text-slate-300'}`}
                            >
                                <option value="" className="text-slate-900">Tous les projets</option>
                                {activeProject && !projects.some(x => x.id === activeProject.id) && (
                                    <option value={activeProject.id} className="text-slate-900">{activeProject.name}</option>
                                )}
                                {projects.map(t => <option key={t.id} value={t.id} className="text-slate-900">{projectName(t)}</option>)}
                            </select>
                        </label>
                    )}
                    {isCollapsed ? (
                        <div className="flex flex-col items-center gap-1 mb-4">
                            {showBell && <NotificationBell compact />}
                            <button onClick={() => openPalette()} onMouseEnter={(e) => showTooltip(e, 'Rechercher (Ctrl+K)')} onMouseLeave={() => setTooltip(null)}
                                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
                                <Search size={17} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => openPalette()} className="mb-4 w-full flex items-center gap-2.5 h-9 px-3 rounded-lg bg-white/[0.05] ring-1 ring-inset ring-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors text-[11.4px]">
                            <Search size={15} />
                            <span className="flex-1 text-left">Rechercher…</span>
                            <kbd className="text-[10px] font-medium text-slate-500 border border-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd>
                        </button>
                    )}
                    <nav className="space-y-5">
                        {navGroups.map((group, gi) => (
                            <div key={group.title}>
                                {isCollapsed
                                    ? gi > 0 && <div className="mx-3 mb-3 border-t border-white/[0.06]" />
                                    : <p className="px-3 mb-1.5 text-[8.8px] font-semibold text-slate-500 uppercase tracking-[0.12em]">{group.title}</p>}
                                <div className="space-y-0.5">
                                    {group.items.map(item => (
                                        <NavButton key={item.path} item={item} active={location.pathname === item.path} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Export */}
                    <div className="mt-5 pt-4 border-t border-white/[0.06]" ref={exportDropdownRef}>
                        {!isCollapsed && <p className="px-3 mb-1.5 text-[8.8px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Outils</p>}
                        <button
                            onClick={() => isCollapsed ? setIsCollapsed(false) : setIsExportOpen(!isExportOpen)}
                            className={`w-full flex items-center gap-3 rounded-lg text-[11.4px] font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-100 transition-colors ${isCollapsed ? 'justify-center h-10' : 'px-3 h-9'}`}
                            onMouseEnter={(e) => showTooltip(e, 'Exporter')}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <Download size={17} className="text-slate-500 flex-shrink-0" />
                            {!isCollapsed && <span>Exporter</span>}
                            {!isCollapsed && <ChevronDown size={14} className={`ml-auto transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        {isExportOpen && !isCollapsed && (
                            <div className="mt-1 ml-[22px] pl-3 border-l border-white/[0.08] space-y-0.5 animate-fade-in">
                                {exportItems.map((item) => (
                                    <button
                                        key={item.endpoint}
                                        onClick={() => handleGlobalExport(item)}
                                        className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${item.endpoint === 'all' ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
                                    >
                                        {item.endpoint === 'all' && <Database size={12} />}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Settings & Profile */}
                <div className={`mt-auto border-t border-white/[0.06] space-y-0.5 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
                    <NavButton item={{ icon: Settings2, label: 'Paramètres', path: '/parametres' }} active={location.pathname === '/parametres' || location.pathname === '/property-pricing'} />

                    <div className={`flex items-center gap-2 mt-2 rounded-lg ${location.pathname === '/profile' ? 'bg-white/[0.07]' : ''} ${isCollapsed ? 'flex-col' : ''}`}>
                        <button
                            onClick={() => go('/profile')}
                            className={`flex items-center gap-3 min-w-0 flex-1 rounded-lg hover:bg-white/[0.04] transition-colors ${isCollapsed ? 'justify-center p-1.5' : 'p-2'}`}
                            onMouseEnter={(e) => showTooltip(e, user?.name || 'Profil')}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-xs uppercase font-bold text-white flex-shrink-0 ring-2 ring-white/10">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col min-w-0 flex-1 text-left">
                                    <span className="truncate text-[11.4px] font-medium text-slate-100">{user?.name || 'Profil'}</span>
                                    <span className="truncate text-[9.7px] text-slate-500">{user?.email}</span>
                                </div>
                            )}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                            title="Déconnexion"
                        >
                            <LogOut size={17} />
                        </button>
                    </div>
                </div>
            </aside>

            {isCollapsed && tooltip && (
                <div
                    className="fixed z-[140] -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-xs font-medium whitespace-nowrap shadow-lg ring-1 ring-white/10 pointer-events-none animate-fade-in"
                    style={{ top: tooltip.top, left: tooltip.left }}
                >
                    {tooltip.label}
                </div>
            )}
        </>
    );
};

export default Sidebar;
