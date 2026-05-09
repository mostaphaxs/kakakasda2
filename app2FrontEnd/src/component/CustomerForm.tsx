import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, ArrowLeft, Save, Loader2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

export default function CustomerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        name: '', email: '', phone: '', address: '', notes: ''
    });
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isEdit) {
            apiFetch(`/customers/${id}`)
                .then(setForm)
                .catch(() => toast.error('Erreur lors du chargement du client'))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/customers/${id}` : '/customers';
            await apiFetch(url, { method, body: JSON.stringify(form) });
            toast.success(isEdit ? 'Client mis à jour' : 'Client ajouté');
            navigate('/customers');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="animate-fade-in flex flex-col items-center justify-center min-h-[calc(100vh-140px)] pb-10">
            <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
                    <button onClick={() => navigate('/customers')} className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-200">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-[#0f172a] tracking-tighter leading-none uppercase">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
                        <p className="text-slate-400 text-[9px] mt-1 font-bold uppercase tracking-widest leading-none">Gérez les coordonnées et l'historique du client</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="card p-10 space-y-8 border-indigo-500/10 shadow-xl shadow-indigo-500/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nom complet du client *</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-300 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                                    <User size={14} />
                                </div>
                                <input
                                    className="input-dark pl-11 h-11 text-xs font-bold italic"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="ex: Jean Dupont"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Téléphone</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-300 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                                    <Phone size={14} />
                                </div>
                                <input
                                    className="input-dark pl-11 h-10 font-bold text-xs"
                                    value={form.phone || ''}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    placeholder="06XXXXXXXX"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email professionnel</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-300 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                                    <Mail size={14} />
                                </div>
                                <input
                                    type="email"
                                    className="input-dark pl-11 h-10 font-bold text-xs"
                                    value={form.email || ''}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="client@exemple.com"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Adresse de facturation / livraison</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-4 w-4 h-4 flex items-center justify-center text-slate-300 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                                    <MapPin size={14} />
                                </div>
                                <textarea
                                    className="input-dark pl-11 min-h-[80px] pt-3.5 resize-none leading-relaxed text-xs font-bold"
                                    value={form.address || ''}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="Adresse complète (Ville, Quartier, Rue...)"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <FileText size={14} className="text-indigo-400" /> Notes & Préférences
                            </label>
                            <div className="relative group">
                                <textarea
                                    className="input-dark min-h-[120px] pt-4 resize-none leading-relaxed italic bg-indigo-500/[0.01]"
                                    value={form.notes || ''}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Historique, réductions habituelles, modèles préférés..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => navigate('/customers')} className="btn-secondary px-8 font-bold text-xs uppercase">Annuler</button>
                        <button type="submit" className="btn-primary px-8 font-black uppercase italic shadow-lg shadow-[#f97316]/10" disabled={saving}>
                            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            {isEdit ? 'Mettre à jour le client' : 'Enregistrer le client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
