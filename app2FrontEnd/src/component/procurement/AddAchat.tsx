import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Save, ArrowLeft, PlusCircle, Trash2, Hash, FileText, CheckCircle2 } from 'lucide-react';

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

const AddAchat: React.FC = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);

    const { register, control, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<PurchaseInvoiceForm>({
        defaultValues: {
            items: [{ article_id: '', qty: 1, unit_price: 0, vat_rate: 20 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = watch('items') || [];

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
            } catch (error) {
                console.error(error);
            }
        };
        load();
    }, []);

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
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors font-bold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="bg-emerald-600 p-8 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <ShoppingBag className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Entrée Stock (Achat)</h2>
                            <p className="text-emerald-100 text-sm font-medium mt-1">Enregistrez une facture avec plusieurs articles</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">

                    {/* EN-TÊTE DE LA FACTURE */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                            <FileText size={16} /> 1. Informations Générales
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Référence Facture</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input {...register('invoice_no')} className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-bold shadow-sm outline-none" placeholder="Ex: FA-001/2024" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Référence Bon</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input {...register('reference_bon')} className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-bold shadow-sm outline-none" placeholder="Ex: BC-001" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Projet (Optionnel)</label>
                                <select {...register('terrain_id')} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-bold shadow-sm outline-none">
                                    <option value="">Global / Pas de projet</option>
                                    {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Fournisseur</label>
                                <select {...register('supplier_id', { required: true })} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-bold shadow-sm outline-none">
                                    <option value="">Sélectionner</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                </select>
                                {errors.supplier_id && <span className="text-red-500 text-xs font-bold mt-1 block">Le fournisseur est requis</span>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-emerald-700/70 uppercase tracking-widest mb-2">Scanner Contrat/Bon</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    {...register('scan_contract')}
                                    className="block w-full text-sm text-slate-500 file:mr-3 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 bg-white border border-gray-200 rounded-xl shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* LIGNES D'ARTICLES */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <ShoppingBag size={16} /> 2. Détails des articles
                            </h3>
                            <button type="button" onClick={() => append({ article_id: '', qty: 1, unit_price: 0, vat_rate: 20 })} className="flex items-center gap-2 text-xs font-black uppercase text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
                                <PlusCircle size={16} /> Ajouter une ligne
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Entêtes de colonnes (visible sur grand écran) */}
                            <div className="hidden md:flex gap-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
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
                                    <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-gray-50 border border-gray-100 p-4 md:px-6 md:py-3 rounded-2xl group hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                                        <div className="flex-[2] w-full md:w-auto">
                                            <label className="md:hidden block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Article</label>
                                            <select {...register(`items.${index}.article_id` as const, { required: true })} className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-bold text-sm outline-none">
                                                <option value="">Sélectionner</option>
                                                {articles.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="w-full md:w-24">
                                            <label className="md:hidden block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Qte</label>
                                            <input type="number" step="0.01" {...register(`items.${index}.qty` as const, { required: true, valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm outline-none" />
                                        </div>

                                        <div className="w-full md:w-32">
                                            <label className="md:hidden block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">P.U HT</label>
                                            <input type="number" step="0.01" {...register(`items.${index}.unit_price` as const, { required: true, valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm outline-none" />
                                        </div>

                                        <div className="w-full md:w-24">
                                            <label className="md:hidden block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TVA (%)</label>
                                            <input type="number" {...register(`items.${index}.vat_rate` as const, { valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm outline-none" />
                                        </div>

                                        <div className="w-full md:w-32 md:text-right font-black text-emerald-800 tabular-nums">
                                            <label className="md:hidden block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Ligne</label>
                                            <div className="h-11 flex items-center md:justify-end bg-white md:bg-transparent px-4 md:px-0 rounded-xl border border-gray-200 md:border-none">
                                                {lineTtc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-[10px] text-emerald-600 ml-1">DH</span>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-10 flex justify-end">
                                            {fields.length > 1 && (
                                                <button type="button" onClick={() => remove(index)} className="h-11 w-11 flex justify-center items-center rounded-xl text-rose-300 hover:text-white hover:bg-rose-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* TOTAL ET CONFIRMATION */}
                    <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex gap-8 bg-slate-50 px-6 py-4 rounded-2xl border border-gray-200 w-full md:w-auto text-center md:text-left">
                            <div>
                                <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">Total HT</p>
                                <p className="text-xl font-bold text-slate-700 font-mono">{globalTotals.ht.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs">DH</span></p>
                            </div>
                            <div className="w-px bg-gray-200"></div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest uppercase text-emerald-600">Total TTC Global</p>
                                <p className="text-2xl font-black text-emerald-600 font-mono">{globalTotals.ttc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs">DH</span></p>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-14 px-8 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 flex items-center justify-center space-x-3">
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
