import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { ShoppingCart, Search, PlusCircle, Download, Edit2, Trash2, X, Save, FileText, Hash, Percent, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';

interface PurchaseInvoice {
    id: number;
    invoice_no: string;
    qty: number;
    unit_price: number;
    vat_rate: number;
    price_ht: number;
    price_ttc: number;
    article_id: number;
    supplier_id: number;
    article: { name: string; code: string; unit: string };
    supplier: { nom_societe: string };
    created_at: string;
}

const PurchaseInvoices: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [articles, setArticles] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm();
    const watchQty = watch('qty');
    const watchUnitPrice = watch('unit_price');
    const watchVatRate = watch('vat_rate');

    useEffect(() => {
        fetchInvoices();
        fetchDeps();
    }, []);

    const fetchInvoices = async () => {
        try {
            const data = await apiFetch<PurchaseInvoice[]>('/purchase-invoices');
            setInvoices(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeps = async () => {
        const [arts, sups] = await Promise.all([
            apiFetch<any[]>('/articles'),
            apiFetch<any[]>('/suppliers')
        ]);
        setArticles(arts);
        setSuppliers(sups);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer cette facture d\'achat ?')) return;
        try {
            await apiFetch(`/purchase-invoices/${id}`, { method: 'DELETE' });
            toast.success('Facture supprimée');
            fetchInvoices();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (invoice: PurchaseInvoice) => {
        setEditingInvoice(invoice);
        reset({
            invoice_no: invoice.invoice_no,
            article_id: invoice.article_id,
            supplier_id: invoice.supplier_id,
            qty: invoice.qty,
            unit_price: invoice.unit_price,
            vat_rate: invoice.vat_rate,
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: any) => {
        if (!editingInvoice) return;
        try {
            await apiFetch(`/purchase-invoices/${editingInvoice.id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            toast.success('Achat mis à jour !');
            setIsEditModalOpen(false);
            fetchInvoices();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour.');
        }
    };

    const filtered = invoices.filter(inv =>
        inv.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplier.nom_societe.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        exportToExcel(filtered.map(i => ({
            'N° FACTURE': i.invoice_no,
            'ARTICLE': i.article.name,
            'REFERENCE': i.article.code,
            'FOURNISSEUR': i.supplier.nom_societe,
            'QUANTITÉ': i.qty,
            'UNITE': i.article.unit,
            'PRIX UNITAIRE (DH)': i.unit_price,
            'TOTAL HT (DH)': i.price_ht,
            'TVA (%)': i.vat_rate,
            'TOTAL TTC (DH)': i.price_ttc,
            'DATE': new Date(i.created_at).toLocaleDateString()
        })), 'achats_complet', true);
    };

    const calcHT = (watchQty || 0) * (watchUnitPrice || 0);
    const calcTTC = calcHT * (1 + (watchVatRate || 0) / 100);

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <ShoppingCart className="text-emerald-600 h-8 w-8" />
                            Factures des Achats
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Suivi détaillé des entrées en stock et coûts (Image 2).</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-black text-xs uppercase tracking-widest">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-achat')} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition font-black shadow-lg shadow-emerald-100 text-xs uppercase tracking-widest">
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
                            placeholder="N°, Article ou Fournisseur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Facture / Date</th>
                            <th className="px-6 py-4">Article</th>
                            <th className="px-6 py-4">Fournisseur</th>
                            <th className="px-6 py-4">Qte × P.U</th>
                            <th className="px-6 py-4 text-right">Montant TTC</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Chargement des factures...</td></tr>
                        ) : filtered.map(inv => (
                            <tr key={inv.id} className="hover:bg-emerald-50/20 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 tracking-tight uppercase">{inv.invoice_no}</span>
                                        <span className="text-[10px] text-gray-400 font-medium italic">{new Date(inv.created_at).toLocaleDateString('fr-MA')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-700 uppercase">{inv.article.name}</span>
                                        <span className="text-[10px] text-indigo-500 font-mono italic">{inv.article.code}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">{inv.supplier.nom_societe}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-black tracking-tighter">{inv.qty} <span className="text-[9px] text-gray-400 uppercase">{inv.article.unit}</span></span>
                                        <span className="text-[10px] text-gray-500 italic">× {inv.unit_price} DH</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-black text-sm">
                                        {inv.price_ttc?.toLocaleString('fr-MA')} DH
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(inv)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(inv.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
                            <h3 className="font-black text-gray-800 text-base uppercase tracking-widest flex items-center gap-2">
                                <FileText size={18} /> Modifier Achat / Entrée
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">N° Facture</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input {...register('invoice_no', { required: true })} className="w-full h-11 pl-10 pr-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fournisseur</label>
                                    <select {...register('supplier_id', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none">
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Article</label>
                                    <select {...register('article_id', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none">
                                        {articles.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantité</label>
                                    <input type="number" step="0.01" {...register('qty', { required: true, valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">P.U (DH)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input type="number" step="0.01" {...register('unit_price', { required: true, valueAsNumber: true })} className="w-full h-11 pl-10 pr-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Percent size={12} /> TVA (%)
                                    </label>
                                    <select {...register('vat_rate', { required: true, valueAsNumber: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none">
                                        <option value={0}>0%</option>
                                        <option value={20}>20%</option>
                                    </select>
                                </div>

                                {/* Summary Display */}
                                <div className="md:col-span-1 bg-gray-50 p-4 rounded-2xl flex flex-col justify-center border border-gray-100 italic">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                                        <span>HT:</span>
                                        <span>{calcHT.toLocaleString('fr-MA')} DH</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-black text-emerald-600 uppercase mt-1">
                                        <span>Total TTC:</span>
                                        <span>{calcTTC.toLocaleString('fr-MA')} DH</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center space-x-3 shadow-emerald-100"
                            >
                                <Save size={20} />
                                <span>{isSubmitting ? 'Mise à jour...' : 'Confirmer l\'achat'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseInvoices;
