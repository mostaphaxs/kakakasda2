import React from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Phone, MapPin, FileText, Briefcase } from 'lucide-react';

const AddSupplier: React.FC = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/suppliers', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Fournisseur enregistré avec succès !');
            navigate('/suppliers');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la création.');
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
                    <div className="p-3 bg-slate-100 rounded-2xl">
                        <User className="h-8 w-8 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Nouveau Fournisseur</h2>
                        <p className="text-gray-400 text-sm font-medium">Fiche complète du partenaire commercial (Style Intervenant).</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Société */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <Briefcase size={14} className="mr-2" /> Nom / Raison Sociale
                            </label>
                            <input
                                {...register('nom_societe', { required: true })}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm shadow-sm outline-none"
                                placeholder="Ex: Société de Matériaux SARL"
                            />
                        </div>

                        {/* Gérant */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <User size={14} className="mr-2" /> Responsable / Gérant
                            </label>
                            <input
                                {...register('nom_gerant')}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm shadow-sm outline-none"
                                placeholder="Nom du contact"
                            />
                        </div>

                        {/* Téléphone */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <Phone size={14} className="mr-2" /> Téléphone
                            </label>
                            <input
                                {...register('tel')}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm shadow-sm outline-none"
                                placeholder="Ex: 06 00 00 00 00"
                            />
                        </div>

                        {/* Adresse */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <MapPin size={14} className="mr-2" /> Adresse
                            </label>
                            <textarea
                                {...register('adresse')}
                                className="w-full p-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm shadow-sm outline-none h-24 resize-none"
                                placeholder="Adresse complète du siège"
                            />
                        </div>

                        {/* ICE / IF / RC */}
                        <div className="grid grid-cols-3 gap-4 md:col-span-2">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ICE</label>
                                <input {...register('ice')} className="w-full h-11 px-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-xs shadow-sm outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">I.F</label>
                                <input {...register('if')} className="w-full h-11 px-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-xs shadow-sm outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">R.C</label>
                                <input {...register('rc')} className="w-full h-11 px-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-xs shadow-sm outline-none" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <FileText size={14} className="mr-2" /> Observations / Notes
                            </label>
                            <textarea
                                {...register('description')}
                                className="w-full p-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-800 transition-all font-bold text-sm shadow-sm outline-none h-20 resize-none"
                                placeholder="Notes particulières sur ce fournisseur..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-3 shadow-slate-100"
                    >
                        <Save size={20} />
                        <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le partenaire'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddSupplier;
