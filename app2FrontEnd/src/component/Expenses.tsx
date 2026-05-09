import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, formatMoney } from '../lib/api';
import { Plus, Trash2, Loader2, Eye, X, Edit2, Calendar, Tag, FileText, DollarSign, TrendingDown, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import MoneyInput from './MoneyInput';

interface Expense {
    id: number;
    category: string;
    amount: string;
    description: string | null;
    expense_date: string;
    created_at: string;
    updated_at: string;
}

const categories = ['Loyer', 'Électricité', 'Salaires', 'Internet', 'Transport', 'Marketing', 'Fournitures', 'Divers'];

const CATEGORY_COLORS: Record<string, string> = {
    'Loyer': 'bg-violet-100 text-violet-600 border-violet-200',
    'Électricité': 'bg-amber-100 text-amber-600 border-amber-200',
    'Salaires': 'bg-emerald-100 text-emerald-600 border-emerald-200',
    'Internet': 'bg-blue-100 text-blue-600 border-blue-200',
    'Transport': 'bg-cyan-100 text-cyan-600 border-cyan-200',
    'Marketing': 'bg-pink-100 text-pink-600 border-pink-200',
    'Fournitures': 'bg-orange-100 text-orange-600 border-orange-200',
    'Divers': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [form, setForm] = useState({
        category: 'Loyer',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0]
    });

    const [editForm, setEditForm] = useState({
        category: '',
        amount: '',
        description: '',
        expense_date: ''
    });
    const [editSaving, setEditSaving] = useState(false);

    useEffect(() => { loadExpenses(); }, []);

    const loadExpenses = () => {
        setLoading(true);
        apiFetch('/expenses')
            .then(data => setExpenses(data.data ?? data))
            .catch(() => toast.error('Erreur de chargement'))
            .finally(() => setLoading(false));
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const created = await apiFetch('/expenses', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            toast.success('Dépense enregistrée');
            setExpenses(prev => [created, ...prev]);
            setForm({ ...form, amount: '', description: '' });
            setShowAdd(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer cette dépense ?')) return;
        setDeletingId(id);
        try {
            await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
            setExpenses(prev => prev.filter(e => e.id !== id));
            if (selectedExpense?.id === id) setSelectedExpense(null);
            toast.success('Supprimé');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const openEdit = (exp: Expense) => {
        setEditingExpense(exp);
        setEditForm({
            category: exp.category,
            amount: exp.amount,
            description: exp.description || '',
            expense_date: exp.expense_date
        });
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExpense) return;
        setEditSaving(true);
        try {
            const updated = await apiFetch(`/expenses/${editingExpense.id}`, {
                method: 'PUT',
                body: JSON.stringify(editForm)
            });
            setExpenses(prev => prev.map(ex => ex.id === editingExpense.id ? { ...ex, ...updated } : ex));
            if (selectedExpense?.id === editingExpense.id) {
                setSelectedExpense({ ...selectedExpense, ...updated });
            }
            toast.success('Dépense modifiée');
            setEditingExpense(null);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setEditSaving(false);
        }
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Group by month for summary stats
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-05"
    const thisMonthExpenses = expenses.filter(e => e.expense_date?.startsWith(currentMonth));
    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Group by category for breakdown
    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
        return acc;
    }, {} as Record<string, number>);

    const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['Divers'];

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Charges & Dépenses</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestion des frais opérationnels</p>
                </div>
                <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
                    <Plus size={16} /> Nouvelle Dépense
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card border-slate-100 shadow-sm relative overflow-hidden group hover:border-[#f97316]/30 transition-colors">
                    <div className="absolute -right-6 -bottom-6 opacity-5 text-[#0f172a] group-hover:scale-110 transition-transform"><Receipt size={80} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Général</p>
                    <p className="text-xl font-black text-[#0f172a] italic">{formatMoney(totalExpenses)} <span className="text-[10px] text-slate-400 font-bold">MAD</span></p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">{expenses.length} dépense(s)</p>
                </div>
                <div className="stat-card border-orange-100 shadow-sm bg-[#fef2e0]/30 relative overflow-hidden group hover:border-[#f97316]/40 transition-colors">
                    <div className="absolute -right-6 -bottom-6 opacity-10 text-[#ea580c] group-hover:scale-110 transition-transform"><TrendingDown size={80} /></div>
                    <p className="text-[10px] font-black text-[#ea580c]/60 uppercase tracking-widest leading-none mb-1">Ce Mois-ci</p>
                    <p className="text-xl font-black text-[#ea580c] italic">{formatMoney(thisMonthTotal)} <span className="text-[10px] text-[#ea580c]/60 font-bold">MAD</span></p>
                    <p className="text-[9px] text-[#ea580c]/60 font-bold mt-1">{thisMonthExpenses.length} dépense(s)</p>
                </div>
                <div className="stat-card border-slate-100 shadow-sm relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Top Catégories</p>
                    <div className="space-y-1.5">
                        {Object.entries(categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([cat, total]) => (
                                <div key={cat} className="flex justify-between items-center">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border ${getCategoryColor(cat)}`}>{cat}</span>
                                    <span className="text-[10px] font-black text-[#0f172a]">{formatMoney(total)} MAD</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="card p-6 border-orange-200 bg-white">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                            <select className="input-dark" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant *</label>
                            <MoneyInput className="input-dark" value={form.amount} onChange={val => setForm({ ...form, amount: val.toString() })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date *</label>
                            <input type="date" className="input-dark" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                            <input className="input-dark" placeholder="Détails de la dépense..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
                            </button>
                            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Annuler</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Expenses Table */}
            <div className="card overflow-hidden">
                <table className="table-dark">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Catégorie</th>
                            <th>Description</th>
                            <th className="text-right">Montant</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto opacity-20" /></td></tr>
                        ) : expenses.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-slate-400 italic font-medium">Aucune dépense enregistrée.</td></tr>
                        ) : expenses.map(e => (
                            <tr key={e.id} className="group transition-colors hover:bg-slate-50/50">
                                <td data-label="Date" className="font-bold text-slate-400 text-[10px] uppercase tracking-tighter">{e.expense_date}</td>
                                <td data-label="Catégorie">
                                    <span className={`font-black text-[9px] px-2 py-0.5 rounded uppercase italic border ${getCategoryColor(e.category)}`}>
                                        {e.category}
                                    </span>
                                </td>
                                <td data-label="Description" className="text-slate-500 italic text-xs font-medium max-w-[200px] truncate">{e.description || '—'}</td>
                                <td data-label="Montant" className="text-right font-black text-[#0f172a] italic">{formatMoney(e.amount)} <small className="text-[9px] text-slate-400 font-bold">MAD</small></td>
                                <td data-label="Actions" className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button onClick={() => setSelectedExpense(e)} className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-200" title="Détails">
                                            <Eye size={12} />
                                        </button>
                                        <button onClick={() => openEdit(e)} className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all border border-slate-200" title="Modifier">
                                            <Edit2 size={12} />
                                        </button>
                                        <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id} className="w-7 h-7 rounded bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200" title="Supprimer">
                                            {deletingId === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Expense Detail Drawer ── */}
            {selectedExpense && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedExpense(null)}>
                    <div className="w-full max-w-md bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setSelectedExpense(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <h2 className="text-lg font-black text-[#0f172a] flex items-center gap-3 uppercase tracking-tighter">
                                <span className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] shadow-inner border border-[#f97316]/20">
                                    <Receipt size={20} />
                                </span>
                                Détail Dépense
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const expense = selectedExpense;
                                        setSelectedExpense(null);
                                        openEdit(expense);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Edit2 size={12} /> Modifier
                                </button>
                                <button onClick={() => setSelectedExpense(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 hidden sm:flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            {/* Amount Hero */}
                            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-xl relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 opacity-10"><DollarSign size={120} /></div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Montant de la Dépense</label>
                                <p className="text-4xl font-black italic text-[#f97316] leading-none">{formatMoney(selectedExpense.amount)}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1">MAD</p>
                            </div>

                            {/* Info Rows */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                        <Tag size={16} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Catégorie</label>
                                        <span className={`font-black text-[10px] px-2 py-0.5 rounded uppercase italic border ${getCategoryColor(selectedExpense.category)}`}>
                                            {selectedExpense.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date de la Dépense</label>
                                        <p className="text-sm text-[#0f172a] font-bold">{new Date(selectedExpense.expense_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                        <DollarSign size={16} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Montant</label>
                                        <p className="text-sm font-black text-emerald-600 italic">{formatMoney(selectedExpense.amount)} MAD</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedExpense.description && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative">
                                    <div className="absolute top-4 right-4 text-slate-200"><FileText size={40} /></div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 relative z-10">
                                        <FileText size={10} className="text-slate-400" /> Description / Notes
                                    </label>
                                    <p className="text-xs text-slate-600 leading-relaxed italic font-medium relative z-10">"{selectedExpense.description}"</p>
                                </div>
                            )}

                            {/* Monthly Context */}
                            <div className="pt-6 border-t border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-6 h-px bg-slate-200 flex-1"></div> Dépenses du même mois <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                </label>
                                {(() => {
                                    const month = selectedExpense.expense_date?.slice(0, 7);
                                    const sameMonth = expenses.filter(ex => ex.expense_date?.startsWith(month) && ex.id !== selectedExpense.id);
                                    const monthTotal = sameMonth.reduce((s, ex) => s + Number(ex.amount), 0) + Number(selectedExpense.amount);
                                    return (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center p-3 bg-[#fef2e0] rounded-xl border border-[#ea580c]/10">
                                                <span className="text-[10px] font-black text-[#ea580c] uppercase tracking-widest">Total du mois</span>
                                                <span className="text-sm font-black text-[#ea580c] italic">{formatMoney(monthTotal)} MAD</span>
                                            </div>
                                            {sameMonth.length > 0 ? sameMonth.slice(0, 5).map(ex => (
                                                <div key={ex.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${getCategoryColor(ex.category)}`}>{ex.category}</span>
                                                        <span className="text-slate-500 italic truncate max-w-[120px]">{ex.description || '—'}</span>
                                                    </div>
                                                    <span className="font-bold text-[#0f172a]">{formatMoney(ex.amount)} MAD</span>
                                                </div>
                                            )) : (
                                                <p className="text-xs text-slate-400 italic text-center p-3">Aucune autre dépense ce mois.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-[#0f172a] shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                            <button
                                onClick={() => { setSelectedExpense(null); openEdit(selectedExpense); }}
                                className="w-full btn-primary !bg-[#f97316] hover:!bg-[#ea580c] !border-none !text-white text-xs py-3 flex items-center justify-center gap-2 uppercase tracking-wider font-black italic shadow-lg shadow-[#f97316]/20"
                            >
                                <Edit2 size={14} /> Modifier cette dépense
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ── Edit Modal ── */}
            {editingExpense && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handleEdit} className="card w-full max-w-lg bg-white shadow-2xl border-none rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                        {/* Mobile Close Button */}
                        <button
                            type="button"
                            onClick={() => setEditingExpense(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter">
                                <Edit2 size={18} className="text-[#f97316]" />
                                Modifier la Dépense
                            </h2>
                            <button type="button" onClick={() => setEditingExpense(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors hidden sm:block">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catégorie *</label>
                                <select className="input-dark" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant *</label>
                                <MoneyInput className="input-dark font-black text-[#f97316]" value={editForm.amount} onChange={val => setEditForm({ ...editForm, amount: val.toString() })} required />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date *</label>
                                <input type="date" className="input-dark" value={editForm.expense_date} onChange={e => setEditForm({ ...editForm, expense_date: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</label>
                                <textarea className="input-dark min-h-[80px] resize-none italic font-medium" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Détails de la dépense..." />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingExpense(null)} className="btn-secondary font-bold">Annuler</button>
                            <button type="submit" disabled={editSaving} className="btn-primary font-black uppercase italic tracking-wider">
                                {editSaving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
                , document.body)}
        </div>
    );
}
