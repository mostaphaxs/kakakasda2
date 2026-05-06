import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, ArrowLeft, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

const SPECS_KEYS = ['processeur', 'ram', 'batterie', 'ecran', 'appareil_photo', 'os'];

export default function AddDevice() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        brand: '', model: '', imei: '', serial_number: '',
        condition: 'New', color: '', storage_capacity: '',
        purchase_price: '', suggested_price: '', notes: '',
    });
    const [specs, setSpecs] = useState<Record<string, string>>({});
    const [aiLoading, setAiLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const suggestPrice = async () => {
        if (!form.brand || !form.model || !form.purchase_price) {
            toast.error('Remplissez la marque, le modèle et le prix d\'achat d\'abord.');
            return;
        }
        setAiLoading(true);
        try {
            const device = await apiFetch('/devices', {
                method: 'POST',
                body: JSON.stringify({ ...form, technical_specs: specs, suggested_price: null }),
            });
            const result = await apiFetch(`/devices/${device.id}/suggest-price`, { method: 'POST' });
            setForm(prev => ({ ...prev, suggested_price: result.suggested_price }));
            await apiFetch(`/devices/${device.id}`, { method: 'DELETE' }); // Clean temp record
            toast.success(`Prix suggéré : ${result.suggested_price} MAD`);
        } catch {
            toast.error('IA indisponible, entrez le prix manuellement.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiFetch('/devices', {
                method: 'POST',
                body: JSON.stringify({ ...form, technical_specs: specs }),
            });
            toast.success('Appareil ajouté avec succès !');
            navigate('/devices');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/devices')} className="btn-secondary !px-3">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white">Ajouter un appareil</h1>
                    <p className="text-slate-500 text-sm">Renseignez les informations de l'appareil</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <Cpu size={13} /> Informations de base
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Marque *</label>
                            <input className="input-dark" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple, Samsung, Xiaomi..." required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Modèle *</label>
                            <input className="input-dark" value={form.model} onChange={e => set('model', e.target.value)} placeholder="iPhone 15 Pro, S24..." required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">IMEI</label>
                            <input className="input-dark font-mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="354523080073002" maxLength={15} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Numéro de série</label>
                            <input className="input-dark font-mono" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="SN123456789" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Condition *</label>
                            <select className="input-dark" value={form.condition} onChange={e => set('condition', e.target.value)} required>
                                <option value="New">Neuf</option>
                                <option value="Used">Occasion</option>
                                <option value="Refurbished">Reconditionné</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Stockage</label>
                            <select className="input-dark" value={form.storage_capacity} onChange={e => set('storage_capacity', e.target.value)}>
                                <option value="">—</option>
                                {['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Couleur</label>
                            <input className="input-dark" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Noir Sidéral, Blanc Lunaire..." />
                        </div>
                    </div>
                </div>

                {/* Technical Specs */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 flex items-center gap-2">
                        <Sparkles size={13} /> Spécifications techniques (pour l'IA)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {SPECS_KEYS.map(k => (
                            <div key={k}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 capitalize">{k.replace('_', ' ')}</label>
                                <input className="input-dark" value={specs[k] || ''} onChange={e => setSpecs(prev => ({ ...prev, [k]: e.target.value }))} placeholder={`ex: ${k === 'ram' ? '8GB' : k === 'batterie' ? '4500 mAh' : '...'}`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <CheckCircle size={13} /> Tarification
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Prix d'achat (MAD) *</label>
                            <input type="number" className="input-dark" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Prix de vente conseillé (MAD)</label>
                            <div className="flex gap-2">
                                <input type="number" className="input-dark" value={form.suggested_price} onChange={e => set('suggested_price', e.target.value)} placeholder="IA suggère automatiquement" />
                                <button type="button" onClick={suggestPrice} disabled={aiLoading} className="btn-primary !px-3 flex-shrink-0" title="Demander à l'IA">
                                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">Cliquez sur ✨ pour que Gemini suggère un prix</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
                        <textarea className="input-dark resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="État de la batterie, accessoires inclus..." />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" className="btn-secondary" onClick={() => navigate('/devices')}>Annuler</button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
}
