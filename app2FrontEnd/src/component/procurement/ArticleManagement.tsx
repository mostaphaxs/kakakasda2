import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';
import { confirmDialog } from '../common/ConfirmDialog';

interface Article {
    id: number;
    category: string;
    code: string;
    name: string;
    unit: string;
}

const ArticleManagement: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const data = await apiFetch<Article[]>('/articles');
            setArticles(data);
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/articles', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Article créé avec succès !');
            reset();
            fetchArticles();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la création.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog('Voulez-vous vraiment supprimer cet article ?')) return;
        try {
            await apiFetch(`/articles/${id}`, { method: 'DELETE' });
            toast.success('Article supprimé.');
            fetchArticles();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-50">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="hidden">
                        <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">Nouvel Article</h2>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium mb-2 text-slate-600">Catégorie</label>
                        <select {...register('category', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                            <option value="Fer">Fer</option>
                            <option value="Electricité">Electricité</option>
                            <option value="Plomberie">Plomberie</option>
                            <option value="Ciment">Ciment</option>
                            <option value="Autres">Autres</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-2 text-slate-600">Nom de l'article</label>
                        <input {...register('name', { required: true })} placeholder="Ex: Ciment 45kg" className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-2 text-slate-600">Unité</label>
                        <select {...register('unit', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                            <option value="m2">m2</option>
                            <option value="M3">M3</option>
                            <option value="ML">ML</option>
                            <option value="U">U (Unité)</option>
                            <option value="Kg">Kg</option>
                        </select>
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
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Code</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Article</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Catégorie</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Unité</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Chargement...</td></tr>
                        ) : articles.map(art => (
                            <tr key={art.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{art.code}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{art.name}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                        {art.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-500">{art.unit}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleDelete(art.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
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

export default ArticleManagement;
