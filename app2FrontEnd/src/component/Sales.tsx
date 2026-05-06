import { useState, useEffect } from 'react';
import { Search, Eye, Loader2, Undo2, Calendar, User, Smartphone, Banknote, X, Truck, Package, ArrowRightLeft, DollarSign } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import MoneyInput from './MoneyInput';
import toast from 'react-hot-toast';

interface Sale {
    id: number;
    device: { id: number; brand: string; model: string; imei: string | null };
    customer: { id: number; name: string } | null;
    sale_price: string;
    payment_method: string;
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

    const filteredSales = sales.filter(s =>
        s.device.model.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        s.device.imei?.includes(search)
    );

    const filteredPurchases = purchases.filter(p =>
        p.reference?.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier?.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Historique des Transactions</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {activeTab === 'sales' ? `${sales.length} ventes enregistrées` : `${purchases.length} bons d'achat enregistrés`}
                    </p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex bg-[#0a0e1a] p-1 rounded-xl w-max ring-1 ring-white/05">
                <button
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/05'}`}
                    onClick={() => { setActiveTab('sales'); setSearch(''); }}
                >
                    <ArrowRightLeft size={16} /> Ventes Réalisées
                </button>
                <button
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'purchases' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/05'}`}
                    onClick={() => { setActiveTab('purchases'); setSearch(''); }}
                >
                    <Package size={16} /> Achats Fournisseurs
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    className="input-dark pl-10 py-3"
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
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <Smartphone size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{s.device.brand} {s.device.model}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{s.device.imei || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <User size={12} className="text-slate-500" />
                                                <span className="text-sm font-medium">{s.customer?.name || 'Client de Passage'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-emerald-400 font-bold">{formatMoney(s.sale_price)} MAD</span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Banknote size={12} />
                                                <span className="text-xs uppercase font-bold tracking-wider">{s.payment_method === 'cash' ? 'Espèces' : s.payment_method === 'card' ? 'Carte' : 'Virement'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={12} />
                                                <span className="text-xs">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <button
                                                    className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ring-1 ring-indigo-500/20"
                                                    title="Détails"
                                                    onClick={() => setSelectedSale(s)}
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <button
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ring-1 ring-red-500/20"
                                                    onClick={() => handleDelete(s.id)}
                                                    disabled={deletingId === s.id}
                                                    title="Annuler la vente"
                                                >
                                                    {deletingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
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
                                            <td className="font-mono text-xs text-slate-400">{p.purchase_date}</td>
                                            <td>
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Truck size={12} className="text-slate-500" />
                                                    <span className="text-sm font-medium">{p.supplier?.name || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="font-bold text-white">{p.reference || <span className="text-slate-600 font-normal italic">Sans réf.</span>}</td>
                                            <td className="font-black text-emerald-400">{formatMoney(p.total_amount)} MAD</td>
                                            <td className="font-bold text-red-400">{reste > 0 ? `${formatMoney(reste)} MAD` : <span className="text-slate-500 text-xs">—</span>}</td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    {reste > 0 && (
                                                        <button
                                                            className="btn-secondary !text-[10px] !py-1.5 !px-2.5 hover:bg-emerald-500/20 hover:text-emerald-400 font-bold"
                                                            onClick={() => { setPayingPurchase(p); setPayAmount(reste.toString()); }}
                                                        >
                                                            <DollarSign size={12} className="mr-1 inline" /> Payer
                                                        </button>
                                                    )}
                                                    <button
                                                        className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ring-1 ring-indigo-500/20"
                                                        onClick={() => setSelectedPurchase(p)}
                                                        title="Détails de l'Achat"
                                                    >
                                                        <Eye size={13} />
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

            {selectedSale && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[300] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <div className="card w-full max-w-md overflow-hidden border-indigo-500/30 shadow-2xl shadow-indigo-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-indigo-500/[0.03]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <Banknote size={20} className="text-indigo-400" /> Détails Vente #{selectedSale.id}
                            </h2>
                            <button onClick={() => setSelectedSale(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                                    <Smartphone size={24} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Produit</label>
                                    <p className="text-lg font-black text-white leading-tight">{selectedSale.device.brand} {selectedSale.device.model}</p>
                                    <p className="text-xs text-slate-400 font-mono mt-1">IMEI: {selectedSale.device.imei || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/05">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <User size={10} /> Client
                                    </label>
                                    <p className="text-sm font-semibold text-white">{selectedSale.customer?.name || 'Client de Passage'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={10} /> Date
                                    </label>
                                    <p className="text-sm font-semibold text-white">{new Date(selectedSale.created_at).toLocaleString('fr-FR')}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Banknote size={10} /> Paiement
                                    </label>
                                    <span className="badge badge-indigo text-[10px] uppercase">{selectedSale.payment_method === 'cash' ? 'Espèces' : selectedSale.payment_method === 'card' ? 'Carte' : 'Virement'}</span>
                                </div>
                                <div className="space-y-1 text-right">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Montant</label>
                                    <p className="text-xl font-black text-emerald-400">{formatMoney(selectedSale.sale_price)} MAD</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Achat Detail Modal */}
            {selectedPurchase && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[300] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <div className="card w-full max-w-sm overflow-hidden border-emerald-500/30 shadow-2xl shadow-emerald-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-emerald-500/[0.03]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <Package size={20} className="text-emerald-400" /> Détails Achat #{selectedPurchase.id}
                            </h2>
                            <button onClick={() => setSelectedPurchase(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Truck size={10} /> Fournisseur
                                    </label>
                                    <p className="text-sm font-semibold text-white">{selectedPurchase.supplier?.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={10} /> Date
                                    </label>
                                    <p className="text-sm font-semibold text-white">{selectedPurchase.purchase_date}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/05 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Total TTC</span>
                                    <span className="font-black text-white">{formatMoney(selectedPurchase.total_amount)} MAD</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Déjà Payé</span>
                                    <span className="font-black text-emerald-400">{formatMoney(selectedPurchase.paid_amount)} MAD</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold">Reste à Payer</span>
                                    <span className="font-black text-red-400">{formatMoney(selectedPurchase.total_amount - selectedPurchase.paid_amount)} MAD</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Partially Pay Purchase Modal ── */}
            {payingPurchase && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handlePayRest} className="card w-full max-w-sm p-6 ring-1 ring-white/10 animate-in zoom-in-95">
                        <h3 className="text-lg font-black text-white mb-1">Effectuer un Paiement</h3>
                        <p className="text-xs text-slate-400 mb-6">Achat {payingPurchase.reference || 'sans ref'}, Reste: <b className="text-red-400">{formatMoney(Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount))} MAD</b></p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 shadow-sm">Montant à régler (MAD)</label>
                                <MoneyInput max={Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount)} className="input-dark font-black text-emerald-400 text-xl" required value={payAmount} onChange={val => setPayAmount(val.toString())} />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button type="button" className="btn-secondary flex-1" onClick={() => setPayingPurchase(null)}>Annuler</button>
                            <button type="submit" disabled={paySaving} className="btn-primary flex-1 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 border-none">
                                {paySaving ? <Loader2 size={16} className="animate-spin" /> : 'Valider'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
