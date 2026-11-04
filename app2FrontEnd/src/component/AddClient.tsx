// src/component/AddClient.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, ArrowLeft, Save, Loader2, Upload, X, FileText, PlusCircle, Mail } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Controller } from 'react-hook-form';
import EnhancedInput from './common/EnhancedInput';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Bien {
    id: number;
    type_bien: string;
    num_appartement: string | null;
    statut: string;
    immeuble?: string;
    etage?: number;
    nom?: string;
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
    statut_choix: 'SANS_CHOIX' | 'CHOIX_FAIT' | 'CONTRAT_SIGNE';
    observation?: string;
}


// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError?: boolean) =>
    `w-full placeholder-slate-400 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500
   ${hasError ? '!border-red-400 focus:ring-red-100' : 'border-slate-100'}`;

const FieldWrapper = ({ label, error, fieldError, children }: {
    label: string; error?: string; fieldError?: string[]; children: React.ReactNode;
}) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        {children}
        {fieldError && <p className="mt-1 text-xs text-red-500 font-medium">{fieldError[0]}</p>}
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

    // ?bien=ID pre-selects a unit (from the availability grid)
    const [searchParams] = useSearchParams();
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setValue,
        control,
    } = useForm<ClientFormInputs>({
        defaultValues: {
            bien_id: searchParams.get('bien') ?? '',
            avec_finition: false,
            statut_choix: 'SANS_CHOIX',
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
                const sorted = data.sort((a, b) => {
                    const immA = a.immeuble || '';
                    const immB = b.immeuble || '';
                    if (immA !== immB) return immA.localeCompare(immB);

                    const valA = parseInt(a.num_appartement || '');
                    const valB = parseInt(b.num_appartement || '');
                    if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
                    return (a.num_appartement || '').localeCompare(b.num_appartement || '');
                });
                setBiens(sorted);
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
                    statut_choix: data.statut_choix || 'SANS_CHOIX',
                    observation: data.observation || null,
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
        <div className="min-h-screen bg-slate-50 py-6 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center mb-6 justify-end gap-0.5">
                    <button
                        onClick={() => navigate('/clients')}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                        title="Retour"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <UserPlus className="text-amber-600" size={26} />
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Nouveau Client</h1>
                            <p className="text-xs text-slate-400">Enregistrer un nouveau client</p>
                        </div>
                    </div>
                </div>

                {/* Error banner */}
                {serverError && (
                    <div className="mb-5 flex items-start gap-2 p-4 text-sm text-red-700 bg-red-50 rounded-xl border !border-red-200">
                        <span className="mt-0.5">⚠️</span>
                        <span>{serverError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                        {/* ── Section: Identité ── */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-sm font-semibold text-slate-600">1 – Identité</h2>
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
                                <Controller
                                    name="cin"
                                    control={control}
                                    rules={{
                                        required: 'Le CIN est requis.',
                                        maxLength: { value: 30, message: 'Max 30 caractères.' },
                                        validate: (val) => {
                                            const cleanVal = (val || '').replace(/\*\*/g, '');
                                            if (!cleanVal) return 'Le CIN est requis.';
                                            if (!/^[A-Za-z]{1,2}[0-9]{4,9}$/.test(cleanVal)) {
                                                return 'Format invalide (ex: AB123456).';
                                            }
                                            return true;
                                        }
                                    }}
                                    render={({ field }) => (
                                        <EnhancedInput
                                            value={field.value || ''}
                                            onChange={(val) => field.onChange(val.toUpperCase())}
                                            className={inputCls(!!errors.cin)}
                                            placeholder="Ex: AB123456"
                                        />
                                    )}
                                />
                                {existingClient && (
                                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg flex flex-col gap-2 duration-200">
                                        <p className="text-xs text-blue-700 font-medium tracking-tight">Client existant trouvé</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-slate-800">{existingClient.nom} {existingClient.prenom}</p>
                                            <button
                                                type="button"
                                                onClick={handleAutoFill}
                                                className="px-3 py-1 bg-white border border-amber-200 text-amber-600 rounded text-sm font-medium hover:bg-amber-600 hover:text-white transition-colors"
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

                            <div className="sm:col-span-2">
                                <FieldWrapper label="Adresse de Localisation (Optionnel)" error={errors.adresse?.message} fieldError={fieldErrors.adresse}>
                                    <textarea
                                        {...register('adresse', {
                                            maxLength: { value: 255, message: 'Max 255 caractères.' },
                                        })}
                                        dir="auto"
                                        className={inputCls(!!errors.adresse) + " resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"}
                                        placeholder="Ex: 123 Avenue Mohammed V, Casablanca"
                                    />
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* ── Section: Réservation ── */}
                        <div className="px-6 py-4 border-y border-slate-100 bg-slate-50/60">
                            <h2 className="text-sm font-semibold text-slate-600">2 – Réservation</h2>
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
                                                    {b.type_bien === 'Appartement' ? 'Bloc' : b.type_bien} {b.nom ? `(${b.nom})` : ''} {b.immeuble ? `(Imm. ${b.immeuble})` : ''} {b.num_appartement ? `(N° Appartement ${b.num_appartement})` : ''} · {b.etage === 0 ? 'RDC' : `Étage ${b.etage}`} · {b.statut === 'Libre' ? '🟢 Libre' : '🟠 Réservé'}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FieldWrapper>
                            </div>

                            {selectedBienId && (
                                <div className="sm:col-span-2 bg-blue-50/10 p-5 rounded-xl border border-blue-100 flex flex-col gap-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">Options de Finition</p>
                                            <p className="text-xs text-blue-700/60 font-medium">Le client souhaite-t-il la finition ?</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" {...register('avec_finition')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    {watch('avec_finition') && (
                                        <div className="pt-4 border-t border-blue-100/50 grid grid-cols-1 sm:grid-cols-2 gap-4 duration-200">
                                            <FieldWrapper label="Statut du Choix" error={errors.statut_choix?.message}>
                                                <select
                                                    {...register('statut_choix')}
                                                    className={inputCls(!!errors.statut_choix)}
                                                >
                                                    <option value="SANS_CHOIX">Sans Choix (Default)</option>
                                                    <option value="CHOIX_FAIT">Choix Déjà Fait</option>
                                                    <option value="CONTRAT_SIGNE">Contrat de Finition Signé</option>
                                                </select>
                                            </FieldWrapper>
                                        </div>
                                    )}
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

                            {/* Observation */}
                            <div className="sm:col-span-2 mt-4">
                                <FieldWrapper label="Observations / Notes" error={errors.observation?.message} fieldError={fieldErrors.observation}>
                                    <Controller
                                        name="observation"
                                        control={control}
                                        render={({ field }) => (
                                            <EnhancedInput
                                                type="textarea"
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                className={inputCls(!!errors.observation)}
                                                placeholder="Notes ou détails supplémentaires sur ce client..."
                                                showPolite={true}
                                                rows={3}
                                            />
                                        )}
                                    />
                                </FieldWrapper>
                            </div>
                        </div>


                        {/* ── Section: Documents ── */}
                        <div className="px-6 py-4 border-y border-slate-100 bg-slate-50/60">
                            <h2 className="text-sm font-semibold text-slate-600">3 – Documents Scannés</h2>
                        </div>
                        <div className="px-6 py-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500">Sélectionnez les documents à joindre au dossier client (CIN, Contrat, etc.)</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition"
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
                                                    <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm border border-slate-200">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="py-10 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
                                    >
                                        <div className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-slate-200 transition-transform">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">Cliquez pour ajouter des documents</p>
                                        <p className="text-xs text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/clients')}
                                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || uploadingDocs}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:bg-slate-300 transition shadow-sm active:scale-[0.98] bg-slate-900 hover:bg-slate-800"
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
