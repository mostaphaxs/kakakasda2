import React, { useEffect, useState } from 'react';
import { apiFetch, STORAGE_BASE } from '../../lib/api';
import { openExternal } from '../../lib/tauri';
import { ShoppingCart, Search, PlusCircle, Download, Edit2, Trash2, X, Save, FileText, Hash, Package, Eye, Banknote, Calendar as CalendarIcon, Loader2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { formatNumber, parseNumber } from '../../lib/utils';
import { useForm, useFieldArray } from 'react-hook-form';

interface PurchaseInvoiceItem {
    id: number;
    article_id: number;
    qty: number;
    unit_price: number;
    vat_rate: number;
    price_ht: number;
    price_ttc: number;
    article: { name: string; code: string; unit: string };
}

interface PurchaseInvoice {
    id: number;
    invoice_no?: string | null;
    reference_bon?: string | null;
    supplier_id: number;
    total_ht: number;
    total_ttc: number;
    scan_contract?: string | null;
    scan_contract_url?: string | null;
    created_at: string;
    supplier: { nom_societe: string };
    terrain?: { nom_terrain: string };
    items: PurchaseInvoiceItem[];
    paid_amount: number;
    balance: number;
    payments?: any[];
}

interface PurchaseInvoiceForm {
    invoice_no?: string;
    reference_bon?: string;
    supplier_id: string | number;
    scan_contract?: FileList | null;
    items: {
        id?: number;
        article_id: string | number;
        qty: number;
        unit_price: number;
        vat_rate: number;
    }[];
}

const PurchaseInvoices: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
    const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('fr-MA'));
    const [paymentMethod, setPaymentMethod] = useState('Virement');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentBank, setPaymentBank] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);

    // Editing individual payments
    const [editingPayment, setEditingPayment] = useState<any | null>(null);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterHasScan, setFilterHasScan] = useState(false);
    const [filterInvoiceRef, setFilterInvoiceRef] = useState<'all' | 'with' | 'without'>('all');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const hasActiveFilters = filterSupplier || filterHasScan || filterInvoiceRef !== 'all';
    const clearFilters = () => { setFilterSupplier(''); setFilterHasScan(false); setFilterInvoiceRef('all'); };

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [articles, setArticles] = useState<any[]>([]);

    const { register, control, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<PurchaseInvoiceForm>({
        defaultValues: { items: [] }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = watch('items') || [];
    const editTotals = watchItems.reduce((acc, item) => {
        const q = item?.qty || 0;
        const p = item?.unit_price || 0;
        const v = item?.vat_rate || 0;
        const ht = q * p;
        return { ht: acc.ht + ht, ttc: acc.ttc + (ht * (1 + v / 100)) };
    }, { ht: 0, ttc: 0 });

    useEffect(() => {
        fetchInvoices();
        apiFetch<any[]>('/suppliers').then(setSuppliers).catch(console.error);
        apiFetch<any[]>('/articles').then(setArticles).catch(console.error);
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

    const handleViewContract = (path: string) => {
        if (!path) return;
        const url = encodeURI(`${STORAGE_BASE}/${path.replace(/^\/?storage\//, '')}`);
        openExternal(url);
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

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        const amount = parseNumber(paymentAmount);
        if (amount <= 0) {
            toast.error('Veuillez entrer un montant valide');
            return;
        }

        setIsSubmittingPayment(true);
        const fd = new FormData();
        fd.append('amount', String(amount));
        fd.append('payment_date', paymentDate);
        fd.append('method', paymentMethod);
        if (paymentReference) fd.append('reference_no', paymentReference);
        if (paymentBank) fd.append('bank_name', paymentBank);
        if (paymentNotes) fd.append('notes', paymentNotes);
        if (paymentProof) fd.append('scan_path', paymentProof);

        try {
            const result = await apiFetch<PurchaseInvoice>(`/purchase-invoices/${selectedInvoice.id}/payments`, {
                method: 'POST',
                body: fd
            });

            toast.success('Paiement enregistré !');
            setInvoices(prev => prev.map(inv => inv.id === result.id ? result : inv));
            if (viewingInvoice?.id === result.id) {
                setViewingInvoice(result);
            }
            setIsPaymentModalOpen(false);
            resetPaymentForm();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de l’enregistrement');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce versement ?')) return;

        try {
            await apiFetch(`/contractor-payments/${paymentId}`, { method: 'DELETE' });
            toast.success('Versement supprimé');
            fetchInvoices(); // Refresh to get updated paid_amount/balance
            if (viewingInvoice) {
                setViewingInvoice(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        payments: prev.payments?.filter(p => p.id !== paymentId)
                    };
                });
            }
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la suppression');
        }
    };

    const handleOpenEditPayment = (payment: any) => {
        setEditingPayment(payment);
        setPaymentAmount(formatNumber(payment.amount));
        setPaymentDate(payment.payment_date);
        setPaymentMethod(payment.method);
        setPaymentReference(payment.reference_no || '');
        setPaymentBank(payment.bank_name || '');
        setPaymentNotes(payment.notes || '');
        setIsEditPaymentModalOpen(true);
    };

    const handleUpdatePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayment) return;

        const amount = parseNumber(paymentAmount);
        setIsSubmittingPayment(true);
        const fd = new FormData();
        fd.append('_method', 'PUT');
        fd.append('amount', String(amount));
        fd.append('payment_date', paymentDate);
        fd.append('method', paymentMethod);
        fd.append('reference_no', paymentReference);
        fd.append('bank_name', paymentBank);
        fd.append('notes', paymentNotes);
        if (paymentProof) fd.append('scan_path', paymentProof);

        try {
            await apiFetch(`/contractor-payments/${editingPayment.id}`, {
                method: 'POST', // FormData with PUT usually needs POST + _method
                body: fd
            });

            toast.success('Versement mis à jour');
            setIsEditPaymentModalOpen(false);
            setEditingPayment(null);
            resetPaymentForm();
            fetchInvoices();
            setViewingInvoice(null);
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la modification');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const resetPaymentForm = () => {
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('Espèces');
        setPaymentReference('');
        setPaymentBank('');
        setPaymentNotes('');
        setPaymentProof(null);
    };

    const handleOpenPaymentModal = (invoice: PurchaseInvoice) => {
        setSelectedInvoice(invoice);
        resetPaymentForm();
        setIsPaymentModalOpen(true);
    };

    const handleEdit = (invoice: PurchaseInvoice) => {
        setEditingInvoice(invoice);
        reset({
            invoice_no: invoice.invoice_no || '',
            reference_bon: invoice.reference_bon || '',
            supplier_id: invoice.supplier_id,
            items: invoice.items.map(i => ({
                id: i.id,
                article_id: i.article_id,
                qty: i.qty,
                unit_price: i.unit_price,
                vat_rate: i.vat_rate,
            }))
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: PurchaseInvoiceForm) => {
        if (!editingInvoice) return;
        if (!data.items || data.items.length === 0) {
            toast.error('Veuillez ajouter au moins un article.');
            return;
        }

        const fd = new FormData();
        fd.append('_method', 'PUT'); // PHP Laravel override
        if (data.invoice_no) fd.append('invoice_no', data.invoice_no);
        if (data.reference_bon) fd.append('reference_bon', data.reference_bon);
        fd.append('supplier_id', String(data.supplier_id));
        if (data.scan_contract && data.scan_contract[0]) {
            fd.append('scan_contract', data.scan_contract[0]);
        }

        data.items.forEach((item, i) => {
            if (item.id) fd.append(`items[${i}][id]`, String(item.id));
            fd.append(`items[${i}][article_id]`, String(item.article_id));
            fd.append(`items[${i}][qty]`, String(item.qty));
            fd.append(`items[${i}][unit_price]`, String(item.unit_price));
            fd.append(`items[${i}][vat_rate]`, String(item.vat_rate || 0));
        });

        try {
            await apiFetch(`/purchase-invoices/${editingInvoice.id}`, {
                method: 'POST', // POST with _method=PUT to support files!
                body: fd
            });
            toast.success('Facture et articles mis à jour avec succès !');
            setIsEditModalOpen(false);
            fetchInvoices();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour.');
        }
    };

    const filtered = invoices.filter(inv => {
        const term = searchTerm.toLowerCase();
        if (term && !(
            (inv.invoice_no?.toLowerCase().includes(term)) ||
            (inv.reference_bon?.toLowerCase().includes(term)) ||
            (inv.supplier?.nom_societe.toLowerCase().includes(term)) ||
            (inv.items.some(item => item.article.name.toLowerCase().includes(term)))
        )) return false;
        if (filterSupplier && String(inv.supplier_id) !== filterSupplier) return false;
        if (filterHasScan && !inv.scan_contract) return false;
        if (filterInvoiceRef === 'with' && !inv.invoice_no) return false;
        if (filterInvoiceRef === 'without' && !!inv.invoice_no) return false;
        return true;
    });

    const handleExport = () => {
        const rows: any[] = [];
        filtered.forEach(i => {
            i.items.forEach(item => {
                rows.push({
                    'N° FACTURE': i.invoice_no || '-',
                    'N° BON': i.reference_bon || '-',
                    'FOURNISSEUR': i.supplier.nom_societe,
                    'ARTICLE': item.article.name,
                    'REFERENCE': item.article.code,
                    'QUANTITÉ': item.qty,
                    'UNITE': item.article.unit,
                    'PRIX UNITAIRE (DH)': item.unit_price,
                    'TOTAL HT (DH)': item.price_ht,
                    'TVA (%)': item.vat_rate,
                    'TOTAL TTC (DH)': item.price_ttc,
                    'DATE FACTURE': new Date(i.created_at).toLocaleDateString()
                });
            });
        });
        exportToExcel(rows, 'achats_complet', true);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <ShoppingCart className="text-emerald-600 h-8 w-8" />
                            Factures des Achats
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Suivi détaillé des entrées en stock et factures.</p>
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

                {/* ── Search & Filters Bar ── */}
                <div className="pt-4 border-t border-gray-50 space-y-3">
                    <div className="flex items-center gap-3">
                        {/* Quick search */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="N° Facture, Article ou Fournisseur..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        {/* Advanced toggle */}
                        <button
                            onClick={() => setShowAdvanced(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-xs uppercase tracking-widest transition-all ${showAdvanced || hasActiveFilters
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" /></svg>
                            Filtres {hasActiveFilters && <span className="ml-1 bg-white text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">{[filterSupplier, filterHasScan, filterInvoiceRef !== 'all'].filter(Boolean).length}</span>}
                        </button>
                        {/* Clear */}
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all">
                                <X size={14} /> Effacer
                            </button>
                        )}
                    </div>

                    {/* Advanced filters panel */}
                    {showAdvanced && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Supplier */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fournisseur</label>
                                <select
                                    value={filterSupplier}
                                    onChange={e => setFilterSupplier(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-emerald-500 transition-all"
                                >
                                    <option value="">Tous</option>
                                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                </select>
                            </div>

                            {/* N° Facture with/without */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">N° Facture</label>
                                <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white h-9">
                                    {(['all', 'with', 'without'] as const).map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setFilterInvoiceRef(opt)}
                                            className={`flex-1 text-[10px] font-black uppercase tracking-widest transition-all ${filterInvoiceRef === opt
                                                ? 'bg-emerald-600 text-white'
                                                : 'text-gray-400 hover:bg-gray-100'
                                                }`}
                                        >
                                            {opt === 'all' ? 'Tous' : opt === 'with' ? 'Avec ✓' : 'Sans ✗'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scan only */}
                            <div className="flex flex-col justify-end">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contrat Scanné</label>
                                <button
                                    type="button"
                                    onClick={() => setFilterHasScan(v => !v)}
                                    className={`w-full h-9 rounded-lg border font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 px-3 ${filterHasScan
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-400'
                                        }`}
                                >
                                    <FileText size={12} /> {filterHasScan ? 'Oui ✓' : 'Tous'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Result count */}
                    {(searchTerm || hasActiveFilters) && (
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''} sur {invoices.length}
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Facture / Bon (Date)</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Fournisseur</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Projet</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Montant Global TTC</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Versé</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Solde</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="p-10 text-center text-gray-400 italic">Chargement des factures...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-bold">Aucune facture trouvée</td></tr>
                        ) : filtered.map(inv => (
                            <tr key={inv.id} className="hover:bg-emerald-50/20 transition-colors group">
                                <td className="px-6 py-4 align-top">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 tracking-tight uppercase">
                                            {inv.invoice_no || inv.reference_bon || 'SANS RÉFÉRENCE'}
                                        </span>
                                        {inv.invoice_no && inv.reference_bon && (
                                            <span className="text-[10px] text-gray-500 font-medium italic mb-1">
                                                Bon: <span className="font-bold">{inv.reference_bon}</span>
                                            </span>
                                        )}
                                        <span className="text-[10px] text-emerald-600/70 font-black">
                                            {new Date(inv.created_at).toLocaleDateString('fr-MA')}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-6 py-4 align-top font-bold text-gray-600 uppercase text-xs">
                                    {inv.supplier.nom_societe}
                                </td>

                                <td className="px-6 py-4 align-top">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${inv.terrain ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                        {inv.terrain?.nom_terrain || 'Global'}
                                    </span>
                                </td>



                                <td className="px-6 py-4 align-top text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-xs text-gray-700">
                                            {inv.total_ttc?.toLocaleString('fr-MA')} DH
                                        </span>
                                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                                            HT: {inv.total_ht?.toLocaleString('fr-MA')}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-6 py-4 align-top text-right">
                                    <span className="font-black text-xs text-emerald-600">
                                        {inv.paid_amount?.toLocaleString('fr-MA')} DH
                                    </span>
                                </td>

                                <td className="px-6 py-4 align-top text-right">
                                    <span className={`px-2 py-1 rounded-lg font-black text-xs ${inv.balance <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {inv.balance <= 0 ? 'SOLDE' : `${inv.balance?.toLocaleString('fr-MA')} DH`}
                                    </span>
                                </td>

                                <td className="px-6 py-4 align-top text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button onClick={() => setViewingInvoice(inv)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Détails Articles">
                                            <Eye size={18} />
                                        </button>
                                        <button onClick={() => handleOpenPaymentModal(inv)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100" title="Ajouter une Avance">
                                            <PlusCircle size={18} />
                                        </button>
                                        {inv.scan_contract && (
                                            <button onClick={() => handleViewContract(inv.scan_contract!)} title="Voir Scan" className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100">
                                                <FileText size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(inv)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Modifier">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(inv.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Supprimer">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* View Details Modal */}
            {viewingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                            <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest flex items-center gap-2">
                                <Eye size={18} className="text-blue-600" /> Détails de la Facture {viewingInvoice.invoice_no || viewingInvoice.reference_bon || ''}
                            </h3>
                            <div className="flex items-center gap-3">
                                {viewingInvoice.scan_contract && (
                                    <button onClick={() => handleViewContract(viewingInvoice.scan_contract!)} className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-sm">
                                        <FileText size={16} /> Voir Contrat
                                    </button>
                                )}
                                <button onClick={() => setViewingInvoice(null)} className="p-2 hover:bg-blue-200 text-gray-500 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
                            {/* Section Articles */}
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Package size={14} className="text-blue-400" /> Articles de la Facture
                                </h4>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Article</th>
                                            <th className="px-4 py-3 text-center">Quantité</th>
                                            <th className="px-4 py-3 text-right">P.U HT</th>
                                            <th className="px-4 py-3 text-center">TVA</th>
                                            <th className="px-4 py-3 text-right rounded-r-lg">Total TTC</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {viewingInvoice.items.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-700">
                                                    {item.article.code} - {item.article.name}
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-gray-600">
                                                    {item.qty} <span className="text-[10px] text-gray-400">{item.article.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-gray-600">
                                                    {item.unit_price?.toLocaleString('fr-MA')} <span className="text-[10px]">DH</span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-500">
                                                    {item.vat_rate}%
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-emerald-600 font-mono">
                                                    {item.price_ttc?.toLocaleString('fr-MA')} <span className="text-[10px]">DH</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Section Historique des Versements */}
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Banknote size={14} className="text-emerald-400" /> Historique des Versements (Avances)
                                </h4>
                                <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-emerald-100/50 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
                                            <tr>
                                                <th className="px-4 py-2">Date</th>
                                                <th className="px-4 py-2">Méthode</th>
                                                <th className="px-4 py-2">Réf / Banque</th>
                                                <th className="px-4 py-2 text-right">Montant</th>
                                                <th className="px-4 py-2 text-center w-20">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-100">
                                            {viewingInvoice.payments && viewingInvoice.payments.length > 0 ? (
                                                viewingInvoice.payments.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-white transition-colors">
                                                        <td className="px-4 py-2 font-bold text-gray-600 text-xs">{p.payment_date}</td>
                                                        <td className="px-4 py-2 text-gray-500 text-xs font-medium">{p.method}</td>
                                                        <td className="px-4 py-2 text-gray-400 text-[10px] italic">
                                                            {p.reference_no} {p.bank_name && `- ${p.bank_name}`}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-black text-emerald-700 text-xs font-mono">
                                                            {p.amount?.toLocaleString('fr-MA')} DH
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {p.scan_path && (
                                                                    <button
                                                                        onClick={() => openExternal(`${STORAGE_BASE}/${p.scan_path}`)}
                                                                        className="p-1 text-emerald-500 hover:bg-emerald-100 rounded-lg transition-colors"
                                                                        title="Voir Preuve"
                                                                    >
                                                                        <FileText size={14} />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => handleOpenEditPayment(p)} className="p-1 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeletePayment(p.id)} className="p-1 text-rose-400 hover:bg-rose-100 rounded-lg transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-6 text-center text-[10px] font-black text-gray-400 uppercase italic">
                                                        Aucun versement enregistré
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setViewingInvoice(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-300 transition-colors uppercase tracking-widest text-[10px]">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Full Invoice Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50 shrink-0">
                            <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest flex items-center gap-2">
                                <Edit2 size={18} className="text-emerald-600" /> Modifier la Facture Complexe
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-emerald-200 text-gray-500 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 flex-1 bg-gray-50">
                            <form id="editInvoiceForm" onSubmit={handleSubmit(onSubmitUpdate)} className="space-y-8">
                                {/* Entête */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-200">
                                        <FileText size={14} /> 1. Informations Générales
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">N° Facture</label>
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                <input {...register('invoice_no')} className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition-all font-bold text-xs outline-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Référence Bon</label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                <input {...register('reference_bon')} className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition-all font-bold text-xs outline-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fournisseur</label>
                                            <select {...register('supplier_id', { required: true })} className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition-all font-bold text-xs outline-none">
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                <span>Scan Facture (Opt.)</span>
                                                {editingInvoice?.scan_contract && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openExternal(`${STORAGE_BASE}/${editingInvoice.scan_contract}`)}
                                                        className="text-blue-500 hover:underline lowercase font-bold flex items-center gap-1"
                                                    >
                                                        <Eye size={10} /> Voir actuel
                                                    </button>
                                                )}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    {...register('scan_contract')}
                                                    className="hidden"
                                                    id="edit-invoice-scan"
                                                />
                                                <label
                                                    htmlFor="edit-invoice-scan"
                                                    className={`w-full flex items-center gap-3 px-4 py-2 bg-gray-50 border border-dashed rounded-xl cursor-pointer transition-all ${watch('scan_contract')?.[0] ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-emerald-400'
                                                        }`}
                                                >
                                                    <div className={`p-1.5 rounded-lg border transition-all ${watch('scan_contract')?.[0] ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-emerald-600'
                                                        }`}>
                                                        <Upload size={14} />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-[11px] font-bold text-gray-700 truncate">
                                                            {watch('scan_contract')?.[0] ? watch('scan_contract')?.[0]?.name : (editingInvoice?.scan_contract ? '✅ Scan existant - Remplacer' : 'Choisir un fichier')}
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Articles */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Package size={14} /> 2. Articles Sélectionnés
                                        </h4>
                                        <button type="button" onClick={() => append({ article_id: '', qty: 1, unit_price: 0, vat_rate: 20 })} className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                                            <PlusCircle size={14} /> Ajouter
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {fields.map((item, index) => (
                                            <div key={item.id} className="flex flex-col md:flex-row items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl hover:border-emerald-300 transition-colors shadow-sm">
                                                {/* Hidden ID field for existing items */}
                                                <input type="hidden" {...register(`items.${index}.id` as const)} />

                                                <div className="flex-[2] w-full">
                                                    <select {...register(`items.${index}.article_id` as const, { required: true })} className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-xs outline-none">
                                                        <option value="">Sélectionner l'article</option>
                                                        {articles.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                                    </select>
                                                </div>

                                                <div className="w-full md:w-20">
                                                    <input type="number" step="0.01" placeholder="Qté" {...register(`items.${index}.qty` as const, { required: true, valueAsNumber: true })} className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-xs outline-none text-center" title="Quantité" />
                                                </div>

                                                <div className="w-full md:w-24">
                                                    <input type="number" step="0.01" placeholder="P.U HT" {...register(`items.${index}.unit_price` as const, { required: true, valueAsNumber: true })} className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-xs outline-none text-right tabular-nums" title="Prix Unitaire HT" />
                                                </div>

                                                <div className="w-full md:w-20">
                                                    <input type="number" placeholder="TVA %" {...register(`items.${index}.vat_rate` as const, { valueAsNumber: true })} className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-xs outline-none text-center" title="TVA (%)" />
                                                </div>

                                                <div className="w-full md:w-10 flex justify-center">
                                                    <button type="button" onClick={() => remove(index)} className="h-10 w-10 flex justify-center items-center rounded-lg text-rose-400 hover:text-white hover:bg-rose-500 transition-colors border border-transparent hover:border-rose-600">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {fields.length === 0 && (
                                            <p className="text-center text-xs font-bold text-gray-400 py-4 uppercase">Aucun article ajouté.</p>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                                <div className="text-gray-400">Total HT: <span className="text-gray-700 font-mono ml-1">{editTotals.ht.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</span></div>
                                <div className="text-emerald-600">TTC: <span className="font-mono text-sm ml-1">{editTotals.ttc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</span></div>
                            </div>

                            <button
                                type="submit"
                                form="editInvoiceForm"
                                disabled={isSubmitting}
                                className="h-12 px-6 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center space-x-2 shadow-emerald-100"
                            >
                                <Save size={16} />
                                <span>{isSubmitting ? 'Sauvegarde...' : 'Enregistrer'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Payment Modal (Avance) */}
            {isPaymentModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Banknote size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest">Enregistrer une Avance</h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Facture: {selectedInvoice.invoice_no || selectedInvoice.reference_bon || 'SANS RÉFÉRENCE'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Montant du versement (DH)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs uppercase">DH</span>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(formatNumber(e.target.value))}
                                        placeholder="0"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-black text-lg text-gray-800"
                                    />
                                </div>
                                <p className="text-[10px] text-rose-500 font-bold mt-1.5">Solde actuel: {selectedInvoice.balance.toLocaleString('fr-MA')} DH</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Date</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="date"
                                            required
                                            value={paymentDate.includes('/') ? paymentDate.split('/').reverse().join('-') : paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Méthode</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                    >
                                        <option value="Espèces">Espèces</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                            </div>

                            {paymentMethod !== 'Espèces' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Référence</label>
                                        <input
                                            type="text"
                                            value={paymentReference}
                                            onChange={(e) => setPaymentReference(e.target.value)}
                                            placeholder="N° Chèque/Virement"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Banque</label>
                                        <input
                                            type="text"
                                            value={paymentBank}
                                            onChange={(e) => setPaymentBank(e.target.value)}
                                            placeholder="Nom de la banque"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Notes (Optionnel)</label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Précisions sur le paiement..."
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs h-20 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Preuve de paiement (Image/PDF)</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="add-payment-upload"
                                    />
                                    <label
                                        htmlFor="add-payment-upload"
                                        className={`w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl hover:bg-gray-100 hover:border-emerald-400 cursor-pointer transition-all`}
                                    >
                                        <div className="p-2 bg-white shadow-sm border border-gray-100 rounded-lg text-emerald-600">
                                            <Upload size={16} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-gray-700 truncate">
                                                {paymentProof ? paymentProof.name : 'Choisir un fichier'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">{paymentProof ? `${(paymentProof.size / 1024).toFixed(0)} KB` : 'Max 5MB (JPG, PNG, PDF)'}</p>
                                        </div>
                                        {paymentProof && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setPaymentProof(null); }}
                                                className="p-1 hover:bg-red-50 text-red-500 rounded-lg"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingPayment}
                                className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center space-x-3 shadow-emerald-100 disabled:opacity-50"
                            >
                                {isSubmittingPayment ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Confirmer le Paiement</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Payment Modal */}
            {isEditPaymentModalOpen && editingPayment && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Edit2 size={20} />
                                </div>
                                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest">Modifier Versement</h3>
                            </div>
                            <button onClick={() => setIsEditPaymentModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePayment} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Montant (DH)</label>
                                <input
                                    type="text"
                                    required
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(formatNumber(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-lg text-gray-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Méthode</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs"
                                    >
                                        <option value="Espèces">Espèces</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest flex items-center justify-between">
                                    <span>Preuve de paiement (Image/PDF)</span>
                                    {editingPayment?.scan_path && (
                                        <button
                                            type="button"
                                            onClick={() => openExternal(`${STORAGE_BASE}/${editingPayment.scan_path}`)}
                                            className="text-blue-500 hover:underline lowercase font-bold flex items-center gap-1"
                                        >
                                            <Eye size={10} /> Voir actuel
                                        </button>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="edit-payment-upload"
                                    />
                                    <label
                                        htmlFor="edit-payment-upload"
                                        className={`w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl hover:bg-gray-100 hover:border-blue-400 cursor-pointer transition-all`}
                                    >
                                        <div className={`p-2 shadow-sm border border-gray-100 rounded-lg ${paymentProof ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}>
                                            <Upload size={16} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-gray-700 truncate">
                                                {paymentProof ? paymentProof.name : (editingPayment?.scan_path ? '✅ Fichier existant - Remplacer' : 'Choisir un fichier')}
                                            </p>
                                            <p className="text-[10px] text-gray-400">{paymentProof ? `${(paymentProof.size / 1024).toFixed(0)} KB` : 'Max 5MB (JPG, PNG, PDF)'}</p>
                                        </div>
                                        {paymentProof && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setPaymentProof(null); }}
                                                className="p-1 hover:bg-red-50 text-red-500 rounded-lg"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingPayment}
                                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center disabled:opacity-50"
                            >
                                {isSubmittingPayment ? <Loader2 className="animate-spin" size={20} /> : "Mettre à jour"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseInvoices;
