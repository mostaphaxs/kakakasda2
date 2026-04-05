import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Wrench, Search, PlusCircle, Download, Edit2, Trash2, X, Save, Banknote, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface GeneralWork {
    id: number;
    work_type: string;
    total_amount: number;
    paid_amount: number;
    balance: number;
    supplier_id: number;
    supplier: { nom_societe: string };
    created_at: string;
    terrain_id?: number;
    terrain?: { nom_terrain: string };
}

const GeneralWorks: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingWork, setEditingWork] = useState<GeneralWork | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { register, handleSubmit, reset } = useForm();

    const WORK_TYPES = ['Décapage', 'Nettoyage', 'Atterrassement', 'Débarquement', 'Déplacement terre/sable', 'Solaire'];

    const { data: works = [], isLoading: loading } = useQuery({
        queryKey: ['general-works'],
        queryFn: () => apiFetch<GeneralWork[]>('/general-works'),
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => apiFetch<any[]>('/suppliers'),
    });

    const { data: terrains = [] } = useQuery({
        queryKey: ['terrains'],
        queryFn: () => apiFetch<any[]>('/terrains'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiFetch(`/general-works/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast.success('Travaux supprimés');
            queryClient.invalidateQueries({ queryKey: ['general-works'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            apiFetch(`/general-works/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            }),
        onSuccess: () => {
            toast.success('Travaux mis à jour !');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['general-works'] });
        },
        onError: (error: any) => toast.error(error.message || 'Erreur lors de la mise à jour.'),
    });

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer ces travaux ?')) return;
        deleteMutation.mutate(id);
    };

    const handleEdit = (work: GeneralWork) => {
        setEditingWork(work);
        reset({
            work_type: work.work_type,
            supplier_id: work.supplier_id,
            terrain_id: work.terrain_id,
            total_amount: work.total_amount,
            paid_amount: work.paid_amount,
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: any) => {
        if (!editingWork) return;
        updateMutation.mutate({ id: editingWork.id, data });
    };

    const filtered = works.filter(w =>
        w.work_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.supplier.nom_societe.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        exportToExcel(filtered.map(w => ({
            'PRESTATAIRE': w.supplier.nom_societe,
            'NATURE TRAVAIL': w.work_type,
            'MONTANT MARCHE (DH)': w.total_amount,
            'MONTANT PAYE (DH)': w.paid_amount,
            'SOLDE (DH)': w.balance,
            'DATE': new Date(w.created_at).toLocaleDateString()
        })), 'travaux_generaux_complet', true);
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Wrench className="text-orange-600 h-6 w-6" />
                            Suivi des Travaux Généraux
                        </h1>
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest italic">Suivi Financier</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl border border-orange-100 hover:bg-orange-100 transition font-black text-xs uppercase tracking-widest">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-travaux')} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-black shadow-lg shadow-orange-100 text-[10px] uppercase tracking-widest">
                            <PlusCircle size={16} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher par prestataire ou nature..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-4 py-2.5">Nature des Travaux</th>
                            <th className="px-4 py-2.5">Projet</th>
                            <th className="px-4 py-2.5">Prestataire</th>
                            <th className="px-4 py-2.5">Montant Marché</th>
                            <th className="px-4 py-2.5">Payé</th>
                            <th className="px-4 py-2.5 text-right">Solde</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Chargement des travaux...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Aucune prestation trouvée.</td></tr>
                        ) : filtered.map(w => (
                            <tr key={w.id} className="hover:bg-orange-50/20 transition-colors group">
                                <td className="px-6 py-4 font-black text-slate-800 uppercase tracking-tight">{w.work_type}</td>
                                <td className="px-6 py-4 font-bold text-blue-500 uppercase text-[10px]">
                                    {w.terrain?.nom_terrain || 'N/A'}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">{w.supplier.nom_societe}</td>
                                <td className="px-6 py-4 font-black text-blue-600">{w.total_amount?.toLocaleString('fr-MA')} DH</td>
                                <td className="px-6 py-4 font-black text-emerald-600">{w.paid_amount?.toLocaleString('fr-MA')} DH</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-3 py-1.5 rounded-lg font-black text-xs ${w.balance <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {w.balance?.toLocaleString('fr-MA')} DH
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(w)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(w.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
                            <h3 className="font-black text-gray-800 text-base uppercase tracking-widest flex items-center gap-2">
                                <Wrench size={18} /> Modifier Travaux
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Wrench size={12} className="mr-2" /> Nature des Travaux
                                    </label>
                                    <select {...register('work_type', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        {WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Briefcase size={12} className="mr-2" /> Prestataire
                                    </label>
                                    <select {...register('supplier_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Briefcase size={12} className="mr-2" /> Projet
                                    </label>
                                    <select {...register('terrain_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Banknote size={12} className="mr-2" /> Montant Global
                                        </label>
                                        <input type="number" step="0.01" {...register('total_amount', { required: true, valueAsNumber: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Save size={12} className="mr-2" /> Montant Payé
                                        </label>
                                        <input type="number" step="0.01" {...register('paid_amount', { required: true, valueAsNumber: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl flex items-center justify-center space-x-3 shadow-orange-100"
                            >
                                <Save size={20} />
                                <span>{updateMutation.isPending ? 'Mise à jour...' : 'Confirmer les modifications'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralWorks;
