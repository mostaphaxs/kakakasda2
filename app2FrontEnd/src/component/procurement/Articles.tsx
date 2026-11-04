import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Package, Search, PlusCircle, Trash2, Download, Edit2, X, Save, Tag, Ruler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';
import { confirmDialog } from '../common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../../lib/usePersistedState';

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
    const [searchTerm, setSearchTerm] = usePersistedState('Articles.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const headerRef = React.useRef<HTMLDivElement>(null);
    const [stickyOffset, setStickyOffset] = React.useState(0);

    React.useEffect(() => {
        const updateOffset = () => {
            if (headerRef.current) {
                // Buffer for the sticky top-4 (1rem = 16px approx)
                setStickyOffset(headerRef.current.offsetHeight + 16);
            }
        };

        updateOffset();
        window.addEventListener('resize', updateOffset);
        const observer = new ResizeObserver(updateOffset);
        if (headerRef.current) observer.observe(headerRef.current);

        return () => {
            window.removeEventListener('resize', updateOffset);
            observer.disconnect();
        };
    }, []);


    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    const CATEGORIES = ['Fer', 'Ciment', 'Sable', 'Gravier', 'Gravier 0', 'Gravier 1', 'Gravier 2', 'Gravier 3', 'Tuf', 'Tuf Noir', 'Tuf Jaune', 'Marbre', 'Carrelage', 'Electricité', 'Plomberie', 'Peinture', 'Autres'];
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
        if (!await confirmDialog('Supprimer cet article ?')) return;
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
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 mx-1"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                            <Package className="text-blue-600 h-8 w-8" />
                            Catalogue des Articles
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Gérez votre référentiel de matériaux et fournitures.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition font-medium text-sm">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-article')} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg transition font-medium shadow-sm text-sm bg-slate-900 hover:bg-slate-800">
                            <PlusCircle size={18} />
                            Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher par désignation, code, catégorie..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead
                        className="sticky z-20 bg-white border-b border-slate-200"
                        style={{ top: `${stickyOffset}px` }}
                    >
                        <tr>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Code</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Désignation</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Catégorie</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Unité</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Chargement du catalogue...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Aucun article trouvé.</td></tr>
                        ) : filtered.map(art => (
                            <tr key={art.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{art.code}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800 tracking-tight">{art.name}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                        {art.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-400 text-xs">{art.unit}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center md:transition-opacity justify-end gap-0.5">
                                        <button
                                            onClick={() => handleEdit(art)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                            title="Modifier"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(art.id)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                            <h3 className="font-semibold text-slate-800 text-base">
                                Modifier Article
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                        <Tag size={12} className="mr-2" /> Désignation
                                    </label>
                                    <input {...register('name', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                            <Package size={12} className="mr-2" /> Catégorie
                                        </label>
                                        <select {...register('category', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                            <Ruler size={12} className="mr-2" /> Unité
                                        </label>
                                        <select {...register('unit', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center space-x-3 text-sm bg-slate-900 hover:bg-slate-800"
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
