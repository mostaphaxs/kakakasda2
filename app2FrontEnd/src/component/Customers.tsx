import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users as UsersIcon, Phone, Mail, Edit2, Trash2, Loader2, Eye, X, MapPin, Smartphone, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface Customer { id: number; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null; total_purchases: number; }

export default function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSales, setCustomerSales] = useState<any[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);

    useEffect(() => {
        const p = new URLSearchParams(); if (q) p.set('q', q);
        apiFetch(`/customers?${p}`).then(r => setCustomers(r.data ?? r)).catch(() => { }).finally(() => setLoading(false));
    }, [q]);

    useEffect(() => {
        if (selectedCustomer) {
            setLoadingSales(true);
            apiFetch(`/sales?customer_id=${selectedCustomer.id}`)
                .then(r => setCustomerSales(r.data ?? r))
                .catch(() => setCustomerSales([]))
                .finally(() => setLoadingSales(false));
        }
    }, [selectedCustomer]);

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

            {/* Customer Detail Drawer */}
            {selectedCustomer && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCustomer(null)}>
                    <div className="w-full max-w-md bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setSelectedCustomer(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <h2 className="text-lg font-black text-[#0f172a] flex items-center gap-3 uppercase tracking-tighter">
                                <span className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-600 shadow-inner border border-orange-500/20">
                                    <UsersIcon size={20} />
                                </span>
                                Profil Client
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const id = selectedCustomer.id;
                                        setSelectedCustomer(null);
                                        navigate(`/customers/${id}`);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Edit2 size={12} /> Modifier
                                </button>
                                <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 hidden sm:flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-500/20">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-[#0f172a] leading-tight uppercase italic truncate">{selectedCustomer.name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="badge badge-indigo text-[10px] uppercase font-black tracking-wider">{selectedCustomer.total_purchases || 0} Achats</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Inscrit</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                {selectedCustomer.phone && (
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                            <Phone size={16} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Téléphone</label>
                                            <p className="text-sm text-[#0f172a] font-bold">{selectedCustomer.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedCustomer.email && (
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
                                            <Mail size={16} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</label>
                                            <p className="text-sm text-[#0f172a] font-bold truncate">{selectedCustomer.email}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedCustomer.address && (
                                    <div className="flex items-start gap-3 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 mt-1 shrink-0 group-hover:scale-105 transition-transform">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1 mb-1">Adresse</label>
                                            <p className="text-sm text-[#0f172a] font-bold italic leading-tight">{selectedCustomer.address}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedCustomer.notes && (
                                <div className="p-4 rounded-xl bg-yellow-50/50 border border-yellow-100 relative">
                                    <div className="absolute top-4 right-4 text-yellow-500/20"><FileText size={40} /></div>
                                    <label className="text-[9px] font-black text-yellow-600/80 uppercase tracking-widest mb-2 flex items-center gap-1.5 relative z-10">
                                        <Smartphone size={10} className="text-yellow-500" /> Notes Internes
                                    </label>
                                    <p className="text-xs text-yellow-900 leading-relaxed italic font-medium relative z-10">"{selectedCustomer.notes}"</p>
                                </div>
                            )}

                            {/* Purchase History */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <div className="w-6 h-px bg-slate-200 flex-1"></div> Historique des Achats ({customerSales.length}) <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                </label>

                                {loadingSales ? (
                                    <div className="flex justify-center p-6 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
                                ) : customerSales.length === 0 ? (
                                    <div className="text-center p-6 text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Aucun achat enregistré pour ce client.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {customerSales.map((sale: any) => (
                                            <div key={sale.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-slate-300 transition-colors cursor-default">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-[9px] font-black text-[#f97316] uppercase tracking-widest bg-[#f97316]/10 px-2 py-0.5 rounded-full inline-block mb-1">
                                                            {new Date(sale.created_at).toLocaleDateString('fr-FR')}
                                                        </span>
                                                        <p className="text-sm font-black text-[#0f172a] uppercase leading-tight mt-0.5">
                                                            {sale.device ? `${sale.device.brand} ${sale.device.model}` : 'Appareil Supprimé'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-emerald-600 block">{sale.sale_price} MAD</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {sale.payment_method === 'cash' ? 'Espèces' : sale.payment_method}
                                                        </span>
                                                    </div>
                                                </div>
                                                {sale.device?.imei && (
                                                    <p className="text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200 border-dashed">
                                                        IMEI: {sale.device.imei}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>


                    </div>
                </div>
                , document.body)}
        </div>
    );
}
