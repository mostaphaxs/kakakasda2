import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Wrench, Search, PlusCircle, Download, Edit2, Trash2, X, Save, Banknote, Briefcase, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm, Controller } from 'react-hook-form';
import { formatNumber, parseNumber } from '../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface GeneralWork {
    id: number;
    work_type: string;
    total_amount: number;
    paid_amount: number;
    bank_commission: number;
    method: string;
    reference_no: string | null;
    bank_name: string | null;
    rib: string | null;
    balance: number;
    supplier_id: number;
    supplier: { nom_societe: string };
    created_at: string;
    terrain_id?: number;
    terrain?: { nom_terrain: string };
    description?: string | null;
    payment_date?: string | null;
}

const GeneralWorks: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWorkType, setFilterWorkType] = useState('all');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterTerrain, setFilterTerrain] = useState('all');
    const [filterBalance, setFilterBalance] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [editingWork, setEditingWork] = useState<GeneralWork | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [paymentWork, setPaymentWork] = useState<GeneralWork | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedWork, setSelectedWork] = useState<GeneralWork | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const headerRef = React.useRef<HTMLDivElement>(null);
    const [stickyOffset, setStickyOffset] = React.useState(0);

    React.useEffect(() => {
        const updateOffset = () => {
            if (headerRef.current) {
                // Buffer for the sticky top-4 (1rem = 16px approx)
                setStickyOffset(headerRef.current.offsetHeight + 16);
            }
        };

        updateOffset();
        window.addEventListener('resize', updateOffset);
        const observer = new ResizeObserver(updateOffset);
        if (headerRef.current) observer.observe(headerRef.current);

        return () => {
            window.removeEventListener('resize', updateOffset);
            observer.disconnect();
        };
    }, []);


    const { register, handleSubmit, reset, control } = useForm();

    const WORK_TYPES = ['Travaux de construction', 'Décapage', 'Nettoyage', 'Atterrassement', 'Débarquement', 'Déplacement terre/sable', 'Solaire', 'Traveau supplementaire', 'Peinture', 'Jardinage'];

    const { data: works = [], isLoading: loading } = useQuery({
        queryKey: ['general-works'],
        queryFn: () => apiFetch<GeneralWork[]>('/general-works'),
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => apiFetch<any[]>('/suppliers'),
    });

    const { data: terrains = [] } = useQuery({
        queryKey: ['terrains'],
        queryFn: () => apiFetch<any[]>('/terrains'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiFetch(`/general-works/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast.success('Travaux supprimés');
            queryClient.invalidateQueries({ queryKey: ['general-works'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            apiFetch(`/general-works/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            }),
        onSuccess: () => {
            toast.success('Travaux mis à jour !');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['general-works'] });
        },
        onError: (error: any) => toast.error(error.message || 'Erreur lors de la mise à jour.'),
    });

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer ces travaux ?')) return;
        deleteMutation.mutate(id);
    };

    const handleEdit = (work: GeneralWork) => {
        setEditingWork(work);
        reset({
            work_type: work.work_type,
            supplier_id: work.supplier_id,
            terrain_id: work.terrain_id,
            total_amount: formatNumber(work.total_amount),
            paid_amount: work.paid_amount,
            bank_commission: work.bank_commission,
            method: work.method,
            reference_no: work.reference_no,
            bank_name: work.bank_name,
            rib: work.rib || '',
            description: work.description || '',
            payment_date: work.payment_date || new Date().toISOString().split('T')[0],
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: any) => {
        if (!editingWork) return;
        data.total_amount = parseNumber(data.total_amount);
        updateMutation.mutate({ id: editingWork.id, data });
    };

    const onSubmitPayment = async (data: any) => {
        if (!paymentWork) return;
        const newPaidAmount = (paymentWork.paid_amount || 0) + parseNumber(data.new_payment);
        const newBankCommission = (paymentWork.bank_commission || 0) + parseNumber(data.bank_commission);
        updateMutation.mutate({
            id: paymentWork.id,
            data: {
                ...paymentWork,
                paid_amount: newPaidAmount,
                bank_commission: newBankCommission,
                method: data.method,
                reference_no: data.reference_no,
                bank_name: data.bank_name,
                payment_date: data.payment_date,
            }
        });
        setIsPaymentModalOpen(false);
    };

    const filtered = works.filter(w => {
        const matchesSearch =
            w.work_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.supplier.nom_societe.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (w.terrain?.nom_terrain && w.terrain.nom_terrain.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesWorkType = filterWorkType === 'all' || w.work_type === filterWorkType;
        const matchesSupplier = filterSupplier === 'all' || w.supplier_id.toString() === filterSupplier;
        const matchesTerrain = filterTerrain === 'all' ||
            (filterTerrain === 'none' && !w.terrain_id) ||
            (filterTerrain !== 'none' && w.terrain_id && w.terrain_id.toString() === filterTerrain);
        const matchesBalance = filterBalance === 'all' ||
            (filterBalance === 'paid' && w.balance <= 0) ||
            (filterBalance === 'unpaid' && w.balance > 0);

        return matchesSearch && matchesWorkType && matchesSupplier && matchesTerrain && matchesBalance;
    });

    const activeFilterCount = (filterWorkType !== 'all' ? 1 : 0) +
        (filterSupplier !== 'all' ? 1 : 0) +
        (filterTerrain !== 'all' ? 1 : 0) +
        (filterBalance !== 'all' ? 1 : 0);

    const handleExport = () => {
        exportToExcel(filtered.map(w => ({
            'PRESTATAIRE': w.supplier.nom_societe,
            'NATURE TRAVAIL': w.work_type,
            'MONTANT MARCHE (DH)': w.total_amount,
            'MONTANT PAYE (DH)': w.paid_amount,
            'SOLDE (DH)': w.balance,
            'DATE': new Date(w.created_at).toLocaleDateString()
        })), 'travaux_generaux_complet', true);
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl p-4 rounded-xl border border-white shadow-xl shadow-gray-200/50 space-y-3 mx-1"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Wrench className="text-orange-600 h-6 w-6" />
                            Suivi des Travaux Généraux
                        </h1>
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest italic">Suivi Financier</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl border border-orange-100 hover:bg-orange-100 transition font-black text-xs uppercase tracking-widest">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-travaux')} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-black shadow-lg shadow-orange-100 text-[10px] uppercase tracking-widest">
                            <PlusCircle size={16} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[250px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher par prestataire, nature ou projet..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors shadow-sm ${showFilters ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <Filter size={16} />
                            Filtres Avancés
                            {activeFilterCount > 0 && (
                                <span className="bg-orange-500 text-white flex items-center justify-center rounded-full w-5 h-5 text-[10px]">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-orange-50/30 rounded-xl border border-orange-100/50 animate-in fade-in slide-in-from-top-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Type de Travail</label>
                                <select
                                    value={filterWorkType}
                                    onChange={(e) => setFilterWorkType(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                >
                                    <option value="all">Tous les types</option>
                                    {WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Prestataire</label>
                                <select
                                    value={filterSupplier}
                                    onChange={(e) => setFilterSupplier(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                >
                                    <option value="all">Tous les prestataires</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id.toString()}>{s.nom_societe}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Projet</label>
                                <select
                                    value={filterTerrain}
                                    onChange={(e) => setFilterTerrain(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                >
                                    <option value="all">Tous les projets</option>
                                    {terrains.map(t => <option key={t.id} value={t.id.toString()}>{t.nom_terrain}</option>)}
                                    <option value="none">Sans projet (Global)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Statut Paiement</label>
                                <select
                                    value={filterBalance}
                                    onChange={(e) => setFilterBalance(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="paid">Payé (Solde 0)</option>
                                    <option value="unpaid">Non Payé (Solde &gt; 0)</option>
                                </select>
                            </div>
                            {(filterWorkType !== 'all' || filterSupplier !== 'all' || filterTerrain !== 'all' || filterBalance !== 'all') && (
                                <div className="md:col-span-4 flex justify-end mt-[-10px]">
                                    <button
                                        onClick={() => {
                                            setFilterWorkType('all');
                                            setFilterSupplier('all');
                                            setFilterTerrain('all');
                                            setFilterBalance('all');
                                        }}
                                        className="text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors uppercase tracking-widest"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-sm">
                <table className="w-full text-left">
                    <thead
                        className="sticky z-20 bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest shadow-sm"
                        style={{ top: `${stickyOffset}px` }}
                    >
                        <tr>
                            <th className="px-4 py-2.5">Nature des Travaux</th>
                            <th className="px-4 py-2.5">Projet</th>
                            <th className="px-4 py-2.5">Prestataire</th>
                            <th className="px-4 py-2.5">Montant Marché</th>
                            <th className="px-4 py-2.5">Payé</th>
                            <th className="px-4 py-2.5">Réf / Mode</th>
                            <th className="px-4 py-2.5">Comm. Banque</th>
                            <th className="px-4 py-2.5 text-right">Solde</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Chargement des travaux...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Aucune prestation trouvée.</td></tr>
                        ) : filtered.map(w => (
                            <tr key={w.id} className="hover:bg-orange-50/20 transition-colors group">
                                <td className="px-6 py-4 font-black text-slate-800 uppercase tracking-tight">{w.work_type}</td>
                                <td className="px-6 py-4 font-bold text-blue-500 uppercase text-[10px]">
                                    {w.terrain?.nom_terrain || 'N/A'}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">{w.supplier.nom_societe}</td>
                                <td className="px-6 py-4 font-black text-blue-600">{w.total_amount?.toLocaleString('fr-MA')} DH</td>
                                <td className="px-6 py-4 font-black text-emerald-600">
                                    {((w.paid_amount || 0) - (w.bank_commission || 0)).toLocaleString('fr-MA')} DH
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-800 uppercase">{w.method}</span>
                                        <span className="text-[9px] text-gray-400 font-bold tracking-tighter">{w.reference_no || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-black text-rose-500 text-xs">
                                    {w.bank_commission ? `${w.bank_commission?.toLocaleString('fr-MA')} DH` : '—'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-3 py-1.5 rounded-lg font-black text-xs ${w.balance <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {w.balance?.toLocaleString('fr-MA')} DH
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => {
                                            setSelectedWork(w);
                                            setIsDetailsModalOpen(true);
                                        }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Détails">
                                            <Search size={18} />
                                        </button>
                                        {w.balance > 0 && (
                                            <button onClick={() => {
                                                setPaymentWork(w);
                                                reset({
                                                    new_payment: formatNumber(w.balance),
                                                    bank_commission: formatNumber('0'),
                                                    method: w.method || 'Chèque',
                                                    payment_date: new Date().toISOString().split('T')[0],
                                                    reference_no: '',
                                                    bank_name: ''
                                                });
                                                setIsPaymentModalOpen(true);
                                            }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Payer (Régler le Solde)">
                                                <Banknote size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(w)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(w.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && paymentWork && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
                            <h3 className="font-black text-emerald-800 text-base uppercase tracking-widest flex items-center gap-2">
                                <Banknote size={18} /> Paiement Travaux
                            </h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmitPayment)} className="p-6 space-y-4">
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-2">
                                <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Solde Restant</span>
                                <span className="text-xl font-mono font-black text-emerald-800">{paymentWork.balance.toLocaleString('fr-MA')} DH</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                        Montant (DH)
                                    </label>
                                    <Controller
                                        name="new_payment"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field: { onChange, value, ...rest } }) => (
                                            <input
                                                {...rest}
                                                type="text"
                                                value={value || ''}
                                                onChange={(e) => onChange(formatNumber(e.target.value))}
                                                placeholder="0,00"
                                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none shadow-sm"
                                            />
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center">
                                        Commission Bancaire (DH)
                                    </label>
                                    <Controller
                                        name="bank_commission"
                                        control={control}
                                        render={({ field: { onChange, value, ...rest } }) => (
                                            <input
                                                {...rest}
                                                type="text"
                                                value={value || ''}
                                                onChange={(e) => onChange(formatNumber(e.target.value))}
                                                placeholder="0,00"
                                                className="w-full h-12 px-4 rounded-xl border-emerald-100 bg-emerald-50/20 focus:bg-white focus:border-emerald-600 transition-all font-bold text-emerald-700 text-sm outline-none shadow-sm"
                                            />
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                        Date Paiement
                                    </label>
                                    <input type="date" {...register('payment_date')} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none shadow-sm" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                        Mode
                                    </label>
                                    <select {...register('method', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        <option value="Chèque">Chèque</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                        Référence N°
                                    </label>
                                    <input type="text" {...register('reference_no')} placeholder="N°..." className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                        Banque
                                    </label>
                                    <input type="text" {...register('bank_name')} placeholder="Nom..." className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-600 transition-all font-bold text-sm outline-none shadow-sm" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full h-14 mt-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center space-x-3 shadow-emerald-100"
                            >
                                <Save size={20} />
                                <span>{updateMutation.isPending ? 'Mise à jour...' : 'Valider le paiement'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
                            <h3 className="font-black text-gray-800 text-base uppercase tracking-widest flex items-center gap-2">
                                <Wrench size={18} /> Modifier Travaux
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar-white">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Wrench size={12} className="mr-2" /> Nature des Travaux
                                    </label>
                                    <select {...register('work_type', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        {WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Briefcase size={12} className="mr-2" /> Prestataire
                                    </label>
                                    <select {...register('supplier_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        <Briefcase size={12} className="mr-2" /> Projet
                                    </label>
                                    <select {...register('terrain_id', { required: true })} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm">
                                        {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                                    </select>
                                </div>
                                <div className="mt-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                        Description du Travaux
                                    </label>
                                    <textarea {...register('description')} rows={3} placeholder="Détails..." className="w-full p-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm resize-none"></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Banknote size={12} className="mr-2" /> Montant Global (DH)
                                        </label>
                                        <Controller
                                            name="total_amount"
                                            control={control}
                                            rules={{ required: true }}
                                            render={({ field: { onChange, value, ...rest } }) => (
                                                <input
                                                    {...rest}
                                                    type="text"
                                                    value={value || ''}
                                                    onChange={(e) => onChange(formatNumber(e.target.value))}
                                                    placeholder="0,00"
                                                    className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-600 transition-all font-bold text-sm outline-none shadow-sm"
                                                />
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Briefcase size={12} className="mr-2" /> RIB (Compte Bancaire)
                                        </label>
                                        <input type="text" {...register('rib')} className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs ring-0 outline-none" placeholder="RIB..." />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl flex items-center justify-center space-x-3 shadow-orange-100"
                            >
                                <Save size={20} />
                                <span>{updateMutation.isPending ? 'Mise à jour...' : 'Confirmer les modifications'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {isDetailsModalOpen && selectedWork && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="shrink-0 px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest leading-none mb-1">
                                    Détails Travaux
                                </h3>
                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                                    Fiche ID #{selectedWork.id} • {selectedWork.work_type}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar-white">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Prestataire</label>
                                    <p className="text-sm font-bold text-gray-700">{selectedWork.supplier.nom_societe}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Type de Travail</label>
                                    <p className="text-sm font-bold text-gray-700">{selectedWork.work_type}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Projet (Terrain)</label>
                                    <p className="text-sm font-bold text-blue-600 uppercase italic">{selectedWork.terrain?.nom_terrain || 'Non spécifié'}</p>
                                </div>
                                {selectedWork.description && (
                                    <div className="col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Description du Travaux</label>
                                        <p className="text-xs font-medium text-gray-700 whitespace-pre-line">{selectedWork.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Montant Global</label>
                                    <p className="text-lg font-black text-blue-600 font-mono">{selectedWork.total_amount.toLocaleString('fr-MA')} DH</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Montant Payé (Net)</label>
                                    <p className="text-lg font-black text-emerald-600 font-mono">{((selectedWork.paid_amount || 0) - (selectedWork.bank_commission || 0)).toLocaleString('fr-MA')} DH</p>
                                </div>
                                <div className="col-span-2 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center text-rose-700">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Solde Restante</span>
                                    <span className="text-xl font-black font-mono">{selectedWork.balance.toLocaleString('fr-MA')} DH</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Informations de Paiement</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Mode</label>
                                        <p className="text-xs font-bold text-gray-700">{selectedWork.method || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Référence</label>
                                        <p className="text-xs font-bold text-gray-700">{selectedWork.reference_no || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Banque</label>
                                        <p className="text-xs font-bold text-gray-700">{selectedWork.bank_name || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <label className="text-[9px] font-black text-blue-400 uppercase block mb-1">RIB Associé</label>
                                        <p className="text-xs font-mono font-black text-blue-700">{selectedWork.rib || 'Aucun RIB spécifié'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    handleEdit(selectedWork);
                                }}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                            >
                                Modifier
                            </button>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralWorks;
