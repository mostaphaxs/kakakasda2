import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Package, Search, PlusCircle, Trash2, Download, Edit2, X, Save, Tag, Ruler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';

interface Article {
    id: number;
    category: string;
    code: string;
    name: string;
    unit: string;
}

const Articles: React.FC = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    const CATEGORIES = ['Fer', 'Electricité', 'Plomberie', 'Autres', 'Ciment'];
    const UNITS = ['m2', 'ML', 'U', 'Kg'];

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const data = await apiFetch<Article[]>('/articles');
            setArticles(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer cet article ?')) return;
        try {
            await apiFetch(`/articles/${id}`, { method: 'DELETE' });
            toast.success('Article supprimé');
            fetchArticles();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (article: Article) => {
        setEditingArticle(article);
        reset({
            name: article.name,
            category: article.category,
            unit: article.unit,
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: any) => {
        if (!editingArticle) return;
        try {
            await apiFetch(`/articles/${editingArticle.id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            toast.success('Article mis à jour !');
            setIsEditModalOpen(false);
            fetchArticles();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour.');
        }
    };

    const filtered = articles.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        exportToExcel(filtered, 'articles_catalogue', true);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Package className="text-indigo-600 h-8 w-8" />
                            Catalogue des Articles
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Gérez votre référentiel de matériaux et fournitures.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-black text-xs uppercase tracking-widest">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-article')} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition font-black shadow-lg shadow-indigo-100 text-xs uppercase tracking-widest">
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
                            placeholder="Rechercher par désignation, code, catégorie..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Désignation</th>
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4">Unité</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic font-medium">Chargement du catalogue...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic font-medium">Aucun article trouvé.</td></tr>
                        ) : filtered.map(art => (
                            <tr key={art.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 font-mono text-[11px] font-black text-indigo-600 uppercase tracking-wider">{art.code}</td>
                                <td className="px-6 py-4 font-black text-gray-800 uppercase tracking-tight">{art.name}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                                        {art.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-400 text-xs">{art.unit}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(art)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(art.id)}
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                            <h3 className="font-black text-gray-800 text-base uppercase tracking-widest">
                                Modifier Article
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Tag size={12} className="mr-2" /> Désignation
                                    </label>
                                    <input {...register('name', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-600 transition-all font-bold text-sm outline-none shadow-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Package size={12} className="mr-2" /> Catégorie
                                        </label>
                                        <select {...register('category', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-600 transition-all font-bold text-sm outline-none shadow-sm">
                                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Ruler size={12} className="mr-2" /> Unité
                                        </label>
                                        <select {...register('unit', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-600 transition-all font-bold text-sm outline-none shadow-sm">
                                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center space-x-3 shadow-indigo-100"
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

export default Articles;
