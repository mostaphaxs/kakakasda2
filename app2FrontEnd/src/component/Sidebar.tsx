import { NavLink, useNavigate } from 'react-router-dom';
import { Cpu, LayoutDashboard, Smartphone, Users, ShoppingCart, BarChart2, LogOut, Settings, ChevronRight, History, Truck, Package } from 'lucide-react';
import toast from 'react-hot-toast';

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
    { label: 'Paramètres', icon: Settings, to: '/settings' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const navigate = useNavigate();

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
                <div className="px-5 py-6 border-b border-white/[0.05]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Cpu size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-none">TechStock</p>
                            <p className="text-indigo-400/70 text-[10px] font-medium mt-0.5">ERP v1.0</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
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
                <div className="px-3 py-4 border-t border-white/[0.05]">
                    <button onClick={logout} className="nav-item w-full text-red-400/80 hover:text-red-400 hover:bg-red-500/10">
                        <LogOut size={16} />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
