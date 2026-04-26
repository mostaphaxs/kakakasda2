import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { User, Save, Trash2 } from 'lucide-react';

interface Supplier {
    id: number;
    name: string;
    ice: string;
    if: string;
}

const SupplierManagement: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
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

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/suppliers', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Fournisseur ajouté !');
            reset();
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Voulez-vous vraiment supprimer ce fournisseur ?')) return;
        try {
            await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
            toast.success('Fournisseur supprimé.');
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <User className="h-6 w-6 text-slate-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Nouveau Fournisseur</h2>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nom / Raison Sociale</label>
                        <input {...register('name', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-500 focus:ring-0 text-sm shadow-sm" placeholder="Ex: Batiment S.A.R.L" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ICE</label>
                        <input {...register('ice')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-500 focus:ring-0 text-sm shadow-sm" placeholder="15 chiffres" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">IF</label>
                        <input {...register('if')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-500 focus:ring-0 text-sm shadow-sm" placeholder="Identifiant Fiscal" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="h-11 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Enregistrer</span>
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Nom</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">ICE</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">IF</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Chargement...</td></tr>
                        ) : suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-black text-gray-900 uppercase tracking-tight">{s.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.ice || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.if || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierManagement;
