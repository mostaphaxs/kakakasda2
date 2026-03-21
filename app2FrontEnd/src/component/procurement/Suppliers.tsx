import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Truck, Search, PlusCircle, Trash2, Download, Edit2, X, Save, User, Phone, MapPin, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';

interface Supplier {
    id: number;
    nom_societe: string;
    nom_gerant: string | null;
    adresse: string | null;
    tel: string | null;
    ice: string | null;
    if: string | null;
    rc: string | null;
    description: string | null;
}

const Suppliers: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const data = await apiFetch<Supplier[]>('/suppliers');
            setSuppliers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer ce fournisseur ?')) return;
        try {
            await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
            toast.success('Fournisseur supprimé');
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        reset({
            nom_societe: supplier.nom_societe,
            nom_gerant: supplier.nom_gerant,
            adresse: supplier.adresse,
            tel: supplier.tel,
            ice: supplier.ice,
            if: supplier.if,
            rc: supplier.rc,
            description: supplier.description,
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: any) => {
        if (!editingSupplier) return;
        try {
            await apiFetch(`/suppliers/${editingSupplier.id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            toast.success('Fournisseur mis à jour !');
            setIsEditModalOpen(false);
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour.');
        }
    };

    const filtered = suppliers.filter(s =>
        s.nom_societe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.nom_gerant && s.nom_gerant.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.ice && s.ice.includes(searchTerm)) ||
        (s.if && s.if.includes(searchTerm))
    );

    const handleExport = () => {
        const exportData = filtered.map(s => ({
            'Raison Sociale': s.nom_societe,
            'Gérant': s.nom_gerant || 'N/A',
            'Tél': s.tel || 'N/A',
            'ICE': s.ice || '—',
            'I.F': s.if || '—',
            'R.C': s.rc || '—',
            'Adresse': s.adresse || 'N/A'
        }));
        exportToExcel(exportData, 'fournisseurs_complet', true);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Truck className="text-slate-600 h-8 w-8" />
                            Répertoire Fournisseurs
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Gérez votre base de partenaires (Style Intervenant).</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-black text-xs uppercase tracking-widest shadow-sm">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-supplier')} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-black transition font-black shadow-lg shadow-slate-100 text-xs uppercase tracking-widest">
                            <PlusCircle size={18} />
                            Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher par société, gérant, ICE..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Société</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Identifiants</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic">
                        {loading ? (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">Chargement des partenaires...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">Aucun fournisseur trouvé.</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 uppercase tracking-tight">{s.nom_societe}</span>
                                        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">{s.adresse || 'Sans adresse'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-700 font-bold flex items-center">
                                            <User size={12} className="mr-1 text-gray-400" /> {s.nom_gerant || 'N/A'}
                                        </span>
                                        <span className="text-[10px] text-indigo-500 font-black flex items-center mt-1">
                                            <Phone size={10} className="mr-1" /> {s.tel || '—'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {s.ice && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-mono border border-gray-200">ICE: {s.ice}</span>}
                                        {s.if && <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-mono border border-slate-200">IF: {s.if}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(s)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-black text-gray-800 text-base uppercase tracking-widest">
                                Modifier Fournisseur
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Briefcase size={12} className="mr-2" /> Société / Raison Sociale
                                    </label>
                                    <input {...register('nom_societe', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <User size={12} className="mr-2" /> Gérant / Contact
                                    </label>
                                    <input {...register('nom_gerant')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Phone size={12} className="mr-2" /> Téléphone
                                    </label>
                                    <input {...register('tel')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <MapPin size={12} className="mr-2" /> Adresse
                                    </label>
                                    <input {...register('adresse')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm outline-none" />
                                </div>
                                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                    <input {...register('ice')} placeholder="ICE" className="w-full h-11 px-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-xs outline-none" />
                                    <input {...register('if')} placeholder="I.F" className="w-full h-11 px-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-xs outline-none" />
                                    <input {...register('rc')} placeholder="R.C" className="w-full h-11 px-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-xs outline-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center space-x-3 shadow-slate-100"
                            >
                                <Save size={20} />
                                <span>{isSubmitting ? 'Mise à jour...' : 'Confirmer les modifications'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
