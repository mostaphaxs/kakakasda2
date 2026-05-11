import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Cpu, ArrowLeft, Sparkles, Loader2, CheckCircle, Save, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { analyzeDeviceDocument } from '../lib/gemini';
import MoneyInput from './MoneyInput';
import toast from 'react-hot-toast';

const SPECS_KEYS = ['processeur', 'ram', 'batterie', 'ecran', 'appareil_photo', 'os'];

export default function AddDevice() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        brand: '', model: '', imei: '', serial_number: '',
        condition: 'New', category: 'Smartphone', color: '', storage_capacity: '',
        purchase_price: '', suggested_price: '', notes: '',
        supplier_id: '', quantity: '1'
    });
    const CATEGORIES = ['Smartphone', 'Tablette', 'Ordinateur', 'Audio', 'Accessoire', 'Lumina', 'Autre'];
    const [specs, setSpecs] = useState<Record<string, string>>({});
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(isEdit);
    const [aiLoading, setAiLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiFetch('/suppliers').then(r => setSuppliers(r.data ?? r));

        if (isEdit) {
            apiFetch(`/devices/${id}`)
                .then(data => {
                    setForm({
                        brand: data.brand, model: data.model, imei: data.imei || '',
                        serial_number: data.serial_number || '', condition: data.condition,
                        category: data.category || 'Smartphone',
                        color: data.color || '', storage_capacity: data.storage_capacity || '',
                        purchase_price: data.purchase_price, suggested_price: data.suggested_price || '',
                        notes: data.notes || '',
                        supplier_id: data.supplier_id || '',
                        quantity: data.quantity || '1'
                    });
                    setSpecs(data.technical_specs || {});
                })
                .catch(() => toast.error('Erreur chargement appareil'))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const suggestPrice = async () => {
        if (!form.brand || !form.model || !form.purchase_price) {
            toast.error('Remplissez la marque, le modèle et le prix d\'achat d\'abord.');
            return;
        }
        setAiLoading(true);
        try {
            const tempDevice = await apiFetch('/devices', {
                method: 'POST',
                body: JSON.stringify({ ...form, technical_specs: specs, suggested_price: null }),
            });
            const result = await apiFetch(`/devices/${tempDevice.id}/suggest-price`, { method: 'POST' });
            setForm(prev => ({ ...prev, suggested_price: result.suggested_price }));
            await apiFetch(`/devices/${tempDevice.id}`, { method: 'DELETE' });
            toast.success(`Prix suggéré : ${result.suggested_price} MAD`);
        } catch {
            toast.error('IA indisponible.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/devices/${id}` : '/devices';
            await apiFetch(url, {
                method,
                body: JSON.stringify({
                    ...form,
                    quantity: Number(form.quantity), // Send as number
                    technical_specs: specs
                }),
            });
            toast.success(isEdit ? 'Appareil mis à jour !' : 'Appareil ajouté !');
            navigate('/devices');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in flex flex-col items-center justify-center min-h-[calc(100vh-140px)] pb-10">
            <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10 w-full mb-6">
                    <button onClick={() => navigate('/devices')} className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-200">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-[#0f172a] tracking-tighter leading-none uppercase">{isEdit ? 'Modifier l\'appareil' : 'Nouvel appareil'}</h1>
                        <p className="text-slate-400 text-[9px] mt-1 font-bold uppercase tracking-widest leading-none">Gestion précise de l'inventaire en stock</p>
                    </div>
                </div>

                {/* PURE AI DOCUMENT SCANNER */}
                {!isEdit && (
                    <div className="flex items-center justify-between bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-2xl mb-8 group transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
                                <Sparkles size={24} className={aiLoading ? 'animate-spin' : 'animate-pulse'} />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-sm uppercase tracking-tighter">Scanner de Document</h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Analysez une fiche technique ou une photo pour tout remplir</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {aiLoading && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                    <Loader2 size={12} className="animate-spin text-orange-500" />
                                    <span className="text-[9px] font-black text-orange-500 uppercase">Analyse IA...</span>
                                </div>
                            )}

                            <label className="cursor-pointer group/scan relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const formData = new FormData();
                                        formData.append('image', file);

                                        setAiLoading(true);
                                        toast.loading('Analyse du document...', { id: 'scan-loading' });

                                        try {
                                            const res = await analyzeDeviceDocument(file);

                                            console.log('--- AI SCAN DEBUG (FRONTEND) ---');
                                            console.log(res);

                                            setForm(prev => ({
                                                ...prev,
                                                brand: res.brand || prev.brand,
                                                model: res.model || prev.model,
                                                category: res.category || prev.category,
                                                storage_capacity: res.storage_capacity || prev.storage_capacity,
                                                color: res.color || prev.color
                                            }));
                                            const newSpecs = { ...specs };
                                            ['processeur', 'ram', 'batterie', 'ecran', 'appareil_photo', 'os'].forEach(k => {
                                                if (res[k]) newSpecs[k] = res[k];
                                            });
                                            setSpecs(newSpecs);
                                            toast.success('Analyse terminée !', { id: 'scan-loading' });
                                        } catch (err: any) {
                                            toast.error(err.message || 'Échec de l\'analyse', { id: 'scan-loading' });
                                        } finally {
                                            setAiLoading(false);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-3 px-8 py-3 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all border border-slate-700 shadow-lg group-hover/scan:scale-105 active:scale-95">
                                    <FileText size={18} />
                                    <span>Importer un Document</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="card p-8 space-y-6 border-slate-200">
                        <div className="flex items-center justify-between gap-4 mb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f97316] flex items-center gap-2">
                                <Cpu size={14} /> Informations de base
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catégorie *</label>
                                    <select className="input-dark font-bold bg-white" value={form.category} onChange={e => set('category', e.target.value)} required>
                                        <option value="" disabled>Sélectionner...</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fournisseur</label>
                                    <select className="input-dark font-bold bg-white" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                                        <option value="">— Aucun —</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-black italic">Marque *</label>
                                <input className="input-dark border-[#f97316]/20" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple, Samsung..." required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-black italic">Modèle *</label>
                                <input className="input-dark border-[#f97316]/20" value={form.model} onChange={e => set('model', e.target.value)} placeholder="iPhone 15 Pro..." required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">IMEI</label>
                                <input className="input-dark font-mono text-sm" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="35XXXXXXXXXXXXX" maxLength={15} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">N° Série</label>
                                <input className="input-dark font-mono text-sm" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="SNXXXXXXXX" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Condition *</label>
                                <select className="input-dark" value={form.condition} onChange={e => set('condition', e.target.value)} required>
                                    <option value="New">Neuf</option>
                                    <option value="Used">Occasion</option>
                                    <option value="Refurbished">Reconditionné</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Stockage</label>
                                <select className="input-dark" value={form.storage_capacity} onChange={e => set('storage_capacity', e.target.value)}>
                                    <option value="">—</option>
                                    {['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-[#f97316] uppercase tracking-widest mb-1 italic">Quantité Stock *</label>
                                <input type="number" min="1" className="input-dark font-black text-[#f97316] border-[#f97316]/20 bg-[#f97316]/5" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="1" required />
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="card p-8 space-y-6 border-slate-200">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f97316] flex items-center gap-2 mb-2">
                            <Sparkles size={14} /> Fiche Technique
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            {SPECS_KEYS.map(k => (
                                <div key={k} className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.replace('_', ' ')}</label>
                                    <input className="input-dark font-bold italic" value={specs[k] || ''} onChange={e => setSpecs(prev => ({ ...prev, [k]: e.target.value }))} placeholder={`ex: ${k === 'ram' ? '8GB' : k === 'batterie' ? '5000mAh' : '...'}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="card p-8 space-y-6 border-[#f97316]/10 bg-[#f97316]/[0.02]">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f97316] flex items-center gap-2 mb-2">
                            <Save size={14} /> Tarification
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Prix d'achat (MAD) *</label>
                                <MoneyInput className="input-dark bg-white/03 ring-1 ring-white/10" value={form.purchase_price} onChange={val => set('purchase_price', val.toString())} placeholder="0.00" required />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between items-center">
                                    Prix de vente conseillé
                                    <span className="text-emerald-500 lowercase font-bold text-[9px] flex items-center gap-1 uppercase tracking-widest">
                                        <Sparkles size={8} /> Propulsé par Gemini AI
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <MoneyInput className="input-dark font-black text-emerald-500 text-lg" value={form.suggested_price} onChange={val => set('suggested_price', val.toString())} placeholder="Suggestion auto" />
                                    <button type="button" onClick={suggestPrice} disabled={aiLoading} className="w-12 h-10 rounded-lg bg-[#f97316] text-white flex items-center justify-center hover:bg-[#ef4444] active:scale-95 transition-all shadow-lg shadow-[#f97316]/20 disabled:opacity-50" title="Calculer avec l'IA">
                                        {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Notes & Observations</label>
                            <textarea className="input-dark min-h-[100px] resize-none pt-3" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="État esthétique, accessoires inclus..." />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 w-full">
                        <button type="button" className="btn-secondary px-8 font-bold text-xs uppercase" onClick={() => navigate('/devices')}>Annuler</button>
                        <button type="submit" className="btn-primary px-8 font-black uppercase italic shadow-lg shadow-[#f97316]/20" disabled={saving}>
                            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : (isEdit ? <Save size={16} className="mr-2" /> : <CheckCircle size={16} className="mr-2" />)}
                            {isEdit ? 'Mettre à jour l\'appareil' : 'Enregistrer le stock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
