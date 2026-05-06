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
                <div className="flex items-center gap-4 bg-white/03 p-4 rounded-2xl border border-white/05 backdrop-blur-md sticky top-0 z-10">
                    <button onClick={() => navigate('/customers')} className="w-10 h-10 rounded-xl bg-white/05 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight leading-none">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
                        <p className="text-slate-500 text-xs mt-1 font-medium italic">Gérez les coordonnées et l'historique du client</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="card p-10 space-y-8 border-indigo-500/10 shadow-xl shadow-indigo-500/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Nom complet du client *</label>
                            <div className="relative group">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    className="input-dark pl-12 h-12 text-lg font-semibold"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="ex: Jean Dupont"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Téléphone</label>
                            <div className="relative group">
                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    className="input-dark pl-12 font-medium"
                                    value={form.phone || ''}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    placeholder="06XXXXXXXX"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email professionnel</label>
                            <div className="relative group">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="email"
                                    className="input-dark pl-12 font-medium"
                                    value={form.email || ''}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="client@exemple.com"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Adresse de facturation / livraison</label>
                            <div className="relative group">
                                <MapPin size={16} className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <textarea
                                    className="input-dark pl-12 min-h-[100px] pt-4 resize-none leading-relaxed"
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

                    <div className="pt-6 flex justify-end gap-3 border-t border-white/05">
                        <button type="button" onClick={() => navigate('/customers')} className="btn-secondary px-8 font-bold">Annuler</button>
                        <button type="submit" className="btn-primary px-10 font-black shadow-xl shadow-indigo-500/20" disabled={saving}>
                            {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                            {isEdit ? 'METTRE À JOUR' : 'ENREGISTRER LE CLIENT'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
