// src/component/AddTerrain.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import MediaManager from './media/MediaManager';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TerrainFormInputs {
    nom_terrain?: string;
    nom_projet: string;
    numero_TF?: string;
    date_acquisition?: string;
    description?: string;
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

const AddTerrain: React.FC = () => {
    const navigate = useNavigate();
    const [serverError, setServerError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<TerrainFormInputs>({
        defaultValues: {
            nom_terrain: '',
            numero_TF: '',
        },
    });

    // ── Submit ──────────────────────────────────────────────────────────────────
    const onSubmit: SubmitHandler<TerrainFormInputs> = async (data) => {
        setServerError('');
        try {
            const res = await apiFetch<{ id: number; terrain: { id: number } }>('/terrains', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            toast.success('Projet créé ! Vous pouvez maintenant ajouter des documents.', {
                icon: '🗺️',
                duration: 4000,
                style: { borderRadius: '10px', background: '#1e3a5f', color: '#fff' },
            });
            // Redirect to edit page so the Plan de travail + is enabled immediately
            navigate(`/edit-terrain/${res.id}`);
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs');
            } else {
                setServerError(err.message || 'Connexion au serveur échouée.');
            }
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4">
            <div className="max-w-6xl mx-auto">

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
                            <h1 className="text-2xl font-bold text-gray-800">Nouveau Projet</h1>
                            <p className="text-xs text-gray-400">Enregistrer un nouveau projet</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ──── Left Column: Form (8 cols) ──── */}
                    <div className="lg:col-span-8 space-y-8 pb-12">
                        <form onSubmit={handleSubmit(onSubmit)} noValidate>
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

                                {/* ── Section: Identification ── */}
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                                    <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Identification du Projet</h2>
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

                                    <div className="sm:col-span-2">
                                        <FieldWrapper label="Observations / Description" error={errors.description?.message} fieldError={fieldErrors.description}>
                                            <textarea
                                                {...register('description')}
                                                rows={3}
                                                className={`${inputCls(!!errors.description)} resize-none`}
                                                placeholder="Notez ici les détails particuliers du projet..."
                                            />
                                        </FieldWrapper>
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
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition shadow-md hover:shadow-lg"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                                        ) : (
                                            <><Save size={16} /> Enregistrer le projet</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* ──── Right Column: Sidebar (4 cols) ──── */}
                    <div className="lg:col-span-4 space-y-8 sticky top-8">

                        {/* Media Management - Photos */}
                        <div className="bg-white border border-slate-200 shadow-xl p-6 rounded-xl space-y-6">
                            <MediaManager
                                modelType="Terrain"
                                modelId={''}
                                category="photo"
                                title="Galerie Bien"
                            />
                        </div>

                        {/* Media Management - Documents */}
                        <div className="bg-white border border-slate-200 shadow-xl p-6 rounded-xl space-y-6">
                            <MediaManager
                                modelType="Terrain"
                                modelId={''}
                                category="document"
                                title="Plan de travail"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AddTerrain;
