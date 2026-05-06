import { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, CreditCard, Banknote, Landmark, Smartphone, Trash2, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface Device { id: number; brand: string; model: string; imei: string | null; suggested_price: number; purchase_price: number; condition: string; }
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
            apiFetch('/devices?status=unsold'), // On suppose que le backend filtre ou on filtre ici
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

    const total = cart.reduce((sum, item) => sum + (item.suggested_price || 0), 0);

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
                        sale_price: item.suggested_price,
                        payment_method: paymentMethod,
                    })
                });
            }
            toast.success('Vente(s) enregistrée(s) avec succès !');
            setCart([]);
            setSelectedCustomer(null);
            // Refresh unsold devices
            const d = await apiFetch('/devices?status=unsold');
            setDevices((d.data || d).filter((x: any) => !x.sold_at));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDevices = devices.filter(d =>
        d.model.toLowerCase().includes(search.toLowerCase()) ||
        d.brand.toLowerCase().includes(search.toLowerCase()) ||
        d.imei?.includes(search)
    );

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
            {/* Inventory Side */}
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white decoration-indigo-500/50 underline-offset-8 underline">Ventes / POS</h1>
                        <p className="text-slate-500 text-sm mt-1">Sélectionnez les produits à vendre</p>
                    </div>
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

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDevices.map(d => (
                        <div key={d.id} className="card p-4 flex flex-col justify-between hover:border-indigo-500/40 cursor-pointer group" onClick={() => addToCart(d)}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className="badge badge-blue">{d.brand}</span>
                                    <span className={`badge ${d.condition === 'New' ? 'badge-green' : 'badge-yellow'}`}>{d.condition}</span>
                                </div>
                                <h3 className="text-white font-bold mt-2">{d.model}</h3>
                                <p className="text-slate-500 text-xs font-mono mt-1">{d.imei || d.id}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-indigo-400 font-black text-lg">{(d.suggested_price || 0).toLocaleString()} <small>MAD</small></span>
                                <button className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <ShoppingCart size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredDevices.length === 0 && (
                        <div className="col-span-2 py-20 text-center text-slate-600">
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
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/05 border border-white/05 group">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white leading-tight">{item.brand} {item.model}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">{item.suggested_price.toLocaleString()} MAD</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="p-2 text-slate-500 hover:text-red-400 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
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
                                    { id: 'cash', icon: Banknote, label: 'Email' },
                                    { id: 'card', icon: CreditCard, label: 'Carte' },
                                    { id: 'transfer', icon: Landmark, label: 'Vir.' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPaymentMethod(m.id as any)}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${paymentMethod === m.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/03 border-white/05 text-slate-500 hover:bg-white/05'
                                            }`}
                                    >
                                        <m.icon size={16} />
                                        <span className="text-[10px] font-bold uppercase">{m.id === 'cash' ? 'Especes' : m.id === 'card' ? 'Carte' : 'Vire.'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                            <div className="flex justify-between text-xs text-indigo-300 font-bold uppercase tracking-wide">
                                <span>Total</span>
                                <span>{total.toLocaleString()} MAD</span>
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
