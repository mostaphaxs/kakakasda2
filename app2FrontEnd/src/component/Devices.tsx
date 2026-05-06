import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Smartphone, Cpu, Edit2, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface Device {
    id: number;
    brand: string;
    model: string;
    imei: string | null;
    serial_number: string | null;
    condition: 'New' | 'Used' | 'Refurbished';
    color: string | null;
    storage_capacity: string | null;
    purchase_price: string;
    suggested_price: string;
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

    const loadDevices = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (condition) params.set('condition', condition);
        apiFetch(`/devices?${params}`)
            .then(r => setDevices(r.data ?? r))
            .catch(() => toast.error('Erreur de chargement'))
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
                    <p className="text-slate-500 text-sm mt-0.5">{devices.length} appareils en stock</p>
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
                                    <th>IMEI / SN</th>
                                    <th>Condition</th>
                                    <th>Prix Achat</th>
                                    <th>Prix Conseillé</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map(d => (
                                    <tr key={d.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                                    <Cpu size={16} className="text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{d.brand} {d.model}</p>
                                                    <p className="text-slate-500 text-xs">{[d.color, d.storage_capacity].filter(Boolean).join(' · ')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="font-mono text-xs text-slate-400">{d.imei || d.serial_number || '—'}</p>
                                        </td>
                                        <td>
                                            <span className={`badge ${CONDITION_BADGE[d.condition]}`}>
                                                {CONDITION_LABELS[d.condition]}
                                            </span>
                                        </td>
                                        <td className="font-semibold text-slate-300">{parseFloat(d.purchase_price).toLocaleString()} MAD</td>
                                        <td className="font-bold text-emerald-400">{parseFloat(d.suggested_price).toLocaleString()} MAD</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button className="btn-secondary !px-2 !py-1.5 text-xs" onClick={() => navigate(`/devices/edit/${d.id}`)}>
                                                    <Edit2 size={13} />
                                                </button>
                                                <button className="btn-danger !px-2 !py-1.5 text-xs" onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}>
                                                    {deletingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
        </div>
    );
}
