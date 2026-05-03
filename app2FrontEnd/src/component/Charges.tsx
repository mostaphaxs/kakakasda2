// src/component/Charges.tsx
import React, { useState, useEffect } from 'react';
import { WalletCards, Plus, Loader2, Trash2, Edit2, X, Check, Calendar as CalendarIcon, TrendingDown, Search, Download, Banknote, FileText, Sparkles, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { analyzeInvoicePremium } from '../lib/gemini';

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
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-gray-200 transition-colors">
            <div className="flex justify-between items-center mb-3">
                <label className="block text-[10px] items-center gap-2 font-black text-gray-500 uppercase tracking-widest">{title}</label>
                {formData[`${fieldName}_scan`] instanceof File && (
                    <button
                        type="button"
                        onClick={() => onAIScan(fieldName)}
                        disabled={isAnalyzingField === fieldName}
                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                        {isAnalyzingField === fieldName ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{isAnalyzingField === fieldName ? '...' : 'IA Scan'}</span>
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-2.5">
                <input
                    type="text"
                    placeholder={`Montant`}
                    value={formData[fieldName]}
                    onChange={e => setFormData({ ...formData, [fieldName]: formatNumber(e.target.value) })}
                    className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl ${focusClass} outline-none font-black text-lg text-gray-800 placeholder:text-gray-300 placeholder:font-bold`}
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ref :"
                        value={formData[`${fieldName}_ref`]}
                        onChange={e => setFormData({ ...formData, [`${fieldName}_ref`]: e.target.value })}
                        className={`flex-[3] px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none font-bold text-[11px] text-gray-600 ${focusClass} placeholder:text-gray-300`}
                    />
                    <label className="flex-[2] flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 cursor-pointer hover:bg-gray-100 transition-colors shrink-0 overflow-hidden">
                        <span className={`text-[10px] font-black truncate text-center w-full ${formData[`${fieldName}_scan`] ? 'text-indigo-600' : 'text-gray-400'}`}>
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
        <div className="flex flex-col mb-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-bold">{label}:</span>
                <span className="font-black text-gray-800">{formatNumber(value)} DH</span>
            </div>
            {(ref || scan) && (
                <div className="flex justify-between items-center mt-1.5 px-2 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest break-all">Ref: {ref || '-'}</span>
                    {scan && (
                        <button type="button" onClick={() => openExternal(`${STORAGE_BASE}/${scan}`)} className="flex items-center gap-1 text-[9px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors whitespace-nowrap">
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
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTerrain, setFilterTerrain] = useState('all');
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
        if (!window.confirm('Supprimer cette charge ?')) return;
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
            <div className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white shadow-xl shadow-gray-200/50 space-y-4 mx-1">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 italic uppercase tracking-tighter">
                            <WalletCards className="text-rose-600" />
                            Gestion des Charges
                        </h2>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Suivi des dépenses de bureau, impôts et carburant.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-bold"
                        >
                            <Download size={18} />
                            <span className="text-xs uppercase tracking-widest">Export Excel</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl hover:bg-rose-700 transition font-bold shadow-lg shadow-rose-100"
                        >
                            <Plus size={18} />
                            <span className="text-xs uppercase tracking-widest">Nouvelle Charge</span>
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-50 items-end">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer h-10"
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
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-rose-600 font-bold text-xs transition-colors border border-gray-50 rounded-xl h-10"
                    >
                        <X size={16} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                            <TrendingDown size={20} />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dépenses Totales</p>
                            <h3 className="text-2xl font-black text-gray-900">{formatNumber(totalCharges)} <span className="text-xs text-gray-500">DH</span></h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Moyenne Mensuelle</p>
                            <p className="text-sm font-black text-blue-600">{filteredCharges.length > 0 ? formatNumber(Math.round(totalCharges / filteredCharges.length)) : 0} DH</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 overflow-x-auto relative">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Détails par Catégorie</p>
                        <button onClick={() => setIsMonthlyModalOpen(true)} className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest hover:bg-blue-100 transition">
                            <History size={12} /> Vue Mensuelle
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[300px]">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Loyer Bureau</p>
                            <p className="text-sm font-black text-gray-800">{formatNumber(totalLoyer)} <span className="text-[9px] text-gray-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Salaires/Staff</p>
                            <p className="text-sm font-black text-gray-800">{formatNumber(totalSalaires)} <span className="text-[9px] text-gray-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fournitures</p>
                            <p className="text-sm font-black text-gray-800">{formatNumber(totalFournitures)} <span className="text-[9px] text-gray-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Gasoil/Transp</p>
                            <p className="text-sm font-black text-gray-800">{formatNumber(totalGasoil)} <span className="text-[9px] text-gray-500">DH</span></p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Impôts</p>
                            <p className="text-sm font-black text-gray-800">{formatNumber(totalImpots)} <span className="text-[9px] text-gray-500">DH</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Période</th>
                            <th className="px-6 py-4 text-center">Bureau/Staff</th>
                            <th className="px-6 py-4 text-center">Gasoil/Autre</th>
                            <th className="px-6 py-4 text-right">Montant Total</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic">
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
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon size={14} className="text-blue-500" />
                                                {c.periode}
                                                {c.terrain && (
                                                    <span className="ml-2 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                                                        {c.terrain.nom_projet}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-slate-600">{formatNumber(bureauTotal)} DH</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">{formatNumber(otherTotal)} DH</td>
                                        <td className="px-6 py-4 text-right font-black text-rose-500">
                                            {formatNumber(rowTotal)} DH
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenDetails(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Détails">
                                                    <TrendingDown size={16} />
                                                </button>
                                                <button onClick={() => handleOpenModal(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Modifier">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Aucune charge enregistrée</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/30 shrink-0">
                            <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest">
                                {editingCharge ? 'Modifier les Charges' : 'Nouvelle Saisie Mensuelle'}
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">Bureau & Staff</h4>
                                    <FieldWithDoc title="Loyer Bureau" fieldName="loyer_bureau" color="blue" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                    <FieldWithDoc title="Salaires / Employés" fieldName="employes_bureau" color="blue" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                    <FieldWithDoc title="Fournitures" fieldName="fournitures_bureau" color="blue" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b pb-2">Mobilité</h4>
                                    <FieldWithDoc title="Gasoil / Déplacement" fieldName="gasoil" color="emerald" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div>
                                    <FieldWithDoc title="Vignette / Impôts" fieldName="impots" color="rose" formData={formData} setFormData={setFormData} onAIScan={handleFieldAIScan} isAnalyzingField={isAnalyzingField} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Terrain / Projet lié</label>
                                    <select
                                        value={formData.terrain_id}
                                        onChange={e => setFormData({ ...formData, terrain_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-gray-700"
                                    >
                                        <option value="">Général / Aucun projet</option>
                                        {terrains.map(t => (
                                            <option key={t.id} value={t.id}>{t.nom_projet}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Période (JJ/MM/AAAA)</label>
                                    <input
                                        type="text"
                                        value={formData.periode}
                                        onChange={e => setFormData({ ...formData, periode: e.target.value })}
                                        className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-black text-blue-700 outline-none"
                                        placeholder="JJ/MM/AAAA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                                        <Banknote size={12} className="text-emerald-500" /> RIB (Bancaire)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.rib}
                                        onChange={e => setFormData({ ...formData, rib: e.target.value })}
                                        className="w-full px-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-sm tracking-widest outline-none"
                                        placeholder="Optionnel"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 text-sm font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-colors">
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50 shrink-0">
                            <div>
                                {selectedCharge.periode}
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Détails des Charges • ID #{selectedCharge.id}</p>
                                    {selectedCharge.terrain && (
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                            Projet: {selectedCharge.terrain.nom_projet}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl col-span-2">
                                    <p className="text-[10px] font-bold text-rose-400 uppercase mb-1 tracking-widest">Dépense Totale du Mois</p>
                                    <p className="text-2xl font-black text-rose-700">
                                        {formatNumber(Number(selectedCharge.loyer_bureau) +
                                            Number(selectedCharge.fournitures_bureau) + Number(selectedCharge.employes_bureau) + Number(selectedCharge.impots) + Number(selectedCharge.gasoil))} DH
                                    </p>
                                </div>

                                <div className="space-y-4 col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Répartition des Charges</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 border border-gray-100/50 hover:bg-gray-50/80 transition-colors rounded-xl">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Bureau & Staff</p>
                                            <div className="space-y-1">
                                                <DetailLine label="Loyer" field="loyer_bureau" charge={selectedCharge} />
                                                <DetailLine label="Salaires" field="employes_bureau" charge={selectedCharge} />
                                                <DetailLine label="Fournitures" field="fournitures_bureau" charge={selectedCharge} />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 border border-gray-100/50 hover:bg-gray-50/80 transition-colors rounded-xl">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Transport</p>
                                            <div className="space-y-1">
                                                <DetailLine label="Gasoil" field="gasoil" charge={selectedCharge} />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 border border-gray-100/50 rounded-xl col-span-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Impôts & Divers</p>
                                            <DetailLine label="Impôts" field="impots" charge={selectedCharge} />
                                        </div>
                                        {selectedCharge.rib && (
                                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl col-span-2 flex flex-col gap-1">
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">RIB de Règlement</p>
                                                <p className="text-sm font-black text-emerald-800 font-mono tracking-widest text-center">{selectedCharge.rib}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button onClick={() => { setIsDetailsModalOpen(false); handleOpenModal(selectedCharge); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors">
                                Modifier
                            </button>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="px-8 py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-sm">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Details Modal */}
            {isMonthlyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50 shrink-0">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest">Historique Mensuel</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Évolution des charges par mois</p>
                            </div>
                            <button type="button" onClick={() => setIsMonthlyModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Mois / Année</th>
                                            <th className="px-6 py-4 text-right">Loyer Bureau</th>
                                            <th className="px-6 py-4 text-right">Salaires/Staff</th>
                                            <th className="px-6 py-4 text-right">Fournitures</th>
                                            <th className="px-6 py-4 text-right">Gasoil</th>
                                            <th className="px-6 py-4 text-right">Impôts</th>
                                            <th className="px-6 py-4 text-right text-rose-500">Total Mensuel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 italic">
                                        {Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).map(([month, totals]: [string, any]) => (
                                            <tr key={month} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-black text-blue-600">{month}</td>
                                                <td className="px-6 py-4 text-right text-gray-600 font-bold">{formatNumber(totals.loyer)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-6 py-4 text-right text-gray-600 font-bold">{formatNumber(totals.salaires)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-6 py-4 text-right text-gray-600 font-bold">{formatNumber(totals.fournitures)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-6 py-4 text-right text-gray-600 font-bold">{formatNumber(totals.gasoil)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-6 py-4 text-right text-gray-600 font-bold">{formatNumber(totals.impots)} <span className="text-[9px]">DH</span></td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600">{formatNumber(totals.total)} <span className="text-[9px]">DH</span></td>
                                            </tr>
                                        ))}
                                        {Object.keys(monthlyData).length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold">Aucune donnée disponible</td>
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
