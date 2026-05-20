import { useState, useMemo, useEffect } from 'react';
import {
    Scale, Gavel, FileText, Search, Plus, X,
    Users, WalletCards, Loader2, Edit, Trash2, Eye, Building2, TrendingUp, DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { openExternal } from '../lib/tauri';

export type CourtType = 'CIVILE' | 'COMMERCIALE' | 'PENALE';
export type CaseStage = 'PREMIERE_INSTANCE' | 'APPEL' | 'CASSATION';
export type ProceduralType = 'FOND' | 'REFERE';

export interface ContentieuxMouvement {
    id?: number;
    stage: CaseStage;
    date: string;
    description: string;
    next_date?: string;
}

export interface ContentieuxFee {
    id?: number;
    type: 'JUDICIAL' | 'BAILIFF' | 'OTHER';
    category: string;
    amount: number;
    notes?: string;
    date?: string;
}

export interface LegalCase {
    id?: number | string;
    project_name: string;
    courtType: CourtType;
    subject: string;
    lawyer_subject: string;
    procedural_type: ProceduralType;
    fileNumber: string;
    fileNumber_appel: string;
    fileNumber_cassation: string;
    decision_appel: string;
    decision_cassation: string;
    date: string;
    decision: string;
    stage: CaseStage;
    is_final_decision: boolean;
    final_decision_date: string;

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

    mouvements?: ContentieuxMouvement[];
    fees?: ContentieuxFee[];
}

const initialFormState: Partial<LegalCase> = {
    project_name: '',
    courtType: 'CIVILE',
    procedural_type: 'FOND',
    subject: '',
    lawyer_subject: '',
    stage: 'PREMIERE_INSTANCE',
    fileNumber: '',
    fileNumber_appel: '',
    fileNumber_cassation: '',
    decision_appel: '',
    decision_cassation: '',
    date: new Date().toISOString().split('T')[0],
    decision: '',
    is_final_decision: false,
    final_decision_date: '',
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
    commissaireScanFile: null,
    mouvements: [],
    fees: []
};

const Contentieux = () => {
    const [cases, setCases] = useState<LegalCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectTab, setSelectedProjectTab] = useState<string>('ALL');

    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
    const [formData, setFormData] = useState<Partial<LegalCase>>(initialFormState);

    const [newFeeType, setNewFeeType] = useState<'JUDICIAL' | 'BAILIFF' | 'OTHER'>('JUDICIAL');
    const [newFeeCategory, setNewFeeCategory] = useState('');
    const [newFeeAmount, setNewFeeAmount] = useState<number>(0);
    const [isSavingFee, setIsSavingFee] = useState(false);

    const fetchTerrains = async () => {
        try {
            const data = await apiFetch('/terrains');
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch terrains", error);
        }
    };

    const fetchCases = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/contentieux');
            setCases(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch contentieux", error);
            setCases([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
        fetchTerrains();
    }, []);

    const filteredCases = useMemo(() => {
        return cases.filter(c => {
            const matchesProject = selectedProjectTab === 'ALL' || c.project_name === selectedProjectTab;
            const matchesSearch =
                (c.fileNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.plaintiff?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.defendant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.lawyerName?.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesProject && matchesSearch;
        });
    }, [cases, searchTerm, selectedProjectTab]);

    const stats = useMemo(() => {
        const totalCases = filteredCases.length;
        const totalLawyerFees = filteredCases.reduce((acc, c) => acc + (Number(c.lawyerFees) || 0), 0);
        const totalAllFees = filteredCases.reduce((acc, c) => {
            const extraFees = (c.fees || []).reduce((sum, f) => sum + Number(f.amount), 0);
            return acc + (Number(c.lawyerFees) || 0) + extraFees;
        }, 0);
        return { totalCases, totalLawyerFees, totalAllFees };
    }, [filteredCases]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
    };

    const handleSave = async () => {
        if (!formData.fileNumber || !formData.plaintiff || !formData.defendant) {
            toast.error("Veuillez remplir les champs obligatoires (N° Dossier, Parties).");
            return;
        }

        const isEditing = !!formData.id;
        const submitData = new FormData();

        Object.keys(formData).forEach(key => {
            const val = formData[key as keyof LegalCase];
            if (key === 'documentFile' && val) submitData.append('document', val as File);
            else if (key === 'judicialFeesScanFile' && val) submitData.append('judicial_fees_scan', val as File);
            else if (key === 'commissaireScanFile' && val) submitData.append('commissaire_scan', val as File);
            else if (key === 'is_final_decision') submitData.append(key, val ? '1' : '0');
            else if (['mouvements', 'fees', 'documentFile', 'judicialFeesScanFile', 'commissaireScanFile'].includes(key)) { /* Skip */ }
            else if (!['document_path', 'judicial_fees_scan_path', 'commissaire_scan_path'].includes(key) && val !== undefined) {
                submitData.append(key, String(val));
            }
        });

        if (isEditing) submitData.append('_method', 'PUT');

        try {
            toast.loading(isEditing ? "Modification..." : "Enregistrement...");
            await apiFetch(isEditing ? `/contentieux/${formData.id}` : '/contentieux', {
                method: 'POST',
                body: submitData
            });
            toast.dismiss();
            toast.success(`Dossier ${isEditing ? 'modifié' : 'enregistré'} !`);
            setIsAddEditModalOpen(false);
            fetchCases();
        } catch (error) {
            toast.dismiss();
            toast.error("Erreur lors de l'enregistrement.");
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!window.confirm("Supprimer ce dossier ?")) return;
        try {
            await apiFetch(`/contentieux/${id}`, { method: 'DELETE' });
            toast.success("Dossier supprimé !");
            fetchCases();
        } catch (error) {
            toast.error("Erreur lors de la suppression.");
        }
    };

    const openEditModal = (c: LegalCase) => {
        setFormData({
            ...c,
            date: c.date ? c.date.split('T')[0] : '',
            documentFile: null,
            judicialFeesScanFile: null,
            commissaireScanFile: null
        });
        setIsAddEditModalOpen(true);
    };

    const handleAddFee = async () => {
        if (!formData.id || !newFeeAmount || !newFeeCategory) return;
        setIsSavingFee(true);
        try {
            const fee = await apiFetch(`/contentieux/${formData.id}/fees`, {
                method: 'POST',
                body: JSON.stringify({
                    type: newFeeType,
                    category: newFeeCategory,
                    amount: newFeeAmount,
                    date: new Date().toISOString().split('T')[0]
                })
            }) as ContentieuxFee;
            setFormData(prev => ({ ...prev, fees: [...(prev.fees || []), fee] }));
            fetchCases();
            setNewFeeCategory('');
            setNewFeeAmount(0);
            toast.success("Frais ajouté !");
        } finally {
            setIsSavingFee(false);
        }
    };

    const handleDeleteFee = async (id: number) => {
        await apiFetch(`/contentieux-fees/${id}`, { method: 'DELETE' });
        setFormData(prev => ({ ...prev, fees: prev.fees?.filter(f => f.id !== id) }));
        fetchCases();
    };

    const getPartyLabels = (courtType: CourtType) => {
        if (courtType === 'PENALE') return { plaintiff: 'Plaignant (المشتكي)', defendant: 'Accusé (المشتكي به)' };
        return { plaintiff: 'Demandeur (المدعي)', defendant: 'Défendeur (المدعى عليه)' };
    };

    const labels = getPartyLabels(formData.courtType || 'CIVILE');

    return (
        <div className="p-8 bg-[#F8FAFC] min-h-screen space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Scale className="text-amber-500" size={36} />
                        Affaires Juridiques
                    </h1>
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        Gestion du Contentieux & Suivi Judiciaire
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher par N°, Nom, Avocat..."
                            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 shadow-sm focus:border-amber-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setFormData(initialFormState); setIsAddEditModalOpen(true); }}
                        className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                        <Plus size={20} />
                        NOUVEAU DOSSIER
                    </button>
                </div>
            </div>

            {/* Project Tabs & Stats Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left: Project Tabs & List */}
                <div className="xl:col-span-9 space-y-6">
                    {/* Project Tabs */}
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit">
                        <button
                            onClick={() => setSelectedProjectTab('ALL')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedProjectTab === 'ALL' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            Tous les Projets
                        </button>
                        {projects.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProjectTab(p.nom_projet)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedProjectTab === p.nom_projet ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                {p.nom_projet}
                            </button>
                        ))}
                    </div>

                    {/* Table View */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                        {isLoading ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="text-amber-500 animate-spin" size={40} />
                                <p className="text-slate-400 font-bold animate-pulse">Chargement des dossiers...</p>
                            </div>
                        ) : filteredCases.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">N° Dossier & Date</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client / Parties</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tribunal & Phase</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredCases.map((c) => (
                                            <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800">{c.fileNumber}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{c.date}</span>
                                                        <div className="mt-1 flex gap-1">
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded-md">{c.project_name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-50 rounded-xl">
                                                            <Users size={18} className="text-emerald-500" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">{c.plaintiff}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 italic">
                                                                vs {c.defendant}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full w-fit ${c.courtType === 'PENALE' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {c.courtType} ({c.procedural_type})
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                                            <TrendingUp size={14} className="text-amber-500" />
                                                            {c.stage.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => { setSelectedCase(c); setIsViewModalOpen(true); }} className="p-2.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                                                            <Eye size={20} />
                                                        </button>
                                                        <button onClick={() => openEditModal(c)} className="p-2.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all">
                                                            <Edit size={20} />
                                                        </button>
                                                        <button onClick={() => c.id && handleDelete(c.id)} className="p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all">
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-20 flex flex-col items-center justify-center text-center opacity-40">
                                <Scale size={64} className="text-slate-400 mb-4" />
                                <p className="text-xl font-bold text-slate-500 uppercase tracking-widest">Aucun dossier trouvé</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Stats Panels */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 space-y-6">
                            <div className="p-3 bg-white/10 rounded-2xl w-fit">
                                <Scale size={32} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-amber-400/80 text-xs font-black uppercase tracking-widest mb-1">Dossiers Actifs</p>
                                <h3 className="text-5xl font-black">{stats.totalCases}</h3>
                            </div>
                        </div>
                        <div className="absolute -right-10 -bottom-10 text-white/5 group-hover:rotate-12 transition-transform duration-700">
                            <Scale size={240} />
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <DollarSign size={24} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Honoraires Totaux</p>
                                <p className="text-xl font-black text-slate-800">{formatCurrency(stats.totalLawyerFees)}</p>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-slate-50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coût Global Opérationnel</span>
                                <span className="text-xs font-black text-emerald-600">{formatCurrency(stats.totalAllFees)}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full w-2/3" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isAddEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddEditModalOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col scale-in">
                        {/* Header */}
                        <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    {formData.id ? <Edit className="text-amber-500" /> : <Plus className="text-amber-500" />}
                                    {formData.id ? 'Modifier le Dossier' : 'Nouveau Dossier Juridique'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Affaires Contentieuses</p>
                            </div>
                            <button onClick={() => setIsAddEditModalOpen(false)} className="p-3 bg-white rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Left Column: Info & Setup */}
                                <div className="space-y-8">
                                    {/* Project & Tribunal */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Building2 size={16} className="text-amber-500" />
                                            Affectation & Localisation
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Projet</label>
                                                <select
                                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20"
                                                    value={formData.project_name}
                                                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                                >
                                                    <option value="">Sélectionner un projet...</option>
                                                    {projects.map(p => (
                                                        <option key={p.id} value={p.nom_projet}>{p.nom_projet}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Type de Tribunal</label>
                                                <select
                                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800"
                                                    value={formData.courtType}
                                                    onChange={(e) => setFormData({ ...formData, courtType: e.target.value as CourtType })}
                                                >
                                                    <option value="CIVILE">Civil (مدني)</option>
                                                    <option value="COMMERCIALE">Commercial (تجاري)</option>
                                                    <option value="PENALE">Pénal (جنائي)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dossier Detail */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <FileText size={16} className="text-amber-500" />
                                            Détails du Dossier
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Type de Procédure</label>
                                                <select
                                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700"
                                                    value={formData.procedural_type}
                                                    onChange={(e) => setFormData({ ...formData, procedural_type: e.target.value as ProceduralType })}
                                                >
                                                    <option value="FOND">Fond (قضاء الموضوع)</option>
                                                    <option value="REFERE">Référé (القضاء المستعجل)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Objet du Dossier</label>
                                                <input
                                                    type="text"
                                                    placeholder="Titre..."
                                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800"
                                                    value={formData.subject}
                                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Multi-phase file numbers */}
                                        <div className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Numéros de Dossier par Phase</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-slate-400 block px-1">1ère Instance</span>
                                                    <input type="text" className="w-full px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={formData.fileNumber} onChange={e => setFormData({ ...formData, fileNumber: e.target.value })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-slate-400 block px-1">Appel</span>
                                                    <input type="text" className="w-full px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={formData.fileNumber_appel} onChange={e => setFormData({ ...formData, fileNumber_appel: e.target.value })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-slate-400 block px-1">Cassation</span>
                                                    <input type="text" className="w-full px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={formData.fileNumber_cassation} onChange={e => setFormData({ ...formData, fileNumber_cassation: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parties */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Users size={16} className="text-amber-500" />
                                            Parties Impliquées
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">{labels.plaintiff}</label>
                                                <input type="text" className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-bold" value={formData.plaintiff} onChange={e => setFormData({ ...formData, plaintiff: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1">{labels.defendant}</label>
                                                <input type="text" className="w-full px-4 py-3 bg-white border border-rose-100 rounded-xl text-sm font-bold" value={formData.defendant} onChange={e => setFormData({ ...formData, defendant: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Fees & Lawyer */}
                                <div className="space-y-8">
                                    {/* Lawyer Section */}
                                    <div className="space-y-4 bg-amber-50/50 p-6 rounded-[32px] border border-amber-100">
                                        <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                            <WalletCards size={18} />
                                            Avocat & Représentation
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nom de l'Avocat</label>
                                                <input type="text" className="w-full px-4 py-3 bg-white border border-amber-100 rounded-xl text-sm font-bold" value={formData.lawyerName} onChange={e => setFormData({ ...formData, lawyerName: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Objet de la Défense (الموضوع الموكل للمحامي)</label>
                                                <input type="text" placeholder="..." className="w-full px-4 py-3 bg-white border border-amber-100 rounded-xl text-sm font-bold" value={formData.lawyer_subject} onChange={e => setFormData({ ...formData, lawyer_subject: e.target.value })} />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Honoraires Fixés</label>
                                                    <input type="number" className="w-full px-4 py-3 bg-white border border-amber-100 rounded-xl text-sm font-bold" value={formData.lawyerFees || 0} onChange={e => setFormData({ ...formData, lawyerFees: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Tél Avocat</label>
                                                    <input type="text" className="w-full px-4 py-3 bg-white border border-amber-100 rounded-xl text-sm font-bold" value={formData.lawyerPhone} onChange={e => setFormData({ ...formData, lawyerPhone: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fees Tracker Section */}
                                    <div className="space-y-4 bg-slate-50/80 p-6 rounded-[32px] border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <TrendingUp size={18} className="text-amber-500" />
                                                Suivi des Frais (تتبع المصاريف)
                                            </h3>
                                        </div>

                                        {/* Quick Add Fee */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700"
                                                    value={newFeeType}
                                                    onChange={(e) => {
                                                        const type = e.target.value as any;
                                                        setNewFeeType(type);
                                                        setNewFeeCategory(type === 'JUDICIAL' ? 'الرسوم القضائية' : type === 'BAILIFF' ? 'أجور المفوضين' : '');
                                                    }}
                                                >
                                                    <option value="JUDICIAL">Judiciaire (قضائية)</option>
                                                    <option value="BAILIFF">Commissaire (مفوض)</option>
                                                    <option value="OTHER">Autre (أخرى)</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    placeholder="Montant (MAD)"
                                                    className="px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700"
                                                    value={newFeeAmount || ''}
                                                    onChange={(e) => setNewFeeAmount(parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={newFeeType === 'OTHER' ? "Motif / Raison..." : "Libellé de la dépense"}
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold"
                                                    value={newFeeCategory}
                                                    onChange={e => setNewFeeCategory(e.target.value)}
                                                />
                                                <button onClick={handleAddFee} disabled={isSavingFee} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase transition-transform active:scale-95 disabled:opacity-50">
                                                    {isSavingFee ? '...' : '+'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fees History List */}
                                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                            {(formData.fees || []).length > 0 ? (
                                                formData.fees?.map((f, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-black ${f.type === 'JUDICIAL' ? 'text-blue-600' : f.type === 'BAILIFF' ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                                {f.category}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400">{f.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-black text-slate-800">{formatCurrency(f.amount)}</span>
                                                            <button onClick={() => f.id && handleDeleteFee(f.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="py-8 text-[10px] font-black text-slate-400 text-center uppercase tracking-widest italic">Aucun frais enregistré</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Status & Decisions */}
                            <div className="mt-12 space-y-6 pt-8 border-t border-slate-100">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Gavel size={18} className="text-amber-500" />
                                    Phase Actuelle & Décision
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phase Actuelle (Stage)</label>
                                            <select className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-black text-slate-800" value={formData.stage || 'PREMIERE_INSTANCE'} onChange={e => setFormData({ ...formData, stage: e.target.value as CaseStage })}>
                                                <option value="PREMIERE_INSTANCE">1ère Instance (ابتدائي)</option>
                                                <option value="APPEL">Appel (استئناف)</option>
                                                <option value="CASSATION">Cassation (نقض)</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <input type="checkbox" id="is_final_1" className="w-5 h-5 rounded text-emerald-500" checked={formData.is_final_decision} onChange={e => setFormData({ ...formData, is_final_decision: e.target.checked })} />
                                            <label htmlFor="is_final_1" className="text-sm font-bold text-emerald-800 cursor-pointer">Dossier Résolu / Jugement Définitif</label>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Détails du Jugement ({(formData.stage || '').replace('_', ' ')})</label>
                                            <textarea
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 min-h-[120px]"
                                                value={formData.stage === 'PREMIERE_INSTANCE' ? formData.decision : formData.stage === 'APPEL' ? formData.decision_appel : formData.decision_cassation}
                                                onChange={e => {
                                                    const s = formData.stage || 'PREMIERE_INSTANCE';
                                                    if (s === 'PREMIERE_INSTANCE') setFormData({ ...formData, decision: e.target.value });
                                                    else if (s === 'APPEL') setFormData({ ...formData, decision_appel: e.target.value });
                                                    else setFormData({ ...formData, decision_cassation: e.target.value });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => setIsAddEditModalOpen(false)} className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all">ANNULER</button>
                            <button onClick={handleSave} className="px-10 py-3 rounded-2xl font-black bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all">
                                {formData.id ? 'MODIFIER' : 'ENREGISTRER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {isViewModalOpen && selectedCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsViewModalOpen(false)} />
                    <div className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col scale-in border border-white/20">
                        {/* High Fidelity Header */}
                        <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-[2px] rounded-full">{selectedCase.courtType}</span>
                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-[2px]">{selectedCase.project_name}</span>
                                    </div>
                                    <h2 className="text-4xl font-black tracking-tight">{selectedCase.fileNumber}</h2>
                                    <p className="text-amber-400 font-bold text-lg">{selectedCase.subject}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-[2px]">Phase Actuelle</span>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                                        <TrendingUp size={18} className="text-amber-500" />
                                        <span className="font-black text-sm uppercase tracking-widest">{(selectedCase.stage || '').replace('_', ' ')}</span>
                                    </div>
                                    {selectedCase.is_final_decision && (
                                        <div className="mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                            Dossier Résolu
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Scale className="absolute -right-16 -bottom-16 text-white/5" size={320} />
                            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Balanced Content */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Left Side: Summary & Timeline */}
                            <div className="lg:col-span-12 space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col gap-3">
                                        <Users className="text-emerald-500" size={24} />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Demandeur (المدعي)</p>
                                            <p className="text-lg font-black text-slate-800">{selectedCase.plaintiff}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col gap-3">
                                        <Users className="text-rose-500" size={24} />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Défendeur (المدعى عليه)</p>
                                            <p className="text-lg font-black text-slate-800">{selectedCase.defendant}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-amber-50/50 rounded-[32px] border border-amber-100 flex flex-col gap-3">
                                        <WalletCards className="text-amber-500" size={24} />
                                        <div>
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-1">Avocat & Objet Defence</p>
                                            <p className="text-lg font-black text-slate-800">{selectedCase.lawyerName}</p>
                                            <p className="text-xs font-bold text-amber-600 mt-1 italic">{selectedCase.lawyer_subject || 'Non spécifié'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Multi-Phase Decisions Dashboard */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                        <Gavel className="text-amber-500" />
                                        Décisions par Phase
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className={`p-6 rounded-[32px] border transition-all ${selectedCase.stage === 'PREMIERE_INSTANCE' ? 'bg-slate-900 text-white border-slate-900 shadow-2xl' : 'bg-white text-slate-800 border-slate-100 shadow-sm'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${selectedCase.stage === 'PREMIERE_INSTANCE' ? 'text-amber-400' : 'text-slate-400'}`}>1ère Instance</p>
                                            <p className="text-xs font-bold leading-relaxed">{selectedCase.decision || 'En attente...'}</p>
                                            <p className="mt-4 text-[10px] font-black opacity-50 uppercase tracking-widest">N° {selectedCase.fileNumber}</p>
                                        </div>
                                        <div className={`p-6 rounded-[32px] border transition-all ${selectedCase.stage === 'APPEL' ? 'bg-slate-900 text-white border-slate-900 shadow-2xl' : 'bg-white text-slate-800 border-slate-100 shadow-sm'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${selectedCase.stage === 'APPEL' ? 'text-amber-400' : 'text-slate-400'}`}>Appel</p>
                                            <p className="text-xs font-bold leading-relaxed">{selectedCase.decision_appel || 'Non entamé / En attente'}</p>
                                            <p className="mt-4 text-[10px] font-black opacity-50 uppercase tracking-widest">N° {selectedCase.fileNumber_appel || '-'}</p>
                                        </div>
                                        <div className={`p-6 rounded-[32px] border transition-all ${selectedCase.stage === 'CASSATION' ? 'bg-slate-900 text-white border-slate-900 shadow-2xl' : 'bg-white text-slate-800 border-slate-100 shadow-sm'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${selectedCase.stage === 'CASSATION' ? 'text-amber-400' : 'text-slate-400'}`}>Cassation</p>
                                            <p className="text-xs font-bold leading-relaxed">{selectedCase.decision_cassation || 'Non entamé / En attente'}</p>
                                            <p className="mt-4 text-[10px] font-black opacity-50 uppercase tracking-widest">N° {selectedCase.fileNumber_cassation || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Tracker Table */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                        <DollarSign className="text-emerald-500" />
                                        Historique des Paiements & Frais
                                    </h3>
                                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Catégorie</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Montant</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                <tr>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-700 italic">Honoraires d'Avocat (Total Fixé)</td>
                                                    <td className="px-8 py-4 text-xs font-bold text-slate-400">-</td>
                                                    <td className="px-8 py-4 text-sm font-black text-amber-600 text-right">{formatCurrency(selectedCase.lawyerFees)}</td>
                                                </tr>
                                                {(selectedCase.fees || []).map((f, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50">
                                                        <td className={`px-8 py-4 text-sm font-bold ${f.type === 'JUDICIAL' ? 'text-blue-600' : f.type === 'BAILIFF' ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                            {f.category}
                                                        </td>
                                                        <td className="px-8 py-4 text-xs font-bold text-slate-400">{f.date}</td>
                                                        <td className="px-8 py-4 text-sm font-black text-slate-800 text-right">{formatCurrency(f.amount)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-900 text-white">
                                                    <td className="px-8 py-5 text-sm font-black uppercase">Total des Dépenses</td>
                                                    <td className="px-8 py-5"></td>
                                                    <td className="px-8 py-5 text-lg font-black text-amber-400 text-right">
                                                        {formatCurrency((Number(selectedCase.lawyerFees) || 0) + (selectedCase.fees || []).reduce((acc, f) => acc + Number(f.amount), 0))}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                {selectedCase.document_path && (
                                    <button
                                        onClick={() => openExternal(STORAGE_BASE + selectedCase.document_path)}
                                        className="flex items-center gap-2 text-sm font-black text-slate-900 hover:text-amber-600 transition-colors"
                                    >
                                        <FileText size={20} />
                                        VOIR LE JUGEMENT (SCAN)
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black transition-all hover:bg-slate-800 active:scale-95"
                            >
                                FERMER
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contentieux;
