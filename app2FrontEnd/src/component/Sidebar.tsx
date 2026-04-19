import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Building2, LogOut, ChevronDown, Home, MapPin, UserPlus, WalletCards, HardHat, Users, Layers, Download, Database, Package, ShoppingCart, Truck, Wrench, Settings2, FileText, ChevronLeft } from 'lucide-react';
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
            default:
                return data;
        }
    };

    const handleGlobalExport = async (item: typeof exportItems[0]) => {
        const toastId = 'export-status';
        try {
            toast.loading(`Préparation ${item.label}...`, { id: toastId });
            const data: any = await apiFetch(item.endpoint === 'all' ? '/terrains' : item.endpoint); // Simplified for demo
            const rawData = Array.isArray(data) ? data : (data.data || []);
            exportToExcel(mapExportData(item.endpoint, rawData), item.fileName, true);
            toast.success("Export réussi !", { id: toastId });
            setIsExportMenuOpen(false);
        } catch (error: any) {
            toast.error("Échec de l'exportation", { id: toastId });
        }
    };

    const go = (path: string) => { navigate(path); setIsMobileOpen(false); };

    return (
        <>
            {isMobileOpen && <div className="fixed inset-0 bg-black/60 z-[110] lg:hidden" onClick={() => setIsMobileOpen(false)} />}

            <aside className={`
                fixed top-0 left-0 bottom-0 z-[120]
                w-[280px] bg-[#1a0f0a] border-r border-[#2a1a11] shadow-2xl
                flex flex-col transition-transform duration-500 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>

                {/* Header with Logo and Close Arrow */}
                <div className="px-4 border-b border-[#2a1a11] flex items-center justify-between h-[64px] flex-shrink-0 bg-[#1a0f0a]">
                    <div onClick={() => go('/home')} className="flex items-center min-w-0 cursor-pointer group flex-1 overflow-hidden">
                        <img src="/assets/LogoNavbar.png" alt="Logo" className="h-9 w-auto mr-3 flex-shrink-0 group-hover:scale-105 transition-transform" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Société les</span>
                            <span className="text-sm font-black text-white leading-tight truncate">
                                CINQ <span className="text-amber-500">ÉLÉMENTS</span>
                            </span>
                        </div>
                    </div>
                    {/* Close Arrow Toggle */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 text-white/40 hover:text-amber-500 hover:bg-white/5 rounded-full transition-all ml-2"
                        title="Fermer le menu"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">

                    {/* Section: Factures */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsFacturesMenuOpen(!isFacturesMenuOpen)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-white/5 group ${isFacturesMenuOpen ? 'bg-blue-500/10 text-white border-blue-500/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                        >
                            <FileText size={18} className={isFacturesMenuOpen ? 'text-blue-400' : 'text-blue-500 group-hover:scale-110 transition-transform'} />
                            <span className="flex-1 text-left font-black text-xs uppercase tracking-widest">Factures</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isFacturesMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFacturesMenuOpen && (
                            <div className="mt-1 bg-white/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl py-2 overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
                                <button onClick={() => go('/factures-list')} className="w-full flex items-center gap-3 px-5 py-3 text-xs font-bold text-slate-800 hover:bg-blue-50 transition-colors border-b border-slate-100">
                                    <Layers size={16} className="text-indigo-600" />
                                    <span>CONSULTER FACTURES</span>
                                </button>
                                <button onClick={() => go('/factures')} className="w-full flex items-center gap-3 px-5 py-3 text-xs font-bold text-slate-800 hover:bg-blue-50 transition-colors">
                                    <Plus size={16} className="text-blue-600" />
                                    <span>CRÉER FACTURE</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section: Consulter */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-white/5 group ${isNavMenuOpen ? 'bg-amber-500/10 text-white border-amber-500/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Layers size={18} className={isNavMenuOpen ? 'text-amber-400' : 'text-amber-500 group-hover:scale-110 transition-transform'} />
                            <span className="flex-1 text-left font-black text-xs uppercase tracking-widest">Consulter</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isNavMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isNavMenuOpen && (
                            <div className="mt-1 bg-white/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl py-2 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar-white animate-[fadeInScale_0.2s_ease-out]">
                                {navItems.map((item) => (
                                    <button key={item.path} onClick={() => go(item.path)} className="w-full flex items-center gap-4 px-5 py-3 text-xs font-bold text-slate-800 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0 uppercase tracking-tighter">
                                        <item.icon size={16} className="text-slate-900 opacity-70" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section: Nouveau */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-600 text-white transition-all duration-300 font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-amber-900/40 hover:bg-amber-500 group"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            <span className="flex-1 text-left">Nouveau</span>
                            <ChevronDown size={16} className={`transition-transform duration-300 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAddMenuOpen && (
                            <div className="mt-2 bg-white/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl py-2 overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
                                {quickAddItems.map((item) => (
                                    <button key={item.path} onClick={() => go(item.path)} className="w-full flex items-center gap-4 px-5 py-3 text-xs font-black text-slate-800 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 uppercase tracking-tight">
                                        <item.icon size={16} className={`${item.color} opacity-80`} />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section: Exporter */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-white/5 group ${isExportMenuOpen ? 'bg-emerald-500/10 text-white border-emerald-500/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Download size={18} className={isExportMenuOpen ? 'text-emerald-400' : 'text-emerald-500 group-hover:-translate-y-0.5 transition-transform'} />
                            <span className="flex-1 text-left font-black text-xs uppercase tracking-widest">Exporter</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isExportMenuOpen && (
                            <div className="mt-1 bg-white/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl py-2 overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
                                <div className="px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sauvegarde</div>
                                {exportItems.map((item) => (
                                    <button key={item.label} onClick={() => handleGlobalExport(item)} className={`w-full flex items-center gap-4 px-5 py-3 text-xs font-bold transition-all ${item.endpoint === 'all' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-b border-emerald-100' : 'text-slate-800 hover:bg-slate-50'}`}>
                                        <Database size={16} className={item.endpoint === 'all' ? 'text-emerald-700' : 'text-emerald-600'} />
                                        <span className={item.endpoint === 'all' ? 'font-black' : ''}>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer and Bottom Settings */}
                <div className="mt-auto border-t border-[#2a1a11] bg-[#130b08]/50 p-4 space-y-4">
                    {/* Configuration — above profile */}
                    <button
                        onClick={() => go('/property-pricing')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all group shadow-inner"
                    >
                        <Settings2 size={18} className="text-amber-500 group-hover:rotate-45 transition-transform duration-500" />
                        <span className="font-black text-xs uppercase tracking-[0.1em]">Configuration</span>
                    </button>

                    {/* Profile & Logout */}
                    <div className="flex items-center gap-3 px-1">
                        <div onClick={() => go('/profile')} className="flex-1 min-w-0 cursor-pointer group">
                            <p className="text-sm font-black text-white group-hover:text-amber-500 transition-colors truncate uppercase tracking-tight">{user?.name || 'Utilisateur'}</p>
                            <p className="text-[10px] text-white/40 font-mono truncate lowercase opacity-60 group-hover:opacity-100 transition-opacity">{user?.email || 'N/A'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-300 shadow-lg shadow-rose-900/20"
                            title="Déconnexion"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
