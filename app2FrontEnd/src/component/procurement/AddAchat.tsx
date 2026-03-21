import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Save, ArrowLeft, TrendingUp } from 'lucide-react';

interface PurchaseInvoiceForm {
    invoice_no: string;
    supplier_id: string;
    article_id: string;
    qty: number;
    unit_price: number;
    vat_rate: number;
}

const AddAchat: React.FC = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<PurchaseInvoiceForm>({
        defaultValues: { vat_rate: 20 }
    });

    const qty = watch('qty') || 0;
    const price = watch('unit_price') || 0;
    const vat = watch('vat_rate') || 0;
    const ttc = (qty * price) * (1 + vat / 100);

    useEffect(() => {
        const load = async () => {
            try {
                const [art, sup] = await Promise.all([
                    apiFetch<any[]>('/articles'),
                    apiFetch<any[]>('/suppliers')
                ]);
                setArticles(art);
                setSuppliers(sup);
            } catch (error) {
                console.error(error);
            }
        };
        load();
    }, []);

    const onSubmit = async (data: any) => {
        try {
            await apiFetch('/purchase-invoices', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            toast.success('Achat enregistré ! Stock mis à jour.');
            navigate('/achats');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors font-bold text-sm">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-50">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-emerald-100 rounded-2xl">
                            <ShoppingBag className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Entrée Stock (Achat)</h2>
                            <p className="text-gray-400 text-sm font-medium">Enregistrez une facture pour approvisionner le stock.</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Global</p>
                        <p className="text-3xl font-black text-emerald-600">{ttc.toLocaleString('fr-MA')} <span className="text-xs">DH</span></p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Référence Facture</label>
                            <input {...register('invoice_no', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold shadow-sm" placeholder="Ex: FA-001/2024" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Fournisseur</label>
                            <select {...register('supplier_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold shadow-sm">
                                <option value="">Sélectionner</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Article Selectionné</label>
                            <select {...register('article_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold shadow-sm">
                                <option value="">Sélectionner un produit</option>
                                {articles.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-gray-100">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantité</label>
                            <input type="number" step="0.01" {...register('qty', { required: true, valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 font-black text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">P.U HT (DH)</label>
                            <input type="number" step="0.01" {...register('unit_price', { required: true, valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 font-black text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TVA (%)</label>
                            <input type="number" {...register('vat_rate', { valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 font-black text-slate-800" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs py-2 px-4 border-l-4 border-emerald-500 bg-emerald-50/50 rounded-r-lg">
                        <div className="flex items-center text-emerald-800">
                            <TrendingUp size={14} className="mr-2" />
                            <span className="font-bold font-mono">MONTANT HT: {(qty * price).toLocaleString('fr-MA')} DH</span>
                        </div>
                        <span className="font-bold text-emerald-800">TVA: {(qty * price * vat / 100).toLocaleString('fr-MA')} DH</span>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-3">
                        <Save size={20} />
                        <span>Confirmer l'achat et alimenter le stock</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddAchat;
