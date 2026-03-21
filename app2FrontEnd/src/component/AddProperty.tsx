// src/component/AddProperty.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatNumber, parseNumber } from '../lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface Terrain {
    id: number;
    nom_projet?: string;
    nom_terrain?: string;
    cout_global: string;
    total: string;
}

interface BienFormInputs {
    terrain_id: number;
    type_bien: string;
    groupe_habitation: string;
    immeuble: string;
    etage: string;
    num_appartement: string;
    surface_m2: number;
    prix_par_m2_finition: number;
    prix_global_finition: number;
    prix_par_m2_non_finition: number;
    prix_global_non_finition: number;
    statut: 'Libre' | 'Reserve' | 'Vendu';
    description: string;
    gros_oeuvre_pourcentage: number;
    suivi_finition: { element: string; label_custom: string | null; checked: boolean }[];
}

const DEFAULT_FINITION_ITEMS = [
    { element: 'carrelage', label: 'Carrelage' },
    { element: 'peinture', label: 'Peinture' },
    { element: 'platre', label: 'Plâtre' },
    { element: 'electricite', label: 'Électricité' },
    { element: 'plomberie', label: 'Plomberie' },
    { element: 'aluminium', label: 'Aluminium' },
    { element: 'portes', label: 'Portes' },
    { element: 'porte_principale', label: 'Porte principale' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Reusable Field Components ─────────────────────────────────────────────────
const FieldWrapper = ({ label, error, fieldError, children }: { label: string; error?: string; fieldError?: string[]; children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        {children}
        {fieldError && <p className="mt-1 text-[10px] text-red-500 font-bold">{fieldError[0]}</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

const inputCls = (hasError?: boolean) =>
    `w-full px-4  py-2.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400
   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition
   ${hasError ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'}`;

// ── Main Component ────────────────────────────────────────────────────────────

const AddProperty: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const [terrains, setTerrains] = useState<Terrain[]>([]);
    const [loadingTerrains, setLoadingTerrains] = useState(true);
    const [pageLoading, setPageLoading] = useState(isEdit);
    const [serverError, setServerError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<BienFormInputs>({
        defaultValues: {
            statut: 'Libre',
            surface_m2: undefined,
            prix_par_m2_finition: undefined,
            prix_global_finition: 0,
            prix_par_m2_non_finition: undefined,
            prix_global_non_finition: 0,
            gros_oeuvre_pourcentage: 0,
            suivi_finition: DEFAULT_FINITION_ITEMS.map(d => ({ element: d.element, label_custom: null, checked: false })),
        },
    });

    // ── Fetch data if edit mode ────────────────────────────────────────────────
    useEffect(() => {
        if (isEdit) {
            const fetchBien = async () => {
                try {
                    const data = await apiFetch<any>(`/biens/${id}`);
                    reset({
                        ...data,
                        terrain_id: data.terrain_id,
                        etage: data.etage !== null ? String(data.etage) : '',
                        surface_m2: formatNumber(data.surface_m2) as any,
                        prix_par_m2_finition: formatNumber(data.prix_par_m2_finition) as any,
                        prix_par_m2_non_finition: formatNumber(data.prix_par_m2_non_finition) as any,
                    });
                } catch (err: any) {
                    toast.error("Erreur lors de la récupération du bien");
                    navigate('/properties');
                } finally {
                    setPageLoading(false);
                }
            };
            fetchBien();
        }
    }, [id, isEdit, reset, navigate]);

    // ── Auto-calculate prix_global ──────────────────────────────────────────────
    const surface = watch('surface_m2');
    const prix_m2_fin = watch('prix_par_m2_finition');
    const prix_m2_non_fin = watch('prix_par_m2_non_finition');
    const type_bien = watch('type_bien');
    const isLotVilla = type_bien === 'Lot Villa';

    useEffect(() => {
        const s = parseNumber(String(surface));

        // Finition calculation
        const p_fin = parseNumber(String(prix_m2_fin));
        if (!isNaN(s) && !isNaN(p_fin) && s > 0 && p_fin > 0) {
            setValue('prix_global_finition', parseFloat((s * p_fin).toFixed(2)));
        } else {
            setValue('prix_global_finition', 0);
        }

        // Non Finition calculation
        const p_non_fin = parseNumber(String(prix_m2_non_fin));
        if (!isNaN(s) && !isNaN(p_non_fin) && s > 0 && p_non_fin > 0) {
            setValue('prix_global_non_finition', parseFloat((s * p_non_fin).toFixed(2)));
        } else {
            setValue('prix_global_non_finition', 0);
        }
    }, [surface, prix_m2_fin, prix_m2_non_fin, setValue]);

    // ── Fetch terrains ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchTerrains = async () => {
            try {
                const data = await apiFetch<Terrain[]>('/terrains');
                setTerrains(data);
            } catch (err: any) {
                toast.error(err.message || 'Erreur de chargement des terrains.');
            } finally {
                setLoadingTerrains(false);
            }
        };
        fetchTerrains();
    }, []);

    // ── Submit ───────────────────────────────────────────────────────────────────
    const onSubmit: SubmitHandler<BienFormInputs> = async (data) => {
        setServerError('');
        try {
            const payload = {
                ...data,
                terrain_id: Number(data.terrain_id),
                etage: data.etage !== '' ? Number(data.etage) : null,
                surface_m2: parseNumber(String(data.surface_m2)),
                prix_par_m2_finition: parseNumber(String(data.prix_par_m2_finition)),
                prix_global_finition: Number(data.prix_global_finition),
                prix_par_m2_non_finition: parseNumber(String(data.prix_par_m2_non_finition)),
                prix_global_non_finition: Number(data.prix_global_non_finition),
                groupe_habitation: data.groupe_habitation || null,
                immeuble: data.immeuble || null,
                num_appartement: data.num_appartement || null,
                description: data.description || null,
                gros_oeuvre_pourcentage: Number(data.gros_oeuvre_pourcentage),
                suivi_finition: data.suivi_finition,
            };

            if (isEdit) {
                await apiFetch(`/biens/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                toast.success('Bien mis à jour !', { icon: '📝' });
            } else {
                await apiFetch('/biens', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                toast.success('Bien ajouté !', { icon: '🏠' });
            }

            navigate('/properties');
        } catch (err: any) {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs');
            } else {
                setServerError(err.message || 'Connexion au serveur échouée.');
            }
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────────
    if (pageLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-sm font-bold tracking-widest uppercase text-gray-400">Chargement des données...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4">
            <div className="max-w-3xl mx-auto">

                {/* ── Page Header ── */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/properties')}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                        title="Retour"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Building2 className="text-blue-600" size={26} />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Modifier le Bien' : 'Nouveau Bien'}</h1>
                            <p className="text-xs text-gray-400">{isEdit ? `Mise à jour de l'unité ${watch('num_appartement')}` : 'Enregistrer une nouvelle propriété'}</p>
                        </div>
                    </div>
                </div>

                {/* ── Server error banner ── */}
                {serverError && (
                    <div className="mb-5 flex items-start gap-2 p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
                        <span className="mt-0.5">⚠️</span>
                        <span>{serverError}</span>
                    </div>
                )}

                {/* ── Form Card ── */}
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

                        {/* ──── Section: Localisation ──── */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">1 – Localisation</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                            {/* Projet */}
                            <div className="sm:col-span-2">
                                <FieldWrapper label="Projet *" error={errors.terrain_id?.message} fieldError={fieldErrors.terrain_id}>
                                    {loadingTerrains ? (
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-400 text-sm">
                                            <Loader2 size={14} className="animate-spin" /> Chargement des projets…
                                        </div>
                                    ) : (
                                        <select
                                            {...register('terrain_id', { required: 'Le projet est requis.' })}
                                            className={inputCls(!!errors.terrain_id)}
                                        >
                                            <option value="">— Sélectionner un projet —</option>
                                            {terrains.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.nom_projet}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FieldWrapper>
                            </div>

                            {/* Groupe d'habitation */}
                            {!isLotVilla && (
                                <FieldWrapper label="Groupe d'habitation" error={errors.groupe_habitation?.message} fieldError={fieldErrors.groupe_habitation}>
                                    <input
                                        {...register('groupe_habitation', { maxLength: { value: 100, message: 'Max 100 caractères.' } })}
                                        className={inputCls(!!errors.groupe_habitation)}
                                        placeholder="Ex: Résidence Al Andalous"
                                    />
                                </FieldWrapper>
                            )}

                            {/* Immeuble */}
                            {!isLotVilla && (
                                <FieldWrapper label="Immeuble" error={errors.immeuble?.message} fieldError={fieldErrors.immeuble}>
                                    <input
                                        {...register('immeuble', { maxLength: { value: 100, message: 'Max 100 caractères.' } })}
                                        className={inputCls(!!errors.immeuble)}
                                        placeholder="Ex: Bâtiment B"
                                    />
                                </FieldWrapper>
                            )}

                            {/* Étage */}
                            {!isLotVilla && (
                                <FieldWrapper label="Étage" error={errors.etage?.message} fieldError={fieldErrors.etage}>
                                    <input
                                        type="number"
                                        {...register('etage', {
                                            min: { value: -5, message: 'Min -5.' },
                                            max: { value: 100, message: 'Max 100.' },
                                        })}
                                        className={inputCls(!!errors.etage)}
                                        placeholder="0"
                                    />
                                </FieldWrapper>
                            )}

                            {/* N° Appartement */}
                            {!isLotVilla && (
                                <FieldWrapper label="N° Appartement" error={errors.num_appartement?.message} fieldError={fieldErrors.num_appartement}>
                                    <input
                                        {...register('num_appartement', { maxLength: { value: 20, message: 'Max 20 car.' } })}
                                        className={inputCls(!!errors.num_appartement)}
                                        placeholder="Ex: A12"
                                    />
                                </FieldWrapper>
                            )}
                        </div>

                        {/* ──── Section: Caractéristiques ──── */}
                        <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">2 – Caractéristiques</h2>
                        </div>
                        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                            {/* Type de bien */}
                            <FieldWrapper label="Type de bien *" error={errors.type_bien?.message} fieldError={fieldErrors.type_bien}>
                                <select
                                    {...register('type_bien', { required: 'Le type de bien est requis.' })}
                                    className={inputCls(!!errors.type_bien)}
                                >
                                    <option value="">— Sélectionner —</option>
                                    <option value="Appartement">Appartement</option>
                                    <option value="Lot Villa">Lot Villa</option>
                                    <option value="Local Commercial">Local Commercial</option>
                                    <option value="Bureau">Bureau</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </FieldWrapper>

                            {/* Statut */}
                            <FieldWrapper label="Statut *" error={errors.statut?.message} fieldError={fieldErrors.statut}>
                                <select
                                    {...register('statut', { required: 'Le statut est requis.' })}
                                    className={inputCls(!!errors.statut)}
                                >
                                    <option value="Libre">🟢 Libre</option>
                                    <option value="Reserve">🟡 Réservé</option>
                                    <option value="Vendu">🔴 Vendu</option>
                                </select>
                            </FieldWrapper>

                            {/* Description */}
                            <div className="sm:col-span-2">
                                <FieldWrapper label="Description" error={errors.description?.message} fieldError={fieldErrors.description}>
                                    <textarea
                                        {...register('description', { maxLength: { value: 1000, message: 'Max 1000 caractères.' } })}
                                        rows={3}
                                        className={`${inputCls(!!errors.description)} resize-none`}
                                        placeholder="Notes ou détails supplémentaires…"
                                    />
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* ──── Section: État d'Avancement Réel ──── */}
                        {!isEdit && (
                            <>
                                <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                                    <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">3 – État d'Avancement Réel</h2>
                                </div>
                                <div className="px-6 py-6 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Gros Œuvre Binary Status */}
                                        <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Gros Œuvre</label>
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${watch('gros_oeuvre_pourcentage') === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                    {watch('gros_oeuvre_pourcentage') === 100 ? 'Terminé' : 'En cours'}
                                                </span>
                                            </div>

                                            <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('gros_oeuvre_pourcentage', 0)}
                                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${watch('gros_oeuvre_pourcentage') !== 100 ? 'bg-white shadow-sm text-black border border-slate-100' : 'text-slate-400'}`}
                                                >
                                                    En cours
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('gros_oeuvre_pourcentage', 100)}
                                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${watch('gros_oeuvre_pourcentage') === 100 ? 'bg-white shadow-sm text-black border border-slate-100' : 'text-slate-400'}`}
                                                >
                                                    Terminé
                                                </button>
                                            </div>

                                            <p className="text-[10px] text-slate-400 font-medium italic">Sélectionnez l'état actuel des travaux de gros œuvre.</p>
                                        </div>

                                        {/* Finition Quick Checklist */}
                                        <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
                                            <label className="text-xs font-black text-slate-900 uppercase tracking-widest block">Checklist Finition</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {DEFAULT_FINITION_ITEMS.map((item, idx) => (
                                                    <label key={item.element} className="flex items-center gap-2 p-2.5 bg-slate-50/50 hover:bg-white border border-slate-100 rounded-xl cursor-pointer transition-all group">
                                                        <input
                                                            type="checkbox"
                                                            {...register(`suivi_finition.${idx}.checked` as any)}
                                                            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-200"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-black transition-colors uppercase tracking-tight">{item.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ──── Section: Financier ──── */}
                        <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{!isEdit ? '4' : '3'} – Financier</h2>
                        </div>
                        <div className="px-6 py-6 space-y-6">

                            {/* Surface Highlight Card */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 sm:w-1/2 sm:mx-auto w-full shadow-sm text-center">
                                <label className="block text-sm font-bold text-indigo-900 mb-2 uppercase tracking-wide">Surface Principale (m²) *</label>
                                <div>
                                    <input
                                        type="text"
                                        {...register('surface_m2', {
                                            required: 'La surface est requise.',
                                            onChange: (e) => setValue('surface_m2', formatNumber(e.target.value) as any)
                                        })}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.surface_m2 ? 'border-red-400 focus:ring-red-400' : 'border-indigo-200'} focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-black text-2xl text-center text-indigo-900 bg-white placeholder-indigo-300 shadow-inner`}
                                        placeholder="Ex: 85.50"
                                    />
                                    {errors.surface_m2 && <p className="mt-2 text-xs text-red-500">{errors.surface_m2.message}</p>}
                                </div>
                            </div>

                            {/* Pricing Panels Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Finition Panel */}
                                <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-blue-50/80 px-4 py-3 border-b border-blue-100">
                                        <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2">✨ Avec Finition</h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <FieldWrapper label="Prix unitaire / m² (DH) *" error={errors.prix_par_m2_finition?.message} fieldError={fieldErrors.prix_par_m2_finition}>
                                            <input
                                                type="text"
                                                {...register('prix_par_m2_finition', {
                                                    required: 'Requis.',
                                                    onChange: (e) => setValue('prix_par_m2_finition', formatNumber(e.target.value) as any)
                                                })}
                                                className={`${inputCls(!!errors.prix_par_m2_finition)} font-bold text-lg text-blue-900`}
                                                placeholder="0.00"
                                            />
                                        </FieldWrapper>

                                        <div className="pt-2 mt-4 border-t border-gray-100">
                                            <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Total Finition Estimé</label>
                                            <div className="w-full px-4 py-3 rounded-xl bg-gray-50 text-blue-700 font-black text-xl tracking-wide border border-gray-200 text-right">
                                                {watch('prix_global_finition') > 0
                                                    ? formatNumber(watch('prix_global_finition')) + ' DH'
                                                    : '—'}
                                            </div>
                                            <input type="hidden" {...register('prix_global_finition')} />
                                        </div>
                                    </div>
                                </div>

                                {/* Non Finition Panel */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">🧱 Sans Finition (Gros Œuvre)</h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <FieldWrapper label="Prix unitaire / m² (DH) *" error={errors.prix_par_m2_non_finition?.message} fieldError={fieldErrors.prix_par_m2_non_finition}>
                                            <input
                                                type="text"
                                                {...register('prix_par_m2_non_finition', {
                                                    required: 'Requis.',
                                                    onChange: (e) => setValue('prix_par_m2_non_finition', formatNumber(e.target.value) as any)
                                                })}
                                                className={`${inputCls(!!errors.prix_par_m2_non_finition)} font-bold text-lg text-slate-800`}
                                                placeholder="0.00"
                                            />
                                        </FieldWrapper>

                                        <div className="pt-2 mt-4 border-t border-gray-100">
                                            <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Total Non Finition Estimé</label>
                                            <div className="w-full px-4 py-3 rounded-xl bg-gray-50 text-slate-700 font-black text-xl tracking-wide border border-gray-200 text-right">
                                                {watch('prix_global_non_finition') > 0
                                                    ? formatNumber(watch('prix_global_non_finition')) + ' DH'
                                                    : '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* ──── Footer Actions ──── */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/properties')}
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
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Enregistrement…
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        {isEdit ? 'Mettre à jour' : 'Enregistrer le bien'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProperty;
