import React from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Package } from 'lucide-react';

const AddArticle: React.FC = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/articles', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Article créé avec succès !');
            navigate('/articles');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la création.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors font-semibold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="hidden">
                        <Package className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Créer un Article</h2>
                        <p className="text-slate-400 text-sm font-medium">Ajoutez une nouvelle référence au catalogue.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Catégorie</label>
                            <select {...register('category', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                <option value="Fer">Fer</option>
                                <option value="Ciment">Ciment</option>
                                <option value="Sable">Sable</option>
                                <option value="Gravier">Gravier</option>
                                <option value="Gravier 0">Gravier 0</option>
                                <option value="Gravier 1">Gravier 1</option>
                                <option value="Gravier 2">Gravier 2</option>
                                <option value="Gravier 3">Gravier 3</option>
                                <option value="Tuf">Tuf</option>
                                <option value="Tuf Noir">Tuf Noir</option>
                                <option value="Tuf Jaune">Tuf Jaune</option>
                                <option value="Marbre">Marbre</option>
                                <option value="Carrelage">Carrelage</option>
                                <option value="Electricité">Electricité</option>
                                <option value="Plomberie">Plomberie</option>
                                <option value="Peinture">Peinture</option>
                                <option value="Autres">Autres</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Nom / Désignation</label>
                            <input {...register('name', { required: true })} placeholder="Ex: Ciment 45kg" className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Unité de mesure</label>
                            <select {...register('unit', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                <option value="m2">m2</option>
                                <option value="M3">M3</option>
                                <option value="ML">ML</option>
                                <option value="U">U (Unité)</option>
                                <option value="Kg">Kg</option>
                                <option value="R">R (Rouleau)</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm active:scale-[0.98] flex items-center justify-center space-x-3 text-sm bg-slate-900 hover:bg-slate-800">
                        {isSubmitting ? <span className="animate-pulse">Enregistrement...</span> : (
                            <>
                                <Save size={20} />
                                <span>Enregistrer l'article</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddArticle;
