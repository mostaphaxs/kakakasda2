import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Building2, LogOut, ChevronDown, Home, MapPin, UserPlus, WalletCards, HardHat, Users, Layers, Download, Database, Package, ShoppingCart, Truck, Wrench, Settings2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { exportToExcel, exportMultiSheetToExcel } from '../lib/excel';
import { toast } from 'react-hot-toast';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isFacturesMenuOpen, setIsFacturesMenuOpen] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { console.error("Failed to parse user", e); }
        }
    }, [token]);

    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        navigate('/login');
        window.location.reload();
    };

    // Removed "Créer Facture" from quickAddItems
    const quickAddItems = [
        { icon: MapPin, label: 'Nouveau Projet', path: '/add-terrain', color: 'text-slate-900' },
        { icon: Users, label: 'Nouveau Intervenant', path: '/intervenants', color: 'text-slate-900' },
        { icon: Home, label: 'Nouveau Bien', path: '/add-property', color: 'text-slate-900' },
        { icon: UserPlus, label: 'Nouveau Client', path: '/add-client', color: 'text-slate-900' },
        { icon: HardHat, label: 'Construction', path: '/contractors', color: 'text-slate-900' },
        { icon: WalletCards, label: 'Nouvelle Charge', path: '/charges', color: 'text-slate-900' },
        { icon: Package, label: 'Nouvel Article', path: '/add-article', color: 'text-indigo-600' },
        { icon: Truck, label: 'Nouveau Fournisseur', path: '/add-supplier', color: 'text-slate-600' },
        { icon: ShoppingCart, label: 'Nouvel Achat (Stock)', path: '/add-achat', color: 'text-emerald-600' },
        { icon: Wrench, label: 'Nouveaux Travaux', path: '/add-travaux', color: 'text-orange-600' },
        { icon: LogOut, label: 'Sortie Stock', path: '/add-stock-exit', color: 'text-rose-600' },
    ];

    // Removed "Factures (Générateur)" from navItems
    const navItems = [
        { icon: Home, label: 'Accueil', path: '/home' },
        { icon: MapPin, label: 'Projets', path: '/terrains' },
        { icon: Users, label: 'Intervenants', path: '/intervenants' },
        { icon: Building2, label: 'Biens & Locaux', path: '/properties' },
        { icon: UserPlus, label: 'Clients', path: '/clients' },
        { icon: HardHat, label: 'Construction', path: '/contractors' },
        { icon: WalletCards, label: 'Charges', path: '/charges' },
        { icon: WalletCards, label: 'Analytics', path: '/dashboard' },
        { icon: Package, label: 'Catalogue Articles', path: '/articles' },
        { icon: Truck, label: 'Fournisseurs', path: '/suppliers' },
        { icon: ShoppingCart, label: 'Achats / Entrées', path: '/achats' },
        { icon: Wrench, label: 'Travaux Généraux', path: '/travaux' },
        { icon: Layers, label: 'Inventaire Stock', path: '/stock' },
    ];

    const exportItems = [
        { label: 'Toute la base de données', endpoint: 'all', fileName: 'database_complet', icon: Database },
        { label: 'Tous les Projets', endpoint: '/terrains', fileName: 'terrains_complet' },
        { label: 'Tous les Biens', endpoint: '/biens', fileName: 'biens_complet' },
        { label: 'Tous les Clients', endpoint: '/clients', fileName: 'clients_complet' },
        { label: 'Intervenants', endpoint: '/intervenants', fileName: 'intervenants_complet' },
        { label: 'Construction', endpoint: '/contractors', fileName: 'entreprises_complet' },
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
                    'DATE ACQUISITION': t.created_at ? new Date(t.created_at).toLocaleDateString('fr-MA') : 'N/A',
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
                        'DATE SIGNATURE': c.date_reservation ? new Date(c.date_reservation).toLocaleDateString('fr-MA') : 'N/A',
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
                        'ID': c.id, 'MOIS / PÉRIODE': new Date(c.periode).toLocaleDateString('fr-MA').toUpperCase(),
                        'TOTAL GÉNÉRAL (DH)': totalMois, 'LOYER (DH)': c.loyer_bureau, 'SALAIRES (DH)': c.employes_bureau,
                        'FOURNITURES (DH)': c.fournitures_bureau,
                        'COMMUNICATIONS (DH)': Number(c.frais_tel) + Number(c.internet), 'LOGISTIQUE (DH)': c.gasoil,
                        'IMPÔTS & TAXES (DH)': c.impots, 'AFFECTATION': c.terrain?.nom_projet || 'FRAIS GÉNÉRAUX'
                    };
                });
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
            setIsExportMenuOpen(false);
        } catch (error: any) {
            console.error("Export failed", error);
            toast.error(`Échec de l'exportation: ${error.message || 'Erreur inconnue'}`, { id: toastId });
        }
    };

    const go = (path: string) => { navigate(path); setIsMobileOpen(false); };

    if (!token) return null;

    return (
        <>
            {/* Mobile backdrop */}
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}

            <aside className={`
                fixed top-0 left-0 bottom-0 z-[120]
                w-[280px] bg-[#1a0f0a] border-r border-[#2a1a11] shadow-2xl
                flex flex-col transition-transform duration-500 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>

                {/* ── Logo header ── */}
                <div className="px-3 py-1.5 border-b border-[#2a1a11] flex items-center justify-between h-[60px] flex-shrink-0">
                    <div onClick={() => go('/home')} className="flex items-center min-w-0 cursor-pointer group flex-1">
                        <img
                            src="/assets/LogoNavbar.png"
                            alt="Logo"
                            className="h-8 w-auto mr-2 flex-shrink-0 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-sm font-bold text-white leading-tight">
                            Société les <span className="text-amber-500 font-black">cinq elements</span>
                        </span>
                    </div>
                    {/* Close button — always visible */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 text-white/60 rounded cursor-pointer hover:bg-white/10 flex-shrink-0 lg:hidden"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* ── Scrollable nav area ── */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">

                    {/* Factures */}
                    <div>
                        <button
                            onClick={() => setIsFacturesMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-white/5 text-white/80 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition font-black text-xs uppercase tracking-widest border border-white/10 w-full"
                        >
                            <FileText size={16} className="text-blue-500" />
                            <span className="flex-1 text-left">Factures</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isFacturesMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isFacturesMenuOpen && (
                            <div className="mt-1 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 animate-[fadeInDown_0.15s_ease-out]">
                                <button
                                    onClick={() => { setIsFacturesMenuOpen(false); go('/factures-list'); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors border-b border-gray-50"
                                >
                                    <Layers size={16} className="text-indigo-600" />
                                    <span className="font-extrabold uppercase tracking-tight">Consulter Factures</span>
                                </button>
                                <button
                                    onClick={() => { setIsFacturesMenuOpen(false); go('/factures'); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Plus size={16} className="text-blue-600" />
                                    <span className="font-extrabold uppercase tracking-tight">Créer Facture</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Consulter */}
                    <div>
                        <button
                            onClick={() => setIsNavMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-white/5 text-white/80 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition font-black text-xs uppercase tracking-widest border border-white/10 w-full"
                        >
                            <Layers size={16} className="text-amber-500" />
                            <span className="flex-1 text-left">Consulter</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isNavMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isNavMenuOpen && (
                            <div className="mt-1 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 animate-[fadeInDown_0.15s_ease-out]">
                                {navItems.map(({ icon: Icon, label, path }) => (
                                    <button
                                        key={path}
                                        onClick={() => { setIsNavMenuOpen(false); go(path); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Icon size={16} className="text-slate-900" />
                                        <span className="font-extrabold uppercase tracking-tight">{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nouveau */}
                    <div>
                        <button
                            onClick={() => setIsAddMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-900/20 w-full"
                        >
                            <Plus size={16} />
                            <span className="flex-1 text-left">Nouveau</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAddMenuOpen && (
                            <div className="mt-1 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 animate-[fadeInDown_0.15s_ease-out]">
                                {quickAddItems.map(({ icon: Icon, label, path, color }) => (
                                    <button
                                        key={path}
                                        onClick={() => { setIsAddMenuOpen(false); go(path); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Icon size={16} className={color} />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Exporter */}
                    <div>
                        <button
                            onClick={() => setIsExportMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-white/5 text-white/80 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition font-black text-xs uppercase tracking-widest border border-white/10 w-full"
                        >
                            <Download size={16} />
                            <span className="flex-1 text-left">Exporter</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isExportMenuOpen && (
                            <div className="mt-1 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 animate-[fadeInDown_0.15s_ease-out]">
                                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                                    Sauvegarde Complète
                                </div>
                                {exportItems.map((item) => (
                                    <button
                                        key={item.endpoint}
                                        onClick={() => handleGlobalExport(item)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${item.endpoint === 'all'
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-b border-emerald-100'
                                            : 'text-gray-700 hover:bg-emerald-50'}`}
                                    >
                                        <Database size={16} className={item.endpoint === 'all' ? 'text-emerald-700' : 'text-emerald-600'} />
                                        <span className={item.endpoint === 'all' ? 'font-black uppercase tracking-tighter' : 'font-medium'}>
                                            {item.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* ── Bottom: Configuration + User + Logout ── */}
                <div className="border-t border-[#2a1a11] flex-shrink-0">
                    {/* Configuration — above profile */}
                    <div className="px-3 pt-3 pb-2">
                        <button
                            onClick={() => go('/property-pricing')}
                            className="flex items-center gap-2 bg-white/5 text-white/80 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition font-black text-xs uppercase tracking-widest border border-white/10 w-full"
                        >
                            <Settings2 size={16} className="text-amber-500" />
                            <span>Configuration</span>
                        </button>
                    </div>

                    {/* User info + Logout */}
                    <div className="flex items-center px-3 pb-3 gap-2">
                        <div
                            onClick={() => go('/profile')}
                            className="flex-1 min-w-0 cursor-pointer hover:opacity-75 transition-opacity group"
                            title="Mon Profil"
                        >
                            <p className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors truncate">{user?.name || 'Utilisateur'}</p>
                            <p className="text-[11px] text-white/40 font-mono truncate">{user?.email || 'N/A'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all duration-300 font-black text-xs uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-sm border border-rose-100 flex-shrink-0"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
