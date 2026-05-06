import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Package, X } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import MoneyInput from './MoneyInput';
import toast from 'react-hot-toast';

interface Article {
    id: number;
    designation: string;
    description: string | null;
    prix_unitaire_defaut: number;
    tva_defaut: number;
}

const emptyForm = { designation: '', description: '', prix_unitaire_defaut: 0, tva_defaut: 20 };

export default function Articles() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Article | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const load = () => {
        setLoading(true);
        const p = new URLSearchParams(); if (q) p.set('q', q);
        apiFetch(`/articles?${p}`)
            .then(r => setArticles(r.data ?? r))
            .catch(() => toast.error('Erreur chargement articles'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [q]);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (a: Article) => {
        setEditing(a);
        setForm({
            designation: a.designation,
            description: a.description || '',
            prix_unitaire_defaut: a.prix_unitaire_defaut,
            tva_defaut: a.tva_defaut,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                const updated = await apiFetch(`/articles/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
                setArticles(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a));
                toast.success('Article modifié');
            } else {
                const created = await apiFetch('/articles', { method: 'POST', body: JSON.stringify(form) });
                setArticles(prev => [created, ...prev]);
                toast.success('Article créé');
            }
            setShowForm(false);
        } catch (err: any) {
            toast.error(err.message || 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer cet article ?')) return;
        setDeletingId(id);
        try {
            await apiFetch(`/articles/${id}`, { method: 'DELETE' });
            setArticles(prev => prev.filter(a => a.id !== id));
            toast.success('Article supprimé');
        } catch { toast.error('Erreur suppression'); }
        finally { setDeletingId(null); }
    };

    const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Catalogue d'Articles</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{articles.length} articles enregistrés</p>
                </div>
                <button className="btn-primary" onClick={openCreate}><Plus size={17} /> Nouveau</button>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article..." className="input-dark pl-9" />
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 size={22} className="animate-spin mr-2" /> Chargement...</div>
                ) : articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <Package size={48} className="mb-3 opacity-30 text-amber-500" />
                        <p className="font-medium">Aucun article enregistré</p>
                        <button className="btn-primary mt-4" onClick={openCreate}><Plus size={16} /> Ajouter un article</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-dark">
                            <thead>
                                <tr>
                                    <th>Désignation</th>
                                    <th>P.U Défaut (MAD)</th>
                                    <th>TVA Défaut</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articles.map(a => (
                                    <tr key={a.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                                    <Package size={16} className="text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{a.designation}</p>
                                                    {a.description && <p className="text-slate-500 text-xs w-48 truncate">{a.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="font-mono text-emerald-400 font-bold">{formatMoney(a.prix_unitaire_defaut)}</span></td>
                                        <td><span className="badge badge-indigo w-max">{a.tva_defaut}%</span></td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <button className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ring-1 ring-indigo-500/20" onClick={() => openEdit(a)} title="Modifier">
                                                    <Edit2 size={13} />
                                                </button>
                                                <button className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ring-1 ring-red-500/20" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} title="Supprimer">
                                                    {deletingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
                    <form onSubmit={handleSubmit} className="card w-full max-w-lg overflow-hidden border-amber-500/20 shadow-2xl shadow-amber-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-amber-500/[0.03]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                                <Package size={22} className="text-amber-400" />
                                {editing ? 'Modifier l\'Article' : 'Nouvel Article'}
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Désignation *</label>
                                <input className="input-dark text-lg font-bold border-amber-500/20 focus:border-amber-500/50" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Ex: Clavier Mécanique..." required />
                            </div>

                            <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-amber-500/[0.02] border border-amber-500/10">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">Prix Unitaire par défaut</label>
                                    <MoneyInput className="input-dark font-medium" value={form.prix_unitaire_defaut} onChange={val => set('prix_unitaire_defaut', val)} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">TVA par défaut (%)</label>
                                    <input type="number" step="0.01" min="0" max="100" className="input-dark font-medium" value={form.tva_defaut} onChange={e => set('tva_defaut', e.target.value)} required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Description</label>
                                <textarea className="input-dark min-h-[100px] pt-3 resize-none text-slate-300" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Spécifications, détails..." />
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/05 flex justify-end gap-3 bg-white/[0.01]">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary font-bold px-6">Annuler</button>
                            <button type="submit" disabled={saving} className="btn-primary font-black uppercase tracking-wider px-8 shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-500 hover:text-white border-none">
                                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                {editing ? 'Enregistrer' : 'Créer l\'Article'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
