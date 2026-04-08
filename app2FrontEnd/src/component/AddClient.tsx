// src/component/AddClient.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, ArrowLeft, Save, Loader2, Upload, X, FileText, PlusCircle, Mail } from 'lucide-react';
import { apiFetch } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Bien {
    id: number;
    type_bien: string;
    num_appartement: string | null;
    statut: string;
    immeuble?: string;
    etage?: number;
}

interface ClientFormInputs {
    nom: string;
    prenom: string;
    cin: string;
    tel: string;
    tel_2?: string;
    email?: string;
    adresse?: string;
    bien_id: string;
    date_reservation: string;
    avec_finition: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError?: boolean) =>
    `w-full px-4 py-3 rounded-2xl border text-sm text-slate-800 bg-slate-50/50 placeholder-slate-400
   focus:ring-4 focus:ring-amber-100 focus:border-amber-400 focus:bg-white outline-none transition-all
   ${hasError ? 'border-red-400 focus:ring-red-100' : 'border-slate-100'}`;

const FieldWrapper = ({ label, error, fieldError, children }: {
    label: string; error?: string; fieldError?: string[]; children: React.ReactNode;
}) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        {children}
        {fieldError && <p className="mt-1 text-[10px] text-red-500 font-bold">{fieldError[0]}</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const AddClient: React.FC = () => {
    const navigate = useNavigate();
    const [biens, setBiens] = useState<Bien[]>([]);
    const [loadingBiens, setLoadingBiens] = useState(true);
    const [serverError, setServerError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const [existingClient, setExistingClient] = useState<any | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setValue,
    } = useForm<ClientFormInputs>({
        defaultValues: {
            bien_id: '',
            avec_finition: false,
        }
    });

    const selectedBienId = watch('bien_id');
    const cinValue = watch('cin');

    // ── Search existing client by CIN ──────────────────────────────────────────
    useEffect(() => {
        if (!cinValue || cinValue.length < 4) {
            setExistingClient(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await apiFetch<any>(`/clients/search-by-cin/${cinValue.toUpperCase()}`);
                setExistingClient(res);
            } catch (err) {
                setExistingClient(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [cinValue]);

    const handleAutoFill = () => {
        if (!existingClient) return;
        setValue('nom', existingClient.nom);
        setValue('prenom', existingClient.prenom);
        setValue('tel', existingClient.tel);
        if (existingClient.tel_2) setValue('tel_2', existingClient.tel_2);
        if (existingClient.email) setValue('email', existingClient.email);
        if (existingClient.adresse) setValue('adresse', existingClient.adresse);
        setExistingClient(null);
        toast.success('Informations pré-remplies !');
    };

    // ── Fetch biens libres ──────────────────────────────────────────────────────
    useEffect(() => {
        const fetchBiens = async () => {
            try {
                const data = await apiFetch<Bien[]>('/biens');
                setBiens(data);
            } catch (err: any) {
                toast.error(err.message || 'Erreur de chargement des biens.');
            } finally {
                setLoadingBiens(false);
            }
        };
        fetchBiens();
    }, []);

    // ── Submit ──────────────────────────────────────────────────────────────────
    const onSubmit: SubmitHandler<ClientFormInputs> = async (data) => {
        setServerError('');
        try {
            const res = await apiFetch<any>('/clients', {
                method: 'POST',
                body: JSON.stringify({
                    nom: data.nom.trim(),
                    prenom: data.prenom.trim(),
                    cin: data.cin.trim().toUpperCase(),
                    tel: data.tel.trim(),
                    tel_2: data.tel_2 ? data.tel_2.trim() : null,
                    email: data.email ? data.email.trim() : null,
                    adresse: data.adresse ? data.adresse.trim() : null,
                    bien_id: data.bien_id ? Number(data.bien_id) : null,
                    date_reservation: data.date_reservation || null,
                    avec_finition: data.avec_finition || false,
                }),
            });

            const newClientId = res.client?.id || res.id;

            // ── Upload Documents if any ──
            if (selectedFiles.length > 0 && newClientId) {
                setUploadingDocs(true);
                for (const file of selectedFiles) {
                    const formData = new FormData();
                    formData.append('document', file);
                    formData.append('title', file.name);

                    try {
                        await apiFetch(`/clients/${newClientId}/documents`, {
                            method: 'POST',
                            body: formData
                        });
                    } catch (err: any) {
                        toast.error(`Erreur d'upload pour ${file.name}: ${err.message}`);
                    }
                }
            }

            toast.success('Client ajouté avec succès !', {
                icon: '👤',
                style: { borderRadius: '10px', background: '#3d2b1f', color: '#fff' },
            });
            navigate('/clients');
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs');
            } else {
                setServerError(err.message || 'Connexion au serveur échouée.');
            }
        } finally {
            setUploadingDocs(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...files]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/clients')}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                        title="Retour"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <UserPlus className="text-amber-600" size={26} />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Nouveau Client</h1>
                            <p className="text-xs text-gray-400">Enregistrer un nouveau client</p>
                        </div>
                    </div>
                </div>

                {/* Error banner */}
                {serverError && (
                    <div className="mb-5 flex items-start gap-2 p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
                        <span className="mt-0.5">⚠️</span>
                        <span>{serverError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="bg-white/80 backdrop-blur-lg border border-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">

                        {/* ── Section: Identité ── */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">1 – Identité</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                            <FieldWrapper label="Nom *" error={errors.nom?.message} fieldError={fieldErrors.nom}>
                                <input
                                    {...register('nom', {
                                        required: 'Le nom est requis.',
                                        maxLength: { value: 100, message: 'Max 100 caractères.' },
                                    })}
                                    className={inputCls(!!errors.nom)}
                                    placeholder="Ex: El Mansouri"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Prénom *" error={errors.prenom?.message} fieldError={fieldErrors.prenom}>
                                <input
                                    {...register('prenom', {
                                        required: 'Le prénom est requis.',
                                        maxLength: { value: 100, message: 'Max 100 caractères.' },
                                    })}
                                    className={inputCls(!!errors.prenom)}
                                    placeholder="Ex: Ahmed"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="CIN *" error={errors.cin?.message} fieldError={fieldErrors.cin}>
                                <input
                                    {...register('cin', {
                                        required: 'Le CIN est requis.',
                                        maxLength: { value: 20, message: 'Max 20 caractères.' },
                                        pattern: {
                                            value: /^[A-Za-z]{1,2}[0-9]{4,9}$/,
                                            message: 'Format invalide (ex: AB123456).',
                                        },
                                    })}
                                    className={inputCls(!!errors.cin)}
                                    placeholder="Ex: AB123456"
                                    style={{ textTransform: 'uppercase' }}
                                />
                                {existingClient && (
                                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tight">Client existant trouvé</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-black text-slate-800 uppercase">{existingClient.nom} {existingClient.prenom}</p>
                                            <button
                                                type="button"
                                                onClick={handleAutoFill}
                                                className="px-3 py-1 bg-white border border-amber-200 text-amber-600 rounded text-[10px] font-black uppercase hover:bg-amber-600 hover:text-white transition-colors"
                                            >
                                                Utiliser
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </FieldWrapper>

                            <FieldWrapper label="Téléphone *" error={errors.tel?.message} fieldError={fieldErrors.tel}>
                                <input
                                    type="tel"
                                    {...register('tel', {
                                        required: 'Le téléphone est requis.',
                                        maxLength: { value: 20, message: 'Max 20 caractères.' },
                                        pattern: {
                                            value: /^[+0-9\s\-()]{6,20}$/,
                                            message: 'Numéro de téléphone invalide.',
                                        },
                                    })}
                                    className={inputCls(!!errors.tel)}
                                    placeholder="Ex: +212 6 12 34 56 78"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Téléphone secondaire (Optionnel)" error={errors.tel_2?.message} fieldError={fieldErrors.tel_2}>
                                <input
                                    type="tel"
                                    {...register('tel_2', {
                                        maxLength: { value: 20, message: 'Max 20 caractères.' },
                                        pattern: {
                                            value: /^[+0-9\s\-()]{6,20}$/,
                                            message: 'Numéro de téléphone invalide.',
                                        },
                                    })}
                                    className={inputCls(!!errors.tel_2)}
                                    placeholder="Ex: +212 7 12 34 56 78"
                                />
                            </FieldWrapper>
                        </div>

                        <div className="px-6 grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                            <FieldWrapper label="E-mail / Gmail (Optionnel)" error={errors.email?.message} fieldError={fieldErrors.email}>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="email"
                                        {...register('email', {
                                            maxLength: { value: 100, message: 'Max 100 caractères.' },
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: 'Adresse email invalide.',
                                            },
                                        })}
                                        className={inputCls(!!errors.email) + " pl-10"}
                                        placeholder="Ex: client@gmail.com"
                                    />
                                </div>
                            </FieldWrapper>

                            <FieldWrapper label="Adresse de Localisation (Optionnel)" error={errors.adresse?.message} fieldError={fieldErrors.adresse}>
                                <input
                                    {...register('adresse', {
                                        maxLength: { value: 255, message: 'Max 255 caractères.' },
                                    })}
                                    className={inputCls(!!errors.adresse)}
                                    placeholder="Ex: 123 Avenue Mohammed V, Casablanca"
                                />
                            </FieldWrapper>
                        </div>

                        {/* ── Section: Réservation ── */}
                        <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">2 – Réservation</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                            {/* Biens liés */}
                            <div className="sm:col-span-2">
                                <FieldWrapper label="Bien réservé (optionnel)" error={errors.bien_id?.message} fieldError={fieldErrors.bien_id}>
                                    {loadingBiens ? (
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-400 text-sm">
                                            <Loader2 size={14} className="animate-spin" /> Chargement…
                                        </div>
                                    ) : (
                                        <select
                                            {...register('bien_id')}
                                            className={inputCls(!!errors.bien_id)}
                                        >
                                            <option value="">— Choisir un bien —</option>
                                            {biens.map((b) => (
                                                <option
                                                    key={b.id}
                                                    value={b.id}
                                                    disabled={b.statut !== 'Libre'}
                                                >
                                                    {b.type_bien} {b.immeuble ? `(Imm. ${b.immeuble})` : ''} {b.num_appartement ? `(N° ${b.num_appartement})` : ''} · {b.etage === 0 ? 'RDC' : `Étage ${b.etage}`} · {b.statut === 'Libre' ? '🟢 Libre' : '🟠 Réservé'}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FieldWrapper>
                            </div>

                            {selectedBienId && (
                                <div className="sm:col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">Choix de Finition</p>
                                        <p className="text-xs text-indigo-700/70">Le client souhaite-t-il la finition pour ce bien ?</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" {...register('avec_finition')} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            )}

                            {/* Date de réservation */}
                            <FieldWrapper label="Date de réservation" error={errors.date_reservation?.message} fieldError={fieldErrors.date_reservation}>
                                <input
                                    type="text"
                                    {...register('date_reservation', {
                                        pattern: {
                                            value: /^\d{2}\/\d{2}\/\d{4}$/,
                                            message: 'Format requis: JJ/MM/AAAA (ex: 09/03/2026)',
                                        },
                                    })}
                                    className={inputCls(!!errors.date_reservation)}
                                    placeholder="JJ/MM/AAAA"
                                />
                            </FieldWrapper>
                        </div>

                        {/* ── Section: Documents ── */}
                        <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">3 – Documents Scannés</h2>
                        </div>
                        <div className="px-6 py-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500">Sélectionnez les documents à joindre au dossier client (CIN, Contrat, etc.)</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
                                    >
                                        <PlusCircle size={14} />
                                        Ajouter
                                    </button>
                                    <input
                                        type="file"
                                        multiple
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                    />
                                </div>

                                {selectedFiles.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                                                        <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="py-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                                    >
                                        <div className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">Cliquez pour ajouter des documents</p>
                                        <p className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/clients')}
                                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || uploadingDocs}
                                className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-amber-600 text-white text-sm font-black uppercase tracking-widest hover:bg-amber-700 disabled:bg-slate-300 transition-all shadow-lg shadow-amber-900/10 active:scale-[0.98]"
                            >
                                {isSubmitting || uploadingDocs ? (
                                    <><Loader2 size={16} className="animate-spin" /> {uploadingDocs ? 'Envoi des fichiers…' : 'Enregistrement…'}</>
                                ) : (
                                    <><Save size={16} /> Enregistrer le client</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClient;
