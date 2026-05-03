import React, { useState, useRef, useEffect } from 'react';
import {
    Menu, X, Building2, LogOut, ChevronDown,
    Home, MapPin, UserPlus, WalletCards, HardHat,
    Users, Layers, Download, Database, Package,
    ShoppingCart, Truck, Wrench, Settings2, FileText,
    ChevronRight, BarChart3, UserCheck, History, Scale, Building
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { exportToExcel, exportMultiSheetToExcel } from '../lib/excel';
import { toast } from 'react-hot-toast';
import { formatNumber, parseDate } from '../lib/utils';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}


const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');

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
        localStorage.clear();
        setUser(null);
        navigate('/login');
        window.location.reload();
    };


    const navItems = [
        { icon: Home, label: 'Accueil', path: '/home' },
        { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
        { icon: History, label: 'Historique', path: '/transactions' },
        { icon: MapPin, label: 'Projets', path: '/terrains' },
        { icon: Building2, label: 'Biens', path: '/properties' },
        { icon: Users, label: 'Intervenants', path: '/intervenants' },
        { icon: UserPlus, label: 'Clients', path: '/clients' },
        { icon: UserCheck, label: 'Gestion Ouvriers', path: '/workers' },
        { icon: Users, label: 'Gestion Salariés', path: '/salaries' },
        { icon: HardHat, label: 'Construction', path: '/contractors' },
        { icon: Scale, label: 'Affaires Juridiques', path: '/contentieux' },
        { icon: WalletCards, label: 'Charges', path: '/charges' },
        { icon: Building, label: 'Sociétés Services', path: '/services-tiers' },
        { icon: Wrench, label: 'Travaux Généraux', path: '/travaux' },
    ];

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
                    const prixGlobal = parseFloat(String(c.bien?.prix_global || 0));
                    const totalVerse = c.payments?.reduce((acc: number, p: any) => acc + parseFloat(String(p.amount)), 0) || 0;
                    return {
                        'ID': c.id, 'CLIENT NOM': c.nom?.toUpperCase(), 'CLIENT PRÉNOM': c.prenom?.toUpperCase(),
                        'TEL': c.tel, 'CIN': c.cin?.toUpperCase(),
                        'DATE SIGNATURE': c.date_reservation ? parseDate(c.date_reservation).toLocaleDateString('fr-MA') : 'N/A',
                        'BIEN ASSIGNÉ': c.bien?.type_bien || 'N/A', 'BLOC': c.bien?.num_appartement || 'N/A',
                        'PRIX VENTE (DH)': prixGlobal, 'TOTAL VERSÉ (DH)': totalVerse,
                        'SOLDE RESTANT (DH)': Math.max(0, prixGlobal - totalVerse),
                        'NB PAIEMENTS': c.payments?.length || 0, 'STATUT DOSSIER': c.bien?.statut || 'EN ATTENTE'
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

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[120] lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-full bg-[#1e293b] text-slate-300 z-[130] 
                    border-r border-slate-800 transition-all duration-300 flex flex-col
                    ${isCollapsed ? 'w-20' : 'w-[260px]'}
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo Section */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 flex-shrink-0">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <img src="/assets/LogoNavbar.png" alt="" className="h-7 w-auto flex-shrink-0" />
                            <span className="font-semibold text-white tracking-tight text-sm truncate">CINQ ÉLÉMENTS</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:text-white transition-colors lg:block hidden flex-shrink-0 ml-auto"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
                    </button>
                    <button onClick={() => setIsMobileOpen(false)} className="lg:hidden flex-shrink-0 ml-auto">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-grow flex flex-col py-4 px-3 overflow-y-auto custom-scrollbar-white">


                    {/* Navigation Items */}
                    <nav className="space-y-1 px-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => { navigate(item.path); setIsMobileOpen(false); }}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium
                                        ${isActive
                                            ? 'bg-slate-800 text-white'
                                            : 'hover:bg-slate-800/50 hover:text-white'}
                                    `}
                                >
                                    <item.icon size={18} className={`flex-shrink-0 ${isActive ? 'text-amber-500' : ''}`} />
                                    {!isCollapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-6 mb-2 border-t border-slate-800/50 pt-4 px-3">
                        {!isCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outils</span>}
                    </div>

                    {/* Simple Export Dropdown */}
                    <div className="px-1" ref={exportDropdownRef}>
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800/50 hover:text-white transition-all text-sm font-medium"
                        >
                            <Download size={18} />
                            {!isCollapsed && <span>Exporter</span>}
                            {!isCollapsed && <ChevronDown size={14} className={`ml-auto transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        {isExportOpen && !isCollapsed && (
                            <div className="mt-1 ml-6 space-y-1">
                                {exportItems.map((item) => (
                                    <button
                                        key={item.endpoint}
                                        onClick={() => handleGlobalExport(item)}
                                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-xs transition-colors ${item.endpoint === 'all' ? 'text-emerald-400 hover:text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {item.endpoint === 'all' && <Database size={12} />}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Profile & Settings */}
                <div className="mt-auto p-3 border-t border-slate-800/50 space-y-1 flex-shrink-0">
                    <button
                        onClick={() => { navigate('/property-pricing'); setIsMobileOpen(false); }}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium
                            ${location.pathname === '/property-pricing' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}
                        `}
                    >
                        <Settings2 size={18} />
                        {!isCollapsed && <span>Configuration</span>}
                    </button>

                    <button
                        onClick={() => { navigate('/profile'); setIsMobileOpen(false); }}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium
                            ${location.pathname === '/profile' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}
                        `}
                    >
                        <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px] uppercase font-bold text-white flex-shrink-0">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0 flex-1 text-left">
                                <span className="truncate text-sm">{user?.name || 'Profil'}</span>
                                <span className="truncate text-[10px] text-slate-500">{user?.email}</span>
                            </div>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all text-sm font-medium"
                    >
                        <LogOut size={18} />
                        {!isCollapsed && <span>Déconnexion</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
