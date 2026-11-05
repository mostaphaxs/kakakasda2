// src/component/Charges.tsx
import React, { useState, useEffect } from 'react';
import { WalletCards, Plus, Loader2, Trash2, Edit2, X, Check, Calendar as CalendarIcon, TrendingDown, Search, Download, Banknote, FileText, Sparkles, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { analyzeInvoicePremium } from '../lib/gemini';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';

interface Charge {
    id: number;
    loyer_bureau: number;
    loyer_bureau_ref: string | null;
    loyer_bureau_scan: string | null;
    fournitures_bureau: number;
    fournitures_bureau_ref: string | null;
    fournitures_bureau_scan: string | null;
    employes_bureau: number;
    employes_bureau_ref: string | null;
    employes_bureau_scan: string | null;
    impots: number;
    impots_ref: string | null;
    impots_scan: string | null;
    gasoil: number;
    gasoil_ref: string | null;
    gasoil_scan: string | null;
    periode: string;
    terrain_id: number | null;
    rib: string | null;
    terrain?: { id: number; nom_projet: string; nom_terrain: string };
}

const FieldWithDoc = ({ title, fieldName, color, formData, setFormData, onAIScan, isAnalyzingField }: any) => {
    const focusClass = color === 'emerald' ? 'focus:ring-emerald-500' : (color === 'rose' ? 'focus:ring-rose-500' : 'focus:ring-blue-500');
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-200 transition-colors">
            <div className="flex justify-between items-center mb-3">
                <label className="block text-xs items-center gap-2 font-medium text-slate-600">{title}</label>
                {formData[`${fieldName}_scan`] instanceof File && (
                    <button
                        type="button"
                        onClick={() => onAIScan(fieldName)}
                        disabled={isAnalyzingField === fieldName}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition border border-blue-100"
                    >
                        {isAnalyzingField === fieldName ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        <span className="text-xs font-semibold">{isAnalyzingField === fieldName ? '...' : 'IA Scan'}</span>
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-2.5">
                <input
                    type="text"
                    placeholder={`Montant`}
                    value={formData[fieldName]}
                    onChange={e => setFormData({ ...formData, [fieldName]: formatNumber(e.target.value) })}
                    className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${focusClass} `}
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ref :"
                        value={formData[`${fieldName}_ref`]}
                        onChange={e => setFormData({ ...formData, [`${fieldName}_ref`]: e.target.value })}
                        className={`flex-[3] pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${focusClass} `}
                    />
                    <label className="flex-[2] flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 cursor-pointer hover:bg-slate-100 transition-colors shrink-0 overflow-hidden">
                        <span className={`text-xs font-semibold truncate text-center w-full ${formData[`${fieldName}_scan`] ? 'text-blue-600' : 'text-slate-400'}`}>
                            {formData[`${fieldName}_scan`] instanceof File ? "Nouv Scan ✔" : (formData[`${fieldName}_scan`] ? 'Doc ✔' : '+ Joindre')}
                        </span>
                        <input
                            type="file"
                            onChange={e => {
                                const f = e.target.files?.[0];
                                setFormData({ ...formData, [`${fieldName}_scan`]: f || null });
                            }}
                            className="hidden"
                            accept="image/*,application/pdf"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

const DetailLine = ({ label, field, charge }: any) => {
    const value = charge[field];
    const ref = charge[`${field}_ref`];
    const scan = charge[`${field}_scan`];

    return (
        <div className="flex flex-col mb-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold">{label}:</span>
                <span className="font-semibold text-slate-800">{formatNumber(value)} DH</span>
            </div>
            {(ref || scan) && (
                <div className="flex justify-between items-center mt-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-xs font-mono font-medium text-slate-400 break-all">Ref: {ref || '-'}</span>
                    {scan && (
                        <button type="button" onClick={() => openExternal(`${STORAGE_BASE}/${scan}`)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors whitespace-nowrap">
                            <FileText size={10} /> OUV
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const Charges = () => {
    const [charges, setCharges] = useState<Charge[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = usePersistedState('Charges.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [filterTerrain, setFilterTerrain] = usePersistedState('Charges.filterTerrain', 'all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
    const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCharge, setEditingCharge] = useState<Charge | null>(null);

    const [formData, setFormData] = useState<any>({
        loyer_bureau: '', loyer_bureau_ref: '', loyer_bureau_scan: null,
        fournitures_bureau: '', fournitures_bureau_ref: '', fournitures_bureau_scan: null,
        employes_bureau: '', employes_bureau_ref: '', employes_bureau_scan: null,
        impots: '', impots_ref: '', impots_scan: null,
        gasoil: '', gasoil_ref: '', gasoil_scan: null,
        periode: new Date().toLocaleDateString('fr-MA'),
        terrain_id: '',
        rib: '',
    });

    const [isAnalyzingField, setIsAnalyzingField] = useState<string | null>(null);

    const handleFieldAIScan = async (fieldName: string) => {
        const file = formData[`${fieldName}_scan`];
        if (!file || !(file instanceof File)) return;

        setIsAnalyzingField(fieldName);
        try {
            const result = await analyzeInvoicePremium(file, []);

            if (result && typeof result === 'object') {
                setFormData((prev: any) => ({
                    ...prev,
                    [fieldName]: result.amount ? formatNumber(String(result.amount)) : prev[fieldName],
                    [`${fieldName}_ref`]: result.invoice_no || prev[`${fieldName}_ref`]
                }));

                if (result.anomaly_detected) {
                    toast.error(`Alerte IA : ${result.anomaly_description}`, { duration: 6000 });
                }

                toast.success("Données extraites !");
            }
        } catch (e) {
            console.error(e);
            toast.error("Échec de l'analyse IA");
        } finally {
            setIsAnalyzingField(null);
        }
    };

    const fetchTerrains = async () => {
        try {
            const data = await apiFetch<any[]>('/terrains');
            setTerrains(data);
        } catch (err: any) {
            console.error('Error fetching terrains:', err);
        }
    };

    const fetchCharges = async () => {
        try {
            const data = await apiFetch<Charge[]>('/charges');
            setCharges(data);
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des charges');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCharges();
        fetchTerrains();
    }, []);

    const handleOpenModal = (charge: Charge | null = null) => {
        if (charge) {
            setEditingCharge(charge);
            setFormData({
                loyer_bureau: formatNumber(String(charge.loyer_bureau)),
                loyer_bureau_ref: charge.loyer_bureau_ref || '',
                loyer_bureau_scan: null,
                fournitures_bureau: formatNumber(String(charge.fournitures_bureau)),
                fournitures_bureau_ref: charge.fournitures_bureau_ref || '',
                fournitures_bureau_scan: null,
                employes_bureau: formatNumber(String(charge.employes_bureau)),
                employes_bureau_ref: charge.employes_bureau_ref || '',
                employes_bureau_scan: null,
                impots: formatNumber(String(charge.impots)),
                impots_ref: charge.impots_ref || '',
                impots_scan: null,
                gasoil: formatNumber(String(charge.gasoil)),
                gasoil_ref: charge.gasoil_ref || '',
                gasoil_scan: null,
                periode: charge.periode.split('T')[0],
                terrain_id: charge.terrain_id ? String(charge.terrain_id) : '',
                rib: charge.rib || '',
            });
        } else {
            setEditingCharge(null);
            setFormData({
                loyer_bureau: '', loyer_bureau_ref: '', loyer_bureau_scan: null,
                fournitures_bureau: '', fournitures_bureau_ref: '', fournitures_bureau_scan: null,
                employes_bureau: '', employes_bureau_ref: '', employes_bureau_scan: null,
                impots: '', impots_ref: '', impots_scan: null,
                gasoil: '', gasoil_ref: '', gasoil_scan: null,
                periode: new Date().toLocaleDateString('fr-MA'),
                terrain_id: '',
                rib: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const endpoint = editingCharge ? `/charges/${editingCharge.id}` : '/charges';
            const method = 'POST'; // We use POST for both, spoofing PUT

            const fData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    if (key.endsWith('_scan')) {
                        fData.append(key, value as File);
                    } else if (['loyer_bureau', 'fournitures_bureau', 'employes_bureau', 'impots', 'gasoil'].includes(key)) {
                        fData.append(key, String(parseNumber(value as string)));
                    } else {
                        fData.append(key, value as string);
                    }
                }
            });

            if (editingCharge) {
                fData.append('_method', 'PUT');
            }

            await apiFetch(endpoint, {
                method,
                body: fData,
            });

            toast.success(editingCharge ? 'Charge mise à jour' : 'Charge ajoutée');
            setIsModalOpen(false);
            fetchCharges();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog('Supprimer cette charge ?')) return;
        try {
            await apiFetch(`/charges/${id}`, { method: 'DELETE' });
            toast.success('Charge supprimée');
            setCharges(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleOpenDetails = (charge: Charge) => {
        setSelectedCharge(charge);
        setIsDetailsModalOpen(true);
    };

    const filteredCharges = charges.filter(c => {
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            c.id.toString().includes(search) ||
            c.periode.toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        if (filterTerrain !== 'all' && c.terrain_id?.toString() !== filterTerrain) return false;


        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterTerrain('all');
        setFilterTerrain('all');
    };

    const handleExport = () => {
        if (filteredCharges.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredCharges.map(c => {
            const totalMois = Number(c.loyer_bureau) +
                Number(c.fournitures_bureau) + Number(c.employes_bureau) + Number(c.impots) + Number(c.gasoil);

            return {
                'ID': c.id,
                'MOIS / PÉRIODE': c.periode.toUpperCase(),
                'TOTAL GÉNÉRAL (DH)': totalMois,
                'LOYER BEREAU (DH)': c.loyer_bureau,
                'SALAIRES & STAFF (DH)': c.employes_bureau,
                'FOURNITURES (DH)': c.fournitures_bureau,
                'GASOIL (DH)': c.gasoil,
                'IMPÔTS & TAXES (DH)': c.impots,
                'PROJET AFFECTÉ': c.terrain?.nom_projet || 'FRAIS GÉNÉRAUX'
            };
        });

        exportToExcel(dataToExport, `charges_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Récapitulatif des charges exporté avec succès");
    };

    const totalCharges = filteredCharges.reduce((acc, c) =>
        acc + Number(c.loyer_bureau) +
        Number(c.fournitures_bureau) + Number(c.employes_bureau) + Number(c.impots) + Number(c.gasoil), 0
    );

    const totalLoyer = filteredCharges.reduce((acc, c) => acc + Number(c.loyer_bureau), 0);
    const totalSalaires = filteredCharges.reduce((acc, c) => acc + Number(c.employes_bureau), 0);
    const totalFournitures = filteredCharges.reduce((acc, c) => acc + Number(c.fournitures_bureau), 0);
    const totalImpots = filteredCharges.reduce((acc, c) => acc + Number(c.impots), 0);
    const totalGasoil = filteredCharges.reduce((acc, c) => acc + Number(c.gasoil), 0);

    const monthlyData = filteredCharges.reduce((acc, c) => {
        let monthKey = c.periode;
        if (c.periode.includes('/')) {
            const parts = c.periode.split('/');
            if (parts.length === 3) monthKey = `${parts[1]}/${parts[2]}`;
        } else if (c.periode.includes('-')) {
            const parts = c.periode.split('-');
            if (parts.length >= 2) monthKey = `${parts[1]}/${parts[0]}`;
        }
        if (!acc[monthKey]) {
            acc[monthKey] = { loyer: 0, salaires: 0, fournitures: 0, gasoil: 0, impots: 0, total: 0 };
        }
        acc[monthKey].loyer += Number(c.loyer_bureau);
        acc[monthKey].salaires += Number(c.employes_bureau);
        acc[monthKey].fournitures += Number(c.fournitures_bureau);
        acc[monthKey].gasoil += Number(c.gasoil);
        acc[monthKey].impots += Number(c.impots);
        acc[monthKey].total += Number(c.loyer_bureau) + Number(c.employes_bureau) + Number(c.fournitures_bureau) + Number(c.gasoil) + Number(c.impots);
        return acc;
    }, {} as Record<string, any>);

    return (
        <div className="space-y-6">
            <div className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 mx-1">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                            <WalletCards className="text-slate-400 flex-shrink-0" size={26} />
                            Gestion des Charges
                        </h2>
                        <p className="text-slate-400 text-xs font-medium">Suivi des dépenses de bureau, impôts et carburant.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition font-medium"
                        >
                            <Download size={18} />
                            <span className="text-xs">Export Excel</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg transition font-medium shadow-sm text-sm bg-slate-900 hover:bg-slate-800"
                        >
                            <Plus size={18} />
                            <span>Nouvelle Charge</span>
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-50 items-end">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>

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
                        className="flex items-center justify-center gap-2 text-slate-400 hover:text-rose-600 font-medium text-xs transition-colors border border-slate-50 rounded-lg h-10"
                    >
                        <X size={16} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="hidden">
                            <TrendingDown size={20} />
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-slate-400">Dépenses Totales</p>
                            <h3 className="text-2xl font-bold text-slate-900">{formatNumber(totalCharges)} <span className="text-xs text-slate-500">DH</span></h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Moyenne Mensuelle</p>
                            <p className="text-sm font-semibold text-blue-600">{filteredCharges.length > 0 ? formatNumber(Math.round(totalCharges / filteredCharges.length)) : 0} DH</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 overflow-x-auto relative">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs font-medium text-slate-400">Détails par Catégorie</p>
                        <button onClick={() => setIsMonthlyModalOpen(true)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition">
                            <History size={12} /> Vue Mensuelle
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[300px]">
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xs font-medium text-slate-500 mb-1">Loyer Bureau</p>
                            <p className="text-sm font-semibold text-slate-800">{formatNumber(totalLoyer)} <span className="text-xs text-slate-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xs font-medium text-slate-500 mb-1">Salaires/Staff</p>
                            <p className="text-sm font-semibold text-slate-800">{formatNumber(totalSalaires)} <span className="text-xs text-slate-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xs font-medium text-slate-500 mb-1">Fournitures</p>
                            <p className="text-sm font-semibold text-slate-800">{formatNumber(totalFournitures)} <span className="text-xs text-slate-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xs font-medium text-slate-500 mb-1">Gasoil/Transp</p>
                            <p className="text-sm font-semibold text-slate-800">{formatNumber(totalGasoil)} <span className="text-xs text-slate-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xs font-medium text-slate-500 mb-1">Impôts</p>
                            <p className="text-sm font-semibold text-slate-800">{formatNumber(totalImpots)} <span className="text-xs text-slate-500">DH</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white border-b border-slate-200">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Période</th>
                            <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Bureau/Staff</th>
                            <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Gasoil/Autre</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Montant Total</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <Loader2 className="animate-spin inline-block mr-2" size={24} />
                                    Chargement...
                                </td>
                            </tr>
                        ) : filteredCharges.length > 0 ? (
                            filteredCharges.map((c) => {
                                const bureauTotal = Number(c.loyer_bureau) + Number(c.employes_bureau) + Number(c.fournitures_bureau);
                                const otherTotal = Number(c.impots) + Number(c.gasoil);
                                const rowTotal = bureauTotal + otherTotal;

                                return (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon size={14} className="text-blue-500" />
                                                {c.periode}
                                                {c.terrain && (
                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ml-2 text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">
                                                        {c.terrain.nom_projet}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-semibold text-slate-600">{formatNumber(bureauTotal)} DH</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-500">{formatNumber(otherTotal)} DH</td>
                                        <td className="px-4 py-3 text-right font-semibold text-rose-500">
                                            {formatNumber(rowTotal)} DH
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <button onClick={() => handleOpenDetails(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                                    <TrendingDown size={16} />
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
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">Aucune charge enregistrée</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/30 shrink-0">
                            <h3 className="font-semibold text-slate-800 text-lg">
                                {editingCharge ? 'Modifier les Charges' : 'Nouvelle Saisie Mensuelle'}
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-blue-600 border-b pb-2">Bureau & Staff</h4>
                                    <FieldWithDoc title="Loyer Bureau" fieldName="loyer_bureau" color="blue" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                    <FieldWithDoc title="Salaires / Employés" fieldName="employes_bureau" color="blue" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                    <FieldWithDoc title="Fournitures" fieldName="fournitures_bureau" color="blue" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-emerald-600 border-b pb-2">Mobilité</h4>
                                    <FieldWithDoc title="Gasoil / Déplacement" fieldName="gasoil" color="emerald" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div>
                                    <FieldWithDoc title="Vignette / Impôts" fieldName="impots" color="rose" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Terrain / Projet lié</label>
                                    <select
                                        value={formData.terrain_id}
                                        onChange={e => setFormData({ ...formData, terrain_id: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="">Général / Aucun projet</option>
                                        {terrains.map(t => (
                                            <option key={t.id} value={t.id}>{t.nom_projet}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Période (JJ/MM/AAAA)</label>
                                    <input
                                        type="text"
                                        value={formData.periode}
                                        onChange={e => setFormData({ ...formData, periode: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="JJ/MM/AAAA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center gap-2 text-slate-600">
                                        <Banknote size={12} className="text-emerald-500" /> RIB (Bancaire)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.rib}
                                        onChange={e => setFormData({ ...formData, rib: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Optionnel"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-4 py-2 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-sm bg-slate-900 hover:bg-slate-800"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Confirmer la Saisie</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {isDetailsModalOpen && selectedCharge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50 shrink-0">
                            <div>
                                {selectedCharge.periode}
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-slate-400">Détails des Charges • ID #{selectedCharge.id}</p>
                                    {selectedCharge.terrain && (
                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">
                                            Projet: {selectedCharge.terrain.nom_projet}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-rose-50 border !border-rose-100 rounded-xl col-span-2">
                                    <p className="text-xs font-medium text-rose-400 mb-1">Dépense Totale du Mois</p>
                                    <p className="text-2xl font-bold text-rose-700">
                                        {formatNumber(Number(selectedCharge.loyer_bureau) +
                                            Number(selectedCharge.fournitures_bureau) + Number(selectedCharge.employes_bureau) + Number(selectedCharge.impots) + Number(selectedCharge.gasoil))} DH
                                    </p>
                                </div>

                                <div className="space-y-4 col-span-2">
                                    <label className="text-xs font-medium block mb-2 text-slate-600">Répartition des Charges</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 border border-slate-100/50 hover:bg-slate-50/80 transition-colors rounded-xl">
                                            <p className="text-xs font-semibold text-slate-400 mb-3">Bureau & Staff</p>
                                            <div className="space-y-1">
                                                <DetailLine label="Loyer" field="loyer_bureau" charge={selectedCharge} />
                                                <DetailLine label="Salaires" field="employes_bureau" charge={selectedCharge} />
                                                <DetailLine label="Fournitures" field="fournitures_bureau" charge={selectedCharge} />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-100/50 hover:bg-slate-50/80 transition-colors rounded-xl">
                                            <p className="text-xs font-semibold text-slate-400 mb-3">Transport</p>
                                            <div className="space-y-1">
                                                <DetailLine label="Gasoil" field="gasoil" charge={selectedCharge} />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-xl col-span-2">
                                            <p className="text-xs font-semibold text-slate-400 mb-3">Impôts & Divers</p>
                                            <DetailLine label="Impôts" field="impots" charge={selectedCharge} />
                                        </div>
                                        {selectedCharge.rib && (
                                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl col-span-2 flex flex-col gap-1">
                                                <p className="text-xs font-semibold text-emerald-600">RIB de Règlement</p>
                                                <p className="text-sm font-semibold text-emerald-800 font-mono text-center">{selectedCharge.rib}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => { setIsDetailsModalOpen(false); handleOpenModal(selectedCharge); }} className="flex-1 py-2 text-white rounded-lg font-medium text-sm transition-colors bg-slate-900 hover:bg-slate-800">
                                Modifier
                            </button>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Details Modal */}
            {isMonthlyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50 shrink-0">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg">Historique Mensuel</h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">Évolution des charges par mois</p>
                            </div>
                            <button type="button" onClick={() => setIsMonthlyModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white border-b border-slate-200">
                                        <tr>
                                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Mois / Année</th>
                                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Loyer Bureau</th>
                                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Salaires/Staff</th>
                                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Fournitures</th>
                                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Gasoil</th>
                                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Impôts</th>
                                            <th className="text-right text-rose-500 whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Total Mensuel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).map(([month, totals]: [string, any]) => (
                                            <tr key={month} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-blue-600">{month}</td>
                                                <td className="px-4 py-3 text-right text-slate-600 font-semibold">{formatNumber(totals.loyer)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-4 py-3 text-right text-slate-600 font-semibold">{formatNumber(totals.salaires)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-4 py-3 text-right text-slate-600 font-semibold">{formatNumber(totals.fournitures)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-4 py-3 text-right text-slate-600 font-semibold">{formatNumber(totals.gasoil)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-4 py-3 text-right text-slate-600 font-semibold">{formatNumber(totals.impots)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-4 py-3 text-right font-semibold text-rose-600">{formatNumber(totals.total)} <span className="text-[9px]">DH</span></td>
                                            </tr>
                                        ))}
                                        {Object.keys(monthlyData).length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-semibold">Aucune donnée disponible</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Charges;
