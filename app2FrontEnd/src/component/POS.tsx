import { useState, useEffect } from 'react';
import { Search, ShoppingCart, CreditCard, Banknote, Landmark, Smartphone, Trash2, CheckCircle2, Loader2, QrCode, Plus, Minus } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import toast from 'react-hot-toast';

interface Device { id: number; brand: string; model: string; imei: string | null; suggested_price: number | null; purchase_price: number; condition: string; category: string | null; }
interface Customer { id: number; name: string; phone: string | null; }

export default function POS() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<Device[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        Promise.all([
            apiFetch('/devices?status=unsold'),
            apiFetch('/customers')
        ]).then(([d, c]) => {
            setDevices((d.data || d).filter((x: any) => !x.sold_at));
            setCustomers(c.data || c);
        }).finally(() => setLoading(false));
    }, []);

    const addToCart = (d: Device) => {
        if (cart.find(item => item.id === d.id)) return toast.error('Déjà dans le panier');
        setCart([...cart, d]);
        toast.success(`${d.model} ajouté`);
    };

    const removeFromCart = (id: number) => setCart(cart.filter(c => c.id !== id));

    const price = (d: Device) => Number(d.suggested_price) || Number(d.purchase_price) || 0;
    const total = cart.reduce((sum, item) => sum + price(item), 0);

    const addGroupToCart = (group: any) => {
        const available = group.devices.find((d: Device) => !cart.some(c => c.id === d.id));
        if (!available) return toast.error('Stock insuffisant pour ce modèle exact');
        setCart([...cart, available]);
        toast.success(`1x ${group.model} ajouté`);
    };

    const removeGroupFromCart = (group: any) => {
        const toRemove = group.devices[group.devices.length - 1];
        if (toRemove) setCart(cart.filter(c => c.id !== toRemove.id));
    };

    const groupedFilteredDevices = Object.values(devices.filter(d =>
        d.model.toLowerCase().includes(search.toLowerCase()) ||
        d.brand.toLowerCase().includes(search.toLowerCase()) ||
        d.imei?.includes(search)
    ).reduce((acc, d) => {
        const key = `${d.brand}-${d.model}-${d.condition}-${price(d)}`;
        if (!acc[key]) acc[key] = { ...d, totalStock: 0, devices: [] };
        acc[key].totalStock++;
        acc[key].devices.push(d);
        return acc;
    }, {} as Record<string, any>));

    const groupedCart = Object.values(cart.reduce((acc, d) => {
        const key = `${d.brand}-${d.model}-${price(d)}`;
        if (!acc[key]) acc[key] = { ...d, quantity: 0, devices: [] };
        acc[key].quantity++;
        acc[key].devices.push(d);
        return acc;
    }, {} as Record<string, any>));

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Le panier est vide');
        setSubmitting(true);
        try {
            for (const item of cart) {
                await apiFetch('/sales', {
                    method: 'POST',
                    body: JSON.stringify({
                        device_id: item.id,
                        customer_id: selectedCustomer?.id || null,
                        sale_price: price(item),
                        payment_method: paymentMethod,
                    })
                });
            }
            toast.success('Vente(s) enregistrée(s) avec succès !');
            setCart([]);
            setSelectedCustomer(null);
            const d = await apiFetch('/devices?status=unsold');
            setDevices((d.data || d).filter((x: any) => !x.sold_at));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
            {/* Inventory Side */}
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white decoration-indigo-500/50 underline-offset-8 underline">Point de Vente</h1>
                        <p className="text-slate-500 text-sm mt-1">Sélectionnez les produits à vendre</p>
                    </div>
                    {devices.length > 0 && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-right">
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-tight">En Stock</p>
                            <p className="text-lg font-black text-white leading-tight">{devices.length} <span className="text-xs text-slate-500 font-medium">Appareils</span></p>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        className="input-dark pl-10 py-3"
                        placeholder="Rechercher par modèle, marque ou IMEI..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* ── Horizontal Product List ── */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {groupedFilteredDevices.map(g => {
                        const inCartCount = cart.filter(c => g.devices.some((gd: Device) => gd.id === c.id)).length;
                        const available = g.totalStock - inCartCount;

                        return (
                            <div key={g.id} className={`card p-3 flex items-center gap-4 transition-all ${available > 0 ? 'hover:border-indigo-500/40 cursor-pointer group' : 'opacity-60 grayscale'}`} onClick={() => available > 0 && addGroupToCart(g)}>
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <Smartphone size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-bold text-sm truncate">{g.brand} {g.model}</p>
                                        <span className="badge badge-indigo text-[9px] py-0 flex-shrink-0">Stock: {available}/{g.totalStock}</span>
                                    </div>
                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest truncate mt-0.5">{g.condition === 'New' ? 'Neuf' : g.condition === 'Refurbished' ? 'Reconditionné' : 'Occasion'}</p>
                                </div>
                                <span className="text-indigo-400 font-black text-sm flex-shrink-0 w-24 text-right">{formatMoney(price(g))} <small className="text-slate-500">MAD</small></span>
                                <button disabled={available === 0} className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all flex-shrink-0 disabled:opacity-50">
                                    <Plus size={16} />
                                </button>
                            </div>
                        );
                    })}
                    {groupedFilteredDevices.length === 0 && (
                        <div className="py-20 text-center text-slate-600">
                            <Smartphone size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Aucun appareil disponible</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Side */}
            <div className="w-full lg:w-[400px] flex flex-col space-y-4">
                <div className="card p-6 flex-1 flex flex-col overflow-hidden border-indigo-500/20 bg-indigo-500/[0.02]">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <ShoppingCart size={20} className="text-indigo-400" /> Panier ({cart.length})
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                        {groupedCart.map(g => (
                            <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/05 border border-white/05 group">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white leading-tight">{g.brand} {g.model}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">{formatMoney(price(g))} MAD / unité</p>
                                </div>
                                <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                                    <button onClick={() => removeGroupFromCart(g)} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/05 text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors">
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-xs font-bold text-white w-4 text-center">{g.quantity}</span>
                                    <button onClick={() => addGroupToCart(groupedFilteredDevices.find((x: any) => x.brand === g.brand && x.model === g.model && price(x) === price(g)))} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/05 text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-colors">
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="py-12 text-center text-slate-600">
                                <p className="text-sm italic">Le panier est encore vide</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/05">
                        {/* Customer Select */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Client (Optionnel)</label>
                            <select
                                className="input-dark !py-2 text-xs"
                                onChange={e => {
                                    const c = customers.find(x => x.id === parseInt(e.target.value));
                                    setSelectedCustomer(c || null);
                                }}
                                value={selectedCustomer?.id || ''}
                            >
                                <option value="">Client de Passage (Anonyme)</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Mode de Paiement</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'cash', icon: Banknote, label: 'Espèces' },
                                    { id: 'card', icon: CreditCard, label: 'Carte' },
                                    { id: 'transfer', icon: Landmark, label: 'Virement' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPaymentMethod(m.id as any)}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${paymentMethod === m.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/03 border-white/05 text-slate-500 hover:bg-white/05'
                                            }`}
                                    >
                                        <m.icon size={16} />
                                        <span className="text-[10px] font-bold uppercase">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                            <div className="flex justify-between text-xs text-indigo-300 font-bold uppercase tracking-wide">
                                <span>Total</span>
                                <span>{formatMoney(total)} MAD</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={submitting || cart.length === 0}
                            className="btn-primary w-full justify-center py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Valider la Vente</>}
                        </button>
                    </div>
                </div>
                <div className="card p-4 border-dashed border-white/10 flex items-center justify-center gap-3 grayscale opacity-50 cursor-not-allowed">
                    <QrCode size={18} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scan IMEI (Bientôt)</span>
                </div>
            </div>
        </div>
    );
}
