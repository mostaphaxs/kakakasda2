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
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors font-bold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-indigo-100 rounded-2xl">
                        <Package className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Créer un Article</h2>
                        <p className="text-gray-400 text-sm font-medium">Ajoutez une nouvelle référence au catalogue.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Catégorie</label>
                            <select {...register('category', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 transition-all font-bold text-sm shadow-sm ring-0 outline-none">
                                <option value="Fer">Fer</option>
                                <option value="Electricité">Electricité</option>
                                <option value="Plomberie">Plomberie</option>
                                <option value="Ciment">Ciment</option>
                                <option value="Autres">Autres</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nom / Désignation</label>
                            <input {...register('name', { required: true })} placeholder="Ex: Ciment 45kg" className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 transition-all font-bold text-sm shadow-sm ring-0 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Unité de mesure</label>
                            <select {...register('unit', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 transition-all font-bold text-sm shadow-sm ring-0 outline-none">
                                <option value="m2">m2</option>
                                <option value="M3">M3</option>
                                <option value="ML">ML</option>
                                <option value="U">U (Unité)</option>
                                <option value="Kg">Kg</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-3">
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
