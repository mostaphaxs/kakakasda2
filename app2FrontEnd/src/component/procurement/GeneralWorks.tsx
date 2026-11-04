import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Wrench, Search, PlusCircle, Download, Edit2, Trash2, X, Save, Banknote, Briefcase, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm, Controller } from 'react-hook-form';
import { formatNumber, parseNumber } from '../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmDialog } from '../common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../../lib/usePersistedState';

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
    const [searchTerm, setSearchTerm] = usePersistedState('GeneralWorks.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [filterWorkType, setFilterWorkType] = usePersistedState('GeneralWorks.filterWorkType', 'all');
    const [filterSupplier, setFilterSupplier] = usePersistedState('GeneralWorks.filterSupplier', 'all');
    const [filterTerrain, setFilterTerrain] = usePersistedState('GeneralWorks.filterTerrain', 'all');
    const [filterBalance, setFilterBalance] = usePersistedState('GeneralWorks.filterBalance', 'all');
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
        if (!await confirmDialog('Supprimer ces travaux ?')) return;
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
        <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 mx-1"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2 tracking-tight">
                            <Wrench className="text-orange-600 h-6 w-6" />
                            Suivi des Travaux Généraux
                        </h1>
                        <p className="text-slate-500 text-xs font-medium">Suivi Financier</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition font-medium text-sm">
                            <Download size={18} />
                            Exporter
                        </button>
                        <button onClick={() => navigate('/add-travaux')} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium shadow-sm text-sm bg-slate-900 hover:bg-slate-800">
                            <PlusCircle size={16} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[250px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher par prestataire, nature ou projet..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors shadow-sm ${showFilters ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Filter size={16} />
                            Filtres Avancés
                            {activeFilterCount > 0 && (
                                <span className="bg-orange-500 text-white flex items-center justify-center rounded-full w-5 h-5 text-xs">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-orange-50/30 rounded-xl border border-orange-100/50">
                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Type de Travail</label>
                                <select
                                    value={filterWorkType}
                                    onChange={(e) => setFilterWorkType(e.target.value)}
                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                >
                                    <option value="all">Tous les types</option>
                                    {WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Prestataire</label>
                                <select
                                    value={filterSupplier}
                                    onChange={(e) => setFilterSupplier(e.target.value)}
                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                >
                                    <option value="all">Tous les prestataires</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id.toString()}>{s.nom_societe}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Projet</label>
                                <select
                                    value={filterTerrain}
                                    onChange={(e) => setFilterTerrain(e.target.value)}
                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                >
                                    <option value="all">Tous les projets</option>
                                    {terrains.map(t => <option key={t.id} value={t.id.toString()}>{t.nom_terrain}</option>)}
                                    <option value="none">Sans projet (Global)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-slate-600">Statut Paiement</label>
                                <select
                                    value={filterBalance}
                                    onChange={(e) => setFilterBalance(e.target.value)}
                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                                        className="text-xs font-medium text-slate-500 hover:text-orange-600 transition-colors"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm text-sm">
                <table className="w-full text-left">
                    <thead
                        className="sticky z-20 bg-white border-b border-slate-200"
                        style={{ top: `${stickyOffset}px` }}
                    >
                        <tr>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Nature des Travaux</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Projet</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Prestataire</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Montant Marché</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Payé</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Réf / Mode</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Comm. Banque</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Solde</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-400">Chargement des travaux...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucune prestation trouvée.</td></tr>
                        ) : filtered.map(w => (
                            <tr key={w.id} className="hover:bg-orange-50/20 transition-colors group">
                                <td className="px-4 py-3 font-semibold text-slate-800 tracking-tight">{w.work_type}</td>
                                <td className="px-4 py-3 font-medium text-blue-500 text-xs">
                                    {w.terrain?.nom_terrain || 'N/A'}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-500 text-xs">{w.supplier.nom_societe}</td>
                                <td className="px-4 py-3 font-semibold text-blue-600">{w.total_amount?.toLocaleString('fr-MA')} DH</td>
                                <td className="px-4 py-3 font-semibold text-emerald-600">
                                    {((w.paid_amount || 0) - (w.bank_commission || 0)).toLocaleString('fr-MA')} DH
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-800">{w.method}</span>
                                        <span className="text-xs text-slate-400 font-medium tracking-tight">{w.reference_no || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-rose-500 text-xs">
                                    {w.bank_commission ? `${w.bank_commission?.toLocaleString('fr-MA')} DH` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ${w.balance <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {w.balance?.toLocaleString('fr-MA')} DH
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center md:transition-opacity justify-end gap-0.5">
                                        <button onClick={() => {
                                            setSelectedWork(w);
                                            setIsDetailsModalOpen(true);
                                        }} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                            <Search size={16} />
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
                                            }} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Payer (Régler le Solde)">
                                                <Banknote size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(w)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(w.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
                                            <Trash2 size={16} />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                            <h3 className="font-semibold text-emerald-800 text-base flex items-center gap-2">
                                <Banknote size={18} /> Paiement Travaux
                            </h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmitPayment)} className="p-6 space-y-4">
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-2">
                                <span className="block text-xs font-medium text-emerald-600 mb-1 text-slate-600">Solde Restant</span>
                                <span className="text-xl font-mono font-semibold text-emerald-800">{paymentWork.balance.toLocaleString('fr-MA')} DH</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center text-slate-600">
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
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-emerald-400 mb-1 flex items-center text-slate-600">
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
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center text-slate-600">
                                        Date Paiement
                                    </label>
                                    <input type="date" {...register('payment_date')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium mb-1 flex items-center text-slate-600">
                                        Mode
                                    </label>
                                    <select {...register('method', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                        <option value="Chèque">Chèque</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center text-slate-600">
                                        Référence N°
                                    </label>
                                    <input type="text" {...register('reference_no')} placeholder="N°..." className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center text-slate-600">
                                        Banque
                                    </label>
                                    <input type="text" {...register('bank_name')} placeholder="Nom..." className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full h-11 mt-4 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center space-x-3 text-sm bg-emerald-600 hover:bg-emerald-700"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-orange-50">
                            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                                <Wrench size={18} /> Modifier Travaux
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitUpdate)} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar-white">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                        <Wrench size={12} className="mr-2" /> Nature des Travaux
                                    </label>
                                    <select {...register('work_type', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                        {WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                        <Briefcase size={12} className="mr-2" /> Prestataire
                                    </label>
                                    <select {...register('supplier_id', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom_societe}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                        <Briefcase size={12} className="mr-2" /> Projet
                                    </label>
                                    <select {...register('terrain_id', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                        {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_terrain}</option>)}
                                    </select>
                                </div>
                                <div className="mt-2">
                                    <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                        Description du Travaux
                                    </label>
                                    <textarea {...register('description')} rows={3} placeholder="Détails..." className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
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
                                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                />
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                            <Briefcase size={12} className="mr-2" /> RIB (Compte Bancaire)
                                        </label>
                                        <input type="text" {...register('rib')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="RIB..." />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center space-x-3 text-sm bg-slate-900 hover:bg-slate-800"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="shrink-0 px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg leading-none mb-1">
                                    Détails Travaux
                                </h3>
                                <p className="text-xs font-medium text-orange-600">
                                    Fiche ID #{selectedWork.id} • {selectedWork.work_type}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar-white">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Prestataire</label>
                                    <p className="text-sm font-semibold text-slate-700">{selectedWork.supplier.nom_societe}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Type de Travail</label>
                                    <p className="text-sm font-semibold text-slate-700">{selectedWork.work_type}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Projet (Terrain)</label>
                                    <p className="text-sm font-semibold text-blue-600">{selectedWork.terrain?.nom_terrain || 'Non spécifié'}</p>
                                </div>
                                {selectedWork.description && (
                                    <div className="col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-medium block mb-2 text-slate-600">Description du Travaux</label>
                                        <p className="text-xs font-medium text-slate-700 whitespace-pre-line">{selectedWork.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Montant Global</label>
                                    <p className="text-lg font-semibold text-blue-600 font-mono">{selectedWork.total_amount.toLocaleString('fr-MA')} DH</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Montant Payé (Net)</label>
                                    <p className="text-lg font-semibold text-emerald-600 font-mono">{((selectedWork.paid_amount || 0) - (selectedWork.bank_commission || 0)).toLocaleString('fr-MA')} DH</p>
                                </div>
                                <div className="col-span-2 p-4 bg-rose-50 rounded-xl border !border-rose-100 flex justify-between items-center text-rose-700">
                                    <span className="text-xs font-semibold">Solde Restante</span>
                                    <span className="text-xl font-semibold font-mono">{selectedWork.balance.toLocaleString('fr-MA')} DH</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <label className="text-xs font-medium block text-slate-600">Informations de Paiement</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-medium block mb-1 text-slate-600">Mode</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedWork.method || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-medium block mb-1 text-slate-600">Référence</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedWork.reference_no || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-medium block mb-1 text-slate-600">Banque</label>
                                        <p className="text-xs font-medium text-slate-700">{selectedWork.bank_name || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <label className="text-xs font-medium text-blue-400 block mb-1 text-slate-600">RIB Associé</label>
                                        <p className="text-xs font-mono font-semibold text-blue-700">{selectedWork.rib || 'Aucun RIB spécifié'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    handleEdit(selectedWork);
                                }}
                                className="flex-1 py-2 text-white rounded-lg font-medium text-sm transition-colors shadow-sm bg-slate-900 hover:bg-slate-800"
                            >
                                Modifier
                            </button>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors">
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
