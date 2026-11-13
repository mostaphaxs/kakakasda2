import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, PlusCircle, Trash2, Hash, FileText, CheckCircle2 } from 'lucide-react';

interface PurchaseInvoiceItemForm {
    article_id: string;
    qty: number;
    unit_price: number;
    vat_rate: number;
}

interface PurchaseInvoiceForm {
    invoice_no?: string;
    reference_bon?: string;
    supplier_id: string;
    terrain_id?: string;
    scan_contract?: FileList | null;
    items: PurchaseInvoiceItemForm[];
}

import { extractAchatFromImage } from '../../lib/gemini';

const AddAchat: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as { supplier_id?: string | number; terrain_id?: string | number } | null;

    const [articles, setArticles] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [isAILoading, setIsAILoading] = useState(false);

    const { register, control, handleSubmit, watch, formState: { isSubmitting, errors }, setValue } = useForm<PurchaseInvoiceForm>({
        defaultValues: {
            supplier_id: state?.supplier_id ? String(state.supplier_id) : '',
            terrain_id: state?.terrain_id ? String(state.terrain_id) : '',
            items: [{ article_id: '', qty: 1, unit_price: 0, vat_rate: 20 }]
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = watch('items') || [];
    const scanFile = watch('scan_contract');

    const globalTotals = watchItems.reduce((acc, item) => {
        const q = item?.qty || 0;
        const p = item?.unit_price || 0;
        const v = item?.vat_rate || 0;
        const ht = q * p;
        const ttc = ht * (1 + v / 100);
        return { ht: acc.ht + ht, ttc: acc.ttc + ttc };
    }, { ht: 0, ttc: 0 });

    useEffect(() => {
        const load = async () => {
            try {
                const [art, sup, ter] = await Promise.all([
                    apiFetch<any[]>('/articles'),
                    apiFetch<any[]>('/suppliers'),
                    apiFetch<any[]>('/terrains')
                ]);
                setArticles(art);
                setSuppliers(sup);
                setTerrains(ter);

                if (state?.supplier_id) {
                    setValue('supplier_id', String(state.supplier_id));
                }
                if (state?.terrain_id) {
                    setValue('terrain_id', String(state.terrain_id));
                }
            } catch (error) {
                console.error(error);
            }
        };
        load();
    }, [state, setValue]);

    const handleAIFill = async () => {
        if (!scanFile || !scanFile[0]) {
            toast.error("Veuillez d'abord sélectionner un fichier (image ou PDF).");
            return;
        }

        try {
            setIsAILoading(true);
            const data = await extractAchatFromImage(scanFile[0]);

            if (data.invoice_no) setValue('invoice_no', data.invoice_no);
            if (data.reference_bon) setValue('reference_bon', data.reference_bon);

            if (data.items && data.items.length > 0) {
                const currentArticles = [...articles];

                const mappedItems = await Promise.all(data.items.map(async (item) => {
                    // Try to find the closest article by name/code
                    let matchedArticle = currentArticles.find(a =>
                        a.name.toLowerCase().includes(item.designation.toLowerCase()) ||
                        item.designation.toLowerCase().includes(a.name.toLowerCase()) ||
                        (a.code && item.designation.toLowerCase().includes(a.code.toLowerCase()))
                    );

                    // If not found, create it automatically
                    if (!matchedArticle) {
                        try {
                            const newArt = await apiFetch<any>('/articles', {
                                method: 'POST',
                                body: JSON.stringify({
                                    name: item.designation,
                                    category: 'Autres',
                                    unit: 'U'
                                })
                            });
                            matchedArticle = newArt;
                            currentArticles.push(newArt);
                            toast.success(`AI: Nouvel article créé pour "${item.designation.substring(0, 20)}..."`, { icon: '✨' });
                        } catch (err) {
                            console.error("Auto-create failed", err);
                        }
                    }

                    return {
                        article_id: matchedArticle ? String(matchedArticle.id) : '',
                        qty: item.qty || 1,
                        unit_price: item.unit_price || 0,
                        vat_rate: item.vat_rate || 20
                    };
                }));

                setArticles(currentArticles);
                replace(mappedItems);
                toast.success(`${data.items.length} articles extraits et synchronisés !`);
            }
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'extraction IA.");
        } finally {
            setIsAILoading(false);
        }
    }

    const onSubmit = async (data: any) => {
        if (!data.items || data.items.length === 0) {
            toast.error("Veuillez ajouter au moins un article.");
            return;
        }

        const fd = new FormData();
        if (data.invoice_no) fd.append('invoice_no', data.invoice_no);
        if (data.reference_bon) fd.append('reference_bon', data.reference_bon);
        fd.append('supplier_id', String(data.supplier_id));
        if (data.terrain_id) fd.append('terrain_id', String(data.terrain_id));
        if (data.scan_contract?.[0]) fd.append('scan_contract', data.scan_contract[0]);

        data.items.forEach((item: any, i: number) => {
            fd.append(`items[${i}][article_id]`, String(item.article_id));
            fd.append(`items[${i}][qty]`, String(item.qty));
            fd.append(`items[${i}][unit_price]`, String(item.unit_price));
            fd.append(`items[${i}][vat_rate]`, String(item.vat_rate || 0));
        });

        try {
            await apiFetch('/purchase-invoices', {
                method: 'POST',
                body: fd
            });
            toast.success('Achat enregistré ! Stock mis à jour.');
            navigate('/achats');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de l\'enregistrement.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors font-semibold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-600 p-8 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="hidden">
                            <ShoppingBag className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Entrée Stock (Achat)</h2>
                            <p className="text-emerald-100 text-sm font-medium mt-1">Enregistrez une facture avec plusieurs articles</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">

                    {/* EN-TÊTE DE LA FACTURE */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <FileText size={16} /> 1. Informations Générales
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">Référence Facture</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input {...register('invoice_no')} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Ex: FA-001/2024" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">Référence Bon</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input {...register('reference_bon')} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Ex: BC-001" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">Projet (Optionnel)</label>
                                <select {...register('terrain_id')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                    <option value="">Global / Pas de projet</option>
                                    {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">Fournisseur</label>
                                <select {...register('supplier_id', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                    <option value="">Sélectionner</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nom_societe}
                                            {s.type_entreprise ? ` (${s.type_entreprise})` : ''}
                                            {s.guarantee_checks?.length > 0 ? ' 🏦 [GARANTIE]' : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.supplier_id && <span className="text-red-500 text-xs font-medium mt-1 block">Le fournisseur est requis</span>}
                            </div>

                            <div className="flex flex-col">
                                <label className="block text-xs font-medium text-emerald-700/70 mb-2 text-slate-600">Scanner Contrat/Bon</label>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        {...register('scan_contract')}
                                        className="block w-full text-sm text-slate-500 file:mr-3 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 bg-white border border-slate-200 rounded-xl shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAIFill}
                                        disabled={isAILoading || !scanFile?.[0]}
                                        className={`px-4 rounded-lg flex items-center gap-2 font-semibold text-xs transition ${isAILoading || !scanFile?.[0]
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-600 to-emerald-600 text-white shadow-sm active:scale-[0.98]'
                                            }`}
                                    >
                                        {isAILoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Extraction...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-sm">✨</span>
                                                <span>Magic Fill</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LIGNES D'ARTICLES */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                                <ShoppingBag size={16} /> 2. Détails des articles
                            </h3>
                            <button type="button" onClick={() => append({ article_id: '', qty: 1, unit_price: 0, vat_rate: 20 })} className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
                                <PlusCircle size={16} /> Ajouter une ligne
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Entêtes de colonnes (visible sur grand écran) */}
                            <div className="hidden md:flex gap-4 px-6 text-xs font-semibold text-slate-400">
                                <div className="flex-[2]">Article</div>
                                <div className="w-24">Quantité</div>
                                <div className="w-32">P.U HT (DH)</div>
                                <div className="w-24">TVA (%)</div>
                                <div className="w-32 text-right">Total TTC</div>
                                <div className="w-10"></div>
                            </div>

                            {fields.map((item, index) => {
                                const q = watchItems[index]?.qty || 0;
                                const p = watchItems[index]?.unit_price || 0;
                                const v = watchItems[index]?.vat_rate || 0;
                                const lineTtc = (q * p) * (1 + v / 100);

                                return (
                                    <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 border border-slate-100 p-4 md:px-6 md:py-3 rounded-xl group hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                                        <div className="flex-[2] w-full md:w-auto">
                                            <label className="md:hidden block text-xs font-medium mb-1 text-slate-600">Article</label>
                                            <select {...register(`items.${index}.article_id` as const, { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                                <option value="">Sélectionner</option>
                                                {articles.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="w-full md:w-24">
                                            <label className="md:hidden block text-xs font-medium mb-1 text-slate-600">Qte</label>
                                            <input type="number" step="0.01" {...register(`items.${index}.qty` as const, { required: true, valueAsNumber: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                        </div>

                                        <div className="w-full md:w-32">
                                            <label className="md:hidden block text-xs font-medium mb-1 text-slate-600">P.U HT</label>
                                            <input type="number" step="0.01" {...register(`items.${index}.unit_price` as const, { required: true, valueAsNumber: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                        </div>

                                        <div className="w-full md:w-24">
                                            <label className="md:hidden block text-xs font-medium mb-1 text-slate-600">TVA (%)</label>
                                            <input type="number" {...register(`items.${index}.vat_rate` as const, { valueAsNumber: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                        </div>

                                        <div className="w-full md:w-32 md:text-right font-semibold text-emerald-800 tabular-nums">
                                            <label className="md:hidden block text-xs font-medium mb-1 text-slate-600">Total Ligne</label>
                                            <div className="h-11 flex items-center md:justify-end bg-white md:bg-transparent px-4 md:px-0 rounded-xl border border-slate-200 md:border-none">
                                                {lineTtc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs text-emerald-600 ml-1">DH</span>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-10 flex justify-end">
                                            {fields.length > 1 && (
                                                <button type="button" onClick={() => remove(index)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* TOTAL ET CONFIRMATION */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex gap-8 bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 w-full md:w-auto text-center md:text-left">
                            <div>
                                <p className="text-xs font-semibold text-slate-400">Total HT</p>
                                <p className="text-xl font-semibold text-slate-700 font-mono">{globalTotals.ht.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs">DH</span></p>
                            </div>
                            <div className="w-px bg-slate-200"></div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600">Total TTC Global</p>
                                <p className="text-2xl font-bold text-emerald-600 font-mono">{globalTotals.ttc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs">DH</span></p>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-11 px-4 text-white rounded-lg font-medium text-sm transition shadow-sm active:scale-[0.98] flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800">
                            {isSubmitting ? (
                                <span className="animate-pulse">Enregistrement...</span>
                            ) : (
                                <>
                                    <CheckCircle2 size={20} />
                                    <span>Valider L'achat</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AddAchat;
