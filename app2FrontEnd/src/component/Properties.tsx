import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, Loader2, Trash2, Layout, Boxes, X, Check, Layers, Landmark, Download, Edit2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


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
    num_appartement: string;
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
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState<string>('all');
    const [filterTerrain, setFilterTerrain] = useState<string>('all');
    const [filterEtage, setFilterEtage] = useState<string>('all');

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAnnexModalOpen, setIsAnnexModalOpen] = useState(false);
    const [selectedBien, setSelectedBien] = useState<Bien | null>(null);
    const [newAnnex, setNewAnnex] = useState({ type: 'Parking', prix: '', customType: '' });
    const [showOtherType, setShowOtherType] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
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

    const handleDeleteBien = (id: number) => {
        if (!window.confirm('Supprimer ce bien ?')) return;
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
        if (filterEtage !== 'all' && b.etage?.toString() !== filterEtage) return false;

        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterStatut('all');
        setFilterTerrain('all');
        setFilterEtage('all');
    };

    const handleExport = () => {
        if (filteredBiens.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredBiens.map(p => ({
            'ID': p.id,
            'RÉF UNITÉ': p.num_appartement?.toUpperCase(),
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
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 italic uppercase tracking-tighter">
                            <Home className="text-indigo-600" size={18} />
                            Parc Immobilier
                        </h2>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Gérez vos unités, appartements et locaux.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-bold text-xs uppercase tracking-widest"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            Excel
                        </button>

                        <button
                            onClick={() => navigate('/add-property')}
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200"
                        >
                            <Plus size={16} />
                            Ajouter Unité
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-50">
                    <div className="relative lg:col-span-1">
                        <Layout className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={14} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="all">Statut: Tous</option>
                        <option value="Libre">Libre</option>
                        <option value="Reserve">Réservé</option>
                        <option value="Vendu">Vendu</option>
                    </select>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 font-medium"
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

                    <select
                        value={filterEtage}
                        onChange={(e) => setFilterEtage(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
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
                    </select>

                    <button
                        onClick={resetFilters}
                        className="flex items-center justify-center gap-1 text-gray-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-widest transition-colors border border-gray-50 rounded-xl h-10"
                    >
                        <X size={14} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Layout size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Unités</p>
                        <p className="text-xl font-black text-gray-800">{biens.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Check size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vendus / Réservés</p>
                        <p className="text-xl font-black text-gray-800">{biens.filter(b => b.statut === 'Reserve' || b.statut === 'Vendu').length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Boxes size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disponibles</p>
                        <p className="text-xl font-black text-gray-800">{biens.filter(b => b.statut === 'Libre').length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><Landmark size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valeur Stock (Finition / Non Finition)</p>
                        <p className="text-xl font-black text-gray-800">
                            {formatNumber(biens.reduce((acc, b) => acc + Number(b.prix_global_finition), 0))} <span className="text-xs uppercase text-gray-400">/</span> {formatNumber(biens.reduce((acc, b) => acc + Number(b.prix_global_non_finition), 0))} <span className="text-xs uppercase">dh</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                        <tr>
                            <th className="px-4 py-2.5">Type & N°</th>
                            <th className="px-4 py-2.5">Localisation</th>
                            <th className="px-4 py-2.5 text-center">Surface</th>
                            <th className="px-4 py-2.5 text-center">Statut</th>
                            <th className="px-4 py-2.5 text-center whitespace-nowrap">Réalisation (GO / FIN)</th>
                            <th className="px-4 py-2.5 text-right">Prix Total (Fin / Non Fin)</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center text-gray-400">Chargement...</td>
                            </tr>
                        ) : filteredBiens.length > 0 ? (
                            filteredBiens.map((b) => (
                                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-800 uppercase tracking-wide">
                                                {b.nom ? (
                                                    <span className="text-indigo-600 mr-2">{b.nom}</span>
                                                ) : (
                                                    b.type_bien
                                                )}
                                                {b.groupe_habitation ? ` - ${b.groupe_habitation}` : ''}
                                                {b.immeuble ? ` - Imm. ${b.immeuble}` : ''}
                                                {b.etage === 0 ? ' - RDC' : b.etage ? ` - Étage ${b.etage}` : ''}
                                                {b.num_appartement ? ` - N° ${b.num_appartement}` : ''}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">ID: {b.id} {b.nom ? `(${b.type_bien})` : ''}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-slate-600 font-bold uppercase whitespace-nowrap">
                                            {b.terrain?.nom_projet || `Projet #${b.terrain_id}`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-slate-500 text-xs">{b.surface_m2} m²</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${b.statut === 'Libre' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                b.statut === 'Vendu' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                {b.statut}
                                            </span>
                                            {b.clients && b.clients.length > 0 && b.statut !== 'Libre' && (
                                                <div className="flex flex-col items-center">
                                                    {b.clients.map((c: any) => (
                                                        <span key={c.id} className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">
                                                            {c.nom} {c.prenom}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                                            {/* GO Status Badge */}
                                            <div className="flex items-center justify-between gap-2 bg-slate-50/50 px-2 py-1 rounded-lg border border-slate-100/50">
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter shrink-0">Gros Œuvre</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${b.gros_oeuvre_pourcentage === 100
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-white text-slate-400 border-slate-100'}`}>
                                                    {b.gros_oeuvre_pourcentage === 100 ? 'Fait' : 'En cours'}
                                                </span>
                                            </div>

                                            {/* FIN Status Badge Always visible */}
                                            <div className="flex items-center justify-between gap-2 bg-slate-50/50 px-2 py-1 rounded-lg border border-slate-100/50 mt-1">
                                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter shrink-0">Finition</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${b.finition_pourcentage === 100
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
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
                                            <span className="font-black text-slate-900 text-xs whitespace-nowrap">{formatNumber(getEffectivePrice(b, 'finition'))} DH</span>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatNumber(getEffectivePrice(b, 'gros'))} DH</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => navigate(`/edit-property/${b.id}`)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Modifier">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleOpenDetails(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Détails">
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => openAnnexes(b)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100" title="Annexes">
                                                <Layers size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteBien(b.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Supprimer">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-gray-400">Aucun bien enregistré.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>


            {/* Annex Modal */}
            {isAnnexModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="text-indigo-600" />
                                    Unités Annexes
                                </h3>
                                <p className="text-[10px] font-bold text-indigo-600">POUR BIEN {selectedBien?.type_bien} #{selectedBien?.num_appartement}</p>
                            </div>
                            <button onClick={() => setIsAnnexModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-8 space-y-6">
                            {/* Add form */}
                            <form onSubmit={handleAddAnnex} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Type d'annexe</label>
                                    <select
                                        value={newAnnex.type}
                                        onChange={e => {
                                            setNewAnnex({ ...newAnnex, type: e.target.value });
                                            setShowOtherType(e.target.value === 'Autre');
                                        }}
                                        className={`w-full px-4 py-2 text-sm rounded-lg border ${fieldErrors.type ? 'border-red-500' : 'border-gray-200'} outline-none font-bold bg-white`}
                                    >
                                        <option value="Parking">Parking</option>
                                        <option value="Cave">Cave / Box</option>
                                        <option value="Magasin">Magasin / Mezzanine</option>
                                        <option value="Terrasse">Terrasse privative</option>
                                        <option value="Autre">Autre (Préciser...)</option>
                                    </select>
                                    {fieldErrors.type && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.type[0]}</p>}
                                </div>
                                {showOtherType && (
                                    <div className="col-span-2 animate-in slide-in-from-top-1 duration-200">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase mb-1 block">Précisez le type</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Jardin, Solarium..."
                                            required
                                            value={newAnnex.customType}
                                            onChange={e => setNewAnnex({ ...newAnnex, customType: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-lg border border-indigo-200 bg-indigo-50/30 outline-none font-bold"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Prix (DH)</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        required
                                        value={newAnnex.prix}
                                        onChange={e => setNewAnnex({ ...newAnnex, prix: formatNumber(e.target.value) })}
                                        className={`w-full px-4 py-2 text-sm rounded-lg border ${fieldErrors.prix ? 'border-red-500' : 'border-gray-200'} outline-none font-bold text-lg`}
                                    />
                                    {fieldErrors.prix && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.prix[0]}</p>}
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" className="w-full h-[38px] bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 flex items-center justify-center gap-2">
                                        <Plus size={16} /> Ajouter
                                    </button>
                                </div>
                            </form>

                            {/* List */}
                            <div className="space-y-3">
                                {annexLoading ? (
                                    <div className="py-10 text-center"><Loader2 className="animate-spin inline-block text-gray-300" /></div>
                                ) : annexesData.length > 0 ? (
                                    annexesData.map(a => (
                                        <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-50 text-indigo-500 rounded-lg">
                                                    <Boxes size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-700 uppercase tracking-tight">{a.type}</p>
                                                    <p className="text-xs font-bold text-indigo-600">{formatNumber(a.prix)} DH</p>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteAnnex(a.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-400 italic text-sm py-10">Aucune annexe liée.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                            <button onClick={() => setIsAnnexModalOpen(false)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {isDetailsModalOpen && selectedBien && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest leading-none mb-1">
                                    {selectedBien.nom ? selectedBien.nom : `Détails Unité ${selectedBien.num_appartement}`}
                                </h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                    {selectedBien.type_bien} {selectedBien.nom ? `(${selectedBien.num_appartement})` : ''} • ID #{selectedBien.id}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                            {/* Key Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Prix Total (Fin / Non Fin)</p>
                                    <p className="text-lg font-black text-indigo-700">{formatNumber(selectedBien.prix_global_finition)} <span className="text-xs text-indigo-400">/</span> {formatNumber(selectedBien.prix_global_non_finition)} DH</p>
                                </div>
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Surface</p>
                                    <p className="text-lg font-black text-emerald-700">{selectedBien.surface_m2} m²</p>
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Statut</p>
                                    <p className="text-lg font-black text-blue-700 uppercase">{selectedBien.statut}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Localisation & Caractéristiques</label>
                                        <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Projet:</span>
                                                <span className="font-bold text-gray-800"> {selectedBien.terrain?.nom_projet ? `${selectedBien.terrain.nom_projet}` : 'Aucun Projet'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Étage:</span>
                                                <span className="font-bold text-gray-800">{selectedBien.etage ? `Étage ${selectedBien.etage}` : 'Rez-de-chaussée'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2">
                                                <span className="text-gray-500">Prix / m²:</span>
                                                <span className="font-bold text-gray-800">{formatNumber(selectedBien.prix_par_m2_finition)} <span className="text-gray-400">/</span> {formatNumber(selectedBien.prix_par_m2_non_finition)} DH</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedBien.clients && selectedBien.clients.length > 0 && (
                                        <div className="animate-in slide-in-from-left-2 duration-300">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase block mb-2 tracking-widest">Informations Client</label>
                                            <div className="flex flex-col gap-2">
                                                {selectedBien.clients.map((c: any) => (
                                                    <div key={c.id} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                        <p className="text-sm font-black text-emerald-800 uppercase">{c.nom} {c.prenom}</p>
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">CIN: {c.cin}</p>
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Tél: {c.tel}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Unités Annexes Associées</label>
                                        <button
                                            onClick={() => { setIsDetailsModalOpen(false); openAnnexes(selectedBien); }}
                                            className="w-full p-4 bg-indigo-50 border border-dashed border-indigo-200 rounded-2xl text-left group hover:bg-indigo-100 transition-colors"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Gérer les Annexes</span>
                                                <Plus size={16} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                                            </div>
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1">Parkings, Cages, Caves...</p>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Notes & Description</label>
                                        <div className="p-4 bg-gray-50 rounded-2xl min-h-[100px]">
                                            <p className="text-xs text-gray-600 italic leading-relaxed">
                                                {selectedBien.description || 'Aucune description particulière pour cette unité.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Charges Section */}
                            {(selectedBien.charges_syndic || selectedBien.frais_branchement_eau || selectedBien.frais_branchement_electricite || selectedBien.tva) && (
                                <div>
                                    <label className="text-[10px] font-black text-amber-600 uppercase block mb-2 tracking-widest">Charges &amp; Frais Annexes</label>
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                                        {selectedBien.charges_syndic && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-amber-700">Syndic (DH/mois):</span>
                                                <span className="font-black text-amber-800">{formatNumber(selectedBien.charges_syndic)} DH</span>
                                            </div>
                                        )}
                                        {selectedBien.tva && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-amber-700">TVA:</span>
                                                <span className="font-black text-amber-800">{selectedBien.tva}%</span>
                                            </div>
                                        )}
                                        {selectedBien.frais_branchement_eau && (
                                            <div className="flex items-center justify-between text-sm border-t border-amber-100 pt-2">
                                                <span className="text-amber-700">Branchement Eau:</span>
                                                <span className="font-black text-amber-800">{formatNumber(selectedBien.frais_branchement_eau)} DH</span>
                                            </div>
                                        )}
                                        {selectedBien.frais_branchement_electricite && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-amber-700">Branchement Élec:</span>
                                                <span className="font-black text-amber-800">{formatNumber(selectedBien.frais_branchement_electricite)} DH</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button onClick={() => setIsDetailsModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-sm">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Properties;
