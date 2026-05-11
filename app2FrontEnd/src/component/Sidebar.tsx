import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Cpu, LayoutDashboard, Smartphone, Users, ShoppingCart, BarChart2, LogOut, Settings, ChevronRight, History, Truck, Package, Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';
import VoiceAssistant from './VoiceAssistant';

const nav = [
    { section: 'Principal' },
    { label: 'Tableau de bord', icon: LayoutDashboard, to: '/dashboard' },
    { section: 'Inventaire' },
    { label: 'Stock Appareils (IMEI)', icon: Smartphone, to: '/devices' },
    { label: 'Catalogue Accessoires', icon: Package, to: '/articles' },
    { label: 'Fournisseurs', icon: Truck, to: '/suppliers' },
    { section: 'Commerce' },
    { label: 'Point de Vente', icon: ShoppingCart, to: '/sales/pos' },
    { label: 'Historique Transactions', icon: History, to: '/sales' },
    { label: 'Clients', icon: Users, to: '/customers' },
    { section: 'Analyse' },
    { label: 'Rapports', icon: BarChart2, to: '/reports' },
    { label: 'Charges & Dépenses', icon: Wallet, to: '/expenses' },
    { label: 'Paramètres', icon: Settings, to: '/settings' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const navigate = useNavigate();
    const [aiEnabled, setAiEnabled] = useState(localStorage.getItem('ai_enabled') === 'true');

    useEffect(() => {
        const handleStorage = () => setAiEnabled(localStorage.getItem('ai_enabled') === 'true');
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        toast.success('Déconnecté');
        navigate('/login');
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && <div className="fixed inset-0 bg-black/60 z-[190] lg:hidden" onClick={onClose} />}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div className="px-5 py-4 border-b border-slate-100 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 lg:hidden border border-slate-100 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                        <X size={18} />
                    </button>
                    <div className="text-center py-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#f97316] shadow-lg shadow-[#f97316]/20 mb-2">
                            <Cpu size={20} className="text-white" />
                        </div>
                        <h1 className="text-lg font-black text-[#0f172a] tracking-tighter uppercase italic">TechStock <span className="text-[#f97316]">ERP</span></h1>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em]">Professional Solution</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {aiEnabled && (
                        <div className="px-2">
                            <VoiceAssistant />
                        </div>
                    )}
                    {nav.map((item, i) =>
                        'section' in item ? (
                            <p key={i} className="nav-section">{item.section}</p>
                        ) : (
                            <NavLink
                                key={i}
                                to={item.to!}
                                end
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                            >
                                <item.icon size={17} />
                                <span className="flex-1">{item.label}</span>
                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                            </NavLink>
                        )
                    )}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-slate-100">
                    <button onClick={logout} className="nav-item w-full text-red-500/80 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={16} />
                        <span className="font-black text-[10px] uppercase tracking-widest italic">Déconnexion</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
