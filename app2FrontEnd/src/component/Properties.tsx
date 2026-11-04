import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, Loader2, Trash2, Layout, Boxes, X, Check, Layers, Landmark, Download, Edit2, Eye, Search, UserPlus, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MarkdownText from './common/MarkdownText';
import MediaManager from './media/MediaManager';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import { openProgressPhotos } from './common/ProgressPhotos';


interface AnnexUnit {
    id: number;
    bien_id: number;
    type: string;
    prix: number;
}

interface Bien {
    id: number;
    terrain_id: number;
    type_bien: string;
    nom?: string;
    num_appartement: string; // Internal field name remains same for DB, but label will be "Bloc"
    groupe_habitation?: string;
    immeuble?: string;
    etage: number;
    surface_m2: number;
    prix_global_finition: number;
    prix_global_non_finition: number;
    prix_par_m2_finition: number;
    prix_par_m2_non_finition: number;
    statut: string;
    description?: string;
    terrain?: any;
    client?: any;
    clients?: any[];
    charges_syndic?: number | null;
    frais_branchement_eau?: number | null;
    frais_branchement_electricite?: number | null;
    tva?: number | null;
    gros_oeuvre_pourcentage: number;
    finition_pourcentage: number;
}

const Properties = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = usePersistedState('Properties.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [filterStatut, setFilterStatut] = usePersistedState<string>('Properties.filterStatut', 'all');
    const [filterTerrain, setFilterTerrain] = usePersistedState<string>('Properties.filterTerrain', 'all');
    const [filterEtage, setFilterEtage] = usePersistedState<string>('Properties.filterEtage', 'all');
    const [filterImmeuble, setFilterImmeuble] = usePersistedState<string>('Properties.filterImmeuble', 'all');
    const headerRef = useRef<HTMLDivElement>(null);
    const [stickyOffset, setStickyOffset] = useState(0);

    useEffect(() => {
        const updateOffset = () => {
            if (headerRef.current) {
                // Buffer for the sticky top-4 (1rem = 16px approx)
                setStickyOffset(headerRef.current.offsetHeight + 16);
            }
        };

        updateOffset();
        window.addEventListener('resize', updateOffset);
        const observer = new ResizeObserver(updateOffset);
        if (headerRef.current) observer.observe(headerRef.current);

        return () => {
            window.removeEventListener('resize', updateOffset);
            observer.disconnect();
        };
    }, []);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAnnexModalOpen, setIsAnnexModalOpen] = useState(false);
    const [selectedBien, setSelectedBien] = useState<Bien | null>(null);
    const [newAnnex, setNewAnnex] = useState({ type: 'Parking', prix: '', customType: '' });
    const [showOtherType, setShowOtherType] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    // Bien → Client Association Modal
    const [isAssocClientModalOpen, setIsAssocClientModalOpen] = useState(false);
    const [assocBien, setAssocBien] = useState<Bien | null>(null);
    const [assocClients, setAssocClients] = useState<any[]>([]);
    const [assocClientSearch, setAssocClientSearch] = useState('');
    const [assocClientId, setAssocClientId] = useState('');
    const [assocAvecFinition, setAssocAvecFinition] = useState(false);
    const [isLoadingAssocClients, setIsLoadingAssocClients] = useState(false);
    const [isSubmittingAssocClient, setIsSubmittingAssocClient] = useState(false);
    // suiviBien state removed – tracking is now done inside the edit property page

    const { data: biens = [], isLoading: loading } = useQuery({
        queryKey: ['biens'],
        queryFn: () => apiFetch<Bien[]>('/biens'),
    });

    const { data: globalPricing } = useQuery({
        queryKey: ['settings-pricing'],
        queryFn: () => apiFetch<{ default_prix_m2_finition: number; default_prix_m2_gros_oeuvre: number }>('/settings/pricing'),
    });

    const getEffectivePrice = (bien: Bien, type: 'finition' | 'gros') => {
        if (type === 'finition') {
            if (bien.prix_global_finition && bien.prix_global_finition > 0) return bien.prix_global_finition;
            const rate = bien.prix_par_m2_finition || globalPricing?.default_prix_m2_finition || 9000;
            return bien.surface_m2 * rate;
        } else {
            if (bien.prix_global_non_finition && bien.prix_global_non_finition > 0) return bien.prix_global_non_finition;
            const rate = bien.prix_par_m2_non_finition || globalPricing?.default_prix_m2_gros_oeuvre || 7000;
            return bien.surface_m2 * rate;
        }
    };

    const { data: annexesData = [], isLoading: annexLoading } = useQuery({
        queryKey: ['annex-units', selectedBien?.id],
        queryFn: () => apiFetch<AnnexUnit[]>(`/annex-units?bien_id=${selectedBien?.id}`),
        enabled: !!selectedBien && isAnnexModalOpen,
    });

    const deleteBienMutation = useMutation({
        mutationFn: (id: number) => apiFetch(`/biens/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast.success('Bien supprimé');
            queryClient.invalidateQueries({ queryKey: ['biens'] });
        },
        onError: () => toast.error('Erreur lors de la suppression'),
    });

    const addAnnexMutation = useMutation({
        mutationFn: (body: any) => apiFetch<AnnexUnit>('/annex-units', {
            method: 'POST',
            body: JSON.stringify(body)
        }),
        onSuccess: () => {
            toast.success('Annexe ajoutée');
            setNewAnnex({ type: 'Parking', prix: '', customType: '' });
            setShowOtherType(false);
            setFieldErrors({});
            queryClient.invalidateQueries({ queryKey: ['annex-units', selectedBien?.id] });
            queryClient.invalidateQueries({ queryKey: ['biens'] });
        },
        onError: (err: any) => {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs');
            } else {
                toast.error(err.message || 'Erreur lors de l\'ajout');
            }
        },
    });

    const deleteAnnexMutation = useMutation({
        mutationFn: (id: number) => apiFetch(`/annex-units/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['annex-units', selectedBien?.id] });
            queryClient.invalidateQueries({ queryKey: ['biens'] });
        },
        onError: () => toast.error('Erreur lors de la suppression'),
    });

    const handleDeleteBien = async (id: number) => {
        if (!await confirmDialog('Supprimer ce bien ?')) return;
        deleteBienMutation.mutate(id);
    };

    const openAnnexes = (bien: Bien) => {
        setSelectedBien(bien);
        setIsAnnexModalOpen(true);
    };

    const handleAddAnnex = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBien) return;
        const finalType = newAnnex.type === 'Autre' ? newAnnex.customType : newAnnex.type;
        if (!finalType) {
            toast.error('Veuillez préciser le type d\'annexe');
            return;
        }
        addAnnexMutation.mutate({
            type: finalType,
            bien_id: selectedBien.id,
            prix: parseNumber(newAnnex.prix)
        });
    };

    const handleOpenDetails = (bien: Bien) => {
        setSelectedBien(bien);
        setIsDetailsModalOpen(true);
    };

    const handleOpenAssocClient = async (bien: Bien) => {
        setAssocBien(bien);
        setAssocClientSearch('');
        setAssocClientId('');
        setAssocAvecFinition(false);
        setIsAssocClientModalOpen(true);
        setIsLoadingAssocClients(true);
        try {
            const clients = await apiFetch<any[]>('/clients');
            // Only show clients without an existing bien association
            setAssocClients(clients.filter((c: any) => !c.biens || c.biens.length === 0));
        } catch {
            toast.error('Erreur chargement clients');
        } finally {
            setIsLoadingAssocClients(false);
        }
    };

    const handleBienAssociateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assocBien || !assocClientId) return;
        setIsSubmittingAssocClient(true);
        try {
            const targetClient = assocClients.find(c => String(c.id) === assocClientId);
            if (!targetClient) throw new Error("Client introuvable");

            await apiFetch(`/clients/${assocClientId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...targetClient, // Include required fields (nom, prenom, cin, tel)
                    bien_id: assocBien.id,
                    avec_finition: assocAvecFinition ? 1 : 0
                }),
            });
            toast.success('Client associé au bien !');
            setIsAssocClientModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['biens'] });
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'association.");
        } finally {
            setIsSubmittingAssocClient(false);
        }
    };

    const deleteAnnex = (id: number) => deleteAnnexMutation.mutate(id);

    const filteredBiens = biens.filter(b => {
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            b.id.toString().includes(search) ||
            b.nom?.toLowerCase().includes(search) ||
            b.type_bien?.toLowerCase().includes(search) ||
            b.num_appartement?.toLowerCase().includes(search) ||
            b.statut?.toLowerCase().includes(search) ||
            b.terrain_id?.toString().includes(search) ||
            b.terrain?.nom_projet?.toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        if (filterStatut !== 'all' && b.statut !== filterStatut) return false;
        if (filterTerrain !== 'all' && b.terrain_id?.toString() !== filterTerrain) return false;
        if (filterEtage !== 'all') {
            const bEtage = (b.etage === null || b.etage === undefined) ? 'none' : b.etage.toString();
            if (bEtage !== filterEtage) return false;
        }
        if (filterImmeuble !== 'all' && b.immeuble !== filterImmeuble) return false;

        return true;
    }).sort((a, b) => {
        // 1. Project
        const terrainA = (a.terrain?.nom_projet || '').trim().toLowerCase();
        const terrainB = (b.terrain?.nom_projet || '').trim().toLowerCase();
        if (terrainA !== terrainB) return terrainA.localeCompare(terrainB, 'fr-MA', { numeric: true });

        // 2. Bloc / Groupe (Combining Nom and Groupe to be safe)
        const blockA = (a.nom || a.groupe_habitation || '').trim().toLowerCase();
        const blockB = (b.nom || b.groupe_habitation || '').trim().toLowerCase();
        if (blockA !== blockB) return blockA.localeCompare(blockB, 'fr-MA', { numeric: true });

        // 3. Immeuble (KEEP BUILDINGS TOGETHER)
        const immA = (a.immeuble || '').trim().toLowerCase();
        const immB = (b.immeuble || '').trim().toLowerCase();
        if (immA !== immB) return immA.localeCompare(immB, 'fr-MA', { numeric: true });

        // 4. Etage
        const etageA = a.etage || 0;
        const etageB = b.etage || 0;
        if (etageA !== etageB) return etageA - etageB;

        // 5. N° Appartement (Final fallback)
        const refA = (a.num_appartement || '').trim().toLowerCase();
        const refB = (b.num_appartement || '').trim().toLowerCase();
        return refA.localeCompare(refB, 'fr-MA', { numeric: true });
    });

    const typeBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredBiens.forEach(b => {
            const type = b.type_bien || 'Autre';
            counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [filteredBiens]);

    const resetFilters = () => {
        setSearchTerm('');
        setFilterStatut('all');
        setFilterTerrain('all');
        setFilterEtage('all');
        setFilterImmeuble('all');
    };

    const handleExport = () => {
        if (filteredBiens.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredBiens.map(p => ({
            'ID': p.id,
            'RÉF BLOC': p.num_appartement?.toUpperCase(),
            'TYPE DE BIEN': p.type_bien?.toUpperCase(),
            'ÉTAGE': p.etage || 'RDC',
            'SURFACE (M²)': p.surface_m2,
            'PRIX TOTAL FINITION (DH)': p.prix_global_finition,
            'PRIX TOTAL NON FINITION (DH)': p.prix_global_non_finition,
            'DESCRIPTION': p.description || '',
            'PROJET ASSOCIÉ': p.terrain?.nom_projet || 'N/A'
        }));

        exportToExcel(dataToExport, `biens_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Parc immobilier exporté avec succès");
    };

    return (
        <div className="space-y-6">
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 mx-1"
            >
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <Home className="text-amber-600" size={32} />
                            Parc Immobilier
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">Gestion des unités, blocs et locaux de <span className="text-slate-800 font-semibold">Société les cinq elements</span>.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-medium text-sm border border-slate-200 active:scale-[0.98]"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>

                        <button
                            onClick={() => navigate('/add-property')}
                            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-sm active:scale-[0.98] bg-slate-900 hover:bg-slate-800"
                        >
                            <Plus size={18} />
                            Ajouter Unité
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-6 border-t border-slate-100"
                >
                    <div className="relative lg:col-span-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Recherche..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>

                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Statut: Tous</option>
                        <option value="Libre">Libre</option>
                        <option value="Reserve">Réservé</option>
                        <option value="Vendu">Vendu</option>
                    </select>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Tous les projets</option>
                        {Array.from(new Set(biens.map(b => b.terrain_id).filter(Boolean))).map(tId => {
                            const bien = biens.find(b => b.terrain_id === tId);
                            return (
                                <option key={tId} value={tId?.toString()}>
                                    {bien?.terrain?.nom_projet || `Projet #${tId}`}
                                </option>
                            );
                        })}
                    </select>

                    {/* New Bloc/Immeuble Filter */}
                    <select
                        value={filterImmeuble}
                        onChange={(e) => setFilterImmeuble(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Bloc: Tous</option>
                        {Array.from(new Set(biens.map(b => b.immeuble).filter(Boolean)))
                            .sort((a, b) => (a as string).localeCompare(b as string))
                            .map(imm => <option key={imm} value={imm}>{imm}</option>)}
                    </select>

                    <select
                        value={filterEtage}
                        onChange={(e) => setFilterEtage(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Étage: Tous</option>
                        {Array.from(new Set(biens.map(b => b.etage)))
                            .filter(etage => etage !== null && etage !== undefined)
                            .sort((a, b) => (a as any || 0) - (b as any || 0))
                            .map(etage => (
                                <option key={etage} value={etage?.toString()}>
                                    {etage === 0 ? 'RDC' : `Étage ${etage}`}
                                </option>
                            ))}
                        <option value="none">Sans Étage</option>
                    </select>

                    <button
                        onClick={resetFilters}
                        className="w-full text-slate-400 hover:text-blue-600 text-sm font-medium flex items-center justify-center gap-2 transition border border-slate-100 rounded-lg py-2.5 hover:bg-slate-50"
                    >
                        <X size={14} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 transition-transform duration-300">
                    <div className="hidden"><Layout size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400">
                            {filteredBiens.length !== biens.length ? 'Résultats' : 'Total Unités'}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-slate-800">{filteredBiens.length}</p>
                            {filteredBiens.length !== biens.length && (
                                <p className="text-xs font-medium text-slate-400">/ {biens.length}</p>
                            )}
                        </div>
                        <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-1 text-[8px] font-semibold tracking-tight text-slate-400">
                            {typeBreakdown.map(([type, count]: [string, number], i) => (
                                <React.Fragment key={type}>
                                    {i > 0 && <span className="text-slate-200">/</span>}
                                    <span className="text-slate-600 flex items-center gap-1">
                                        <span className="text-amber-500 font-semibold">{count}</span>
                                        {type}{type.endsWith('s') || type.endsWith('x') ? '' : count > 1 ? 's' : ''}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 transition-transform duration-300">
                    <div className="hidden"><Check size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400">Réservés / Vendus</p>
                        <p className="text-2xl font-bold text-slate-800">{filteredBiens.filter(b => b.statut === 'Reserve' || b.statut === 'Vendu').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 transition-transform duration-300">
                    <div className="hidden"><Boxes size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400">Disponibles</p>
                        <p className="text-2xl font-bold text-slate-800">{filteredBiens.filter(b => b.statut === 'Libre').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 transition-transform duration-300">
                    <div className="hidden"><Landmark size={24} /></div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400">Valeur Stock (Filtré)</p>
                        <p className="text-xl font-semibold text-slate-800 tracking-tight">
                            {formatNumber(filteredBiens.reduce((acc, b) => acc + Number(getEffectivePrice(b, 'finition')), 0))} <span className="text-xs text-slate-400">MAD</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                    <thead
                        className="sticky z-20 bg-white border-b border-slate-200"
                        style={{ top: `${stickyOffset}px` }}
                    >
                        <tr className="">
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Type & N°</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Localisation</th>
                            <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Surface</th>
                            <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Statut</th>
                            <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Réalisation</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Prix Total</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center text-slate-400">Chargement...</td>
                            </tr>
                        ) : filteredBiens.length > 0 ? (
                            filteredBiens.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-600 tracking-tight">
                                                {b.nom ? (
                                                    <span className="text-blue-600 mr-2"><MarkdownText text={b.nom} /></span>
                                                ) : (
                                                    b.type_bien === 'Appartement' ? 'Bloc' : b.type_bien
                                                )}
                                                {b.groupe_habitation ? <> - <MarkdownText text={b.groupe_habitation} /></> : ''}
                                                {b.immeuble ? <> - Imm. <MarkdownText text={b.immeuble} /></> : ''}
                                                {b.etage === 0 ? ' - RDC' : b.etage ? ` - Étage ${b.etage}` : ''}
                                                {b.num_appartement ? <> - N° Appartement <MarkdownText text={b.num_appartement} /></> : ''}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium mt-1">ID: {b.id} {b.nom ? `(${b.type_bien === 'Appartement' ? 'Bloc' : b.type_bien})` : ''}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                            {b.terrain?.nom_projet || `Projet #${b.terrain_id}`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-slate-500 text-xs">{b.surface_m2} m²</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${b.statut === 'Libre' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                b.statut === 'Vendu' ? 'bg-rose-50 text-rose-500 !border-rose-100' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                {b.statut}
                                            </span>
                                            {b.clients && b.clients.length > 0 && b.statut !== 'Libre' && (
                                                <div className="flex flex-col items-center">
                                                    {b.clients.map((c: any) => (
                                                        <span key={c.id} className="text-xs font-medium text-slate-400 tracking-tight whitespace-nowrap">
                                                            <MarkdownText text={`${c.nom} ${c.prenom}`} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                            {/* GO Status Badge */}
                                            <div className="flex items-center gap-2 bg-slate-50/50 px-2.5 py-1.5 rounded-xl border border-slate-100/50">
                                                <span className="text-xs font-semibold text-slate-400 tracking-tight shrink-0">G.O</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${b.gros_oeuvre_pourcentage === 100
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-white text-slate-400 border-slate-100'}`}>
                                                    {b.gros_oeuvre_pourcentage === 100 ? 'Fait' : 'En cours'}
                                                </span>
                                            </div>

                                            {/* FIN Status Badge Always visible */}
                                            <div className="flex items-center gap-2 bg-slate-50/50 px-2.5 py-1.5 rounded-xl border border-slate-100/50">
                                                <span className="text-xs font-semibold text-slate-500 tracking-tight shrink-0">FIN</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${b.finition_pourcentage === 100
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : b.finition_pourcentage > 0
                                                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                        : 'bg-white text-slate-400 border-slate-100'}`}>
                                                    {b.finition_pourcentage === 100 ? 'Fait' : 'En cours'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-semibold text-slate-900 text-xs whitespace-nowrap">{formatNumber(getEffectivePrice(b, 'finition'))} DH</span>
                                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{formatNumber(getEffectivePrice(b, 'gros'))} DH</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <button onClick={() => navigate(`/edit-property/${b.id}`)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleOpenDetails(b)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => openProgressPhotos(b as any)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Photos d'avancement">
                                                <Camera size={16} />
                                            </button>
                                            <button onClick={() => openAnnexes(b)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Annexes">
                                                <Layers size={16} />
                                            </button>
                                            {b.statut === 'Libre' && (
                                                <button
                                                    onClick={() => handleOpenAssocClient(b)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                    title="Associer à un client"
                                                >
                                                    <UserPlus size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteBien(b.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-slate-400">Aucun bien enregistré.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>


            {/* Annex Modal */}
            {isAnnexModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden duration-200 flex flex-col max-h-[90vh] ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                                    <Layers className="text-blue-600" />
                                    Unités Annexes
                                </h3>
                                <p className="text-xs font-medium text-blue-600">POUR BLOC {selectedBien?.num_appartement ? `#${selectedBien.num_appartement}` : ''}</p>
                            </div>
                            <button onClick={() => setIsAnnexModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-8 space-y-6">
                            {/* Add form */}
                            <form onSubmit={handleAddAnnex} className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-slate-600">Type d'annexe</label>
                                    <select
                                        value={newAnnex.type}
                                        onChange={e => {
                                            setNewAnnex({ ...newAnnex, type: e.target.value });
                                            setShowOtherType(e.target.value === 'Autre');
                                        }}
                                        className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.type ? '!border-red-500' : 'border-slate-200'} `}
                                    >
                                        <option value="Parking">Parking</option>
                                        <option value="Cave">Cave / Box</option>
                                        <option value="Magasin">Magasin / Mezzanine</option>
                                        <option value="Terrasse">Terrasse privative</option>
                                        <option value="Autre">Autre (Préciser...)</option>
                                    </select>
                                    {fieldErrors.type && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.type[0]}</p>}
                                </div>
                                {showOtherType && (
                                    <div className="col-span-2 duration-200">
                                        <label className="text-xs font-medium text-blue-600 mb-1 block text-slate-600">Précisez le type</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Jardin, Solarium..."
                                            required
                                            value={newAnnex.customType}
                                            onChange={e => setNewAnnex({ ...newAnnex, customType: e.target.value })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-medium mb-1 block text-slate-600">Prix (DH)</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        required
                                        value={newAnnex.prix}
                                        onChange={e => setNewAnnex({ ...newAnnex, prix: formatNumber(e.target.value) })}
                                        className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.prix ? '!border-red-500' : 'border-slate-200'} `}
                                    />
                                    {fieldErrors.prix && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.prix[0]}</p>}
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" className="w-full h-[38px] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800">
                                        <Plus size={16} /> Ajouter
                                    </button>
                                </div>
                            </form>

                            {/* List */}
                            <div className="space-y-3">
                                {annexLoading ? (
                                    <div className="py-10 text-center"><Loader2 className="animate-spin inline-block text-slate-300" /></div>
                                ) : annexesData.length > 0 ? (
                                    annexesData.map(a => (
                                        <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 group">
                                            <div className="flex items-center gap-3">
                                                <div className="hidden">
                                                    <Boxes size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700 tracking-tight">{a.type}</p>
                                                    <p className="text-xs font-medium text-blue-600">{formatNumber(a.prix)} DH</p>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteAnnex(a.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-400 text-sm py-10">Aucune annexe liée.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                            <button onClick={() => setIsAnnexModalOpen(false)} className="w-full py-2.5 text-white rounded-lg font-medium text-sm bg-slate-900 hover:bg-slate-800">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {isDetailsModalOpen && selectedBien && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg leading-none mb-1">
                                    {selectedBien.nom ? <MarkdownText text={selectedBien.nom} /> : <>Détails Bloc <MarkdownText text={selectedBien.num_appartement} /></>}
                                </h3>
                                <p className="text-xs font-medium text-blue-600">
                                    {selectedBien.type_bien === 'Appartement' ? 'Bloc' : selectedBien.type_bien} {selectedBien.nom ? `(${selectedBien.num_appartement})` : ''} • ID #{selectedBien.id}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Key Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-xs font-medium text-blue-400 mb-1">Prix Total (Fin / Non Fin)</p>
                                    <p className="text-lg font-semibold text-blue-700">{formatNumber(selectedBien.prix_global_finition)} <span className="text-xs text-blue-400">/</span> {formatNumber(selectedBien.prix_global_non_finition)} DH</p>
                                </div>
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <p className="text-xs font-medium text-emerald-400 mb-1">Surface</p>
                                    <p className="text-lg font-semibold text-emerald-700">{selectedBien.surface_m2} m²</p>
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-xs font-medium text-blue-400 mb-1">Statut</p>
                                    <p className="text-lg font-semibold text-blue-700">{selectedBien.statut}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-medium block mb-2 text-slate-600">Localisation & Caractéristiques</label>
                                        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Projet:</span>
                                                <span className="font-semibold text-slate-800"> {selectedBien.terrain?.nom_projet ? `${selectedBien.terrain.nom_projet}` : 'Aucun Projet'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Étage:</span>
                                                <span className="font-semibold text-slate-800">{selectedBien.etage ? `Étage ${selectedBien.etage}` : 'Rez-de-chaussée'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-2">
                                                <span className="text-slate-500">Prix / m²:</span>
                                                <span className="font-semibold text-slate-800">{formatNumber(selectedBien.prix_par_m2_finition)} <span className="text-slate-400">/</span> {formatNumber(selectedBien.prix_par_m2_non_finition)} DH</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedBien.clients && selectedBien.clients.length > 0 && (
                                        <div className="duration-300">
                                            <label className="text-xs font-medium text-emerald-600 block mb-2 text-slate-600">Informations Client</label>
                                            <div className="flex flex-col gap-2">
                                                {selectedBien.clients.map((c: any) => (
                                                    <div key={c.id} className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                        <p className="text-sm font-semibold text-emerald-800"><MarkdownText text={`${c.nom} ${c.prenom}`} /></p>
                                                        <p className="text-xs font-medium text-emerald-600 mt-1">CIN: <MarkdownText text={c.cin} /></p>
                                                        <p className="text-xs font-medium text-emerald-600">Tél: {c.tel}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-medium block mb-2 text-slate-600">Unités Annexes Associées</label>
                                        <button
                                            onClick={() => { setIsDetailsModalOpen(false); openAnnexes(selectedBien); }}
                                            className="w-full p-4 bg-blue-50 border border-dashed border-blue-200 rounded-lg text-left group hover:bg-blue-100 transition-colors"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-semibold text-blue-700">Gérer les Annexes</span>
                                                <Plus size={16} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                            <p className="text-xs text-blue-400 font-medium mt-1">Parkings, Cages, Caves...</p>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium block mb-2 text-slate-600">Notes & Description</label>
                                        <div className="p-4 bg-slate-50 rounded-xl min-h-[100px]">
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                <MarkdownText text={selectedBien.description || 'Aucune description particulière pour cette unité.'} />
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Media Management - Photos */}
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <div className="bg-white border text-left border-slate-200 shadow-sm p-4 rounded-xl">
                                    <MediaManager
                                        modelType="Bien"
                                        modelId={selectedBien.id}
                                        category="photo"
                                        title="Galerie Bien"
                                    />
                                </div>
                                <div className="bg-white border text-left border-slate-200 shadow-sm p-4 rounded-xl mt-4">
                                    <MediaManager
                                        modelType="Bien"
                                        modelId={selectedBien.id}
                                        category="document"
                                        title="Documents & Plans"
                                    />
                                </div>
                            </div>

                            {/* Charges Section */}
                            {(selectedBien.charges_syndic || selectedBien.frais_branchement_eau || selectedBien.frais_branchement_electricite || selectedBien.tva) && (
                                <div className="mt-6">
                                    <label className="text-xs font-medium text-amber-600 block mb-2 text-slate-600">Charges &amp; Frais Annexes</label>
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                                        {selectedBien.charges_syndic && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-amber-700">Syndic (DH/mois):</span>
                                                <span className="font-semibold text-amber-800">{formatNumber(selectedBien.charges_syndic)} DH</span>
                                            </div>
                                        )}
                                        {selectedBien.tva && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-amber-700">TVA:</span>
                                                <span className="font-semibold text-amber-800">{selectedBien.tva}%</span>
                                            </div>
                                        )}
                                        {selectedBien.frais_branchement_eau && (
                                            <div className="flex items-center justify-between text-sm border-t border-amber-100 pt-2">
                                                <span className="text-amber-700">Branchement Eau:</span>
                                                <span className="font-semibold text-amber-800">{formatNumber(selectedBien.frais_branchement_eau)} DH</span>
                                            </div>
                                        )}
                                        {selectedBien.frais_branchement_electricite && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-amber-700">Branchement Élec:</span>
                                                <span className="font-semibold text-amber-800">{formatNumber(selectedBien.frais_branchement_electricite)} DH</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setIsDetailsModalOpen(false)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bien → Client Association Modal */}
            {
                isAssocClientModalOpen && assocBien && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                                        <UserPlus size={16} className="text-amber-500" />
                                        Associer un Client
                                    </h3>
                                    <p className="text-xs font-medium text-amber-600 mt-0.5">
                                        BIEN : <MarkdownText text={assocBien.type_bien === 'Appartement' ? 'Bloc' : assocBien.type_bien} />
                                        {assocBien.immeuble ? <> – Imm. <MarkdownText text={assocBien.immeuble} /></> : ''}
                                        {assocBien.num_appartement ? <> – <MarkdownText text={assocBien.num_appartement} /></> : ''}
                                    </p>
                                </div>
                                <button onClick={() => setIsAssocClientModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleBienAssociateClient} className="p-6 space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher nom, prénom, CIN, tel..."
                                        value={assocClientSearch}
                                        onChange={(e) => setAssocClientSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>

                                {/* Clients list */}
                                <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                                    {isLoadingAssocClients ? (
                                        <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                                            <Loader2 size={16} className="animate-spin" /> Chargement...
                                        </div>
                                    ) : (
                                        <>
                                            {assocClients
                                                .filter(c => {
                                                    const q = assocClientSearch.toLowerCase();
                                                    if (!q) return true;
                                                    return c.nom?.toLowerCase().includes(q) ||
                                                        c.prenom?.toLowerCase().includes(q) ||
                                                        c.cin?.toLowerCase().includes(q) ||
                                                        c.tel?.includes(q) ||
                                                        c.tel_2?.includes(q) ||
                                                        `${c.nom} ${c.prenom}`.toLowerCase().includes(q) ||
                                                        `${c.prenom} ${c.nom}`.toLowerCase().includes(q);
                                                })
                                                .map((c: any) => (
                                                    <label
                                                        key={c.id}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${assocClientId === String(c.id)
                                                            ? 'bg-amber-50 border-amber-400 shadow-sm'
                                                            : 'bg-slate-50 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="assocClient"
                                                            value={c.id}
                                                            checked={assocClientId === String(c.id)}
                                                            onChange={() => setAssocClientId(String(c.id))}
                                                            className="accent-amber-500"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                                <MarkdownText text={`${c.nom} ${c.prenom}`} />
                                                            </p>
                                                            <p className="text-xs text-slate-400 font-medium">
                                                                CIN: <MarkdownText text={c.cin} /> · Tél: {c.tel}
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))}
                                            {assocClients.filter(c => {
                                                const q = assocClientSearch.toLowerCase();
                                                if (!q) return true;
                                                return c.nom?.toLowerCase().includes(q) || c.prenom?.toLowerCase().includes(q) || c.cin?.toLowerCase().includes(q) || c.tel?.includes(q) || c.tel_2?.includes(q) || `${c.nom} ${c.prenom}`.toLowerCase().includes(q) || `${c.prenom} ${c.nom}`.toLowerCase().includes(q);
                                            }).length === 0 && (
                                                    <div className="py-8 text-center text-slate-400 text-sm font-medium">
                                                        Aucun client disponible ou correspondant à la recherche trouvé.
                                                    </div>
                                                )}
                                        </>
                                    )}
                                </div>

                                {/* Avec finition */}
                                {assocClientId && (
                                    <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">Avec Finition ?</p>
                                            <p className="text-xs text-blue-500">Le client souhaite-t-il la finition ?</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={assocAvecFinition}
                                                onChange={e => setAssocAvecFinition(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setIsAssocClientModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition">
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingAssocClient || !assocClientId}
                                        className="flex-[2] px-4 py-2 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition bg-slate-900 hover:bg-slate-800"
                                    >
                                        {isSubmittingAssocClient ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Associer</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Properties;
