import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';

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
        if (!confirm('Voulez-vous vraiment supprimer cet article ?')) return;
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
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-50">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Plus className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Nouvel Article</h2>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Catégorie</label>
                        <select {...register('category', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-0 text-sm transition-all shadow-sm">
                            <option value="Fer">Fer</option>
                            <option value="Electricité">Electricité</option>
                            <option value="Plomberie">Plomberie</option>
                            <option value="Ciment">Ciment</option>
                            <option value="Autres">Autres</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nom de l'article</label>
                        <input {...register('name', { required: true })} placeholder="Ex: Ciment 45kg" className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-0 text-sm transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Unité</label>
                        <select {...register('unit', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-0 text-sm transition-all shadow-sm">
                            <option value="m2">m2</option>
                            <option value="M3">M3</option>
                            <option value="ML">ML</option>
                            <option value="U">U (Unité)</option>
                            <option value="Kg">Kg</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Enregistrer</span>
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Code</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Article</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Catégorie</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unité</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Chargement...</td></tr>
                        ) : articles.map(art => (
                            <tr key={art.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-black text-indigo-600 uppercase">{art.code}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{art.name}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                                        {art.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{art.unit}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDelete(art.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors">
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
