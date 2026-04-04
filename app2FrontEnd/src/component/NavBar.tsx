// src/component/NavBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Menu, X, Building2, LogOut, ChevronDown, Home, MapPin, UserPlus, WalletCards, HardHat, Users, Layers, Download, Database, Package, ShoppingCart, Truck, Wrench, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { exportToExcel, exportMultiSheetToExcel } from '../lib/excel';
import { toast } from 'react-hot-toast';

const Navbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navDropdownRef = useRef<HTMLDivElement>(null);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // Sync user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
    }, [token]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsAddMenuOpen(false);
            }
            if (navDropdownRef.current && !navDropdownRef.current.contains(target)) {
                setIsNavMenuOpen(false);
            }
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
                setIsExportMenuOpen(false);
            }
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

    const quickAddItems = [
        { icon: Home, label: 'Nouveau Bien', path: '/add-property', color: 'text-slate-900' },
        { icon: MapPin, label: 'Nouveau Projet', path: '/add-terrain', color: 'text-slate-900' },
        { icon: UserPlus, label: 'Nouveau Client', path: '/add-client', color: 'text-slate-900' },
        { icon: Users, label: 'Nouveau Intervenant', path: '/intervenants', color: 'text-slate-900' },
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
                    'ID': t.id,
                    'NOM DU PROJET': t.nom_projet?.toUpperCase() || `PROJET #${t.id}`,
                    'NUMÉRO TF': t.numero_TF || 'N/A',
                    'PRIX ACHAT (DH)': t.cout_global || 0,
                    'FRAIS ENREG. (DH)': t.frais_enregistrement || 0,
                    'FRAIS IMMAT. (DH)': t.frais_immatriculation || 0,
                    'FRAIS NOTAIRE (DH)': t.honoraires_notaire || 0,
                    'TOTAL INVESTI (DH)': t.total || 0,
                    'DATE ACQUISITION': t.created_at ? new Date(t.created_at).toLocaleDateString('fr-MA') : 'N/A',
                    "F. Construction (DH)": t.autorisation_construction || 0,
                    "F. d'equipement (DH)": t.autorisation_equipement || 0,
                    "F. Pompier (DH)": t.frais_pompier || 0,
                }));
            case '/biens':
                return data.map(b => ({
                    'ID': b.id,
                    'RÉF UNITÉ': b.num_appartement?.toUpperCase(),
                    'CATÉGORIE': b.type_bien?.toUpperCase(),
                    'PROJET ID': b.terrain_id,
                    'ÉTAGE': b.etage || 'RDC',
                    'SURFACE (M²)': b.surface_m2,
                    'PRIX DE VENTE (DH)': b.prix_global,
                    'STATUT ACTUEL': b.statut?.toUpperCase(),
                    'OBSERVATIONS': b.description || ''
                }));
            case '/clients':
                return data.map(c => {
                    const prixGlobal = parseFloat(String(c.bien?.prix_global || 0));
                    const totalVerse = c.payments?.reduce((acc: number, p: any) => acc + parseFloat(String(p.amount)), 0) || 0;
                    return {
                        'ID': c.id,
                        'CLIENT NOM': c.nom?.toUpperCase(),
                        'CLIENT PRÉNOM': c.prenom?.toUpperCase(),
                        'TEL': c.tel,
                        'CIN': c.cin?.toUpperCase(),
                        'DATE SIGNATURE': c.date_reservation ? new Date(c.date_reservation).toLocaleDateString('fr-MA') : 'N/A',
                        'BIEN ASSIGNÉ': c.bien?.type_bien || 'N/A',
                        'UNITÉ': c.bien?.num_appartement || 'N/A',
                        'PRIX VENTE (DH)': prixGlobal,
                        'TOTAL VERSÉ (DH)': totalVerse,
                        'SOLDE RESTANT (DH)': Math.max(0, prixGlobal - totalVerse),
                        'NB PAIEMENTS': c.payments?.length || 0,
                        'STATUT DOSSIER': c.bien?.statut || 'EN ATTENTE'
                    };
                });
            case '/intervenants':
            case '/contractors':
                return data.map(i => {
                    const totalVerse = i.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                    return {
                        'ID': i.id,
                        'MODULE': endpoint.includes('contractor') ? 'CONSTRUCTION' : 'INTERVENANT',
                        'CATÉGORIE': i.categorie?.toUpperCase(),
                        'SOCIÉTÉ': i.nom_societe?.toUpperCase(),
                        'GÉRANT': i.nom_gerant?.toUpperCase(),
                        'TÉLÉPHONE': i.tel,
                        'PROJET LIÉ': i.terrain?.nom_projet || 'N/A',
                        'MARCHÉ GLOBAL (DH)': i.montant_global,
                        'TOTAL PAYÉ (DH)': totalVerse,
                        'RESTE À PAYER (DH)': Math.max(0, i.montant_global - totalVerse),
                        'IDENTIFIANT FISCAL': i.if || '',
                        'ICE': i.ice || '',
                        'RC': i.rc || ''
                    };
                });
            case '/charges':
                return data.map(c => {
                    const totalMois = Number(c.frais_tel) + Number(c.internet) + Number(c.loyer_bureau) +
                        Number(c.fournitures_bureau) + Number(c.employes_bureau) + Number(c.impots) + Number(c.gasoil);
                    return {
                        'ID': c.id,
                        'MOIS / PÉRIODE': new Date(c.periode).toLocaleDateString('fr-MA').toUpperCase(),
                        'TOTAL GÉNÉRAL (DH)': totalMois,
                        'LOYER (DH)': c.loyer_bureau,
                        'SALAIRES (DH)': c.employes_bureau,
                        'FOURNITURES (DH)': c.fournitures_bureau,
                        'COMMUNICATIONS (DH)': Number(c.frais_tel) + Number(c.internet),
                        'LOGISTIQUE (DH)': c.gasoil,
                        'IMPÔTS & TAXES (DH)': c.impots,
                        'AFFECTATION': c.terrain?.nom_projet || 'FRAIS GÉNÉRAUX'
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
                            const mappedData = mapExportData(i.endpoint, rawData);
                            return {
                                label: i.label,
                                sheetName: i.label.replace('Tous les ', '').replace('Tous ', '').substring(0, 30),
                                data: mappedData,
                                includeSummary: true
                            };
                        } catch (err) {
                            console.error(`Failed to fetch ${i.label}`, err);
                            return { label: i.label, sheetName: i.label.substring(0, 30), data: [], includeSummary: false };
                        }
                    })
                );

                const validSheets = results.filter(s => s.data.length > 0);
                if (validSheets.length === 0) {
                    toast.error("Aucune donnée trouvée dans la base de données", { id: toastId });
                    return;
                }

                // Add a Summary sheet at the beginning
                const summaryData = validSheets.map(s => {
                    // Try to find a "Total" key if possible, but let's just do count for now
                    const numericKeys = Object.keys(s.data[0] || {}).filter(k => k.includes('(DH)'));
                    const totals: any = {};
                    numericKeys.forEach(k => {
                        totals[k] = s.data.reduce((sum, row) => sum + (parseFloat(row[k]) || 0), 0);
                    });

                    return {
                        'MODULE': s.label,
                        'NOMBRE D\'ENTRÉES': s.data.length,
                        'VALEUR TOTALE (DH)': totals[numericKeys[0]] || 0,
                        'RESTE / SOLDE (DH)': totals[numericKeys.find(k => k.includes('RESTE') || k.includes('SOLDE')) || ''] || 0
                    };
                });

                const sheetsWithSummary = [
                    { sheetName: 'RÉCAPITULATIF GLOBAL', data: summaryData, includeSummary: true },
                    ...validSheets.map(s => ({ sheetName: s.sheetName, data: s.data, includeSummary: true }))
                ];

                exportMultiSheetToExcel(sheetsWithSummary, item.fileName);
            } else {
                const data: any = await apiFetch(item.endpoint);
                const rawData = Array.isArray(data) ? data : (data.data || []);
                const mappedData = mapExportData(item.endpoint, rawData);

                if (mappedData.length === 0) {
                    toast.error("Aucune donnée à exporter pour ce module", { id: toastId });
                    return;
                }

                exportToExcel(mappedData, item.fileName, true);
            }

            toast.success("Export réussi !", { id: toastId });
            setIsExportMenuOpen(false);
        } catch (error: any) {
            console.error("Export failed", error);
            toast.error(`Échec de l'exportation: ${error.message || 'Erreur inconnue'}`, { id: toastId });
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
            <div className="px-3 py-3 lg:px-5 lg:pl-3">
                <div className="flex items-center justify-between">

                    {/* LEFT: Logo & Mobile Toggle */}
                    <div className="flex items-center justify-start">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-gray-600 rounded cursor-pointer lg:hidden hover:bg-gray-100"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>

                        <div onClick={() => navigate('/home')} className="flex ml-2 md:mr-24 cursor-pointer group">
                            <Building2 className="h-8 w-8 text-slate-900 mr-2 group-hover:scale-110 transition-transform" />
                            <span className="self-center text-xl font-bold sm:text-2xl whitespace-nowrap text-gray-800">
                                El <span className="text-slate-900 font-black">Ouaha</span>
                            </span>
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-2 md:gap-6">
                        {token ? (
                            <>
                                {/* Configuration Button */}
                                <button
                                    onClick={() => navigate('/property-pricing')}
                                    className="hidden lg:flex items-center gap-2 bg-slate-50 text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition font-black text-xs uppercase tracking-widest border border-slate-200"
                                >
                                    <Settings2 size={16} className="text-slate-900" />
                                    <span>Configuration</span>
                                </button>

                                {/* Consulter Dropdown */}
                                <div className="relative hidden lg:block" ref={navDropdownRef}>
                                    <button
                                        onClick={() => setIsNavMenuOpen(prev => !prev)}
                                        className="flex items-center gap-2 bg-slate-50 text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition font-black text-xs uppercase tracking-widest border border-slate-200"
                                    >
                                        <Layers size={16} className="text-slate-900" />
                                        <span>Consulter</span>
                                        <ChevronDown
                                            size={14}
                                            className={`transition-transform duration-200 ${isNavMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {isNavMenuOpen && (
                                        <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 z-50
                                                        animate-[fadeInDown_0.15s_ease-out]">
                                            {navItems.map(({ icon: Icon, label, path }) => (
                                                <button
                                                    key={path}
                                                    onClick={() => { setIsNavMenuOpen(false); navigate(path); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <Icon size={16} className="text-slate-900" />
                                                    <span className="font-extrabold uppercase tracking-tight">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Quick Add Dropdown */}
                                <div className="relative hidden md:block" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsAddMenuOpen(prev => !prev)}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-black transition font-black text-xs uppercase tracking-widest shadow-sm"
                                    >
                                        <Plus size={16} />
                                        <span>Nouveau</span>
                                        <ChevronDown
                                            size={14}
                                            className={`transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {/* Dropdown panel */}
                                    {isAddMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50
                                                        animate-[fadeInDown_0.15s_ease-out]">
                                            {quickAddItems.map(({ icon: Icon, label, path, color }) => (
                                                <button
                                                    key={path}
                                                    onClick={() => { setIsAddMenuOpen(false); navigate(path); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <Icon size={16} className={color} />
                                                    <span className="font-medium">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Export Dropdown */}
                                <div className="relative hidden md:block" ref={exportDropdownRef}>
                                    <button
                                        onClick={() => setIsExportMenuOpen(prev => !prev)}
                                        className="flex items-center gap-2 bg-white text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition font-black text-xs uppercase tracking-widest shadow-sm border border-slate-200"
                                        title="Exporter les données"
                                    >
                                        <Download size={16} />
                                        <span>Exporter</span>
                                        <ChevronDown
                                            size={14}
                                            className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {isExportMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50
                                                        animate-[fadeInDown_0.15s_ease-out]">
                                            <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                                                Sauvegarde Complète
                                            </div>
                                            {exportItems.map((item) => (
                                                <button
                                                    key={item.endpoint}
                                                    onClick={() => handleGlobalExport(item)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${item.endpoint === 'all'
                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-b border-emerald-100'
                                                        : 'text-gray-700 hover:bg-emerald-50'
                                                        }`}
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



                                {/* User info + Logout */}
                                <div className="flex items-center border-l border-gray-200 pl-4">
                                    <div
                                        onClick={() => navigate('/profile')}
                                        className="text-right mr-4 hidden sm:block cursor-pointer hover:opacity-75 transition-opacity group"
                                        title="Mon Profil"
                                    >
                                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{user?.name || 'Utilisateur'}</p>
                                        <p className="text-[11px] text-gray-400 font-mono">{user?.email || 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Déconnexion"
                                    >
                                        <LogOut size={22} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="text-white bg-blue-600 hover:bg-blue-700 font-bold rounded-lg text-sm px-6 py-2 transition shadow-md"
                            >
                                Accès Privé
                            </button>
                        )}
                    </div>
                </div>


                {isMobileMenuOpen && token && (
                    <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-1">
                        {quickAddItems.map(({ icon: Icon, label, path, color }) => (
                            <button
                                key={path}
                                onClick={() => { setIsMobileMenuOpen(false); navigate(path); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <Icon size={16} className={color} />
                                <span className="font-medium">{label}</span>
                            </button>
                        ))}
                        <div className="border-t border-gray-100 my-1 py-1">
                            <button
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/property-pricing'); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border-l-4 border-slate-900"
                            >
                                <Settings2 size={16} className="text-slate-900" />
                                <span className="font-black uppercase tracking-tight text-slate-900">Configuration</span>
                            </button>
                            {navItems.map(({ icon: Icon, label, path }) => (
                                <button
                                    key={path}
                                    onClick={() => { setIsMobileMenuOpen(false); navigate(path); }}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Icon size={18} className="text-blue-500" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;