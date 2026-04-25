// src/component/Salaries.tsx
import React, { useState, useEffect } from 'react';
import {
    Plus, Loader2, Trash2, Edit2, X, User, Phone, Search, Download,
    Briefcase, GraduationCap, ShieldCheck, Eye, Info, UserCheck, FileText, Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';

interface Salarie {
    id: number;
    name: string;
    cin: string | null;
    phone: string | null;
    speciality: string;
    grade: string | null;
    education: string | null;
    monthly_salary: number;
    bank_info: string | null;
    hiring_date: string | null;
    scan_contrat: string | null;
    active: boolean;
    created_at: string;
    // Bulletin de Paie Fields
    cnss_number: string | null;
    birth_date: string | null;
    matricule: string | null;
    fonction: string | null;
    marital_status: string | null;
    address: string | null;
    // Cotisations
    jours_travail: number | null;
    salaire_base: number | null;
    taux_anciennete: number | null;
    montant_anciennete: number | null;
    anciennete_jours: number | null;
    salaire_brut: number | null;
    taux_cnss: number | null;
    retenue_cnss: number | null;
    taux_amo: number | null;
    retenue_amo: number | null;
    taux_ir: number | null;
    retenue_ir: number | null;
    // Primes
    indemnite_transport: number | null;
    prime_panier: number | null;
    prime_rendement: number | null;
    arrondis: number | null;
    // Totals & Net
    total_gains: number | null;
    total_retenues: number | null;
    net_a_payer: number | null;
    payment_method: string | null;
    payment_date: string | null;
    rib: string | null;
}

const Salaries: React.FC = () => {
    const [salaries, setSalaries] = useState<Salarie[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSalarie, setEditingSalarie] = useState<Salarie | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSalarie, setSelectedSalarie] = useState<Salarie | null>(null);

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


    const [form, setForm] = useState({
        name: '',
        cin: '',
        phone: '',
        speciality: '',
        grade: '',
        education: '',
        monthly_salary: '',
        bank_info: '',
        hiring_date: new Date().toISOString().split('T')[0],
        scan_contrat: null as File | null,
        active: true,
        // Bulletin de Paie Fields
        cnss_number: '',
        birth_date: '',
        matricule: '',
        fonction: '',
        marital_status: '',
        address: '',
        // Cotisations
        jours_travail: '26',
        salaire_base: '',
        taux_anciennete: '',
        montant_anciennete: '',
        anciennete_jours: '',
        salaire_brut: '',
        taux_cnss: '4.48',
        retenue_cnss: '',
        taux_amo: '2.26',
        retenue_amo: '',
        taux_ir: '10',
        retenue_ir: '',
        // Primes
        indemnite_transport: '',
        prime_panier: '',
        prime_rendement: '',
        arrondis: '',
        // Totals & Net
        total_gains: '',
        total_retenues: '',
        net_a_payer: '',
        payment_method: '',
        payment_date: '',
        rib: '',
    });

    const GRADUATIONS = [
        "Bac + 1", "Bac + 2", "Bac + 3", "Bac + 4", "Bac + 5", "Bac + 6", "Bac + 7", "Bac + 8", "Sans Diplôme", "Autre"
    ];

    const fetchSalaries = async () => {
        try {
            const data = await apiFetch<Salarie[]>('/salaries');
            setSalaries(data);
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des salariés');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, []);

    const resetForm = () => {
        setForm({
            name: '',
            cin: '',
            phone: '',
            speciality: '',
            grade: '',
            education: '',
            monthly_salary: '',
            bank_info: '',
            hiring_date: new Date().toISOString().split('T')[0],
            scan_contrat: null,
            active: true,
            // Bulletin de Paie Fields
            cnss_number: '',
            birth_date: '',
            matricule: '',
            fonction: '',
            marital_status: '',
            address: '',
            // Cotisations
            jours_travail: '26',
            salaire_base: '',
            taux_anciennete: '',
            montant_anciennete: '',
            anciennete_jours: '',
            salaire_brut: '',
            taux_cnss: '4.48',
            retenue_cnss: '',
            taux_amo: '2.26',
            retenue_amo: '',
            taux_ir: '10',
            retenue_ir: '',
            indemnite_transport: '',
            prime_panier: '',
            prime_rendement: '',
            arrondis: '',
            total_gains: '',
            total_retenues: '',
            net_a_payer: '',
            payment_method: '',
            payment_date: '',
            rib: '',
        });
        setEditingSalarie(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setForm({ ...form, scan_contrat: e.target.files[0] });
        }
    };

    const handleOpenModal = (salarie?: Salarie) => {
        if (salarie) {
            setEditingSalarie(salarie);
            setForm({
                name: salarie.name,
                cin: salarie.cin || '',
                phone: salarie.phone || '',
                speciality: salarie.speciality,
                grade: salarie.grade || '',
                education: salarie.education || '',
                monthly_salary: salarie.monthly_salary.toString(),
                bank_info: salarie.bank_info || '',
                hiring_date: salarie.hiring_date || '',
                scan_contrat: null,
                active: salarie.active,
                // Bulletin de Paie Fields
                cnss_number: salarie.cnss_number || '',
                birth_date: salarie.birth_date || '',
                matricule: salarie.matricule || '',
                fonction: salarie.fonction || '',
                marital_status: salarie.marital_status || '',
                address: salarie.address || '',
                // Cotisations
                jours_travail: salarie.jours_travail?.toString() || '26',
                salaire_base: salarie.salaire_base?.toString() || '',
                taux_anciennete: salarie.taux_anciennete?.toString() || '',
                montant_anciennete: salarie.montant_anciennete?.toString() || '',
                anciennete_jours: salarie.anciennete_jours?.toString() || '',
                salaire_brut: salarie.salaire_brut?.toString() || '',
                taux_cnss: salarie.taux_cnss?.toString() || '4.48',
                retenue_cnss: salarie.retenue_cnss?.toString() || '',
                taux_amo: salarie.taux_amo?.toString() || '2.26',
                retenue_amo: salarie.retenue_amo?.toString() || '',
                taux_ir: salarie.taux_ir?.toString() || '10',
                retenue_ir: salarie.retenue_ir?.toString() || '',
                indemnite_transport: salarie.indemnite_transport?.toString() || '',
                prime_panier: salarie.prime_panier?.toString() || '',
                prime_rendement: salarie.prime_rendement?.toString() || '',
                arrondis: salarie.arrondis?.toString() || '',
                total_gains: salarie.total_gains?.toString() || '',
                total_retenues: salarie.total_retenues?.toString() || '',
                net_a_payer: salarie.net_a_payer?.toString() || '',
                payment_method: salarie.payment_method || '',
                payment_date: salarie.payment_date || '',
                rib: salarie.rib || '',
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key === 'scan_contrat') {
                    if (form.scan_contrat) formData.append('scan_contrat', form.scan_contrat);
                } else if (key === 'monthly_salary') {
                    formData.append(key, parseNumber(form.monthly_salary as string).toString());
                } else if (typeof (form as any)[key] === 'boolean') {
                    formData.append(key, (form as any)[key] ? '1' : '0');
                } else {
                    formData.append(key, (form as any)[key] ?? '');
                }
            });

            // Explicitly force education to ensure it's never dropped
            formData.set('education', form.education.trim());

            if (editingSalarie) {
                // Laravel workaround for PUT/PATCH with files: use _method=PUT
                formData.append('_method', 'PUT');
                const updated = await apiFetch<Salarie>(`/salaries/${editingSalarie.id}`, {
                    method: 'POST', // Use POST with _method override
                    body: formData as any
                });
                toast.success(`Mis à jour. Education: ${updated.education || 'N/A'}`);
            } else {
                const created = await apiFetch<Salarie>('/salaries', {
                    method: 'POST',
                    body: formData as any
                });
                toast.success(`Ajouté. Education: ${created.education || 'N/A'}`);
            }
            setIsModalOpen(false);
            fetchSalaries();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce salarié ?')) return;
        try {
            await apiFetch(`/salaries/${id}`, { method: 'DELETE' });
            toast.success('Salarié supprimé');
            fetchSalaries();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const filteredSalaries = salaries.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.speciality.toLowerCase().includes(search.toLowerCase()) ||
        (s.cin && s.cin.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Chargement des salariés...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1 flex flex-col justify-center space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Salariés
                        <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full">{salaries.length}</span>
                    </h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest ml-1">Gestion des Ressources Humaines</p>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-5 shadow-sm group hover:border-indigo-100 transition-all">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Masse Salariale</p>
                            <p className="text-xl font-black text-slate-900 tabular-nums">
                                {salaries.reduce((acc, s) => acc + Number(s.monthly_salary || 0), 0).toLocaleString('fr-MA')} <span className="text-[10px]">DH/mois</span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-5 shadow-sm group hover:border-emerald-100 transition-all">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Niveau Moyen</p>
                            <p className="text-xl font-black text-slate-900 italic">Cadre / Technicien</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <button
                        onClick={() => handleOpenModal()}
                        className="h-14 px-8 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl shadow-slate-100 flex items-center gap-3 hover:-translate-y-1"
                    >
                        <Plus size={18} />
                        Nouveau Salarié
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-gray-200/50 flex flex-col md:flex-row gap-4 items-center justify-between mx-1"
            >
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, spécialité, cin..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => exportToExcel(salaries, "Liste_Salaries")}
                        className="flex-1 md:flex-none h-12 px-6 bg-emerald-50 text-emerald-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Excel
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl italic mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead
                            className="sticky z-20 bg-white border-b border-gray-100 shadow-sm"
                            style={{ top: `${stickyOffset}px` }}
                        >
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identité</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Spécialité & Grade</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Formation</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Salaire Mensuel</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSalaries.map((salarie) => (
                                <tr key={salarie.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-black text-lg">
                                                {salarie.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase tracking-tight">{salarie.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                                                        <ShieldCheck size={12} className="text-indigo-400" />
                                                        {salarie.cin || 'N/A'}
                                                    </span>
                                                    {salarie.phone && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase border-l border-gray-200 pl-3">
                                                            <Phone size={12} className="text-gray-400" />
                                                            {salarie.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                                            {salarie.speciality}
                                        </span>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 ml-1">
                                            Grade: <span className="text-indigo-600">{salarie.grade || 'Non spécifié'}</span>
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 font-black text-[9px] uppercase">
                                            <GraduationCap size={12} />
                                            {salarie.education || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 font-black text-xs tabular-nums shadow-sm">
                                            {Number(salarie.monthly_salary).toLocaleString('fr-MA')} <span className="text-[9px]">DH</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {salarie.scan_contrat ? (
                                            <button
                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${salarie.scan_contrat}`))}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 font-black text-[9px] uppercase hover:bg-blue-100 transition-all"
                                            >
                                                <FileText size={12} />
                                                Contrat
                                            </button>
                                        ) : (
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">Aucun scan</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedSalarie(salarie);
                                                    setIsDetailsModalOpen(true);
                                                }}
                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all group"
                                                title="Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(salarie)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(salarie.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upsert Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                                    {editingSalarie ? <Edit2 size={20} /> : <Plus size={20} />}
                                </div>
                                <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">
                                    {editingSalarie ? 'Modifier le Salarié' : 'Nouveau Salarié'}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-100">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-full">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Nom Complet</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Nom et prénom"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">CIN</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.cin}
                                            onChange={(e) => setForm({ ...form, cin: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Carte d'identité"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Date de Naissance</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={form.birth_date}
                                            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Situation Familiale</label>
                                    <div className="relative">
                                        <select
                                            value={form.marital_status}
                                            onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner...</option>
                                            <option value="Célibataire">Célibataire</option>
                                            <option value="Marié(e)">Marié(e)</option>
                                            <option value="Divorcé(e)">Divorcé(e)</option>
                                            <option value="Veuf(ve)">Veuf(ve)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="06..."
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Adresse</label>
                                    <textarea
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700 resize-none h-24"
                                        placeholder="Ex: 84, Rue Prince Moulay Abdellah, Casablanca"
                                    ></textarea>
                                </div>

                                {/* Professional Details Header */}
                                <div className="col-span-full mt-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-px bg-gradient-to-r from-gray-100 to-transparent"></div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Informations Professionnelles</span>
                                        <div className="flex-1 h-px bg-gradient-to-l from-gray-100 to-transparent"></div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Matricule</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.matricule}
                                            onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Ex: 63"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">N° CNSS</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.cnss_number}
                                            onChange={(e) => setForm({ ...form, cnss_number: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Ex: 188944609"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Spécialité / Département</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={form.speciality}
                                            onChange={(e) => setForm({ ...form, speciality: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Ex: Comptabilité, Ingénierie..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Fonction (Détail)</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.fonction}
                                            onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Ex: Stagiaire, Assistant..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Grade</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.grade}
                                            onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                                            placeholder="Ex: Senior, Junior, Chef"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Formation / Niveau</label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <select
                                            value={form.education}
                                            onChange={(e) => setForm({ ...form, education: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner un niveau...</option>
                                            {GRADUATIONS.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Salaire Mensuel (DH)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs uppercase">DH</span>
                                        <input
                                            type="text"
                                            required
                                            value={form.monthly_salary}
                                            onChange={(e) => setForm({ ...form, monthly_salary: formatNumber(e.target.value) })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black text-lg text-emerald-600"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1 flex items-center">
                                        <Banknote size={14} className="mr-2" /> Informations Bancaires / RIB
                                    </label>
                                    <input
                                        type="text"
                                        value={form.bank_info}
                                        onChange={(e) => setForm({ ...form, bank_info: e.target.value })}
                                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm tracking-wider"
                                        placeholder="Banque, Agence, RIB..."
                                    />
                                </div>

                                {/* ── BULLETIN DE PAIE ──────────────────────────── */}
                                <div className="col-span-full">
                                    <div className="flex items-center gap-3 mb-4 mt-2">
                                        <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent"></div>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] px-2">Bulletin de Paie</span>
                                        <div className="flex-1 h-px bg-gradient-to-l from-indigo-200 to-transparent"></div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                        {/* Header */}
                                        <div className="grid grid-cols-6 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest text-center">
                                            <div className="px-4 py-2.5 col-span-2 text-left">Désignation</div>
                                            <div className="px-4 py-2.5">Base</div>
                                            <div className="px-4 py-2.5">Taux</div>
                                            <div className="px-4 py-2.5">Gains</div>
                                            <div className="px-4 py-2.5">Retenues</div>
                                        </div>

                                        {/* Salaire de base */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase col-span-2">Salaire de Base</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.jours_travail} onChange={e => setForm({ ...form, jours_travail: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-center outline-none focus:border-indigo-400" />
                                                    <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">J</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2 text-[9px] text-gray-400 text-center font-bold">—</div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.salaire_base} onChange={e => setForm({ ...form, salaire_base: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right outline-none focus:border-indigo-400" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-2"></div>
                                        </div>

                                        {/* Ancienneté */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase col-span-2 pl-4">Ancienneté</div>
                                            <div className="px-2 py-2 text-[9px] text-gray-400 text-center font-bold">—</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_anciennete} onChange={e => setForm({ ...form, taux_anciennete: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-center outline-none focus:border-indigo-400" />
                                                    <span className="text-[9px] text-gray-400 font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.montant_anciennete} onChange={e => setForm({ ...form, montant_anciennete: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right outline-none focus:border-indigo-400" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-2"></div>
                                        </div>

                                        {/* Salaire brut global */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center bg-indigo-50/50">
                                            <div className="px-4 py-2 text-[10px] font-black text-indigo-700 uppercase col-span-2">Salaire Brut Global</div>
                                            <div className="px-2 py-2 col-span-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.salaire_brut} onChange={e => setForm({ ...form, salaire_brut: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-indigo-200 text-xs font-black text-right outline-none focus:border-indigo-500 text-indigo-700" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-2"></div>
                                        </div>

                                        {/* Sécurité Sociale */}
                                        <div className="px-4 py-1.5 bg-slate-100/80 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-200">Sécurité Sociale</div>
                                        {/* CNSS */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-[10px] font-bold text-slate-600 uppercase col-span-2 pl-8">CNSS</div>
                                            <div className="px-2 py-2 text-center text-xs font-medium text-slate-400">########</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_cnss} onChange={e => setForm({ ...form, taux_cnss: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-center outline-none focus:border-indigo-400" />
                                                    <span className="text-[9px] text-gray-400 font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.retenue_cnss} onChange={e => setForm({ ...form, retenue_cnss: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-red-50 border border-red-100 text-xs font-bold text-right outline-none focus:border-red-400 text-red-600" placeholder="0.00" />
                                            </div>
                                        </div>
                                        {/* AMO */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-[10px] font-bold text-slate-600 uppercase col-span-2 pl-8">AMO</div>
                                            <div className="px-2 py-2 text-center text-xs font-medium text-slate-400">########</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_amo} onChange={e => setForm({ ...form, taux_amo: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-center outline-none focus:border-indigo-400" />
                                                    <span className="text-[9px] text-gray-400 font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.retenue_amo} onChange={e => setForm({ ...form, retenue_amo: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-red-50 border border-red-100 text-xs font-bold text-right outline-none focus:border-red-400 text-red-600" placeholder="0.00" />
                                            </div>
                                        </div>

                                        {/* Impôts et Taxes */}
                                        <div className="px-4 py-1.5 bg-slate-100/80 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-200">Impôts et Taxes</div>
                                        {/* IR */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-[10px] font-bold text-slate-600 uppercase col-span-2 pl-8">I.R.</div>
                                            <div className="px-2 py-2 text-[9px] text-gray-400 text-center font-bold">—</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_ir} onChange={e => setForm({ ...form, taux_ir: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-center outline-none focus:border-indigo-400" />
                                                    <span className="text-[9px] text-gray-400 font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.retenue_ir} onChange={e => setForm({ ...form, retenue_ir: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-red-50 border border-red-100 text-xs font-bold text-right outline-none focus:border-red-400 text-red-600" placeholder="0.00" />
                                            </div>
                                        </div>

                                        {/* Primes et Indemnités */}
                                        <div className="px-4 py-1.5 bg-slate-100/80 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-200">Primes et Indemnités</div>
                                        {[
                                            { label: 'Indemnité de Transport', key: 'indemnite_transport' },
                                            { label: 'Prime de Panier', key: 'prime_panier' },
                                            { label: 'Prime de Rendement', key: 'prime_rendement' },
                                            { label: 'Arrondis', key: 'arrondis' },
                                        ].map(({ label, key }) => (
                                            <div key={key} className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                                <div className="px-4 py-2 text-[10px] font-bold text-slate-600 uppercase col-span-2 pl-8">{label}</div>
                                                <div className="px-2 py-2 col-span-2"></div>
                                                <div className="px-2 py-2">
                                                    <input type="number" step="0.01" value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-right outline-none focus:border-indigo-400" placeholder="0.00" />
                                                </div>
                                                <div className="px-2 py-2"></div>
                                            </div>
                                        ))}

                                        {/* Totals */}
                                        <div className="grid grid-cols-6 border-b border-slate-300 items-center bg-slate-100/80">
                                            <div className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase col-span-2">TOTAL des Gains / Retenues</div>
                                            <div className="px-2 py-3 col-span-2"></div>
                                            <div className="px-2 py-3">
                                                <input type="number" step="0.01" value={form.total_gains} onChange={e => setForm({ ...form, total_gains: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-300 text-xs font-black text-right outline-none focus:border-indigo-500 text-slate-800" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-3">
                                                <input type="number" step="0.01" value={form.total_retenues} onChange={e => setForm({ ...form, total_retenues: e.target.value })} className="w-full h-8 px-2 rounded-lg bg-white border border-slate-300 text-xs font-black text-right outline-none focus:border-red-500 text-red-600" placeholder="0.00" />
                                            </div>
                                        </div>

                                        {/* Net à payer */}
                                        <div className="grid grid-cols-6 items-center bg-emerald-600 text-white">
                                            <div className="px-4 py-3 text-[11px] font-black uppercase tracking-widest col-span-2">Net à Payer</div>
                                            <div className="px-2 py-3 col-span-2 text-right text-[10px] font-bold text-emerald-200">Total Net DH</div>
                                            <div className="px-2 py-3 col-span-2">
                                                <input type="number" step="0.01" value={form.net_a_payer} onChange={e => setForm({ ...form, net_a_payer: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-emerald-700/50 border border-emerald-500/50 text-base font-black text-right text-white placeholder:text-white/60 outline-none focus:bg-emerald-700/80" placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment details for bulletin */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Mode de Paiement & RIB</label>
                                            <div className="flex gap-2">
                                                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-1/3 px-3 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-xs text-gray-700">
                                                    <option value="">Sélectionner</option>
                                                    <option value="Virement bancaire">Virement bancaire</option>
                                                    <option value="Espèces">Espèces</option>
                                                    <option value="Chèque">Chèque</option>
                                                </select>
                                                <input type="text" value={form.rib} onChange={e => setForm({ ...form, rib: e.target.value })} className="w-2/3 px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs text-gray-700" placeholder="N° RIB / Chèque..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Début de Paie / Prochain Paiement</label>
                                            <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700" />
                                            {form.payment_date && (
                                                <p className="text-[9px] font-bold text-indigo-400 mt-2 ml-1 italic">
                                                    Cycle mensuel : le prochain sera vers le {new Date(new Date(form.payment_date).setMonth(new Date(form.payment_date).getMonth() + 1)).toLocaleDateString('fr-MA')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Scan du Contrat (PDF, Image)</label>
                                    <div className="relative group/file">
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".pdf,image/*"
                                            className="hidden"
                                            id="contract-upload"
                                        />
                                        <label
                                            htmlFor="contract-upload"
                                            className="flex flex-col items-center justify-center w-full min-h-[120px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-white hover:border-indigo-400 transition-all group-hover/file:shadow-inner"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <div className="p-3 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors mb-3">
                                                    <Download size={24} />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                                    {form.scan_contrat ? (
                                                        <span className="text-indigo-600">✓ {form.scan_contrat.name}</span>
                                                    ) : (
                                                        "Cliquer pour uploader le scan"
                                                    )}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter mt-1 italic">PDF, PNG, JPG (Max 5Mo)</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><UserCheck size={20} /> <span>Enregistrer</span></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsModalOpen && selectedSalarie && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                        <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{selectedSalarie.name}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 italic">
                                        {selectedSalarie.speciality}
                                    </span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Fiche Salarié #{selectedSalarie.id} • CIN: {selectedSalarie.cin || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-3 bg-white text-gray-400 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Salaire Mensuel</p>
                                    <p className="text-2xl font-black text-slate-800">{Number(selectedSalarie.monthly_salary).toLocaleString('fr-MA')} <span className="text-sm">DH</span></p>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Niveau Études</p>
                                    <p className="text-2xl font-black text-indigo-600 italic">{selectedSalarie.education || 'N/A'}</p>
                                </div>
                                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Statut</p>
                                    <p className="text-2xl font-black text-emerald-600 uppercase italic">Actif</p>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Info size={20} />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Informations Détaillées</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fonction & Grade</p>
                                        <p className="font-bold text-gray-800 text-sm uppercase italic">
                                            {selectedSalarie.fonction || selectedSalarie.speciality}
                                            {selectedSalarie.grade ? ` - ${selectedSalarie.grade}` : ''}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matricule & CNSS</p>
                                        <p className="font-bold text-gray-800 text-sm">
                                            MAT: <span className="text-indigo-600">{selectedSalarie.matricule || 'N/A'}</span> / CNSS: <span className="text-indigo-600">{selectedSalarie.cnss_number || 'N/A'}</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Naissance & Statut</p>
                                        <p className="font-bold text-gray-800 text-sm">
                                            {selectedSalarie.birth_date ? new Date(selectedSalarie.birth_date).toLocaleDateString() : 'N/A'}
                                            {selectedSalarie.marital_status ? ` • ${selectedSalarie.marital_status}` : ''}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Téléphone</p>
                                        <p className="font-bold text-gray-800 text-sm">{selectedSalarie.phone || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-full">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adresse Complète</p>
                                        <p className="font-medium text-gray-700 text-sm">{selectedSalarie.address || 'Aucune adresse renseignée'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-full">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informations de Paiement & Cycle</p>
                                        <div className="flex flex-col md:flex-row gap-4 mt-2">
                                            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Mode & Cycle</p>
                                                <p className="font-bold text-gray-800 text-sm">
                                                    {selectedSalarie.payment_method || 'Mode de paiement non spécifié'}
                                                    {selectedSalarie.payment_date && ` • Début: ${new Date(selectedSalarie.payment_date).toLocaleDateString('fr-MA')}`}
                                                </p>
                                            </div>
                                            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Coordonnées Bancaires</p>
                                                <p className="font-bold text-gray-800 text-sm font-mono tracking-wider">
                                                    {selectedSalarie.rib || selectedSalarie.bank_info || 'Aucun RIB renseigné'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedSalarie.scan_contrat && (
                                        <div className="space-y-2 col-span-full">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Contractuel</p>
                                            <button
                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedSalarie.scan_contrat}`))}
                                                className="w-full flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-all"
                                            >
                                                <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-black text-blue-900 uppercase">Voir le scan du contrat</p>
                                                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest italic">Ouvrir dans la visionneuse</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Salaries;
