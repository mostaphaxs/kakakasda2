import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users as UsersIcon, Phone, Mail, Edit2, Trash2, Loader2, Eye, X, MapPin, Smartphone } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface Customer { id: number; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null; total_purchases: number; }

export default function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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
                        <thead><tr><th>Client</th><th>Contact</th><th>Achats</th><th className="text-right pr-4">Actions</th></tr></thead>
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
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-2 pr-2">
                                            <button className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all ring-1 ring-emerald-500/20" onClick={() => setSelectedCustomer(c)} title="Voir détails">
                                                <Eye size={13} />
                                            </button>
                                            <button className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ring-1 ring-indigo-500/20" onClick={() => navigate(`/customers/${c.id}`)} title="Modifier">
                                                <Edit2 size={13} />
                                            </button>
                                            <button className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ring-1 ring-red-500/20" onClick={() => del(c.id)} title="Supprimer">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[300] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <div className="card w-full max-w-md overflow-hidden border-indigo-500/30 shadow-2xl shadow-indigo-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-indigo-500/[0.03]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <UsersIcon size={20} className="text-indigo-400" /> Profil Client
                            </h2>
                            <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-tight">{selectedCustomer.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="badge badge-indigo text-[10px]">{selectedCustomer.total_purchases || 0} Achats</span>
                                        <span className="text-xs text-slate-500 font-medium italic">Client enregistré</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/05">
                                {selectedCustomer.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/05 flex items-center justify-center text-slate-400">
                                            <Phone size={14} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Téléphone</label>
                                            <p className="text-sm text-slate-200">{selectedCustomer.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedCustomer.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/05 flex items-center justify-center text-slate-400">
                                            <Mail size={14} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                                            <p className="text-sm text-slate-200">{selectedCustomer.email}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedCustomer.address && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/05 flex items-center justify-center text-slate-400 mt-1">
                                            <MapPin size={14} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adresse</label>
                                            <p className="text-sm text-slate-200 italic">{selectedCustomer.address}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedCustomer.notes && (
                                <div className="p-4 rounded-xl bg-white/03 border border-white/05">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Smartphone size={10} className="text-indigo-400" /> Notes Internes
                                    </label>
                                    <p className="text-xs text-slate-400 leading-relaxed italic">"{selectedCustomer.notes}"</p>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                                    className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={13} /> Modifier les informations
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
