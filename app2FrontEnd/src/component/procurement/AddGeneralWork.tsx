import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Wrench, Save, ArrowLeft } from 'lucide-react';

const AddGeneralWork: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        apiFetch<any[]>('/suppliers').then(setSuppliers);
        apiFetch<any[]>('/terrains').then(setTerrains);
    }, []);

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/general-works', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Fiche de travaux enregistrée !');
            navigate('/travaux');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors font-bold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-gray-50">
                    <div className="p-3 bg-blue-100 rounded-2xl">
                        <Wrench className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Nouveau Chantier / Travaux</h2>
                        <p className="text-gray-400 text-sm font-medium">Enregistrez une prestation et son budget.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Prestataire</label>
                            <select {...register('supplier_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all font-bold shadow-sm ring-0 outline-none">
                                <option value="">Sélectionner</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type de Travail</label>
                            <select {...register('work_type', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all font-bold shadow-sm ring-0 outline-none">
                                <option value="Décapage">Décapage</option>
                                <option value="Nettoyage">Nettoyage</option>
                                <option value="Atterrassement">Atterrassement</option>
                                <option value="Débarquement">Débarquement</option>
                                <option value="Déplacement terre/sable">Déplacement terre/sable</option>
                                <option value="Solaire">Solaire</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Projet (Terrain)</label>
                            <select {...register('terrain_id', { required: false })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all font-bold shadow-sm ring-0 outline-none">
                                <option value="">Aucun (Global)</option>
                                {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-blue-50/30 rounded-3xl border border-blue-50">
                        <div>
                            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Montant du Marché (DH)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 font-black">DH</span>
                                <input type="number" step="0.01" {...register('total_amount', { required: true, valueAsNumber: true })} className="w-full pl-12 pr-4 h-12 rounded-xl border-blue-100 font-black text-blue-700 text-lg shadow-inner" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Acompte / Payé (DH)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 font-black">DH</span>
                                <input type="number" step="0.01" {...register('paid_amount', { valueAsNumber: true })} className="w-full pl-12 pr-4 h-12 rounded-xl border-emerald-100 font-black text-emerald-700 text-lg shadow-inner" defaultValue="0" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-3">
                        <Save size={20} />
                        <span>Enregistrer le projet</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddGeneralWork;
