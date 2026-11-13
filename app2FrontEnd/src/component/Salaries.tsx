// src/component/Salaries.tsx
import React, { useState, useEffect } from 'react';
import {
    Plus, Loader2, Trash2, Edit2, X, User, Phone, Search, Download,
    Briefcase, GraduationCap, ShieldCheck, Eye, Info, UserCheck, FileText, Banknote,
    Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber, parseDate } from '../lib/utils';
import { openExternal } from '../lib/tauri';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';

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
    const [search, setSearch] = usePersistedState('Salaries.search', '');
    useUrlSearch(setSearch);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSalarie, setEditingSalarie] = useState<Salarie | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
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

    const handlePrintBulletin = (salarie: Salarie) => {
        setSelectedSalarie(salarie);
        setIsBulletinModalOpen(true);
    };

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
        if (!await confirmDialog('Êtes-vous sûr de vouloir supprimer ce salarié ?')) return;
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
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-sm font-semibold text-slate-400 animate-pulse">Chargement des salariés...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <UserCheck className="text-slate-400 flex-shrink-0" size={26} /> Salariés
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 tabular-nums">{salaries.length}</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gestion des ressources humaines et des bulletins.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 text-white rounded-lg font-medium text-sm transition flex items-center gap-2 bg-slate-900 hover:bg-slate-800"
                >
                    <Plus size={16} /> Nouveau Salarié
                </button>
            </div>

            {/* Key figures */}
            <section className="bg-white rounded-xl border border-slate-200 grid grid-cols-2">
                <div className="p-5">
                    <p className="text-sm text-slate-500">Masse salariale</p>
                    <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                        {salaries.reduce((acc, s) => acc + Number(s.monthly_salary || 0), 0).toLocaleString('fr-MA')}<span className="ml-1 text-sm font-medium text-slate-400">DH / mois</span>
                    </p>
                </div>
                <div className="p-5 border-l border-slate-200">
                    <p className="text-sm text-slate-500">Effectif</p>
                    <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{salaries.length}<span className="ml-1 text-sm font-medium text-slate-400">salarié(s)</span></p>
                </div>
            </section>

            {/* Filters and Search */}
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between mx-1"
            >
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, spécialité, cin..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => exportToExcel(salaries, "Liste_Salaries")}
                        className="flex-1 md:flex-none h-12 px-6 bg-emerald-50 text-emerald-600 rounded-lg font-semibold text-xs hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Excel
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead
                            className="sticky z-20 bg-white border-b border-slate-200"
                            style={{ top: `${stickyOffset}px` }}
                        >
                            <tr className="">
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Identité</th>
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Spécialité & Grade</th>
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Formation</th>
                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Salaire Mensuel</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSalaries.map((salarie) => (
                                <tr key={salarie.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 font-semibold text-lg">
                                                {salarie.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 tracking-tight">{salarie.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                                        <ShieldCheck size={12} className="text-blue-400" />
                                                        {salarie.cin || 'N/A'}
                                                    </span>
                                                    {salarie.phone && (
                                                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 border-l border-slate-200 pl-3">
                                                            <Phone size={12} className="text-slate-400" />
                                                            {salarie.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-900 text-white">
                                            {salarie.speciality}
                                        </span>
                                        <p className="text-xs font-medium text-slate-400 mt-1.5 ml-1">
                                            Grade: <span className="text-blue-600">{salarie.grade || 'Non spécifié'}</span>
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 font-semibold text-xs">
                                            <GraduationCap size={12} />
                                            {salarie.education || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 font-semibold text-xs tabular-nums shadow-sm">
                                            {Number(salarie.monthly_salary).toLocaleString('fr-MA')} <span className="text-[9px]">DH</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {salarie.scan_contrat ? (
                                            <button
                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${salarie.scan_contrat}`))}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 font-medium text-sm hover:bg-blue-100 transition"
                                            >
                                                <FileText size={12} />
                                                Contrat
                                            </button>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-300">Aucun scan</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <button
                                                onClick={() => {
                                                    setSelectedSalarie(salarie);
                                                    setIsDetailsModalOpen(true);
                                                }}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                title="Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(salarie)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(salarie.id)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 overflow-y-auto bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col duration-300 max-h-[90vh] ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="hidden">
                                    {editingSalarie ? <Edit2 size={20} /> : <Plus size={20} />}
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm">
                                    {editingSalarie ? 'Modifier le Salarié' : 'Nouveau Salarié'}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Nom Complet</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Nom et prénom"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">CIN</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.cin}
                                            onChange={(e) => setForm({ ...form, cin: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Carte d'identité"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Date de Naissance</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={form.birth_date}
                                            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Situation Familiale</label>
                                    <div className="relative">
                                        <select
                                            value={form.marital_status}
                                            onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                                            className="w-full appearance-none cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="06..."
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Adresse</label>
                                    <textarea
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Ex: 84, Rue Prince Moulay Abdellah, Casablanca"
                                    ></textarea>
                                </div>

                                {/* Professional Details Header */}
                                <div className="col-span-full mt-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-px bg-gradient-to-r from-slate-100 to-transparent"></div>
                                        <span className="text-xs font-semibold text-slate-400 px-2">Informations Professionnelles</span>
                                        <div className="flex-1 h-px bg-gradient-to-l from-slate-100 to-transparent"></div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Matricule</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.matricule}
                                            onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Ex: 63"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">N° CNSS</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.cnss_number}
                                            onChange={(e) => setForm({ ...form, cnss_number: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Ex: 188944609"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Spécialité / Département</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={form.speciality}
                                            onChange={(e) => setForm({ ...form, speciality: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Ex: Comptabilité, Ingénierie..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Fonction (Détail)</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.fonction}
                                            onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Ex: Stagiaire, Assistant..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Grade</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            value={form.grade}
                                            onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="Ex: Senior, Junior, Chef"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Formation / Niveau</label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <select
                                            value={form.education}
                                            onChange={(e) => setForm({ ...form, education: e.target.value })}
                                            className="w-full appearance-none cursor-pointer pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Salaire Mensuel (DH)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-semibold text-xs">DH</span>
                                        <input
                                            type="text"
                                            required
                                            value={form.monthly_salary}
                                            onChange={(e) => setForm({ ...form, monthly_salary: formatNumber(e.target.value) })}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                        <Banknote size={14} className="mr-2" /> Informations Bancaires / RIB
                                    </label>
                                    <input
                                        type="text"
                                        value={form.bank_info}
                                        onChange={(e) => setForm({ ...form, bank_info: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Banque, Agence, RIB..."
                                    />
                                </div>

                                {/* ── BULLETIN DE PAIE ──────────────────────────── */}
                                <div className="col-span-full">
                                    <div className="flex items-center gap-3 mb-4 mt-2">
                                        <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                                        <span className="text-xs font-semibold text-blue-500 px-2">Bulletin de Paie</span>
                                        <div className="flex-1 h-px bg-gradient-to-l from-blue-200 to-transparent"></div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        {/* Header */}
                                        <div className="grid grid-cols-6 bg-slate-800 text-white text-xs font-semibold text-center">
                                            <div className="px-4 py-2.5 col-span-2 text-left">Désignation</div>
                                            <div className="px-4 py-2.5">Base</div>
                                            <div className="px-4 py-2.5">Taux</div>
                                            <div className="px-4 py-2.5">Gains</div>
                                            <div className="px-4 py-2.5">Retenues</div>
                                        </div>

                                        {/* Salaire de base */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-700 col-span-2">Salaire de Base</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.jours_travail} onChange={e => setForm({ ...form, jours_travail: e.target.value })} className="w-full text-center pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">J</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2 text-xs text-slate-400 text-center font-medium">—</div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.salaire_base} onChange={e => setForm({ ...form, salaire_base: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-2"></div>
                                        </div>

                                        {/* Ancienneté */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-700 col-span-2 pl-4">Ancienneté</div>
                                            <div className="px-2 py-2 text-xs text-slate-400 text-center font-medium">—</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_anciennete} onChange={e => setForm({ ...form, taux_anciennete: e.target.value })} className="w-full text-center pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                                    <span className="text-xs text-slate-400 font-medium">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.montant_anciennete} onChange={e => setForm({ ...form, montant_anciennete: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-2"></div>
                                        </div>

                                        {/* Salaire brut global */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center bg-blue-50/50">
                                            <div className="px-4 py-2 text-xs font-semibold text-blue-700 col-span-2">Salaire Brut Global</div>
                                            <div className="px-2 py-2 col-span-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.salaire_brut} onChange={e => setForm({ ...form, salaire_brut: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-2"></div>
                                        </div>

                                        {/* Sécurité Sociale */}
                                        <div className="px-4 py-1.5 bg-slate-100/80 text-xs font-semibold text-slate-500 border-b border-slate-200">Sécurité Sociale</div>
                                        {/* CNSS */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-xs font-medium text-slate-600 col-span-2 pl-8">CNSS</div>
                                            <div className="px-2 py-2 text-center text-xs font-medium text-slate-400">########</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_cnss} onChange={e => setForm({ ...form, taux_cnss: e.target.value })} className="w-full text-center pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                                    <span className="text-xs text-slate-400 font-medium">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.retenue_cnss} onChange={e => setForm({ ...form, retenue_cnss: e.target.value })} className="w-full !border-red-100 text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                        </div>
                                        {/* AMO */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-xs font-medium text-slate-600 col-span-2 pl-8">AMO</div>
                                            <div className="px-2 py-2 text-center text-xs font-medium text-slate-400">########</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_amo} onChange={e => setForm({ ...form, taux_amo: e.target.value })} className="w-full text-center pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                                    <span className="text-xs text-slate-400 font-medium">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.retenue_amo} onChange={e => setForm({ ...form, retenue_amo: e.target.value })} className="w-full !border-red-100 text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                        </div>

                                        {/* Impôts et Taxes */}
                                        <div className="px-4 py-1.5 bg-slate-100/80 text-xs font-semibold text-slate-500 border-b border-slate-200">Impôts et Taxes</div>
                                        {/* IR */}
                                        <div className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                            <div className="px-4 py-2 text-xs font-medium text-slate-600 col-span-2 pl-8">I.R.</div>
                                            <div className="px-2 py-2 text-xs text-slate-400 text-center font-medium">—</div>
                                            <div className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.01" value={form.taux_ir} onChange={e => setForm({ ...form, taux_ir: e.target.value })} className="w-full text-center pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                                    <span className="text-xs text-slate-400 font-medium">%</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2"></div>
                                            <div className="px-2 py-2">
                                                <input type="number" step="0.01" value={form.retenue_ir} onChange={e => setForm({ ...form, retenue_ir: e.target.value })} className="w-full !border-red-100 text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                        </div>

                                        {/* Primes et Indemnités */}
                                        <div className="px-4 py-1.5 bg-slate-100/80 text-xs font-semibold text-slate-500 border-b border-slate-200">Primes et Indemnités</div>
                                        {[
                                            { label: 'Indemnité de Transport', key: 'indemnite_transport' },
                                            { label: 'Prime de Panier', key: 'prime_panier' },
                                            { label: 'Prime de Rendement', key: 'prime_rendement' },
                                            { label: 'Arrondis', key: 'arrondis' },
                                        ].map(({ label, key }) => (
                                            <div key={key} className="grid grid-cols-6 border-b border-slate-200 items-center hover:bg-white transition-colors">
                                                <div className="px-4 py-2 text-xs font-medium text-slate-600 col-span-2 pl-8">{label}</div>
                                                <div className="px-2 py-2 col-span-2"></div>
                                                <div className="px-2 py-2">
                                                    <input type="number" step="0.01" value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                                </div>
                                                <div className="px-2 py-2"></div>
                                            </div>
                                        ))}

                                        {/* Totals */}
                                        <div className="grid grid-cols-6 border-b border-slate-300 items-center bg-slate-100/80">
                                            <div className="px-4 py-3 text-xs font-semibold text-slate-800 col-span-2">TOTAL des Gains / Retenues</div>
                                            <div className="px-2 py-3 col-span-2"></div>
                                            <div className="px-2 py-3">
                                                <input type="number" step="0.01" value={form.total_gains} onChange={e => setForm({ ...form, total_gains: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                            <div className="px-2 py-3">
                                                <input type="number" step="0.01" value={form.total_retenues} onChange={e => setForm({ ...form, total_retenues: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                        </div>

                                        {/* Net à payer */}
                                        <div className="grid grid-cols-6 items-center bg-emerald-600 text-white">
                                            <div className="px-4 py-3 text-xs font-semibold col-span-2">Net à Payer</div>
                                            <div className="px-2 py-3 col-span-2 text-right text-xs font-medium text-emerald-200">Total Net DH</div>
                                            <div className="px-2 py-3 col-span-2">
                                                <input type="number" step="0.01" value={form.net_a_payer} onChange={e => setForm({ ...form, net_a_payer: e.target.value })} className="w-full text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment details for bulletin */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Mode de Paiement & RIB</label>
                                            <div className="flex gap-2">
                                                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-1/3 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500">
                                                    <option value="">Sélectionner</option>
                                                    <option value="Virement bancaire">Virement bancaire</option>
                                                    <option value="Espèces">Espèces</option>
                                                    <option value="Chèque">Chèque</option>
                                                </select>
                                                <input type="text" value={form.rib} onChange={e => setForm({ ...form, rib: e.target.value })} className="w-2/3 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="N° RIB / Chèque..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Début de Paie / Prochain Paiement</label>
                                            <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                                            {form.payment_date && (
                                                <p className="text-xs font-medium text-blue-400 mt-2 ml-1">
                                                    Cycle mensuel : le prochain sera vers le {new Date(parseDate(form.payment_date).setMonth(parseDate(form.payment_date).getMonth() + 1)).toLocaleDateString('fr-MA')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Scan du Contrat (PDF, Image)</label>
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
                                            className="flex flex-col items-center justify-center w-full min-h-[120px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-white hover:border-blue-400 transition group-hover/file:shadow-inner"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <div className="p-3 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors mb-3 border border-slate-200">
                                                    <Download size={24} />
                                                </div>
                                                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                                                    {form.scan_contrat ? (
                                                        <span className="text-blue-600">✓ {form.scan_contrat.name}</span>
                                                    ) : (
                                                        "Cliquer pour uploader le scan"
                                                    )}
                                                </p>
                                                <p className="text-[8px] font-semibold text-slate-300 tracking-tight mt-1">PDF, PNG, JPG (Max 5Mo)</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 text-sm bg-slate-900 hover:bg-slate-800"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><UserCheck size={20} /> <span>Enregistrer</span></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsModalOpen && selectedSalarie && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 overflow-y-auto bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden duration-300 overflow-y-auto max-h-[90vh] ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900 tracking-tight leading-none mb-1">{selectedSalarie.name}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                        {selectedSalarie.speciality}
                                    </span>
                                    <p className="text-xs font-medium text-slate-400">
                                        Fiche Salarié #{selectedSalarie.id} • CIN: {selectedSalarie.cin || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 mb-2">Salaire Mensuel</p>
                                    <p className="text-2xl font-bold text-slate-800">{Number(selectedSalarie.monthly_salary).toLocaleString('fr-MA')} <span className="text-sm">DH</span></p>
                                </div>
                                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-xs font-semibold text-blue-400 mb-2">Niveau Études</p>
                                    <p className="text-2xl font-bold text-blue-600">{selectedSalarie.education || 'N/A'}</p>
                                </div>
                                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <p className="text-xs font-semibold text-emerald-400 mb-2">Statut</p>
                                    <p className="text-2xl font-bold text-emerald-600">Actif</p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Info size={20} />
                                    </div>
                                    <h4 className="font-semibold text-slate-800 text-sm">Informations Détaillées</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400">Fonction & Grade</p>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            {selectedSalarie.fonction || selectedSalarie.speciality}
                                            {selectedSalarie.grade ? ` - ${selectedSalarie.grade}` : ''}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400">Matricule & CNSS</p>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            MAT: <span className="text-blue-600">{selectedSalarie.matricule || 'N/A'}</span> / CNSS: <span className="text-blue-600">{selectedSalarie.cnss_number || 'N/A'}</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400">Naissance & Statut</p>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            {selectedSalarie.birth_date ? parseDate(selectedSalarie.birth_date).toLocaleDateString() : 'N/A'}
                                            {selectedSalarie.marital_status ? ` • ${selectedSalarie.marital_status}` : ''}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400">Téléphone</p>
                                        <p className="font-semibold text-slate-800 text-sm">{selectedSalarie.phone || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-full">
                                        <p className="text-xs font-semibold text-slate-400">Adresse Complète</p>
                                        <p className="font-medium text-slate-700 text-sm">{selectedSalarie.address || 'Aucune adresse renseignée'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-full">
                                        <p className="text-xs font-semibold text-slate-400">Informations de Paiement & Cycle</p>
                                        <div className="flex flex-col md:flex-row gap-4 mt-2">
                                            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                <p className="text-xs font-semibold text-emerald-500 mb-1">Mode & Cycle</p>
                                                <p className="font-semibold text-slate-800 text-sm">
                                                    {selectedSalarie.payment_method || 'Mode de paiement non spécifié'}
                                                    {selectedSalarie.payment_date && ` • Début: ${parseDate(selectedSalarie.payment_date).toLocaleDateString('fr-MA')}`}
                                                </p>
                                            </div>
                                            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                <p className="text-xs font-semibold text-blue-500 mb-1">Coordonnées Bancaires</p>
                                                <p className="font-semibold text-slate-800 text-sm font-mono">
                                                    {selectedSalarie.rib || selectedSalarie.bank_info || 'Aucun RIB renseigné'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedSalarie.scan_contrat && (
                                        <div className="space-y-2 col-span-full">
                                            <p className="text-xs font-semibold text-slate-400">Document Contractuel</p>
                                            <button
                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedSalarie.scan_contrat}`))}
                                                className="w-full flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition"
                                            >
                                                <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm border border-slate-200">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-semibold text-blue-900">Voir le scan du contrat</p>
                                                    <p className="text-[8px] font-semibold text-blue-400">Ouvrir dans la visionneuse</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                        <div className="flex items-center gap-3">
                                            <div className="hidden">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-800">Bulletin de Paie Mensuel</p>
                                                <p className="text-xs font-medium text-slate-400 capitalize">Détails des cotisations et primes</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePrintBulletin(selectedSalarie)}
                                            className="px-4 py-2 bg-white text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition shadow-sm font-medium text-sm flex items-center gap-2"
                                        >
                                            <Printer size={14} /> Aperçu & Imprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Bulletin de Paie Modal (Printable) */}
            {isBulletinModalOpen && selectedSalarie && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between no-print">
                            <h3 className="font-semibold text-slate-800 text-xs">Aperçu du Bulletin de Paie</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium text-sm transition shadow-sm bg-slate-900 hover:bg-slate-800"
                                    type="button"
                                >
                                    <Printer size={16} /> Imprimer Bulletin
                                </button>
                                <button onClick={() => setIsBulletinModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" type="button">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 bg-white overflow-y-auto max-h-[80vh] custom-scrollbar-white print:max-h-none print:p-0" id="bulletin-content">
                            {/* Professional Payslip Template */}
                            <div className="border-[1px] border-slate-900 p-8 relative min-h-[1000px] flex flex-col">
                                {/* Header / Company Details */}
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h1 className="text-xl font-semibold text-slate-900 mb-1">BULLETIN DE PAIE</h1>
                                        <p className="text-xs font-medium text-slate-500">Période : {selectedSalarie.payment_date ? new Date(parseDate(selectedSalarie.payment_date)).toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' }) : 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-sm">Référence : BDP-{selectedSalarie.id}-{new Date().getFullYear()}</p>
                                        <p className="text-xs font-medium text-slate-400 mt-1">Confidentiel</p>
                                    </div>
                                </div>

                                {/* Employee & Employment Info */}
                                <div className="grid grid-cols-2 gap-8 mb-10 border-y border-slate-100 py-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">Nom & Prénom :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.name}</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">Matricule :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.id.toString().padStart(5, '0')}</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">CIN :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.cin || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">Fonction :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.speciality}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">Date d'embauche :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.hiring_date || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">Ancienneté :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.taux_anciennete || 0}%</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">N° CNSS :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.cnss_number || '#######'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-slate-50 pb-1">
                                            <span className="font-semibold text-slate-400">Mode de Paie :</span>
                                            <span className="font-semibold text-slate-900">{selectedSalarie.payment_method || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Salary Details Table */}
                                <div className="flex-1">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="">
                                                <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Désignation</th>
                                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Nombre/Base</th>
                                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Taux</th>
                                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Gains</th>
                                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Retenues</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-medium text-slate-700">
                                            <tr className="border-b border-slate-50">
                                                <td className="py-3 px-4 font-semibold">Salaire de base</td>
                                                <td className="py-3 px-2 text-center">{selectedSalarie.jours_travail || 26}</td>
                                                <td className="py-3 px-2 text-center">{(Number(selectedSalarie.monthly_salary) / 26).toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right">{Number(selectedSalarie.monthly_salary).toLocaleString('fr-MA')}</td>
                                                <td className="py-3 px-4 text-right"></td>
                                            </tr>
                                            {selectedSalarie.montant_anciennete && selectedSalarie.montant_anciennete > 0 && (
                                                <tr className="border-b border-slate-50">
                                                    <td className="py-2 px-4">Prime d'ancienneté</td>
                                                    <td className="py-2 px-2 text-center"></td>
                                                    <td className="py-2 px-2 text-center">{selectedSalarie.taux_anciennete}%</td>
                                                    <td className="py-2 px-4 text-right">{selectedSalarie.montant_anciennete.toLocaleString('fr-MA')}</td>
                                                    <td className="py-2 px-4 text-right"></td>
                                                </tr>
                                            )}
                                            {/* Cotisations */}
                                            <tr className="border-b border-slate-50">
                                                <td className="py-2 px-4 pl-8">Cotisation CNSS</td>
                                                <td className="py-2 px-2 text-center">6000.00</td>
                                                <td className="py-2 px-2 text-center">{selectedSalarie.taux_cnss || 4.48}%</td>
                                                <td className="py-2 px-4 text-right"></td>
                                                <td className="py-2 px-4 text-right text-red-600">{(selectedSalarie.retenue_cnss || 0).toLocaleString('fr-MA')}</td>
                                            </tr>
                                            <tr className="border-b border-slate-50">
                                                <td className="py-2 px-4 pl-8">Cotisation AMO</td>
                                                <td className="py-2 px-2 text-center">{selectedSalarie.salaire_brut?.toLocaleString('fr-MA')}</td>
                                                <td className="py-2 px-2 text-center">{selectedSalarie.taux_amo || 2.26}%</td>
                                                <td className="py-2 px-4 text-right"></td>
                                                <td className="py-2 px-4 text-right text-red-600">{(selectedSalarie.retenue_amo || 0).toLocaleString('fr-MA')}</td>
                                            </tr>
                                            <tr className="border-b border-slate-50">
                                                <td className="py-2 px-4 pl-8">Impôt sur le Revenu (I.R)</td>
                                                <td className="py-2 px-2 text-center"></td>
                                                <td className="py-2 px-2 text-center">{selectedSalarie.taux_ir || 0}%</td>
                                                <td className="py-2 px-4 text-right"></td>
                                                <td className="py-2 px-4 text-right text-red-600">{(selectedSalarie.retenue_ir || 0).toLocaleString('fr-MA')}</td>
                                            </tr>
                                            {/* Primes */}
                                            {selectedSalarie.indemnite_transport && selectedSalarie.indemnite_transport > 0 && (
                                                <tr className="border-b border-slate-50 text-slate-500">
                                                    <td className="py-2 px-4">Indemnité de Transport</td>
                                                    <td className="py-2 px-2" colSpan={2}></td>
                                                    <td className="py-2 px-4 text-right">{selectedSalarie.indemnite_transport.toLocaleString('fr-MA')}</td>
                                                    <td className="py-2 px-4 text-right"></td>
                                                </tr>
                                            )}
                                            {selectedSalarie.prime_panier && selectedSalarie.prime_panier > 0 && (
                                                <tr className="border-b border-slate-50 text-slate-500">
                                                    <td className="py-2 px-4">Prime de Panier</td>
                                                    <td className="py-2 px-2" colSpan={2}></td>
                                                    <td className="py-2 px-4 text-right">{selectedSalarie.prime_panier.toLocaleString('fr-MA')}</td>
                                                    <td className="py-2 px-4 text-right"></td>
                                                </tr>
                                            )}
                                            {selectedSalarie.prime_rendement && selectedSalarie.prime_rendement > 0 && (
                                                <tr className="border-b border-slate-50">
                                                    <td className="py-2 px-4">Prime de Rendement</td>
                                                    <td className="py-2 px-2" colSpan={2}></td>
                                                    <td className="py-2 px-4 text-right">{selectedSalarie.prime_rendement.toLocaleString('fr-MA')}</td>
                                                    <td className="py-2 px-4 text-right"></td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-900 text-white font-semibold text-xs">
                                                <td className="py-3 px-4" colSpan={3}>NET À PAYER (DH)</td>
                                                <td className="py-3 px-4 text-right" colSpan={2}>{(selectedSalarie.net_a_payer || 0).toLocaleString('fr-MA')} DH</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Footer Signatures */}
                                <div className="mt-12 grid grid-cols-2 gap-20 pt-10 border-t border-slate-100">
                                    <div className="text-center">
                                        <p className="text-xs font-semibold text-slate-400 mb-12">L'employeur</p>
                                        <div className="text-[8px] font-semibold text-slate-300">Cachet et Signature</div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-semibold text-slate-400 mb-12">Le Salarié</p>
                                        <div className="text-[8px] font-semibold text-slate-300">Précédé de la mention "Lu et approuvé"</div>
                                    </div>
                                </div>

                                {/* Watermark */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none rotate-12">
                                    <ShieldCheck size={400} />
                                </div>
                            </div>
                        </div>

                        <style>{`
                            @media print {
                                body * {
                                    visibility: hidden;
                                }
                                #bulletin-content, #bulletin-content * {
                                    visibility: visible;
                                }
                                #bulletin-content {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                }
                                .no-print {
                                    display: none !important;
                                }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Salaries;
