import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Wrench, Save, ArrowLeft } from 'lucide-react';
import { formatNumber, parseNumber } from '../../lib/utils';

const AddGeneralWork: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const { register, handleSubmit, control, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        apiFetch<any[]>('/suppliers').then(setSuppliers);
        apiFetch<any[]>('/terrains').then(setTerrains);
    }, []);

    const onSubmit = async (data: any) => {
        try {
            data.total_amount = parseNumber(data.total_amount);
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
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors font-semibold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-slate-50">
                    <div className="hidden">
                        <Wrench className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nouveau Chantier / Travaux</h2>
                        <p className="text-slate-400 text-sm font-medium">Enregistrez une prestation et son budget.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Prestataire</label>
                            <select {...register('supplier_id', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                <option value="">Sélectionner</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Type de Travail</label>
                            <select {...register('work_type', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                <option value="Travaux de construction">Travaux de construction</option>
                                <option value="Décapage">Décapage</option>
                                <option value="Nettoyage">Nettoyage</option>
                                <option value="Atterrassement">Atterrassement</option>
                                <option value="Débarquement">Débarquement</option>
                                <option value="Déplacement terre/sable">Déplacement terre/sable</option>
                                <option value="Solaire">Solaire</option>
                                <option value="Traveau supplementaire">Traveau supplementaire</option>
                                <option value="Peinture">Peinture</option>
                                <option value="Jardinage">Jardinage</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Projet (Terrain)</label>
                            <select {...register('terrain_id', { required: false })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                <option value="">Aucun (Global)</option>
                                {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2 mt-[-10px]">
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                Description du Travaux
                            </label>
                            <textarea {...register('description')} rows={3} placeholder="Détails du travail effectué..." className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"></textarea>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-blue-50/30 rounded-xl border border-blue-50">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-blue-400 mb-2 text-slate-600">Montant du Marché (DH)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 font-semibold">DH</span>
                                <Controller
                                    name="total_amount"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field: { onChange, value, ...rest } }) => (
                                        <input
                                            {...rest}
                                            type="text"
                                            value={value || ''}
                                            onChange={(e) => onChange(formatNumber(e.target.value))}
                                            placeholder="0,00"
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-blue-400 mb-2 text-slate-600">RIB (Compte Bancaire)</label>
                            <input type="text" {...register('rib')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="RIB..." />
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm active:scale-[0.98] flex items-center justify-center space-x-3 text-sm bg-slate-900 hover:bg-slate-800">
                        <Save size={20} />
                        <span>Enregistrer le projet</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddGeneralWork;
