// src/component/EditTerrain.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, ArrowLeft, Save, Loader2, Info } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatNumber, parseNumber } from '../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TerrainFormInputs {
    nom_terrain?: string;
    nom_projet: string;
    numero_TF?: string;
    date_acquisition?: string;
    cout_global: number;
    frais_enregistrement: number;
    frais_immatriculation: number;
    honoraires_notaire: number;
    autorisation_construction: number;
    autorisation_equipement: number;
    frais_pompier: number;
    frais_autorisation_intermediaire: number;
    total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError?: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400
   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition
   ${hasError ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'}`;

const FieldWrapper = ({ label, error, fieldError, hint, children }: {
    label: string; error?: string; fieldError?: string[]; hint?: string; children: React.ReactNode;
}) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        {children}
        {hint && !error && !fieldError && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        {fieldError && <p className="mt-1 text-[10px] text-red-500 font-bold">{fieldError[0]}</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const EditTerrain: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [serverError, setServerError] = useState('');
    const [pageLoading, setPageLoading] = useState(true);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TerrainFormInputs>({
        defaultValues: {
            nom_terrain: '',
            numero_TF: '',
            cout_global: 0,
            frais_enregistrement: 0,
            frais_immatriculation: 0,
            honoraires_notaire: 0,
            autorisation_construction: 0,
            autorisation_equipement: 0,
            frais_pompier: 0,
            frais_autorisation_intermediaire: 0,
            total: 0,
        },
    });

    // ── Fetch Initial Data ─────────────────────────────────────────────────────
    useEffect(() => {
        const fetchTerrain = async () => {
            try {
                const data = await apiFetch<any>(`/terrains/${id}`);
                reset({
                    nom_terrain: data.nom_terrain || '',
                    nom_projet: data.nom_projet || '',
                    numero_TF: data.numero_TF || '',
                    date_acquisition: data.date_acquisition || '',
                    cout_global: formatNumber(data.cout_global) as any,
                    frais_enregistrement: formatNumber(data.frais_enregistrement) as any,
                    frais_immatriculation: formatNumber(data.frais_immatriculation) as any,
                    honoraires_notaire: formatNumber(data.honoraires_notaire) as any,
                    autorisation_construction: formatNumber(data.autorisation_construction) as any,
                    autorisation_equipement: formatNumber(data.autorisation_equipement) as any, // Changed from autorisation_lotissement
                    frais_pompier: formatNumber(data.frais_pompier || 0) as any,
                    frais_autorisation_intermediaire: formatNumber(data.frais_autorisation_intermediaire || 0) as any,
                    total: data.total,
                });
            } catch (err: any) {
                toast.error('Erreur lors du chargement du terrain');
                navigate('/terrains');
            } finally {
                setPageLoading(false);
            }
        };

        if (id) fetchTerrain();
    }, [id, reset, navigate]);

    // ── Auto-calc total ─────────────────────────────────────────────────────────
    const [cout, fraisE, fraisI, hono, autC, autE, pompier, intermediarie] = watch(['cout_global', 'frais_enregistrement', 'frais_immatriculation', 'honoraires_notaire', 'autorisation_construction', 'autorisation_equipement', 'frais_pompier', 'frais_autorisation_intermediaire']); // Changed from autorisation_lotissement

    useEffect(() => {
        const sum = (parseNumber(String(cout)) || 0) +
            (parseNumber(String(fraisE)) || 0) +
            (parseNumber(String(fraisI)) || 0) +
            (parseNumber(String(hono)) || 0) +
            (parseNumber(String(autC)) || 0) +
            (parseNumber(String(pompier)) || 0) +
            (parseNumber(String(intermediarie)) || 0) +
            (parseNumber(String(autE)) || 0); // Changed from autorisation_lotissement

        setValue('total', parseFloat(sum.toFixed(2)));
    }, [cout, fraisE, fraisI, hono, autC, autE, pompier, intermediarie, setValue]); // Changed from autorisation_lotissement

    // ── Submit ──────────────────────────────────────────────────────────────────
    const onSubmit: SubmitHandler<TerrainFormInputs> = async (data) => {
        setServerError('');
        try {
            await apiFetch(`/terrains/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...data,
                    cout_global: parseNumber(String(data.cout_global)),
                    frais_enregistrement: parseNumber(String(data.frais_enregistrement)),
                    frais_immatriculation: parseNumber(String(data.frais_immatriculation)),
                    honoraires_notaire: parseNumber(String(data.honoraires_notaire)),
                    total: parseNumber(String(data.total)),
                    autorisation_construction: parseNumber(String(data.autorisation_construction)),
                    autorisation_equipement: parseNumber(String(data.autorisation_equipement)), // Changed from autorisation_lotissement
                    frais_pompier: parseNumber(String(data.frais_pompier)),
                    frais_autorisation_intermediaire: parseNumber(String(data.frais_autorisation_intermediaire)),
                }),
            });

            toast.success('Terrain mis à jour avec succès !', {
                icon: '📝',
                style: { borderRadius: '10px', background: '#1e3a5f', color: '#fff' },
            });
            navigate('/terrains');
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs');
            } else {
                setServerError(err.message || 'Connexion au serveur échouée.');
            }
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/terrains')}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                        title="Retour"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <MapPin className="text-blue-600" size={26} />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Modifier le Projet #{id}</h1>
                            <p className="text-xs text-gray-400">Mettre à jour les informations foncières</p>
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
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

                        {/* ── Section: Identification ── */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">1 – Identification</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                            <div className="sm:col-span-2">
                                <FieldWrapper label="Nom du Projet *" error={errors.nom_projet?.message} fieldError={fieldErrors.nom_projet} hint="Ce nom sert à lier les charges et biens (Ex: Projet Résidence Al Amal)">
                                    <input
                                        type="text"
                                        {...register('nom_projet', { required: 'Le nom du projet est obligatoire' })}
                                        className={inputCls(!!errors.nom_projet)}
                                        placeholder="Nom du Projet"
                                    />
                                </FieldWrapper>
                            </div>

                            <FieldWrapper label="Nom du Terrain" error={errors.nom_terrain?.message} fieldError={fieldErrors.nom_terrain} hint="Nom d'origine (Ex: Lotissement 5A)">
                                <input
                                    type="text"
                                    {...register('nom_terrain')}
                                    className={inputCls(!!errors.nom_terrain)}
                                    placeholder="Nom descriptif"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Numéro TF" error={errors.numero_TF?.message} fieldError={fieldErrors.numero_TF} hint="Numéro du Titre Foncier (Ex: 12345/64)">
                                <input
                                    type="text"
                                    {...register('numero_TF')}
                                    className={inputCls(!!errors.numero_TF)}
                                    placeholder="Ex: 12345/64"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Date d'acquisition" error={errors.date_acquisition?.message} fieldError={fieldErrors.date_acquisition}>
                                <input
                                    type="text"
                                    {...register('date_acquisition', {
                                        pattern: {
                                            value: /^\d{2}\/\d{2}\/\d{4}$/,
                                            message: 'Format requis: JJ/MM/AAAA',
                                        },
                                    })}
                                    className={inputCls(!!errors.date_acquisition)}
                                    placeholder="JJ/MM/AAAA"
                                />
                            </FieldWrapper>
                        </div>

                        {/* ── Section: Coûts ── */}
                        <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">2 – Coûts d'acquisition</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                            <div className="sm:col-span-2">
                                <FieldWrapper label="Coût global du terrain (DH) *" error={errors.cout_global?.message} fieldError={fieldErrors.cout_global}
                                    hint="Prix d'achat du terrain avant frais">
                                    <input
                                        type="text"
                                        {...register('cout_global', {
                                            required: 'Le coût global est requis.',
                                            onChange: (e) => setValue('cout_global', formatNumber(e.target.value) as any)
                                        })}
                                        className={`${inputCls(!!errors.cout_global)} font-bold text-lg`}
                                        placeholder="Ex: 1.500.000"
                                    />
                                </FieldWrapper>
                            </div>

                            <FieldWrapper label="Frais d'enregistrement (DH)" error={errors.frais_enregistrement?.message} fieldError={fieldErrors.frais_enregistrement}>
                                <input
                                    type="text"
                                    {...register('frais_enregistrement', {
                                        onChange: (e) => setValue('frais_enregistrement', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.frais_enregistrement)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Frais d'immatriculation (DH)" error={errors.frais_immatriculation?.message} fieldError={fieldErrors.frais_immatriculation}>
                                <input
                                    type="text"
                                    {...register('frais_immatriculation', {
                                        onChange: (e) => setValue('frais_immatriculation', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.frais_immatriculation)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Honoraires notaire (DH)" error={errors.honoraires_notaire?.message} fieldError={fieldErrors.honoraires_notaire}>
                                <input
                                    type="text"
                                    {...register('honoraires_notaire', {
                                        onChange: (e) => setValue('honoraires_notaire', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.honoraires_notaire)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>
                        </div>

                        {/* ── Section: Autorisations ── */}
                        <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">3 – Autorisations</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FieldWrapper label="Frais Autorisation de Construction (DH)" error={errors.autorisation_construction?.message} fieldError={fieldErrors.autorisation_construction}>
                                <input
                                    type="text"
                                    {...register('autorisation_construction', {
                                        onChange: (e) => setValue('autorisation_construction', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.autorisation_construction)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Frais Autorisation d'equipement (DH)" error={errors.autorisation_equipement?.message} fieldError={fieldErrors.autorisation_equipement}>
                                <input
                                    type="text"
                                    {...register('autorisation_equipement', {
                                        onChange: (e) => setValue('autorisation_equipement', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.autorisation_equipement)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Frais Pompier (DH)" error={errors.frais_pompier?.message} fieldError={fieldErrors.frais_pompier}>
                                <input
                                    type="text"
                                    {...register('frais_pompier', {
                                        onChange: (e) => setValue('frais_pompier', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.frais_pompier)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Frais Autorisation intermédiaire (DH)" error={errors.frais_autorisation_intermediaire?.message} fieldError={fieldErrors.frais_autorisation_intermediaire}>
                                <input
                                    type="text"
                                    {...register('frais_autorisation_intermediaire', {
                                        onChange: (e) => setValue('frais_autorisation_intermediaire', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.frais_autorisation_intermediaire)} font-bold text-lg`}
                                    placeholder="0"
                                />
                            </FieldWrapper>

                            {/* Total – read-only auto-calc */}
                            <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    TOTAL GÉNÉRAL INVESTI (DH)
                                </label>
                                <div className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-900 font-black text-xl tracking-wide shadow-sm">
                                    <Info size={22} className="shrink-0 opacity-70 text-indigo-600" />
                                    {watch('total') > 0
                                        ? formatNumber(watch('total')) + ' DH'
                                        : '—'}
                                </div>
                                <input type="hidden" {...register('total')} />
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/terrains')}
                                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 transition shadow-md hover:shadow-lg"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Mise à jour…</>
                                ) : (
                                    <><Save size={16} /> Enregistrer les modifications</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTerrain;
