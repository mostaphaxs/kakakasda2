import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShoppingCart, CreditCard, Banknote, Landmark, Smartphone, CheckCircle2, Loader2, QrCode, Plus, Minus, X } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Device { id: number; brand: string; model: string; imei: string | null; serial_number: string | null; suggested_price: number | null; purchase_price: number; condition: string; category: string | null; quantity: number; }
interface Customer { id: number; name: string; phone: string | null; }
interface CartItem { device: Device; qty: number; }

export default function POS() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
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

    const price = (d: Device) => Number(d.suggested_price) || Number(d.purchase_price) || 0;
    const total = cart.reduce((sum, item) => sum + price(item.device) * item.qty, 0);
    const cartTotalQty = cart.reduce((s, c) => s + c.qty, 0);

    // Get how many of a grouped product are in the cart
    const getCartQtyForGroup = (group: any): number => {
        return cart.filter(c => group.devices.some((gd: Device) => gd.id === c.device.id))
            .reduce((s, c) => s + c.qty, 0);
    };

    const addGroupToCart = (group: any) => {
        const inCartQty = getCartQtyForGroup(group);
        if (inCartQty >= group.totalStock) return toast.error('Stock insuffisant');
        // Find device record from this group already in cart, or pick first
        const existingCartItem = cart.find(c => group.devices.some((gd: Device) => gd.id === c.device.id));
        if (existingCartItem) {
            setCart(cart.map(c => c.device.id === existingCartItem.device.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { device: group.devices[0], qty: 1 }]);
        }
        toast.success(`1x ${group.model} ajouté`);
    };

    const removeGroupFromCart = (group: any) => {
        const existingCartItem = cart.find(c => group.devices.some((gd: Device) => gd.id === c.device.id));
        if (!existingCartItem) return;
        if (existingCartItem.qty <= 1) {
            setCart(cart.filter(c => c.device.id !== existingCartItem.device.id));
        } else {
            setCart(cart.map(c => c.device.id === existingCartItem.device.id ? { ...c, qty: c.qty - 1 } : c));
        }
    };

    const groupedFilteredDevices = Object.values(devices.filter(d =>
        d.model.toLowerCase().includes(search.toLowerCase()) ||
        d.brand.toLowerCase().includes(search.toLowerCase()) ||
        d.imei?.includes(search)
    ).reduce((acc, d) => {
        const key = `${d.brand}-${d.model}-${d.condition}-${price(d)}`;
        if (!acc[key]) acc[key] = { ...d, totalStock: 0, devices: [] };
        acc[key].totalStock += (Number(d.quantity) || 1);
        acc[key].devices.push(d);
        return acc;
    }, {} as Record<string, any>));

    // Group cart items by brand-model-price for display
    const groupedCart = Object.values(cart.reduce((acc, c) => {
        const key = `${c.device.brand}-${c.device.model}-${price(c.device)}`;
        if (!acc[key]) acc[key] = { ...c.device, quantity: 0, devices: c.device ? [c.device] : [] };
        acc[key].quantity += c.qty;
        if (!acc[key].devices.find((d: Device) => d.id === c.device.id)) acc[key].devices.push(c.device);
        return acc;
    }, {} as Record<string, any>));

    const [selectedSale, setSelectedSale] = useState<any>(null);

    const [lastSaleData, setLastSaleData] = useState<{ items: any[], customerName: string, total: number, paymentMethod: string } | null>(null);

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Le panier est vide');
        setSubmitting(true);
        try {
            const soldItems = [];
            for (const cartItem of cart) {
                // Create one sale per unit in qty
                for (let i = 0; i < cartItem.qty; i++) {
                    const res = await apiFetch('/sales', {
                        method: 'POST',
                        body: JSON.stringify({
                            device_id: cartItem.device.id,
                            customer_id: selectedCustomer?.id || null,
                            sale_price: price(cartItem.device),
                            payment_method: paymentMethod,
                        })
                    });
                    soldItems.push(res.data || res);
                }
            }
            toast.success(`${soldItems.length} vente(s) enregistrée(s) avec succès !`);

            setSelectedSale(soldItems[0]);
            setLastSaleData({
                items: soldItems,
                customerName: selectedCustomer?.name || 'Client de Passage',
                total: total,
                paymentMethod: paymentMethod
            });

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

    const generateReceipt = (items: any[], customerName: string, pMethod: string, totalAmount: number) => {
        const doc = new jsPDF() as any;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(249, 115, 22); // Orange #f97316
        doc.text("TechStock ERP", 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text("Facture de Vente", 105, 28, { align: 'center' });

        doc.line(20, 35, 190, 35);

        // Info
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 20, 45);
        doc.text(`Client: ${customerName}`, 20, 52);
        doc.text(`Paiement: ${pMethod.toUpperCase()}`, 20, 59);

        // Table
        const tableData = items.map(item => [
            `${item.device.brand} ${item.device.model}`,
            item.device.imei || '-',
            '1',
            `${formatMoney(item.sale_price)} MAD`
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Produit', 'IMEI', 'Qté', 'Prix']],
            body: tableData,
            headStyles: { fillColor: [249, 115, 22] },
            foot: [['', '', 'TOTAL', `${formatMoney(totalAmount)} MAD`]],
            footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Merci pour votre confiance. TechStock ERP v1.0", 105, finalY + 10, { align: 'center' });

        doc.save(`Facture_${new Date().getTime()}.pdf`);
    };

    const [scanning, setScanning] = useState(false);
    useEffect(() => {
        let scanner: any = null;
        if (scanning) {
            scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
            scanner.render((decodedText: string) => {
                const found = devices.find(d => d.imei === decodedText);
                if (found) {
                    // Add scanned device to cart using qty system
                    const existing = cart.find(c => c.device.id === found.id);
                    if (existing) {
                        setCart(cart.map(c => c.device.id === found.id ? { ...c, qty: c.qty + 1 } : c));
                    } else {
                        setCart([...cart, { device: found, qty: 1 }]);
                    }
                    toast.success(`${found.model} scanné et ajouté`);
                    scanner.clear();
                    setScanning(false);
                } else {
                    toast.error("Produit non trouvé en stock");
                }
            }, (error: any) => { console.warn(error); });
        }
        return () => {
            if (scanner) {
                scanner.clear().catch((error: any) => console.error("Scanner cleanup failed", error));
            }
        };
    }, [scanning]);

    if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    return (
        <div className="animate-fade-in flex flex-col lg:flex-row gap-6 min-h-screen lg:h-[calc(100vh-120px)]">
            {/* Inventory Side */}
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter">Point de Vente</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Saisie rapide des transactions</p>
                    </div>
                    {devices.length > 0 && (
                        <div className="bg-[#fef2e0] border border-[#ea580c]/10 px-3 py-1 rounded shadow-sm">
                            <p className="text-[9px] text-[#ea580c] font-black uppercase tracking-widest leading-tight text-right">Inventaire</p>
                            <p className="text-base font-black text-[#0f172a] leading-tight text-right">{devices.reduce((s, d) => s + (Number(d.quantity) || 1), 0)} <span className="text-[10px] text-slate-400 font-bold">Unités</span></p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 group-focus-within:text-[#f97316] transition-colors pointer-events-none">
                            <Search size={16} />
                        </div>
                        <input
                            className="input-dark pl-10 py-3 italic"
                            placeholder="Rechercher par modèle, marque ou IMEI..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && search.trim()) {
                                    const exactMatch = devices.find(d => d.imei === search.trim() || d.serial_number === search.trim());
                                    if (exactMatch) {
                                        // Find grouped version to use existing logic
                                        const group = groupedFilteredDevices.find((g: any) => g.brand === exactMatch.brand && g.model === exactMatch.model && (Number(g.suggested_price) || Number(g.purchase_price)) === (Number(exactMatch.suggested_price) || Number(exactMatch.purchase_price)));
                                        if (group) {
                                            addGroupToCart(group);
                                            setSearch('');
                                            toast.success(`${exactMatch.model} ajouté via scanner !`);
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setScanning(!scanning)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${scanning ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20'}`}
                    >
                        <QrCode size={20} />
                    </button>
                </div>

                {scanning && <div id="reader" className="overflow-hidden rounded-xl border border-slate-200"></div>}

                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {groupedFilteredDevices.map(g => {
                        const inCartCount = getCartQtyForGroup(g);
                        const available = g.totalStock - inCartCount;
                        return (
                            <div key={g.id} className={`card p-2 flex items-center gap-3 transition-all ${available > 0 ? 'hover:border-[#f97316]/50 cursor-pointer group' : 'opacity-60 grayscale'}`} onClick={() => available > 0 && addGroupToCart(g)}>
                                <div className="w-8 h-8 rounded bg-[#f97316]/10 flex items-center justify-center flex-shrink-0 text-[#f97316] group-hover:bg-[#f97316] group-hover:text-white transition-all">
                                    <Smartphone size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[#0f172a] font-bold text-xs truncate uppercase italic">{g.brand} {g.model}</p>
                                        <span className="text-[10px] font-black text-[#ea580c] bg-[#fef2e0] px-2 py-0.5 rounded leading-none">Stock: {available}</span>
                                    </div>
                                    <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mt-0.5">{g.condition === 'New' ? 'Produit Neuf' : 'Produit Occasion'}</p>
                                </div>
                                <span className="text-[#0f172a] font-black text-xs flex-shrink-0 w-24 text-right">{formatMoney(price(g))} <small className="text-slate-400">MAD</small></span>
                                <button disabled={available === 0} className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#f97316] group-hover:text-white transition-all flex-shrink-0 disabled:opacity-50">
                                    <Plus size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-full lg:w-[400px] flex flex-col space-y-4">
                <div className="card p-6 flex-1 flex flex-col overflow-hidden border-[#f97316]/10 shadow-sm bg-white">
                    <h2 className="text-sm font-black text-[#0f172a] mb-6 flex items-center gap-2 uppercase tracking-tighter">
                        <ShoppingCart size={18} className="text-[#f97316]" /> Panier ({cartTotalQty})
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                        {groupedCart.map(g => (
                            <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-100 group">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-[#0f172a] leading-tight uppercase italic">{g.brand} {g.model}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter">{formatMoney(price(g))} MAD / unité</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded shadow-sm border border-slate-100 p-1">
                                    <button onClick={() => removeGroupFromCart(g)} className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-400 hover:text-red-500 transition-colors">
                                        <Minus size={12} />
                                    </button>
                                    <span className="text-[11px] font-black text-[#0f172a] w-4 text-center">{g.quantity}</span>
                                    <button onClick={() => addGroupToCart(groupedFilteredDevices.find((x: any) => x.brand === g.brand && x.model === g.model && price(x) === price(g)))} className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-400 hover:text-[#f97316] transition-colors">
                                        <Plus size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Client (Optionnel)</label>
                            <select className="input-dark !py-2 text-xs" onChange={e => { const c = customers.find(x => x.id === parseInt(e.target.value)); setSelectedCustomer(c || null); }} value={selectedCustomer?.id || ''}>
                                <option value="">Client de Passage (Anonyme)</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Paiement</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[{ id: 'cash', icon: Banknote, label: 'Espèces' }, { id: 'card', icon: CreditCard, label: 'Carte' }, { id: 'transfer', icon: Landmark, label: 'Virement' }].map(m => (
                                    <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${paymentMethod === m.id ? 'bg-[#fef2e0] border-[#f97316] text-[#ea580c] font-black shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                                        <m.icon size={14} />
                                        <span className="text-[9px] uppercase">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>Net à Payer</span></div>
                            <div className="flex justify-between items-baseline"><span className="text-lg font-black text-[#0f172a]">{formatMoney(total)}</span><span className="text-[10px] font-bold text-[#f97316]">MAD</span></div>
                        </div>
                        <button onClick={handleCheckout} disabled={submitting || cart.length === 0} className="btn-primary w-full justify-center py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Valider la Vente</>}
                        </button>
                    </div>
                </div>
                <div className="card p-4 border-dashed border-slate-200 flex items-center justify-center gap-3 bg-white">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Auto-génère un ticket PDF à chaque vente validée</span>
                </div>
            </div>

            {/* Success & Receipt Modal */}
            {selectedSale && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="card w-full max-w-2xl bg-white shadow-2xl border-none rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setSelectedSale(null)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 flex sm:hidden items-center justify-center text-slate-500 hover:text-red-500 rounded-2xl transition-all shadow-xl z-[100]"
                        >
                            <X size={24} />
                        </button>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-black text-[#0f172a] flex items-center gap-2 uppercase tracking-tighter">
                                    <CheckCircle2 size={18} className="text-emerald-500" /> Vente Confirmée
                                </h2>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">Transaction réussie</p>
                            </div>
                            <button onClick={() => setSelectedSale(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors hidden sm:block">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-orange-600 rounded-2xl p-6 text-white text-center shadow-xl shadow-orange-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <FileText size={80} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Montant Total</p>
                                <p className="text-4xl font-black italic">{formatMoney(lastSaleData?.total || 0)} <span className="text-sm font-bold">MAD</span></p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-black uppercase tracking-widest">Client</span>
                                    <span className="font-black text-[#0f172a] italic">{lastSaleData?.customerName || 'Client de Passage'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-black uppercase tracking-widest">Mode de Paiement</span>
                                    <span className="font-black text-blue-500 italic uppercase">
                                        {lastSaleData?.paymentMethod === 'cash' ? 'Espèces' : lastSaleData?.paymentMethod === 'card' ? 'Carte' : 'Virement'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setSelectedSale(null)} className="btn-secondary flex-1 font-bold">Fermer</button>
                            <button
                                onClick={() => {
                                    if (lastSaleData) {
                                        generateReceipt(lastSaleData.items, lastSaleData.customerName, lastSaleData.paymentMethod, lastSaleData.total);
                                    }
                                    setSelectedSale(null);
                                }}
                                className="btn-primary flex-1 justify-center italic font-black uppercase tracking-wider"
                            >
                                <FileText size={16} /> Imprimer Reçu
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}
        </div>
    );
}

// Helper icons
import { FileText } from 'lucide-react';
