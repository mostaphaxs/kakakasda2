import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { User, Save, Trash2 } from 'lucide-react';
import { confirmDialog } from '../common/ConfirmDialog';

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
        if (!await confirmDialog('Voulez-vous vraiment supprimer ce fournisseur ?')) return;
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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="hidden">
                        <User className="h-6 w-6 text-slate-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">Nouveau Fournisseur</h2>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium mb-2 text-slate-600">Nom / Raison Sociale</label>
                        <input {...register('name', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Ex: Batiment S.A.R.L" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-2 text-slate-600">ICE</label>
                        <input {...register('ice')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="15 chiffres" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-2 text-slate-600">IF</label>
                        <input {...register('if')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Identifiant Fiscal" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center space-x-2 text-sm bg-slate-900 hover:bg-slate-800">
                        <Save className="h-4 w-4" />
                        <span>Enregistrer</span>
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white border-b border-slate-200">
                        <tr>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Nom</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">ICE</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">IF</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Chargement...</td></tr>
                        ) : suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-semibold text-slate-900 tracking-tight">{s.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{s.ice || '-'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{s.if || '-'}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleDelete(s.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
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
