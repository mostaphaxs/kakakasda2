// src/component/Clients.tsx
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Users, Loader2, PlusCircle, X, Banknote, Calendar as CalendarIcon, Check, FileText, Upload, Eye, Info, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';

interface Bien {
    id: number;
    terrain_id?: number;
    type_bien: string;
    num_appartement?: string;
    prix_global_finition: number;
    prix_global_non_finition: number;
    statut: string;
    immeuble?: string;
    etage?: number;
    terrain?: { id: number; nom_projet: string };
}

interface Payment {
    id: number;
    amount: string | number;
    type: string;
    payment_date: string;
    method?: string;
    reference_no?: string;
    bank_name?: string;
    notes?: string;
    status: string;
    refund_amount?: string | number;
    bien_id?: number;
    bien?: Bien;
}

interface ScannedDoc {
    name: string;
    file_name: string;
    path: string;
    size: number;
    mime_type: string;
    created_at: string;
}

interface Client {
    id: number;
    nom: string;
    prenom: string;
    tel: string;
    cin: string;
    date_reservation: string | null;
    avec_finition: boolean;
    bien?: Bien;
    payments?: (Payment & { receipt_path?: string })[];
    scanned_docs?: ScannedDoc[];
}

const Clients = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('Avance');
    const [paymentMethod, setPaymentMethod] = useState('Espèces');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentBank, setPaymentBank] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('fr-MA'));
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

    // Cancel / Associate State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [targetPayment, setTargetPayment] = useState<Payment | null>(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

    const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
    const [selectedBienId, setSelectedBienId] = useState<string>('');
    const [isSubmittingAssociate, setIsSubmittingAssociate] = useState(false);

    // Edit Client Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Client>>({});
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [availableBiens, setAvailableBiens] = useState<Bien[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [detailClient, setDetailClient] = useState<Client | null>(null);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFinition, setFilterFinition] = useState<'all' | 'avec' | 'sans'>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterTerrain, setFilterTerrain] = useState<string>('all');
    const [filterHasBien, setFilterHasBien] = useState<'all' | 'with' | 'without'>('all');
    const [filterBienStatus, setFilterBienStatus] = useState<string>('all');

    const fetchData = async () => {
        try {
            const [clientsData, biensData] = await Promise.all([
                apiFetch<Client[]>('/clients'),
                apiFetch<Bien[]>('/biens')
            ]);
            setClients(clientsData);
            setAvailableBiens(biensData);
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des données.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Supprimer ce client définitivement ?")) return;
        try {
            await apiFetch(`/clients/${id}`, { method: 'DELETE' });
            setClients(prev => prev.filter(c => c.id !== id));
            toast.success('Client supprimé');
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression.');
        }
    };

    const handleEdit = (client: Client) => {
        setEditFormData({
            id: client.id,
            nom: client.nom,
            prenom: client.prenom,
            tel: client.tel,
            cin: client.cin,
            date_reservation: client.date_reservation,
            avec_finition: client.avec_finition,
            bien: client.bien
        });
        setIsEditModalOpen(true);
    };

    const handleOpenDetails = (client: Client) => {
        setDetailClient(client);
        setIsDetailsModalOpen(true);
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editFormData.id) return;

        setIsSubmittingEdit(true);
        try {
            await apiFetch(`/clients/${editFormData.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    nom: editFormData.nom,
                    prenom: editFormData.prenom,
                    tel: editFormData.tel,
                    cin: editFormData.cin,
                    date_reservation: editFormData.date_reservation,
                    avec_finition: editFormData.avec_finition || false,
                    bien_id: editFormData.bien?.id || null
                })
            });

            toast.success('Client mis à jour !');
            setIsEditModalOpen(false);
            setFieldErrors({});
            fetchData();
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs dans le formulaire');
            } else {
                toast.error(err.message || 'Erreur lors de la mise à jour.');
            }
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !detailClient) return;

        setIsUploadingDoc(true);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('title', file.name);

        try {
            const res = await apiFetch<{ client: Client }>(`/clients/${detailClient.id}/documents`, {
                method: 'POST',
                body: formData
            });

            // Update only the current details modal data
            setDetailClient(res.client);

            // Re-fetch all to ensure global state is synced
            fetchData();

            toast.success('Document ajouté avec succès.');
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du téléchargement du document.');
        } finally {
            setIsUploadingDoc(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteDocument = async (client: Client, index: number) => {
        if (!window.confirm("Voulez-vous vraiment supprimer ce document ? Il sera perdu définitivement.")) return;

        try {
            const res = await apiFetch<{ client: Client }>(`/clients/${client.id}/documents/${index}`, {
                method: 'DELETE'
            });

            setDetailClient(res.client);
            fetchData();
            toast.success('Document supprimé.');
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression du document.');
        }
    };

    const handleOpenPaymentModal = (client: Client, payment?: Payment) => {
        setSelectedClient(client);
        if (payment) {
            setEditingPaymentId(payment.id);
            setPaymentNotes(payment.notes || '');
            setPaymentDate(payment.payment_date.split('T')[0].split(' ')[0]);
            setPaymentAmount(formatNumber(payment.amount.toString()));
        } else {
            setEditingPaymentId(null);
            setPaymentAmount('');
            setPaymentType('Avance');
            setPaymentMethod('Espèces');
            setPaymentReference('');
            setPaymentBank('');
            setPaymentNotes('');
            setPaymentDate(new Date().toLocaleDateString('fr-MA'));
        }
        setPaymentFile(null);
        setIsPaymentModalOpen(true);
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!window.confirm("Supprimer ce paiement ? cette action est irréversible.")) return;
        try {
            await apiFetch(`/payments/${paymentId}`, { method: 'DELETE' });
            toast.success('Paiement supprimé');
            fetchData();
            // Update detail client if open
            if (detailClient) {
                const updatedPayments = detailClient.payments?.filter(p => p.id !== paymentId) || [];
                setDetailClient({ ...detailClient, payments: updatedPayments });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression.');
        }
    };

    const handleCancelPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetPayment) return;

        setIsSubmittingCancel(true);
        try {
            await apiFetch(`/payments/${targetPayment.id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ refund_amount: parseNumber(refundAmount) })
            });

            toast.success('Paiement annulé avec succès.');
            setIsCancelModalOpen(false);
            fetchData();
            if (detailClient) {
                const refreshed = await apiFetch<Client>(`/clients/${detailClient.id}`);
                setDetailClient(refreshed);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'annulation.');
        } finally {
            setIsSubmittingCancel(false);
        }
    };

    const handleAssociatePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetPayment || !selectedBienId) return;

        setIsSubmittingAssociate(true);
        try {
            await apiFetch(`/payments/${targetPayment.id}/associate`, {
                method: 'POST',
                body: JSON.stringify({ bien_id: selectedBienId })
            });

            toast.success('Paiement associé au bien !');
            setIsAssociateModalOpen(false);
            fetchData();
            if (detailClient) {
                const refreshed = await apiFetch<Client>(`/clients/${detailClient.id}`);
                setDetailClient(refreshed);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'association.');
        } finally {
            setIsSubmittingAssociate(false);
        }
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient || !paymentAmount) return;

        setIsSubmittingPayment(true);
        try {
            const formData = new FormData();
            formData.append('client_id', selectedClient.id.toString());
            formData.append('bien_id', selectedClient.bien?.id.toString() || '');
            formData.append('amount', parseNumber(paymentAmount).toString());
            formData.append('payment_date', paymentDate);
            formData.append('type', paymentType);
            formData.append('method', paymentMethod);
            formData.append('reference_no', paymentReference);
            formData.append('bank_name', paymentBank);
            formData.append('notes', paymentNotes);
            if (paymentFile) {
                formData.append('receipt', paymentFile);
            }

            await apiFetch(editingPaymentId ? `/payments/${editingPaymentId}` : '/payments', {
                method: 'POST',
                body: formData,
                headers: editingPaymentId ? { 'X-HTTP-Method-Override': 'PUT' } : {}
            });

            toast.success('Paiement enregistré !');
            setIsPaymentModalOpen(false);
            setFieldErrors({});
            fetchData();
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs dans le formulaire');
            } else {
                toast.error(err.message || 'Erreur lors de l\'enregistrement du paiement.');
            }
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const filteredClients = clients.filter(c => {
        // 1. Search term
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            c.id.toString().includes(search) ||
            c.nom.toLowerCase().includes(search) ||
            c.prenom.toLowerCase().includes(search) ||
            c.tel.includes(search) ||
            c.cin.toLowerCase().includes(search) ||
            (c.bien?.id.toString().includes(search)) ||
            (c.bien?.type_bien.toLowerCase().includes(search))
        );

        if (!matchesSearch) return false;

        // 2. Finition
        if (filterFinition === 'avec' && !c.avec_finition) return false;
        if (filterFinition === 'sans' && c.avec_finition) return false;

        // 3. Type
        if (filterType !== 'all' && c.bien?.type_bien !== filterType) return false;

        // 4. Terrain / Project
        if (filterTerrain !== 'all' && c.bien?.terrain_id?.toString() !== filterTerrain) return false;

        // 6. Statut Attribution
        if (filterHasBien === 'with' && !c.bien) return false;
        if (filterHasBien === 'without' && c.bien) return false;

        // 7. Statut Bien
        if (filterBienStatus !== 'all' && c.bien?.statut !== filterBienStatus) return false;

        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterFinition('all');
        setFilterType('all');
        setFilterTerrain('all');
        setFilterHasBien('all');
        setFilterBienStatus('all');
    };

    const handleExport = () => {
        if (filteredClients.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredClients.map(c => {
            const prixGlobal = c.bien
                ? (c.avec_finition ? parseFloat(String(c.bien.prix_global_finition || 0)) : parseFloat(String(c.bien.prix_global_non_finition || 0)))
                : 0;
            const totalVerse = c.payments?.reduce((acc, p) => acc + (parseFloat(String(p.amount)) - parseFloat(String(p.refund_amount || 0))), 0) || 0;
            return {
                'ID': c.id,
                'NOM': c.nom?.toUpperCase(),
                'PRÉNOM': c.prenom?.toUpperCase(),
                'TÉLÉPHONE': c.tel,
                'CIN': c.cin?.toUpperCase(),
                'BIEN ASSIGNÉ': c.bien?.type_bien || 'N/A',
                'UNITÉ': c.bien?.num_appartement || 'N/A',
                'PRIX TOTAL (DH)': prixGlobal,
                'VERSÉ (DH)': totalVerse,
                'SOLDE RESTANT (DH)': Math.max(0, prixGlobal - totalVerse),
                'NB PAIEMENTS': c.payments?.length || 0,
                'DATE RÉSERVATION': c.date_reservation || 'N/A',
                'STATUT BIEN': c.bien?.statut || 'N/A'
            };
        });

        exportToExcel(dataToExport, `clients_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Liste des clients exportée avec succès");
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Users className="text-blue-600" />
                            Gestion des Clients
                        </h1>
                        <p className="text-gray-500 text-sm">Gérez vos réservations, paiements et dossiers clients.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-bold text-sm"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            Excel
                        </button>

                        <button
                            onClick={() => navigate('/add-client')}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-100 text-sm"
                        >
                            <PlusCircle size={18} />
                            Nouveau Client
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-4 border-t border-gray-50">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher (Nom, CIN, Tél, ID...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <select
                        value={filterFinition}
                        onChange={(e) => setFilterFinition(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">Finition: Tous</option>
                        <option value="avec">Avec Finition</option>
                        <option value="sans">Sans Finition</option>
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">Type: Tous</option>
                        <option value="Appartement">Appartement</option>
                        <option value="Terrain">Terrain</option>
                        <option value="Magasin">Magasin</option>
                    </select>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">Projet: Tous</option>
                        {Array.from(new Set(availableBiens.map(b => b.terrain_id).filter(Boolean))).map(tId => {
                            const bien = availableBiens.find(b => b.terrain_id === tId);
                            return (
                                <option key={tId} value={tId?.toString()}>
                                    {bien?.terrain?.nom_projet || `Projet #${tId}`}
                                </option>
                            );
                        })}
                    </select>

                    <select
                        value={filterHasBien}
                        onChange={(e) => setFilterHasBien(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">S. Attribution: Tous</option>
                        <option value="with">Avec Bien</option>
                        <option value="without">Sans Bien</option>
                    </select>

                    <select
                        value={filterBienStatus}
                        onChange={(e) => setFilterBienStatus(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">S. Bien: Tous</option>
                        <option value="Libre">Libre</option>
                        <option value="Reserve">Réservé</option>
                        <option value="Vendu">Vendu</option>
                    </select>

                    <div className="flex items-center gap-2 lg:col-span-1">
                        <button
                            onClick={resetFilters}
                            className="w-full text-gray-400 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-gray-100 rounded-xl py-2"
                        >
                            <X size={14} />
                            Réinitialiser
                        </button>
                    </div>

                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-800">Flux de Réservations</h3>
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {filteredClients.length} / {clients.length} Entrées
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[200px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Loader2 className="animate-spin mb-2" size={18} />
                            <p className="text-sm">Chargement des réservations...</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Client</th>
                                    <th className="px-6 py-4 font-semibold">Contact / CIN</th>
                                    <th className="px-6 py-4 font-semibold">Prix Global</th>
                                    <th className="px-6 py-4 font-semibold">Total Versé</th>
                                    <th className="px-6 py-4 font-semibold">Reste</th>
                                    <th className="px-6 py-4 font-semibold">Statut Bien</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredClients.length > 0 ? (
                                    filteredClients.map((c) => (
                                        <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{c.nom} {c.prenom}</div>
                                                <div className="text-[10px] text-gray-400">Réf: #{c.id} • {c.date_reservation || 'Pas de date'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-slate-600 font-medium">{c.tel}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{c.cin}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {c.bien
                                                    ? (c.avec_finition ? formatNumber(c.bien.prix_global_finition) : formatNumber(c.bien.prix_global_non_finition)) + ' DH'
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-emerald-600">
                                                        {(() => {
                                                            const total = c.payments?.reduce((acc, p) => acc + (parseFloat(String(p.amount)) - parseFloat(String(p.refund_amount || 0))), 0) || 0;
                                                            return formatNumber(total) + ' DH';
                                                        })()}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        {c.payments?.length || 0} versement(s)
                                                        {c.payments?.find(p => p.receipt_path) && (
                                                            <a
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const receipt = c.payments?.find(p => p.receipt_path)?.receipt_path;
                                                                    if (receipt) openExternal(encodeURI(`${STORAGE_BASE}/${receipt}`));
                                                                }}
                                                                className="p-0.5 hover:bg-blue-50 rounded text-blue-500 transition-colors"
                                                                title="Voir le dernier reçu"
                                                            >
                                                                <FileText size={12} />
                                                            </a>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-rose-500">
                                                {(() => {
                                                    const prix = c.bien
                                                        ? (c.avec_finition ? parseFloat(String(c.bien.prix_global_finition || 0)) : parseFloat(String(c.bien.prix_global_non_finition || 0)))
                                                        : 0;
                                                    const paid = c.payments?.reduce((acc, p) => acc + (parseFloat(String(p.amount)) - parseFloat(String(p.refund_amount || 0))), 0) || 0;
                                                    const reste = Math.max(0, prix - paid);
                                                    if (!c.bien) return '—';
                                                    return reste > 0 ? formatNumber(reste) + ' DH' : 'Soldé';
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.bien?.statut === 'Libre' ? 'bg-green-100 text-green-700' :
                                                    c.bien?.statut === 'Vendu' ? 'bg-rose-100 text-rose-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {c.bien?.type_bien || 'N/A'} • {c.bien?.statut || 'Inconnu'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenPaymentModal(c)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="Ajouter une Avance"
                                                    >
                                                        <PlusCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDetails(c)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Voir Détails"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => handleEdit(c)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all" >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                                            Aucun client trouvé.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {
                isPaymentModalOpen && selectedClient && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <Banknote size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{editingPaymentId ? 'Modifier le Paiement' : 'Enregistrer une Avance'}</h3>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{selectedClient.nom} {selectedClient.prenom}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitPayment} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">Montant du versement (DH)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">DH</span>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(formatNumber(e.target.value))}
                                            placeholder="0"
                                            className={`w-full pl-12 pr-4 py-3 bg-gray-50 border ${fieldErrors.amount ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-bold text-lg text-gray-800`}
                                        />
                                        {fieldErrors.amount && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.amount[0]}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Mode de paiement</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className={`w-full px-3 py-2.5 bg-gray-50 border ${fieldErrors.method ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-gray-700`}
                                        >
                                            <option value="Espèces">💵 Espèces</option>
                                            <option value="Chèque">📋 Chèque</option>
                                            <option value="Virement">🏦 Virement</option>
                                            <option value="Effet">📑 Effet</option>
                                        </select>
                                        {fieldErrors.method && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.method[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Type</label>
                                        <select
                                            value={paymentType}
                                            onChange={(e) => setPaymentType(e.target.value)}
                                            className={`w-full px-3 py-2.5 bg-gray-50 border ${fieldErrors.type ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-gray-700`}
                                        >
                                            <option value="Avance">Avance</option>
                                            <option value="Tranche">Tranche</option>
                                            <option value="Reliquat">Reliquat</option>
                                            <option value="Caution">Caution</option>
                                        </select>
                                        {fieldErrors.type && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.type[0]}</p>}
                                    </div>
                                </div>

                                {(paymentMethod === 'Chèque' || paymentMethod === 'Virement' || paymentMethod === 'Effet') && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">
                                                {paymentMethod === 'Chèque' ? 'N° de Chèque' : paymentMethod === 'Virement' ? 'Référence' : 'N° d\'Effet'} <span className="text-[8px] opacity-50">(Facultatif)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                placeholder="Ex: CK-00123"
                                                className={`w-full px-3 py-2.5 bg-gray-50 border ${fieldErrors.reference_no ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium`}
                                            />
                                            {fieldErrors.reference_no && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.reference_no[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Banque <span className="text-[8px] opacity-50">(Facultatif)</span></label>
                                            <input
                                                type="text"
                                                value={paymentBank}
                                                onChange={(e) => setPaymentBank(e.target.value)}
                                                placeholder="Ex: BCP, BMCE..."
                                                className={`w-full px-3 py-2.5 bg-gray-50 border ${fieldErrors.bank_name ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium`}
                                            />
                                            {fieldErrors.bank_name && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.bank_name[0]}</p>}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Notes / Observations <span className="text-[8px] opacity-50">(Facultatif)</span></label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder="Précisions sur le versement..."
                                        className={`w-full px-4 py-2 bg-gray-50 border ${fieldErrors.notes ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm h-16 resize-none`}
                                    />
                                    {fieldErrors.notes && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.notes[0]}</p>}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Preuve de paiement (Image/PDF)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="receipt-upload"
                                        />
                                        <label
                                            htmlFor="receipt-upload"
                                            className={`w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border border-dashed ${fieldErrors.receipt ? 'border-red-500' : 'border-gray-300'} rounded-xl hover:bg-gray-100 hover:border-emerald-400 cursor-pointer transition-all`}
                                        >
                                            <div className="p-2 bg-white shadow-sm border border-gray-100 rounded-lg text-emerald-600">
                                                <Upload size={16} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-bold text-gray-700 truncate">
                                                    {paymentFile ? paymentFile.name : 'Choisir un fichier'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">{paymentFile ? `${(paymentFile.size / 1024).toFixed(0)} KB` : 'Max 5MB (JPG, PNG, PDF)'}</p>
                                            </div>
                                            {paymentFile && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setPaymentFile(null); }}
                                                    className="p-1 hover:bg-red-50 text-red-500 rounded-lg"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </label>
                                        {fieldErrors.receipt && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.receipt[0]}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Date de l'opération</label>
                                    <div className="relative">
                                        <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                        <input
                                            type="text"
                                            required
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-2 bg-blue-50 border ${fieldErrors.payment_date ? 'border-red-500' : 'border-blue-100'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-blue-700 font-medium`}
                                            placeholder="JJ/MM/AAAA"
                                        />
                                        {fieldErrors.payment_date && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.payment_date[0]}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingPayment}
                                        className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl shadow-lg shadow-emerald-200 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingPayment ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={18} />
                                                Enregistrer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }

            {/* Edit Client Modal */}
            {
                isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Edit2 size={20} />
                                    </div>
                                    <h3 className="font-bold text-gray-800">Modifier le Client</h3>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nom</label>
                                        <input
                                            type="text" required
                                            value={editFormData.nom || ''}
                                            onChange={e => setEditFormData({ ...editFormData, nom: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-gray-50 border ${fieldErrors.nom ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                                        />
                                        {fieldErrors.nom && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.nom[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prénom</label>
                                        <input
                                            type="text" required
                                            value={editFormData.prenom || ''}
                                            onChange={e => setEditFormData({ ...editFormData, prenom: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-gray-50 border ${fieldErrors.prenom ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                                        />
                                        {fieldErrors.prenom && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.prenom[0]}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Téléphone</label>
                                        <input
                                            type="text" required
                                            value={editFormData.tel || ''}
                                            onChange={e => setEditFormData({ ...editFormData, tel: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-gray-50 border ${fieldErrors.tel ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                                        />
                                        {fieldErrors.tel && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.tel[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CIN</label>
                                        <input
                                            type="text" required
                                            value={editFormData.cin || ''}
                                            onChange={e => setEditFormData({ ...editFormData, cin: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-gray-50 border ${fieldErrors.cin ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                                        />
                                        {fieldErrors.cin && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.cin[0]}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bien Assigné</label>
                                    <select
                                        value={editFormData.bien?.id || ''}
                                        onChange={e => {
                                            const selected = availableBiens.find(b => b.id === parseInt(e.target.value));
                                            setEditFormData({ ...editFormData, bien: selected });
                                        }}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border ${fieldErrors.bien_id ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                                    >
                                        <option value="">Aucun</option>
                                        {availableBiens.map(b => {
                                            const isAssignedToThisClient = editFormData.bien?.id === b.id;
                                            const isAvailable = b.statut === 'Libre' || isAssignedToThisClient;
                                            return (
                                                <option
                                                    key={b.id}
                                                    value={b.id}
                                                    disabled={!isAvailable}
                                                    className={!isAvailable ? 'text-red-500 font-bold' : ''}
                                                >
                                                    {b.type_bien} {b.immeuble ? `- Imm. ${b.immeuble} ` : ''}{b.etage ? `- Étage ${b.etage} ` : ''}{b.num_appartement ? `- N° ${b.num_appartement} ` : ''}({b.statut})
                                                    {!isAvailable && ' - OCCUPÉ'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {editFormData.bien && (
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-900 uppercase">Choix de Finition</p>
                                            <p className="text-[9px] font-bold text-indigo-700/70">Le client souhaite-t-il la finition ?</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={editFormData.avec_finition || false}
                                                onChange={e => setEditFormData({ ...editFormData, avec_finition: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date Réservation (JJ/MM/AAAA)</label>
                                    <input
                                        type="text"
                                        value={editFormData.date_reservation || ''}
                                        onChange={e => setEditFormData({ ...editFormData, date_reservation: e.target.value })}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border ${fieldErrors.date_reservation ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                                        placeholder="JJ/MM/AAAA"
                                    />
                                    {fieldErrors.date_reservation && <p className="text-[9px] text-red-500 mt-1 font-bold">{fieldErrors.date_reservation[0]}</p>}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingEdit}
                                        className="flex-[2] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingEdit ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Mettre à jour</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Client Details Modal */}
            {
                isDetailsModalOpen && detailClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Info size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Dossier Client</h3>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Réf: #{detailClient.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Prix Global</p>
                                        <p className="text-lg font-bold text-slate-700">
                                            {detailClient.bien
                                                ? (detailClient.avec_finition ? formatNumber(detailClient.bien.prix_global_finition) : formatNumber(detailClient.bien.prix_global_non_finition))
                                                : 0} <span className="text-xs">DH</span>
                                        </p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Total Versé</p>
                                        <p className="text-lg font-bold text-emerald-600">
                                            {(() => {
                                                const total = detailClient.payments?.reduce((acc, p) => acc + (parseFloat(String(p.amount)) - parseFloat(String(p.refund_amount || 0))), 0) || 0;
                                                return formatNumber(total);
                                            })()} <span className="text-xs">DH</span>
                                        </p>
                                    </div>
                                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                                        <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Reste à payer</p>
                                        <p className="text-lg font-bold text-rose-600">
                                            {(() => {
                                                const prix = detailClient.bien
                                                    ? (detailClient.avec_finition ? parseFloat(String(detailClient.bien.prix_global_finition || 0)) : parseFloat(String(detailClient.bien.prix_global_non_finition || 0)))
                                                    : 0;
                                                const paid = detailClient.payments?.reduce((acc, p) => acc + (parseFloat(String(p.amount)) - parseFloat(String(p.refund_amount || 0))), 0) || 0;
                                                if (!detailClient.bien) return '—';
                                                return formatNumber(Math.max(0, prix - paid));
                                            })()} <span className="text-xs">DH</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Informations Personnelles</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Nom Complet:</span>
                                                <span className="font-bold text-gray-700 capitalize">{detailClient.nom} {detailClient.prenom}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Téléphone:</span>
                                                <span className="font-bold text-gray-700">{detailClient.tel}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">CIN:</span>
                                                <span className="font-bold text-gray-700 uppercase">{detailClient.cin}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Date Réservation:</span>
                                                <span className="font-bold text-gray-700">{detailClient.date_reservation || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Détails du Bien</h4>
                                        {detailClient.bien ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">Type de Bien:</span>
                                                    <span className="font-bold text-gray-700">{detailClient.bien.type_bien}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">Statut:</span>
                                                    <span className={`font-bold ${detailClient.bien.statut === 'Libre' ? 'text-green-600' : 'text-amber-600'}`}>{detailClient.bien.statut}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">Aucun bien assigné.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Documents Scannés</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{detailClient.scanned_docs?.length || 0} Fichiers</span>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploadingDoc}
                                                className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                title="Ajouter un document"
                                            >
                                                {isUploadingDoc ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleUploadDocument}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                    {detailClient.scanned_docs && detailClient.scanned_docs.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {detailClient.scanned_docs.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-200 transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-xs font-bold text-gray-700 truncate" title={doc.name}>{doc.name}</p>
                                                            <p className="text-[9px] text-gray-400 capitalize">{doc.created_at}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${doc.path}`))}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                                            title="Voir"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDocument(detailClient, idx)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-[10px] text-gray-400 italic">Aucun document numérisé.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Historique des Paiements</h4>
                                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{detailClient.payments?.length || 0} Opérations</span>
                                    </div>
                                    {detailClient.payments && detailClient.payments.length > 0 ? (
                                        <div className="space-y-3">
                                            {detailClient.payments.sort((a, b) => b.id - a.id).map((p) => (
                                                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${p.status === 'Cancelled' ? 'bg-red-50 border-red-100 opacity-75' : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg ${p.status === 'Cancelled' ? 'bg-red-100 text-red-600' : p.type === 'Caution' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            <Banknote size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-gray-800">{formatNumber(p.amount)} DH</p>
                                                                {p.status === 'Cancelled' && (
                                                                    <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded uppercase">Annulé (Remboursé: {formatNumber(p.refund_amount)} DH)</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                <span className="font-bold uppercase tracking-wider">{p.type}</span>
                                                                <span>•</span>
                                                                <span>{p.method}</span>
                                                                <span>•</span>
                                                                <span>{p.payment_date}</span>
                                                            </div>
                                                            {p.bien && (
                                                                <div className="text-[9px] text-indigo-500 font-bold mt-1">
                                                                    Bien: {p.bien.type_bien} - {p.bien.num_appartement || `N° ${p.bien.id}`}
                                                                </div>
                                                            )}
                                                            {(p.reference_no || p.bank_name) && (
                                                                <div className="mt-0.5 flex items-center gap-2 text-[9px] text-gray-400 font-medium">
                                                                    {p.reference_no && <span>Réf: {p.reference_no}</span>}
                                                                    {p.bank_name && <span>• {p.bank_name}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {p.status !== 'Cancelled' && (
                                                            <>
                                                                {!p.bien && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setTargetPayment(p);
                                                                            setSelectedBienId('');
                                                                            setIsAssociateModalOpen(true);
                                                                        }}
                                                                        className="p-2 bg-white text-blue-600 rounded-lg border border-gray-100 shadow-sm hover:bg-blue-50 transition-all"
                                                                        title="Associer à un bien"
                                                                    >
                                                                        <PlusCircle size={14} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setTargetPayment(p);
                                                                        setRefundAmount(formatNumber(p.amount));
                                                                        setIsCancelModalOpen(true);
                                                                    }}
                                                                    className="p-2 bg-white text-red-500 rounded-lg border border-gray-100 shadow-sm hover:bg-red-50 transition-all"
                                                                    title="Annuler adhesion"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenPaymentModal(detailClient, p)}
                                                            className="p-2 bg-white text-blue-600 rounded-lg border border-gray-100 shadow-sm hover:bg-blue-50 transition-all"
                                                            title="Modifier le paiement"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePayment(p.id)}
                                                            className="p-2 bg-white text-red-500 rounded-lg border border-gray-100 shadow-sm hover:bg-red-50 transition-all"
                                                            title="Supprimer le paiement"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        {p.receipt_path && (
                                                            <button
                                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${p.receipt_path}`))}
                                                                className="p-2 bg-white text-indigo-600 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all"
                                                                title="Voir le reçu"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400 italic">Aucun versement enregistré pour le moment.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    Fermer le Dossier
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Cancel Payment Modal */}
            {
                isCancelModalOpen && targetPayment && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/30">
                                <h3 className="font-bold text-gray-800">Annuler l'adhésion</h3>
                                <button onClick={() => setIsCancelModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCancelPayment} className="p-6 space-y-4">
                                <p className="text-sm text-gray-500">Montant payé: <span className="font-bold text-gray-800">{formatNumber(targetPayment.amount)} DH</span></p>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">Montant à rembourser (DH)</label>
                                    <input
                                        type="text"
                                        required
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(formatNumber(e.target.value))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-lg"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Vou pouvez rembourser tout ou partie du montant original.</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsCancelModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Ignorer</button>
                                    <button type="submit" disabled={isSubmittingCancel} className="flex-[2] px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100">
                                        {isSubmittingCancel ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Confirmer l'annulation</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Associate Payment Modal */}
            {
                isAssociateModalOpen && targetPayment && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                                <h3 className="font-bold text-gray-800">Associer à un Bien</h3>
                                <button onClick={() => setIsAssociateModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAssociatePayment} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">Choisir un bien pour ce montant</label>
                                    <select
                                        required
                                        value={selectedBienId}
                                        onChange={(e) => setSelectedBienId(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    >
                                        <option value="">Sélectionner un bien...</option>
                                        {availableBiens.filter(b => b.statut === 'Libre').map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.type_bien} - {b.num_appartement || `N° ${b.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsAssociateModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Annuler</button>
                                    <button type="submit" disabled={isSubmittingAssociate} className="flex-[2] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                                        {isSubmittingAssociate ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Associer le bien</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
export default Clients
