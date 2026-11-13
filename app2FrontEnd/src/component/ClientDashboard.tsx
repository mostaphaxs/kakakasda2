import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Wallet, Download, LogOut,
    Camera, CheckCircle2, AlertCircle, FileText,
    ArrowUpRight, Building, FileSignature
} from 'lucide-react';
import { formatNumber, parseDate } from '../lib/utils';
import { STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { clientPaid, clientPrice } from '../lib/clientBalance';

const ClientDashboard = () => {
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('clientUser');
        if (!stored) {
            navigate('/portal/login');
            return;
        }
        setClient(JSON.parse(stored));
    }, [navigate]);

    if (!client) return null;

    const handleLogout = () => {
        localStorage.removeItem('clientUser');
        navigate('/portal/login');
    };

    const mainBien = client.biens?.[0]; // Usually clients have one main bien
    // same rule as the admin side and the server
    const totalPrix = clientPrice(client);
    const totalPaid = clientPaid(client);
    const balance = Math.max(0, totalPrix - totalPaid);
    const progressPercent = totalPrix > 0 ? Math.min(100, Math.round((totalPaid / totalPrix) * 100)) : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar (Client Version) */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white font-semibold">5É</div>
                    <span className="font-semibold text-slate-800 tracking-tight text-sm">Acquéreur</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-700 rounded-lg font-semibold text-sm">
                        <LayoutDashboard size={18} />
                        Tableau de bord
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="p-4 bg-slate-50 rounded-xl mb-4">
                        <p className="text-xs font-medium text-slate-400 mb-1">Connecté en tant que</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{client.nom} {client.prenom}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg font-semibold text-sm transition"
                    >
                        <LogOut size={18} />
                        Se déconnecter
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-10 space-y-8 overflow-y-auto max-h-screen custom-scrollbar-white">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bonjour, {client.prenom} 👋</h1>
                        <p className="text-slate-400 font-medium mt-1">Heureux de vous revoir dans votre espace personnel.</p>
                    </div>
                    {mainBien && (
                        <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="hidden">
                                <Building size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-400 leading-none mb-1">Votre Bien</p>
                                <p className="text-sm font-semibold text-slate-800">{mainBien.type_bien} #{mainBien.num_appartement}</p>
                                <p className="text-xs font-medium text-slate-400">{mainBien.terrain?.nom_projet}</p>
                            </div>
                        </div>
                    )}
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="hidden"><Wallet size={24} /></div>
                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-600/20">Payé</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatNumber(totalPaid)} <span className="text-sm text-slate-400">DH</span></p>
                            <p className="text-xs font-medium text-slate-400 mt-1">Sur un total de {formatNumber(totalPrix)} DH</p>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition duration-1000" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-xl shadow-sm space-y-4 text-white">
                        <div className="flex items-center justify-between">
                            <div className="hidden"><AlertCircle size={24} /></div>
                            <span className="text-xs font-semibold text-white/50">Solde Restant</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight">{formatNumber(balance)} <span className="text-sm text-white/40">DH</span></p>
                            <p className="text-xs font-medium text-white/40 mt-1">À régler selon votre échéancier</p>
                        </div>
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2">
                            Consulter mes échéances
                            <ArrowUpRight size={14} />
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="hidden"><CheckCircle2 size={24} /></div>
                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">Chantier</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">Gros Œuvre</p>
                            <p className="text-xs font-medium text-slate-400 mt-1">Phase actuelle de construction</p>
                        </div>
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-semibold text-slate-400">P{i}</div>)}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[8px] font-semibold text-white shadow-sm">+</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Progress History */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Camera size={18} className="text-amber-500" />
                                Avancement en images
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="group relative aspect-video bg-slate-200 rounded-xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer active:scale-[0.98] transition">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                        <p className="text-xs font-medium text-white">Avril 2024 - Dalle 1er étage</p>
                                    </div>
                                    <img src={`https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=400&index=${i}`} alt="progress" className="w-full h-full object-cover transition-transform duration-700" />
                                </div>
                            ))}
                            <div className="col-span-2 p-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                                <p className="text-xs font-medium text-slate-400">De nouvelles photos seront publiées bientôt...</p>
                            </div>
                        </div>
                    </section>

                    {/* Documents */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <FileSignature size={18} className="text-blue-500" />
                                Mes Documents
                            </h3>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="divide-y divide-slate-50">
                                {client.scanned_docs?.map((doc: any, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${doc.path}`))}
                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="hidden">
                                                <FileText size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-semibold text-slate-700">{doc.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">Ajouté le {parseDate(doc.created_at).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                        </div>
                                        <div className="p-2 text-slate-300 group-hover:text-blue-500">
                                            <Download size={18} />
                                        </div>
                                    </button>
                                ))}
                                {(!client.scanned_docs || client.scanned_docs.length === 0) && (
                                    <div className="p-10 text-center space-y-2">
                                        <p className="text-xs font-medium text-slate-300">Aucun document partagé pour le moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Payments */}
                        <div className="flex items-center justify-between px-2 pt-4">
                            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Wallet size={18} className="text-emerald-500" />
                                Derniers Paiements
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {client.payments?.slice(0, 3).map((p: any, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold text-xs">
                                            {parseDate(p.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-700">{formatNumber(p.amount)} DH</p>
                                            <p className="text-xs text-slate-400">{p.method} • {p.type}</p>
                                        </div>
                                    </div>
                                    <div className="hidden">
                                        <CheckCircle2 size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ClientDashboard;
