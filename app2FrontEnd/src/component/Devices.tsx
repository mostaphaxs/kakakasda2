import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Smartphone, Cpu, Edit2, Trash2, Loader2, Eye, X, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
    const [showingQR, setShowingQR] = useState<Device | null>(null);

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
                <div className="flex gap-2">
                    <button
                        className="btn-secondary !bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20 hover:!bg-emerald-500 hover:!text-white"
                        onClick={() => {
                            if (devices.length === 0) return toast.error('Rien à imprimer');
                            window.print();
                        }}
                    >
                        <QrCode size={16} /> Imprimer Tous les QR ({devices.length})
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/devices/add')}>
                        <Plus size={16} /> Nouveau Produit
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                        <Search size={14} />
                    </div>
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Rechercher par IMEI, modèle, marque..."
                        className="input-dark pl-10 h-10 italic"
                    />
                </div>
                <div className="relative w-full sm:w-48 group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                        <Filter size={14} />
                    </div>
                    <select className="input-dark pl-10 h-10 font-bold" value={condition} onChange={e => setCondition(e.target.value)}>
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
                                            <td data-label="Appareil">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded bg-[#f97316]/10 flex items-center justify-center flex-shrink-0 text-[#f97316]">
                                                        <Cpu size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[#0f172a] font-black text-xs uppercase italic">{d.brand} {d.model}</p>
                                                            <span className="badge bg-[#fef2e0] text-[#ea580c] text-[9px] py-1 border-[#ea580c]/10 px-2 font-black tracking-tighter">Qty: {d.quantity || 1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">{[d.color, d.storage_capacity].filter(Boolean).join(' · ')}</p>
                                                            {d.technical_specs?.ram && <span className="text-indigo-500 text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 rounded border border-indigo-100 uppercase">{d.technical_specs.ram}</span>}
                                                            {d.technical_specs?.batterie && <span className="text-emerald-500 text-[8px] font-black px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase">{d.technical_specs.batterie}</span>}
                                                            {d.supplier && <span className="text-slate-500 text-[9px] font-black px-1.5 py-0.5 bg-slate-50 rounded-md border border-slate-100">{d.supplier.name}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Catégorie">
                                                <span className="badge badge-blue uppercase italic font-black text-[9px]">{d.category || 'Smartphone'}</span>
                                            </td>
                                            <td data-label="IMEI/SN">
                                                <p className="font-mono text-xs text-slate-400">{d.imei || d.serial_number || '—'}</p>
                                            </td>
                                            <td data-label="État">
                                                <span className={`badge ${CONDITION_BADGE[d.condition]}`}>
                                                    {CONDITION_LABELS[d.condition]}
                                                </span>
                                            </td>
                                            <td data-label="P.A" className="font-semibold text-slate-300">{formatMoney(d.purchase_price)} MAD</td>
                                            <td data-label="P.V" className="font-bold text-emerald-400">{formatMoney(d.suggested_price)} MAD</td>
                                            <td data-label="Actions" className="text-right">
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

            {/* Device Details Drawer */}
            {selectedDevice && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDevice(null)}>
                    <div className="w-full max-w-2xl bg-white h-full shadow-[auto_-4px_24px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300 flex flex-col relative" onClick={e => e.stopPropagation()}>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setSelectedDevice(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 shadow-sm relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f97316]/20 to-[#f97316]/5 flex items-center justify-center text-[#f97316] shadow-inner border border-[#f97316]/20">
                                    <Smartphone size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-black text-[#0f172a] uppercase tracking-tighter italic leading-none">{selectedDevice.brand} {selectedDevice.model}</h2>
                                    <span className={`badge ${CONDITION_BADGE[selectedDevice.condition]} text-[9px] uppercase italic font-black shadow-sm`}>{CONDITION_LABELS[selectedDevice.condition]}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const device = selectedDevice;
                                        setSelectedDevice(null);
                                        navigate(`/devices/edit/${device.id}`);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Edit2 size={12} /> Modifier
                                </button>
                                <button
                                    onClick={() => setShowingQR(selectedDevice)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <QrCode size={12} /> Étiquette QR
                                </button>
                                <button onClick={() => setSelectedDevice(null)} className="w-8 h-8 bg-slate-50 border border-slate-100 hidden sm:flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-24">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 relative overflow-hidden group hover:border-[#f97316]/30 transition-colors">
                                    <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-900 group-hover:scale-110 transition-transform"><Cpu size={60} /></div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Stockage</label>
                                    <p className="text-xl text-[#0f172a] font-black italic">{selectedDevice.storage_capacity || '—'}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-[#fef2e0] border border-[#ea580c]/10 space-y-2 relative overflow-hidden group">
                                    <div className="absolute -right-4 -bottom-4 opacity-10 text-[#ea580c] group-hover:scale-110 transition-transform"><Smartphone size={60} /></div>
                                    <label className="text-[9px] font-black text-[#ea580c]/60 uppercase tracking-widest leading-none block">Stock Actuel</label>
                                    <p className="text-xl text-[#ea580c] font-black italic">{selectedDevice.quantity || 1} <span className="text-xs">UNITÉS</span></p>
                                </div>
                            </div>

                            {/* Info Lines */}
                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IMEI / SN</label>
                                    <p className="text-sm font-mono text-[#0f172a] font-bold bg-slate-100 px-2 py-0.5 rounded">{selectedDevice.imei || selectedDevice.serial_number || 'Aucun'}</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catégorie</label>
                                    <p className="text-xs text-[#0f172a] font-black uppercase italic">{selectedDevice.category || 'Smartphone'}</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Couleur</label>
                                    <p className="text-xs text-[#0f172a] font-bold flex items-center gap-2">
                                        {selectedDevice.color ? (
                                            <><span className="w-3 h-3 rounded-full shadow-sm border border-slate-200 block" style={{ backgroundColor: selectedDevice.color.toLowerCase().replace(' ', '') }}></span> {selectedDevice.color}</>
                                        ) : '—'}
                                    </p>
                                </div>
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fournisseur</label>
                                    <p className="text-xs text-emerald-600 font-black italic">{selectedDevice.supplier?.name || 'Inconnu'}</p>
                                </div>
                            </div>

                            {/* Tech Specs */}
                            {selectedDevice.technical_specs && typeof selectedDevice.technical_specs === 'object' && Object.keys(selectedDevice.technical_specs).length > 0 && (
                                <div className="space-y-4 pt-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                        Fiche Technique
                                        <div className="w-6 h-px bg-slate-200 flex-1"></div>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(selectedDevice.technical_specs).map(([key, val]) => (
                                            <div key={key} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">{key.replace('_', ' ')}</span>
                                                <span className="block text-xs text-[#0f172a] font-black italic truncate">{String(val) || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedDevice.notes && (
                                <div className="space-y-2 pt-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes & État</label>
                                    <div className="bg-yellow-50/50 border border-yellow-100 p-4 rounded-xl relative">
                                        <div className="absolute top-4 right-4 w-6 h-6 bg-yellow-100 rounded-full opacity-50"></div>
                                        <p className="text-xs text-yellow-800 italic font-medium leading-relaxed relative z-10">"{selectedDevice.notes}"</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Totals */}
                        <div className="p-6 border-t border-slate-100 bg-[#0f172a] text-white shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Prix d'achat (P.A)</span>
                                <span className="text-white font-mono text-sm">{formatMoney(selectedDevice.purchase_price)} MAD</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[#f97316] font-black uppercase tracking-widest text-[11px] italic">Prix Conseillé</span>
                                <span className="text-[#f97316] font-black italic text-2xl uppercase tracking-tighter leading-none">{formatMoney(selectedDevice.suggested_price)} <small className="text-xs font-bold">MAD</small></span>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
            {/* QR CODE MODAL FOR PRINTING LABELS */}
            {showingQR && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300 border-none">
                        <button onClick={() => setShowingQR(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>

                        <div className="text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-tighter">Étiquette de Stock</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Génération d'identification QR</p>
                            </div>

                            <div id="printable-qr" className="bg-white p-6 rounded-2xl border-2 border-slate-100 inline-block shadow-inner mx-auto">
                                <QRCodeSVG
                                    value={showingQR.imei || `DEVICE_${showingQR.id}`}
                                    size={180}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="space-y-1">
                                <p className="text-xl font-black text-[#0f172a] uppercase italic">{showingQR.brand} {showingQR.model}</p>
                                <p className="text-xs font-mono font-bold text-slate-500 bg-slate-50 py-1 px-3 rounded-full inline-block border border-slate-100">
                                    IMEI: {showingQR.imei || 'REF-' + showingQR.id}
                                </p>
                            </div>

                            <div className="pt-6 flex gap-2">
                                <button onClick={() => setShowingQR(null)} className="btn-secondary flex-1 font-bold">Fermer</button>
                                <button
                                    onClick={() => window.print()}
                                    className="btn-primary flex-1 justify-center italic font-black uppercase tracking-wider"
                                >
                                    Imprimer Étiquette
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium italic mt-4">* Utilisez cette étiquette sur vos produits pour les scanner instantanément au POS.</p>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* BATCH QR PRINTING SECTION (HIDDEN ON SCREEN) */}
            <div id="batch-print-container" className="hidden">
                <div className="grid grid-cols-4 gap-4 p-4">
                    {devices.map(d => (
                        <div key={d.id} className="border border-slate-200 p-4 rounded text-center break-inside-avoid">
                            <div className="mb-2">
                                <QRCodeSVG value={d.imei || `DEVICE_${d.id}`} size={100} />
                            </div>
                            <p className="text-[10px] font-black uppercase text-black truncate">{d.brand} {d.model}</p>
                            <p className="text-[8px] font-mono text-slate-500">{d.imei || 'REF-' + d.id}</p>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    
                    /* Single QR Print Mode (Modal open) */
                    #printable-qr, #printable-qr * { visibility: visible !important; }
                    #printable-qr { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(2); }

                    /* Batch QR Print Mode (Modal closed) */
                    ${!showingQR ? `
                        #batch-print-container, #batch-print-container * { visibility: visible !important; }
                        #batch-print-container { 
                            display: block !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        #batch-print-container .grid {
                            display: grid !important;
                            grid-template-columns: repeat(4, 1fr) !important;
                        }
                    ` : ''}
                }
            `}</style>
        </div>
    );
}
