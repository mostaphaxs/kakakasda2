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
        <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/customers')} className="btn-secondary !px-3">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
                    <p className="text-slate-500 text-sm">Gérez les coordonnées de votre client</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nom complet *</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                className="input-dark pl-10"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="ex: Jean Dupont"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Téléphone</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                className="input-dark pl-10"
                                value={form.phone || ''}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="06XXXXXXXX"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email"
                                className="input-dark pl-10"
                                value={form.email || ''}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="client@exemple.com"
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Adresse</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3 text-slate-500" />
                            <textarea
                                className="input-dark pl-10 min-h-[80px]"
                                value={form.address || ''}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                placeholder="Adresse postale complète..."
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Notes internes</label>
                        <div className="relative">
                            <FileText size={16} className="absolute left-3 top-3 text-slate-500" />
                            <textarea
                                className="input-dark pl-10 min-h-[100px]"
                                value={form.notes || ''}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                placeholder="Historique, préférences d'achat..."
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/05">
                    <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">Annuler</button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isEdit ? 'Mettre à jour' : 'Enregistrer le client'}
                    </button>
                </div>
            </form>
        </div>
    );
}
