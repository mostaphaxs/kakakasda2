import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowDownLeft, Box, Building2, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Article {
    id: number;
    name: string;
    code: string;
    unit: string;
}

interface Bien {
    id: number;
    num_appartement: string;
    type_bien: string;
    nom?: string;
    immeuble?: string;
}

interface StockExitFormProps {
    onSuccess?: () => void;
}

const StockExitForm: React.FC<StockExitFormProps> = ({ onSuccess }) => {
    const navigate = useNavigate();
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
    const [articles, setArticles] = useState<Article[]>([]);
    const [biens, setBiens] = useState<Bien[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [articlesData, biensData] = await Promise.all([
                    apiFetch<Article[]>('/articles'),
                    apiFetch<Bien[]>('/biens')
                ]);
                const sortedBiens = biensData.sort((a, b) => {
                    const immA = a.immeuble || '';
                    const immB = b.immeuble || '';
                    if (immA !== immB) return immA.localeCompare(immB);

                    const valA = parseInt(a.num_appartement || '');
                    const valB = parseInt(b.num_appartement || '');
                    if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
                    return (a.num_appartement || '').localeCompare(b.num_appartement || '');
                });
                setArticles(articlesData);
                setBiens(sortedBiens);
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Erreur lors du chargement des données.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/stock/exit', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Affectation enregistrée avec succès !');
            reset();
            if (onSuccess) onSuccess();
            navigate('/stock');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de l’enregistrement.');
        }
    };

    if (loading) return <div className="p-4 text-center">Chargement du formulaire...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors font-semibold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-slate-50">
                    <div className="hidden">
                        <ArrowDownLeft className="h-8 w-8 text-rose-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Affectation Sortie</h2>
                        <p className="text-slate-400 text-sm font-medium">Déduisez du stock pour un bloc ou villa.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Article Selection */}
                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <Box className="h-4 w-4 mr-2 text-slate-400" />
                                Article
                            </label>
                            <select
                                {...register('article_id', { required: 'Ce champ est obligatoire' })}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            >
                                <option value="">Sélectionner un article</option>
                                {articles.map(article => (
                                    <option key={article.id} value={article.id}>
                                        {article.name} ({article.code})
                                    </option>
                                ))}
                            </select>
                            {errors.article_id && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.article_id.message as string}</p>}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-medium mb-2 text-slate-600">Quantité à affecter</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('qty', { required: 'Ce champ est obligatoire', min: 0.01 })}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="0.00"
                            />
                            {errors.qty && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.qty.message as string}</p>}
                        </div>

                        {/* Destination (Bien) */}
                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                                Destination (Villa/Bloc)
                            </label>
                            <select
                                {...register('destination_id', { required: 'Ce champ est obligatoire' })}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            >
                                <option value="">Sélectionner une destination</option>
                                {biens.map(bien => (
                                    <option key={bien.id} value={bien.id}>
                                        {bien.nom ? bien.nom : `${bien.type_bien === 'Appartement' ? 'Bloc' : bien.type_bien} - ${bien.num_appartement}`}
                                    </option>
                                ))}
                            </select>
                            {errors.destination_id && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.destination_id.message as string}</p>}
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-11 flex items-center justify-center space-x-3 text-white rounded-lg font-medium disabled:opacity-50 transition shadow-sm active:scale-[0.98] text-sm bg-slate-900 hover:bg-slate-800"
                        >
                            <Save className="h-5 w-5" />
                            <span>{isSubmitting ? 'Enregistrement...' : 'Confirmer la sortie'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockExitForm;
