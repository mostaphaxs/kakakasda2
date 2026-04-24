// src/component/Workers.tsx
import React, { useState, useEffect } from 'react';
import {
    Plus, Loader2, Trash2, Edit2, X, User, Phone, FileText,
    Calendar, Search, Download, Briefcase, Ruler, Maximize,
    Clock, CheckCircle2, Banknote, Eye, Info,
    ChevronRight, TrendingUp, UserCheck, PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';

interface WorkerMission {
    id: number;
    ouvrier_id: number;
    terrain_id: number | null;
    type: 'journalier' | 'periode' | 'm2' | 'ml' | 'forfait';
    start_date: string;
    end_date: string | null;
    quantity: number;
    unit_price: number;
    total_amount: number;
    description: string | null;
    status: 'pending' | 'completed';
    terrain?: { nom_projet: string; nom_terrain: string };
    created_at: string;
}

interface WorkerPayment {
    id: number;
    amount: number;
    payment_date: string;
    method: string;
    reference_no: string | null;
    bank_name: string | null;
    bank_commission: number;
    notes: string | null;
}

interface Worker {
    id: number;
    name: string;
    cin: string | null;
    speciality: string;
    phone: string | null;
    scan_cin: string | null;
    total_earned: number;
    paid_amount: number;
    rib: string | null;
    missions: WorkerMission[];
    payments: WorkerPayment[];
}

const Workers = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSpeciality, setFilterSpeciality] = useState('all');

    // Modals
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'missions' | 'payments'>('missions');

    // Selected Data
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [workerForm, setWorkerForm] = useState({
        name: '',
        cin: '',
        speciality: 'Maçon',
        phone: '',
        rib: '',
    });
    const [scanFile, setScanFile] = useState<File | null>(null);

    const [missionForm, setMissionForm] = useState({
        terrain_id: '',
        type: 'journalier' as 'journalier' | 'periode' | 'm2' | 'ml' | 'forfait',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        quantity: '1',
        unit_price: '',
        description: '',
    });

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        method: 'Espèces',
        reference_no: '',
        bank_name: '',
        bank_commission: '0',
        notes: '',
    });

    const SPECIALITIES = [
        "Maçon", "Peintre", "Electricien", "Plombier", "Menuisier",
        "Ferrailleur", "Coffreur", "Carreleur", "Staffeur", "Autre"
    ];

    const MISSION_TYPES = [
        { value: 'journalier', label: 'Journée simple', icon: <Clock size={16} />, desc: 'Travail ponctuel (1 jour)' },
        { value: 'periode', label: 'Période (Multijours)', icon: <Calendar size={16} />, desc: 'Contrat sur une durée' },
        { value: 'm2', label: 'Mètre Carré (m²)', icon: <Maximize size={16} />, desc: 'Paiement à la surface' },
        { value: 'ml', label: 'Mètre Linéaire (ml)', icon: <Ruler size={16} />, desc: 'Paiement à la longueur' },
        { value: 'forfait', label: 'Forfait (Montant Global)', icon: <Briefcase size={16} />, desc: 'Montant fixe pour la tâche' },
    ];

    const fetchWorkers = async () => {
        try {
            const data = await apiFetch<Worker[]>('/ouvriers');
            setWorkers(data);
            if (selectedWorker) {
                const updated = data.find(w => w.id === selectedWorker.id);
                if (updated) setSelectedWorker(updated);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des ouvriers');
        } finally {
            setLoading(false);
        }
    };

    const fetchTerrains = async () => {
        try {
            const data = await apiFetch<any[]>('/terrains');
            setTerrains(data);
        } catch (err: any) {
            console.error('Error fetching terrains:', err);
        }
    };

    useEffect(() => {
        fetchWorkers();
        fetchTerrains();
    }, []);

    // Auto-calculate quantity for period missions
    useEffect(() => {
        if (missionForm.type === 'periode' && missionForm.start_date && missionForm.end_date) {
            const start = new Date(missionForm.start_date);
            const end = new Date(missionForm.end_date);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 0) {
                setMissionForm(prev => ({ ...prev, quantity: diffDays.toString() }));
            }
        }
    }, [missionForm.start_date, missionForm.end_date, missionForm.type]);

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            Object.entries(workerForm).forEach(([key, value]) => {
                data.append(key, String(value));
            });
            if (scanFile) {
                data.append('scan_cin', scanFile);
            }

            if (editingWorker) {
                data.append('_method', 'PUT');
                await apiFetch(`/ouvriers/${editingWorker.id}`, {
                    method: 'POST',
                    body: data
                });
                toast.success('Ouvrier mis à jour');
            } else {
                await apiFetch('/ouvriers', {
                    method: 'POST',
                    body: data
                });
                toast.success('Nouvel ouvrier ajouté');
            }
            setIsWorkerModalOpen(false);
            setScanFile(null);
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddMission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker) return;
        setIsSubmitting(true);
        try {
            await apiFetch(`/ouvriers/${selectedWorker.id}/missions`, {
                method: 'POST',
                body: JSON.stringify({
                    ...missionForm,
                    quantity: parseNumber(missionForm.quantity),
                    unit_price: parseNumber(missionForm.unit_price),
                })
            });
            toast.success('Mission enregistrée');
            setIsMissionModalOpen(false);
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’ajout de la mission');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker) return;
        setIsSubmitting(true);
        try {
            await apiFetch(`/ouvriers/${selectedWorker.id}/payments`, {
                method: 'POST',
                body: JSON.stringify({
                    ...paymentForm,
                    amount: parseNumber(paymentForm.amount),
                    bank_commission: parseNumber(paymentForm.bank_commission),
                })
            });
            toast.success('Versement enregistré');
            setIsPaymentModalOpen(false);
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’ajout du paiement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWorker = async (id: number) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cet ouvrier et toutes ses données ?')) return;
        try {
            await apiFetch(`/ouvriers/${id}`, { method: 'DELETE' });
            toast.success('Ouvrier supprimé');
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleDeleteMission = async (id: number) => {
        if (!confirm('Voulez-vous vraiment supprimer cette mission ?')) return;
        try {
            await apiFetch(`/ouvrier-missions/${id}`, { method: 'DELETE' });
            toast.success('Mission supprimée');
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleDeletePayment = async (id: number) => {
        if (!confirm('Voulez-vous vraiment supprimer ce paiement ?')) return;
        try {
            await apiFetch(`/ouvrier-payments/${id}`, { method: 'DELETE' });
            toast.success('Paiement supprimé');
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleExport = () => {
        const data = workers.map((w: Worker) => ({
            'NOM': w.name,
            'SPÉCIALITÉ': w.speciality,
            'CIN': w.cin || '-',
            'TÉL': w.phone || '-',
            'TOTAL GAGNÉ (DH)': w.total_earned,
            'DÉJÀ PAYÉ (DH)': w.paid_amount,
            'RESTE (DH)': w.total_earned - w.paid_amount
        }));
        exportToExcel(data, 'gestion_ouvriers');
    };

    const filteredWorkers = workers.filter((w: Worker) => {
        const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.speciality.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpec = filterSpeciality === 'all' || w.speciality === filterSpeciality;
        return matchesSearch && matchesSpec;
    });

    const totalToPay = workers.reduce((acc: number, w: Worker) => acc + (w.total_earned - w.paid_amount), 0);
    const totalWorkers = workers.length;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 animate-in zoom-in-50 duration-500">
                            <UserCheck size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Gestion des Ouvriers</h1>
                            <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-500" /> Suivi des missions, pointages et paiements.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden lg:flex items-center gap-8 bg-white px-8 py-4 rounded-3xl border border-gray-100 shadow-sm mr-4 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Ouvriers</p>
                            <p className="text-xl font-black text-indigo-600 tabular-nums">{totalWorkers}</p>
                        </div>
                        <div className="w-px h-10 bg-gray-100" />
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reste à Payer Global</p>
                            <p className="text-xl font-black text-rose-500 tabular-nums">{totalToPay.toLocaleString('fr-MA')} <span className="text-xs">DH</span></p>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white text-gray-600 px-5 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 hover:border-indigo-200 transition-all font-black text-xs uppercase tracking-widest shadow-sm"
                    >
                        <Download size={18} className="text-indigo-500" /> Exporter
                    </button>
                    <button
                        onClick={() => {
                            setEditingWorker(null);
                            setWorkerForm({ name: '', cin: '', speciality: 'Maçon', phone: '', rib: '' });
                            setScanFile(null);
                            setIsWorkerModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus size={20} /> Nouvel Ouvrier
                    </button>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-4 animate-in fade-in duration-700">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou spécialité..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-none rounded-3xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-48">
                        <select
                            value={filterSpeciality}
                            onChange={(e) => setFilterSpeciality(e.target.value)}
                            className="w-full pl-4 pr-10 py-4 bg-gray-50/50 border-none rounded-3xl text-xs font-black uppercase tracking-widest appearance-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                        >
                            <option value="all">Toutes Spécialités</option>
                            {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-indigo-400 pointer-events-none" size={16} />
                    </div>
                    {(searchTerm || filterSpeciality !== 'all') && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterSpeciality('all'); }}
                            className="p-4 bg-rose-50 text-rose-500 rounded-3xl hover:bg-rose-100 transition-colors border border-rose-100/50 shadow-sm"
                            title="Effacer les filtres"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Table (Horizontal) */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="overflow-x-auto custom-scrollbar-white">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ouvrier</th>
                                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Spécialité</th>
                                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">CIN & Scan</th>
                                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Finances (DH)</th>
                                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Solde Restant</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-8 h-20 bg-gray-50/30"></td>
                                    </tr>
                                ))
                            ) : filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 bg-gray-50 rounded-full text-gray-300">
                                                <User size={32} />
                                            </div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Aucun ouvrier trouvé</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredWorkers.map(worker => {
                                const balance = worker.total_earned - worker.paid_amount;
                                return (
                                    <tr key={worker.id} className="group hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm">{worker.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 italic">
                                                        <Phone size={10} /> {worker.phone || 'Non renseigné'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className="px-3 py-1 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 shadow-sm">
                                                {worker.speciality}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[11px] font-black text-gray-700 tracking-tight">{worker.cin || 'N/A'}</span>
                                                {worker.scan_cin && (
                                                    <button
                                                        onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${worker.scan_cin}`))}
                                                        className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase hover:underline"
                                                    >
                                                        <FileText size={10} /> Voir Scan
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                                                    <div className="text-center">
                                                        <span className="text-gray-400 block mb-0.5">Gagné</span>
                                                        <span className="text-slate-700 font-black">{worker.total_earned.toLocaleString('fr-MA')}</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-100" />
                                                    <div className="text-center">
                                                        <span className="text-gray-400 block mb-0.5">Payé</span>
                                                        <span className="text-emerald-600 font-black">{worker.paid_amount.toLocaleString('fr-MA')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-xs tabular-nums shadow-sm ${balance > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                                {balance.toLocaleString('fr-MA')} <span className="text-[9px]">DH</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        setActiveTab('missions');
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm group"
                                                    title="Voir Détails"
                                                >
                                                    <Eye size={16} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        setIsMissionModalOpen(true);
                                                    }}
                                                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-all shadow-sm group"
                                                    title="Nouveau Pointage"
                                                >
                                                    <Briefcase size={16} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm group"
                                                    title="Nouveau Paiement"
                                                >
                                                    <Banknote size={16} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                                <div className="w-px h-4 bg-gray-100 mx-1" />
                                                <button
                                                    onClick={() => {
                                                        setEditingWorker(worker);
                                                        setWorkerForm({ name: worker.name, cin: worker.cin || '', speciality: worker.speciality, phone: worker.phone || '', rib: worker.rib || '' });
                                                        setScanFile(null);
                                                        setIsWorkerModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteWorker(worker.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Worker Modal */}
            {
                isWorkerModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                                        <Plus size={20} />
                                    </div>
                                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">{editingWorker ? 'Modifier Ouvrier' : 'Nouvel Ouvrier'}</h3>
                                </div>
                                <button onClick={() => setIsWorkerModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddWorker} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Nom complet</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={workerForm.name}
                                            onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                                            placeholder="Ex: Ahmed Benjelloun"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">CIN</label>
                                        <input
                                            type="text"
                                            value={workerForm.cin}
                                            onChange={(e) => setWorkerForm({ ...workerForm, cin: e.target.value })}
                                            placeholder="Ex: AB123456"
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Spécialité</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                            <select
                                                value={workerForm.speciality}
                                                onChange={(e) => setWorkerForm({ ...workerForm, speciality: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                                            >
                                                {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Téléphone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                            <input
                                                type="tel"
                                                value={workerForm.phone}
                                                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                                                placeholder="06..."
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Scan CIN</label>
                                        <input
                                            type="file"
                                            onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                                            className="w-full text-[10px] file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">RIB (Relevé d'Identité Bancaire)</label>
                                        <div className="relative">
                                            <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                            <input
                                                type="text"
                                                value={workerForm.rib}
                                                onChange={(e) => setWorkerForm({ ...workerForm, rib: e.target.value })}
                                                placeholder="24 chiffres..."
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm tracking-wider"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Enregistrer</span></>}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Mission Modal */}
            {
                isMissionModalOpen && selectedWorker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50 text-emerald-900 leading-none">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-widest">Ajouter une Mission</h3>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Ouvrier: {selectedWorker.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsMissionModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddMission} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Type de Pointage/Tâche</label>
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                            {MISSION_TYPES.map(type => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => setMissionForm({ ...missionForm, type: type.value as any })}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 ${missionForm.type === type.value
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                        : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {type.icon}
                                                    <span className="text-[8px] font-black uppercase tracking-tight text-center leading-tight">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-full">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Projet/Terrain</label>
                                        <select
                                            value={missionForm.terrain_id}
                                            onChange={(e) => setMissionForm({ ...missionForm, terrain_id: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
                                        >
                                            <option value="">Sélectionner un terrain</option>
                                            {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_projet} - {t.nom_terrain}</option>)}
                                        </select>
                                    </div>

                                    <div className={`col-span-full ${missionForm.type === 'periode' ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1'}`}>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">
                                                {missionForm.type === 'periode' ? 'Date Début' : 'Date de Mission'}
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={missionForm.start_date}
                                                onChange={(e) => setMissionForm({ ...missionForm, start_date: e.target.value })}
                                                className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-700"
                                            />
                                        </div>
                                        {missionForm.type === 'periode' && (
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Date Fin</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={missionForm.end_date}
                                                    onChange={(e) => setMissionForm({ ...missionForm, end_date: e.target.value })}
                                                    className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-700"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {missionForm.type !== 'forfait' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">
                                                {missionForm.type === 'journalier' || missionForm.type === 'periode' ? 'Nombre de Jours' : missionForm.type === 'm2' ? 'Surface (m²)' : 'Longueur (ml)'}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="0"
                                                value={missionForm.quantity}
                                                onChange={(e) => setMissionForm({ ...missionForm, quantity: formatNumber(e.target.value) })}
                                                className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-700"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">
                                            {missionForm.type === 'forfait' ? 'Montant Total du Forfait' : 'Prix Unitaire (DH)'}
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="0"
                                            value={missionForm.unit_price}
                                            onChange={(e) => setMissionForm({ ...missionForm, unit_price: formatNumber(e.target.value) })}
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-700 font-mono"
                                        />
                                    </div>

                                    <div className="col-span-full">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Description / Tâche précise</label>
                                        <textarea
                                            value={missionForm.description}
                                            onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                                            placeholder="Détails du travail effectué..."
                                            rows={2}
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-gray-700 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Total Mission Estimé</span>
                                    <span className="text-2xl font-black text-emerald-600 tabular-nums">
                                        {(missionForm.type === 'forfait'
                                            ? parseNumber(missionForm.unit_price)
                                            : parseNumber(missionForm.quantity) * parseNumber(missionForm.unit_price)
                                        ).toLocaleString('fr-MA')} DH
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Enregistrer la Mission</span></>}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isDetailsModalOpen && selectedWorker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                            <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{selectedWorker.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 italic">
                                            {selectedWorker.speciality}
                                        </span>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            Fiche Ouvrier #{selectedWorker.id} • CIN: {selectedWorker.cin || 'Non renseigné'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setIsDetailsModalOpen(false);
                                            setEditingWorker(selectedWorker);
                                            setWorkerForm({ name: selectedWorker.name, cin: selectedWorker.cin || '', speciality: selectedWorker.speciality, phone: selectedWorker.phone || '', rib: selectedWorker.rib || '' });
                                            setIsWorkerModalOpen(true);
                                        }}
                                        className="p-3 bg-white text-indigo-500 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all shadow-sm"
                                        title="Modifier"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => setIsDetailsModalOpen(false)} className="p-3 bg-white text-gray-400 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-10 space-y-10">
                                {/* Stats Grid & Actions */}
                                <div className="flex flex-col lg:flex-row gap-8">
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <TrendingUp size={48} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Total Earned</p>
                                            <p className="text-xl font-black text-slate-800 tabular-nums">
                                                {selectedWorker.total_earned.toLocaleString('fr-MA')} <span className="text-[10px] text-slate-400">DH</span>
                                            </p>
                                        </div>
                                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Banknote size={32} />
                                            </div>
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.1em] mb-1">Total Paid</p>
                                            <p className="text-xl font-black text-emerald-600 tabular-nums">
                                                {selectedWorker.paid_amount.toLocaleString('fr-MA')} <span className="text-[10px] text-emerald-400">DH</span>
                                            </p>
                                        </div>
                                        <div className={`col-span-2 p-5 rounded-3xl border relative overflow-hidden group ${selectedWorker.total_earned - selectedWorker.paid_amount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.1em] mb-1 ${selectedWorker.total_earned - selectedWorker.paid_amount > 0 ? 'text-rose-400' : 'text-indigo-400'}`}>
                                                Solde à Payer
                                            </p>
                                            <p className={`text-2xl font-black tabular-nums ${selectedWorker.total_earned - selectedWorker.paid_amount > 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                                {(selectedWorker.total_earned - selectedWorker.paid_amount).toLocaleString('fr-MA')} <span className="text-xs font-bold opacity-60">DH</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="lg:w-[320px] space-y-4">
                                        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 space-y-4 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                                    <UserCheck size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Informations</p>
                                                    <p className="text-sm font-black text-gray-800 uppercase italic">Profil Ouvrier</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spécialité</span>
                                                    <span className="text-xs font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{selectedWorker.speciality}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Téléphone</span>
                                                    <span className="text-xs font-black text-slate-700">{selectedWorker.phone || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CIN</span>
                                                    <span className="text-xs font-black text-slate-700 uppercase">{selectedWorker.cin || '—'}</span>
                                                </div>
                                                {selectedWorker.rib && (
                                                    <div className="flex flex-col gap-1 pt-2 border-t border-gray-50 group">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RIB</span>
                                                        <span className="text-sm font-black text-emerald-600 font-mono tracking-widest bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100 text-center">{selectedWorker.rib}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedWorker.scan_cin ? (
                                            <button
                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedWorker.scan_cin}`))}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3 hover:bg-white hover:border-indigo-200 transition-all group"
                                            >
                                                <div className="p-2 bg-white rounded-xl text-indigo-500 shadow-sm">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Identity Document</p>
                                                    <p className="text-xs font-black text-gray-700 uppercase">Voir Scan CIN</p>
                                                </div>
                                                <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <div className="p-4 bg-amber-50 border border-dashed border-amber-200 rounded-2xl flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-xl text-amber-500">
                                                    <Info size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Scan Manquant</p>
                                                    <p className="text-[9px] font-bold text-amber-400">Pensez à scanner la CIN</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs & History */}
                                <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                                    <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
                                        <button
                                            onClick={() => setActiveTab('missions')}
                                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'missions' ? 'bg-white shadow-sm border border-gray-100 text-slate-900' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <Briefcase size={14} className={activeTab === 'missions' ? 'text-slate-400' : ''} />
                                            Historique des Missions
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('payments')}
                                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'payments' ? 'bg-white shadow-sm border border-gray-100 text-slate-900' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <Banknote size={14} className={activeTab === 'payments' ? 'text-slate-400' : ''} />
                                            Paiements Effectués
                                        </button>
                                    </div>

                                    <div className="p-8">
                                        {activeTab === 'missions' ? (
                                            <div className="space-y-4">
                                                {selectedWorker.missions && selectedWorker.missions.length > 0 ? (
                                                    selectedWorker.missions.sort((a, b) => b.id - a.id).map((m) => (
                                                        <div key={m.id} className="p-5 bg-gray-50/50 border border-gray-100 rounded-3xl hover:border-indigo-200 transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-5">
                                                                <div className={`p-3 rounded-2xl ${m.type === 'forfait' ? 'bg-rose-100 text-rose-600' : 'bg-white text-indigo-500 shadow-sm'}`}>
                                                                    {m.type === 'forfait' ? <Briefcase size={18} /> : m.type === 'journalier' ? <Clock size={18} /> : m.type === 'periode' ? <Calendar size={18} /> : <Maximize size={18} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{m.description || 'Mission standard'}</p>
                                                                        <span className="px-2 py-0.5 bg-white border border-gray-100 rounded text-[9px] font-bold text-gray-400 uppercase">
                                                                            {m.start_date} {m.end_date ? `au ${m.end_date}` : ''}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                        {MISSION_TYPES.find(t => t.value === m.type)?.label || m.type} • {m.type === 'forfait' ? 'Total' : `${m.quantity} x ${m.unit_price} DH`} • {m.terrain ? `${m.terrain.nom_projet} - ${m.terrain.nom_terrain}` : 'Site général'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-gray-900 tracking-tight">{m.total_amount.toLocaleString('fr-MA')} DH</p>
                                                                <button
                                                                    onClick={() => handleDeleteMission(m.id)}
                                                                    className="text-[10px] font-black text-rose-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600"
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 opacity-30">
                                                        <Briefcase size={40} className="mx-auto mb-3" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Aucune mission enregistrée</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedWorker.payments && selectedWorker.payments.length > 0 ? (
                                                    selectedWorker.payments.sort((a, b) => b.id - a.id).map((p) => (
                                                        <div key={p.id} className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-3xl hover:border-emerald-300 transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-5">
                                                                <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm">
                                                                    <Banknote size={18} />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <p className="text-sm font-black text-emerald-900 tabular-nums">{p.amount.toLocaleString('fr-MA')} DH</p>
                                                                        <span className="px-2 py-0.5 bg-white border border-emerald-100 rounded text-[9px] font-bold text-emerald-500 uppercase">{p.payment_date}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest">
                                                                        {p.method} {p.reference_no && `• Réf: ${p.reference_no}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeletePayment(p.id)}
                                                                className="text-[10px] font-black text-rose-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600"
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 opacity-30">
                                                        <Banknote size={40} className="mx-auto mb-3" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Aucun paiement effectué</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Payment Modal */}
            {
                isPaymentModalOpen && selectedWorker && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100">
                                        <Banknote size={20} />
                                    </div>
                                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">Nouveau Paiement</h3>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddPayment} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Montant versé (DH)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-sm uppercase">DH</span>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: formatNumber(e.target.value) })}
                                            placeholder="0"
                                            className="w-full pl-12 pr-4 py-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black text-2xl text-emerald-600"
                                        />
                                    </div>
                                    <div className="mt-2 flex justify-between items-center px-1">
                                        <p className="text-[10px] text-rose-500 font-bold uppercase">Solde: {(selectedWorker.total_earned - selectedWorker.paid_amount).toLocaleString('fr-MA')} DH</p>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentForm({ ...paymentForm, amount: formatNumber(String(selectedWorker.total_earned - selectedWorker.paid_amount)) })}
                                            className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                                        >
                                            Payer le reste
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={paymentForm.payment_date}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Méthode</label>
                                        <select
                                            value={paymentForm.method}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                            className="w-full px-3 py-3.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                                        >
                                            <option value="Espèces">Espèces</option>
                                            <option value="Virement">Virement</option>
                                            <option value="Chèque">Chèque</option>
                                            <option value="Effet">Effet</option>
                                        </select>
                                    </div>
                                </div>

                                {paymentForm.method !== 'Espèces' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Référence N°</label>
                                            <input
                                                type="text"
                                                value={paymentForm.reference_no}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                                                placeholder="N° Chèque/Virement"
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Banque</label>
                                            <input
                                                type="text"
                                                value={paymentForm.bank_name}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                                                placeholder="Nom de la banque"
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                            />
                                        </div>
                                        <div className="col-span-full">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Commission Bancaire (DH)</label>
                                            <input
                                                type="text"
                                                value={paymentForm.bank_commission}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, bank_commission: formatNumber(e.target.value) })}
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Confirmer le Paiement</span></>}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Workers;
