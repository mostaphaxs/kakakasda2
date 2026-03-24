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
                setArticles(articlesData);
                setBiens(biensData);
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
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors font-bold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-gray-50">
                    <div className="p-3 bg-rose-100 rounded-2xl">
                        <ArrowDownLeft className="h-8 w-8 text-rose-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Affectation Sortie</h2>
                        <p className="text-gray-400 text-sm font-medium">Déduisez du stock pour un appartement ou villa.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Article Selection */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <Box className="h-4 w-4 mr-2 text-gray-400" />
                                Article
                            </label>
                            <select
                                {...register('article_id', { required: 'Ce champ est obligatoire' })}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20 text-sm font-bold transition-all shadow-sm outline-none"
                            >
                                <option value="">Sélectionner un article</option>
                                {articles.map(article => (
                                    <option key={article.id} value={article.id}>
                                        {article.name} ({article.code})
                                    </option>
                                ))}
                            </select>
                            {errors.article_id && <p className="mt-1 text-[10px] text-rose-500 font-bold uppercase">{errors.article_id.message as string}</p>}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Quantité à affecter</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('qty', { required: 'Ce champ est obligatoire', min: 0.01 })}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20 text-sm font-bold transition-all shadow-sm outline-none"
                                placeholder="0.00"
                            />
                            {errors.qty && <p className="mt-1 text-[10px] text-rose-500 font-bold uppercase">{errors.qty.message as string}</p>}
                        </div>

                        {/* Destination (Bien) */}
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                Destination (Villa/Appartement)
                            </label>
                            <select
                                {...register('destination_id', { required: 'Ce champ est obligatoire' })}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20 text-sm font-bold transition-all shadow-sm outline-none"
                            >
                                <option value="">Sélectionner une destination</option>
                                {biens.map(bien => (
                                    <option key={bien.id} value={bien.id}>
                                        {bien.nom ? bien.nom : `${bien.type_bien} - ${bien.num_appartement}`}
                                    </option>
                                ))}
                            </select>
                            {errors.destination_id && <p className="mt-1 text-[10px] text-rose-500 font-bold uppercase">{errors.destination_id.message as string}</p>}
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 flex items-center justify-center space-x-3 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 disabled:opacity-50 transition-all shadow-lg active:scale-95 shadow-rose-100"
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
