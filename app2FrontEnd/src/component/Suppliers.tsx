import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Truck, Phone, Mail, MapPin, Edit2, Trash2, Loader2, Package, X, Eye, ShoppingCart, Calendar, DollarSign, FileText, Trash, PlusCircle, History } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import MoneyInput from './MoneyInput';
import toast from 'react-hot-toast';

interface Supplier {
    id: number;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    notes: string | null;
    devices_count: number;
}

const emptyForm = { name: '', contact_person: '', email: '', phone: '', address: '', city: '', notes: '' };

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Purchase state
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(null);
    const emptyPurchaseLine = { designation: '', quantite: 1, prix_unitaire: 0, tva: 20, category: '', condition: 'New' as 'New' | 'Used' | 'Refurbished' };
    const emptyPurchaseForm = { reference: '', designation: '', paid_amount: '', purchase_date: new Date().toISOString().split('T')[0], notes: '', lines: [{ ...emptyPurchaseLine }] };
    const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
    const [purchaseSaving, setPurchaseSaving] = useState(false);
    const [convertingId, setConvertingId] = useState<number | null>(null);

    // History and Partial Payment state
    const [showHistory, setShowHistory] = useState<Supplier | null>(null);
    const [supplierPurchases, setSupplierPurchases] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [payingPurchase, setPayingPurchase] = useState<any | null>(null);
    const [payAmount, setPayAmount] = useState<string>('');
    const [paySaving, setPaySaving] = useState(false);
    const [catalogArticles, setCatalogArticles] = useState<any[]>([]);
    const [articleSearchTerm, setArticleSearchTerm] = useState<Record<number, string>>({});
    const [focusedLine, setFocusedLine] = useState<number | null>(null);

    // Calculate total amount dynamically
    const computedTotal = purchaseForm.lines.reduce((acc, line) => acc + (line.quantite * line.prix_unitaire * (1 + line.tva / 100)), 0);


    const load = () => {
        setLoading(true);
        const p = new URLSearchParams(); if (q) p.set('q', q);
        apiFetch(`/suppliers?${p}`)
            .then(r => setSuppliers(r.data ?? r))
            .catch(() => toast.error('Erreur de chargement'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [q]);

    useEffect(() => {
        apiFetch('/articles').then(r => setCatalogArticles(r.data ?? r)).catch(() => { });

        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.article-selector-parent')) {
                setFocusedLine(null);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (s: Supplier) => {
        setEditing(s);
        setForm({
            name: s.name, contact_person: s.contact_person || '', email: s.email || '',
            phone: s.phone || '', address: s.address || '', city: s.city || '', notes: s.notes || '',
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                const updated = await apiFetch(`/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
                setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...updated } : s));
                toast.success('Fournisseur modifié');
            } else {
                const created = await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(form) });
                setSuppliers(prev => [created, ...prev]);
                toast.success('Fournisseur créé');
            }
            setShowForm(false);
        } catch (err: any) {
            toast.error(err.message || 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer ce fournisseur ?')) return;
        setDeletingId(id);
        try {
            await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
            setSuppliers(prev => prev.filter(s => s.id !== id));
            toast.success('Fournisseur supprimé');
        } catch { toast.error('Erreur suppression'); }
        finally { setDeletingId(null); }
    };

    const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const openPurchaseForm = (s: Supplier) => {
        setActiveSupplier(s);
        setPurchaseForm(emptyPurchaseForm);
        setShowPurchaseForm(true);
    };

    const handlePurchaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (Number(purchaseForm.paid_amount) > computedTotal) {
            toast.error(`Le montant payé ne peut pas dépasser le montant total (${computedTotal.toLocaleString()} MAD).`);
            return;
        }

        setPurchaseSaving(true);
        try {
            await apiFetch('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    ...purchaseForm,
                    supplier_id: activeSupplier?.id
                })
            });
            toast.success('Achat enregistré avec succès !');
            setShowPurchaseForm(false);
            // Optionally, we could reload suppliers here to update a total_purchases count if we had one
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'enregistrement de l\'achat');
        } finally {
            setPurchaseSaving(false);
        }
    };

    const setPurchase = (k: string, v: any) => setPurchaseForm(prev => ({ ...prev, [k]: v }));

    const handleLineChange = (index: number, field: string, value: any) => {
        setPurchaseForm(prev => {
            const newLines = [...prev.lines];
            newLines[index] = { ...newLines[index], [field]: value };
            return { ...prev, lines: newLines };
        });
    };

    const addLine = () => setPurchase('lines', [...purchaseForm.lines, { ...emptyPurchaseLine }]);
    const removeLine = (index: number) => {
        if (purchaseForm.lines.length > 1) {
            setPurchase('lines', purchaseForm.lines.filter((_, i) => i !== index));
        }
    };

    const loadPurchases = async (supplierId: number) => {
        setHistoryLoading(true);
        try {
            const data = await apiFetch(`/purchases?supplier_id=${supplierId}`);
            setSupplierPurchases(data);
        } catch { toast.error('Erreur chargement historique'); }
        finally { setHistoryLoading(false); }
    };

    const handleConvertToStock = async (purchase: any) => {
        setConvertingId(purchase.id);
        try {
            const res = await apiFetch(`/purchases/${purchase.id}/convert-to-stock`, { method: 'POST' });
            toast.success(res.message || 'Appareils ajoutés au stock !');
            // Refresh the purchase list to reflect the change
            if (showHistory) loadPurchases(showHistory.id);
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la mise en stock');
        } finally {
            setConvertingId(null);
        }
    };

    const openHistory = (s: Supplier) => {
        setShowHistory(s);
        loadPurchases(s.id);
    };

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
            if (showHistory) loadPurchases(showHistory.id); // refresh
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du paiement');
        } finally {
            setPaySaving(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Fournisseurs</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{suppliers.length} partenaires commerciaux</p>
                </div>
                <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau Fournisseur</button>
            </div>

            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                    <Search size={14} />
                </div>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par nom, ville, téléphone..." className="input-dark pl-9 h-10 italic" />
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 size={22} className="animate-spin mr-2" /> Chargement...</div>
                ) : suppliers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <Truck size={48} className="mb-3 opacity-30" />
                        <p className="font-medium">Aucun fournisseur</p>
                        <button className="btn-primary mt-4" onClick={openCreate}><Plus size={16} /> Ajouter</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-dark">
                            <thead>
                                <tr>
                                    <th>Fournisseur</th>
                                    <th>Contact</th>
                                    <th>Ville</th>
                                    <th>Produits</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-[#f97316]/10 flex items-center justify-center flex-shrink-0 text-[#f97316]">
                                                    <Truck size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[#0f172a] font-bold text-xs uppercase italic">{s.name}</p>
                                                    {s.contact_person && <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">{s.contact_person}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-0.5">
                                                {s.phone && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={11} />{s.phone}</span>}
                                                {s.email && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={11} />{s.email}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {s.city ? (
                                                <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} />{s.city}</span>
                                            ) : <span className="text-slate-600">—</span>}
                                        </td>
                                        <td>
                                            <span className="badge badge-blue flex items-center gap-1 w-fit"><Package size={10} /> {s.devices_count ?? 0}</span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <button className="w-7 h-7 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316] hover:bg-[#f97316] hover:text-white transition-all border border-[#f97316]/20" onClick={() => openPurchaseForm(s)} title="Saisir un Achat">
                                                    <ShoppingCart size={12} />
                                                </button>
                                                <button className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all border border-slate-200" onClick={() => openHistory(s)} title="Historique">
                                                    <History size={12} />
                                                </button>
                                                <button className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all border border-slate-200" onClick={() => openEdit(s)} title="Modifier">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button className="w-7 h-7 rounded bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} title="Supprimer">
                                                    {deletingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Create/Edit Modal ── */}
            {showForm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handleSubmit} className="card w-full max-w-2xl bg-white shadow-2xl border-none rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter">
                                <Truck size={18} className="text-[#f97316]" />
                                {editing ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dénomination Sociale *</label>
                                <input className="input-dark font-bold italic" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: GlobalTech SARL" required />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Eye size={10} /> Contact</label>
                                    <input className="input-dark font-medium" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Mohamed Alami" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Phone size={10} /> Téléphone</label>
                                    <input className="input-dark font-medium" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+212 6.." />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Mail size={10} /> Email</label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-300 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                                            <Mail size={12} />
                                        </div>
                                        <input type="email" className="input-dark pl-10 h-10 font-bold" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={10} /> Ville</label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-300 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                                            <MapPin size={12} />
                                        </div>
                                        <input className="input-dark pl-10 h-10 font-bold" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Casablanca" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adresse complète</label>
                                <input className="input-dark text-slate-300 italic" value={form.address} onChange={e => set('address', e.target.value)} placeholder="N°, Rue, Quartier..." />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes & Conditions</label>
                                <textarea className="input-dark min-h-[100px] pt-3 resize-none text-slate-400 bg-white/01" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Délai de livraison, facilités de paiement..." />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary font-bold">Annuler</button>
                            <button type="submit" disabled={saving} className="btn-primary font-black uppercase italic tracking-wider">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Créer le fournisseur'}
                            </button>
                        </div>
                    </form>
                </div>
                , document.body)}

            {/* ── Purchase Modal ── */}
            {showPurchaseForm && activeSupplier && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handlePurchaseSubmit} className="card w-full max-w-2xl bg-white shadow-2xl border-none rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter">
                                    <ShoppingCart size={18} className="text-[#f97316]" />
                                    Nouveau Bon d'Achat
                                </h2>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">Fournisseur: {activeSupplier.name}</p>
                            </div>
                            <button type="button" onClick={() => setShowPurchaseForm(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Package size={10} /> Articles commandés *</label>
                                    <button type="button" onClick={addLine} className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md transition-colors"><PlusCircle size={12} /> Ajouter Ligne</button>
                                </div>
                                <div className="space-y-2">
                                    {purchaseForm.lines.map((line, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl bg-white/03 border border-white/05 relative group">
                                            <div className="flex-1 space-y-3">
                                                <div className="relative">
                                                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Désignation / Recherche Catalogue</label>
                                                    <div className="relative article-selector-parent">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                                                        <input
                                                            className="input-dark text-sm py-2 !pl-10"
                                                            value={line.designation}
                                                            autoComplete="off"
                                                            onChange={e => {
                                                                handleLineChange(idx, 'designation', e.target.value);
                                                                setArticleSearchTerm(prev => ({ ...prev, [idx]: e.target.value }));
                                                            }}
                                                            onFocus={() => setFocusedLine(idx)}
                                                            placeholder="Chercher un article..."
                                                            required
                                                        />

                                                        {focusedLine === idx && (
                                                            <div className="absolute top-full left-0 w-full z-[500] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                                <div className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                                    <span>Catalogue Produits</span>
                                                                    <span className="text-[10px] text-[#f97316]">Total: {catalogArticles.length}</span>
                                                                </div>
                                                                {catalogArticles
                                                                    .filter(a => a.designation.toLowerCase().includes((articleSearchTerm[idx] || '').toLowerCase()))
                                                                    .map(article => (
                                                                        <button
                                                                            key={article.id}
                                                                            type="button"
                                                                            className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-50 text-[#0f172a] border-b border-slate-50 flex justify-between items-center transition-all group/item"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                setPurchaseForm(prev => {
                                                                                    const newLines = [...prev.lines];
                                                                                    newLines[idx] = {
                                                                                        ...newLines[idx],
                                                                                        designation: article.designation,
                                                                                        prix_unitaire: Number(article.prix_unitaire_defaut),
                                                                                        tva: Number(article.tva_defaut)
                                                                                    };
                                                                                    return { ...prev, lines: newLines };
                                                                                });
                                                                                setArticleSearchTerm(prev => ({ ...prev, [idx]: article.designation }));
                                                                                setFocusedLine(null);
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316] group-hover/item:scale-110 transition-transform">
                                                                                    <Package size={10} />
                                                                                </div>
                                                                                <span className="font-bold">{article.designation}</span>
                                                                            </div>
                                                                            <span className="text-[10px] text-emerald-500 font-black">{formatMoney(article.prix_unitaire_defaut)}</span>
                                                                        </button>
                                                                    ))}
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-4 py-3 text-left text-[9px] bg-slate-50 hover:bg-slate-100 text-[#f97316] font-black flex items-center gap-2 border-t border-slate-200"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setFocusedLine(null);
                                                                    }}
                                                                >
                                                                    <PlusCircle size={14} className="animate-pulse" /> Utiliser ce libellé personnalisé
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Quantité</span>
                                                        <input type="number" min="1" className="input-dark text-sm py-1.5" value={line.quantite} onChange={e => handleLineChange(idx, 'quantite', parseFloat(e.target.value))} required />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">P.U (HT)</span>
                                                        <MoneyInput className="input-dark text-sm py-1.5" value={line.prix_unitaire} onChange={val => handleLineChange(idx, 'prix_unitaire', Number(val))} placeholder="0.00" required />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">TVA %</span>
                                                        <input type="number" min="0" max="100" className="input-dark text-sm py-1.5" value={line.tva} onChange={e => handleLineChange(idx, 'tva', parseFloat(e.target.value))} required />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Catégorie (Stock)</span>
                                                        <input type="text" className="input-dark text-sm py-1.5" placeholder="Smartphone, Tablette..." value={line.category || ''} onChange={e => handleLineChange(idx, 'category', e.target.value)} />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">État</span>
                                                        <select className="input-dark text-sm py-1.5" value={line.condition || 'New'} onChange={e => handleLineChange(idx, 'condition', e.target.value)}>
                                                            <option value="New">Neuf</option>
                                                            <option value="Used">Occasion</option>
                                                            <option value="Refurbished">Reconditionné</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            {purchaseForm.lines.length > 1 && (
                                                <button type="button" onClick={() => removeLine(idx)} className="p-2 text-red-500/50 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10 h-max self-start mt-1 shrink-0">
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileText size={10} /> Réf. Facture / Bon</label>
                                    <input className="input-dark font-medium" value={purchaseForm.reference} onChange={e => setPurchase('reference', e.target.value)} placeholder="FAC-2026-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={10} /> Date d'Achat *</label>
                                    <input type="date" className="input-dark font-medium custom-date-input" value={purchaseForm.purchase_date} onChange={e => setPurchase('purchase_date', e.target.value)} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-orange-600 text-white shadow-xl relative border border-orange-500">
                                <div className="space-y-1 relative">
                                    <label className="block text-[9px] font-black text-orange-200 uppercase tracking-widest flex items-center gap-1.5"><DollarSign size={10} /> Montant Total TTC</label>
                                    <div className="text-xl font-black italic">{formatMoney(computedTotal)} <span className="text-[10px] text-white/70">MAD</span></div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black text-orange-200 uppercase tracking-widest flex items-center gap-1.5"><DollarSign size={10} /> Montant Réglé *</label>
                                    <MoneyInput className="bg-transparent border-0 border-b border-white/50 text-white text-lg font-black w-full outline-none p-0 focus:border-white placeholder:text-orange-300" value={purchaseForm.paid_amount} onChange={val => setPurchase('paid_amount', val.toString())} placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes Additionnelles</label>
                                <textarea className="input-dark min-h-[60px] resize-none text-slate-400 bg-white/01" value={purchaseForm.notes} onChange={e => setPurchase('notes', e.target.value)} placeholder="Paiement par chèque, reste à payer le mois prochain..." />
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/05 flex justify-end gap-3 bg-white/[0.01]">
                            <button type="button" onClick={() => setShowPurchaseForm(false)} className="btn-secondary font-bold px-6">Annuler</button>
                            <button type="submit" disabled={purchaseSaving} className="btn-primary flex items-center font-black uppercase tracking-wider px-8 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 hover:text-white border-none">
                                {purchaseSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShoppingCart size={16} className="mr-2" />}
                                Valider l'Achat
                            </button>
                        </div>
                    </form>
                </div>
                , document.body)}

            {/* ── Supplier Detail & Purchase History Drawer ── */}
            {showHistory && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowHistory(null)}>
                    <div className="w-full max-w-xl bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setShowHistory(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <h2 className="text-lg font-black text-[#0f172a] flex items-center gap-3 uppercase tracking-tighter">
                                <span className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] shadow-inner border border-[#f97316]/20">
                                    <Truck size={20} />
                                </span>
                                Profil Fournisseur
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const supplier = showHistory;
                                        setShowHistory(null);
                                        openEdit(supplier);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Edit2 size={12} /> Modifier
                                </button>
                                <button type="button" onClick={() => setShowHistory(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 hidden sm:flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            {/* Supplier Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-[#f97316]/20">
                                    {showHistory.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-[#0f172a] leading-tight uppercase italic truncate">{showHistory.name}</h3>
                                    {showHistory.contact_person && (
                                        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                            Contact: <span className="text-[#0f172a]">{showHistory.contact_person}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                {showHistory.phone && (
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                            <Phone size={16} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Téléphone</label>
                                            <p className="text-sm text-[#0f172a] font-bold">{showHistory.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {showHistory.email && (
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                            <Mail size={16} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</label>
                                            <p className="text-sm text-[#0f172a] font-bold truncate">{showHistory.email}</p>
                                        </div>
                                    </div>
                                )}
                                {(showHistory.address || showHistory.city) && (
                                    <div className="flex items-start gap-3 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 mt-1 shrink-0 group-hover:scale-105 transition-transform">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1 mb-1">Adresse</label>
                                            <p className="text-sm text-[#0f172a] font-bold italic leading-tight">
                                                {showHistory.address} {showHistory.city ? `- ${showHistory.city}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Purchase History */}
                            <div className="pt-6 border-t border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-6 h-px bg-slate-200 flex-1"></div> Historique des Achats <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                </label>

                                {historyLoading ? (
                                    <div className="flex justify-center py-10 text-slate-500"><Loader2 size={24} className="animate-spin" /></div>
                                ) : supplierPurchases.length === 0 ? (
                                    <div className="text-center p-6 text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Aucun achat enregistré pour ce fournisseur.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {supplierPurchases.map(p => {
                                            const reste = Number(p.total_amount) - Number(p.paid_amount);
                                            return (
                                                <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 cursor-default">
                                                    <div className="flex justify-between items-start mb-2 border-b border-dashed border-slate-200 pb-2">
                                                        <div>
                                                            <span className="text-[9px] font-black text-[#f97316] uppercase tracking-widest bg-[#f97316]/10 px-2 py-0.5 rounded-full inline-block mb-1">
                                                                {p.purchase_date}
                                                            </span>
                                                            <p className="text-xs font-black text-[#0f172a] uppercase leading-tight mt-0.5">
                                                                Réf: {p.reference || <span className="text-slate-300 font-normal italic">Sans réf.</span>}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-black text-[#0f172a] block">{formatMoney(p.total_amount)} MAD</span>
                                                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                                                                Payé: {formatMoney(p.paid_amount)} MAD
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {p.lines && p.lines.length > 0 && (
                                                        <div className="my-2 space-y-1">
                                                            {p.lines.map((line: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between text-[10px]">
                                                                    <span className="font-bold text-slate-600">{line.quantite}x {line.designation}</span>
                                                                    <span className="font-mono text-slate-400">{formatMoney(line.total_ttc)} MAD</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Action row */}
                                                    <div className={`mt-3 pt-3 border-t border-slate-100 flex ${reste > 0 ? 'justify-between' : 'justify-end'} items-center gap-2`}>
                                                        {reste > 0 && (
                                                            <button
                                                                className="btn-primary !bg-[#0f172a] hover:!bg-[#1e293b] !py-1.5 !px-3 !text-[10px] uppercase italic tracking-wider flex items-center gap-1"
                                                                onClick={() => { setPayingPurchase(p); setPayAmount(reste.toString()); }}
                                                            >
                                                                <DollarSign size={12} /> Payer le Reste
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 !py-1.5 !px-3 !text-[10px] uppercase italic tracking-wider flex items-center gap-1 disabled:opacity-50"
                                                            onClick={() => handleConvertToStock(p)}
                                                            disabled={convertingId === p.id}
                                                            title="Ajouter ces articles au stock d'appareils"
                                                        >
                                                            {convertingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                                                            Mettre en Stock
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-[#0f172a] shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                            <button
                                onClick={() => setShowHistory(null)}
                                className="w-full btn-secondary text-xs py-3 flex items-center justify-center gap-2 uppercase tracking-wider font-black italic bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                            >
                                Fermer le profil
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ── Partially Pay Purchase Modal ── */}
            {payingPurchase && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handlePayRest} className="card w-full max-w-md bg-white shadow-2xl border-none rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-tighter">Effectuer un Paiement</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Reste: <span className="text-red-500">{formatMoney(Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount))} MAD</span></p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant à régler (MAD)</label>
                                <MoneyInput max={Number(payingPurchase.total_amount) - Number(payingPurchase.paid_amount)} className="input-dark font-black text-emerald-500 text-lg" required value={payAmount} onChange={val => setPayAmount(val.toString())} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex gap-2">
                            <button type="button" className="btn-secondary flex-1" onClick={() => setPayingPurchase(null)}>Annuler</button>
                            <button type="submit" disabled={paySaving} className="btn-primary flex-1 justify-center italic">
                                {paySaving ? <Loader2 size={16} className="animate-spin" /> : 'Valider le paiement'}
                            </button>
                        </div>
                    </form>
                </div>
                , document.body)}
        </div>
    );
}
