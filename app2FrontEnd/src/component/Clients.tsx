// src/component/Clients.tsx
import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Users, Loader2, PlusCircle, X, Banknote, Calendar as CalendarIcon, Check, FileText, Upload, Eye, Info, Search, Download, MessageCircle, Paintbrush, Link, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber, stripMarkdown, parseDate } from '../lib/utils';
import { openExternal } from '../lib/tauri';
import MarkdownText from './common/MarkdownText';
import { Sparkles, Mail, FileSignature } from 'lucide-react';
import { generateContract } from '../lib/ContractGenerator';
import { generateClientEmail, improveWhatsAppMessage } from '../lib/gemini';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';
import { openClientDocuments } from './common/ClientDocuments';


interface Bien {
    id: number;
    terrain_id?: number;
    type_bien: string;
    num_appartement?: string;
    surface_m2?: number;
    prix_global_finition: number;
    prix_global_non_finition: number;
    statut: string;
    immeuble?: string;
    etage?: number;
    terrain?: { id: number; nom_projet: string };
    nom?: string;
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
    bank_commission: number;
    receipt_path?: string;
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
    tel_2?: string;
    email?: string;
    adresse?: string;
    cin: string;
    date_reservation: string | null;
    avec_finition: boolean;
    avec_contrat?: boolean;
    scan_contrat?: string;
    biens?: Bien[];
    payments?: (Payment & { receipt_path?: string })[];
    scanned_docs?: ScannedDoc[];
    observation?: string;
    statut?: string;
    statut_choix?: 'SANS_CHOIX' | 'CHOIX_FAIT' | 'CONTRAT_SIGNE';
}


const Clients = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clients, setClients] = useState<Client[]>([]);
    // suiviBien removed – the Suivi Réalisation is now embedded in the edit property page
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
    const [bankCommission, setBankCommission] = useState('');
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
    const [editBienId, setEditBienId] = useState<string>('');
    const [contractFile, setContractFile] = useState<File | null>(null);

    // Client Cancellation State
    const [isClientCancelModalOpen, setIsClientCancelModalOpen] = useState(false);
    const [clientToCancel, setClientToCancel] = useState<Client | null>(null);
    const [clientRefundAmount, setClientRefundAmount] = useState('');
    const [clientCancelNotes, setClientCancelNotes] = useState('');
    const [isSubmittingClientCancel, setIsSubmittingClientCancel] = useState(false);

    // Client–Bien Association Modal State
    const [isClientAssocModalOpen, setIsClientAssocModalOpen] = useState(false);
    const [assocTargetClient, setAssocTargetClient] = useState<Client | null>(null);
    const [assocBienSearch, setAssocBienSearch] = useState('');
    const [assocBienId, setAssocBienId] = useState('');
    const [assocAvecFinition, setAssocAvecFinition] = useState(false);
    const [assocBienFloorFilter, setAssocBienFloorFilter] = useState('all');
    const [assocBienTypeFilter, setAssocBienTypeFilter] = useState('all');
    const [isSubmittingAssoc, setIsSubmittingAssoc] = useState(false);

    // Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [detailClient, setDetailClient] = useState<Client | null>(null);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // WhatsApp Language Modal State
    const [isWhatsAppLangModalOpen, setIsWhatsAppLangModalOpen] = useState(false);
    const [whatsappTargetClient, setWhatsappTargetClient] = useState<Client | null>(null);
    const [isWhatsAppEditorOpen, setIsWhatsAppEditorOpen] = useState(false);
    const [whatsappMessageContent, setWhatsappMessageContent] = useState('');
    const [isWhatsAppPhoneModalOpen, setIsWhatsAppPhoneModalOpen] = useState(false);
    const [whatsappTargetPhone, setWhatsappTargetPhone] = useState<string>('');
    const [isAILoading, setIsAILoading] = useState(false);

    // Contract Generation State
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractTargetClient, setContractTargetClient] = useState<Client | null>(null);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = usePersistedState('Clients.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [filterFinition, setFilterFinition] = usePersistedState<'all' | 'avec' | 'sans'>('Clients.filterFinition', 'all');
    const [filterContrat, setFilterContrat] = usePersistedState<'all' | 'avec' | 'sans'>('Clients.filterContrat', 'all');
    const [filterType, setFilterType] = usePersistedState<string>('Clients.filterType', 'all');
    const [filterTerrain, setFilterTerrain] = usePersistedState<string>('Clients.filterTerrain', 'all');
    const [filterHasBien, setFilterHasBien] = usePersistedState<'all' | 'with' | 'without'>('Clients.filterHasBien', 'all');
    const [filterStatutChoix, setFilterStatutChoix] = usePersistedState<string>('Clients.filterStatutChoix', 'all');

    const fetchData = async () => {
        try {
            const [clientsData, biensData] = await Promise.all([
                apiFetch<Client[]>('/clients'),
                apiFetch<Bien[]>('/biens')
            ]);

            const sortedBiens = biensData.sort((a, b) => {
                const immA = a.immeuble || '';
                const immB = b.immeuble || '';
                if (immA !== immB) return immA.localeCompare(immB);

                const valA = parseInt(a.num_appartement || '');
                const valB = parseInt(b.num_appartement || '');
                if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
                return (a.num_appartement || '').localeCompare(b.num_appartement || '');
            });

            setClients(clientsData);
            setAvailableBiens(sortedBiens);
            return clientsData;
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des données.');
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle Deep Linking / Auto-open payment modal
    useEffect(() => {
        if (!loading && searchParams.get('action') === 'payment') {
            const clientIdAttr = searchParams.get('client_id');
            if (clientIdAttr) {
                const client = clients.find(c => c.id === Number(clientIdAttr));
                if (client) {
                    handleOpenPaymentModal(client);
                    // Clear params to avoid reopening on refresh if needed, 
                    // though usually keeping them is fine for deep links.
                }
            }
        }
    }, [loading, searchParams, clients]);

    const handleOpenCancelClient = (client: Client) => {
        setClientToCancel(client);
        setClientRefundAmount('');
        setClientCancelNotes('');
        setIsClientCancelModalOpen(true);
    };

    const handleOpenClientAssoc = (client: Client) => {
        setAssocTargetClient(client);
        setAssocBienSearch('');
        setAssocBienId('');
        setAssocAvecFinition(client.avec_finition || false);
        setAssocBienFloorFilter('all');
        setAssocBienTypeFilter('all');
        setIsClientAssocModalOpen(true);
    };

    const handleClientAssociateBien = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assocTargetClient || !assocBienId) return;
        setIsSubmittingAssoc(true);
        try {
            await apiFetch(`/clients/${assocTargetClient.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...assocTargetClient, // Satisfy backend validation (nom, prenom, cin, tel)
                    bien_id: Number(assocBienId),
                    avec_finition: assocAvecFinition ? 1 : 0
                }),
            });
            toast.success('Bien associé au client !');
            setIsClientAssocModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'association.");
        } finally {
            setIsSubmittingAssoc(false);
        }
    };

    const handleCancelClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientToCancel) return;

        setIsSubmittingClientCancel(true);
        try {
            await apiFetch(`/clients/${clientToCancel.id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({
                    refund_amount: parseNumber(clientRefundAmount),
                    notes: clientCancelNotes
                })
            });

            toast.success('Contrat annulé et biens libérés.');
            setIsClientCancelModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'annulation.");
        } finally {
            setIsSubmittingClientCancel(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog("Supprimer ce client définitivement ?")) return;
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
            tel_2: client.tel_2,
            email: client.email,
            adresse: client.adresse,
            cin: client.cin,
            avec_finition: client.avec_finition,
            avec_contrat: client.avec_contrat || false,
            scan_contrat: client.scan_contrat,
            statut_choix: client.statut_choix || 'SANS_CHOIX',
            observation: client.observation || '',
            statut: client.statut || 'Actif',
            date_reservation: client.date_reservation ? client.date_reservation.split(' ')[0] : ''
        });
        setEditBienId(client.biens && client.biens.length > 0 ? String(client.biens[0].id) : '');
        setContractFile(null);
        setFieldErrors({});
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
            const data = new FormData();
            Object.entries(editFormData).forEach(([key, value]) => {
                if (key === 'scan_contrat') return; // Handled separately as a File
                if (value !== null && value !== undefined) {
                    if (typeof value === 'boolean') {
                        data.append(key, value ? '1' : '0');
                    } else {
                        data.append(key, String(value));
                    }
                }
            });
            if (editBienId) data.append('bien_id', editBienId);
            if (contractFile && editFormData.avec_contrat) {
                data.append('scan_contrat', contractFile);
            }

            await apiFetch(`/clients/${editFormData.id}`, {
                method: 'POST',
                body: data,
                headers: { 'X-HTTP-Method-Override': 'PUT' }
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
        if (!await confirmDialog("Voulez-vous vraiment supprimer ce document ? Il sera perdu définitivement.")) return;

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
            setBankCommission(formatNumber((payment as any).bank_commission?.toString() || '0'));
        } else {
            setEditingPaymentId(null);
            setPaymentAmount('');
            setPaymentType('Avance');
            setPaymentMethod('Espèces');
            setPaymentReference('');
            setPaymentBank('');
            setPaymentNotes('');
            setBankCommission('');
            setPaymentDate(new Date().toLocaleDateString('fr-MA'));
        }
        setPaymentFile(null);
        setIsPaymentModalOpen(true);
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!await confirmDialog("Supprimer ce paiement ? cette action est irréversible.")) return;
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

    const handleWhatsAppMessage = (client: Client, language: 'fr' | 'ar') => {
        if (!client.tel) {
            toast.error("Le client n'a pas de numéro de téléphone.");
            return;
        }

        const prixGlobal = client.biens?.reduce((acc, b) => acc + (client.avec_finition ? (b.prix_global_finition || 0) : (b.prix_global_non_finition || 0)), 0) || 0;
        const totalVerse = client.payments?.reduce((acc, p) => {
            const amt = parseFloat(String(p.amount));
            const refund = parseFloat(String(p.refund_amount || 0));
            const commission = parseFloat(String(p.bank_commission || 0));
            if (p.type === 'Reprise') return acc - amt;
            return acc + (amt - refund - commission);
        }, 0) || 0;
        const reste = Math.max(0, prixGlobal - totalVerse);

        let message = '';
        if (language === 'fr') {
            message = `Bonjour ${client.nom} ${client.prenom},\n\nVoici un récapitulatif de votre situation :\n- Prix Global : ${formatNumber(prixGlobal)} DH\n- Total Versé : ${formatNumber(totalVerse)} DH\n- Reste à payer : ${formatNumber(reste)} DH\n\nMerci de nous contacter pour toute question.`;
        } else {
            message = `مرحباً ${client.nom} ${client.prenom}،\n\nإليك ملخص وضعيتك المالية :\n- السعر الإجمالي: ${formatNumber(prixGlobal)} درهم\n- المبلغ المدفوع: ${formatNumber(totalVerse)} درهم\n- الباقي للأداء: ${formatNumber(reste)} درهم\n\nيرجى الاتصال بنا لأي استفسار. شكراً.`;
        }

        setWhatsappMessageContent(message);
        setIsWhatsAppLangModalOpen(false);
        setIsWhatsAppEditorOpen(true);
    };

    const handleImproveWithAI = async () => {
        try {
            setIsAILoading(true);
            const improved = await improveWhatsAppMessage(whatsappMessageContent);
            setWhatsappMessageContent(improved);
            toast.success('Message amélioré par l\'IA ! ✨', { icon: '✨' });
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'amélioration AI.");
        } finally {
            setIsAILoading(false);
        }
    };

    const handleGenerateEmailWithAI = async (client: Client) => {
        try {
            setIsAILoading(true);
            setWhatsappTargetClient(client);
            setWhatsappTargetPhone(client.tel);
            const prixGlobal = client.biens?.reduce((acc, b) => acc + (client.avec_finition ? (b.prix_global_finition || 0) : (b.prix_global_non_finition || 0)), 0) || 0;
            const totalVerse = client.payments?.reduce((acc, p) => {
                const amt = parseFloat(String(p.amount));
                const refund = parseFloat(String(p.refund_amount || 0));
                const commission = parseFloat(String(p.bank_commission || 0));
                if (p.type === 'Reprise') return acc - amt;
                return acc + (amt - refund - commission);
            }, 0) || 0;
            const reste = Math.max(0, prixGlobal - totalVerse);
            const projectName = client.biens?.[0]?.terrain?.nom_projet || "Vôtre Projet";

            const email = await generateClientEmail({
                name: `${client.nom} ${client.prenom}`,
                total: prixGlobal,
                paid: totalVerse,
                remaining: reste,
                project: projectName
            });

            // For now, we'll open the mail client or just copy to clipboard / show in editor
            setWhatsappMessageContent(email);
            setIsWhatsAppEditorOpen(true);
            toast.success('Email professionnel généré ! 📧', { icon: '📧' });
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la génération de l'email.");
        } finally {
            setIsAILoading(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!whatsappTargetClient || !whatsappTargetPhone) return;

        let cleanTel = whatsappTargetPhone.replace(/\s/g, '').replace(/[^0-9+]/g, '');

        if (cleanTel.startsWith('0') && (cleanTel.startsWith('06') || cleanTel.startsWith('07')) && cleanTel.length === 10) {
            cleanTel = '212' + cleanTel.substring(1);
        } else if (!cleanTel.startsWith('+') && !cleanTel.startsWith('212') && cleanTel.length === 9) {
            cleanTel = '212' + cleanTel;
        }

        const encodedMessage = encodeURIComponent(whatsappMessageContent);
        const whatsappUrl = `https://wa.me/${cleanTel}?text=${encodedMessage}`;

        openExternal(whatsappUrl);
        setIsWhatsAppEditorOpen(false);
    };

    const handleOpenWhatsAppLangModal = (client: Client) => {
        setWhatsappTargetClient(client);
        if (client.tel && client.tel_2) {
            setIsWhatsAppPhoneModalOpen(true);
        } else {
            setWhatsappTargetPhone(client.tel);
            setIsWhatsAppLangModalOpen(true);
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
            // If client has only one property, associate it automatically. 
            // If multiple, we might need a selector in the modal, but for now we'll send nothing or the first one.
            const targetBienId = selectedClient.biens?.length === 1 ? selectedClient.biens[0].id : (selectedBienId || '');
            formData.append('bien_id', targetBienId.toString());
            formData.append('amount', parseNumber(paymentAmount).toString());
            formData.append('payment_date', paymentDate);
            formData.append('type', paymentType);
            formData.append('method', paymentMethod);
            formData.append('reference_no', paymentReference);
            formData.append('bank_name', paymentBank);
            formData.append('bank_commission', parseNumber(bankCommission).toString());
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
            const updatedClients = await fetchData();
            // Redirect to details with fresh data
            if (selectedClient) {
                const freshClient = updatedClients.find((c: any) => c.id === selectedClient.id);
                if (freshClient) {
                    setDetailClient(freshClient);
                } else {
                    setDetailClient(selectedClient);
                }
                setIsDetailsModalOpen(true);
            }
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
        // 0. If deep-linked for a specific client, prioritize that
        const targetClientId = searchParams.get('client_id');
        if (targetClientId && c.id !== Number(targetClientId)) return false;

        // 1. Search term
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            c.id.toString().includes(search) ||
            c.nom.toLowerCase().includes(search) ||
            c.prenom.toLowerCase().includes(search) ||
            c.tel.includes(search) ||
            c.email?.toLowerCase().includes(search) ||
            c.adresse?.toLowerCase().includes(search) ||
            c.cin.toLowerCase().includes(search) ||
            (c.biens?.some(b => b.id.toString().includes(search))) ||
            (c.biens?.some(b => b.type_bien.toLowerCase().includes(search)))
        );

        if (!matchesSearch) return false;

        // 2. Finition
        if (filterFinition === 'avec' && !c.avec_finition) return false;
        if (filterFinition === 'sans' && c.avec_finition) return false;
        if (filterContrat === 'avec' && !c.avec_contrat) return false;
        if (filterContrat === 'sans' && c.avec_contrat) return false;

        // Choice Status
        if (filterStatutChoix !== 'all' && c.statut_choix !== filterStatutChoix) return false;

        // 3. Type
        if (filterType !== 'all' && !c.biens?.some(b => b.type_bien === filterType)) return false;

        // 4. Terrain / Project
        if (filterTerrain !== 'all' && !c.biens?.some(b => b.terrain_id?.toString() === filterTerrain)) return false;

        // 6. Statut Attribution
        if (filterHasBien === 'with' && (!c.biens || c.biens.length === 0)) return false;
        if (filterHasBien === 'without' && c.biens && c.biens.length > 0) return false;

        return true;
    }).sort((a, b) => {
        // Sort alphabetically by Nom, then Prenom
        const nomA = a.nom || '';
        const nomB = b.nom || '';
        if (nomA !== nomB) return nomA.localeCompare(nomB);
        return (a.prenom || '').localeCompare(b.prenom || '');
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterFinition('all');
        setFilterType('all');
        setFilterTerrain('all');
        setFilterHasBien('all');
        setFilterStatutChoix('all');
    };

    const handleExport = () => {
        if (filteredClients.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }

        const dataToExport = filteredClients.map(c => {
            const prixGlobal = c.biens?.reduce((acc, b) => acc + (c.avec_finition ? parseFloat(String(b.prix_global_finition || 0)) : parseFloat(String(b.prix_global_non_finition || 0))), 0) || 0;
            const totalVerse = c.payments?.reduce((acc, p) => {
                const amt = parseFloat(String(p.amount));
                const refund = parseFloat(String(p.refund_amount || 0));
                const commission = parseFloat(String(p.bank_commission || 0));
                if (p.type === 'Reprise') return acc - amt;
                return acc + (amt - refund - commission);
            }, 0) || 0;
            return {
                'ID': c.id,
                'NOM': c.nom?.toUpperCase(),
                'PRÉNOM': c.prenom?.toUpperCase(),
                'TÉLÉPHONE': c.tel,
                'TÉLÉPHONE 2': c.tel_2 || '-',
                'EMAIL': c.email || '-',
                'ADRESSE': c.adresse || '-',
                'CIN': c.cin?.toUpperCase(),
                'BIENS ASSIGNÉS': c.biens?.map(b => b.type_bien).join(', ') || 'N/A',
                'N° APPARTEMENT': c.biens?.map(b => b.num_appartement).filter(Boolean).join(', ') || 'N/A',
                'PRIX TOTAL (DH)': prixGlobal,
                'VERSÉ (DH)': totalVerse,
                'SOLDE RESTANT (DH)': Math.max(0, prixGlobal - totalVerse),
                'NB PAIEMENTS': c.payments?.length || 0,
                'DATE RÉSERVATION': c.date_reservation || 'N/A',
                'STATUTS': c.biens?.map(b => b.statut).join(', ') || 'N/A'
            };
        });

        exportToExcel(dataToExport, `clients_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Liste des clients exportée avec succès");
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 mx-1">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <Users className="text-slate-400 flex-shrink-0" size={26} />
                            Clients & Réservations
                        </h1>
                        <p className="text-slate-500 font-medium text-sm mt-1">Dossiers clients, situation financière et documents de <span className="text-slate-800 font-semibold">Société les cinq elements</span>.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-medium text-sm border border-slate-200 active:scale-[0.98]"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>

                        <button
                            onClick={() => navigate('/add-client')}
                            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-sm active:scale-[0.98] bg-slate-900 hover:bg-slate-800"
                        >
                            <PlusCircle size={18} />
                            Nouveau Client
                        </button>
                    </div>
                </div>

                {searchParams.get('client_id') && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <Info size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Affichage filtré</p>
                                <p className="text-xs text-slate-500 font-medium">Vous visualisez le dossier spécifique lié à la sélection de la carte.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/clients')}
                            className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-600 hover:text-white transition shadow-sm"
                        >
                            Afficher Tous
                        </button>
                    </div>
                )}

                {/* Contract Selection Modal */}
                {isContractModalOpen && contractTargetClient && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
                                <h3 className="font-semibold text-slate-800">Générer un Contrat</h3>
                                <button onClick={() => setIsContractModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-xs text-slate-500 text-center font-medium">Quel type de document souhaitez-vous générer pour <span className="font-semibold text-slate-800">{contractTargetClient.nom} {contractTargetClient.prenom}</span> ?</p>

                                <button
                                    onClick={() => {
                                        const bien = contractTargetClient.biens?.[0];
                                        if (!bien) { toast.error("Le client n'a pas de bien assigné."); return; }
                                        generateContract('RESERVATION',
                                            { nom: contractTargetClient.nom, prenom: contractTargetClient.prenom, cin: contractTargetClient.cin, tel: contractTargetClient.tel },
                                            { type_bien: bien.type_bien, num_appartement: bien.num_appartement || 'N/A', surface_m2: bien.surface_m2 || 0, prix_global: contractTargetClient.avec_finition ? bien.prix_global_finition : bien.prix_global_non_finition, projet_nom: bien.terrain?.nom_projet || "Vôtre Projet", etage: bien.etage?.toString() }
                                        );
                                        setIsContractModalOpen(false);
                                        toast.success("Contrat de réservation généré !");
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:bg-amber-50 hover:border-amber-200 transition group"
                                >
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-800 group-hover:text-amber-700">Contrat de Réservation</p>
                                        <p className="text-xs text-slate-400">Pour une nouvelle réservation</p>
                                    </div>
                                    <FileSignature size={20} className="text-slate-300 group-hover:text-amber-500" />
                                </button>

                                <button
                                    onClick={() => {
                                        const bien = contractTargetClient.biens?.[0];
                                        if (!bien) { toast.error("Le client n'a pas de bien assigné."); return; }
                                        generateContract('COMPROMIS',
                                            { nom: contractTargetClient.nom, prenom: contractTargetClient.prenom, cin: contractTargetClient.cin, tel: contractTargetClient.tel },
                                            { type_bien: bien.type_bien, num_appartement: bien.num_appartement || 'N/A', surface_m2: bien.surface_m2 || 0, prix_global: contractTargetClient.avec_finition ? bien.prix_global_finition : bien.prix_global_non_finition, projet_nom: bien.terrain?.nom_projet || "Vôtre Projet", etage: bien.etage?.toString() }
                                        );
                                        setIsContractModalOpen(false);
                                        toast.success("Compromis de vente généré !");
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition group"
                                >
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">Compromis de Vente</p>
                                        <p className="text-xs text-slate-400">Document légal définitif</p>
                                    </div>
                                    <Check size={20} className="text-slate-300 group-hover:text-blue-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-6 border-t border-slate-100">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Recherche intelligente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <select
                        value={filterFinition}
                        onChange={(e) => setFilterFinition(e.target.value as any)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Finition: Tous</option>
                        <option value="avec">Avec Finition</option>
                        <option value="sans">Sans Finition</option>
                    </select>

                    <select
                        value={filterContrat}
                        onChange={(e) => setFilterContrat(e.target.value as any)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Contrat: Tout</option>
                        <option value="avec">Avec Contrat</option>
                        <option value="sans">Sans Contrat</option>
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Type: Tous</option>
                        {Array.from(new Set(availableBiens.map(b => b.type_bien).filter(type => type && type !== "Terrain"))).sort().map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>


                    <select
                        value={filterStatutChoix}
                        onChange={(e) => setFilterStatutChoix(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option value="all">Statut Choix: Tous</option>
                        <option value="SANS_CHOIX">Sans Choix</option>
                        <option value="CHOIX_FAIT">Choix Fait</option>
                        <option value="CONTRAT_SIGNE">Contrat Signé</option>
                    </select>

                    <select
                        value={filterTerrain}
                        onChange={(e) => setFilterTerrain(e.target.value)}
                        className="cursor-pointer appearance-none pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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

                    <button
                        onClick={resetFilters}
                        className="w-full text-slate-400 hover:text-blue-600 text-sm font-medium flex items-center justify-center gap-2 transition border border-slate-100 rounded-lg py-2.5 hover:bg-slate-50"
                    >
                        <X size={14} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-800">Flux de Réservations</h3>
                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                            {filteredClients.length} / {clients.length} Entrées
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[200px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={18} />
                            <p className="text-sm">Chargement des réservations...</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="bg-white border-b border-slate-200">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Client</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Contact / CIN</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Prix Global</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Total Versé</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Reste</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Statut Bien</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Statut Choix</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClients.length > 0 ? (
                                    filteredClients.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold text-slate-800"><MarkdownText text={`${c.nom} ${c.prenom}`} /></div>
                                                    {c.statut === 'Annulé' && (
                                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">Annulé</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400">Réf: #{c.id} • {c.date_reservation || 'Pas de date'}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-xs text-slate-600 font-medium">{c.tel}</div>
                                                <div className="text-xs text-slate-400 font-medium"><MarkdownText text={c.cin} /></div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">
                                                {c.biens && c.biens.length > 0
                                                    ? formatNumber(c.biens.reduce((acc, b) => acc + (c.avec_finition ? (b.prix_global_finition || 0) : (b.prix_global_non_finition || 0)), 0)) + ' DH'
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-emerald-600">
                                                        {(() => {
                                                            const total = c.payments?.reduce((acc, p) => {
                                                                const amt = parseFloat(String(p.amount));
                                                                const refund = parseFloat(String(p.refund_amount || 0));
                                                                const commission = parseFloat(String(p.bank_commission || 0));
                                                                if (p.type === 'Reprise') return acc - amt;
                                                                return acc + (amt - refund - commission);
                                                            }, 0) || 0;
                                                            return formatNumber(total) + ' DH';
                                                        })()}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
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
                                            <td className="px-4 py-3 font-semibold text-rose-500">
                                                {(() => {
                                                    const prix = c.biens?.reduce((acc, b) => acc + (c.avec_finition ? (b.prix_global_finition || 0) : (b.prix_global_non_finition || 0)), 0) || 0;
                                                    const paid = c.payments?.reduce((acc, p) => {
                                                        const amt = parseFloat(String(p.amount));
                                                        const refund = parseFloat(String(p.refund_amount || 0));
                                                        const commission = parseFloat(String(p.bank_commission || 0));
                                                        if (p.type === 'Reprise') return acc - amt;
                                                        return acc + (amt - refund - commission);
                                                    }, 0) || 0;
                                                    const reste = Math.max(0, prix - paid);
                                                    if (!c.biens || c.biens.length === 0) return '—';
                                                    return reste > 0 ? formatNumber(reste) + ' DH' : 'Soldé';
                                                })()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {(c.biens || []).map(b => (
                                                        <span key={b.id} className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium flex-col ${b.statut === 'Libre' ? 'bg-green-100 text-green-700' :
                                                            b.statut === 'Vendu' ? 'bg-rose-100 text-rose-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            <span>{b.type_bien} {b.num_appartement ? <>Bloc #<MarkdownText text={b.num_appartement} /></> : ''}</span>
                                                            {c.biens && c.biens.length > 0 && c.statut !== 'Annulé' && (
                                                                Boolean(c.avec_contrat)
                                                                    ? <span className="text-[8px] font-semibold text-amber-600 mt-0.5">Avec Contrat</span>
                                                                    : <span className="text-[8px] font-semibold text-slate-400 mt-0.5">Sans Contrat</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                    {(!c.biens || c.biens.length === 0) && <span className="text-xs text-slate-400">Aucun bien</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.statut_choix === 'SANS_CHOIX' && (
                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">Sans Choix</span>
                                                )}
                                                {c.statut_choix === 'CHOIX_FAIT' && (
                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">Choix Fait</span>
                                                )}
                                                {c.statut_choix === 'CONTRAT_SIGNE' && (
                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Contrat Signé</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button
                                                        onClick={() => handleOpenPaymentModal(c)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                        title="Ajouter une Avance"
                                                    >
                                                        <PlusCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDetails(c)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                        title="Voir Détails"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenWhatsAppLangModal(c)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                        title="Envoyer Rappel WhatsApp"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openClientDocuments(c.id)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                        title="Documents de vente (contrat, compromis, attestation)"
                                                    >
                                                        <FileSignature size={16} />
                                                    </button>
                                                    <button onClick={() => handleEdit(c)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {(!c.biens || c.biens.length === 0) && (
                                                        <button
                                                            onClick={() => handleOpenClientAssoc(c)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                            title="Associer un bien"
                                                        >
                                                            <Link size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(c.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    {c.statut !== 'Annulé' && (
                                                        <button
                                                            onClick={() => { setContractTargetClient(c); setIsContractModalOpen(true); }}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                            title="Générer Contrat (PDF)"
                                                        >
                                                            <FileSignature size={16} />
                                                        </button>
                                                    )}
                                                    {c.statut !== 'Annulé' && (
                                                        <button
                                                            onClick={() => handleOpenCancelClient(c)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                            title="Annuler le contrat"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                            Aucun client trouvé.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )
                    }
                </div >
            </div >

            {/* Payment Modal */}
            {
                isPaymentModalOpen && selectedClient && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Banknote size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{editingPaymentId ? 'Modifier le Paiement' : 'Enregistrer une Avance'}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{selectedClient.nom} {selectedClient.prenom}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitPayment} className="flex-1 overflow-y-auto p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Montant du versement (DH)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">DH</span>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(formatNumber(e.target.value))}
                                            placeholder="0"
                                            className={`w-full ${fieldErrors.amount ? '!border-red-500' : 'border-slate-200'} pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        />
                                        {fieldErrors.amount && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.amount[0]}</p>}
                                    </div>
                                </div>

                                {selectedClient.biens && selectedClient.biens.length > 1 && (
                                    <div className="duration-200">
                                        <label className="block text-xs font-medium mb-2 text-emerald-600 text-slate-600">Bien Concerné</label>
                                        <select
                                            required
                                            value={selectedBienId}
                                            onChange={(e) => setSelectedBienId(e.target.value)}
                                            className={`w-full ${fieldErrors.bien_id ? '!border-red-500' : 'border-emerald-100'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        >
                                            <option value="">Sélectionnez le bien...</option>
                                            {selectedClient.biens.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.type_bien} {b.num_appartement ? `Bloc #${stripMarkdown(b.num_appartement)}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {fieldErrors.bien_id && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.bien_id[0]}</p>}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Mode de paiement</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className={`w-full ${fieldErrors.method ? '!border-red-500' : 'border-slate-200'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        >
                                            <option value="Espèces">💵 Espèces</option>
                                            <option value="Chèque">📋 Chèque</option>
                                            <option value="Virement">🏦 Virement</option>
                                            <option value="Effet">📑 Effet</option>
                                        </select>
                                        {fieldErrors.method && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.method[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Type</label>
                                        <select
                                            value={paymentType}
                                            onChange={(e) => setPaymentType(e.target.value)}
                                            className={`w-full ${fieldErrors.type ? '!border-red-500' : 'border-slate-200'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        >
                                            <option value="Avance">Avance</option>
                                            <option value="Tranche">Tranche</option>
                                            <option value="Reliquat">Reliquat</option>
                                            <option value="Caution">Caution</option>
                                            <option value="Reprise">Reprise</option>
                                        </select>
                                        {fieldErrors.type && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.type[0]}</p>}
                                    </div>
                                </div>

                                {(paymentMethod === 'Chèque' || paymentMethod === 'Virement' || paymentMethod === 'Effet') && (
                                    <div className="grid grid-cols-2 gap-4 duration-200">
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">
                                                {paymentMethod === 'Chèque' ? 'N° de Chèque' : paymentMethod === 'Virement' ? 'Référence' : 'N° d\'Effet'} <span className="text-[8px] opacity-50">(Facultatif)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                placeholder="Ex: CK-00123"
                                                className={`w-full ${fieldErrors.reference_no ? '!border-red-500' : 'border-slate-200'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                            />
                                            {fieldErrors.reference_no && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.reference_no[0]}</p>}
                                        </div>
                                        <div className="col-span-2 space-y-4">
                                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-emerald-800 leading-none">Net en compte (DH)</span>
                                                <span className="text-xl font-semibold text-emerald-600 font-mono">
                                                    {(parseNumber(paymentAmount) - parseNumber(bankCommission)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                                                </span>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-emerald-500 mb-2 text-slate-600">Commission Bancaire (DH)</label>
                                                <input
                                                    type="text"
                                                    value={bankCommission}
                                                    onChange={(e) => setBankCommission(formatNumber(e.target.value))}
                                                    placeholder="0 DH"
                                                    className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Notes / Observations <span className="text-[8px] opacity-50">(Facultatif)</span></label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder="Précisions sur le versement..."
                                        className={`w-full ${fieldErrors.notes ? '!border-red-500' : 'border-slate-200'} resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                    />
                                    {fieldErrors.notes && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.notes[0]}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Preuve de paiement (Image/PDF)</label>
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
                                            className={`w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-dashed ${fieldErrors.receipt ? '!border-red-500' : 'border-slate-300'} rounded-xl hover:bg-slate-100 hover:border-emerald-400 cursor-pointer transition`}
                                        >
                                            <div className="p-2 bg-white shadow-sm border border-slate-200 rounded-lg text-emerald-600">
                                                <Upload size={16} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-semibold text-slate-700 truncate">
                                                    {paymentFile ? paymentFile.name : 'Choisir un fichier'}
                                                </p>
                                                <p className="text-xs text-slate-400">{paymentFile ? `${(paymentFile.size / 1024).toFixed(0)} KB` : 'Max 5MB (JPG, PNG, PDF)'}</p>
                                            </div>
                                            {paymentFile && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setPaymentFile(null); }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </label>
                                        {fieldErrors.receipt && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.receipt[0]}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Date de l'opération</label>
                                    <div className="relative">
                                        <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                        <input
                                            type="text"
                                            required
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className={`w-full ${fieldErrors.payment_date ? '!border-red-500' : 'border-blue-100'} pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                            placeholder="JJ/MM/AAAA"
                                        />
                                        {fieldErrors.payment_date && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.payment_date[0]}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingPayment}
                                        className="flex-[2] px-4 py-2 disabled:bg-emerald-400 text-white rounded-lg shadow-sm transition font-medium text-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Edit2 size={20} />
                                    </div>
                                    <h3 className="font-semibold text-slate-800">Modifier le Client</h3>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateClient} className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Nom</label>
                                        <input
                                            type="text" required
                                            value={editFormData.nom || ''}
                                            onChange={e => setEditFormData({ ...editFormData, nom: e.target.value })}
                                            className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.nom ? '!border-red-500' : 'border-slate-200'} `}
                                        />
                                        {fieldErrors.nom && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.nom[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Prénom</label>
                                        <input
                                            type="text" required
                                            value={editFormData.prenom || ''}
                                            onChange={e => setEditFormData({ ...editFormData, prenom: e.target.value })}
                                            className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.prenom ? '!border-red-500' : 'border-slate-200'} `}
                                        />
                                        {fieldErrors.prenom && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.prenom[0]}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Téléphone</label>
                                        <input
                                            type="text" required
                                            value={editFormData.tel || ''}
                                            onChange={e => setEditFormData({ ...editFormData, tel: e.target.value })}
                                            className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.tel ? '!border-red-500' : 'border-slate-200'} `}
                                        />
                                        {fieldErrors.tel && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.tel[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">CIN</label>
                                        <input
                                            type="text" required
                                            value={editFormData.cin || ''}
                                            onChange={e => setEditFormData({ ...editFormData, cin: e.target.value })}
                                            className={`w-full ${fieldErrors.cin ? '!border-red-500' : 'border-slate-200'} pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        />
                                        {fieldErrors.cin && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.cin[0]}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Téléphone Sec.</label>
                                        <input
                                            type="text"
                                            value={editFormData.tel_2 || ''}
                                            onChange={e => setEditFormData({ ...editFormData, tel_2: e.target.value })}
                                            className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.tel_2 ? '!border-red-500' : 'border-slate-200'} `}
                                        />
                                        {fieldErrors.tel_2 && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.tel_2[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">E-mail (Optionnel)</label>
                                        <input
                                            type="email"
                                            value={editFormData.email || ''}
                                            onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                            className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.email ? '!border-red-500' : 'border-slate-200'} `}
                                            placeholder="client@gmail.com"
                                        />
                                        {fieldErrors.email && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.email[0]}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Adresse (Optionnel)</label>
                                    <textarea
                                        value={editFormData.adresse || ''}
                                        onChange={e => setEditFormData({ ...editFormData, adresse: e.target.value })}
                                        dir="auto"
                                        className={`w-full ${fieldErrors.adresse ? '!border-red-500' : 'border-slate-200'} resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        placeholder="123 Avenue Mohammed V..."
                                    />
                                    {fieldErrors.adresse && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.adresse[0]}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Statut du Client</label>
                                    <select
                                        value={editFormData.statut || 'Actif'}
                                        onChange={e => setEditFormData({ ...editFormData, statut: e.target.value })}
                                        className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${editFormData.statut === 'Annulé' ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}
                                    >
                                        <option value="Actif">Actif</option>
                                        <option value="Annulé">Annulé</option>
                                    </select>
                                </div>


                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Observations / Notes</label>
                                    <textarea
                                        value={editFormData.observation || ''}
                                        onChange={e => setEditFormData({ ...editFormData, observation: e.target.value })}
                                        className={`w-full ${fieldErrors.observation ? '!border-red-500' : 'border-slate-200'} resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                                        placeholder="Notes sur le client..."
                                    />
                                    {fieldErrors.observation && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.observation[0]}</p>}
                                </div>

                                {editFormData.statut === 'Actif' && (
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-slate-600">Bien Assigné</label>

                                        <select
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={editBienId}
                                            onChange={(e) => setEditBienId(e.target.value)}
                                        >
                                            <option value="">— Aucun bien —</option>
                                            {/* Current Bien */}
                                            {editBienId && !availableBiens.find(b => b.id === Number(editBienId)) && (
                                                (() => {
                                                    const currentClient = clients.find(c => c.id === editFormData.id);
                                                    const b = currentClient?.biens?.find(x => x.id === Number(editBienId));
                                                    return b ? (
                                                        <option key={b.id} value={b.id}>
                                                            {b.type_bien} {b.nom ? `(${b.nom})` : ''} {b.num_appartement ? `Bloc #${stripMarkdown(b.num_appartement)}` : ''} (Actuel)
                                                        </option>
                                                    ) : null;
                                                })()
                                            )}
                                            {availableBiens.map((b) => (
                                                <option
                                                    key={b.id}
                                                    value={b.id}
                                                    disabled={b.statut !== 'Libre' && b.id !== Number(editBienId)}
                                                >
                                                    {b.type_bien} {b.nom ? `(${b.nom})` : ''} {b.num_appartement ? `(Bloc ${b.num_appartement})` : ''} · {b.statut === 'Libre' ? '🟢 Libre' : '🟠 Réservé'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}


                                {editBienId && editFormData.statut === 'Actif' && (
                                    <div className="grid grid-cols-3 gap-3 duration-300">
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-2">
                                            <p className="text-xs font-medium text-blue-900">Finition</p>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editFormData.avec_finition || false}
                                                    onChange={e => setEditFormData({ ...editFormData, avec_finition: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                            </label>
                                        </div>
                                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col gap-2">
                                            <p className="text-xs font-medium text-amber-900">Contrat</p>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editFormData.avec_contrat || false}
                                                    onChange={e => setEditFormData({ ...editFormData, avec_contrat: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                            </label>
                                        </div>
                                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col gap-2">
                                            <p className="text-xs font-medium text-emerald-900">Choix</p>
                                            <select
                                                value={editFormData.statut_choix || 'SANS_CHOIX'}
                                                onChange={e => setEditFormData({ ...editFormData, statut_choix: e.target.value as any })}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            >
                                                <option value="SANS_CHOIX">S. Choix</option>
                                                <option value="CHOIX_FAIT">Choix Fait</option>
                                                <option value="CONTRAT_SIGNE">C. Signé</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {editBienId && editFormData.statut === 'Actif' && editFormData.avec_contrat && (
                                    <div className="duration-300 mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-medium text-slate-600">Contrat Scanné (PDF/Image)</label>
                                            {editFormData.scan_contrat && (
                                                <button type="button" onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${editFormData.scan_contrat}`))} className="text-xs text-amber-600 font-medium hover:underline flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                    <FileText size={12} /> Voir actuel
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id="contract-upload"
                                            className="hidden"
                                            accept="application/pdf,image/*"
                                            onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                                        />
                                        <label htmlFor="contract-upload" className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 border border-dashed border-amber-200 text-amber-700 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
                                            <Upload size={16} />
                                            <span className="text-xs font-medium text-center">
                                                {contractFile ? contractFile.name : editFormData.scan_contrat ? 'Remplacer le contrat existant...' : 'Choisir le contrat scanné...'}
                                            </span>
                                        </label>
                                        {fieldErrors.scan_contrat && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.scan_contrat[0]}</p>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-600">Date Réservation (JJ/MM/AAAA)</label>
                                    <input
                                        type="text"
                                        value={editFormData.date_reservation || ''}
                                        onChange={e => setEditFormData({ ...editFormData, date_reservation: e.target.value })}
                                        className={`w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 ${fieldErrors.date_reservation ? '!border-red-500' : 'border-slate-200'} `}
                                        placeholder="JJ/MM/AAAA"
                                    />
                                    {fieldErrors.date_reservation && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.date_reservation[0]}</p>}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingEdit}
                                        className="flex-[2] px-4 py-2.5 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800"
                                    >
                                        {isSubmittingEdit ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Mettre à jour</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }

            {/* Client Details Modal */}
            {
                isDetailsModalOpen && detailClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Info size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Dossier Client</h3>
                                        <p className="text-xs text-slate-400 font-medium">Réf: #{detailClient.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="px-6 py-3 bg-blue-600/5 border-b border-blue-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-blue-400">Assistant CRM Intelligent</span>
                                <button
                                    onClick={() => handleGenerateEmailWithAI(detailClient)}
                                    disabled={isAILoading}
                                    className="flex items-center gap-2 text-white px-4 py-1.5 rounded-lg transition font-medium text-sm shadow-sm active:scale-[0.98] disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                                >
                                    {isAILoading ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                                    Générer Email Pro (AI)
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-xs font-medium text-slate-400 mb-1">Prix Global</p>
                                        <p className="text-lg font-semibold text-slate-700">
                                            {formatNumber(detailClient.biens?.reduce((acc, b) => acc + (detailClient.avec_finition ? (b.prix_global_finition || 0) : (b.prix_global_non_finition || 0)), 0) || 0)} <span className="text-xs">DH</span>
                                        </p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <p className="text-xs font-medium text-emerald-500 mb-1">Total Versé</p>
                                        <p className="text-lg font-semibold text-emerald-600">
                                            {(() => {
                                                const total = detailClient.payments?.reduce((acc, p) => {
                                                    const amt = parseFloat(String(p.amount));
                                                    const refund = parseFloat(String(p.refund_amount || 0));
                                                    const commission = parseFloat(String(p.bank_commission || 0));
                                                    if (p.type === 'Reprise') return acc - amt;
                                                    return acc + (amt - refund - commission);
                                                }, 0) || 0;
                                                return formatNumber(total);
                                            })()} <span className="text-xs">DH</span>
                                        </p>
                                    </div>
                                    <div className="p-4 bg-rose-50 rounded-xl border !border-rose-100">
                                        <p className="text-xs font-medium text-rose-400 mb-1">Reste à payer</p>
                                        <p className="text-lg font-semibold text-rose-600">
                                            {(() => {
                                                const prix = detailClient.biens?.reduce((acc, b) => acc + (detailClient.avec_finition ? (b.prix_global_finition || 0) : (b.prix_global_non_finition || 0)), 0) || 0;
                                                const paid = detailClient.payments?.reduce((acc, p) => {
                                                    const amt = parseFloat(String(p.amount));
                                                    const refund = parseFloat(String(p.refund_amount || 0));
                                                    const commission = parseFloat(String(p.bank_commission || 0));
                                                    if (p.type === 'Reprise') return acc - amt;
                                                    return acc + (amt - refund - commission);
                                                }, 0) || 0;
                                                return formatNumber(Math.max(0, prix - paid));
                                            })()} <span className="text-xs">DH</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-medium text-slate-400 border-b pb-2">Informations Personnelles</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Nom Complet:</span>
                                                <span className="font-semibold text-slate-700 capitalize">{detailClient.nom} {detailClient.prenom}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Téléphone:</span>
                                                <span className="font-semibold text-slate-700">{detailClient.tel}</span>
                                            </div>
                                            {detailClient.tel_2 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Tél Sec.:</span>
                                                    <span className="font-semibold text-slate-700">{detailClient.tel_2}</span>
                                                </div>
                                            )}
                                            {detailClient.email && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">E-mail:</span>
                                                    <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={detailClient.email}>{detailClient.email}</span>
                                                </div>
                                            )}
                                            {detailClient.adresse && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Adresse:</span>
                                                    <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={detailClient.adresse}>{detailClient.adresse}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">CIN:</span>
                                                <span className="font-semibold text-slate-700"><MarkdownText text={detailClient.cin} /></span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Date Réservation:</span>
                                                <span className="font-semibold text-slate-700">{detailClient.date_reservation || 'N/A'}</span>
                                            </div>
                                            {detailClient.biens && detailClient.biens.length > 0 && detailClient.statut !== 'Annulé' && (
                                                <>
                                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-50 mt-2">
                                                        <span className="text-slate-400 font-medium text-xs">Statut Contrat:</span>
                                                        {detailClient.avec_contrat ? (
                                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">Avec Contrat</span>
                                                        ) : (
                                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">Sans Contrat</span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm pt-1">
                                                        <span className="text-slate-400 font-medium text-xs">Choix Finition:</span>
                                                        {detailClient.avec_finition ? (
                                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">Options Incluses</span>
                                                        ) : (
                                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">Standard</span>
                                                        )}
                                                    </div>
                                                    {Boolean(detailClient.avec_contrat) && detailClient.scan_contrat && (
                                                        <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-slate-50">
                                                            <span className="text-slate-400 font-medium text-xs">Contrat Attaché:</span>
                                                            <button onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${detailClient.scan_contrat}`))} className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-semibold hover:bg-amber-100 transition-colors border border-amber-100">
                                                                <FileText size={12} /> Voir
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {detailClient.observation && (
                                                <div className={`mt-4 p-3 rounded-xl border ${detailClient.statut === 'Annulé' ? 'bg-rose-50 !border-rose-100' : 'bg-blue-50/50 border-blue-100/50'}`}>
                                                    <p className={`text-xs font-semibold mb-1 ${detailClient.statut === 'Annulé' ? 'text-rose-400' : 'text-blue-400'}`}>
                                                        {detailClient.statut === 'Annulé' ? 'Motif de l\'Annulation' : 'Observations / Notes'}
                                                    </p>
                                                    <p className="text-xs text-slate-600 leading-relaxed"><MarkdownText text={detailClient.observation} /></p>
                                                </div>
                                            )}
                                        </div>
                                    </div>



                                    <div className="space-y-4">
                                        <h4 className="text-xs font-medium text-slate-400 border-b pb-2">Détails des Biens</h4>
                                        {detailClient.biens && detailClient.biens.length > 0 ? (
                                            <div className="space-y-4">
                                                {detailClient.biens.map(b => (
                                                    <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-slate-400">Type / Unité:</span>
                                                            <span className="font-semibold text-slate-700">{b.type_bien} {b.num_appartement ? <>Bloc #<MarkdownText text={b.num_appartement} /></> : ''}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-slate-400">Localisation:</span>
                                                            <span className="font-semibold text-slate-700"> {b.immeuble ? `Imm. ${b.immeuble}` : ''} {b.etage === 0 ? 'RDC' : b.etage ? `Étage ${b.etage}` : ''}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-400">Statut:</span>
                                                                <span className={`font-semibold ${b.statut === 'Libre' ? 'text-green-600' : 'text-amber-600'}`}>{b.statut}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => navigate(`/edit-property/${b.id}`)}
                                                                className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg text-sm font-medium transition bg-slate-900 hover:bg-slate-800"
                                                                title="Suivi de Réalisation"
                                                            >
                                                                <Paintbrush size={12} />
                                                                Suivi
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400">Aucun bien assigné.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-xs font-medium text-slate-400">Documents Scannés</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">{detailClient.scanned_docs?.length || 0} Fichiers</span>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploadingDoc}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
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
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm border border-slate-200">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-xs font-medium text-slate-700 truncate" title={doc.name}>{doc.name}</p>
                                                            <p className="text-xs text-slate-400 capitalize">{doc.created_at}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center transition-opacity justify-end gap-0.5">
                                                        <button
                                                            onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${doc.path}`))}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                            title="Voir"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDocument(detailClient, idx)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-xs text-slate-400">Aucun document numérisé.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="text-xs font-medium text-slate-400">Historique des Paiements</h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    handleOpenPaymentModal(detailClient);
                                                    setPaymentType('Reprise');
                                                }}
                                                className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition font-medium text-sm border border-orange-100 shadow-sm active:scale-[0.98]"
                                            >
                                                <TrendingDown size={12} />
                                                Nouveau Reprise
                                            </button>
                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">{detailClient.payments?.length || 0} Opérations</span>
                                        </div>
                                    </div>
                                    {detailClient.payments && detailClient.payments.length > 0 ? (
                                        <div className="space-y-3">
                                            {detailClient.payments.sort((a, b) => {
                                                const dateB = parseDate(b.payment_date).getTime();
                                                const dateA = parseDate(a.payment_date).getTime();
                                                if (dateB !== dateA) return dateB - dateA;
                                                return b.id - a.id;
                                            }).map((p) => (
                                                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${p.status === 'Cancelled' ? 'bg-red-50 !border-red-100 opacity-75' : p.type === 'Reprise' ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`hidden`}>
                                                            {p.type === 'Reprise' ? <TrendingDown size={16} /> : <Banknote size={16} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold text-slate-800">{formatNumber(p.amount)} DH</p>
                                                                {p.status === 'Cancelled' && (
                                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-red-600 text-white">Annulé (Remboursé: {formatNumber(p.refund_amount)} DH)</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <span className="font-semibold">{p.type}</span>
                                                                <span>•</span>
                                                                <span>{p.method}</span>
                                                                <span>•</span>
                                                                <span>{p.payment_date}</span>
                                                                {p.bank_commission > 0 && (
                                                                    <div className="mt-1 flex items-center gap-2">
                                                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 !border-rose-100 ring-1 ring-inset ring-rose-600/20">
                                                                            COMMISSION: {formatNumber(p.bank_commission)} DH
                                                                        </span>
                                                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                                            NET: {formatNumber(parseFloat(String(p.amount)) - parseFloat(String(p.bank_commission)))} DH
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {p.bien && (
                                                                <div className="text-xs text-blue-500 font-medium mt-1">
                                                                    {p.bien.type_bien} {p.bien.num_appartement ? <>Bloc #<MarkdownText text={p.bien.num_appartement} /></> : `ID #${p.bien.id}`}
                                                                </div>
                                                            )}
                                                            {(p.reference_no || p.bank_name) && (
                                                                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 font-medium">
                                                                    {p.reference_no && <span>Réf: {p.reference_no}</span>}
                                                                    {p.bank_name && <span>• {p.bank_name}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {p.status !== 'Cancelled' && (
                                                            <>

                                                                <button
                                                                    onClick={() => {
                                                                        setTargetPayment(p);
                                                                        setRefundAmount(formatNumber(p.amount));
                                                                        setIsCancelModalOpen(true);
                                                                    }}
                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                                    title="Remboursement"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenPaymentModal(detailClient, p)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                            title="Modifier le paiement"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePayment(p.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
                                                            title="Supprimer le paiement"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        {p.receipt_path && (
                                                            <button
                                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${p.receipt_path}`))}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
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
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400">Aucun versement enregistré pour le moment.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm transition bg-slate-900 hover:bg-slate-800"
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
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
                                <h3 className="font-semibold text-slate-800">Remboursement</h3>
                                <button onClick={() => setIsCancelModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleCancelPayment} className="p-6 space-y-4">
                                <p className="text-sm text-slate-500">Montant payé: <span className="font-semibold text-slate-800">{formatNumber(targetPayment.amount)} DH</span></p>
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Montant à rembourser (DH)</label>
                                    <input
                                        type="text"
                                        required
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(formatNumber(e.target.value))}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Vou pouvez rembourser tout ou partie du montant original.</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsCancelModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Ignorer</button>
                                    <button type="submit" disabled={isSubmittingCancel} className="flex-[2] px-4 py-2 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm bg-red-600 hover:bg-red-700">
                                        {isSubmittingCancel ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Confirmer le Remboursement</>}
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
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                                <h3 className="font-semibold text-slate-800">Associer à un Bien</h3>
                                <button onClick={() => setIsAssociateModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleAssociatePayment} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Choisir un bien pour ce montant</label>
                                    <select
                                        required
                                        value={selectedBienId}
                                        onChange={(e) => setSelectedBienId(e.target.value)}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
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
                                    <button type="button" onClick={() => setIsAssociateModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Annuler</button>
                                    <button type="submit" disabled={isSubmittingAssociate} className="flex-[2] px-4 py-2 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm bg-slate-900 hover:bg-slate-800">
                                        {isSubmittingAssociate ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Associer le bien</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Client → Bien Association Modal */}
            {
                isClientAssocModalOpen && assocTargetClient && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                                        <Link size={16} className="text-amber-500" />
                                        Associer un Bien
                                    </h3>
                                    <p className="text-xs font-medium text-amber-600 mt-0.5">
                                        CLIENT : <MarkdownText text={`${assocTargetClient.nom} ${assocTargetClient.prenom}`} />
                                    </p>
                                </div>
                                <button onClick={() => setIsClientAssocModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleClientAssociateBien} className="p-6 space-y-4">
                                {/* Search field */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        placeholder="N° bloc, étage, projet, ou tapez 'bloc'..."
                                        value={assocBienSearch}
                                        onChange={(e) => setAssocBienSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>

                                {/* Type Filters */}
                                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                                    {['all', 'Appartement', 'Magasin', 'Bureau', 'Parking', 'Jardin'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setAssocBienTypeFilter(t)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${assocBienTypeFilter === t
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                : 'bg-white text-slate-500 border-slate-100 hover:border-amber-200'
                                                }`}
                                        >
                                            {t === 'all' ? 'Tous les types' : t === 'Appartement' ? 'Blocs (Appart.)' : t}
                                        </button>
                                    ))}
                                </div>

                                {/* Floor Filters */}
                                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                                    {['all', '0', '1', '2', '3', '4', '5'].map(floor => (
                                        <button
                                            key={floor}
                                            type="button"
                                            onClick={() => setAssocBienFloorFilter(floor)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${assocBienFloorFilter === floor
                                                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                                : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
                                                }`}
                                        >
                                            {floor === 'all' ? 'Tous les étages' : floor === '0' ? 'RDC' : `Étage ${floor}`}
                                        </button>
                                    ))}
                                </div>

                                {/* Filtered bien list */}
                                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                                    {availableBiens
                                        .filter(b => b.statut === 'Libre')
                                        .filter(b => b.statut === 'Libre')
                                        .filter(b => {
                                            // Filter by UI Pills
                                            if (assocBienTypeFilter !== 'all' && b.type_bien !== assocBienTypeFilter) return false;
                                            if (assocBienFloorFilter !== 'all' && String(b.etage) !== assocBienFloorFilter) return false;

                                            const q = assocBienSearch.toLowerCase().trim();
                                            if (!q) return true;

                                            // Smarter keyword matching
                                            if (q === 'bloc' || q === 'blocs') return b.type_bien === 'Appartement';

                                            const etageMatch = q.match(/(?:etage|étage)\s*(\d+)/);
                                            if (etageMatch) return String(b.etage) === etageMatch[1];

                                            return b.num_appartement?.toLowerCase().includes(q) ||
                                                b.immeuble?.toLowerCase().includes(q) ||
                                                b.type_bien?.toLowerCase().includes(q) ||
                                                b.nom?.toLowerCase().includes(q) ||
                                                b.terrain?.nom_projet?.toLowerCase().includes(q) ||
                                                String(b.etage) === q ||
                                                String(b.id).includes(q);
                                        })
                                        .map(b => (
                                            <label
                                                key={b.id}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${assocBienId === String(b.id)
                                                    ? 'bg-amber-50 border-amber-400 shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="assocBien"
                                                    value={b.id}
                                                    checked={assocBienId === String(b.id)}
                                                    onChange={() => setAssocBienId(String(b.id))}
                                                    className="accent-amber-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 break-words">
                                                        <MarkdownText text={b.type_bien === 'Appartement' ? 'Bloc' : b.type_bien} />
                                                        {b.nom ? <> – <MarkdownText text={b.nom} /></> : ''}
                                                        {b.immeuble ? <> – Imm. <MarkdownText text={b.immeuble} /></> : ''}
                                                        {b.num_appartement ? <> – N° Appartement <MarkdownText text={b.num_appartement} /></> : ''}
                                                        {b.etage === 0 ? ' (RDC)' : b.etage ? ` (Étage ${b.etage})` : ''}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {b.terrain?.nom_projet || `Projet #${b.terrain_id}`}
                                                        {b.surface_m2 ? ` · ${b.surface_m2} m²` : ''}
                                                    </p>
                                                </div>
                                                <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 shrink-0 ring-1 ring-inset ring-blue-600/20">Libre</span>
                                            </label>
                                        ))}
                                    {availableBiens.filter(b => b.statut === 'Libre' && (
                                        !assocBienSearch ||
                                        b.num_appartement?.toLowerCase().includes(assocBienSearch.toLowerCase()) ||
                                        b.immeuble?.toLowerCase().includes(assocBienSearch.toLowerCase()) ||
                                        b.type_bien?.toLowerCase().includes(assocBienSearch.toLowerCase()) ||
                                        b.terrain?.nom_projet?.toLowerCase().includes(assocBienSearch.toLowerCase()) ||
                                        String(b.id).includes(assocBienSearch)
                                    )).length === 0 && (
                                            <div className="py-8 text-center text-slate-400 text-sm font-medium">
                                                Aucun bien libre trouvé.
                                            </div>
                                        )}
                                </div>

                                {/* Avec finition toggle */}
                                {assocBienId && (
                                    <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">Avec Finition ?</p>
                                            <p className="text-xs text-blue-500">Le client souhaite-t-il la finition ?</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={assocAvecFinition}
                                                onChange={e => setAssocAvecFinition(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                        </label>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setIsClientAssocModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition">
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingAssoc || !assocBienId}
                                        className="flex-[2] px-4 py-2 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition bg-slate-900 hover:bg-slate-800"
                                    >
                                        {isSubmittingAssoc ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Associer</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* WhatsApp Language Modal */}
            {
                isWhatsAppLangModalOpen && whatsappTargetClient && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                                <h3 className="font-semibold text-slate-800">Choisir la Langue / اختر اللغة</h3>
                                <button
                                    onClick={() => setIsWhatsAppLangModalOpen(false)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleWhatsAppMessage(whatsappTargetClient, 'fr')}
                                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition group"
                                >
                                    <span className="text-3xl">🇫🇷</span>
                                    <span className="font-semibold text-slate-700 group-hover:text-emerald-700">Français</span>
                                </button>

                                <button
                                    onClick={() => handleWhatsAppMessage(whatsappTargetClient, 'ar')}
                                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition group"
                                >
                                    <span className="text-3xl">🇲🇦</span>
                                    <span className="font-semibold text-slate-700 group-hover:text-emerald-700">العربية</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* WhatsApp Editor Modal */}
            {
                isWhatsAppEditorOpen && whatsappTargetClient && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <MessageCircle size={18} className="text-emerald-600" />
                                    Modifier le Message
                                </h3>
                                <button
                                    onClick={() => setIsWhatsAppEditorOpen(false)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="px-6 py-2 bg-emerald-600/5 border-b border-emerald-100 flex items-center justify-between">
                                <span className="text-xs font-medium text-emerald-600">Amélioration Premium</span>
                                <button
                                    onClick={handleImproveWithAI}
                                    disabled={isAILoading}
                                    className="flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 transition font-medium text-sm shadow-sm active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isAILoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    Améliorer avec l'IA ✨
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">
                                        Contenu du message (Tapez *texte* pour le gras)
                                    </label>
                                    <textarea
                                        value={whatsappMessageContent}
                                        onChange={(e) => setWhatsappMessageContent(e.target.value)}
                                        rows={8}
                                        className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        dir="auto"
                                    />
                                </div>

                                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                    <label className="block text-xs font-medium text-emerald-600 mb-3 text-slate-600">Aperçu WhatsApp</label>
                                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {whatsappMessageContent.split('\n').map((line, i) => (
                                            <div key={i} className="mb-1">
                                                {line.split(/(\*.*?\*)/g).map((part, j) => {
                                                    if (part.startsWith('*') && part.endsWith('*')) {
                                                        return <strong key={j} className="font-semibold text-slate-900">{part.slice(1, -1)}</strong>;
                                                    }
                                                    return part;
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setIsWhatsAppEditorOpen(false)}
                                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSendWhatsApp}
                                        className="px-4 py-2 text-white font-medium text-sm rounded-lg shadow-sm flex items-center gap-2 transition-colors bg-slate-900 hover:bg-slate-800"
                                    >
                                        <MessageCircle size={16} />
                                        Envoyer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* WhatsApp Phone Selection Modal */}
            {
                isWhatsAppPhoneModalOpen && whatsappTargetClient && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                                <h3 className="font-semibold text-slate-800">Sélectionner le Numéro</h3>
                                <button
                                    onClick={() => setIsWhatsAppPhoneModalOpen(false)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        setWhatsappTargetPhone(whatsappTargetClient.tel);
                                        setIsWhatsAppPhoneModalOpen(false);
                                        setIsWhatsAppLangModalOpen(true);
                                    }}
                                    className="flex flex-col items-start gap-1 p-4 rounded-lg border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                                >
                                    <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-400">Numéro Principal</span>
                                    <span className="font-semibold text-slate-700 group-hover:text-blue-700">{whatsappTargetClient.tel}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setWhatsappTargetPhone(whatsappTargetClient.tel_2 as string);
                                        setIsWhatsAppPhoneModalOpen(false);
                                        setIsWhatsAppLangModalOpen(true);
                                    }}
                                    className="flex flex-col items-start gap-1 p-4 rounded-lg border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                                >
                                    <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-400">Numéro Secondaire</span>
                                    <span className="font-semibold text-slate-700 group-hover:text-blue-700">{whatsappTargetClient.tel_2}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Client Cancellation Modal */}
            {
                isClientCancelModalOpen && clientToCancel && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <X size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Annuler le Contrat</h3>
                                        <p className="text-xs text-rose-600/70 font-medium">Client: {clientToCancel.nom} {clientToCancel.prenom}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsClientCancelModalOpen(false)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleCancelClient} className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Info size={18} className="text-amber-600 shrink-0" />
                                            <p className="text-xs text-amber-800 font-medium leading-relaxed tracking-tight">Résumé financier du client</p>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-200/50">
                                            <span className="text-xs font-semibold text-amber-900/60">Total Versé :</span>
                                            <span className="text-sm font-semibold text-amber-900 font-mono">
                                                {formatNumber(clientToCancel.payments?.reduce((acc, p) => {
                                                    const amt = parseFloat(String(p.amount));
                                                    const refund = parseFloat(String(p.refund_amount || 0));
                                                    const commission = parseFloat(String(p.bank_commission || 0));
                                                    if (p.type === 'Reprise') return acc - amt;
                                                    return acc + (amt - refund - commission);
                                                }, 0) || 0)} DH
                                            </span>
                                        </div>
                                        <p className="text-xs text-amber-700 font-medium leading-tight">
                                            L'annulation libérera automatiquement tous les biens réservés. Le statut passera à <span className="font-bold">Annulé</span>.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Montant du Remboursement (DH)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={clientRefundAmount}
                                            onChange={(e) => setClientRefundAmount(formatNumber(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="0.00"
                                        />
                                        <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400 font-medium">Laissez vide ou 0 si aucun remboursement n'est effectué.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Motif / Notes</label>
                                    <textarea
                                        value={clientCancelNotes}
                                        onChange={(e) => setClientCancelNotes(e.target.value)}
                                        className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Précisez le motif de l'annulation..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsClientCancelModalOpen(false)}
                                        className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-lg font-semibold hover:bg-slate-100 transition text-xs"
                                    >
                                        Fermer
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingClientCancel}
                                        className="flex-[2] h-11 text-white rounded-lg font-medium transition shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 text-sm bg-slate-900 hover:bg-slate-800"
                                    >
                                        {isSubmittingClientCancel ? <Loader2 className="animate-spin" size={20} /> : "Confirmer l'Annulation"}
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
