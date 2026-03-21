// src/component/Charges.tsx
import React, { useState, useEffect } from 'react';
import { WalletCards, Plus, Loader2, Trash2, Edit2, X, Check, Calendar as CalendarIcon, TrendingDown, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';

interface Charge {
    id: number;
    frais_tel: number;
    internet: number;
    loyer_bureau: number;
    fournitures_bureau: number;
    employes_bureau: number;
    impots: number;
    gasoil: number;
    periode: string;
    terrain_id: number | null;
    terrain?: { id: number; nom_projet: string; nom_terrain: string };
}

const Charges = () => {
    const [charges, setCharges] = useState<Charge[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTerrain, setFilterTerrain] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCharge, setEditingCharge] = useState<Charge | null>(null);

    const [formData, setFormData] = useState({
        frais_tel: '',
        internet: '',
        loyer_bureau: '',
        fournitures_bureau: '',
        employes_bureau: '',
        impots: '',
        gasoil: '',
        periode: new Date().toLocaleDateString('fr-MA'),
        terrain_id: '',
    });

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
                frais_tel: formatNumber(String(charge.frais_tel)),
                internet: formatNumber(String(charge.internet)),
                loyer_bureau: formatNumber(String(charge.loyer_bureau)),
                fournitures_bureau: formatNumber(String(charge.fournitures_bureau)),
                employes_bureau: formatNumber(String(charge.employes_bureau)),
                impots: formatNumber(String(charge.impots)),
                gasoil: formatNumber(String(charge.gasoil)),
                periode: charge.periode.split('T')[0],
                terrain_id: charge.terrain_id ? String(charge.terrain_id) : '',
            });
        } else {
            setEditingCharge(null);
            setFormData({
                frais_tel: '',
                internet: '',
                loyer_bureau: '',
                fournitures_bureau: '',
                employes_bureau: '',
                impots: '',
                gasoil: '',
                periode: new Date().toLocaleDateString('fr-MA'),
                terrain_id: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const method = editingCharge ? 'PUT' : 'POST';
            const endpoint = editingCharge ? `/charges/${editingCharge.id}` : '/charges';

            await apiFetch(endpoint, {
                method,
                body: JSON.stringify({
                    ...formData,
                    frais_tel: parseNumber(formData.frais_tel),
                    internet: parseNumber(formData.internet),
                    loyer_bureau: parseNumber(formData.loyer_bureau),
                    fournitures_bureau: parseNumber(formData.fournitures_bureau),
                    employes_bureau: parseNumber(formData.employes_bureau),
                    impots: parseNumber(formData.impots),
                    gasoil: parseNumber(formData.gasoil),
                }),
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
            const totalMois = Number(c.frais_tel) + Number(c.internet) + Number(c.loyer_bureau) +
                Number(c.fournitures_bureau) + Number(c.employes_bureau) + Number(c.impots) + Number(c.gasoil);

            return {
                'ID': c.id,
                'MOIS / PÉRIODE': c.periode.toUpperCase(),
                'TOTAL GÉNÉRAL (DH)': totalMois,
                'LOYER BEREAU (DH)': c.loyer_bureau,
                'SALAIRES & STAFF (DH)': c.employes_bureau,
                'FOURNITURES (DH)': c.fournitures_bureau,
                'COMMUNICATIONS (DH)': Number(c.frais_tel) + Number(c.internet),
                'GASOIL (DH)': c.gasoil,
                'IMPÔTS & TAXES (DH)': c.impots,
                'PROJET AFFECTÉ': c.terrain?.nom_projet || 'FRAIS GÉNÉRAUX'
            };
        });

        exportToExcel(dataToExport, `charges_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Récapitulatif des charges exporté avec succès");
    };

    const totalCharges = charges.reduce((acc, c) =>
        acc + Number(c.frais_tel) + Number(c.internet) + Number(c.loyer_bureau) +
        Number(c.fournitures_bureau) + Number(c.employes_bureau) + Number(c.impots) + Number(c.gasoil), 0
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-2 w-fit bg-rose-50 text-rose-600 rounded-lg mb-4">
                        <TrendingDown size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dépenses Totales</p>
                    <h3 className="text-2xl font-black text-gray-900">{formatNumber(totalCharges)} <span className="text-xs">DH</span></h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest relative">Moyenne Mensuelle</p>
                    <h3 className="text-2xl font-black text-blue-600 relative">
                        {charges.length > 0 ? formatNumber(Math.round(totalCharges / charges.length)) : 0} <span className="text-xs">DH</span>
                    </h3>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Période</th>
                            <th className="px-6 py-4 text-center">Bureau/Staff</th>
                            <th className="px-6 py-4 text-center">Com/Fixe</th>
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
                                const commsTotal = Number(c.frais_tel) + Number(c.internet);
                                const otherTotal = Number(c.impots) + Number(c.gasoil);
                                const rowTotal = bureauTotal + commsTotal + otherTotal;

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
                                        <td className="px-6 py-4 text-center text-gray-500">{formatNumber(commsTotal)} DH</td>
                                        <td className="px-6 py-4 text-center text-gray-400">{formatNumber(otherTotal)} DH</td>
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                            <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest">
                                {editingCharge ? 'Modifier les Charges' : 'Nouvelle Saisie Mensuelle'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">Bureau & Staff</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loyer Bureau</label>
                                        <input type="text" value={formData.loyer_bureau} onChange={e => setFormData({ ...formData, loyer_bureau: formatNumber(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Salaires / Employés</label>
                                        <input type="text" value={formData.employes_bureau} onChange={e => setFormData({ ...formData, employes_bureau: formatNumber(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fournitures</label>
                                        <input type="text" value={formData.fournitures_bureau} onChange={e => setFormData({ ...formData, fournitures_bureau: formatNumber(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b pb-2">Comms & Transport</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Frais Téléphone</label>
                                        <input type="text" value={formData.frais_tel} onChange={e => setFormData({ ...formData, frais_tel: formatNumber(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Abonnement Internet</label>
                                        <input type="text" value={formData.internet} onChange={e => setFormData({ ...formData, internet: formatNumber(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gasoil / Déplacement</label>
                                        <input type="text" value={formData.gasoil} onChange={e => setFormData({ ...formData, gasoil: formatNumber(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vignette / Impôts</label>
                                    <input type="text" value={formData.impots} onChange={e => setFormData({ ...formData, impots: formatNumber(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-lg" />
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
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
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl col-span-2">
                                    <p className="text-[10px] font-bold text-rose-400 uppercase mb-1 tracking-widest">Dépense Totale du Mois</p>
                                    <p className="text-2xl font-black text-rose-700">
                                        {formatNumber(Number(selectedCharge.frais_tel) + Number(selectedCharge.internet) + Number(selectedCharge.loyer_bureau) +
                                            Number(selectedCharge.fournitures_bureau) + Number(selectedCharge.employes_bureau) + Number(selectedCharge.impots) + Number(selectedCharge.gasoil))} DH
                                    </p>
                                </div>

                                <div className="space-y-4 col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Répartition des Charges</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-xl">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Bureau & Staff</p>
                                            <div className="space-y-1 mt-1">
                                                <p className="text-xs flex justify-between"><span>Loyer:</span> <span className="font-bold">{formatNumber(selectedCharge.loyer_bureau)} DH</span></p>
                                                <p className="text-xs flex justify-between"><span>Salaires:</span> <span className="font-bold">{formatNumber(selectedCharge.employes_bureau)} DH</span></p>
                                                <p className="text-xs flex justify-between"><span>Fournitures:</span> <span className="font-bold">{formatNumber(selectedCharge.fournitures_bureau)} DH</span></p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-xl">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Comms & Mobilité</p>
                                            <div className="space-y-1 mt-1">
                                                <p className="text-xs flex justify-between"><span>Tel:</span> <span className="font-bold">{formatNumber(selectedCharge.frais_tel)} DH</span></p>
                                                <p className="text-xs flex justify-between"><span>Internet:</span> <span className="font-bold">{formatNumber(selectedCharge.internet)} DH</span></p>
                                                <p className="text-xs flex justify-between"><span>Gasoil:</span> <span className="font-bold">{formatNumber(selectedCharge.gasoil)} DH</span></p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-xl col-span-2 flex justify-between items-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Impôts & Divers</p>
                                            <p className="text-xs font-bold text-rose-600">{formatNumber(selectedCharge.impots)} DH</p>
                                        </div>
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
        </div>
    );
};

export default Charges;
