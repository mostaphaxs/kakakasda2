import { useState, useEffect } from 'react';
import {
    Building2, Plus, Search, Loader2, Trash2, Edit2, X, Check,
    Phone, MapPin, FileText, Upload, DollarSign, ChevronRight,
    Download, History, Sparkles, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';
import { analyzeInvoicePremium } from '../lib/gemini';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface Provider {
    id: number;
    nom: string;
    categorie: string;
    tel: string | null;
    adresse: string | null;
    ice: string | null;
    if: string | null;
    rc: string | null;
    rib: string | null;
    invoices: Invoice[];
}

interface Invoice {
    id: number;
    service_provider_id: number;
    amount: number;
    reference: string | null;
    scan_path: string | null;
    invoice_date: string;
    notes: string | null;
    terrain_id: number | null;
    code_agence?: string;
    id_transaction?: string;
    reference_recu?: string;
    reference_cmi?: string;
    reference_creancier_new?: string;
    date_paiement?: string;
    identifiant_paiement?: string;
    table_identifiant?: string;
    table_description?: string;
    table_date?: string;
    table_montant?: string;
    frais_timbre?: string;
    terrain?: { id: number; nom_projet: string };
}

const CATEGORIES = ["Telecom", "Eau/Electricité", "Loyer", "Transport/Gasoil", "Fournitures", "Autre"];

const ServiceSocietes = () => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Modals
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [providerForm, setProviderForm] = useState({
        nom: '', categorie: 'Telecom', tel: '', adresse: '', ice: '', if: '', rc: '', rib: ''
    });

    const [invoiceForm, setInvoiceForm] = useState({
        amount: '', reference: '', invoice_date: new Date().toLocaleDateString('fr-MA'), notes: '', terrain_id: '',
        code_agence: '', id_transaction: '', reference_recu: '', reference_cmi: '', reference_creancier_new: '', date_paiement: '', identifiant_paiement: '',
        table_identifiant: '', table_description: '', table_date: '', table_montant: '', frais_timbre: ''
    });
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnomaly, setAiAnomaly] = useState<{ detected: boolean; description: string } | null>(null);

    // Global Scan Modal
    const [isGlobalScanOpen, setIsGlobalScanOpen] = useState(false);
    const [globalScanFile, setGlobalScanFile] = useState<File | null>(null);

    const handleAIScan = async () => {
        if (!invoiceFile) {
            toast.error("Veuillez d'abord joindre un document");
            return;
        }
        setIsAnalyzing(true);
        setAiAnomaly(null);
        try {
            const providerNames = providers.map(p => p.nom);
            const result = await analyzeInvoicePremium(invoiceFile, providerNames);

            if (result && typeof result === 'object') {
                setInvoiceForm(prev => ({
                    ...prev,
                    reference: result.invoice_no || prev.reference,
                    invoice_date: result.date || prev.invoice_date,
                    amount: result.amount ? formatNumber(String(result.amount)) : prev.amount
                }));

                if (result.anomaly_detected) {
                    setAiAnomaly({ detected: true, description: result.anomaly_description });
                }

                toast.success("Facture analysée avec succès !");
            }
        } catch (e) {
            console.error(e);
            toast.error("Échec de l'analyse IA");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGlobalScan = async () => {
        if (!globalScanFile) {
            toast.error("Veuillez d'abord joindre un document");
            return;
        }
        setIsAnalyzing(true);
        setAiAnomaly(null);
        try {
            const providerNames = providers.map(p => p.nom);
            const result = await analyzeInvoicePremium(globalScanFile, providerNames);

            if (result && typeof result === 'object') {
                const matched = providers.find(p =>
                    p.nom === result.matched_vendor ||
                    (result.vendor_name && (
                        p.nom.toLowerCase().includes(result.vendor_name.toLowerCase()) ||
                        result.vendor_name.toLowerCase().includes(p.nom.toLowerCase())
                    ))
                );

                if (matched) {
                    setSelectedProvider(matched);
                    setInvoiceForm({
                        amount: result.amount ? formatNumber(String(result.amount)) : '',
                        reference: result.invoice_no || '',
                        invoice_date: result.date || new Date().toLocaleDateString('fr-MA'),
                        notes: result.anomaly_detected ? `[ALERTE IA]: ${result.anomaly_description}` : '',
                        terrain_id: '',
                        code_agence: '',
                        id_transaction: '',
                        reference_recu: '',
                        reference_cmi: '',
                        reference_creancier_new: '',
                        date_paiement: '',
                        identifiant_paiement: '',
                        table_identifiant: '',
                        table_description: '',
                        table_date: '',
                        table_montant: '',
                        frais_timbre: ''
                    });
                    setInvoiceFile(globalScanFile);
                    if (result.anomaly_detected) {
                        setAiAnomaly({ detected: true, description: result.anomaly_description });
                    }
                    setIsGlobalScanOpen(false);
                    setIsInvoiceModalOpen(true);
                    toast.success(`Société détectée : ${matched.nom} ✨`);
                } else {
                    setIsGlobalScanOpen(false);
                    handleOpenProviderModal();
                    setProviderForm(prev => ({ ...prev, nom: result.vendor_name || 'Inconnu' }));
                    toast.error(`Fournisseur "${result.vendor_name || 'Inconnu'}" non reconnu. Veuillez d'abord créer la société.`);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Échec du scan global");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fetchData = async () => {
        try {
            const [providersData, terrainsData] = await Promise.all([
                apiFetch<Provider[]>('/service-providers'),
                apiFetch<any[]>('/terrains')
            ]);
            setProviders(providersData);
            setTerrains(terrainsData);
        } catch (err: any) {
            toast.error(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenProviderModal = (provider: Provider | null = null) => {
        if (provider) {
            setEditingProvider(provider);
            setProviderForm({
                nom: provider.nom,
                categorie: provider.categorie || 'Telecom',
                tel: provider.tel || '',
                adresse: provider.adresse || '',
                ice: provider.ice || '',
                if: provider.if || '',
                rc: provider.rc || '',
                rib: provider.rib || ''
            });
        } else {
            setEditingProvider(null);
            setProviderForm({
                nom: '', categorie: 'Telecom', tel: '', adresse: '', ice: '', if: '', rc: '', rib: ''
            });
        }
        setIsProviderModalOpen(true);
    };

    const handleOpenInvoiceModal = (provider: Provider, invoice: Invoice | null = null) => {
        setSelectedProvider(provider);
        if (invoice) {
            setEditingInvoice(invoice);
            setInvoiceForm({
                amount: formatNumber(String(invoice.amount)),
                reference: invoice.reference || '',
                invoice_date: invoice.invoice_date,
                notes: invoice.notes || '',
                terrain_id: invoice.terrain_id ? String(invoice.terrain_id) : '',
                code_agence: invoice.code_agence || '',
                id_transaction: invoice.id_transaction || '',
                reference_recu: invoice.reference_recu || '',
                reference_cmi: invoice.reference_cmi || '',
                reference_creancier_new: invoice.reference_creancier_new || '',
                date_paiement: invoice.date_paiement ? new Date(invoice.date_paiement).toISOString().slice(0, 16) : '',
                identifiant_paiement: invoice.identifiant_paiement || '',
                table_identifiant: invoice.table_identifiant || '',
                table_description: invoice.table_description || '',
                table_date: invoice.table_date || '',
                table_montant: invoice.table_montant ? String(invoice.table_montant) : '',
                frais_timbre: invoice.frais_timbre ? String(invoice.frais_timbre) : ''
            });
        } else {
            setEditingInvoice(null);
            setInvoiceForm({
                amount: '',
                reference: '',
                invoice_date: new Date().toLocaleDateString('fr-MA'),
                notes: '',
                terrain_id: '',
                code_agence: '',
                id_transaction: '',
                reference_recu: '',
                reference_cmi: '',
                reference_creancier_new: '',
                date_paiement: '',
                identifiant_paiement: '',
                table_identifiant: '',
                table_description: '',
                table_date: '',
                table_montant: '',
                frais_timbre: ''
            });
        }
        setInvoiceFile(null);
        setIsInvoiceModalOpen(true);
    };

    const handleProviderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const method = editingProvider ? 'PUT' : 'POST';
            const url = editingProvider ? `/service-providers/${editingProvider.id}` : '/service-providers';
            await apiFetch(url, { method, body: JSON.stringify(providerForm) });
            toast.success(editingProvider ? 'Société mise à jour' : 'Société ajoutée');
            setIsProviderModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInvoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider) return;
        setIsSubmitting(true);
        try {
            const data = new FormData();
            if (!editingInvoice) data.append('service_provider_id', String(selectedProvider.id));
            data.append('amount', String(parseNumber(invoiceForm.amount)));
            data.append('reference', invoiceForm.reference);
            data.append('invoice_date', invoiceForm.invoice_date);
            data.append('notes', invoiceForm.notes);
            if (invoiceForm.terrain_id) data.append('terrain_id', invoiceForm.terrain_id);
            if (invoiceForm.code_agence) data.append('code_agence', invoiceForm.code_agence);
            if (invoiceForm.id_transaction) data.append('id_transaction', invoiceForm.id_transaction);
            if (invoiceForm.reference_recu) data.append('reference_recu', invoiceForm.reference_recu);
            if (invoiceForm.reference_cmi) data.append('reference_cmi', invoiceForm.reference_cmi);
            if (invoiceForm.reference_creancier_new) data.append('reference_creancier_new', invoiceForm.reference_creancier_new);
            if (invoiceForm.date_paiement) data.append('date_paiement', invoiceForm.date_paiement);
            if (invoiceForm.identifiant_paiement) data.append('identifiant_paiement', invoiceForm.identifiant_paiement);
            if (invoiceForm.table_identifiant) data.append('table_identifiant', invoiceForm.table_identifiant);
            if (invoiceForm.table_description) data.append('table_description', invoiceForm.table_description);
            if (invoiceForm.table_date) data.append('table_date', invoiceForm.table_date);
            if (invoiceForm.table_montant) data.append('table_montant', String(parseNumber(invoiceForm.table_montant)));
            if (invoiceForm.frais_timbre) data.append('frais_timbre', String(parseNumber(invoiceForm.frais_timbre)));
            if (invoiceFile) data.append('scan_path', invoiceFile);

            const url = editingInvoice ? `/provider-invoices/${editingInvoice.id}` : '/provider-invoices';
            const method = 'POST'; // Laravel file upload support with POST (use _method for PUT)
            if (editingInvoice) data.append('_method', 'PUT');

            await apiFetch(url, { method, body: data });
            toast.success(editingInvoice ? 'Facture mise à jour' : 'Facture ajoutée');
            setIsInvoiceModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProvider = async (id: number) => {
        if (!window.confirm('Supprimer cette société et toutes ses factures ?')) return;
        try {
            await apiFetch(`/service-providers/${id}`, { method: 'DELETE' });
            toast.success('Société supprimée');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteInvoice = async (id: number) => {
        if (!window.confirm('Supprimer cette facture ?')) return;
        try {
            await apiFetch(`/provider-invoices/${id}`, { method: 'DELETE' });
            toast.success('Facture supprimée');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const filteredProviders = providers.filter(p => {
        const matchesSearch = p.nom.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || p.categorie === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleExport = () => {
        const data = filteredProviders.flatMap(p =>
            p.invoices.map(inv => ({
                'SOCIÉTÉ': p.nom.toUpperCase(),
                'CATÉGORIE': p.categorie || 'N/A',
                'MONTANT (DH)': inv.amount,
                'RÉFÉRENCE': inv.reference || '-',
                'DATE': inv.invoice_date,
                'PROJET': inv.terrain?.nom_projet || 'GÉNÉRAL',
                'NOTES': inv.notes || ''
            }))
        );
        exportToExcel(data, `recap_services_${new Date().getTime()}`);
    };

    const totalGlobal = filteredProviders.reduce((acc, p) => acc + p.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0), 0);
    const categoryTotals = filteredProviders.reduce((acc: any, p) => {
        const cat = p.categorie || 'Autre';
        const sum = p.invoices.reduce((s, inv) => s + Number(inv.amount), 0);
        acc[cat] = (acc[cat] || 0) + sum;
        return acc;
    }, {});

    const monthlyServices = filteredProviders.reduce((acc: any, p) => {
        const cat = p.categorie || 'Autre';
        p.invoices.forEach(inv => {
            let monthKey = inv.invoice_date;
            if (inv.invoice_date.includes('/')) {
                const parts = inv.invoice_date.split('/');
                if (parts.length === 3) monthKey = `${parts[1]}/${parts[2]}`;
            } else if (inv.invoice_date.includes('-')) {
                const parts = inv.invoice_date.split('-');
                if (parts.length >= 2) monthKey = `${parts[1]}/${parts[0]}`;
            }
            if (!acc[monthKey]) acc[monthKey] = { total: 0 };
            if (!acc[monthKey][cat]) acc[monthKey][cat] = 0;
            acc[monthKey][cat] += Number(inv.amount);
            acc[monthKey].total += Number(inv.amount);
        });
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white shadow-xl shadow-gray-200/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                            <Building2 className="text-indigo-600" />
                            Sociétés de Services
                        </h2>
                        <p className="text-gray-500 text-sm italic">Gestion des abonnements (Telecom, Eau) et frais administratifs.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-bold text-xs uppercase">
                            <Download size={18} /> Export Excel
                        </button>
                        <button onClick={() => setIsGlobalScanOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition font-bold shadow-lg shadow-purple-100 uppercase text-xs">
                            <Sparkles size={18} /> Scan Rapide
                        </button>
                        <button onClick={() => handleOpenProviderModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100 uppercase text-xs">
                            <Plus size={18} /> Nouvelle Société
                        </button>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher une société..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="all">Toutes les catégories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Dépenses Totales (Services)</p>
                    <h3 className="text-3xl font-black text-indigo-700">{formatNumber(totalGlobal)} <span className="text-sm text-indigo-400">DH</span></h3>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 overflow-x-auto relative">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dépenses par Catégorie</p>
                        <button onClick={() => setIsMonthlyModalOpen(true)} className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest hover:bg-indigo-100 transition">
                            <History size={12} /> Vue Mensuelle
                        </button>
                    </div>
                    <div className="flex gap-3 min-w-max">
                        {Object.entries(categoryTotals).sort(([, a], [, b]) => Number(b as number) - Number(a as number)).map(([cat, amount]) => (
                            <div key={cat} className="p-3 bg-gray-50 rounded-xl min-w-[120px] border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">{cat}</p>
                                <p className="text-sm font-black text-gray-800">{formatNumber(Number(amount))} <span className="text-[9px] text-gray-400">DH</span></p>
                            </div>
                        ))}
                        {Object.keys(categoryTotals).length === 0 && (
                            <div className="p-3 text-sm italic text-gray-400">Aucune donnée</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Providers Table (Horizontal View) */}
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Société</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Catégorie</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Téléphone</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse Siège</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Factures</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Payé</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" size={40} /></td></tr>
                        ) : filteredProviders.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center text-gray-400 italic font-bold">Aucune société trouvée.</td></tr>
                        ) : filteredProviders.map(p => {
                            const totalPaid = p.invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
                            const isSelected = selectedProvider?.id === p.id;
                            return (
                                <tr
                                    key={p.id}
                                    className={`group hover:bg-indigo-50/30 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => setSelectedProvider(isSelected ? null : p)}
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                                <Building2 size={20} />
                                            </div>
                                            <span className="font-black text-gray-800 uppercase tracking-tight">{p.nom}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">{p.categorie}</span>
                                    </td>
                                    <td className="px-6 py-6 text-center text-[11px] font-bold text-gray-600">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Phone size={12} className="text-gray-400" />
                                            {p.tel || '--'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 max-w-[250px]">
                                        <p className="text-[10px] text-gray-400 truncate uppercase font-bold tracking-tight">
                                            <MapPin size={10} className="inline mr-1" /> {p.adresse || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg bg-gray-100 text-slate-700 font-black text-xs">
                                            {p.invoices.length}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <span className="text-sm font-black text-indigo-600 tabular-nums">
                                            {formatNumber(totalPaid)} <span className="text-[9px] font-bold text-indigo-400">DH</span>
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenInvoiceModal(p); }}
                                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-slate-900 transition-all shadow-sm group/btn"
                                                title="Nouvelle Facture"
                                            >
                                                <Plus size={14} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenProviderModal(p); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                                title="Modifier"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteProvider(p.id); }}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <div className="w-px h-4 bg-gray-100 mx-1" />
                                            <ChevronRight size={16} className={`transition-all ${isSelected ? 'text-indigo-600 rotate-90' : 'text-slate-300'}`} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Selected Provider History */}
            {selectedProvider && (
                <div className="bg-white rounded-[2rem] border border-indigo-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="px-8 py-5 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600"><History size={20} /></div>
                            <div>
                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Historique : {selectedProvider.nom}</h3>
                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-0.5">{selectedProvider.categorie} • {selectedProvider.invoices.length} Documents</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedProvider(null)} className="p-2 hover:bg-indigo-100 rounded-full text-indigo-600 transition-colors"><X size={20} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/30 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-4 text-left">Date</th>
                                    <th className="px-6 py-4 text-left">Référence</th>
                                    <th className="px-6 py-4 text-left">Projet/Terrain</th>
                                    <th className="px-6 py-4 text-right">Montant (DH)</th>
                                    <th className="px-6 py-4 text-center">Scan</th>
                                    <th className="px-8 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 italic">
                                {selectedProvider.invoices.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 font-bold">Aucune facture enregistrée.</td></tr>
                                ) : selectedProvider.invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-indigo-50/10 transition-colors group">
                                        <td className="px-8 py-4 font-bold text-gray-700">{inv.invoice_date}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-400">{inv.reference || '--'}</td>
                                        <td className="px-6 py-4">
                                            {inv.terrain ? (
                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase">{inv.terrain.nom_projet}</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-300 uppercase">Général</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-indigo-600">{formatNumber(inv.amount)} DH</td>
                                        <td className="px-6 py-4 text-center">
                                            {inv.scan_path ? (
                                                <button onClick={() => openExternal(`${STORAGE_BASE}/${inv.scan_path}`)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5 text-[9px] font-black uppercase">
                                                    <FileText size={14} /> Voir
                                                </button>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setViewingInvoice(inv)} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-400 hover:text-emerald-600"><Eye size={14} /></button>
                                                <button onClick={() => handleOpenInvoiceModal(selectedProvider, inv)} className="p-1.5 hover:bg-indigo-50 rounded text-indigo-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteInvoice(inv.id)} className="p-1.5 hover:bg-rose-50 rounded text-rose-300 hover:text-rose-600"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Provider Modal */}
            {isProviderModalOpen && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50">
                        <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                            <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest">
                                {editingProvider ? 'Modifier la Société' : 'Nouvelle Société de Service'}
                            </h3>
                            <button onClick={() => setIsProviderModalOpen(false)} className="p-3 hover:bg-white rounded-full transition-colors text-indigo-400"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleProviderSubmit} className="p-10 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nom de la Société</label>
                                    <input required type="text" value={providerForm.nom} onChange={e => setProviderForm({ ...providerForm, nom: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catégorie</label>
                                    <select value={providerForm.categorie} onChange={e => setProviderForm({ ...providerForm, categorie: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-800">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" value={providerForm.tel} onChange={e => setProviderForm({ ...providerForm, tel: e.target.value })} className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Adresse Siège</label>
                                <textarea value={providerForm.adresse} onChange={e => setProviderForm({ ...providerForm, adresse: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-[11px] text-slate-700 h-24 resize-none" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {['ice', 'if', 'rc'].map(key => (
                                    <div key={key}>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{key === 'if' ? 'I.F' : key === 'rc' ? 'R.C' : 'ICE'}</label>
                                        <input type="text" value={providerForm[key as keyof typeof providerForm]} onChange={e => setProviderForm({ ...providerForm, [key]: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RIB Bancaire</label>
                                <input type="text" value={providerForm.rib} onChange={e => setProviderForm({ ...providerForm, rib: e.target.value })} className="w-full px-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none font-mono text-[11px] tracking-widest focus:ring-2 focus:ring-indigo-500 text-indigo-700" placeholder="000 000 000000000000 00" />
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsProviderModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition">Annuler</button>
                                <button disabled={isSubmitting} type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Enregistrer la Société</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50">
                        <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50 shrink-0 sticky top-0 z-10">
                            <div>
                                <h3 className="font-black text-emerald-900 text-sm uppercase tracking-widest">{editingInvoice ? 'Modifier Facture' : 'Nouvelle Facture'}</h3>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-tight">Pour : {selectedProvider?.nom}</p>
                            </div>
                            <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="p-3 hover:bg-white inset-auto rounded-full transition-colors text-emerald-400"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-5 overflow-y-auto">
                            {aiAnomaly && (
                                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[10px] animate-in slide-in-from-top-2">
                                    <AlertTriangle className="shrink-0" size={20} />
                                    <div>
                                        <p className="font-black uppercase tracking-tight">Anomalie Détectée</p>
                                        <p className="font-medium">{aiAnomaly.description}</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right opacity-50">Total TTC (Montant + Timbre)</label>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Montant Facture (DH)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
                                    <input required type="text" value={invoiceForm.amount} onChange={e => setInvoiceForm({ ...invoiceForm, amount: formatNumber(e.target.value) })} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-2xl text-slate-800 transition-all" placeholder="0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identifiant Paiement</label>
                                    <input type="text" value={invoiceForm.identifiant_paiement} onChange={e => setInvoiceForm({ ...invoiceForm, identifiant_paiement: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="Ex: 0674746974" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Code Agence</label>
                                    <input type="text" value={invoiceForm.code_agence} onChange={e => setInvoiceForm({ ...invoiceForm, code_agence: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="Ex: 22854" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ID Transaction</label>
                                    <input type="text" value={invoiceForm.id_transaction} onChange={e => setInvoiceForm({ ...invoiceForm, id_transaction: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="Ex: 239245789" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Référence Reçu</label>
                                    <input type="text" value={invoiceForm.reference_recu} onChange={e => setInvoiceForm({ ...invoiceForm, reference_recu: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="Ex: MS_1777..." />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Référence CMI</label>
                                    <input type="text" value={invoiceForm.reference_cmi} onChange={e => setInvoiceForm({ ...invoiceForm, reference_cmi: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="Ex: 103037072040" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Réf. Créancier</label>
                                    <input type="text" value={invoiceForm.reference_creancier_new} onChange={e => setInvoiceForm({ ...invoiceForm, reference_creancier_new: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="Ex: ZH8370" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date de Paiement</label>
                                    <input type="datetime-local" value={invoiceForm.date_paiement} onChange={e => setInvoiceForm({ ...invoiceForm, date_paiement: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" />
                                </div>
                            </div>

                            {/* Table Reçu Fields */}
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileText size={12} /> Tableau Reçu Cash Plus</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Identifiant (Tableau)</label>
                                        <input type="text" value={invoiceForm.table_identifiant} onChange={e => setInvoiceForm({ ...invoiceForm, table_identifiant: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500" placeholder="Ex: 0000300..." />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                                        <input type="text" value={invoiceForm.table_description} onChange={e => setInvoiceForm({ ...invoiceForm, table_description: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Période..." />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Date</label>
                                        <input type="text" value={invoiceForm.table_date} onChange={e => setInvoiceForm({ ...invoiceForm, table_date: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500" placeholder="Ex: 01/03/2026" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Montant Ligne</label>
                                        <input type="text" value={invoiceForm.table_montant} onChange={e => setInvoiceForm({ ...invoiceForm, table_montant: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500" placeholder="Ex: 1385.46" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Frais de timbre (Bas de reçu)</label>
                                        <input type="text" value={invoiceForm.frais_timbre} onChange={e => setInvoiceForm({ ...invoiceForm, frais_timbre: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500" placeholder="Ex: 3.46" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date Facture</label>
                                    <input required type="text" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500" placeholder="JJ/MM/AAAA" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Référence №</label>
                                    <input type="text" value={invoiceForm.reference} onChange={e => setInvoiceForm({ ...invoiceForm, reference: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="FACT-..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projet Affecté</label>
                                <select value={invoiceForm.terrain_id} onChange={e => setInvoiceForm({ ...invoiceForm, terrain_id: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                                    <option value="">Général / Commun</option>
                                    {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_projet}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                    Scan Document
                                    {invoiceFile && (
                                        <button
                                            type="button"
                                            onClick={handleAIScan}
                                            disabled={isAnalyzing}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-all border border-indigo-100 animate-pulse-subtle"
                                        >
                                            {isAnalyzing ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Sparkles size={12} />
                                            )}
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
                                            </span>
                                        </button>
                                    )}
                                </label>
                                <input type="file" id="invoice-up" className="hidden" onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                                <label htmlFor="invoice-up" className={`w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${invoiceFile ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300'}`}>
                                    <Upload size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{invoiceFile ? 'Document Ajouté' : 'Joindre le scan'}</span>
                                </label>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition">Annuler</button>
                                <button disabled={isSubmitting} type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Valider Facture</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Scan Modal */}
            {isGlobalScanOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-white/50">
                        <div className="px-10 py-10 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-indigo-900 text-lg uppercase tracking-tight">Scan Rapide Intelligent</h3>
                                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1 italic">Déposez n'importe quelle facture, l'IA s'occupe du reste.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsGlobalScanOpen(false)} className="p-3 hover:bg-white rounded-full transition-colors text-indigo-400"><X size={24} /></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="relative group">
                                <input
                                    type="file"
                                    id="global-scan-up"
                                    className="hidden"
                                    onChange={e => setGlobalScanFile(e.target.files?.[0] || null)}
                                />
                                <label
                                    htmlFor="global-scan-up"
                                    className={`w-full aspect-video flex flex-col items-center justify-center gap-4 border-4 border-dashed rounded-[2.5rem] cursor-pointer transition-all duration-500 ${globalScanFile
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-purple-400 hover:bg-purple-50/50'
                                        }`}
                                >
                                    <div className={`p-6 rounded-full transition-all duration-500 ${globalScanFile ? 'bg-emerald-100 scale-110' : 'bg-white shadow-sm'}`}>
                                        {globalScanFile ? <ShieldCheck size={40} /> : <Upload size={40} />}
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black uppercase tracking-widest text-xs">
                                            {globalScanFile ? 'Document Prêt' : 'Glisser ou Choisir une Facture'}
                                        </p>
                                        <p className="text-[10px] font-bold opacity-60 mt-1 uppercase">PDF, JPG, PNG jusqu'à 10MB</p>
                                    </div>
                                    {globalScanFile && (
                                        <span className="text-[10px] font-mono bg-emerald-100 px-3 py-1 rounded-full">{globalScanFile.name}</span>
                                    )}
                                </label>
                            </div>

                            <button
                                onClick={handleGlobalScan}
                                disabled={!globalScanFile || isAnalyzing}
                                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${!globalScanFile || isAnalyzing
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-1 active:scale-95'
                                    }`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Analyse par Gemini 3 Flash...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        <span>Lancer l'Identification Automatique</span>
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <ShieldCheck className="text-indigo-600 shrink-0" size={18} />
                                <p className="text-[9px] font-medium text-indigo-700 uppercase tracking-tight">
                                    L'IA va détecter automatiquement la société émettrice, la date, le montant et vérifier l'authenticité du document.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Details Modal */}
            {isMonthlyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                            <div>
                                <h3 className="font-black text-indigo-900 text-lg uppercase tracking-widest">Historique Mensuel des Services</h3>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Répartition des coûts par catégorie et par mois</p>
                            </div>
                            <button type="button" onClick={() => setIsMonthlyModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-indigo-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Mois / Année</th>
                                            {CATEGORIES.map(cat => <th key={cat} className="px-4 py-4 text-right truncate">{cat}</th>)}
                                            <th className="px-6 py-4 text-right text-indigo-600">Total Mensuel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 italic">
                                        {Object.entries(monthlyServices).sort((a, b) => b[0].localeCompare(a[0])).map(([month, totals]: [string, any]) => (
                                            <tr key={month} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-black text-indigo-600">{month}</td>
                                                {CATEGORIES.map(cat => (
                                                    <td key={cat} className="px-4 py-4 text-right text-gray-600 font-bold">
                                                        {totals[cat] ? formatNumber(totals[cat]) : '-'} <span className="text-[9px] text-gray-300">{totals[cat] ? 'DH' : ''}</span>
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-indigo-600 bg-indigo-50/30">
                                                    {formatNumber(totals.total)} <span className="text-[9px]">DH</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {Object.keys(monthlyServices).length === 0 && (
                                            <tr>
                                                <td colSpan={CATEGORIES.length + 2} className="px-6 py-12 text-center text-gray-400 font-bold">Aucune donnée disponible</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Viewing Invoice Detail Modal */}
            {viewingInvoice && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-yellow-50/50 shrink-0 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-yellow-600 border border-yellow-100">
                                    <Sparkles size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-black text-slate-800 text-sm">{selectedProvider?.nom || 'Fournisseur'}</h3>
                                    <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest mt-0.5">CASH PLUS REÇU</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingInvoice(null)} className="p-3 hover:bg-white rounded-full transition-colors text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto w-full bg-[#fdfdf8]">

                            {/* Receipt Header Style */}
                            <div className="text-center pb-4 border-b-2 border-dashed border-gray-200">
                                <h4 className="font-extrabold text-lg text-slate-800 tracking-tight">{selectedProvider?.nom || 'Maroc Telecom'} {viewingInvoice.notes ? `: ${viewingInvoice.notes}` : ''}</h4>
                            </div>

                            {/* Main Info Block */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-xs font-bold text-slate-500">NUMÉRO DE TÉLÉPHONE / ID</span>
                                    <span className="text-sm font-black text-slate-800">{viewingInvoice.identifiant_paiement || '--'}</span>
                                </div>
                                <div className="flex justify-between items-end pb-2">
                                    <span className="text-xs font-bold text-slate-500">Identifiant paiement</span>
                                    <span className="text-sm font-black text-slate-800">{viewingInvoice.identifiant_paiement || '--'}</span>
                                </div>
                            </div>

                            {/* Details Block */}
                            <div className="space-y-1 py-4 border-y border-gray-100 font-mono text-xs">
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600">Code Agence :</span>
                                    <span className="font-black">{viewingInvoice.code_agence || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600">Id Transaction :</span>
                                    <span className="font-black">{viewingInvoice.id_transaction || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600">Référence reçu :</span>
                                    <span className="font-black break-all text-right max-w-[200px]">{viewingInvoice.reference_recu || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600">Référence CMI :</span>
                                    <span className="font-black">{viewingInvoice.reference_cmi || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600">Référence Créancier :</span>
                                    <span className="font-black">{viewingInvoice.reference_creancier_new || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-600">Date de paiement :</span>
                                    <span className="font-black">{viewingInvoice.date_paiement ? new Date(viewingInvoice.date_paiement).toLocaleString('fr-FR', {
                                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    }).replace(',', '') : '--'}</span>
                                </div>
                            </div>

                            {/* Simulated Table */}
                            <div className="border-2 border-slate-800 rounded-lg overflow-hidden my-4">
                                <div className="grid grid-cols-4 bg-white border-b-2 border-slate-800 p-2 text-center text-[9px] font-black text-slate-600 uppercase">
                                    <div className="border-r-2 border-slate-800">Identifiant</div>
                                    <div className="col-span-2 border-r-2 border-slate-800">Description</div>
                                    <div className="border-r-2 border-slate-800">Date</div>
                                    <div className="">Montant</div>
                                </div>
                                <div className="grid grid-cols-4 bg-white p-2 text-[10px] font-bold text-center">
                                    <div className="border-r-2 border-slate-800 break-all pr-1 text-[8px] flex items-center justify-center">{viewingInvoice.table_identifiant || viewingInvoice.reference || '--'}</div>
                                    <div className="col-span-2 border-r-2 border-slate-800 px-1 text-left whitespace-pre-wrap flex items-center">{viewingInvoice.table_description || 'Facture / Période'}</div>
                                    <div className="border-r-2 border-slate-800 px-1 flex items-center justify-center">{viewingInvoice.table_date || viewingInvoice.invoice_date || '--'}</div>
                                    <div className="flex items-center justify-center">{viewingInvoice.table_montant ? `${formatNumber(viewingInvoice.table_montant)} DH` : '--'}</div>
                                </div>
                            </div>

                            {/* Totals Block */}
                            <div className="border-2 border-slate-800 rounded-lg overflow-hidden bg-white">
                                <div className="flex justify-between border-b border-slate-800 p-2 text-xs font-bold">
                                    <span>Frais de timbre</span>
                                    <span>{viewingInvoice.frais_timbre ? `${formatNumber(viewingInvoice.frais_timbre)} DH` : '--'}</span>
                                </div>
                                <div className="flex justify-between p-2 text-sm font-black">
                                    <span>Montant Total TTC</span>
                                    <span>{viewingInvoice.amount ? formatNumber(viewingInvoice.amount) : '--'} DH</span>
                                </div>
                            </div>

                            {(viewingInvoice.terrain || viewingInvoice.scan_path) && (
                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    {viewingInvoice.terrain && (
                                        <div className="flex-1 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projet Affecté</p>
                                            <p className="font-bold text-indigo-600 uppercase text-xs">{viewingInvoice.terrain.nom_projet}</p>
                                        </div>
                                    )}
                                    {viewingInvoice.scan_path && (
                                        <button onClick={() => openExternal(`${STORAGE_BASE}/${viewingInvoice.scan_path}`)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
                                            <FileText size={16} /> Original
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceSocietes;
