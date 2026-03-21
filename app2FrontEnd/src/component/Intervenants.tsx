// src/component/Intervenants.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Edit2, X, Check, User, Phone, FileText, Upload, DollarSign, Calendar, Search, MapPin, Download, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';

interface Payment {
    id: number;
    amount: number;
    payment_date: string;
    method: string;
    scan_path: string | null;
    notes: string | null;
}

interface Intervenant {
    id: number;
    categorie: string;
    nom_societe: string;
    nom_gerant: string;
    adresse: string;
    tel: string;
    if: string;
    ice: string;
    rc: string;
    montant_global: number;
    payments: Payment[];
    scan_contrat: string | null;
    description: string | null;
    terrain_id: number | null;
    terrain?: { id: number; nom_projet: string; nom_terrain: string };
}

const Intervenants = () => {
    const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategorie, setFilterCategorie] = useState('all');
    const [filterTerrain, setFilterTerrain] = useState('all');
    const [isMainModalOpen, setIsMainModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
    const [editingIntervenant, setEditingIntervenant] = useState<Intervenant | null>(null);
    const [selectedIntervenant, setSelectedIntervenant] = useState<Intervenant | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    // Custom category states
    const PREDEFINED_CATEGORIES = [
        "Architecture", "Bureau de contrôle", "Bureau d'études", "Notaire",
        "Géomètre", "Laboratoire", "Topographe", "Autre"
    ];
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    const [formData, setFormData] = useState({
        categorie: 'Architecture',
        nom_societe: '',
        nom_gerant: '',
        adresse: '',
        tel: '',
        if: '',
        ice: '',
        rc: '',
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

    const fetchIntervenants = async () => {
        try {
            const data = await apiFetch<Intervenant[]>('/intervenants');
            setIntervenants(data);
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des intervenants');
        } finally {
            setLoading(false);
        }
    };

    const filteredIntervenants = intervenants.filter(i => {
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            i.id.toString().includes(search) ||
            i.nom_societe?.toLowerCase().includes(search) ||
            i.nom_gerant?.toLowerCase().includes(search) ||
            i.tel.includes(search) ||
            i.categorie?.toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        if (filterCategorie !== 'all' && i.categorie !== filterCategorie) return false;
        if (filterTerrain !== 'all' && i.terrain_id?.toString() !== filterTerrain) return false;

        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterCategorie('all');
        setFilterTerrain('all');
    };

    const handleExport = () => {
        if (filteredIntervenants.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredIntervenants.map(i => {
            const totalVerse = i.payments.reduce((acc, p) => acc + Number(p.amount), 0);
            return {
                'ID': i.id,
                'CATÉGORIE': i.categorie?.toUpperCase(),
                'INTERVENANT': i.nom_gerant?.toUpperCase(),
                'TÉLÉPHONE': i.tel,
                'PROJET LIÉ': i.terrain?.nom_projet || 'N/A',
                'MONTANT GLOBAL (DH)': i.montant_global,
                'VERSÉ (DH)': totalVerse,
                'RESTE (DH)': i.montant_global - totalVerse,
                'OBSERVATIONS': i.description || ''
            };
        });

        exportToExcel(dataToExport, `intervenants_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Liste des intervenants exportée avec succès");
    };

    useEffect(() => {
        fetchIntervenants();
        fetchTerrains();
    }, []);

    const handleOpenModal = (intervenant: Intervenant | null = null) => {
        if (intervenant) {
            setEditingIntervenant(intervenant);

            const isPredefined = PREDEFINED_CATEGORIES.includes(intervenant.categorie);
            setIsCustomCategory(!isPredefined);
            setCustomCategory(isPredefined ? '' : intervenant.categorie);

            setFormData({
                categorie: isPredefined ? intervenant.categorie : 'Autre',
                nom_societe: intervenant.nom_societe,
                nom_gerant: intervenant.nom_gerant,
                adresse: intervenant.adresse,
                tel: intervenant.tel,
                if: intervenant.if || '',
                ice: intervenant.ice || '',
                rc: intervenant.rc || '',
                montant_global: formatNumber(String(intervenant.montant_global)),
                description: intervenant.description || '',
                terrain_id: intervenant.terrain_id ? String(intervenant.terrain_id) : '',
            });
        } else {
            setEditingIntervenant(null);
            setIsCustomCategory(false);
            setCustomCategory('');
            setFormData({
                categorie: 'Architecture',
                nom_societe: '',
                nom_gerant: '',
                adresse: '',
                tel: '',
                if: '',
                ice: '',
                rc: '',
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

            if (editingIntervenant) {
                data.append('_method', 'PUT');
                await apiFetch(`/intervenants/${editingIntervenant.id}`, {
                    method: 'POST',
                    body: data,
                });
            } else {
                await apiFetch('/intervenants', {
                    method: 'POST',
                    body: data,
                });
            }

            toast.success(editingIntervenant ? 'Intervenant mis à jour' : 'Intervenant ajouté');
            setIsMainModalOpen(false);
            setFieldErrors({});
            fetchIntervenants();
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
        if (!window.confirm('Supprimer cet intervenant ?')) return;
        try {
            await apiFetch(`/intervenants/${id}`, { method: 'DELETE' });
            toast.success('Intervenant supprimé');
            setIntervenants(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleOpenPaymentModal = (intervenant: Intervenant, payment?: any) => {
        setSelectedIntervenant(intervenant);
        if (payment) {
            setEditingPaymentId(payment.id);
            setPaymentData({
                amount: formatNumber(String(payment.amount)),
                payment_date: payment.payment_date,
                method: payment.method,
                reference_no: payment.reference_no || '',
                bank_name: payment.bank_name || '',
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
                notes: '',
            });
        }
        setPaymentFile(null);
        setIsPaymentModalOpen(true);
    };

    const handleOpenDetails = (intervenant: Intervenant) => {
        setSelectedIntervenant(intervenant);
        setIsDetailsModalOpen(true);
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIntervenant) return;
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('payable_id', String(selectedIntervenant.id));
            data.append('payable_type', 'App\\Models\\Intervenant');
            data.append('amount', String(parseNumber(paymentData.amount)));
            data.append('payment_date', paymentData.payment_date);
            data.append('method', paymentData.method);
            data.append('reference_no', paymentData.reference_no);
            data.append('bank_name', paymentData.bank_name);
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
            fetchIntervenants();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'ajout de l\'avancement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!window.confirm('Supprimer cet avancement ?')) return;
        try {
            await apiFetch(`/contractor-payments/${paymentId}`, { method: 'DELETE' });
            toast.success('Avancement supprimé');
            fetchIntervenants();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                            <Briefcase className="text-indigo-600" />
                            Répertoire des Intervenants
                        </h2>
                        <p className="text-gray-500 text-sm">Gérez vos prestataires, bureaux d'études et notaires.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-bold"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100"
                        >
                            <Plus size={18} />
                            <span>Nouvel Intervenant</span>
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-gray-50">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher (Nom, Gérant, Tél...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <select
                        value={filterCategorie}
                        onChange={(e) => setFilterCategorie(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="all">Catégorie: Toutes</option>
                        {PREDEFINED_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
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
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-indigo-600 font-bold text-xs transition-colors border border-gray-50 rounded-xl py-2"
                    >
                        <X size={16} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Société / Intervenant</th>
                            <th className="px-6 py-4 whitespace-nowrap">Gérant / Contact</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Montant Global</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Total Versé</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Reste à Payer</th>
                            <th className="px-6 py-4 rounded-tr-xl text-right whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <Loader2 className="animate-spin inline-block mb-2 text-gray-300" size={32} />
                                    <p className="text-gray-400 italic">Chargement...</p>
                                </td>
                            </tr>
                        ) : filteredIntervenants.length > 0 ? (
                            filteredIntervenants.map((i) => {
                                const totalPaid = i.payments.reduce((acc, p) => acc + Number(p.amount), 0);
                                const remaining = i.montant_global - totalPaid;
                                return (
                                    <tr key={i.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800">{i.nom_societe}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{i.categorie}</span>
                                                    {i.terrain && (
                                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                                            Projet: {i.terrain.nom_projet}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-600 font-bold flex items-center gap-1"><User size={12} className="text-gray-400" /> {i.nom_gerant}</span>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Phone size={12} className="text-gray-400" /> {i.tel}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-gray-800">
                                            {formatNumber(i.montant_global)} DH
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                            {formatNumber(totalPaid)} DH
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-rose-500">
                                            {formatNumber(remaining)} DH
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenDetails(i)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Détails">
                                                    <FileText size={16} />
                                                </button>
                                                <button onClick={() => handleOpenPaymentModal(i)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors" title="Nouvelle Avance">
                                                    <Plus size={12} /> Avance
                                                </button>
                                                <button onClick={() => handleOpenModal(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(i.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-gray-400 italic">Aucun intervenant enregistré pour le moment.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Main Modal (Add/Edit) */}
            {isMainModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                            <h3 className="font-black text-gray-800 text-base uppercase tracking-widest">
                                {editingIntervenant ? 'Modifier Intervenant' : 'Nouvel Intervenant'}
                            </h3>
                            <button onClick={() => setIsMainModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Catégorie</label>
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
                                        className={`w-full px-3 py-2 bg-gray-50 border ${fieldErrors.categorie ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700`}
                                    >
                                        <option value="Architecture">Architecture</option>
                                        <option value="Bureau de contrôle">Bureau de contrôle</option>
                                        <option value="Bureau d'études">Bureau d'études</option>
                                        <option value="Notaire">Notaire</option>
                                        <option value="Géomètre">Géomètre</option>
                                        <option value="Laboratoire">Laboratoire</option>
                                        <option value="Topographe">Topographe</option>
                                        <option value="Autre">Autre...</option>
                                    </select>
                                    {isCustomCategory && (
                                        <input
                                            type="text"
                                            placeholder="Préciser la catégorie..."
                                            required
                                            value={customCategory}
                                            onChange={e => setCustomCategory(e.target.value)}
                                            className="w-full mt-2 px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                        />
                                    )}
                                    {fieldErrors.categorie && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.categorie[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Projet lié</label>
                                    <select
                                        value={formData.terrain_id}
                                        onChange={e => setFormData({ ...formData, terrain_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700"
                                    >
                                        <option value="">Aucun projet spécifique</option>
                                        {terrains.map(t => (
                                            <option key={t.id} value={t.id}>{t.nom_projet}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Société / Cabinet</label>
                                    <input type="text" required value={formData.nom_societe} onChange={e => setFormData({ ...formData, nom_societe: e.target.value })} className={`w-full px-3 py-2 bg-gray-50 border ${fieldErrors.nom_societe ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm`} />
                                    {fieldErrors.nom_societe && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.nom_societe[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Responsable</label>
                                    <input type="text" required value={formData.nom_gerant} onChange={e => setFormData({ ...formData, nom_gerant: e.target.value })} className={`w-full px-3 py-2 bg-gray-50 border ${fieldErrors.nom_gerant ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm`} />
                                    {fieldErrors.nom_gerant && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.nom_gerant[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Téléphone</label>
                                    <input type="text" required value={formData.tel} onChange={e => setFormData({ ...formData, tel: e.target.value })} className={`w-full px-3 py-2 bg-gray-50 border ${fieldErrors.tel ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm`} />
                                    {fieldErrors.tel && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.tel[0]}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                                    <textarea required value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })} className={`w-full px-3 py-2 bg-gray-50 border ${fieldErrors.adresse ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none text-sm`} />
                                    {fieldErrors.adresse && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.adresse[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Description / Notes</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={`w-full px-3 py-2 bg-gray-50 border ${fieldErrors.description ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none text-sm`} placeholder="Notes particulières..." />
                                    {fieldErrors.description && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.description[0]}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">I.F</label>
                                        <input type="text" value={formData.if} onChange={e => setFormData({ ...formData, if: e.target.value })} className={`w-full px-2 py-2 bg-gray-50 border ${fieldErrors.if ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-[10px]`} />
                                        {fieldErrors.if && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.if[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">I.C.E</label>
                                        <input type="text" value={formData.ice} onChange={e => setFormData({ ...formData, ice: e.target.value })} className={`w-full px-2 py-2 bg-gray-50 border ${fieldErrors.ice ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-[10px]`} />
                                        {fieldErrors.ice && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.ice[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">R.C</label>
                                        <input type="text" value={formData.rc} onChange={e => setFormData({ ...formData, rc: e.target.value })} className={`w-full px-2 py-2 bg-gray-50 border ${fieldErrors.rc ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-[10px]`} />
                                        {fieldErrors.rc && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.rc[0]}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Montant (DH)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500" size={14} />
                                            <input type="text" required value={formData.montant_global} onChange={e => setFormData({ ...formData, montant_global: formatNumber(e.target.value) })} className={`w-full pl-7 pr-2 py-2 bg-gray-50 border ${fieldErrors.montant_global ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 text-lg`} />
                                        </div>
                                        {fieldErrors.montant_global && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.montant_global[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Scan Contrat</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={e => setContractFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="contract-upload"
                                        />
                                        <label
                                            htmlFor="contract-upload"
                                            className={`w-full flex items-center gap-2 px-3 py-2 bg-blue-50/50 border border-dashed ${fieldErrors.scan_contrat ? 'border-red-500' : 'border-blue-200'} rounded-xl hover:bg-blue-100 hover:border-blue-400 cursor-pointer transition-all`}
                                        >
                                            <Upload size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-bold text-blue-700 truncate">{contractFile ? contractFile.name : 'Uploader'}</span>
                                        </label>
                                        {fieldErrors.scan_contrat && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.scan_contrat[0]}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setIsMainModalOpen(false)} className="flex-1 px-6 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-colors">
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
                            <div>
                                <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest">{editingPaymentId ? 'Modifier l\'Avancement' : 'Nouvel Avancement'}</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Pour: {selectedIntervenant?.nom_societe}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddPayment} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Montant Avance (DH)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                    <input type="text" required value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: formatNumber(e.target.value) })} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800 text-lg" placeholder="0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date Règlement</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            required
                                            value={paymentData.payment_date}
                                            onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                            className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold"
                                            placeholder="JJ/MM/AAAA"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mode de Paiement</label>
                                    <select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold">
                                        <option value="Chèque">Chèque</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Espèce">Espèce</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                            </div>

                            {paymentData.method !== 'Espèce' && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">N° Référence</label>
                                        <input type="text" value={paymentData.reference_no} onChange={e => setPaymentData({ ...paymentData, reference_no: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold" placeholder="N° Chèque/Virement" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Banque</label>
                                        <input type="text" value={paymentData.bank_name} onChange={e => setPaymentData({ ...paymentData, bank_name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold" placeholder="Nom de la banque" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Justificatif / Reçu (Image ou PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={e => setPaymentFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="payment-upload"
                                />
                                <label
                                    htmlFor="payment-upload"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50/30 border border-dashed border-emerald-200 rounded-xl hover:bg-emerald-50 cursor-pointer transition-all group"
                                >
                                    <Upload size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold text-emerald-700 truncate">{paymentFile ? paymentFile.name : 'Choisir un fichier'}</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Observations / Notes</label>
                                <textarea value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs h-16 resize-none" placeholder="Notes complémentaires..." />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Valider l\'avancement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {isDetailsModalOpen && selectedIntervenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest leading-none mb-1">{selectedIntervenant.nom_societe}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fiche Intervenant #{selectedIntervenant.id} • {selectedIntervenant.categorie}</p>
                                    {selectedIntervenant.terrain && (
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                            Projet: {selectedIntervenant.terrain.nom_projet}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setIsDetailsModalOpen(false); handleOpenModal(selectedIntervenant); }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition-colors" title="Modifier">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Montant Global</p>
                                    <p className="text-lg font-black text-indigo-700">{formatNumber(selectedIntervenant.montant_global)} DH</p>
                                </div>
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Total Versé</p>
                                    <p className="text-lg font-black text-emerald-700">
                                        {formatNumber(selectedIntervenant.payments.reduce((acc, p) => acc + Number(p.amount), 0))} DH
                                    </p>
                                </div>
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Reste à Payer</p>
                                    <p className="text-lg font-black text-rose-700">
                                        {formatNumber(selectedIntervenant.montant_global - selectedIntervenant.payments.reduce((acc, p) => acc + Number(p.amount), 0))} DH
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Informations de Contact</label>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <User size={14} className="text-gray-400" />
                                                <span className="text-gray-600">Gérant: <span className="font-bold">{selectedIntervenant.nom_gerant}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone size={14} className="text-gray-400" />
                                                <span className="text-gray-600 font-bold">{selectedIntervenant.tel}</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin size={14} className="text-gray-400 mt-1" />
                                                <span className="text-gray-600">{selectedIntervenant.adresse}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Identifiants Fiscaux</label>
                                        <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                            <p className="text-xs font-bold text-gray-600 flex justify-between"><span>I.F:</span> <span className="text-indigo-600">{selectedIntervenant.if || '—'}</span></p>
                                            <p className="text-xs font-bold text-gray-600 flex justify-between"><span>I.C.E:</span> <span className="text-indigo-600">{selectedIntervenant.ice || '—'}</span></p>
                                            <p className="text-xs font-bold text-gray-600 flex justify-between"><span>R.C:</span> <span className="text-indigo-600">{selectedIntervenant.rc || '—'}</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Documents & Notes</label>
                                        <div className="space-y-2">
                                            {selectedIntervenant.scan_contrat && (
                                                <button
                                                    onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedIntervenant.scan_contrat}`))}
                                                    className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors w-full"
                                                >
                                                    <FileText size={16} />
                                                    <span className="text-xs font-black uppercase tracking-widest">Voir le Contrat</span>
                                                </button>
                                            )}
                                            <div className="p-3 bg-gray-50 rounded-xl">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
                                                <p className="text-xs text-gray-600 italic leading-relaxed">{selectedIntervenant.description || 'Aucune description fournie.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Historique des Avancements</label>
                                    <button onClick={() => handleOpenPaymentModal(selectedIntervenant)} className="text-[10px] font-black text-emerald-600 uppercase hover:underline">
                                        + Ajouter Avance
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedIntervenant.payments && selectedIntervenant.payments.length > 0 ? (
                                        selectedIntervenant.payments.map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group/pay">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                                                        <DollarSign size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800">{formatNumber(p.amount)} DH</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{p.payment_date} — {p.method}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {p.notes && <span className="text-[10px] text-gray-400 italic px-2 py-1 bg-white rounded-md">{p.notes}</span>}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/pay:opacity-100 transition-opacity">
                                                        {p.scan_path && (
                                                            <button
                                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${p.scan_path}`))}
                                                                className="p-1.5 text-blue-500 hover:bg-white rounded-lg shadow-sm bg-white"
                                                                title="Voir le scan"
                                                            >
                                                                <FileText size={14} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleOpenPaymentModal(selectedIntervenant, p)} className="p-1.5 text-blue-500 hover:bg-white rounded-lg shadow-sm bg-white" title="Modifier">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-red-400 hover:bg-rose-50 rounded-lg shadow-sm bg-white hover:text-red-600">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 italic text-xs py-4">Aucun avancement enregistré.</p>
                                    )}
                                </div>
                            </div>
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


export default Intervenants;
