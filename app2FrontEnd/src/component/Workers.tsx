// src/component/Workers.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Loader2, Trash2, Edit2, X, User, Phone, FileText,
    Calendar, Search, Download, Briefcase, Ruler, Maximize,
    Clock, CheckCircle2, Banknote, Eye, Info, Printer,
    ChevronRight, TrendingUp, UserCheck, Home, Users, Sparkles, Mic, MicOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, STORAGE_BASE } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber, parseNumber } from '../lib/utils';
import { openExternal } from '../lib/tauri';
import { extractMissionFromVoice } from '../lib/gemini';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';

interface WorkerMission {
    id: number;
    ouvrier_id: number;
    terrain_id: number | null;
    type: 'journalier' | 'periode' | 'm2' | 'ml' | 'forfait';
    start_date: string;
    end_date: string | null;
    quantity: number;
    unit_price: number;
    total_amount: number;
    description: string | null;
    partner_name: string | null;
    partner_id: number | null;
    partner_share: number;
    partner?: Worker;
    status: 'pending' | 'completed';
    terrain?: { nom_projet: string; nom_terrain: string };
    created_at: string;
}

interface WorkerPayment {
    id: number;
    amount: number;
    payment_date: string;
    method: string;
    reference_no: string | null;
    bank_name: string | null;
    bank_commission: number;
    notes: string | null;
}

interface Worker {
    id: number;
    name: string;
    cin: string | null;
    speciality: string;
    phone: string | null;
    phone_whatsapp: string | null;
    scan_cin: string | null;
    total_earned: number;
    paid_amount: number;
    rib: string | null;
    status: 'active' | 'inactive';
    missions: WorkerMission[];
    payments: WorkerPayment[];
}

const Workers = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [biens, setBiens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = usePersistedState('Workers.searchTerm', '');
    useUrlSearch(setSearchTerm);
    const [filterSpeciality, setFilterSpeciality] = usePersistedState('Workers.filterSpeciality', 'all');

    // Modals
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
    const [isGlobalMissionModalOpen, setIsGlobalMissionModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<WorkerPayment | null>(null);
    const [activeTab, setActiveTab] = useState<'missions' | 'payments'>('missions');

    // Selected Data
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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


    // Form Data
    const [showArchived, setShowArchived] = useState(false);

    // WhatsApp Confirmation Modal
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [whatsappNumbers, setWhatsappNumbers] = useState<{ label: string, value: string }[]>([]);
    const [selectedWNumber, setSelectedWNumber] = useState('');

    // Voice-to-Action state
    const [isVoiceListening, setIsVoiceListening] = useState(false);
    const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
    const voiceRecognitionRef = useRef<any>(null);

    const [workerForm, setWorkerForm] = useState({
        name: '',
        cin: '',
        speciality: 'Maçon',
        phone: '',
        phone_whatsapp: '',
        rib: '',
        status: 'active' as 'active' | 'inactive'
    });
    const [scanFile, setScanFile] = useState<File | null>(null);

    const [missionForm, setMissionForm] = useState({
        terrain_id: '',
        bien_id: '',
        type: 'journalier' as 'journalier' | 'periode' | 'm2' | 'ml' | 'forfait',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        quantity: '1',
        unit_price: '',
        description: '',
        partner_name: '',
        partner_id: '',
        partnerSearchTerm: '',
        partner_share: '0',
        isSplit: false,
        bienSearchTerm: '',
    });

    const [globalMissionForm, setGlobalMissionForm] = useState({
        primary_worker_id: '',
        primarySearchTerm: '',
        terrain_id: '',
        bien_id: '',
        type: 'journalier' as 'journalier' | 'periode' | 'm2' | 'ml' | 'forfait',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        quantity: '1',
        unit_price: '',
        description: '',
        partner_id: '',
        partnerSearchTerm: '',
        partner_share: '0',
        isSplit: true,
        bienSearchTerm: '',
    });

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        method: 'Espèces',
        reference_no: '',
        bank_name: '',
        bank_commission: '0',
        notes: '',
    });

    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    const MONTHS = [
        { value: '1', label: 'Janvier' }, { value: '2', label: 'Février' }, { value: '3', label: 'Mars' },
        { value: '4', label: 'Avril' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juin' },
        { value: '7', label: 'Juillet' }, { value: '8', label: 'Août' }, { value: '9', label: 'Septembre' },
        { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' }
    ];

    const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

    const SPECIALITIES = [
        "Maçon", "Peintre", "Electricien", "Plombier", "Menuisier",
        "Ferrailleur", "Coffreur", "Carreleur", "Staffeur", "Gardien de chantier", "Autre"
    ];

    const MISSION_TYPES = [
        { value: 'journalier', label: 'Journée simple', icon: <Clock size={16} />, desc: 'Travail ponctuel (1 jour)' },
        { value: 'periode', label: 'Période (Multijours)', icon: <Calendar size={16} />, desc: 'Contrat sur une durée' },
        { value: 'm2', label: 'Mètre Carré (m²)', icon: <Maximize size={16} />, desc: 'Paiement à la surface' },
        { value: 'ml', label: 'Mètre Linéaire (ml)', icon: <Ruler size={16} />, desc: 'Paiement à la longueur' },
        { value: 'forfait', label: 'Forfait (Montant Global)', icon: <Briefcase size={16} />, desc: 'Montant fixe pour la tâche' },
    ];

    const fetchWorkers = async () => {
        try {
            const data = await apiFetch<Worker[]>('/ouvriers');
            setWorkers(data);
            if (selectedWorker) {
                const updated = data.find(w => w.id === selectedWorker.id);
                if (updated) setSelectedWorker(updated);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement des ouvriers');
        } finally {
            setLoading(false);
        }
    };


    const handleArchiveWorker = async (worker: Worker) => {
        const newStatus = worker.status === 'active' ? 'inactive' : 'active';
        try {
            // Only send fields that are required by the controller validation
            // and avoid sending scan_cin (which is a string path) to prevent validation errors
            const updatePayload = {
                name: worker.name,
                cin: worker.cin,
                speciality: worker.speciality,
                phone: worker.phone,
                phone_whatsapp: worker.phone_whatsapp,
                rib: worker.rib,
                status: newStatus,
                _method: 'PUT'
            };

            await apiFetch(`/ouvriers/${worker.id}`, {
                method: 'POST',
                body: JSON.stringify(updatePayload)
            });
            toast.success(newStatus === 'inactive' ? 'Ouvrier archivé' : 'Ouvrier restauré');
            fetchWorkers();
            if (selectedWorker?.id === worker.id) {
                setSelectedWorker({ ...worker, status: newStatus });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'archivage');
        }
    };

    const fetchTerrains = async () => {
        try {
            const data = await apiFetch<any[]>('/terrains');
            setTerrains(data);
        } catch (err: any) {
            console.error('Error fetching terrains:', err);
        }
    };

    const fetchBiens = async () => {
        try {
            const data = await apiFetch<any[]>('/biens');
            setBiens(data);
        } catch (err: any) {
            console.error('Error fetching biens:', err);
        }
    };

    useEffect(() => {
        fetchWorkers();
        fetchTerrains();
        fetchBiens();
    }, []);

    // Auto-calculate quantity for period missions
    useEffect(() => {
        if (missionForm.type === 'periode' && missionForm.start_date && missionForm.end_date) {
            const start = new Date(missionForm.start_date);
            const end = new Date(missionForm.end_date);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 0) {
                setMissionForm(prev => ({ ...prev, quantity: diffDays.toString() }));
            }
        }
    }, [missionForm.start_date, missionForm.end_date, missionForm.type]);

    // Smart Price Memory Effect
    useEffect(() => {
        if (selectedWorker && missionForm.terrain_id && missionForm.type && !missionForm.unit_price) {
            const lastMission = selectedWorker.missions
                .filter(m => m.terrain_id?.toString() === missionForm.terrain_id && m.type === missionForm.type)
                .sort((a, b) => b.id - a.id)[0];

            if (lastMission) {
                setMissionForm(prev => ({ ...prev, unit_price: formatNumber(lastMission.unit_price.toString()) }));
                toast.success(`Prix suggéré basé sur l'historique (${lastMission.unit_price} DH)`, { icon: '🧠', duration: 2000 });
            }
        }
    }, [missionForm.terrain_id, missionForm.type, selectedWorker]);

    const cleanPhoneNumber = (phone: string) => {
        let clean = phone.replace(/\D/g, '');
        if (clean.startsWith('0') && clean.length === 10) {
            return '212' + clean.substring(1);
        }
        if (clean.length === 9 && !clean.startsWith('212')) {
            return '212' + clean;
        }
        return clean;
    };

    const handleWhatsAppShare = (worker: Worker) => {
        const balance = worker.total_earned - worker.paid_amount;
        const dateStr = new Date().toLocaleDateString('fr-FR');

        let message = `🏗️ *GESTION CHANTIER - RELEVÉ DE COMPTE*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👤 *Ouvrier:* ${worker.name.toUpperCase()}\n`;
        message += `📅 *Date:* ${dateStr}\n\n`;

        message += `📝 *HISTORIQUE RÉCENT (5 Dernières)*\n`;
        worker.missions.slice(-5).reverse().forEach(m => {
            const amount = m.total_amount.toLocaleString('fr-MA');
            message += `🔹 _${m.start_date}_ : ${m.description || 'Travaux'} → *${amount} DH*\n`;
        });

        message += `\n📊 *RÉCAPITULATIF FINANCIER*\n`;
        message += `├─ 🟢 Total Gagné : ${worker.total_earned.toLocaleString('fr-MA')} DH\n`;
        message += `├─ 🔵 Total Versé : ${worker.paid_amount.toLocaleString('fr-MA')} DH\n`;
        message += `└─ 💰 *SOLDE : ${balance.toLocaleString('fr-MA')} DH*\n\n`;
        if (balance > 0) {
            message += `📢 *Note:* Un solde de *${balance.toLocaleString('fr-MA')} DH* reste en attente de paiement.\n\n`;
        } else {
            message += `✅ *Note:* Votre compte est à jour. Merci pour votre collaboration !\n\n`;
        }


        // Prepare numbers
        const numbers: { label: string, value: string }[] = [];
        if (worker.phone_whatsapp) numbers.push({ label: 'WhatsApp', value: cleanPhoneNumber(worker.phone_whatsapp) });
        if (worker.phone && cleanPhoneNumber(worker.phone) !== (numbers[0]?.value)) {
            numbers.push({ label: 'Personnel', value: cleanPhoneNumber(worker.phone) });
        }

        setWhatsappMessage(message);
        setWhatsappNumbers(numbers);
        setSelectedWNumber(numbers[0]?.value || '');
        setIsWhatsAppModalOpen(true);
    };

    const finalSendWhatsApp = () => {
        if (!selectedWNumber) {
            toast.error("Veuillez sélectionner un numéro");
            return;
        }
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const url = `https://wa.me/${selectedWNumber}/?text=${encodedMessage}`;
        window.open(url, '_blank');
        setIsWhatsAppModalOpen(false);
    };

    // Voice-to-Action: start/stop recognition
    const handleVoiceDictation = () => {
        if (isVoiceListening) {
            voiceRecognitionRef.current?.stop();
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Reconnaissance vocale non supportée par ce navigateur.");
            return;
        }
        const recognition = new SpeechRecognition();
        voiceRecognitionRef.current = recognition;
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsVoiceListening(true);
        recognition.onend = () => setIsVoiceListening(false);
        recognition.onerror = (e: any) => {
            setIsVoiceListening(false);
            if (e.error === 'not-allowed') toast.error("Microphone bloqué. Veuillez l'autoriser.");
            else if (e.error === 'no-speech') toast.error("Aucune voix détectée.");
            else toast.error(`Erreur micro: ${e.error}`);
        };
        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            setIsVoiceListening(false);
            toast.loading("IA en train d'analyser votre dictée...", { id: 'voice-ai' });
            setIsVoiceProcessing(true);
            try {
                const extracted = await extractMissionFromVoice(
                    transcript,
                    workers.map(w => ({ id: w.id, name: w.name })),
                    terrains.map((t: any) => ({ id: t.id, nom_projet: t.nom_projet }))
                );
                setMissionForm(prev => ({
                    ...prev,
                    ...(extracted.ouvrier_id ? {} : {}), // handled by selectedWorker
                    ...(extracted.terrain_id ? { terrain_id: extracted.terrain_id, bienSearchTerm: '' } : {}),
                    ...(extracted.type ? { type: extracted.type as any } : {}),
                    ...(extracted.quantity ? { quantity: extracted.quantity } : {}),
                    ...(extracted.unit_price ? { unit_price: formatNumber(extracted.unit_price) } : {}),
                    ...(extracted.description ? { description: extracted.description } : {}),
                    ...(extracted.start_date ? { start_date: extracted.start_date } : {}),
                }));
                toast.success("✅ Formulaire auto-rempli !", { id: 'voice-ai' });
                // Also select the worker if extracted
                if (extracted.ouvrier_id) {
                    const found = workers.find(w => w.id === parseInt(extracted.ouvrier_id!));
                    if (found) {
                        setSelectedWorker(found);
                        setIsMissionModalOpen(true);
                    }
                }
            } catch (err) {
                toast.error("Erreur lors de l'analyse IA.", { id: 'voice-ai' });
            } finally {
                setIsVoiceProcessing(false);
            }
        };
        recognition.start();
        toast("🎙️ Je vous écoute... Dites votre pointage !");
    };

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            Object.entries(workerForm).forEach(([key, value]) => {
                data.append(key, String(value));
            });
            if (scanFile) {
                data.append('scan_cin', scanFile);
            }

            if (editingWorker) {
                data.append('_method', 'PUT');
                await apiFetch(`/ouvriers/${editingWorker.id}`, {
                    method: 'POST',
                    body: data
                });
                toast.success('Ouvrier mis à jour');
            } else {
                await apiFetch('/ouvriers', {
                    method: 'POST',
                    body: data
                });
                toast.success('Nouvel ouvrier ajouté');
            }
            setIsWorkerModalOpen(false);
            setScanFile(null);
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddMission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker) return;

        const quantityNum = parseNumber(missionForm.quantity);
        const unitPriceNum = parseNumber(missionForm.unit_price);
        const totalAmount = missionForm.type === 'forfait' ? unitPriceNum : quantityNum * unitPriceNum;
        const partnerShareNum = missionForm.isSplit ? parseNumber(missionForm.partner_share) : 0;

        if (missionForm.isSplit) {
            if (partnerShareNum < 0) {
                toast.error("La part de l'associé ne peut pas être négative");
                return;
            }
            if (partnerShareNum > totalAmount) {
                toast.error("La part de l'associé ne peut pas dépasser le montant total (" + totalAmount.toLocaleString('fr-MA') + " DH)");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const { bienSearchTerm, ...missionData } = missionForm;
            await apiFetch(`/ouvriers/${selectedWorker.id}/missions`, {
                method: 'POST',
                body: JSON.stringify({
                    ...missionData,
                    quantity: quantityNum,
                    unit_price: unitPriceNum,
                    partner_id: missionForm.partner_id || null,
                    partner_share: partnerShareNum,
                })
            });
            toast.success('Mission enregistrée');
            setIsMissionModalOpen(false);
            setMissionForm({ ...missionForm, partner_id: '', partnerSearchTerm: '', bien_id: '', bienSearchTerm: '', partner_share: '0', isSplit: false });
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’ajout de la mission');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker) return;
        setIsSubmitting(true);
        try {
            await apiFetch(`/ouvriers/${selectedWorker.id}/payments`, {
                method: 'POST',
                body: JSON.stringify({
                    ...paymentForm,
                    amount: parseNumber(paymentForm.amount),
                    bank_commission: parseNumber(paymentForm.bank_commission),
                })
            });
            toast.success('Versement enregistré');
            setIsPaymentModalOpen(false);
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’ajout du paiement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGlobalMissionSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!globalMissionForm.primary_worker_id || !globalMissionForm.partner_id) {
            toast.error("Veuillez sélectionner deux ouvriers");
            return;
        }
        if (globalMissionForm.primary_worker_id === globalMissionForm.partner_id) {
            toast.error("Veuillez sélectionner deux ouvriers différents");
            return;
        }

        const quantityNum = parseNumber(globalMissionForm.quantity);
        const unitPriceNum = parseNumber(globalMissionForm.unit_price);
        const totalAmount = globalMissionForm.type === 'forfait' ? unitPriceNum : quantityNum * unitPriceNum;
        const partnerShareNum = globalMissionForm.isSplit ? parseNumber(globalMissionForm.partner_share) : 0;

        if (globalMissionForm.isSplit) {
            if (partnerShareNum < 0) {
                toast.error("La part de l'associé ne peut pas être négative");
                return;
            }
            if (partnerShareNum > totalAmount) {
                toast.error("La part de l'associé ne peut pas dépasser le montant total");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const { primary_worker_id, primarySearchTerm, ...missionData } = globalMissionForm;
            await apiFetch(`/ouvriers/${primary_worker_id}/missions`, {
                method: 'POST',
                body: JSON.stringify({
                    ...missionData,
                    quantity: quantityNum,
                    unit_price: unitPriceNum,
                    partner_id: globalMissionForm.partner_id,
                    partner_share: partnerShareNum,
                })
            });
            toast.success('Mission associée enregistrée');
            setIsGlobalMissionModalOpen(false);
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l’ajout de la mission');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWorker = async (id: number) => {
        if (!await confirmDialog('Voulez-vous vraiment supprimer cet ouvrier et toutes ses données ?')) return;
        try {
            await apiFetch(`/ouvriers/${id}`, { method: 'DELETE' });
            toast.success('Ouvrier supprimé');
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleDeleteMission = async (id: number) => {
        if (!await confirmDialog('Voulez-vous vraiment supprimer cette mission ?')) return;
        try {
            await apiFetch(`/ouvrier-missions/${id}`, { method: 'DELETE' });
            toast.success('Mission supprimée');
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handleDeletePayment = async (id: number) => {
        if (!await confirmDialog('Voulez-vous vraiment supprimer ce paiement ?')) return;
        try {
            await apiFetch(`/ouvrier-payments/${id}`, { method: 'DELETE' });
            toast.success('Paiement supprimé');
            fetchWorkers();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la suppression');
        }
    };

    const handlePrintReceipt = (payment: WorkerPayment, worker: Worker) => {
        setSelectedWorker(worker);
        setSelectedPayment(payment);
        setIsReceiptModalOpen(true);
        // We'll use a slight delay to ensure the modal content is rendered before printing if needed,
        // or just rely on the user clicking the print button in the receipt modal for better control.
    };

    const handleExport = () => {
        const data = workers.map((w: Worker) => ({
            'NOM': w.name,
            'SPÉCIALITÉ': w.speciality,
            'CIN': w.cin || '-',
            'TÉL': w.phone || '-',
            'WHATSAPP': w.phone_whatsapp || '-',
            'TOTAL GAGNÉ (DH)': w.total_earned,
            'DÉJÀ PAYÉ (DH)': w.paid_amount,
            'RESTE (DH)': w.total_earned - w.paid_amount
        }));
        exportToExcel(data, 'gestion_ouvriers');
    };

    const filteredWorkers = workers
        .filter(w => w.status === (showArchived ? 'inactive' : 'active'))
        .filter(worker => {
            const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                worker.speciality.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSpeciality = filterSpeciality === 'all' || worker.speciality === filterSpeciality;
            return matchesSearch && matchesSpeciality;
        });

    const totalToPay = workers.reduce((acc: number, w: Worker) => acc + (w.total_earned - w.paid_amount), 0);
    const totalWorkers = workers.length;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="hidden">
                            <UserCheck size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Ouvriers</h1>
                            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-500" /> Suivi des missions, pointages et paiements.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden lg:flex items-center gap-8 bg-white px-8 py-4 rounded-xl border border-slate-200 shadow-sm mr-4 duration-500">
                        <div className="text-center">
                            <p className="text-xs font-semibold text-slate-400 mb-1">Total Ouvriers</p>
                            <p className="text-xl font-semibold text-blue-600 tabular-nums">{totalWorkers}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100" />
                        <div className="text-center">
                            <p className="text-xs font-semibold text-slate-400 mb-1">Reste à Payer Global</p>
                            <p className="text-xl font-semibold text-rose-500 tabular-nums">{totalToPay.toLocaleString('fr-MA')} <span className="text-xs">DH</span></p>
                        </div>
                    </div>

                    <button
                        onClick={handleVoiceDictation}
                        disabled={isVoiceProcessing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm shadow-sm transition relative ${isVoiceListening
                            ? 'bg-rose-500 text-white !border-rose-400 animate-pulse'
                            : isVoiceProcessing
                                ? 'bg-violet-50 text-violet-500 border-violet-100 opacity-70'
                                : 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100 hover:border-violet-200'
                            }`}
                        title="Dicter un pointage à voix haute"
                    >
                        <div className="absolute -top-2 -right-2 bg-violet-600 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                            <Sparkles size={8} /><span>IA</span>
                        </div>
                        {isVoiceListening ? <MicOff size={18} /> : isVoiceProcessing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                        {isVoiceListening ? 'Stop' : isVoiceProcessing ? 'Analyse...' : 'Dicter'}
                    </button>
                    <button
                        onClick={() => {
                            setGlobalMissionForm({
                                ...globalMissionForm,
                                primary_worker_id: '',
                                primarySearchTerm: '',
                                partner_id: '',
                                partnerSearchTerm: '',
                                terrain_id: '',
                                bien_id: '',
                                bienSearchTerm: '',
                                partner_share: '0',
                                isSplit: true
                            });
                            setIsGlobalMissionModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition font-medium text-sm shadow-sm"
                    >
                        <Users size={18} className="text-emerald-500" /> Travail Associé
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-200 transition font-medium text-sm shadow-sm"
                    >
                        <Download size={18} className="text-blue-500" /> Exporter
                    </button>
                    <button
                        onClick={() => {
                            setEditingWorker(null);
                            setWorkerForm({ name: '', cin: '', speciality: 'Maçon', phone: '', phone_whatsapp: '', rib: '', status: 'active' });
                            setScanFile(null);
                            setIsWorkerModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-sm active:scale-[0.98] bg-slate-900 hover:bg-slate-800"
                    >
                        <Plus size={20} /> Nouvel Ouvrier
                    </button>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 duration-700 mx-1"
            >
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou spécialité..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition border flex items-center gap-2 ${showArchived ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Users size={16} />
                        {showArchived ? 'Voir Actifs' : 'Voir Archivés'}
                    </button>

                    <div className="relative w-full md:w-48">
                        <select
                            value={filterSpeciality}
                            onChange={(e) => setFilterSpeciality(e.target.value)}
                            className="w-full appearance-none cursor-pointer pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            <option value="all">Toutes Spécialités</option>
                            {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-blue-400 pointer-events-none" size={16} />
                    </div>
                    {(searchTerm || filterSpeciality !== 'all') && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterSpeciality('all'); }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
                            title="Effacer les filtres"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Table (Horizontal) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="custom-scrollbar-white">
                    <table className="w-full text-left border-collapse">
                        <thead
                            className="sticky z-20 bg-white border-b border-slate-200"
                            style={{ top: `${stickyOffset}px` }}
                        >
                            <tr className="">
                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Ouvrier</th>
                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Spécialité</th>
                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">CIN & Scan</th>
                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Finances (DH)</th>
                                <th className="text-center whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Solde Restant</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-8 h-20 bg-slate-50/30"></td>
                                    </tr>
                                ))
                            ) : filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                                <User size={32} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-400">Aucun ouvrier trouvé</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredWorkers.map(worker => {
                                const balance = worker.total_earned - worker.paid_amount;
                                return (
                                    <tr key={worker.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-4">
                                                <div className="inline-flex flex-shrink-0 text-slate-400">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{worker.name}</p>
                                                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                                        <Phone size={10} /> {worker.phone || '—'}
                                                        {worker.phone_whatsapp && (
                                                            <>
                                                                <span className="mx-1">•</span>
                                                                <span className="text-emerald-500 flex items-center gap-0.5">
                                                                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.041 3.926 1.589 5.717 1.59h.005C18.612 24 23.945 18.665 23.948 12.108c0-3.176-1.232-6.165-3.463-8.397"></path></svg>
                                                                    {worker.phone_whatsapp}
                                                                </span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-white text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                {worker.speciality}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-semibold text-slate-700 tracking-tight">{worker.cin || 'N/A'}</span>
                                                {worker.scan_cin && (
                                                    <button
                                                        onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${worker.scan_cin}`))}
                                                        className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
                                                    >
                                                        <FileText size={10} /> Voir Scan
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-4 text-xs font-medium">
                                                    <div className="text-center">
                                                        <span className="text-slate-400 block mb-0.5">Gagné</span>
                                                        <span className="text-slate-700 font-semibold">{worker.total_earned.toLocaleString('fr-MA')}</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-100" />
                                                    <div className="text-center">
                                                        <span className="text-slate-400 block mb-0.5">Payé</span>
                                                        <span className="text-emerald-600 font-semibold">{worker.paid_amount.toLocaleString('fr-MA')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-xs tabular-nums shadow-sm ${balance > 0 ? 'bg-rose-50 !border-rose-100 text-rose-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                {balance.toLocaleString('fr-MA')} <span className="text-[9px]">DH</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        setActiveTab('missions');
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                    title="Voir Détails"
                                                >
                                                    <Eye size={16} className="transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        setMissionForm({ ...missionForm, partner_id: '', partnerSearchTerm: '', bien_id: '', bienSearchTerm: '', partner_share: '0', isSplit: false });
                                                        setIsMissionModalOpen(true);
                                                    }}
                                                    className="p-2 text-white rounded-lg transition shadow-sm group text-sm font-medium bg-slate-900 hover:bg-slate-800"
                                                    title="Nouveau Pointage"
                                                >
                                                    <Briefcase size={16} className="transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => handleArchiveWorker(worker)}
                                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors ${worker.status === 'active' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white'} hover:text-red-600 hover:bg-red-50`}
                                                    title={worker.status === 'active' ? 'Archiver' : 'Activer'}
                                                >
                                                    {worker.status === 'active' ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                                                </button>
                                                <div className="w-px h-4 bg-slate-100 mx-1" />
                                                <button
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        const balance = worker.total_earned - worker.paid_amount;
                                                        setPaymentForm({
                                                            ...paymentForm,
                                                            amount: formatNumber(balance.toString()),
                                                            payment_date: new Date().toISOString().split('T')[0]
                                                        });
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                    title="Effectuer un paiement"
                                                >
                                                    <Banknote size={16} />
                                                </button>
                                                <div className="w-px h-4 bg-slate-100 mx-1" />
                                                <button
                                                    onClick={() => {
                                                        setEditingWorker(worker);
                                                        setWorkerForm({
                                                            name: worker.name,
                                                            cin: worker.cin || '',
                                                            speciality: worker.speciality,
                                                            phone: worker.phone || '',
                                                            phone_whatsapp: worker.phone_whatsapp || '',
                                                            rib: worker.rib || '',
                                                            status: worker.status
                                                        });
                                                        setScanFile(null);
                                                        setIsWorkerModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteWorker(worker.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Worker Modal */}
            {
                isWorkerModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar-white duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Plus size={20} />
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm">{editingWorker ? 'Modifier Ouvrier' : 'Nouvel Ouvrier'}</h3>
                                </div>
                                <button onClick={() => setIsWorkerModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleAddWorker} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Nom complet</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={workerForm.name}
                                            onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                                            placeholder="Ex: Ahmed Benjelloun"
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">CIN</label>
                                        <input
                                            type="text"
                                            value={workerForm.cin}
                                            onChange={(e) => setWorkerForm({ ...workerForm, cin: e.target.value })}
                                            placeholder="Ex: AB123456"
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Spécialité</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                            <select
                                                value={workerForm.speciality}
                                                onChange={(e) => setWorkerForm({ ...workerForm, speciality: e.target.value })}
                                                className="w-full appearance-none cursor-pointer pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            >
                                                {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Téléphone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                            <input
                                                type="tel"
                                                value={workerForm.phone}
                                                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                                                placeholder="06..."
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">WhatsApp (Optionnel)</label>
                                        <div className="relative">
                                            <svg viewBox="0 0 24 24" className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 w-4.5 h-4.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.041 3.926 1.589 5.717 1.59h.005C18.612 24 23.945 18.665 23.948 12.108c0-3.176-1.232-6.165-3.463-8.397"></path></svg>
                                            <input
                                                type="tel"
                                                value={workerForm.phone_whatsapp}
                                                onChange={(e) => setWorkerForm({ ...workerForm, phone_whatsapp: e.target.value })}
                                                placeholder="06 (WhatsApp)"
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Scan CIN</label>
                                        <input
                                            type="file"
                                            onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                                            className="w-full text-xs file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium mb-1 text-slate-600">RIB (Relevé d'Identité Bancaire)</label>
                                            <div className="relative">
                                                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={workerForm.rib}
                                                    onChange={(e) => setWorkerForm({ ...workerForm, rib: e.target.value })}
                                                    placeholder="24 chiffres..."
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium mb-1 text-slate-600">Statut du Compte</label>
                                            <div className="relative">
                                                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                                <select
                                                    value={workerForm.status}
                                                    onChange={(e) => setWorkerForm({ ...workerForm, status: e.target.value as 'active' | 'inactive' })}
                                                    className="w-full appearance-none cursor-pointer pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                >
                                                    <option value="active">Actif</option>
                                                    <option value="inactive">Archivé (Inactif)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 text-sm bg-slate-900 hover:bg-slate-800"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Enregistrer</span></>}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Mission Modal */}
            {
                isMissionModalOpen && selectedWorker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar-white ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 text-emerald-900 leading-none">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">Ajouter une Mission</h3>
                                        <p className="text-xs font-medium text-emerald-600 mt-1">Ouvrier: {selectedWorker.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    setIsMissionModalOpen(false);
                                    setMissionForm({ ...missionForm, partner_id: '', partnerSearchTerm: '', bien_id: '', bienSearchTerm: '', partner_share: '0', isSplit: false });
                                }} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleAddMission} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Type de Pointage/Tâche</label>
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                            {MISSION_TYPES.map(type => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => setMissionForm({ ...missionForm, type: type.value as any })}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition gap-2 ${missionForm.type === type.value
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                        : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {type.icon}
                                                    <span className="text-[8px] font-semibold tracking-tight text-center leading-tight">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-full">
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Projet / Terrain</label>
                                        <select
                                            value={missionForm.terrain_id}
                                            onChange={(e) => setMissionForm({ ...missionForm, terrain_id: e.target.value, bien_id: '', bienSearchTerm: '' })}
                                            className="w-full cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        >
                                            <option value="">Sélectionner un projet</option>
                                            {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_projet} - {t.nom_terrain}</option>)}
                                        </select>
                                    </div>

                                    {missionForm.terrain_id && (
                                        <div className="col-span-full duration-300">
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Bien Spécifique (Optionnel)</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="Rechercher une Villa, Appartement, Local..."
                                                    value={missionForm.bienSearchTerm}
                                                    onChange={(e) => setMissionForm({ ...missionForm, bienSearchTerm: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                />
                                            </div>

                                            <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar-white space-y-1 bg-white rounded-xl p-1 border border-slate-200 shadow-inner">
                                                {biens
                                                    .filter(b => b.terrain_id === parseInt(missionForm.terrain_id))
                                                    .filter(b =>
                                                        !missionForm.bienSearchTerm ||
                                                        b.nom?.toLowerCase().includes(missionForm.bienSearchTerm.toLowerCase()) ||
                                                        b.num_appartement?.toLowerCase().includes(missionForm.bienSearchTerm.toLowerCase()) ||
                                                        b.type_bien?.toLowerCase().includes(missionForm.bienSearchTerm.toLowerCase())
                                                    )
                                                    .map(b => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => setMissionForm({ ...missionForm, bien_id: b.id.toString(), bienSearchTerm: b.nom || `${b.type_bien} - ${b.num_appartement}` })}
                                                            className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group ${missionForm.bien_id === b.id.toString() ? 'bg-emerald-500 text-white shadow-sm' : 'hover:bg-emerald-50 text-slate-600'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`hidden`}>
                                                                    <Home size={12} />
                                                                </div>
                                                                <div>
                                                                    <p className={`text-xs font-semibold tracking-tight ${missionForm.bien_id === b.id.toString() ? 'text-white' : 'text-slate-800'}`}>{b.nom || `${b.type_bien} - ${b.num_appartement}`}</p>
                                                                    <p className={`text-xs font-medium ${missionForm.bien_id === b.id.toString() ? 'text-emerald-100' : 'text-slate-400 font-medium'}`}>{b.type_bien} • {b.statut}</p>
                                                                </div>
                                                            </div>
                                                            {missionForm.bien_id === b.id.toString() && <CheckCircle2 size={16} />}
                                                        </button>
                                                    ))}
                                                {biens.filter(b => b.terrain_id === parseInt(missionForm.terrain_id)).length === 0 && (
                                                    <p className="text-center py-4 text-xs font-medium text-slate-400">Aucun bien trouvé pour ce terrain</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`col-span-full ${missionForm.type === 'periode' ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1'}`}>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">
                                                {missionForm.type === 'periode' ? 'Date Début' : 'Date de Mission'}
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={missionForm.start_date}
                                                onChange={(e) => setMissionForm({ ...missionForm, start_date: e.target.value })}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>
                                        {missionForm.type === 'periode' && (
                                            <div>
                                                <label className="block text-xs font-medium mb-2 text-slate-600">Date Fin</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={missionForm.end_date}
                                                    onChange={(e) => setMissionForm({ ...missionForm, end_date: e.target.value })}
                                                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {missionForm.type !== 'forfait' && (
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">
                                                {missionForm.type === 'journalier' || missionForm.type === 'periode' ? 'Nombre de Jours' : missionForm.type === 'm2' ? 'Surface (m²)' : 'Longueur (ml)'}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="0"
                                                value={missionForm.quantity}
                                                onChange={(e) => setMissionForm({ ...missionForm, quantity: formatNumber(e.target.value) })}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">
                                            {missionForm.type === 'forfait' ? 'Montant Total du Forfait' : 'Prix Unitaire (DH)'}
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="0"
                                            value={missionForm.unit_price}
                                            onChange={(e) => setMissionForm({ ...missionForm, unit_price: formatNumber(e.target.value) })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>

                                    <div className="col-span-full">
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Description / Tâche précise</label>
                                        <textarea
                                            value={missionForm.description}
                                            onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                                            placeholder="Détails du travail effectué..."
                                            rows={2}
                                            className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>

                                    <div className="col-span-full">
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Associé / Partenaire (Optionnel)</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Rechercher un autre ouvrier..."
                                                value={missionForm.partnerSearchTerm}
                                                onChange={(e) => setMissionForm({ ...missionForm, partnerSearchTerm: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>

                                        <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar-white space-y-1 bg-white rounded-xl p-1 border border-slate-200 shadow-inner">
                                            {workers
                                                .filter(w => w.id !== selectedWorker.id)
                                                .filter(w =>
                                                    !missionForm.partnerSearchTerm ||
                                                    w.name.toLowerCase().includes(missionForm.partnerSearchTerm.toLowerCase()) ||
                                                    w.speciality.toLowerCase().includes(missionForm.partnerSearchTerm.toLowerCase())
                                                )
                                                .map(w => (
                                                    <button
                                                        key={w.id}
                                                        type="button"
                                                        onClick={() => setMissionForm({ ...missionForm, partner_id: w.id.toString(), partnerSearchTerm: w.name })}
                                                        className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group ${missionForm.partner_id === w.id.toString() ? 'bg-emerald-500 text-white shadow-sm' : 'hover:bg-emerald-50 text-slate-600'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`hidden`}>
                                                                <User size={12} />
                                                            </div>
                                                            <div>
                                                                <p className={`text-xs font-semibold tracking-tight ${missionForm.partner_id === w.id.toString() ? 'text-white' : 'text-slate-800'}`}>{w.name}</p>
                                                                <p className={`text-xs font-medium ${missionForm.partner_id === w.id.toString() ? 'text-emerald-100' : 'text-slate-400 font-medium'}`}>{w.speciality}</p>
                                                            </div>
                                                        </div>
                                                        {missionForm.partner_id === w.id.toString() && <CheckCircle2 size={16} />}
                                                    </button>
                                                ))}
                                            {workers.filter(w => w.id !== selectedWorker.id).length === 0 && (
                                                <p className="text-center py-4 text-xs font-medium text-slate-400">Aucun autre ouvrier disponible</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {missionForm.partner_id && (
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-800">Partager le paiement</p>
                                                <p className="text-xs font-medium text-slate-400">Diviser le gain avec l'associé</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const total = missionForm.type === 'forfait'
                                                        ? parseNumber(missionForm.unit_price)
                                                        : parseNumber(missionForm.quantity) * parseNumber(missionForm.unit_price);
                                                    setMissionForm({
                                                        ...missionForm,
                                                        isSplit: !missionForm.isSplit,
                                                        partner_share: !missionForm.isSplit ? (total / 2).toString() : '0'
                                                    });
                                                }}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${missionForm.isSplit ? 'bg-blue-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${missionForm.isSplit ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {missionForm.isSplit && (
                                            <div className="space-y-4 pt-2 border-t border-slate-100 duration-300">
                                                <div>
                                                    <label className="block text-xs font-medium mb-2 text-slate-600">Part de l'associé (DH)</label>
                                                    <input
                                                        type="text"
                                                        value={missionForm.partner_share}
                                                        onChange={(e) => setMissionForm({ ...missionForm, partner_share: e.target.value })}
                                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                        placeholder="Montant pour l'associé"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between px-2">
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-semibold text-slate-400">Ma Part</p>
                                                        <p className="text-sm font-semibold text-blue-600">
                                                            {((missionForm.type === 'forfait' ? parseNumber(missionForm.unit_price) : parseNumber(missionForm.quantity) * parseNumber(missionForm.unit_price)) - parseNumber(missionForm.partner_share)).toLocaleString('fr-MA')} DH
                                                        </p>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-200" />
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-semibold text-slate-400">Associé</p>
                                                        <p className="text-sm font-semibold text-emerald-600">
                                                            {parseNumber(missionForm.partner_share).toLocaleString('fr-MA')} DH
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-emerald-800">Total Mission Estimé</span>
                                    <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                                        {(missionForm.type === 'forfait'
                                            ? parseNumber(missionForm.unit_price)
                                            : parseNumber(missionForm.quantity) * parseNumber(missionForm.unit_price)
                                        ).toLocaleString('fr-MA')} DH
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 text-sm bg-slate-900 hover:bg-slate-800"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Enregistrer la Mission</span></>}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isDetailsModalOpen && selectedWorker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden duration-300 overflow-y-auto max-h-[90vh] ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight leading-none mb-1">{selectedWorker.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                            {selectedWorker.speciality}
                                        </span>
                                        <p className="text-xs font-medium text-slate-400">
                                            Fiche Ouvrier #{selectedWorker.id} • CIN: {selectedWorker.cin || 'Non renseigné'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleWhatsAppShare(selectedWorker)}
                                        className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition shadow-sm flex items-center gap-2 group relative"
                                        title="Partager le relevé (IA)"
                                    >
                                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-bounce">
                                            <Sparkles size={8} />
                                            <span>IA</span>
                                        </div>
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.041 3.926 1.589 5.717 1.59h.005C18.612 24 23.945 18.665 23.948 12.108c0-3.176-1.232-6.165-3.463-8.397"></path></svg>
                                        <span className="text-xs font-semibold hidden md:inline">Relevé</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDetailsModalOpen(false);
                                            setEditingWorker(selectedWorker);
                                            setWorkerForm({
                                                name: selectedWorker.name,
                                                cin: selectedWorker.cin || '',
                                                speciality: selectedWorker.speciality,
                                                phone: selectedWorker.phone || '',
                                                phone_whatsapp: selectedWorker.phone_whatsapp || '',
                                                rib: selectedWorker.rib || '',
                                                status: selectedWorker.status
                                            });
                                            setIsWorkerModalOpen(true);
                                        }}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                        title="Modifier"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-10 space-y-10">
                                {/* Stats Grid & Actions */}
                                <div className="flex flex-col lg:flex-row gap-8">
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <TrendingUp size={48} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">Total Earned</p>
                                            <p className="text-xl font-semibold text-slate-800 tabular-nums">
                                                {selectedWorker.total_earned.toLocaleString('fr-MA')} <span className="text-xs text-slate-400">DH</span>
                                            </p>
                                        </div>
                                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Banknote size={32} />
                                            </div>
                                            <p className="text-xs font-semibold text-emerald-500 mb-1">Total Paid</p>
                                            <p className="text-xl font-semibold text-emerald-600 tabular-nums">
                                                {selectedWorker.paid_amount.toLocaleString('fr-MA')} <span className="text-xs text-emerald-400">DH</span>
                                            </p>
                                        </div>
                                        <div className={`col-span-2 p-5 rounded-xl border relative overflow-hidden group ${selectedWorker.total_earned - selectedWorker.paid_amount > 0 ? 'bg-rose-50 !border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                                            <p className={`text-xs font-semibold mb-1 ${selectedWorker.total_earned - selectedWorker.paid_amount > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                                Solde à Payer
                                            </p>
                                            <p className={`text-2xl font-bold tabular-nums ${selectedWorker.total_earned - selectedWorker.paid_amount > 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                                {(selectedWorker.total_earned - selectedWorker.paid_amount).toLocaleString('fr-MA')} <span className="text-xs font-medium opacity-60">DH</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="lg:w-[320px] space-y-4">
                                        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="hidden">
                                                    <UserCheck size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 leading-none mb-1">Informations</p>
                                                    <p className="text-sm font-semibold text-slate-800">Profil Ouvrier</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-xs font-semibold text-slate-400">Spécialité</span>
                                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-slate-700 bg-slate-50 ring-1 ring-inset ring-slate-600/20">{selectedWorker.speciality}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-xs font-semibold text-slate-400">Téléphone</span>
                                                    <span className="text-xs font-semibold text-slate-700">{selectedWorker.phone || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-xs font-semibold text-slate-400">WhatsApp</span>
                                                    <span className="text-xs font-semibold text-emerald-600">{selectedWorker.phone_whatsapp || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-xs font-semibold text-slate-400">CIN</span>
                                                    <span className="text-xs font-semibold text-slate-700">{selectedWorker.cin || '—'}</span>
                                                </div>
                                                {selectedWorker.rib && (
                                                    <div className="flex flex-col gap-1 pt-2 border-t border-slate-50 group">
                                                        <span className="text-xs font-semibold text-slate-400">RIB</span>
                                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50/50 text-center ring-1 ring-inset ring-emerald-600/20">{selectedWorker.rib}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedWorker.scan_cin ? (
                                            <button
                                                onClick={() => openExternal(encodeURI(`${STORAGE_BASE}/${selectedWorker.scan_cin}`))}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3 hover:bg-white hover:border-blue-200 transition group"
                                            >
                                                <div className="p-2 bg-white rounded-xl text-blue-500 shadow-sm border border-slate-200">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-semibold text-slate-400 leading-none mb-1">Identity Document</p>
                                                    <p className="text-xs font-semibold text-slate-700">Voir Scan CIN</p>
                                                </div>
                                                <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <div className="p-4 bg-amber-50 border border-dashed border-amber-200 rounded-xl flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-xl text-amber-500">
                                                    <Info size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-amber-600 leading-none mb-1">Scan Manquant</p>
                                                    <p className="text-xs font-medium text-amber-400">Pensez à scanner la CIN</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs & History */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="flex flex-col md:flex-row border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                                        <div className="flex flex-1 gap-2">
                                            <button
                                                onClick={() => setActiveTab('missions')}
                                                className={`flex-1 py-4 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'missions' ? 'bg-white shadow-sm border border-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <Briefcase size={14} className={activeTab === 'missions' ? 'text-slate-400' : ''} />
                                                Missions
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('payments')}
                                                className={`flex-1 py-4 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'payments' ? 'bg-white shadow-sm border border-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <Banknote size={14} className={activeTab === 'payments' ? 'text-slate-400' : ''} />
                                                Paiements
                                            </button>
                                        </div>

                                        <div className="flex gap-2 items-center px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Calendar size={14} className="text-slate-400" />
                                            <select
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(e.target.value)}
                                                className="cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            >
                                                <option value="all">Tous les mois</option>
                                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                            </select>
                                            <div className="w-px h-4 bg-slate-200" />
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                                className="cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            >
                                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        {/* Period Summary Banner */}
                                        {(selectedMonth !== 'all') && (
                                            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500 border border-slate-200">
                                                        <Clock size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-semibold text-slate-400">Récapitulatif Période</p>
                                                        <p className="text-xs font-semibold text-slate-700">{MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-semibold text-emerald-500">Gagné</p>
                                                        <p className="text-sm font-semibold text-emerald-600">
                                                            {selectedWorker.missions
                                                                .filter(m => {
                                                                    const date = new Date(m.start_date);
                                                                    return (selectedMonth === 'all' || (date.getMonth() + 1).toString() === selectedMonth) &&
                                                                        date.getFullYear().toString() === selectedYear;
                                                                })
                                                                .reduce((acc, m) => acc + m.total_amount, 0).toLocaleString('fr-MA')} DH
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-semibold text-blue-500">Payé</p>
                                                        <p className="text-sm font-semibold text-blue-600">
                                                            {selectedWorker.payments
                                                                .filter(p => {
                                                                    const date = new Date(p.payment_date);
                                                                    return (selectedMonth === 'all' || (date.getMonth() + 1).toString() === selectedMonth) &&
                                                                        date.getFullYear().toString() === selectedYear;
                                                                })
                                                                .reduce((acc, p) => acc + p.amount, 0).toLocaleString('fr-MA')} DH
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {activeTab === 'missions' ? (
                                            <div className="space-y-4">
                                                {selectedWorker.missions && selectedWorker.missions.length > 0 ? (
                                                    selectedWorker.missions
                                                        .filter(m => {
                                                            const date = new Date(m.start_date);
                                                            return (selectedMonth === 'all' || (date.getMonth() + 1).toString() === selectedMonth) &&
                                                                date.getFullYear().toString() === selectedYear;
                                                        })
                                                        .sort((a, b) => b.id - a.id).map((m) => (
                                                            <div key={m.id} className="p-5 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-blue-200 transition flex items-center justify-between group">
                                                                <div className="flex items-center gap-5">
                                                                    <div className={`p-3 rounded-xl ${m.type === 'forfait' ? 'bg-rose-100 text-rose-600' : 'bg-white text-blue-500 shadow-sm'}`}>
                                                                        {m.type === 'forfait' ? <Briefcase size={18} /> : m.type === 'journalier' ? <Clock size={18} /> : m.type === 'periode' ? <Calendar size={18} /> : <Maximize size={18} />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex flex-col mb-1">
                                                                            <p className="text-xs font-semibold text-slate-800 tracking-tight">{m.description || 'Mission standard'}</p>
                                                                            {m.partner ? (
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <div className="flex items-center gap-1">
                                                                                        <UserCheck size={10} /> Associé: {m.partner.name}
                                                                                    </div>
                                                                                    {m.partner_share > 0 && (
                                                                                        <div className="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                                                                                            Split: {m.partner_share.toLocaleString('fr-MA')} DH
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : m.partner_name ? (
                                                                                <p className="text-xs font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                                                                                    <UserCheck size={10} /> Associé (Ad-hoc): {m.partner_name}
                                                                                </p>
                                                                            ) : null}
                                                                            <div className="mt-1">
                                                                                <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-white text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                                                                    {m.start_date} {m.end_date ? `au ${m.end_date}` : ''}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 font-medium">
                                                                            {MISSION_TYPES.find(t => t.value === m.type)?.label || m.type} • {m.type === 'forfait' ? 'Total' : `${m.quantity} x ${m.unit_price} DH`} • {m.terrain ? `${m.terrain.nom_projet} - ${m.terrain.nom_terrain}` : 'Site général'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-semibold text-slate-900 tracking-tight">{m.total_amount.toLocaleString('fr-MA')} DH</p>
                                                                    <button
                                                                        onClick={() => handleDeleteMission(m.id)}
                                                                        className="text-xs font-semibold text-rose-400 transition-opacity hover:text-rose-600"
                                                                    >
                                                                        Supprimer
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="text-center py-10 opacity-30">
                                                        <Briefcase size={40} className="mx-auto mb-3" />
                                                        <p className="text-xs font-semibold">Aucune mission enregistrée</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedWorker.payments && selectedWorker.payments.length > 0 ? (
                                                    selectedWorker.payments
                                                        .filter(p => {
                                                            const date = new Date(p.payment_date);
                                                            return (selectedMonth === 'all' || (date.getMonth() + 1).toString() === selectedMonth) &&
                                                                date.getFullYear().toString() === selectedYear;
                                                        })
                                                        .sort((a, b) => b.id - a.id).map((p) => (
                                                            <div key={p.id} className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-xl hover:border-emerald-300 transition flex items-center justify-between group">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm border border-slate-200">
                                                                        <Banknote size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <p className="text-sm font-semibold text-emerald-900 tabular-nums">{p.amount.toLocaleString('fr-MA')} DH</p>
                                                                            <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-white text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{p.payment_date}</span>
                                                                        </div>
                                                                        <p className="text-xs text-emerald-600/60 font-medium">
                                                                            {p.method} {p.reference_no && `• Réf: ${p.reference_no}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-end gap-0.5">
                                                                    <button
                                                                        onClick={() => handlePrintReceipt(p, selectedWorker)}
                                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                                        title="Imprimer Reçu"
                                                                        type="button"
                                                                    >
                                                                        <Printer size={14} className="transition-transform" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeletePayment(p.id)}
                                                                        className="text-xs font-semibold text-rose-400 transition-opacity hover:text-rose-600"
                                                                        type="button"
                                                                    >
                                                                        Supprimer
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="text-center py-10 opacity-30">
                                                        <Banknote size={40} className="mx-auto mb-3" />
                                                        <p className="text-xs font-semibold">Aucun paiement effectué</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedWorker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar-white duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                            <div className="flex items-center gap-3">
                                <div className="hidden">
                                    <Banknote size={20} />
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm">Nouveau Paiement</h3>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleAddPayment} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">Montant versé (DH)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-semibold text-sm">DH</span>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: formatNumber(e.target.value) })}
                                        placeholder="0"
                                        className="w-full text-2xl pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                                <div className="mt-2 flex justify-between items-center px-1">
                                    <p className="text-xs text-rose-500 font-medium">Solde: {(selectedWorker.total_earned - selectedWorker.paid_amount).toLocaleString('fr-MA')} DH</p>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentForm({ ...paymentForm, amount: formatNumber(String(selectedWorker.total_earned - selectedWorker.paid_amount)) })}
                                        className="text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                        Payer le reste
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={paymentForm.payment_date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Méthode</label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                        className="w-full appearance-none cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="Espèces">Espèces</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Effet">Effet</option>
                                    </select>
                                </div>
                            </div>

                            {paymentForm.method !== 'Espèces' && (
                                <div className="grid grid-cols-2 gap-4 duration-300">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Référence N°</label>
                                        <input
                                            type="text"
                                            value={paymentForm.reference_no}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                                            placeholder="N° Chèque/Virement"
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Banque</label>
                                        <input
                                            type="text"
                                            value={paymentForm.bank_name}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                                            placeholder="Nom de la banque"
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Commission Bancaire (DH)</label>
                                        <input
                                            type="text"
                                            value={paymentForm.bank_commission}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, bank_commission: formatNumber(e.target.value) })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 text-sm bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Confirmer le Paiement</span></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Mission Modal (Travail Associé) */}
            {isGlobalMissionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar-white duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                            <div className="flex items-center gap-3">
                                <div className="hidden">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Nouveau Travail Associé</h3>
                                    <p className="text-xs font-medium text-emerald-600 mt-1 text-left">Mission en binôme</p>
                                </div>
                            </div>
                            <button onClick={() => setIsGlobalMissionModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleGlobalMissionSubmission} className="p-8 space-y-6">
                            {/* Worker 1 Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-50">
                                <div className="space-y-4">
                                    <label className="block text-xs font-medium text-slate-600">Propriétaire Mission (Ouvrier 1)</label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                        <input
                                            type="text"
                                            value={globalMissionForm.primarySearchTerm}
                                            onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, primarySearchTerm: e.target.value })}
                                            placeholder="Rechercher l'ouvrier 1..."
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-xl p-1 border border-slate-200 shadow-inner custom-scrollbar-white">
                                        {workers
                                            .filter(w => w.name.toLowerCase().includes(globalMissionForm.primarySearchTerm.toLowerCase()))
                                            .map(w => (
                                                <button
                                                    key={w.id}
                                                    type="button"
                                                    onClick={() => setGlobalMissionForm({ ...globalMissionForm, primary_worker_id: w.id.toString(), primarySearchTerm: w.name })}
                                                    className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group ${globalMissionForm.primary_worker_id === w.id.toString() ? 'bg-emerald-500 text-white shadow-sm' : 'hover:bg-emerald-50 text-slate-600'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`hidden`}>
                                                            <User size={12} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-xs font-semibold tracking-tight ${globalMissionForm.primary_worker_id === w.id.toString() ? 'text-white' : 'text-slate-800'}`}>{w.name}</p>
                                                            <p className={`text-xs font-medium ${globalMissionForm.primary_worker_id === w.id.toString() ? 'text-emerald-100' : 'text-slate-400 font-medium'}`}>{w.speciality}</p>
                                                        </div>
                                                    </div>
                                                    {globalMissionForm.primary_worker_id === w.id.toString() && <CheckCircle2 size={16} />}
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Worker 2 Selection */}
                                <div className="space-y-4">
                                    <label className="block text-xs font-medium text-slate-600">Associé (Ouvrier 2)</label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                        <input
                                            type="text"
                                            value={globalMissionForm.partnerSearchTerm}
                                            onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, partnerSearchTerm: e.target.value })}
                                            placeholder="Rechercher l'associé..."
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-xl p-1 border border-slate-200 shadow-inner custom-scrollbar-white">
                                        {workers
                                            .filter(w => w.id.toString() !== globalMissionForm.primary_worker_id && w.name.toLowerCase().includes(globalMissionForm.partnerSearchTerm.toLowerCase()))
                                            .map(w => (
                                                <button
                                                    key={w.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const total = globalMissionForm.type === 'forfait'
                                                            ? parseNumber(globalMissionForm.unit_price)
                                                            : parseNumber(globalMissionForm.quantity) * parseNumber(globalMissionForm.unit_price);
                                                        setGlobalMissionForm({
                                                            ...globalMissionForm,
                                                            partner_id: w.id.toString(),
                                                            partnerSearchTerm: w.name,
                                                            partner_share: formatNumber((total / 2).toString())
                                                        });
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group ${globalMissionForm.partner_id === w.id.toString() ? 'bg-blue-500 text-white shadow-sm' : 'hover:bg-blue-50 text-slate-600'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`hidden`}>
                                                            <User size={12} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-xs font-semibold tracking-tight ${globalMissionForm.partner_id === w.id.toString() ? 'text-white' : 'text-slate-800'}`}>{w.name}</p>
                                                            <p className={`text-xs font-medium ${globalMissionForm.partner_id === w.id.toString() ? 'text-blue-100' : 'text-slate-400 font-medium'}`}>{w.speciality}</p>
                                                        </div>
                                                    </div>
                                                    {globalMissionForm.partner_id === w.id.toString() && <CheckCircle2 size={16} />}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Type de Pointage/Tâche</label>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                        {MISSION_TYPES.map(type => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setGlobalMissionForm({ ...globalMissionForm, type: type.value as any })}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition gap-2 ${globalMissionForm.type === type.value
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                    : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {type.icon}
                                                <span className="text-[8px] font-semibold tracking-tight text-center leading-tight">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Projet / Terrain</label>
                                    <select
                                        value={globalMissionForm.terrain_id}
                                        onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, terrain_id: e.target.value, bien_id: '', bienSearchTerm: '' })}
                                        className="w-full cursor-pointer pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="">Sélectionner un projet</option>
                                        {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_projet} - {t.nom_terrain}</option>)}
                                    </select>
                                </div>

                                {globalMissionForm.terrain_id && (
                                    <div className="col-span-full duration-300">
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Bien Spécifique (Optionnel)</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Rechercher une Villa, Appartement, Local..."
                                                value={globalMissionForm.bienSearchTerm}
                                                onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, bienSearchTerm: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>

                                        <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar-white space-y-1 bg-white rounded-xl p-1 border border-slate-200 shadow-inner">
                                            {biens
                                                .filter(b => b.terrain_id === parseInt(globalMissionForm.terrain_id))
                                                .filter(b =>
                                                    !globalMissionForm.bienSearchTerm ||
                                                    b.nom?.toLowerCase().includes(globalMissionForm.bienSearchTerm.toLowerCase()) ||
                                                    b.num_appartement?.toLowerCase().includes(globalMissionForm.bienSearchTerm.toLowerCase()) ||
                                                    b.type_bien?.toLowerCase().includes(globalMissionForm.bienSearchTerm.toLowerCase())
                                                )
                                                .map(b => (
                                                    <button
                                                        key={b.id}
                                                        type="button"
                                                        onClick={() => setGlobalMissionForm({ ...globalMissionForm, bien_id: b.id.toString(), bienSearchTerm: b.nom || `${b.type_bien} - ${b.num_appartement}` })}
                                                        className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between group ${globalMissionForm.bien_id === b.id.toString() ? 'bg-emerald-500 text-white shadow-sm' : 'hover:bg-emerald-50 text-slate-600'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`hidden`}>
                                                                <Home size={12} />
                                                            </div>
                                                            <div>
                                                                <p className={`text-xs font-semibold tracking-tight ${globalMissionForm.bien_id === b.id.toString() ? 'text-white' : 'text-slate-800'}`}>{b.nom || `${b.type_bien} - ${b.num_appartement}`}</p>
                                                                <p className={`text-xs font-medium ${globalMissionForm.bien_id === b.id.toString() ? 'text-emerald-100' : 'text-slate-400 font-medium'}`}>{b.type_bien} • {b.statut}</p>
                                                            </div>
                                                        </div>
                                                        {globalMissionForm.bien_id === b.id.toString() && <CheckCircle2 size={16} />}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className={`col-span-full ${globalMissionForm.type === 'periode' ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1'}`}>
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">
                                            {globalMissionForm.type === 'periode' ? 'Date Début' : 'Date de Mission'}
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={globalMissionForm.start_date}
                                            onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, start_date: e.target.value })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    {globalMissionForm.type === 'periode' && (
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Date Fin</label>
                                            <input
                                                type="date"
                                                required
                                                value={globalMissionForm.end_date}
                                                onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, end_date: e.target.value })}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                {globalMissionForm.type !== 'forfait' && (
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">
                                            {globalMissionForm.type === 'journalier' || globalMissionForm.type === 'periode' ? 'Nombre de Jours' : globalMissionForm.type === 'm2' ? 'Surface (m²)' : 'Longueur (ml)'}
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={globalMissionForm.quantity}
                                            onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, quantity: formatNumber(e.target.value) })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium mb-2 text-slate-600">
                                        {globalMissionForm.type === 'forfait' ? 'Montant Total du Forfait' : 'Prix Unitaire (DH)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={globalMissionForm.unit_price}
                                        onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, unit_price: formatNumber(e.target.value) })}
                                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-xs font-medium mb-2 text-slate-600">Description / Tâche précise</label>
                                    <textarea
                                        value={globalMissionForm.description}
                                        onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, description: e.target.value })}
                                        rows={2}
                                        className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Split Calculator */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="hidden">
                                            <TrendingUp size={14} />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-800">Répartition des gains</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-semibold text-slate-400">Total Net</p>
                                        <p className="text-sm font-semibold text-blue-600 font-mono">
                                            {(globalMissionForm.type === 'forfait' ? parseNumber(globalMissionForm.unit_price) : parseNumber(globalMissionForm.quantity) * parseNumber(globalMissionForm.unit_price)).toLocaleString('fr-MA')} DH
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-slate-600">Part de l'associé (DH)</label>
                                        <input
                                            type="text"
                                            value={globalMissionForm.partner_share}
                                            onChange={(e) => setGlobalMissionForm({ ...globalMissionForm, partner_share: formatNumber(e.target.value) })}
                                            className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100/50">
                                        <div className="text-center flex-1">
                                            <p className="text-[8px] font-semibold text-slate-400">Part Ouvrier 1</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {((globalMissionForm.type === 'forfait' ? parseNumber(globalMissionForm.unit_price) : parseNumber(globalMissionForm.quantity) * parseNumber(globalMissionForm.unit_price)) - parseNumber(globalMissionForm.partner_share)).toLocaleString('fr-MA')} DH
                                            </p>
                                        </div>
                                        <div className="w-px h-6 bg-slate-200" />
                                        <div className="text-center flex-1">
                                            <p className="text-[8px] font-semibold text-slate-400">Part Associé</p>
                                            <p className="text-sm font-semibold text-emerald-600">
                                                {parseNumber(globalMissionForm.partner_share).toLocaleString('fr-MA')} DH
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 text-sm bg-slate-900 hover:bg-slate-800"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> <span>Confirmer Travail Associé</span></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* WhatsApp Confirmation Modal */}
            {
                isWhatsAppModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 text-emerald-900 leading-none">
                                <div className="flex items-center gap-3">
                                    <div className="hidden">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">Aperçu du Relevé (IA)</h3>
                                        <p className="text-xs font-medium text-emerald-600 mt-1 text-left">Vérifiez et envoyez sur WhatsApp</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsWhatsAppModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 text-left">
                                <div className="space-y-4">
                                    <label className="block text-xs font-medium text-slate-600">Message Préparé</label>
                                    <textarea
                                        className="w-full custom-scrollbar-white resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        value={whatsappMessage}
                                        onChange={(e) => setWhatsappMessage(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-xs font-medium text-slate-600">Envoyer vers :</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {whatsappNumbers.map((num, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedWNumber(num.value)}
                                                className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-1 ${selectedWNumber === num.value
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                    : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <span className="text-xs font-semibold tracking-tight">{num.label}</span>
                                                <span className="text-xs font-medium opacity-60">+{num.value}</span>
                                            </button>
                                        ))}
                                        {whatsappNumbers.length === 0 && (
                                            <div className="col-span-full p-4 bg-rose-50 text-rose-500 text-xs font-medium text-center rounded-xl">
                                                Aucun numéro de téléphone disponible
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={() => setIsWhatsAppModalOpen(false)}
                                        className="flex-1 py-2 bg-white text-slate-400 rounded-lg font-medium text-sm hover:bg-slate-50 transition border border-slate-200"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={finalSendWhatsApp}
                                        disabled={!selectedWNumber}
                                        className="flex-[2] px-4 py-2 text-white rounded-lg font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.041 3.926 1.589 5.717 1.59h.005C18.612 24 23.945 18.665 23.948 12.108c0-3.176-1.232-6.165-3.463-8.397"></path></svg>
                                        <span>Envoyer</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Receipt Modal (Printable) */}
            {isReceiptModalOpen && selectedWorker && selectedPayment && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 duration-300 bg-slate-950/50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden duration-300 ring-1 ring-slate-900/5 animate-dialog-in">
                        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between no-print">
                            <h3 className="font-semibold text-slate-800 text-xs">Aperçu du Reçu de Paiement</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium text-sm transition shadow-sm bg-slate-900 hover:bg-slate-800"
                                    type="button"
                                >
                                    <Printer size={16} /> Imprimer
                                </button>
                                <button onClick={() => setIsReceiptModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" type="button">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-12 bg-white print:p-0" id="receipt-content">
                            {/* Receipt Design */}
                            <div className="border-[3px] border-double border-slate-900 p-8 relative">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-900 border-dotted">
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">REÇU DE PAIEMENT</h1>
                                        <p className="text-xs font-medium text-slate-500">Réf: PAY-OUV-{selectedPayment.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-sm tracking-tight">Date: {selectedPayment.payment_date}</p>
                                        <p className="text-xs font-medium text-slate-400 mt-1">Document officiel</p>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="space-y-8 py-4 text-slate-800">
                                    <div className="flex items-baseline gap-4">
                                        <span className="text-xs font-semibold text-slate-400 min-w-[120px]">Bénéficiaire :</span>
                                        <span className="text-lg font-semibold border-b border-slate-200 flex-1">{selectedWorker.name}</span>
                                    </div>

                                    <div className="flex items-baseline gap-4">
                                        <span className="text-xs font-semibold text-slate-400 min-w-[120px]">Montant réglé :</span>
                                        <div className="flex-1 flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-emerald-600">{selectedPayment.amount.toLocaleString('fr-MA')}</span>
                                            <span className="text-sm font-semibold text-slate-400">Dirhams (DH)</span>
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-4">
                                        <span className="text-xs font-semibold text-slate-400 min-w-[120px]">Mode de règlement:</span>
                                        <span className="text-sm font-semibold">{selectedPayment.method} {selectedPayment.reference_no && `• Réf: ${selectedPayment.reference_no}`}</span>
                                    </div>

                                    {selectedPayment.notes && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500">
                                            " {selectedPayment.notes} "
                                        </div>
                                    )}
                                </div>

                                {/* Signatures */}
                                <div className="mt-16 grid grid-cols-2 gap-20 pt-10">
                                    <div className="text-center">
                                        <p className="text-xs font-semibold text-slate-400 mb-16">Signature de l'ouvrier</p>
                                        <div className="border-t border-slate-300 pt-2 text-xs font-medium text-slate-300">Lu et approuvé</div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-semibold text-slate-400 mb-16">Cachet de la société</p>
                                        <div className="border-t border-slate-300 pt-2 text-xs font-medium text-slate-300">Signature & Cachet</div>
                                    </div>
                                </div>

                                {/* Decorative watermark */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-12">
                                    <Banknote size={300} />
                                </div>
                            </div>
                        </div>

                        <style>{`
                            @media print {
                                body * {
                                    visibility: hidden;
                                }
                                #receipt-content, #receipt-content * {
                                    visibility: visible;
                                }
                                #receipt-content {
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

export default Workers;
