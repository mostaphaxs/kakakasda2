// src/component/Contractors.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Edit2, X, Check, Building, User, Phone, FileText, Upload, DollarSign, Calendar, Search, MapPin, Download, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import { useProjectFilter } from '../lib/activeProject';

interface Payment {
    id: number;
    amount: number;
    payment_date: string;
    method: string;
    bank_commission: number;
    scan_path: string | null;
    notes: string | null;
}

interface Contractor {
    id: number;
    categorie: string;
    nom_societe: string;
    nom_gerant: string;
    adresse: string;
    tel: string;
    if: string;
    ice: string;
    rc: string;
    rib: string | null;
    montant_global: number;
    payments: Payment[];
    scan_contrat: string | null;
    description: string | null;
    terrain_id: number | null;
    terrain?: { id: number; nom_projet: string; nom_terrain: string };
}

const Contractors = () => {
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = usePersistedState('Contractors.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [filterCategorie, setFilterCategorie] = usePersistedState('Contractors.filterCategorie', 'all');
    const [filterTerrain, setFilterTerrain] = useProjectFilter<string>('Contractors.filterTerrain', 'all', p => String(p.id));
    const [isMainModalOpen, setIsMainModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
    const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
    const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const headerRef = React.useRef<HTMLDivElement>(null);
    const [stickyOffset, setStickyOffset] = React.useState(0);

    React.useEffect(() => {
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


    // Custom category states
    const PREDEFINED_CATEGORIES = [
        "Gros Œuvres", "Étanchéité", "Menuiserie", "Électricité",
        "Plomberie", "Peinture", "Climatisation", "Ascenseur", "Revêtement", "Autre"
    ];
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    const [formData, setFormData] = useState({
        categorie: 'Gros Œuvres',
        nom_societe: '',
        nom_gerant: '',
        adresse: '',
        tel: '',
        if: '',
        ice: '',
        rc: '',
        rib: '',
        montant_global: '',
        description: '',
        terrain_id: '',
    });

    const [paymentData, setPaymentData] = useState({
        amount: '',
        payment_date: new Date().toLocaleDateString('fr-MA'),
        method: 'Chèque',
        reference_no: '',
        bank_name: '',
        bank_commission: '',
        notes: '',
    });

    const fetchTerrains = async () => {
        try {
            const data = await apiFetch<any[]>('/terrains');
            setTerrains(data);
        } catch (err: any) {
            console.error('Error fetching terrains:', err);
        }
    };

    const fetchContractors = async () => {
        try {
            const data = await apiFetch<Contractor[]>('/contractors');
            setContractors(data);
            return data;
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des entreprises');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const filteredContractors = contractors.filter(c => {
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            c.id.toString().includes(search) ||
            c.nom_societe?.toLowerCase().includes(search) ||
            c.nom_gerant?.toLowerCase().includes(search) ||
            c.tel.includes(search) ||
            c.categorie?.toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        if (filterCategorie !== 'all' && c.categorie !== filterCategorie) return false;
        if (filterTerrain !== 'all' && c.terrain_id?.toString() !== filterTerrain) return false;

        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterCategorie('all');
        setFilterTerrain('all');
    };

    const handleExport = () => {
        if (filteredContractors.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredContractors.map(c => {
            const totalVerse = c.payments.reduce((acc, p) => acc + (Number(p.amount) - Number(p.bank_commission || 0)), 0);
            return {
                'ID': c.id,
                'CATÉGORIE': c.categorie?.toUpperCase(),
                'SOCIÉTÉ': c.nom_societe?.toUpperCase(),
                'GÉRANT': c.nom_gerant?.toUpperCase(),
                'TÉLÉPHONE': c.tel,
                'PROJET LIÉ': c.terrain?.nom_projet || 'N/A',
                'MARCHÉ GLOBAL (DH)': c.montant_global,
                'TOTAL VERSÉ (DH)': totalVerse,
                'RESTE À PAYER (DH)': c.montant_global - totalVerse,
                'IDENTIFIANT FISCAL': c.if || '',
                'ICE': c.ice || '',
                'RC': c.rc || ''
            };
        });

        exportToExcel(dataToExport, `entreprises_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Liste des entreprises exportée avec succès");
    };

    useEffect(() => {
        fetchContractors();
        fetchTerrains();
    }, []);

    const handleOpenModal = (contractor: Contractor | null = null) => {
        if (contractor) {
            setEditingContractor(contractor);

            const isPredefined = PREDEFINED_CATEGORIES.includes(contractor.categorie);
            setIsCustomCategory(!isPredefined);
            setCustomCategory(isPredefined ? '' : contractor.categorie);

            setFormData({
                categorie: isPredefined ? contractor.categorie : 'Autre',
                nom_societe: contractor.nom_societe,
                nom_gerant: contractor.nom_gerant,
                adresse: contractor.adresse,
                tel: contractor.tel,
                if: contractor.if || '',
                ice: contractor.ice || '',
                rc: contractor.rc || '',
                rib: contractor.rib || '',
                montant_global: formatNumber(String(contractor.montant_global)),
                description: contractor.description || '',
                terrain_id: contractor.terrain_id ? String(contractor.terrain_id) : '',
            });
        } else {
            setEditingContractor(null);
            setIsCustomCategory(false);
            setCustomCategory('');
            setFormData({
                categorie: 'Gros Œuvres',
                nom_societe: '',
                nom_gerant: '',
                adresse: '',
                tel: '',
                if: '',
                ice: '',
                rc: '',
                rib: '',
                montant_global: '',
                description: '',
                terrain_id: '',
            });
        }
        setContractFile(null);
        setIsMainModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();

            const finalCategory = formData.categorie === 'Autre' && customCategory.trim() !== ''
                ? customCategory.trim()
                : formData.categorie;

            const submitData = {
                ...formData,
                categorie: finalCategory,
                montant_global: parseNumber(formData.montant_global)
            };

            Object.entries(submitData).forEach(([key, value]) => data.append(key, String(value)));
            if (contractFile) data.append('scan_contrat', contractFile);

            if (editingContractor) {
                data.append('_method', 'PUT');
                await apiFetch(`/contractors/${editingContractor.id}`, {
                    method: 'POST',
                    body: data,
                });
            } else {
                await apiFetch('/contractors', {
                    method: 'POST',
                    body: data,
                });
            }

            toast.success(editingContractor ? 'Entreprise mise à jour' : 'Entreprise ajoutée');
            setIsMainModalOpen(false);
            setFieldErrors({});
            fetchContractors();
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs dans le formulaire');
            } else {
                toast.error(err.message || 'Erreur lors de l\'enregistrement');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog('Supprimer cette entreprise ?')) return;
        try {
            await apiFetch(`/contractors/${id}`, { method: 'DELETE' });
            toast.success('Entreprise supprimée');
            setContractors(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleOpenPaymentModal = (contractor: Contractor, payment?: any) => {
        setSelectedContractor(contractor);
        if (payment) {
            setEditingPaymentId(payment.id);
            setPaymentData({
                amount: formatNumber(String(payment.amount)),
                payment_date: payment.payment_date.split('T')[0].split(' ')[0],
                method: payment.method,
                reference_no: payment.reference_no || '',
                bank_name: payment.bank_name || '',
                bank_commission: payment.bank_commission ? formatNumber(String(payment.bank_commission)) : '',
                notes: payment.notes || '',
            });
        } else {
            setEditingPaymentId(null);
            setPaymentData({
                amount: '',
                payment_date: new Date().toLocaleDateString('fr-MA'),
                method: 'Chèque',
                reference_no: '',
                bank_name: '',
                bank_commission: '',
                notes: '',
            });
        }
        setPaymentFile(null);
        setIsPaymentModalOpen(true);
    };

    const handleOpenDetails = (contractor: Contractor) => {
        setSelectedContractor(contractor);
        setIsDetailsModalOpen(true);
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContractor) return;
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('payable_id', String(selectedContractor.id));
            data.append('payable_type', 'App\\Models\\Contractor');
            data.append('amount', String(parseNumber(paymentData.amount)));
            data.append('payment_date', paymentData.payment_date);
            data.append('method', paymentData.method);
            data.append('reference_no', paymentData.reference_no);
            data.append('bank_name', paymentData.bank_name);
            data.append('bank_commission', String(parseNumber(paymentData.bank_commission)));
            data.append('notes', paymentData.notes);
            if (paymentFile) {
                data.append('scan_path', paymentFile);
            }
            await apiFetch(editingPaymentId ? `/contractor-payments/${editingPaymentId}` : '/contractor-payments', {
                method: 'POST',
                body: data,
                headers: editingPaymentId ? { 'X-HTTP-Method-Override': 'PUT' } : {}
            });

            toast.success(editingPaymentId ? 'Avancement mis à jour' : 'Avancement ajouté');
            setIsPaymentModalOpen(false);
            const updatedContractors = await fetchContractors();
            // Redirect to details with fresh data
            if (selectedContractor) {
                const freshContractor = updatedContractors.find((c: any) => c.id === selectedContractor.id);
                if (freshContractor) {
                    setSelectedContractor(freshContractor);
                }
                setIsDetailsModalOpen(true);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'ajout de l\'avancement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!await confirmDialog('Supprimer cet avancement ?')) return;
        try {
            await apiFetch(`/contractor-payments/${paymentId}`, { method: 'DELETE' });
            toast.success('Avancement supprimé');
            fetchContractors();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    return (
        <div className="space-y-6">
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 mx-1"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                            <Building className="text-slate-400 flex-shrink-0" size={26} />
                            Entreprises de Construction
                        </h2>
                        <p className="text-slate-500 text-sm">Gérez vos prestataires et le suivi de leurs paiements.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition font-medium"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg transition font-medium shadow-sm text-sm bg-slate-900 hover:bg-slate-800"
                        >
                            <Plus size={18} />
                            <span>Nouvelle Entreprise</span>
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-slate-50">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher (Nom, Gérant, Tél...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>

                    <select
                        value={filterCategorie}
                        onChange={(e) => setFilterCategorie(e.target.value)}
                        className="cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Catégorie: Toutes</option>
                        {PREDEFINED_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Projet lié: Tous</option>
                        {terrains.map(t => (
                            <option key={t.id} value={t.id.toString()}>
                                {t.nom_projet || `Projet #${t.id}`}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={resetFilters}
                        className="flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 font-medium text-xs transition-colors border border-slate-50 rounded-lg py-2"
                    >
                        <X size={16} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                    <thead
                        className="sticky z-20 bg-white border-b border-slate-200"
                        style={{ top: `${stickyOffset}px` }}
                    >
                        <tr>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Société</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Gérant / Contact</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Montant Global</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Total Versé</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Reste à Payer</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <Loader2 className="animate-spin inline-block mb-2 text-slate-300" size={32} />
                                    <p className="text-slate-400">Chargement...</p>
                                </td>
                            </tr>
                        ) : filteredContractors.length > 0 ? (
                            filteredContractors.map((c) => {
                                const totalPaid = c.payments.reduce((acc, p) => acc + (Number(p.amount) - Number(p.bank_commission || 0)), 0);
                                const remaining = c.montant_global - totalPaid;
                                return (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{c.nom_societe}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400 font-medium">{c.categorie}</span>
                                                    {c.terrain && (
                                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">
                                                            Projet: {c.terrain.nom_projet}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-600 font-medium flex items-center gap-1"><User size={12} className="text-slate-400" /> {c.nom_gerant}</span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Phone size={12} className="text-slate-400" /> {c.tel}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                            {formatNumber(c.montant_global)} DH
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                            {formatNumber(totalPaid)} DH
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-rose-500">
                                            {formatNumber(remaining)} DH
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center transition-opacity justify-end gap-0.5">
                                                <button onClick={() => handleOpenDetails(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                                    <FileText size={16} />
                                                </button>
                                                <button onClick={() => handleOpenPaymentModal(c)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors" title="Nouvelle Avance">
                                                    <Plus size={12} /> Avance
                                                </button>
                                                <button onClick={() => handleOpenModal(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-slate-400">Aucune entreprise enregistrée pour le moment.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Main Modal (Add/Edit) */}
            {isMainModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                            <h3 className="font-semibold text-slate-800 text-base">
                                {editingContractor ? 'Modifier Société' : 'Nouvelle Société'}
                            </h3>
                            <button onClick={() => setIsMainModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Catégorie</label>
                                    <select
                                        value={formData.categorie}
                                        onChange={e => {
                                            setFormData({ ...formData, categorie: e.target.value });
                                            if (e.target.value === 'Autre') {
                                                setIsCustomCategory(true);
                                            } else {
                                                setIsCustomCategory(false);
                                                setCustomCategory('');
                                            }
                                        }}
                                        className={`w-full ${fieldErrors.categorie ? '!border-red-500' : 'border-slate-200'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                    >
                                        <option value="Gros Œuvres">Gros Œuvres</option>
                                        <option value="Étanchéité">Étanchéité</option>
                                        <option value="Menuiserie">Menuiserie</option>
                                        <option value="Électricité">Électricité</option>
                                        <option value="Plomberie">Plomberie</option>
                                        <option value="Peinture">Peinture</option>
                                        <option value="Climatisation">Climatisation</option>
                                        <option value="Ascenseur">Ascenseur</option>
                                        <option value="Revêtement">Revêtement</option>
                                        <option value="Autre">Autre...</option>
                                    </select>
                                    {isCustomCategory && (
                                        <input
                                            type="text"
                                            placeholder="Préciser la catégorie..."
                                            required
                                            value={customCategory}
                                            onChange={e => setCustomCategory(e.target.value)}
                                            className="w-full mt-2 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    )}
                                    {fieldErrors.categorie && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.categorie[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Terrain / Projet lié</label>
                                    <select
                                        value={formData.terrain_id}
                                        onChange={e => setFormData({ ...formData, terrain_id: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="">Aucun projet spécifique</option>
                                        {terrains.map(t => (
                                            <option key={t.id} value={t.id}>{t.nom_projet}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Nom Société</label>
                                    <input type="text" required value={formData.nom_societe} onChange={e => setFormData({ ...formData, nom_societe: e.target.value })} className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.nom_societe ? '!border-red-500' : 'border-slate-200'} `} />
                                    {fieldErrors.nom_societe && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.nom_societe[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Gérant</label>
                                    <input type="text" required value={formData.nom_gerant} onChange={e => setFormData({ ...formData, nom_gerant: e.target.value })} className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.nom_gerant ? '!border-red-500' : 'border-slate-200'} `} />
                                    {fieldErrors.nom_gerant && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.nom_gerant[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Téléphone</label>
                                    <input type="text" required value={formData.tel} onChange={e => setFormData({ ...formData, tel: e.target.value })} className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.tel ? '!border-red-500' : 'border-slate-200'} `} />
                                    {fieldErrors.tel && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.tel[0]}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Adresse Siège</label>
                                    <textarea
                                        required
                                        value={formData.adresse}
                                        onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                                        dir="auto"
                                        className={`w-full ${fieldErrors.adresse ? '!border-red-500' : 'border-slate-200'} resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                    />
                                    {fieldErrors.adresse && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.adresse[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Description / Spécificités</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={`w-full ${fieldErrors.description ? '!border-red-500' : 'border-slate-200'} resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`} placeholder="Détails contractuels..." />
                                    {fieldErrors.description && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.description[0]}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                            <Banknote size={12} className="mr-2" /> RIB (Compte Bancaire)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.rib}
                                            onChange={e => setFormData({ ...formData, rib: e.target.value })}
                                            className={`w-full ${fieldErrors.rib ? '!border-red-500' : 'border-slate-200'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                            placeholder="RIB"
                                        />
                                        {fieldErrors.rib && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.rib[0]}</p>}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-slate-600">I.F</label>
                                            <input type="text" value={formData.if} onChange={e => setFormData({ ...formData, if: e.target.value })} className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.if ? '!border-red-500' : 'border-slate-200'} `} />
                                            {fieldErrors.if && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.if[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-slate-600">I.C.E</label>
                                            <input type="text" value={formData.ice} onChange={e => setFormData({ ...formData, ice: e.target.value })} className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.ice ? '!border-red-500' : 'border-slate-200'} `} />
                                            {fieldErrors.ice && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.ice[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-slate-600">R.C</label>
                                            <input type="text" value={formData.rc} onChange={e => setFormData({ ...formData, rc: e.target.value })} className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.rc ? '!border-red-500' : 'border-slate-200'} `} />
                                            {fieldErrors.rc && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.rc[0]}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Marché (DH)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                                            <input type="text" required value={formData.montant_global} onChange={e => setFormData({ ...formData, montant_global: formatNumber(e.target.value) })} className={`w-full ${fieldErrors.montant_global ? '!border-red-500' : 'border-slate-200'} pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`} />
                                        </div>
                                        {fieldErrors.montant_global && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.montant_global[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Scan Contrat</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={e => setContractFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="contract-upload"
                                        />
                                        <label
                                            htmlFor="contract-upload"
                                            className={`w-full flex items-center gap-2 px-3 py-2 bg-blue-50/50 border border-dashed ${fieldErrors.scan_contrat ? '!border-red-500' : 'border-blue-200'} rounded-xl hover:bg-blue-100 hover:border-blue-400 cursor-pointer transition`}
                                        >
                                            <Upload size={14} className="text-blue-500" />
                                            <span className="text-xs font-medium text-blue-700 truncate">{contractFile ? contractFile.name : 'Uploader'}</span>
                                        </label>
                                        {fieldErrors.scan_contrat && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.scan_contrat[0]}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setIsMainModalOpen(false)} className="flex-1 px-6 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-4 py-2.5 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-sm bg-slate-900 hover:bg-slate-800"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Enregistrer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal (Add Advance) */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-xs">{editingPaymentId ? 'Modifier l\'Avancement' : 'Nouvel Avancement'}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Pour: {selectedContractor?.nom_societe}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleAddPayment} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Montant Avance (DH)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                    <input type="text" required value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: formatNumber(e.target.value) })} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Date Règlement</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            required
                                            value={paymentData.payment_date}
                                            onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                            className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="JJ/MM/AAAA"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Mode de Paiement</label>
                                    <select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                        <option value="Chèque">Chèque</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Espèce">Espèce</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                            </div>

                            {paymentData.method !== 'Espèce' && (
                                <div className="grid grid-cols-2 gap-4 duration-200">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">N° Référence</label>
                                        <input type="text" value={paymentData.reference_no} onChange={e => setPaymentData({ ...paymentData, reference_no: e.target.value })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="N° Chèque/Virement" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Banque</label>
                                        <input type="text" value={paymentData.bank_name} onChange={e => setPaymentData({ ...paymentData, bank_name: e.target.value })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Nom de la banque" />
                                    </div>
                                    <div className="col-span-2 space-y-4">
                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-emerald-800 leading-none">Net en compte (DH)</span>
                                            <span className="text-xl font-semibold text-emerald-600 font-mono">
                                                {(parseNumber(paymentData.amount) - parseNumber(paymentData.bank_commission)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                                            </span>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-rose-500 mb-1 text-slate-600">Commission Bancaire (DH)</label>
                                            <input
                                                type="text"
                                                value={paymentData.bank_commission}
                                                onChange={e => setPaymentData({ ...paymentData, bank_commission: formatNumber(e.target.value) })}
                                                className="w-full !border-rose-100 text-rose-600 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Justificatif / Reçu (Image ou PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={e => setPaymentFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="payment-upload"
                                />
                                <label
                                    htmlFor="payment-upload"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50/30 border border-dashed border-emerald-200 rounded-xl hover:bg-emerald-50 cursor-pointer transition group"
                                >
                                    <Upload size={16} className="text-emerald-500 transition-transform" />
                                    <span className="text-xs font-medium text-emerald-700 truncate">{paymentFile ? paymentFile.name : 'Choisir un fichier'}</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Observations / Notes</label>
                                <textarea value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Notes complémentaires..." />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-sm bg-slate-900 hover:bg-slate-800"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Valider l\'avancement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {isDetailsModalOpen && selectedContractor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg leading-none mb-1">{selectedContractor.nom_societe}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-slate-400">Fiche Entreprise #{selectedContractor.id} • {selectedContractor.categorie}</p>
                                    {selectedContractor.terrain && (
                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">
                                            Projet: {selectedContractor.terrain.nom_projet}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-0.5">
                                <button onClick={() => { setIsDetailsModalOpen(false); handleOpenModal(selectedContractor); }} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-xs font-medium text-blue-400 mb-1">Marché Global</p>
                                    <p className="text-lg font-semibold text-blue-700">{formatNumber(selectedContractor.montant_global)} DH</p>
                                </div>
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <p className="text-xs font-medium text-emerald-400 mb-1">Total Versé</p>
                                    <p className="text-lg font-semibold text-emerald-700">
                                        {formatNumber(selectedContractor.payments.reduce((acc, p) => acc + (Number(p.amount) - Number(p.bank_commission || 0)), 0))} DH
                                    </p>
                                </div>
                                <div className="p-4 bg-rose-50 border !border-rose-100 rounded-xl">
                                    <p className="text-xs font-medium text-rose-400 mb-1">Reste à Payer</p>
                                    <p className="text-lg font-semibold text-rose-700">
                                        {formatNumber(selectedContractor.montant_global - selectedContractor.payments.reduce((acc, p) => acc + (Number(p.amount) - Number(p.bank_commission || 0)), 0))} DH
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium block mb-1 text-slate-600">Informations de Contact</label>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-slate-600">Gérant: <span className="font-bold">{selectedContractor.nom_gerant}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone size={14} className="text-slate-400" />
                                                <span className="text-slate-600 font-semibold">{selectedContractor.tel}</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin size={14} className="text-slate-400 mt-1" />
                                                <span className="text-slate-600">{selectedContractor.adresse}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium block mb-1 text-slate-600">Identifiants Fiscaux & Bancaires</label>
                                        <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                                            <p className="text-xs font-medium text-slate-600 flex justify-between"><span>I.F:</span> <span className="text-blue-600">{selectedContractor.if || '—'}</span></p>
                                            <p className="text-xs font-medium text-slate-600 flex justify-between"><span>I.C.E:</span> <span className="text-blue-600">{selectedContractor.ice || '—'}</span></p>
                                            <p className="text-xs font-medium text-slate-600 flex justify-between"><span>R.C:</span> <span className="text-blue-600">{selectedContractor.rc || '—'}</span></p>
                                            <p className="text-xs font-medium text-slate-500 flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition hover:border-emerald-200 group">
                                                <span className="flex items-center gap-2"><Banknote size={12} className="text-slate-400 group-hover:text-emerald-500" /> RIB:</span>
                                                <span className="text-emerald-600 font-mono text-xs font-semibold">{selectedContractor.rib || '—'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium block mb-1 text-slate-600">Documents & Notes</label>
                                        <div className="space-y-2">
                                            {selectedContractor.scan_contrat && (
                                                <button
                                                    onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedContractor.scan_contrat}`))}
                                                    className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors w-full"
                                                >
                                                    <FileText size={16} />
                                                    <span className="text-xs font-semibold">Voir le Contrat</span>
                                                </button>
                                            )}
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-xs font-medium text-slate-400 mb-1">Description</p>
                                                <p className="text-xs text-slate-600 leading-relaxed">{selectedContractor.description || 'Aucune description fournie.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <label className="text-xs font-medium text-slate-600">Historique des Avancements</label>
                                    <button onClick={() => handleOpenPaymentModal(selectedContractor)} className="text-xs font-semibold text-emerald-600 hover:underline">
                                        + Ajouter Avance
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedContractor.payments && selectedContractor.payments.length > 0 ? (
                                        selectedContractor.payments.map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group/pay">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm border border-slate-200">
                                                        <DollarSign size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{formatNumber(p.amount)} DH</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs text-slate-400 font-medium">{p.payment_date} — {p.method}</p>
                                                            {p.bank_commission > 0 && (
                                                                <div className="flex items-center gap-1.5 ml-2">
                                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 !border-rose-100 ring-1 ring-inset ring-rose-600/20">
                                                                        COMM.: {formatNumber(p.bank_commission)} DH
                                                                    </span>
                                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                                        NET: {formatNumber(Number(p.amount) - Number(p.bank_commission))} DH
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {p.notes && <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-slate-700 bg-white ring-1 ring-inset ring-slate-600/20">{p.notes}</span>}
                                                    <div className="flex items-center opacity-0 group-hover/pay:opacity-100 transition-opacity justify-end gap-0.5">
                                                        {p.scan_path && (
                                                            <button
                                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${p.scan_path}`))}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                                title="Voir le scan"
                                                            >
                                                                <FileText size={14} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleOpenPaymentModal(selectedContractor, p)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeletePayment(p.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-slate-400 text-xs py-4">Aucun avancement enregistré.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setIsDetailsModalOpen(false)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Contractors;
