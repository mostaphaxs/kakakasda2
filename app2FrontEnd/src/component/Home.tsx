import { useNavigate } from 'react-router-dom';
import {
    Users,
    Layers,
    ShieldCheck,
    MapPin,
    Building2,
    ArrowRight,
    TrendingUp
} from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();

    const modules = [
        {
            title: "Gestion Clients",
            description: "Gérez vos dossiers clients, réservations et suivis de paiements.",
            icon: <Users className="text-slate-900" size={24} />,
            path: "/clients",
            color: "slate"
        },
        {
            title: "Projets",
            description: "Suivez l'état actuel et l'évolution de vos projets.",
            icon: <MapPin className="text-slate-900" size={24} />,
            path: "/terrains",
            color: "slate"
        },
        {
            title: "Inventaire des Biens",
            description: "Vue d'ensemble sur les blocs, locaux et bureaux.",
            icon: <Building2 className="text-slate-900" size={24} />,
            path: "/properties",
            color: "slate"
        }
    ];

    return (
        <div className="space-y-12 pb-12 animate-in fade-in duration-700">
            {/* Hero Section */}
            <div className="relative h-[500px] w-full rounded-[40px] overflow-hidden shadow-2xl group">
                <img
                    src="/assets/hero.png"
                    alt="Société les cinq elements"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent flex items-center p-12 md:p-20">
                    <div className="max-w-2xl space-y-6">

                        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
                            Bienvenue chez <br />
                            <span className="text-amber-500 drop-shadow-lg">les cinq elements</span>
                        </h1>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => navigate('/clients')}
                                className="px-8 py-4 bg-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-amber-700 transition-all hover:translate-y-[-2px] shadow-lg shadow-amber-900/20"
                            >
                                Commencer
                                <ArrowRight size={18} />
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Projets Actifs", value: "12+", icon: <Layers size={20} />, color: "slate" },
                    { label: "Clients Satisfaits", value: "450+", icon: <Users size={20} />, color: "slate" },
                    { label: "Unités Livrées", value: "890+", icon: <Building2 size={20} />, color: "slate" },
                    { label: "Croissance", value: "+22%", icon: <TrendingUp size={20} />, color: "slate" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                        <div className={`p-4 bg-slate-50 text-slate-900 rounded-2xl`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
