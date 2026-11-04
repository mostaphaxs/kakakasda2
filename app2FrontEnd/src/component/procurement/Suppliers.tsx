import React, { useState } from 'react';
import { apiFetch, STORAGE_BASE } from '../../lib/api';
import { openExternal } from '../../lib/tauri';
import { Truck, Search, PlusCircle, Trash2, Download, Edit2, X, Save, User, Phone, MapPin, Briefcase, FileText, ExternalLink, Upload, Eye, ShoppingCart, Loader2, Check, Plus, Boxes, Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmDialog } from '../common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../../lib/usePersistedState';

interface GuaranteeCheck {
    id: number;
    supplier_id: number;
    check_number: string;
    amount: number;
    bank_name: string | null;
    scan_path: string | null;
    scan_url: string | null;
    status: 'Active' | 'Returned' | 'Cashed';
    notes: string | null;
    created_at: string;
}

interface Supplier {
    id: number;
    nom_societe: string;
    type_entreprise: string | null;
    nom_gerant: string | null;
    adresse: string | null;
    tel: string | null;
    ice: string | null;
    if: string | null;
    rc: string | null;
    scan_contrat: string | null;
    description: string | null;
    rib: string | null;
    guarantee_checks?: GuaranteeCheck[];
}

const Suppliers: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = usePersistedState('Suppliers.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);

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


    // Guarantee Checks State
    const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = useState(false);
    const [newCheck, setNewCheck] = useState({ check_number: '', amount: '', bank_name: '', notes: '' });
    const [checkFile, setCheckFile] = useState<File | null>(null);
    const [isSubmittingCheck, setIsSubmittingCheck] = useState(false);


    const { register, handleSubmit, reset } = useForm();

    const { data: suppliers = [], isLoading: loading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => apiFetch<Supplier[]>('/suppliers'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiFetch(`/suppliers/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast.success('Fournisseur supprimé');
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            apiFetch(`/suppliers/${id}`, {
                method: 'POST',
                body: formData,
            }),
        onSuccess: () => {
            toast.success('Fournisseur mis à jour !');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
        onError: (error: any) => toast.error(error.message || 'Erreur lors de la mise à jour.'),
    });

    const handleDelete = async (id: number) => {
        if (!await confirmDialog('Supprimer ce fournisseur ?')) return;
        deleteMutation.mutate(id);
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setContractFile(null);
        reset({
            nom_societe: supplier.nom_societe,
            type_entreprise: supplier.type_entreprise,
            nom_gerant: supplier.nom_gerant,
            adresse: supplier.adresse,
            tel: supplier.tel,
            ice: supplier.ice,
            if: supplier.if,
            rc: supplier.rc,
            description: supplier.description,
            rib: supplier.rib || '',
        });
        setIsEditModalOpen(true);
    };

    const handleOpenDetails = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsDetailsModalOpen(true);
    };


    const onSubmitUpdate = async (data: any) => {
        if (!editingSupplier) return;
        const formData = new FormData();
        formData.append('nom_societe', data.nom_societe || '');
        formData.append('type_entreprise', data.type_entreprise || '');
        formData.append('nom_gerant', data.nom_gerant || '');
        formData.append('adresse', data.adresse || '');
        formData.append('tel', data.tel || '');
        formData.append('ice', data.ice || '');
        formData.append('if', data.if || '');
        formData.append('rc', data.rc || '');
        formData.append('description', data.description || '');
        formData.append('rib', data.rib || '');
        if (contractFile) formData.append('scan_contrat', contractFile);
        formData.append('_method', 'PUT');

        updateMutation.mutate({ id: editingSupplier.id, formData });
    };

    const handleViewContract = (path: string) => {
        if (!path) return;
        const url = encodeURI(`${STORAGE_BASE}/${path}`);
        openExternal(url);
    };

    const filtered = suppliers.filter(s =>
        s.nom_societe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.nom_gerant && s.nom_gerant.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleExport = () => {
        exportToExcel(filtered.map(s => ({
            'Raison Sociale': s.nom_societe,
            'Type': s.type_entreprise || '—',
            'Gérant': s.nom_gerant || 'N/A',
            'Tél': s.tel || 'N/A',
            'ICE': s.ice || '—',
            'I.F': s.if || '—',
            'R.C': s.rc || '—',
            'Adresse': s.adresse || 'N/A'
        })), 'fournisseurs_complet', true);
    };

    const handleAddCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier) return;
        setIsSubmittingCheck(true);
        try {
            const formData = new FormData();
            formData.append('check_number', newCheck.check_number);
            formData.append('amount', newCheck.amount);
            formData.append('bank_name', newCheck.bank_name);
            formData.append('notes', newCheck.notes);
            if (checkFile) formData.append('scan_path', checkFile);

            await apiFetch(`/suppliers/${selectedSupplier.id}/guarantee-checks`, {
                method: 'POST',
                body: formData
            });
            toast.success('Chèque de garantie ajouté !');
            setNewCheck({ check_number: '', amount: '', bank_name: '', notes: '' });
            setCheckFile(null);
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            // Refresh detail modal
            const updated = await apiFetch<Supplier>(`/suppliers/${selectedSupplier.id}`);
            setSelectedSupplier(updated);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmittingCheck(false);
        }
    };

    const deleteCheck = async (id: number) => {
        if (!await confirmDialog('Supprimer ce chèque ?')) return;
        try {
            await apiFetch(`/guarantee-checks/${id}`, { method: 'DELETE' });
            toast.success('Chèque supprimé');
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            if (selectedSupplier) {
                const updated = await apiFetch<Supplier>(`/suppliers/${selectedSupplier.id}`);
                setSelectedSupplier(updated);
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="p-4 space-y-4 bg-slate-50 min-h-screen font-sans">
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 mx-1"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2 tracking-tight">
                            <Truck className="text-slate-600 h-6 w-6" />
                            Répertoire Fournisseurs
                        </h1>
                        <p className="text-slate-500 text-xs font-medium">Base Partenaires</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition font-medium text-sm shadow-sm">
                            <Download size={18} /> Exporter
                        </button>
                        <button onClick={() => navigate('/add-supplier')} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium shadow-sm text-sm bg-slate-900 hover:bg-slate-800">
                            <PlusCircle size={16} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Rechercher par société ou gérant..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead
                        className="sticky z-20 bg-white border-b border-slate-200"
                        style={{ top: `${stickyOffset}px` }}
                    >
                        <tr>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Société / Contact</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Identifiants</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Contrat</th>
                            <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                        {loading ? (
                            <tr><td colSpan={4} className="p-10 text-center text-slate-400">Chargement...</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900 tracking-tight">{s.nom_societe}</span>
                                            {s.type_entreprise && (
                                                <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                                    {s.type_entreprise}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 flex items-center mt-0.5">
                                            <User size={10} className="mr-1" /> {s.nom_gerant || '—'} | <Phone size={10} className="mx-1" /> {s.tel || '—'}
                                            {s.guarantee_checks && s.guarantee_checks.length > 0 && (
                                                <>
                                                    <span className="mx-2 text-slate-300">|</span>
                                                    <span className="flex items-center gap-1 text-blue-600 font-semibold">
                                                        <Check size={10} strokeWidth={3} /> {s.guarantee_checks.length} GARANTIE
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-slate-500 font-mono">ICE: {s.ice || '—'}</span>
                                        <span className="text-xs text-slate-500 font-mono text-slate-400">R.C: {s.rc || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {s.scan_contrat ? (
                                        <button
                                            onClick={() => handleViewContract(s.scan_contrat!)}
                                            className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition font-medium text-sm shadow-sm"
                                        >
                                            <FileText size={14} /> Voir Contrat
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 text-xs font-medium">Aucun document</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center md:transition-opacity justify-end gap-0.5">
                                        <button onClick={() => navigate('/add-achat', { state: { supplier_id: s.id } })} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Nouvel Achat">
                                            <ShoppingCart size={16} />
                                        </button>
                                        <button onClick={() => handleOpenDetails(s)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => handleEdit(s)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <h3 className="font-semibold text-base flex items-center gap-3">
                                <Briefcase size={20} /> Modifier {editingSupplier?.nom_societe}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit(onSubmitUpdate)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><Briefcase size={12} className="mr-2" /> Société / Raison Sociale</label>
                                        <input {...register('nom_societe', { required: true })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><Boxes size={12} className="mr-2" /> Type d'entreprise (ex: Fer, Sable...)</label>
                                        <input {...register('type_entreprise')} placeholder="Type de marchandise/service" className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><User size={12} className="mr-2" /> Gérant / Contact</label>
                                        <input {...register('nom_gerant')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><Phone size={12} className="mr-2" /> Téléphone</label>
                                        <input {...register('tel')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><FileText size={12} className="mr-2" /> Scan du Contrat (PDF/Image)</label>
                                        <div className="flex flex-col gap-4">
                                            {editingSupplier?.scan_contrat && (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="hidden">
                                                            <FileText size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-400 mb-0.5">Document actuel</p>
                                                            <p className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{editingSupplier.scan_contrat.split('/').pop()}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewContract(editingSupplier.scan_contrat!)}
                                                        className="p-3 bg-white text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-100 flex items-center gap-2 font-semibold text-xs leading-none"
                                                    >
                                                        <ExternalLink size={16} /> VOIR LE CONTRAT
                                                    </button>
                                                </div>
                                            )}
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                                                    className="hidden"
                                                    id="edit-contract-upload"
                                                />
                                                <label
                                                    htmlFor="edit-contract-upload"
                                                    className="w-full h-14 bg-white border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-between px-4 hover:border-blue-400 hover:bg-slate-50 cursor-pointer transition group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Upload className="text-slate-400 group-hover:text-blue-500 transition-colors" size={20} />
                                                        <span className="text-xs font-semibold text-slate-500">
                                                            {contractFile ? contractFile.name : 'Changer ou Remplacer le document...'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-white bg-slate-800 px-3 py-1.5 rounded-lg">Parcourir</div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><MapPin size={12} className="mr-2" /> Adresse</label>
                                        <textarea
                                            {...register('adresse')}
                                            dir="auto"
                                            className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Adresse complète"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600"><FileText size={12} className="mr-2" /> Observations</label>
                                        <textarea
                                            {...register('description')}
                                            className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Notes sur le fournisseur..."
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                            <Banknote size={12} className="mr-2" /> RIB (Compte Bancaire)
                                        </label>
                                        <input
                                            {...register('rib')}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="RIB"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">ICE</label>
                                            <input {...register('ice')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">I.F</label>
                                            <input {...register('if')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">R.C</label>
                                            <input {...register('rc')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-dashed border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="hidden">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-blue-600 leading-none mb-1">Chèques de Garantie</p>
                                            <p className="text-xs font-medium text-blue-400 tracking-tight">Gérez les dépôts de sécurité pour ce partenaire</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            handleOpenDetails(editingSupplier!);
                                        }}
                                        className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium text-sm hover:bg-blue-600 hover:text-white transition shadow-sm"
                                    >
                                        Gérer les chèques
                                    </button>
                                </div>
                                <button type="submit" disabled={updateMutation.isPending} className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center space-x-3 mt-6 text-sm bg-slate-900 hover:bg-slate-800">{updateMutation.isPending ? '...' : <><Save size={20} /><span>Mettre à jour</span></>}</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsModalOpen && selectedSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg leading-none mb-1">
                                    {selectedSupplier.nom_societe}
                                </h3>
                                <p className="text-xs font-medium text-blue-600">
                                    Détails du Partenaire • ID #{selectedSupplier.id}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Gérant / Contact</label>
                                    <p className="text-sm font-semibold text-slate-700">{selectedSupplier.nom_gerant || 'Non spécifié'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Téléphone</label>
                                    <p className="text-sm font-semibold text-slate-700">{selectedSupplier.tel || 'Non spécifié'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Adresse</label>
                                    <p className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">{selectedSupplier.adresse || 'Non spécifiée'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Compte Bancaire (RIB)</label>
                                    <p className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                                        {selectedSupplier.rib || 'Aucun RIB renseigné'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">ICE / I.F / R.C</label>
                                    <p className="text-xs font-mono text-slate-500">
                                        {selectedSupplier.ice || '-'} / {selectedSupplier.if || '-'} / {selectedSupplier.rc || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1 text-slate-600">Contrat</label>
                                    {selectedSupplier.scan_contrat ? (
                                        <button onClick={() => handleViewContract(selectedSupplier.scan_contrat!)} className="text-xs font-semibold text-blue-600 hover:underline">Voir le document</button>
                                    ) : (
                                        <p className="text-xs text-slate-400">Aucun document</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-xs font-medium flex items-center gap-2 text-slate-600">
                                        <Check size={12} /> Chèques de Garantie ({selectedSupplier.guarantee_checks?.length || 0})
                                    </label>
                                    <button
                                        onClick={() => setIsGuaranteeModalOpen(true)}
                                        className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    >
                                        Gérer les chèques
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedSupplier.guarantee_checks && selectedSupplier.guarantee_checks.length > 0 ? (
                                        selectedSupplier.guarantee_checks.map(check => (
                                            <div key={check.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-slate-700">N° {check.check_number}</span>
                                                    <span className="text-xs text-slate-500 font-medium">{check.bank_name || 'Banque non spécifiée'} • {check.amount.toLocaleString()} DH</span>
                                                </div>
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {check.scan_path && (
                                                        <button onClick={() => handleViewContract(check.scan_path!)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Voir scan">
                                                            <FileText size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteCheck(check.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400">Aucun chèque de garantie enregistré.</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <label className="text-xs font-medium block mb-2 text-slate-600">Observations / Description</label>
                                <div className="p-4 bg-slate-50 rounded-xl min-h-[80px]">
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {selectedSupplier.description || 'Aucune observation particulière.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    handleEdit(selectedSupplier);
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

            {/* Guarantee Check Management Modal */}
            {isGuaranteeModalOpen && selectedSupplier && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-100">
                            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <Check size={18} className="text-blue-600" /> Nouveau Chèque de Garantie
                            </h3>
                            <button onClick={() => setIsGuaranteeModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleAddCheck} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Numéro du Chèque</label>
                                <input
                                    required
                                    type="text"
                                    value={newCheck.check_number}
                                    onChange={(e) => setNewCheck({ ...newCheck, check_number: e.target.value })}
                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-slate-600">Montant (DH)</label>
                                    <input
                                        required
                                        type="number"
                                        value={newCheck.amount}
                                        onChange={(e) => setNewCheck({ ...newCheck, amount: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-slate-600">Banque</label>
                                    <input
                                        type="text"
                                        value={newCheck.bank_name}
                                        onChange={(e) => setNewCheck({ ...newCheck, bank_name: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Notes / Observations</label>
                                <textarea
                                    value={newCheck.notes}
                                    onChange={(e) => setNewCheck({ ...newCheck, notes: e.target.value })}
                                    className="w-full resize-none tabular-nums pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-slate-600">Scan du Chèque</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={(e) => setCheckFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="guarantee-check-upload"
                                    />
                                    <label
                                        htmlFor="guarantee-check-upload"
                                        className="w-full h-12 bg-white border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-between px-4 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition"
                                    >
                                        <span className="text-xs font-medium text-slate-500 overflow-hidden truncate max-w-[200px]">
                                            {checkFile ? checkFile.name : 'Choisir un fichier...'}
                                        </span>
                                        <div className="bg-slate-800 text-white px-2 py-1 rounded text-[8px] font-semibold">Parcourir</div>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingCheck}
                                className="w-full h-10 text-white rounded-lg font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 mt-4 bg-slate-900 hover:bg-slate-800"
                            >
                                {isSubmittingCheck ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Ajouter le chèque</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>

    );
};

export default Suppliers;
