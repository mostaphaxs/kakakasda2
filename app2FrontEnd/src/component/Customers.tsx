import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users as UsersIcon, Phone, Mail, Edit2, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface Customer { id: number; name: string; email: string | null; phone: string | null; total_purchases: number; }

export default function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    useEffect(() => {
        const p = new URLSearchParams(); if (q) p.set('q', q);
        apiFetch(`/customers?${p}`).then(r => setCustomers(r.data ?? r)).catch(() => { }).finally(() => setLoading(false));
    }, [q]);

    const del = async (id: number) => {
        if (!confirm('Supprimer ce client ?')) return;
        await apiFetch(`/customers/${id}`, { method: 'DELETE' });
        setCustomers(p => p.filter(c => c.id !== id));
        toast.success('Client supprimé');
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Clients</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{customers.length} clients enregistrés</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/customers/add')}><Plus size={17} /> Nouveau client</button>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par nom, téléphone..." className="input-dark pl-9" />
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 size={22} className="animate-spin mr-2" /> Chargement...</div>
                ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <UsersIcon size={48} className="mb-3 opacity-30" />
                        <p className="font-medium">Aucun client</p>
                        <button className="btn-primary mt-4" onClick={() => navigate('/customers/add')}><Plus size={16} /> Ajouter</button>
                    </div>
                ) : (
                    <table className="table-dark">
                        <thead><tr><th>Client</th><th>Contact</th><th>Achats</th><th>Actions</th></tr></thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-white font-semibold text-sm">{c.name}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            {c.phone && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={11} />{c.phone}</span>}
                                            {c.email && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={11} />{c.email}</span>}
                                        </div>
                                    </td>
                                    <td><span className="badge badge-blue">{c.total_purchases ?? 0} ventes</span></td>
                                    <button className="btn-secondary !px-2 !py-1.5" onClick={() => navigate(`/customers/${c.id}`)}><Edit2 size={13} /></button>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
