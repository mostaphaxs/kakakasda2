import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Edit2, Trash2, Loader2, Package, X, Eye, FileText, Banknote, Percent, Smartphone, Tag, Cpu, Palette } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import MoneyInput from './MoneyInput';
import toast from 'react-hot-toast';

interface Article {
    id: number;
    designation: string;
    description: string | null;
    prix_unitaire_defaut: number;
    tva_defaut: number;
    brand: string | null;
    model: string | null;
    category: string | null;
    condition: string | null;
    storage_capacity: string | null;
    color: string | null;
}

const emptyForm: any = {
    designation: '', description: '', prix_unitaire_defaut: 0, tva_defaut: 20,
    brand: '', model: '',
    condition: 'New', category: 'Smartphone', color: '', storage_capacity: ''
};

const CATEGORIES = ['Smartphone', 'Tablette', 'Ordinateur', 'Audio', 'Accessoire', 'Lumina', 'Autre'];

export default function Articles() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
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

    const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); };
    const openEdit = (a: Article) => {
        setEditing(a);
        setForm({
            ...emptyForm,
            designation: a.designation,
            description: a.description || '',
            prix_unitaire_defaut: a.prix_unitaire_defaut,
            tva_defaut: a.tva_defaut,
            brand: a.brand || '',
            model: a.model || '',
            condition: a.condition || 'New',
            category: a.category || 'Smartphone',
            color: a.color || '',
            storage_capacity: a.storage_capacity || ''
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const articlePayload = {
                designation: form.designation,
                description: form.description,
                prix_unitaire_defaut: form.prix_unitaire_defaut,
                tva_defaut: form.tva_defaut,
                brand: form.brand,
                model: form.model,
                category: form.category,
                condition: form.condition,
                storage_capacity: form.storage_capacity,
                color: form.color,
            };

            if (editing) {
                const updated = await apiFetch(`/articles/${editing.id}`, { method: 'PUT', body: JSON.stringify(articlePayload) });
                setArticles(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a));
                toast.success('Article modifié');
            } else {
                const created = await apiFetch('/articles', { method: 'POST', body: JSON.stringify(articlePayload) });
                setArticles(prev => [created, ...prev]);
                toast.success('Article créé');

                // Also create a Device in stock if brand is filled
                if (form.brand && form.brand.trim()) {
                    try {
                        await apiFetch('/devices', {
                            method: 'POST',
                            body: JSON.stringify({
                                brand: form.brand,
                                model: form.model || form.designation,
                                imei: null,
                                serial_number: null,
                                condition: form.condition || 'New',
                                category: form.category || 'Divers',
                                color: form.color || null,
                                storage_capacity: form.storage_capacity || null,
                                purchase_price: 0,
                                suggested_price: form.prix_unitaire_defaut || 0,
                                notes: null,
                                supplier_id: null,
                                quantity: 1,
                                technical_specs: {},
                            })
                        });
                        toast.success('Appareil ajouté au stock !');
                    } catch {
                        toast('Article créé mais erreur ajout stock', { icon: '⚠️' });
                    }
                }
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

    const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Catalogue d'Articles</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestion des produits & accessoires</p>
                </div>
                <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau Produit</button>
            </div>

            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                    <Search size={14} />
                </div>
                <input className="input-dark pl-10 h-10 italic" placeholder="Rechercher un article..." value={q} onChange={e => setQ(e.target.value)} />
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
                                    <th>Marque / Modèle</th>
                                    <th>P.U Défaut (MAD)</th>
                                    <th>TVA Défaut</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articles.map(a => (
                                    <tr key={a.id}>
                                        <td data-label="Produit">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-[#f97316]/10 flex items-center justify-center flex-shrink-0 text-[#f97316]">
                                                    <Package size={14} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[#0f172a] font-bold text-xs uppercase italic">{a.designation}</p>
                                                    {a.description && <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider w-48 truncate">{a.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Détails">
                                            {a.brand ? (
                                                <div className="space-y-0.5 text-right sm:text-left">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase italic leading-none">{a.brand}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{a.model || '—'}</p>
                                                </div>
                                            ) : <span className="text-slate-300 italic text-[10px]">Non spécifié</span>}
                                        </td>
                                        <td data-label="P.U"><span className="font-black text-[#0f172a] text-xs">{formatMoney(a.prix_unitaire_defaut)} MAD</span></td>
                                        <td data-label="TVA"><span className="bg-slate-100 text-slate-500 font-bold text-[10px] px-2 py-0.5 rounded tracking-tighter">{a.tva_defaut}% TVA</span></td>
                                        <td data-label="Actions" className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <button className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-200" onClick={() => setSelectedArticle(a)} title="Détails">
                                                    <Eye size={12} />
                                                </button>
                                                <button className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all border border-slate-200" onClick={() => openEdit(a)} title="Modifier">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button className="w-7 h-7 rounded bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} title="Supprimer">
                                                    {deletingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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

            {/* ── Article Detail Drawer ── */}
            {selectedArticle && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedArticle(null)}>
                    <div className="w-full max-w-2xl bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setSelectedArticle(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <h2 className="text-lg font-black text-[#0f172a] flex items-center gap-3 uppercase tracking-tighter">
                                <span className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-600 shadow-inner border border-orange-500/20">
                                    <Package size={20} />
                                </span>
                                Profil Article
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const article = selectedArticle;
                                        setSelectedArticle(null);
                                        openEdit(article);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Edit2 size={12} /> Modifier
                                </button>
                                <button onClick={() => setSelectedArticle(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 hidden sm:flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-500/20">
                                    {selectedArticle.designation.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-[#0f172a] leading-tight uppercase italic truncate">{selectedArticle.designation}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="badge badge-indigo text-[10px] uppercase font-black tracking-wider">Article Catalogue</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                        <Banknote size={16} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Prix Unitaire Défaut</label>
                                        <p className="text-sm font-black text-emerald-600 italic">{formatMoney(selectedArticle.prix_unitaire_defaut)} MAD</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                        <Percent size={16} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TVA par Défaut</label>
                                        <p className="text-sm text-[#0f172a] font-bold">{selectedArticle.tva_defaut}%</p>
                                    </div>
                                </div>
                            </div>

                            {/* New Descriptive Section in Detail */}
                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-6 h-px bg-slate-200 flex-1"></div> Spécifications Article <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Marque</label>
                                        <p className="text-xs font-black text-[#0f172a] uppercase italic flex items-center gap-2"><Tag size={10} className="text-[#f97316]" /> {selectedArticle.brand || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Modèle</label>
                                        <p className="text-xs font-black text-[#0f172a] uppercase italic">{selectedArticle.model || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Catégorie</label>
                                        <p className="text-xs font-bold text-indigo-600">{selectedArticle.category || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Condition Défaut</label>
                                        <p className="text-xs font-bold text-emerald-600">{selectedArticle.condition || 'New'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Stockage</label>
                                        <p className="text-xs font-black text-[#0f172a] flex items-center gap-2"><Cpu size={10} /> {selectedArticle.storage_capacity || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Couleur</label>
                                        <p className="text-xs font-black text-[#0f172a] flex items-center gap-2"><Palette size={10} /> {selectedArticle.color || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedArticle.description && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative">
                                    <div className="absolute top-4 right-4 text-slate-200"><FileText size={40} /></div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 relative z-10">
                                        <FileText size={10} className="text-slate-400" /> Description
                                    </label>
                                    <p className="text-xs text-slate-600 leading-relaxed italic font-medium relative z-10">"{selectedArticle.description}"</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-[#0f172a] shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                            <button
                                onClick={() => { setSelectedArticle(null); openEdit(selectedArticle); }}
                                className="w-full btn-primary !bg-[#f97316] hover:!bg-[#ea580c] !border-none !text-white text-xs py-3 flex items-center justify-center gap-2 uppercase tracking-wider font-black italic shadow-lg shadow-[#f97316]/20"
                            >
                                <Edit2 size={14} /> Modifier cet article
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ── Create/Edit Modal ── */}
            {showForm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handleSubmit} className="card w-full max-w-3xl bg-white shadow-2xl border-none rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter">
                                <Package size={18} className="text-[#f97316]" />
                                {editing ? 'Modifier l\'Article' : 'Nouveau Produit'}
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {/* Section 1: Article Catalogue */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f97316] flex items-center gap-2">
                                    <Package size={12} /> Informations Catalogue
                                </h3>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Désignation Produit *</label>
                                    <input className="input-dark font-bold italic" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Ex: Clavier Mécanique RGB..." required />
                                </div>
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prix Vente Défaut</label>
                                        <MoneyInput className="input-dark font-black text-[#f97316]" value={form.prix_unitaire_defaut} onChange={val => set('prix_unitaire_defaut', val)} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">TVA Défaut (%)</label>
                                        <input type="number" step="0.01" min="0" max="100" className="input-dark font-medium" value={form.tva_defaut} onChange={e => set('tva_defaut', e.target.value)} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</label>
                                    <textarea className="input-dark min-h-[80px] pt-3 resize-none text-slate-400 bg-white/01 italic font-bold" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Spécifications, détails..." />
                                </div>
                            </div>

                            {/* Section 2: Descriptive Fields (Always visible for editing too) */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                    <Smartphone size={12} /> Spécifications Articles
                                </h3>
                                {!editing && <p className="text-[9px] text-slate-400 italic font-medium -mt-2">Remplissez la marque pour créer automatiquement un appareil dans l'inventaire.</p>}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marque</label>
                                        <input className="input-dark" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple, Samsung..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modèle</label>
                                        <input className="input-dark" value={form.model} onChange={e => set('model', e.target.value)} placeholder="iPhone 15 Pro..." />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catégorie</label>
                                        <select className="input-dark" value={form.category} onChange={e => set('category', e.target.value)}>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">État</label>
                                        <select className="input-dark" value={form.condition} onChange={e => set('condition', e.target.value)}>
                                            <option value="New">Neuf</option>
                                            <option value="Used">Occasion</option>
                                            <option value="Refurbished">Reconditionné</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stockage</label>
                                        <select className="input-dark" value={form.storage_capacity} onChange={e => set('storage_capacity', e.target.value)}>
                                            <option value="">—</option>
                                            {['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Couleur</label>
                                        <input className="input-dark" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Noir, Blanc..." />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary font-bold">Annuler</button>
                            <button type="submit" disabled={saving} className="btn-primary font-black uppercase italic tracking-wider">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
                            </button>
                        </div>
                    </form>
                </div>
                , document.body)}
        </div>
    );
}
