import React, { useState } from 'react';
import { apiFetch, STORAGE_BASE } from '../../lib/api';
import { openExternal } from '../../lib/tauri';
import { Truck, Search, PlusCircle, Trash2, Download, Edit2, X, Save, User, Phone, MapPin, Briefcase, FileText, ExternalLink, Upload, Eye, ShoppingCart, Loader2, Check, Plus, Boxes, Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);

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
        if (!confirm('Supprimer ce fournisseur ?')) return;
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
        if (!confirm('Supprimer ce chèque ?')) return;
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
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen font-sans">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Truck className="text-slate-600 h-6 w-6" />
                            Répertoire Fournisseurs
                        </h1>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest italic">Base Partenaires</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-black text-xs uppercase tracking-widest shadow-sm">
                            <Download size={18} /> Exporter
                        </button>
                        <button onClick={() => navigate('/add-supplier')} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-black transition font-black shadow-lg shadow-slate-100 text-[10px] uppercase tracking-widest">
                            <PlusCircle size={16} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Rechercher par société ou gérant..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-4 py-2.5">Société / Contact</th>
                            <th className="px-4 py-2.5">Identifiants</th>
                            <th className="px-4 py-2.5">Contrat</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic font-medium">
                        {loading ? (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400">Chargement...</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-900 uppercase tracking-tight">{s.nom_societe}</span>
                                            {s.type_entreprise && (
                                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-slate-200">
                                                    {s.type_entreprise}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 flex items-center mt-0.5 uppercase">
                                            <User size={10} className="mr-1" /> {s.nom_gerant || '—'} | <Phone size={10} className="mx-1" /> {s.tel || '—'}
                                            {s.guarantee_checks && s.guarantee_checks.length > 0 && (
                                                <>
                                                    <span className="mx-2 text-gray-300">|</span>
                                                    <span className="flex items-center gap-1 text-blue-600 font-black">
                                                        <Check size={10} strokeWidth={3} /> {s.guarantee_checks.length} GARANTIE
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-slate-500 font-mono">ICE: {s.ice || '—'}</span>
                                        <span className="text-[10px] text-slate-500 font-mono italic text-gray-400">R.C: {s.rc || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {s.scan_contrat ? (
                                        <button
                                            onClick={() => handleViewContract(s.scan_contrat!)}
                                            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                                        >
                                            <FileText size={14} /> Voir Contrat
                                        </button>
                                    ) : (
                                        <span className="text-gray-300 text-[10px] uppercase font-bold tracking-widest">Aucun document</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => navigate('/add-achat', { state: { supplier_id: s.id } })} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shadow-sm bg-white border border-emerald-100" title="Nouvel Achat">
                                            <ShoppingCart size={16} />
                                        </button>
                                        <button onClick={() => handleOpenDetails(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm bg-white border border-blue-100" title="Détails">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => handleEdit(s)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-sm bg-white border border-indigo-100" title="Modifier">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Supprimer">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
                            <h3 className="font-black text-base uppercase tracking-widest flex items-center gap-3">
                                <Briefcase size={20} /> Modifier {editingSupplier?.nom_societe}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit(onSubmitUpdate)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Briefcase size={12} className="mr-2" /> Société / Raison Sociale</label>
                                        <input {...register('nom_societe', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Boxes size={12} className="mr-2" /> Type d'entreprise (ex: Fer, Sable...)</label>
                                        <input {...register('type_entreprise')} placeholder="Type de marchandise/service" className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><User size={12} className="mr-2" /> Gérant / Contact</label>
                                        <input {...register('nom_gerant')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Phone size={12} className="mr-2" /> Téléphone</label>
                                        <input {...register('tel')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><FileText size={12} className="mr-2" /> Scan du Contrat (PDF/Image)</label>
                                        <div className="flex flex-col gap-4">
                                            {editingSupplier?.scan_contrat && (
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                                                            <FileText size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Document actuel</p>
                                                            <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{editingSupplier.scan_contrat.split('/').pop()}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewContract(editingSupplier.scan_contrat!)}
                                                        className="p-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest leading-none"
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
                                                    className="w-full h-14 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-between px-4 hover:border-indigo-400 hover:bg-slate-50 cursor-pointer transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Upload className="text-gray-400 group-hover:text-indigo-500 transition-colors" size={20} />
                                                        <span className="text-xs font-black text-gray-500 uppercase">
                                                            {contractFile ? contractFile.name : 'Changer ou Remplacer le document...'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-black text-white bg-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-widest">Parcourir</div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><MapPin size={12} className="mr-2" /> Adresse</label>
                                        <textarea
                                            {...register('adresse')}
                                            dir="auto"
                                            className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none h-32 resize-none shadow-sm"
                                            placeholder="Adresse complète"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><FileText size={12} className="mr-2" /> Observations</label>
                                        <textarea
                                            {...register('description')}
                                            className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none h-20 resize-none shadow-sm"
                                            placeholder="Notes sur le fournisseur..."
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                            <Banknote size={12} className="mr-2" /> RIB (Compte Bancaire)
                                        </label>
                                        <input
                                            {...register('rib')}
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white transition-all font-mono text-xs outline-none shadow-sm"
                                            placeholder="RIB"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ICE</label>
                                            <input {...register('ice')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">I.F</label>
                                            <input {...register('if')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">R.C</label>
                                            <input {...register('rc')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs outline-none shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-dashed border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Chèques de Garantie</p>
                                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter italic">Gérez les dépôts de sécurité pour ce partenaire</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            handleOpenDetails(editingSupplier!);
                                        }}
                                        className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        Gérer les chèques
                                    </button>
                                </div>
                                <button type="submit" disabled={updateMutation.isPending} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center space-x-3 mt-6">{updateMutation.isPending ? '...' : <><Save size={20} /><span>Mettre à jour</span></>}</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsModalOpen && selectedSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest leading-none mb-1">
                                    {selectedSupplier.nom_societe}
                                </h3>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                    Détails du Partenaire • ID #{selectedSupplier.id}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Gérant / Contact</label>
                                    <p className="text-sm font-bold text-gray-700">{selectedSupplier.nom_gerant || 'Non spécifié'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Téléphone</label>
                                    <p className="text-sm font-bold text-gray-700">{selectedSupplier.tel || 'Non spécifié'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Adresse</label>
                                    <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap">{selectedSupplier.adresse || 'Non spécifiée'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Compte Bancaire (RIB)</label>
                                    <p className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                                        {selectedSupplier.rib || 'Aucun RIB renseigné'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">ICE / I.F / R.C</label>
                                    <p className="text-xs font-mono text-gray-500">
                                        {selectedSupplier.ice || '-'} / {selectedSupplier.if || '-'} / {selectedSupplier.rc || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1 tracking-widest">Contrat</label>
                                    {selectedSupplier.scan_contrat ? (
                                        <button onClick={() => handleViewContract(selectedSupplier.scan_contrat!)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Voir le document</button>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Aucun document</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Check size={12} /> Chèques de Garantie ({selectedSupplier.guarantee_checks?.length || 0})
                                    </label>
                                    <button
                                        onClick={() => setIsGuaranteeModalOpen(true)}
                                        className="text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    >
                                        Gérer les chèques
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedSupplier.guarantee_checks && selectedSupplier.guarantee_checks.length > 0 ? (
                                        selectedSupplier.guarantee_checks.map(check => (
                                            <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-700 uppercase">N° {check.check_number}</span>
                                                    <span className="text-[10px] text-gray-500 font-bold">{check.bank_name || 'Banque non spécifiée'} • {check.amount.toLocaleString()} DH</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {check.scan_path && (
                                                        <button onClick={() => handleViewContract(check.scan_path!)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Voir scan">
                                                            <FileText size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteCheck(check.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-gray-400 italic">Aucun chèque de garantie enregistré.</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Observations / Description</label>
                                <div className="p-4 bg-gray-50 rounded-2xl min-h-[80px]">
                                    <p className="text-xs text-gray-600 italic leading-relaxed">
                                        {selectedSupplier.description || 'Aucune observation particulière.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    handleEdit(selectedSupplier);
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

            {/* Guarantee Check Management Modal */}
            {isGuaranteeModalOpen && selectedSupplier && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-100">
                            <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest flex items-center gap-2">
                                <Check size={18} className="text-blue-600" /> Nouveau Chèque de Garantie
                            </h3>
                            <button onClick={() => setIsGuaranteeModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddCheck} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Numéro du Chèque</label>
                                <input
                                    required
                                    type="text"
                                    value={newCheck.check_number}
                                    onChange={(e) => setNewCheck({ ...newCheck, check_number: e.target.value })}
                                    className="w-full h-11 px-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl font-bold text-sm transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Montant (DH)</label>
                                    <input
                                        required
                                        type="number"
                                        value={newCheck.amount}
                                        onChange={(e) => setNewCheck({ ...newCheck, amount: e.target.value })}
                                        className="w-full h-11 px-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl font-bold text-sm transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Banque</label>
                                    <input
                                        type="text"
                                        value={newCheck.bank_name}
                                        onChange={(e) => setNewCheck({ ...newCheck, bank_name: e.target.value })}
                                        className="w-full h-11 px-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl font-bold text-sm transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes / Observations</label>
                                <textarea
                                    value={newCheck.notes}
                                    onChange={(e) => setNewCheck({ ...newCheck, notes: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl font-bold text-sm transition-all outline-none h-20 resize-none tabular-nums"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Scan du Chèque</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={(e) => setCheckFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="guarantee-check-upload"
                                    />
                                    <label
                                        htmlFor="guarantee-check-upload"
                                        className="w-full h-12 bg-white border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-between px-4 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
                                    >
                                        <span className="text-[10px] font-bold text-gray-500 overflow-hidden truncate max-w-[200px]">
                                            {checkFile ? checkFile.name : 'Choisir un fichier...'}
                                        </span>
                                        <div className="bg-slate-800 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Parcourir</div>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingCheck}
                                className="w-full h-12 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 mt-4"
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
