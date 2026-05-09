import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Eye, Loader2, Undo2, Calendar, User, Smartphone, Banknote, X, Truck, Package, ArrowRightLeft, DollarSign, FileText } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import MoneyInput from './MoneyInput';
import toast from 'react-hot-toast';

interface Sale {
    id: number;
    device: { id: number; brand: string; model: string; imei: string | null };
    customer: { id: number; name: string; phone?: string } | null;
    sale_price: number;
    payment_method: string;
    notes?: string;
    created_at: string;
}

export default function Sales() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [payingPurchase, setPayingPurchase] = useState<any | null>(null);
    const [payAmount, setPayAmount] = useState<string>('');
    const [paySaving, setPaySaving] = useState(false);

    const loadSales = () => {
        setLoading(true);
        apiFetch('/sales')
            .then(data => setSales(data.data || data))
            .catch(() => toast.error('Erreur de chargement des ventes'))
            .finally(() => setLoading(false));
    };

    const loadPurchases = () => {
        setLoading(true);
        apiFetch('/purchases')
            .then(data => setPurchases(data))
            .catch(() => toast.error('Erreur de chargement des achats'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (activeTab === 'sales') loadSales();
        else loadPurchases();
    }, [activeTab]);

    const handlePayRest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingPurchase) return;

        const maxPayable = Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount);
        if (Number(payAmount) > maxPayable) {
            toast.error(`Le montant saisi (${payAmount} MAD) dépasse le reste à payer (${maxPayable} MAD).`);
            return;
        }

        setPaySaving(true);
        try {
            const newPaid = Number(payingPurchase.paid_amount) + Number(payAmount);
            await apiFetch(`/purchases/${payingPurchase.id}`, {
                method: 'PUT',
                body: JSON.stringify({ paid_amount: newPaid })
            });
            toast.success('Paiement enregistré !');
            setPayingPurchase(null);
            setPayAmount('');
            loadPurchases(); // refresh list
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du paiement');
        } finally {
            setPaySaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Voulez-vous annuler cette vente ? L\'appareil sera remis en stock.')) return;
        setDeletingId(id);
        try {
            await apiFetch(`/sales/${id}`, { method: 'DELETE' });
            setSales(prev => prev.filter(s => s.id !== id));
            toast.success('Vente annulée et produit remis en stock');
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'annulation');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredSales = sales.filter(s => {
        const searchLower = search.toLowerCase();
        return (
            s.device?.model?.toLowerCase().includes(searchLower) ||
            s.device?.brand?.toLowerCase().includes(searchLower) ||
            s.customer?.name?.toLowerCase().includes(searchLower) ||
            s.device?.imei?.includes(search)
        );
    });

    const filteredPurchases = purchases.filter(p =>
        p.reference?.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier?.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Historique des Transactions</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        {activeTab === 'sales' ? `${sales.length} ventes validées` : `${purchases.length} bons d'achats`}
                    </p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex bg-white p-1 rounded-lg w-max border border-slate-200">
                <button
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all ${activeTab === 'sales' ? 'bg-[#f97316] text-white shadow-sm' : 'text-slate-400 hover:text-[#f97316]'}`}
                    onClick={() => { setActiveTab('sales'); setSearch(''); }}
                >
                    <ArrowRightLeft size={14} /> Ventes Réalisées
                </button>
                <button
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all ${activeTab === 'purchases' ? 'bg-[#f97316] text-white shadow-sm' : 'text-slate-400 hover:text-[#f97316]'}`}
                    onClick={() => { setActiveTab('purchases'); setSearch(''); }}
                >
                    <Package size={14} /> Achats Fournisseurs
                </button>
            </div>

            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                    <Search size={14} />
                </div>
                <input
                    className="input-dark pl-10 py-3 italic"
                    placeholder={activeTab === 'sales' ? "Rechercher par produit, client ou IMEI..." : "Rechercher par fournisseur ou référence fac..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    {activeTab === 'sales' ? (
                        <table className="table-dark">
                            <thead>
                                <tr>
                                    <th>Produit</th>
                                    <th>Client</th>
                                    <th>Prix de Vente</th>
                                    <th>Paiement</th>
                                    <th>Date</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map(s => (
                                    <tr key={s.id}>
                                        <td data-label="Produit">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316]">
                                                    <Smartphone size={14} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[#0f172a] font-bold text-xs uppercase italic">
                                                        {s.device ? `${s.device.brand} ${s.device.model}` : 'Produit Supprimé'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-mono tracking-tighter">{s.device?.imei || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Client">
                                            <div className="flex items-center gap-2 text-slate-300 justify-end sm:justify-start">
                                                <User size={12} className="text-slate-500" />
                                                <span className="text-sm font-medium">{s.customer?.name || 'Client de Passage'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Prix"><span className="text-emerald-400 font-bold">{formatMoney(s.sale_price)} MAD</span></td>
                                        <td data-label="Paiement">
                                            <div className="flex items-center gap-2 text-slate-400 justify-end sm:justify-start">
                                                <Banknote size={12} />
                                                <span className="text-xs uppercase font-bold tracking-wider">{s.payment_method === 'cash' ? 'Espèces' : s.payment_method === 'card' ? 'Carte' : 'Virement'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Date">
                                            <div className="flex items-center gap-2 text-slate-500 justify-end sm:justify-start">
                                                <Calendar size={12} />
                                                <span className="text-xs">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <button
                                                    className="w-7 h-7 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316] hover:bg-[#f97316] hover:text-white transition-all border border-[#f97316]/20"
                                                    title="Détails"
                                                    onClick={() => setSelectedSale(s)}
                                                >
                                                    <Eye size={12} />
                                                </button>
                                                <button
                                                    className="w-7 h-7 rounded bg-red-50/50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200"
                                                    onClick={() => handleDelete(s.id)}
                                                    disabled={deletingId === s.id}
                                                    title="Annuler la vente"
                                                >
                                                    {deletingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="table-dark">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Fournisseur</th>
                                    <th>Référence</th>
                                    <th>Total TTC</th>
                                    <th>Reste</th>
                                    <th className="text-right">Détails</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPurchases.map(p => {
                                    const reste = p.total_amount - p.paid_amount;
                                    return (
                                        <tr key={p.id}>
                                            <td data-label="Date" className="font-mono text-xs text-slate-400">{p.purchase_date}</td>
                                            <td data-label="Fournisseur">
                                                <div className="flex items-center gap-2 text-slate-300 justify-end sm:justify-start">
                                                    <Truck size={12} className="text-slate-500" />
                                                    <span className="text-sm font-medium">{p.supplier?.name || '—'}</span>
                                                </div>
                                            </td>
                                            <td data-label="Référence" className="font-bold text-white">{p.reference || <span className="text-slate-600 font-normal italic">Sans réf.</span>}</td>
                                            <td data-label="Total TTC" className="font-black text-emerald-400">{formatMoney(p.total_amount)} MAD</td>
                                            <td data-label="Reste" className="font-bold text-red-400">{reste > 0 ? `${formatMoney(reste)} MAD` : <span className="text-slate-500 text-xs">—</span>}</td>
                                            <td className="text-right" data-label="Détails">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    {reste > 0 && (
                                                        <button
                                                            className="bg-[#f97316] text-white text-[9px] font-black px-3 py-1 rounded shadow-sm hover:bg-[#ea580c] uppercase italic"
                                                            onClick={() => { setPayingPurchase(p); setPayAmount(reste.toString()); }}
                                                        >
                                                            <DollarSign size={10} className="mr-1 inline" /> Payer
                                                        </button>
                                                    )}
                                                    <button
                                                        className="w-7 h-7 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316] hover:bg-[#f97316] hover:text-white transition-all border border-[#f97316]/20"
                                                        onClick={() => setSelectedPurchase(p)}
                                                        title="Détails de l'Achat"
                                                    >
                                                        <Eye size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {selectedSale && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedSale(null)}>
                    <div className="w-full max-w-md bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <h2 className="text-lg font-black text-[#0f172a] flex items-center gap-3 uppercase tracking-tighter">
                                <span className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] shadow-inner border border-[#f97316]/20">
                                    <Banknote size={20} />
                                </span>
                                Détails Vente <span className="text-slate-400">#{selectedSale.id}</span>
                            </h2>
                            <button onClick={() => setSelectedSale(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#0f172a] flex-shrink-0 border border-slate-200">
                                    <Smartphone size={24} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Appareil Vendu</label>
                                    <p className="text-sm font-black text-[#0f172a] uppercase italic leading-tight">
                                        {selectedSale.device ? `${selectedSale.device.brand} ${selectedSale.device.model}` : 'Produit Supprimé'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                                        IMEI: {selectedSale.device?.imei || '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <User size={12} className="text-indigo-400" /> Client
                                    </label>
                                    <p className="text-sm font-black text-[#0f172a] uppercase italic">{selectedSale.customer?.name || 'Client de Passage'}</p>
                                </div>
                                {selectedSale.customer && selectedSale.customer.phone && (
                                    <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            Téléphone
                                        </label>
                                        <p className="text-xs font-bold text-slate-600">{selectedSale.customer.phone}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={12} className="text-slate-400" /> Date & Heure
                                    </label>
                                    <p className="text-xs font-bold text-slate-600">{new Date(selectedSale.created_at).toLocaleString('fr-FR')}</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Banknote size={12} className="text-blue-400" /> Moyen de Paiement
                                    </label>
                                    <span className="badge badge-blue text-[9px] uppercase font-black italic">{selectedSale.payment_method === 'cash' ? 'Espèces' : selectedSale.payment_method === 'card' ? 'Carte' : 'Virement'}</span>
                                </div>
                                {selectedSale.notes && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg mt-4">
                                        <label className="text-[9px] font-black text-yellow-600 uppercase tracking-widest block mb-1">Notes / Remarques</label>
                                        <p className="text-xs font-medium text-yellow-800 italic">"{selectedSale.notes}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-[#0f172a] text-white shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] flex justify-between items-end">
                            <span className="text-[#f97316] font-black uppercase tracking-widest text-[11px]">Total Encaissé</span>
                            <span className="text-[#f97316] font-black italic text-3xl uppercase tracking-tighter leading-none">{formatMoney(selectedSale.sale_price)} <small className="text-xs font-bold text-[#f97316]/70">MAD</small></span>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* Achat Detail Drawer */}
            {selectedPurchase && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPurchase(null)}>
                    <div className="w-full max-w-md bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <h2 className="text-lg font-black text-[#0f172a] flex items-center gap-3 uppercase tracking-tighter">
                                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner border border-emerald-500/20">
                                    <Package size={20} />
                                </span>
                                Détails Achat <span className="text-slate-400">#{selectedPurchase.id}</span>
                            </h2>
                            <button onClick={() => setSelectedPurchase(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Truck size={12} className="text-indigo-400" /> Fournisseur
                                    </label>
                                    <p className="text-sm font-black text-[#0f172a] uppercase italic">{selectedPurchase.supplier?.name || 'Inconnu'}</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={12} className="text-slate-400" /> Date de création
                                    </label>
                                    <p className="text-xs font-bold text-slate-600">{selectedPurchase.purchase_date}</p>
                                </div>
                            </div>

                            {selectedPurchase.reference && (
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl border-dashed">
                                    <FileText size={14} className="text-slate-400" />
                                    <div className="flex-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Réf. Facture / Bon</label>
                                        <span className="text-xs font-black text-[#0f172a]">{selectedPurchase.reference}</span>
                                    </div>
                                </div>
                            )}

                            {selectedPurchase.lines && selectedPurchase.lines.length > 0 && (
                                <div className="pt-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <div className="w-6 h-px bg-slate-200 flex-1"></div> Articles Commandés ({selectedPurchase.lines.length}) <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                    </label>
                                    <div className="space-y-2">
                                        {selectedPurchase.lines.map((line: any, idx: number) => (
                                            <div key={idx} className="bg-white border text-left border-slate-100 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-bold text-[#0f172a] leading-tight">{line.designation}</span>
                                                    <span className="badge badge-indigo text-[9px] font-black">{line.quantite}x</span>
                                                </div>
                                                <div className="flex justify-between items-end border-t border-slate-50 pt-2 mt-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">P.U HT</span>
                                                        <span className="text-[10px] text-slate-500 font-mono italic">{formatMoney(line.prix_unitaire)} MAD</span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Total TTC (TVA {line.tva}%)</span>
                                                        <span className="text-xs text-emerald-600 font-black italic">{formatMoney(line.total_ttc)} MAD</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-6 h-px bg-emerald-200 flex-1"></div> Bilan Financier <div className="w-6 h-px bg-emerald-200 flex-1"></div>
                                </label>
                                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Total TTC</span>
                                        <span className="font-black text-[#0f172a] italic">{formatMoney(selectedPurchase.total_amount)} MAD</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-500 font-bold uppercase tracking-widest text-[10px]">Déjà Payé</span>
                                        <span className="font-black text-emerald-500 italic bg-emerald-50 px-2 py-0.5 rounded">{formatMoney(selectedPurchase.paid_amount)} MAD</span>
                                    </div>
                                    <div className="w-full h-px border-t border-dashed border-slate-200 my-1"></div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-red-500 font-bold uppercase tracking-widest text-[10px]">Reste à Payer</span>
                                        <span className="font-black text-red-500 italic bg-red-50 px-2 py-0.5 rounded">{formatMoney(selectedPurchase.total_amount - selectedPurchase.paid_amount)} MAD</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-[#0f172a] text-white shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] flex justify-between items-end">
                            <span className="text-white font-black uppercase tracking-widest text-[11px]">Coût Total</span>
                            <span className="text-white font-black italic text-3xl uppercase tracking-tighter leading-none">{formatMoney(selectedPurchase.total_amount)} <small className="text-xs font-bold text-slate-400">MAD</small></span>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ── Partially Pay Purchase Modal ── */}
            {payingPurchase && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handlePayRest} className="card w-full max-w-md bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/60 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-sm font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter">
                                    <DollarSign size={18} className="text-[#f97316]" /> Effectuer un Paiement
                                </h2>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 leading-none">Reste à payer: <span className="text-red-500 bg-red-50 px-1 py-0.5 rounded ml-1">{formatMoney(Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount))} MAD</span></p>
                            </div>
                            <button type="button" onClick={() => setPayingPurchase(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors bg-white shadow-sm border border-slate-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Montant à régler (MAD)</label>
                                <MoneyInput max={Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount)} className="input-dark font-black text-emerald-500 text-2xl h-14 shadow-inner" required value={payAmount} onChange={val => setPayAmount(val.toString())} />
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-white">
                            <button type="button" className="btn-secondary !bg-slate-100 hover:!bg-slate-200 text-slate-600 flex-1 font-bold" onClick={() => setPayingPurchase(null)}>Annuler</button>
                            <button type="submit" disabled={paySaving} className="btn-primary flex-[2] justify-center italic font-black uppercase tracking-wider text-sm shadow-md shadow-[#f97316]/20">
                                {paySaving ? <Loader2 size={16} className="animate-spin" /> : 'Valider le paiement'}
                            </button>
                        </div>
                    </form>
                </div>
                , document.body)}
        </div>
    );
}
