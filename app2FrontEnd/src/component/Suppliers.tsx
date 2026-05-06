import { useEffect, useState } from 'react';
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
    const emptyPurchaseLine = { designation: '', quantite: 1, prix_unitaire: 0, tva: 20 };
    const emptyPurchaseForm = { reference: '', designation: '', paid_amount: '', purchase_date: new Date().toISOString().split('T')[0], notes: '', lines: [{ ...emptyPurchaseLine }] };
    const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
    const [purchaseSaving, setPurchaseSaving] = useState(false);

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
                    <h1 className="text-2xl font-black text-white">Fournisseurs</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} fournisseurs enregistrés</p>
                </div>
                <button className="btn-primary" onClick={openCreate}><Plus size={17} /> Nouveau</button>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par nom, ville, téléphone..." className="input-dark pl-9" />
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
                                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                                    <Truck size={16} className="text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{s.name}</p>
                                                    {s.contact_person && <p className="text-slate-500 text-xs">{s.contact_person}</p>}
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
                                                <button className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all ring-1 ring-emerald-500/20" onClick={() => openPurchaseForm(s)} title="Saisir un Achat">
                                                    <ShoppingCart size={13} />
                                                </button>
                                                <button className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all ring-1 ring-blue-500/20" onClick={() => openHistory(s)} title="Historique des Achats & Paiements">
                                                    <History size={13} />
                                                </button>
                                                <button className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ring-1 ring-indigo-500/20" onClick={() => openEdit(s)} title="Modifier">
                                                    <Edit2 size={13} />
                                                </button>
                                                <button className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ring-1 ring-red-500/20" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} title="Supprimer">
                                                    {deletingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
            {showForm && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[300] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <form onSubmit={handleSubmit} className="card w-full max-w-lg overflow-hidden border-orange-500/20 shadow-2xl shadow-orange-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-orange-500/[0.03]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                                <Truck size={22} className="text-orange-400" />
                                {editing ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dénomination Sociale *</label>
                                <input className="input-dark text-lg font-bold" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: GlobalTech SARL" required />
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
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Mail size={10} /> Email</label>
                                    <input type="email" className="input-dark font-medium" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10} /> Ville</label>
                                    <input className="input-dark font-medium" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Casablanca" />
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

                        <div className="p-6 border-t border-white/05 flex justify-end gap-3 bg-white/[0.01]">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary font-bold px-6">Annuler</button>
                            <button type="submit" disabled={saving} className="btn-primary font-black uppercase tracking-wider px-8 shadow-lg shadow-indigo-500/10">
                                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : editing ? <Plus size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                                {editing ? 'Enregistrer' : 'Créer le Fournisseur'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Purchase Modal ── */}
            {showPurchaseForm && activeSupplier && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[350] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <form onSubmit={handlePurchaseSubmit} className="card w-full max-w-xl overflow-hidden border-emerald-500/20 shadow-2xl shadow-emerald-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-emerald-500/[0.03]">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                                    <ShoppingCart size={22} className="text-emerald-400" />
                                    Nouveau Bon d'Achat
                                </h2>
                                <p className="text-emerald-500/70 text-xs font-medium mt-1">Fournisseur: {activeSupplier.name}</p>
                            </div>
                            <button type="button" onClick={() => setShowPurchaseForm(false)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
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
                                                            <div className="absolute top-full left-0 w-full z-[500] mt-1 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 ring-1 ring-white/10">
                                                                <div className="p-2 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.02] border-b border-white/05 flex items-center justify-between">
                                                                    <span>Résultats Catalogue</span>
                                                                    <span className="text-[10px] text-indigo-400">Total: {catalogArticles.length}</span>
                                                                </div>
                                                                {catalogArticles
                                                                    .filter(a => a.designation.toLowerCase().includes((articleSearchTerm[idx] || '').toLowerCase()))
                                                                    .map(article => (
                                                                        <button
                                                                            key={article.id}
                                                                            type="button"
                                                                            className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-800 text-slate-300 hover:text-white border-b border-white/05 flex justify-between items-center transition-all group/item"
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
                                                                                <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover/item:scale-110 transition-transform">
                                                                                    <Package size={10} />
                                                                                </div>
                                                                                <span className="font-bold">{article.designation}</span>
                                                                            </div>
                                                                            <span className="text-[10px] text-emerald-400 font-black">{formatMoney(article.prix_unitaire_defaut)}</span>
                                                                        </button>
                                                                    ))}
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-4 py-3 text-left text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-black flex items-center gap-2 border-t border-white/10"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setFocusedLine(null);
                                                                    }}
                                                                >
                                                                    <PlusCircle size={14} className="animate-pulse" /> Utiliser ce libellé tel quel
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

                            <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 relative">
                                <div className="space-y-2 relative">
                                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5"><DollarSign size={10} /> Montant Total TTC</label>
                                    <div className="text-2xl font-black text-white">{formatMoney(computedTotal)} MAD</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5"><DollarSign size={10} /> Montant Payé (MAD) *</label>
                                    <MoneyInput className="input-dark text-lg font-black text-emerald-400 border-emerald-500/20 focus:border-emerald-500/50" value={purchaseForm.paid_amount} onChange={val => setPurchase('paid_amount', val.toString())} placeholder="0.00" required />
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
            )}

            {/* ── Purchase History Modal ── */}
            {showHistory && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[400] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <div className="card w-full max-w-4xl overflow-hidden border-blue-500/20 shadow-2xl shadow-blue-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-blue-500/[0.03]">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                                    <History size={22} className="text-blue-400" />
                                    Historique des Achats
                                </h2>
                                <p className="text-blue-500/70 text-xs font-medium mt-1">Fournisseur: {showHistory.name}</p>
                            </div>
                            <button type="button" onClick={() => setShowHistory(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {historyLoading ? (
                                <div className="flex justify-center py-10 text-slate-500"><Loader2 size={24} className="animate-spin" /></div>
                            ) : supplierPurchases.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Aucun achat enregistré pour ce fournisseur.</div>
                            ) : (
                                <table className="table-dark">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Référence</th>
                                            <th>Total (Bénéfice)</th>
                                            <th>Déjà Payé</th>
                                            <th>Reste</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplierPurchases.map(p => {
                                            const reste = Number(p.total_amount) - Number(p.paid_amount);
                                            return (
                                                <tr key={p.id}>
                                                    <td className="font-mono text-xs text-slate-400">{p.purchase_date}</td>
                                                    <td className="font-bold text-white">{p.reference || <span className="text-slate-600 font-normal italic">Sans réf.</span>}</td>
                                                    <td className="font-black text-white">{formatMoney(p.total_amount)} MAD</td>
                                                    <td className="font-bold text-emerald-400">{formatMoney(p.paid_amount)} MAD</td>
                                                    <td className="font-bold text-red-400">{reste > 0 ? `${formatMoney(reste)} MAD` : <span className="text-slate-500 text-xs">—</span>}</td>
                                                    <td className="text-right">
                                                        {reste > 0 && (
                                                            <button className="btn-secondary !text-[10px] !py-1 !px-2 hover:bg-emerald-500/20 hover:text-emerald-400" onClick={() => { setPayingPurchase(p); setPayAmount(reste.toString()); }}>
                                                                <DollarSign size={10} className="mr-1 inline" /> Payer Reste
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
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
