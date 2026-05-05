// src/component/EditTerrain.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
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

const EditTerrain: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [serverError, setServerError] = useState('');
    const [pageLoading, setPageLoading] = useState(true);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TerrainFormInputs>({
        defaultValues: {
            nom_terrain: '',
            numero_TF: '',
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
                    description: data.description || '',
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

    // ── Submit ──────────────────────────────────────────────────────────────────
    const onSubmit: SubmitHandler<TerrainFormInputs> = async (data) => {
        setServerError('');
        try {
            await apiFetch(`/terrains/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
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
                                        <FieldWrapper label="Nom du Projet *" error={errors.nom_projet?.message} fieldError={fieldErrors.nom_projet} hint="Ce nom sert à lier les charges et biens">
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

                                    <FieldWrapper label="Numéro TF" error={errors.numero_TF?.message} fieldError={fieldErrors.numero_TF} hint="Numéro du Titre Foncier">
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

                    {/* ──── Right Column: Sidebar (4 cols) ──── */}
                    <div className="lg:col-span-4 space-y-8 sticky top-8">

                        {/* Media Management - Photos */}
                        <div className="bg-white border border-slate-200 shadow-xl p-6 rounded-xl space-y-6">
                            <MediaManager
                                modelType="Terrain"
                                modelId={id || ''}
                                category="photo"
                                title="Gallerie bien"
                            />
                        </div>

                        {/* Media Management - Documents */}
                        <div className="bg-white border border-slate-200 shadow-xl p-6 rounded-xl space-y-6">
                            <MediaManager
                                modelType="Terrain"
                                modelId={id || ''}
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

export default EditTerrain;
