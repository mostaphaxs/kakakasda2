import { useState, useMemo, useEffect } from 'react';
import {
    Scale, Gavel, FileText, Search, Plus, X,
    Users, WalletCards, Phone, MapPin, Loader2, Info, Edit, Trash2, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import CaseDocuments, { uploadCaseDocument, type PendingCaseDoc } from './common/CaseDocuments';

export type CourtType = 'CIVILE' | 'COMMERCIALE' | 'PENALE';
export type CaseStage = 'PREMIERE_INSTANCE' | 'APPEL' | 'CASSATION';

export interface LegalCase {
    id?: number | string;
    courtType: CourtType;
    fileNumber: string;
    date: string;
    next_hearing_date?: string | null; // prochaine audience
    decision: string;
    stage: CaseStage;

    // Parties
    plaintiff: string; // Demandeur / Plaignant (المشتكي)
    defendant: string; // Défendeur / Accusé (المشتكي عليه)

    // Lawyer & Finances
    lawyerName: string;
    lawyerPhone: string;
    lawyerAddress: string;
    lawyerFees: number;
    judicialFees: number;

    // File upload
    document_path?: string;
    documentFile?: File | null;
    judicial_fees_scan_path?: string;
    judicialFeesScanFile?: File | null;
    commissaire_nom: string;
    commissaire_fees: number;
    commissaire_scan_path?: string;
    commissaireScanFile?: File | null;
}

const initialFormState: Partial<LegalCase> = {
    courtType: 'CIVILE',
    stage: 'PREMIERE_INSTANCE',
    fileNumber: '',
    date: new Date().toISOString().split('T')[0],
    next_hearing_date: '',
    decision: '',
    plaintiff: '',
    defendant: '',
    lawyerName: '',
    lawyerPhone: '',
    lawyerAddress: '',
    lawyerFees: 0,
    judicialFees: 0,
    commissaire_nom: '',
    commissaire_fees: 0,
    documentFile: null,
    judicialFeesScanFile: null,
    commissaireScanFile: null
};

const Contentieux = () => {
    const [cases, setCases] = useState<LegalCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = usePersistedState('Contentieux.searchTerm', '');
    useUrlSearch(setSearchTerm);

    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
    const [formData, setFormData] = useState<Partial<LegalCase>>(initialFormState);
    const [pendingDocs, setPendingDocs] = useState<PendingCaseDoc[]>([]); // documents of a case not created yet

    const fetchCases = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/contentieux');
            setCases(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch contentieux", error);
            if (cases.length > 0) {
                toast.error("Erreur lors du chargement des dossiers contentieux.");
            }
            setCases([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const filteredCases = useMemo(() => {
        return cases.filter(c => {
            const matchesSearch =
                c.fileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.plaintiff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.defendant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.lawyerName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [cases, searchTerm]);

    const stats = useMemo(() => {
        const totalCases = cases.length;
        const totalLawyerFees = cases.reduce((acc, c) => acc + (Number(c.lawyerFees) || 0), 0);
        const totalJudicialFees = cases.reduce((acc, c) => acc + (Number(c.judicialFees) || 0), 0);
        const totalCommissaireFees = cases.reduce((acc, c) => acc + (Number(c.commissaire_fees) || 0), 0);

        return { totalCases, totalLawyerFees, totalJudicialFees, totalCommissaireFees };
    }, [cases]);

    const handleSave = async () => {
        if (!formData.fileNumber || !formData.plaintiff || !formData.defendant) {
            toast.error("Veuillez remplir les champs obligatoires (N° Dossier, Parties).");
            return;
        }

        const isEditing = !!formData.id;
        const endpoint = isEditing ? `/contentieux/${formData.id}` : '/contentieux';

        // Use FormData instead of JSON to support file uploads
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'documentFile' && formData[key]) {
                submitData.append('document', formData[key] as File);
            } else if (key === 'judicialFeesScanFile' && formData[key]) {
                submitData.append('judicial_fees_scan', formData[key] as File);
            } else if (key === 'commissaireScanFile' && formData[key]) {
                submitData.append('commissaire_scan', formData[key] as File);
            } else if (!['document_path', 'documentFile', 'judicial_fees_scan_path', 'judicialFeesScanFile', 'commissaire_scan_path', 'commissaireScanFile'].includes(key) && formData[key as keyof LegalCase] !== undefined) {
                submitData.append(key, formData[key as keyof LegalCase] as any);
            }
        });

        // We use PUT method via method spoofing in Laravel for FormData boundary issues
        if (isEditing) {
            submitData.append('_method', 'PUT');
        }

        try {
            toast.loading(isEditing ? "Modification..." : "Enregistrement...");
            const savedCase = await apiFetch<{ id: number }>(isEditing ? endpoint : '/contentieux', {
                method: 'POST', // Laravel expects POST with _method=PUT for FormData
                body: submitData
            });
            // documents added while creating the case
            let failedDocs = 0;
            if (!isEditing && savedCase?.id) {
                for (const d of pendingDocs) {
                    try { await uploadCaseDocument(savedCase.id, d); } catch { failedDocs++; }
                }
            }
            setPendingDocs([]);
            toast.dismiss();
            if (failedDocs) toast.error(`${failedDocs} document(s) non enregistré(s) — ajoutez-les depuis le dossier.`);
            toast.success(`Dossier contentieux ${isEditing ? 'modifié' : 'enregistré'} !`);
            setIsAddEditModalOpen(false);
            fetchCases();
        } catch (error) {
            toast.dismiss();
            toast.error("Erreur lors de l'enregistrement. Vérifiez l'API.");
            console.error(error);
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!await confirmDialog("Êtes-vous sûr de vouloir supprimer définitivement ce dossier contentieux ?")) {
            return;
        }

        try {
            toast.loading("Suppression...");
            await apiFetch(`/contentieux/${id}`, { method: 'DELETE' });
            toast.dismiss();
            toast.success("Dossier supprimé !");
            fetchCases();
        } catch (error) {
            toast.dismiss();
            toast.error("Erreur lors de la suppression.");
            console.error(error);
        }
    };

    const openEditModal = (c: LegalCase) => {
        setFormData({ ...c, date: c.date.split('T')[0], next_hearing_date: c.next_hearing_date ? String(c.next_hearing_date).split('T')[0] : '', documentFile: null, judicialFeesScanFile: null, commissaireScanFile: null });
        setIsAddEditModalOpen(true);
    };

    const openViewModal = (c: LegalCase) => {
        setSelectedCase(c);
        setIsViewModalOpen(true);
    };

    const getPartyLabels = (courtType: CourtType) => {
        if (courtType === 'PENALE') {
            return {
                plaintiff: 'Plaignant (المشتكي)',
                defendant: 'Accusé (المشتكي عليه)'
            };
        }
        return {
            plaintiff: 'Demandeur',
            defendant: 'Défendeur'
        };
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(Number(amount) || 0);
    };

    const labels = getPartyLabels(formData.courtType || 'CIVILE');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-amber-500" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Scale className="text-slate-400 flex-shrink-0" size={26} />
                        Affaires Juridiques
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Dossiers contentieux, audiences et frais juridiques.</p>
                </div>

                <button
                    onClick={() => {
                        setFormData({ ...initialFormState });
                        setPendingDocs([]);
                        setIsAddEditModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg shadow-sm transition active:scale-[0.98] font-medium text-sm bg-slate-900 hover:bg-slate-800"
                >
                    <Plus size={20} />
                    Nouveau Dossier
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Total Dossiers</p>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {stats.totalCases}
                    </h2>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Honoraires avocats</p>
                    <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalLawyerFees)}</h2>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Frais judiciaires & commissaires</p>
                    <h2 className="text-2xl font-bold text-slate-800 flex flex-col">
                        <span>{formatCurrency(stats.totalJudicialFees + stats.totalCommissaireFees)}</span>
                        <div className="flex gap-4 mt-1">
                            <span className="text-xs font-medium text-slate-500">Tribunal : {formatCurrency(stats.totalJudicialFees)}</span>
                            <span className="text-xs font-medium text-slate-500">Commissaire : {formatCurrency(stats.totalCommissaireFees)}</span>
                        </div>
                    </h2>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher N° dossier, plaignant, défendeur, avocat..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="">
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Tribunal / Phase</th>
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Date / N° Dossier</th>
                                <th className="min-w-[200px] whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Parties Impliquées</th>
                                <th className="min-w-[180px] whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Représentation (Avocat)</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Coûts (Frais & Hon.)</th>
                                <th className="min-w-[150px] whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Décision</th>
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredCases.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-semibold bg-white">
                                        Aucun dossier trouvé dans la base de données.
                                    </td>
                                </tr>
                            ) : (
                                filteredCases.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                        {/* Tribunal / Phase */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium ${c.courtType === 'CIVILE' ? 'bg-blue-50 text-blue-600' :
                                                    c.courtType === 'COMMERCIALE' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-rose-50 text-rose-600'
                                                    }`}>
                                                    {c.courtType}
                                                </span>
                                                <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                                    {c.stage.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Date / Num */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-semibold text-slate-800">{c.fileNumber}</span>
                                                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                                    <Scale size={10} /> {new Date(c.date).toLocaleDateString('fr-MA')}
                                                </span>
                                                {c.next_hearing_date && (
                                                    <span className="text-xs font-medium text-amber-700">
                                                        Audience : {new Date(String(c.next_hearing_date).split('T')[0] + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Parties */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    <span className="text-[8px] font-semibold text-slate-400 shrink-0">
                                                        {c.courtType === 'PENALE' ? 'Plaint.' : 'Dem.'}:
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-800 line-clamp-1 truncate">{c.plaintiff}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                                    <span className="text-[8px] font-semibold text-slate-400 shrink-0">
                                                        {c.courtType === 'PENALE' ? 'Accusé' : 'Déf.'}:
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-800 line-clamp-1 truncate">{c.defendant}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Avocat */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex gap-2">
                                                <div className="inline-flex flex-shrink-0 text-amber-600">
                                                    <Gavel size={14} />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium text-slate-800">{c.lawyerName}</span>
                                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                        <Phone size={9} /> {c.lawyerPhone}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Coûts */}
                                        <td className="px-4 py-3 align-top text-right">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-slate-900">{formatCurrency((Number(c.lawyerFees) || 0) + (Number(c.judicialFees) || 0) + (Number(c.commissaire_fees) || 0))}</span>
                                                <div className="flex flex-col text-xs font-medium text-slate-400 mt-1">
                                                    <span className="flex justify-between gap-3 font-semibold"><span>Avocat:</span> <span>{formatCurrency(c.lawyerFees)}</span></span>
                                                    <span className={`flex justify-between gap-3 px-1 rounded ${c.judicial_fees_scan_path ? 'bg-emerald-50 text-emerald-600' : ''}`}>
                                                        <span>Tribunal:</span>
                                                        <span className="flex items-center gap-1">
                                                            {c.judicial_fees_scan_path && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openExternal(encodeURI(`${STORAGE_BASE}/${c.judicial_fees_scan_path}`)); }}
                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                                    title="Voir le scan des frais"
                                                                >
                                                                    <FileText size={10} />
                                                                </button>
                                                            )}
                                                            {formatCurrency(c.judicialFees)}
                                                        </span>
                                                    </span>
                                                    {c.commissaire_fees > 0 && (
                                                        <span className={`flex justify-between gap-3 px-1 rounded ${c.commissaire_scan_path ? 'bg-blue-50 text-blue-600' : ''}`}>
                                                            <span>Commissaire:</span>
                                                            <span className="flex items-center gap-1">
                                                                {c.commissaire_scan_path && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openExternal(encodeURI(`${STORAGE_BASE}/${c.commissaire_scan_path}`)); }}
                                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                                        title="Voir le scan du commissaire"
                                                                    >
                                                                        <FileText size={10} />
                                                                    </button>
                                                                )}
                                                                {formatCurrency(c.commissaire_fees)}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Decision */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="text-xs font-medium text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg break-words">
                                                {c.decision || "En attente de décision..."}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <button onClick={() => openViewModal(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => openEditModal(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => c.id && handleDelete(c.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: View Details */}
            {isViewModalOpen && selectedCase && (
                <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[5vh] pb-4 pointer-events-auto bg-slate-950/50 animate-fade-in">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-start flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight">Détails du Dossier</h3>
                                <p className="text-white/70 text-sm font-semibold mt-1">{selectedCase.fileNumber}</p>
                            </div>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
                            <div className="flex gap-4">
                                <div className={`px-4 py-2 rounded-xl text-xs font-semibold ${selectedCase.courtType === 'CIVILE' ? 'bg-blue-50 text-blue-600' :
                                    selectedCase.courtType === 'COMMERCIALE' ? 'bg-amber-50 text-amber-600' :
                                        'bg-rose-50 text-rose-600'
                                    }`}>
                                    Tribunal {selectedCase.courtType}
                                </div>
                                <div className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold">
                                    Phase: {selectedCase.stage.replace('_', ' ')}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div className="space-y-1 border-r border-slate-200">
                                    <p className="text-xs font-semibold text-emerald-600">
                                        {selectedCase.courtType === 'PENALE' ? 'Plaignant (المشتكي)' : 'Demandeur'}
                                    </p>
                                    <p className="text-base font-semibold text-slate-800">{selectedCase.plaintiff}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-rose-600">
                                        {selectedCase.courtType === 'PENALE' ? 'Accusé (المشتكي عليه)' : 'Défendeur'}
                                    </p>
                                    <p className="text-base font-semibold text-slate-800">{selectedCase.defendant}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-slate-400">Représentation</h4>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                                        <p className="font-semibold text-amber-800 text-sm">{selectedCase.lawyerName || 'Non défini'}</p>
                                        <p className="text-xs font-medium text-amber-700 flex items-center gap-1"><Phone size={12} />{selectedCase.lawyerPhone}</p>
                                        <p className="text-xs font-medium text-amber-700 flex items-center gap-1"><MapPin size={12} />{selectedCase.lawyerAddress}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-slate-400">Coûts Associés</h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                        <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                                            <span>Honoraires:</span>
                                            <span>{formatCurrency(selectedCase.lawyerFees)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                                            <span>Frais Tribunal:</span>
                                            <div className="flex items-center gap-2">
                                                {selectedCase.judicial_fees_scan_path && (
                                                    <button
                                                        onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedCase.judicial_fees_scan_path}`))}
                                                        className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                                                        title="Voir le justificatif"
                                                    >
                                                        <FileText size={10} /> SCAN
                                                    </button>
                                                )}
                                                <span>{formatCurrency(selectedCase.judicialFees)}</span>
                                            </div>
                                        </div>
                                        {selectedCase.commissaire_fees > 0 && (
                                            <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                                                <span className="flex flex-col">
                                                    <span>Commissaire:</span>
                                                    <span className="text-xs text-slate-400">{selectedCase.commissaire_nom}</span>
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {selectedCase.commissaire_scan_path && (
                                                        <button
                                                            onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedCase.commissaire_scan_path}`))}
                                                            className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                            title="Voir le justificatif du commissaire"
                                                        >
                                                            <FileText size={10} /> SCAN
                                                        </button>
                                                    )}
                                                    <span>{formatCurrency(selectedCase.commissaire_fees)}</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center text-base font-semibold text-slate-900">
                                            <span>Coût Total:</span>
                                            <span>{formatCurrency((Number(selectedCase.lawyerFees) || 0) + (Number(selectedCase.judicialFees) || 0) + (Number(selectedCase.commissaire_fees) || 0))}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-slate-400">Jugement / Décision</h4>
                                <div className="p-4 bg-slate-50 border-l-4 border-slate-300 rounded-r-xl text-sm font-medium text-slate-600">
                                    {selectedCase.decision || "Aucune décision enregistrée."}
                                </div>
                            </div>

                            {selectedCase.id && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-400">Documents du dossier</h4>
                                    <CaseDocuments caseId={selectedCase.id} />
                                </div>
                            )}

                            {selectedCase.document_path && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-400">Document Attaché</h4>
                                    <button
                                        onClick={() => {
                                            if (selectedCase.document_path) {
                                                const url = encodeURI(`${STORAGE_BASE}/${selectedCase.document_path}`);
                                                openExternal(url);
                                            }
                                        }}
                                        className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors w-fit font-semibold"
                                    >
                                        <FileText size={20} />
                                        Consulter le Scan / Document
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-4 py-2 text-white font-medium rounded-lg transition shadow-sm active:scale-[0.98] text-sm bg-slate-900 hover:bg-slate-800"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add/Edit Case */}
            {isAddEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 duration-300 pointer-events-auto bg-slate-950/50 animate-fade-in">
                    <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl duration-300 relative pointer-events-auto ring-1 ring-slate-900/5 animate-dialog-in">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {formData.id ? 'Modifier le Dossier' : 'Nouveau Dossier'}
                                </h2>
                                <p className="text-sm font-medium text-slate-500">Saisissez les informations du dossier contentieux.</p>
                            </div>
                            <button
                                onClick={() => setIsAddEditModalOpen(false)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8">
                            {/* Section 1: Qualité & Tribunal */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                                    <Gavel size={16} className="text-amber-500" />
                                    Nature du Contentieux
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-medium text-slate-600">Type de Tribunal</label>
                                        <select
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={formData.courtType}
                                            onChange={(e) => setFormData({ ...formData, courtType: e.target.value as CourtType })}
                                        >
                                            <option value="CIVILE">Tribunal Civil</option>
                                            <option value="COMMERCIALE">Tribunal de Commerce</option>
                                            <option value="PENALE">Tribunal Pénal (Zajriya)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-medium text-slate-600">Étape / Phase</label>
                                        <select
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={formData.stage}
                                            onChange={(e) => setFormData({ ...formData, stage: e.target.value as CaseStage })}
                                        >
                                            <option value="PREMIERE_INSTANCE">1ère Instance</option>
                                            <option value="APPEL">Appel</option>
                                            <option value="CASSATION">Cassation</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-medium text-slate-600">N° Dossier / Plainte</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: CIV-2024-..."
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={formData.fileNumber}
                                            onChange={(e) => setFormData({ ...formData, fileNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-medium text-slate-600">Date d'ouverture</label>
                                        <input
                                            type="date"
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1 relative md:col-span-2">
                                        <label className="text-xs font-medium text-slate-600">Prochaine audience <span className="text-slate-400 font-normal">(rappel dans les notifications)</span></label>
                                        <input
                                            type="date"
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                            value={formData.next_hearing_date || ''}
                                            onChange={(e) => setFormData({ ...formData, next_hearing_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Parties */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                                    <Users size={16} className="text-amber-500" />
                                    Parties Impliquées
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-emerald-600 text-slate-600">{labels.plaintiff}</label>
                                        <input
                                            type="text"
                                            placeholder={labels.plaintiff}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={formData.plaintiff}
                                            onChange={(e) => setFormData({ ...formData, plaintiff: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-rose-600 text-slate-600">{labels.defendant}</label>
                                        <input
                                            type="text"
                                            placeholder={labels.defendant}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={formData.defendant}
                                            onChange={(e) => setFormData({ ...formData, defendant: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Avocat & Coûts */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                                    <WalletCards size={16} className="text-amber-500" />
                                    Représentation & Frais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                        <div className="space-y-1 relative">
                                            <label className="text-xs font-medium text-amber-700 text-slate-600">Nom de l'Avocat</label>
                                            <input
                                                type="text"
                                                placeholder="Me. Nom Prénom"
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                value={formData.lawyerName}
                                                onChange={(e) => setFormData({ ...formData, lawyerName: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1 relative">
                                                <label className="text-xs font-medium text-amber-700 text-slate-600">Téléphone</label>
                                                <input
                                                    type="tel"
                                                    placeholder="06..."
                                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                    value={formData.lawyerPhone}
                                                    onChange={(e) => setFormData({ ...formData, lawyerPhone: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1 relative">
                                                <label className="text-xs font-medium text-amber-700 text-slate-600">Bureau</label>
                                                <input
                                                    type="text"
                                                    placeholder="Adresse..."
                                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                    value={formData.lawyerAddress}
                                                    onChange={(e) => setFormData({ ...formData, lawyerAddress: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1 relative">
                                            <label className="text-xs font-medium text-slate-600"> Honoraires Avocat (MAD)</label>
                                            <input
                                                type="number"
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                value={formData.lawyerFees || ''}
                                                onChange={(e) => setFormData({ ...formData, lawyerFees: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="space-y-1 relative flex-1">
                                                <label className="text-xs font-medium text-slate-600">Frais Judiciaires (MAD)</label>
                                                <input
                                                    type="number"
                                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                    value={formData.judicialFees || ''}
                                                    onChange={(e) => setFormData({ ...formData, judicialFees: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="space-y-1 relative">
                                                <label className="text-xs font-medium text-slate-600">Justificatif (Scan)</label>
                                                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition h-[44px] ${formData.judicialFeesScanFile ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : (formData.judicial_fees_scan_path ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-400 hover:bg-slate-50')}`}>
                                                    <FileText size={16} />
                                                    <span className="text-xs font-semibold">
                                                        {formData.judicialFeesScanFile ? 'Ajouté' : (formData.judicial_fees_scan_path ? 'Modif.' : '+ Scan')}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                setFormData({ ...formData, judicialFeesScanFile: e.target.files[0] });
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 space-y-4">
                                            <div className="space-y-1 relative">
                                                <label className="text-xs font-medium text-slate-600">Commissaire Judiciaire (Nom)</label>
                                                <input
                                                    type="text"
                                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                    value={formData.commissaire_nom || ''}
                                                    onChange={(e) => setFormData({ ...formData, commissaire_nom: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="space-y-1 relative flex-1">
                                                    <label className="text-xs font-medium text-slate-600">Frais Commissaire (MAD)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                        value={formData.commissaire_fees || ''}
                                                        onChange={(e) => setFormData({ ...formData, commissaire_fees: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <div className="space-y-1 relative">
                                                    <label className="text-xs font-medium text-slate-600">Scan Commissaire</label>
                                                    <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition h-[44px] ${formData.commissaireScanFile ? 'bg-blue-50 border-blue-300 text-blue-700' : (formData.commissaire_scan_path ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-400 hover:bg-slate-50')}`}>
                                                        <FileText size={16} />
                                                        <span className="text-xs font-semibold">
                                                            {formData.commissaireScanFile ? 'Ajouté' : (formData.commissaire_scan_path ? 'Modif.' : '+ Scan')}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/*,.pdf"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files.length > 0) {
                                                                    setFormData({ ...formData, commissaireScanFile: e.target.files[0] });
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Décision & Scan */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                                    <FileText size={16} className="text-amber-500" />
                                    Suivi du Cas
                                </h3>

                                <div className="space-y-1 relative">
                                    <label className="text-xs font-medium flex items-center gap-2 text-slate-600">
                                        <Info size={14} className="text-amber-500" />
                                        Décision / Jugement
                                    </label>
                                    <textarea
                                        className="w-full min-h-[100px] resize-y pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Indiquez le jugement s'il y en a un, ou la situation actuelle..."
                                        value={formData.decision}
                                        onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1 relative">
                                    <label className="text-xs font-medium flex items-center gap-2 text-slate-600">
                                        <FileText size={14} className="text-amber-500" />
                                        Documents du dossier
                                    </label>
                                    {formData.id
                                        ? <CaseDocuments caseId={formData.id} />
                                        : <CaseDocuments pending={pendingDocs} onPendingChange={setPendingDocs} />}
                                    {formData.document_path && (
                                        <p className="text-xs text-slate-400 mt-2">L'ancien document rattaché à ce dossier reste consultable depuis la fiche du dossier.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 p-6 bg-white border-t border-slate-200 rounded-b-xl flex justify-end gap-3 z-10 pointer-events-auto">
                            <button
                                onClick={() => setIsAddEditModalOpen(false)}
                                className="px-6 py-2.5 rounded-lg font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2.5 rounded-lg font-medium text-white transition-colors shadow-sm text-sm bg-slate-900 hover:bg-slate-800"
                            >
                                {formData.id ? 'Modifier' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contentieux;
