import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Smartphone, Cpu, Edit2, Trash2, Loader2, Eye, X } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import toast from 'react-hot-toast';

interface Device {
    id: number;
    brand: string;
    model: string;
    imei: string | null;
    serial_number: string | null;
    condition: 'New' | 'Used' | 'Refurbished';
    category: string | null;
    color: string | null;
    storage_capacity: string | null;
    purchase_price: string;
    suggested_price: string;
    technical_specs: any;
    notes: string | null;
    supplier?: { id: number; name: string } | null;
    quantity: number;
}

const CONDITION_LABELS = { New: 'Neuf', Used: 'Occasion', Refurbished: 'Reconditionné' };
const CONDITION_BADGE = { New: 'badge-green', Used: 'badge-yellow', Refurbished: 'badge-blue' };

export default function Devices() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [condition, setCondition] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    const loadDevices = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (condition) params.set('condition', condition);
        const url = `/devices?${params}`;
        console.log('Fetching devices:', url);
        apiFetch(url)
            .then(r => {
                console.log('Devices response:', r);
                setDevices(r.data ?? r);
            })
            .catch(err => {
                console.error('Devices error:', err);
                toast.error('Erreur de chargement');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadDevices(); }, [q, condition]);

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer cet appareil ?')) return;
        setDeletingId(id);
        try {
            await apiFetch(`/devices/${id}`, { method: 'DELETE' });
            setDevices(prev => prev.filter(d => d.id !== id));
            toast.success('Appareil supprimé');
        } catch {
            toast.error('Erreur suppression');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Inventaire</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{devices.reduce((acc, d) => acc + (Number(d.quantity) || 1), 0)} unités total en stock</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/devices/add')}>
                    <Plus size={17} /> Ajouter
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Rechercher par IMEI, modèle, marque..."
                        className="input-dark pl-9"
                    />
                </div>
                <div className="relative w-full sm:w-48">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select className="input-dark pl-9" value={condition} onChange={e => setCondition(e.target.value)}>
                        <option value="">Toutes les conditions</option>
                        <option value="New">Neuf</option>
                        <option value="Used">Occasion</option>
                        <option value="Refurbished">Reconditionné</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500">
                        <Loader2 size={24} className="animate-spin mr-2" /> Chargement...
                    </div>
                ) : devices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <Smartphone size={48} className="mb-3 opacity-30" />
                        <p className="font-medium">Aucun appareil trouvé</p>
                        <button className="btn-primary mt-4" onClick={() => navigate('/devices/add')}>
                            <Plus size={16} /> Premier appareil
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-dark">
                            <thead>
                                <tr>
                                    <th>Appareil</th>
                                    <th>Catégorie</th>
                                    <th>IMEI / SN</th>
                                    <th>Condition</th>
                                    <th>Prix Achat</th>
                                    <th>Prix Conseillé</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map(d => {
                                    return (
                                        <tr key={d.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                                        <Cpu size={16} className="text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-white font-semibold text-sm">{d.brand} {d.model}</p>
                                                            <span className="badge bg-indigo-500/20 text-indigo-400 text-[9px] py-1 border-indigo-500/30 px-2 font-black tracking-tighter">Qty: {d.quantity || 1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-slate-500 text-[10px]">{[d.color, d.storage_capacity].filter(Boolean).join(' · ')}</p>
                                                            {d.supplier && <span className="text-orange-400 text-[9px] font-bold px-1.5 py-0.5 bg-orange-500/10 rounded-md ring-1 ring-orange-500/20">{d.supplier.name}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-indigo">{d.category || 'Smartphone'}</span>
                                            </td>
                                            <td>
                                                <p className="font-mono text-xs text-slate-400">{d.imei || d.serial_number || '—'}</p>
                                            </td>
                                            <td>
                                                <span className={`badge ${CONDITION_BADGE[d.condition]}`}>
                                                    {CONDITION_LABELS[d.condition]}
                                                </span>
                                            </td>
                                            <td className="font-semibold text-slate-300">{formatMoney(d.purchase_price)} MAD</td>
                                            <td className="font-bold text-emerald-400">{formatMoney(d.suggested_price)} MAD</td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    <button
                                                        className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all ring-1 ring-emerald-500/20"
                                                        onClick={() => setSelectedDevice(d)}
                                                        title="Voir détails"
                                                    >
                                                        <Eye size={13} />
                                                    </button>
                                                    <button
                                                        className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ring-1 ring-indigo-500/20"
                                                        onClick={() => navigate(`/devices/edit/${d.id}`)}
                                                        title="Modifier"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ring-1 ring-red-500/20"
                                                        onClick={() => handleDelete(d.id)}
                                                        disabled={deletingId === d.id}
                                                        title="Supprimer"
                                                    >
                                                        {deletingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Device Details Modal */}
            {selectedDevice && (
                <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[300] flex flex-col items-center justify-center p-4 bg-[#050810]/95 backdrop-blur-md animate-in fade-in duration-400">
                    <div className="card w-full max-w-lg overflow-hidden border-indigo-500/30 shadow-2xl shadow-indigo-500/30 animate-in zoom-in-95 duration-300 ring-1 ring-white/10 my-auto">
                        <div className="p-6 border-b border-white/05 flex items-center justify-between bg-indigo-500/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">{selectedDevice.brand} {selectedDevice.model}</h2>
                                    <span className={`badge ${CONDITION_BADGE[selectedDevice.condition]} text-[10px]`}>{CONDITION_LABELS[selectedDevice.condition]}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDevice(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IMEI / SN</label>
                                    <p className="text-sm font-mono text-white">{selectedDevice.imei || selectedDevice.serial_number || 'Aucun'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Catégorie</label>
                                    <p className="text-sm text-white">{selectedDevice.category || 'Smartphone'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stockage</label>
                                    <p className="text-sm text-white">{selectedDevice.storage_capacity || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fournisseur</label>
                                    <p className="text-sm text-orange-400 font-bold">{selectedDevice.supplier?.name || 'Inconnu'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Couleur</label>
                                    <p className="text-sm text-white">{selectedDevice.color || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Quantité en Stock</label>
                                    <p className="text-sm text-white font-black">{selectedDevice.quantity || 1}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Cpu size={12} className="text-indigo-400" /> Spécifications Techniques
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedDevice.technical_specs && Object.entries(selectedDevice.technical_specs).map(([key, val]) => (
                                        <div key={key} className="p-2 rounded-lg bg-white/03 border border-white/05 flex flex-col">
                                            <span className="text-[9px] text-slate-500 capitalize">{key.replace('_', ' ')}</span>
                                            <span className="text-xs text-slate-300 font-medium">{val as string || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedDevice.notes && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                                    <p className="text-sm text-slate-400 bg-white/03 p-3 rounded-lg border border-white/05 italic">"{selectedDevice.notes}"</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/05 flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium font-mono text-xs">P.A: {formatMoney(selectedDevice.purchase_price)} MAD</span>
                                <span className="text-emerald-400 font-black">Prix: {formatMoney(selectedDevice.suggested_price)} MAD</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
