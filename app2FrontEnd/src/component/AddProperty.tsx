import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatNumber, parseNumber } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    nom: string;
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
    { element: 'sanitaire', label: 'Sanitaire' },
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
    `w-full px-3 py-1.5 rounded-lg border text-sm text-slate-800 bg-white placeholder-slate-400
   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition
   ${hasError ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'}`;

// ── Main Component ────────────────────────────────────────────────────────────

const AddProperty: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const queryClient = useQueryClient();
    const [serverError, setServerError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        control,
        formState: { errors },
    } = useForm<BienFormInputs>({
        defaultValues: {
            statut: 'Libre',
            nom: '',
            surface_m2: undefined,
            prix_par_m2_finition: undefined,
            prix_global_finition: 0,
            prix_par_m2_non_finition: undefined,
            prix_global_non_finition: 0,
            gros_oeuvre_pourcentage: 0,
            suivi_finition: DEFAULT_FINITION_ITEMS.map(d => ({ element: d.element, label_custom: null, checked: false })),
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'suivi_finition' as any });

    const { data: terrains = [], isLoading: loadingTerrains } = useQuery({
        queryKey: ['terrains'],
        queryFn: () => apiFetch<Terrain[]>('/terrains'),
    });

    const { data: bienData, isLoading: loadingBien, isError: isBienError } = useQuery({
        queryKey: ['biens', id],
        queryFn: () => apiFetch<any>(`/biens/${id}`),
        enabled: isEdit,
    });

    useEffect(() => {
        if (bienData) {
            // Map saved suivi_finition to the default item ordering so checkboxes align correctly
            const dbFinition: { element: string; label_custom: string | null; checked: boolean }[] =
                Array.isArray(bienData.suivi_finition) ? bienData.suivi_finition : [];

            const defaultElements = new Set(DEFAULT_FINITION_ITEMS.map(d => d.element));

            // Build ordered defaults first, then append any saved custom items
            const mergedFinition = DEFAULT_FINITION_ITEMS.map((def) => {
                const saved = dbFinition.find((f: any) => f.element === def.element);
                return {
                    element: def.element,
                    label_custom: saved?.label_custom ?? null,
                    checked: saved ? Boolean(saved.checked) : false,
                };
            });

            // Append saved custom (non-default) items
            const customItems = dbFinition
                .filter((f: any) => !defaultElements.has(f.element))
                .map((f: any) => ({
                    element: f.element,
                    label_custom: f.label_custom ?? '',
                    checked: Boolean(f.checked),
                }));

            reset({
                ...bienData,
                terrain_id: bienData.terrain_id,
                nom: bienData.nom || '',
                etage: bienData.etage !== null ? String(bienData.etage) : '',
                surface_m2: formatNumber(bienData.surface_m2) as any,
                prix_par_m2_finition: formatNumber(bienData.prix_par_m2_finition) as any,
                prix_par_m2_non_finition: formatNumber(bienData.prix_par_m2_non_finition) as any,
                gros_oeuvre_pourcentage: bienData.gros_oeuvre_pourcentage ?? 0,
                suivi_finition: [...mergedFinition, ...customItems],
            });
        }
    }, [bienData, reset]);

    useEffect(() => {
        if (isBienError) {
            toast.error("Erreur lors de la récupération du bien");
            navigate('/properties');
        }
    }, [isBienError, navigate]);

    const mutation = useMutation({
        mutationFn: (payload: any) =>
            isEdit
                ? apiFetch(`/biens/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
                : apiFetch('/biens', { method: 'POST', body: JSON.stringify(payload) }),
        onSuccess: () => {
            toast.success(isEdit ? 'Bien mis à jour !' : 'Bien ajouté !', { icon: isEdit ? '📝' : '🏠' });
            queryClient.invalidateQueries({ queryKey: ['biens'] });
            navigate('/properties');
        },
        onError: (err: any) => {
            if (err.errors) {
                setFieldErrors(err.errors);
                toast.error('Veuillez corriger les erreurs');
            } else {
                setServerError(err.message || 'Connexion au serveur échouée.');
            }
        }
    });

    // ── Price configuration moved to separate module ──────────────────────────

    const type_bien = watch('type_bien');
    const isVilla = type_bien === 'Villa';
    const isLotVilla = type_bien === 'Lot Villa';

    const onSubmit: SubmitHandler<BienFormInputs> = (data) => {
        setServerError('');
        const payload = {
            ...data,
            terrain_id: Number(data.terrain_id),
            nom: data.nom || null,
            etage: data.etage !== '' ? Number(data.etage) : null,
            surface_m2: parseNumber(String(data.surface_m2)),
            prix_par_m2_finition: data.prix_par_m2_finition ? parseNumber(String(data.prix_par_m2_finition)) : null,
            prix_global_finition: data.prix_global_finition ? Number(data.prix_global_finition) : null,
            prix_par_m2_non_finition: data.prix_par_m2_non_finition ? parseNumber(String(data.prix_par_m2_non_finition)) : null,
            prix_global_non_finition: data.prix_global_non_finition ? Number(data.prix_global_non_finition) : null,
            groupe_habitation: data.groupe_habitation || null,
            immeuble: data.immeuble || null,
            num_appartement: data.num_appartement || null,
            description: data.description || null,
            gros_oeuvre_pourcentage: Number(data.gros_oeuvre_pourcentage),
            suivi_finition: data.suivi_finition,
        };
        mutation.mutate(payload);
    };

    const isSubmitting = mutation.isPending;
    const pageLoading = isEdit && loadingBien;
    if (pageLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-sm font-bold tracking-widest uppercase text-gray-400">Chargement des données...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-4 px-4">
            <div className="max-w-2xl mx-auto">

                {/* ── Page Header ── */}
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate('/properties')}
                        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                        title="Retour"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Building2 className="text-blue-600" size={22} />
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">{isEdit ? 'Modifier' : 'Nouveau Bien'}</h1>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{isEdit ? `Unité ${watch('num_appartement')}` : 'Enregistrer une propriété'}</p>
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
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">1 – Localisation</h2>
                        </div>
                        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Projet */}
                            <div className="sm:col-span-2">
                                <FieldWrapper label="Projet *" error={errors.terrain_id?.message} fieldError={fieldErrors.terrain_id}>
                                    {loadingTerrains ? (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-400 text-[10px] font-bold uppercase">
                                            <Loader2 size={12} className="animate-spin" /> Synchronisation…
                                        </div>
                                    ) : (
                                        <select
                                            {...register('terrain_id', { required: 'Le projet est requis.' })}
                                            className={inputCls(!!errors.terrain_id)}
                                        >
                                            <option value="">— Sélectionner —</option>
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
                            {(!isVilla && !isLotVilla) && (
                                <FieldWrapper label="Groupe d'habitation" error={errors.groupe_habitation?.message} fieldError={fieldErrors.groupe_habitation}>
                                    <input
                                        {...register('groupe_habitation', { maxLength: { value: 100, message: 'Max 100 caractères.' } })}
                                        className={inputCls(!!errors.groupe_habitation)}
                                        placeholder="Ex: Résidence Al Andalous"
                                    />
                                </FieldWrapper>
                            )}

                            {/* Immeuble */}
                            {(!isVilla && !isLotVilla) && (
                                <FieldWrapper label="Immeuble" error={errors.immeuble?.message} fieldError={fieldErrors.immeuble}>
                                    <input
                                        {...register('immeuble', { maxLength: { value: 100, message: 'Max 100 caractères.' } })}
                                        className={inputCls(!!errors.immeuble)}
                                        placeholder="Ex: Bâtiment B"
                                    />
                                </FieldWrapper>
                            )}

                            {/* Étage */}
                            {(!isVilla && !isLotVilla) && (
                                <FieldWrapper label="Étage" error={errors.etage?.message} fieldError={fieldErrors.etage}>
                                    <select
                                        {...register('etage')}
                                        className={inputCls(!!errors.etage)}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        <option value="0">Rez-de-chaussée (RDC)</option>
                                        <option value="1">1er Étage</option>
                                        <option value="2">2ème Étage</option>
                                        <option value="3">3ème Étage</option>
                                        <option value="4">4ème Étage</option>
                                        <option value="5">5ème Étage</option>
                                    </select>
                                </FieldWrapper>
                            )}

                            {/* N° Appartement */}
                            {(!isVilla && !isLotVilla) && (
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
                                    <option value="Villa">Villa</option>
                                    <option value="Lot Villa">Lot Villa</option>
                                    <option value="Local Commercial">Local Commercial</option>
                                    <option value="Bureau">Bureau</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </FieldWrapper>

                            {/* Nom du Bien */}
                            {type_bien && type_bien !== 'Appartement' && (
                                <div className="sm:col-span-2">
                                    <FieldWrapper label="Nom / Identifiant unique (Optionnel)" error={errors.nom?.message} fieldError={fieldErrors.nom}>
                                        <input
                                            {...register('nom', { maxLength: { value: 255, message: 'Max 255 caractères.' } })}
                                            className={inputCls(!!errors.nom)}
                                            placeholder={(type_bien === 'Villa' || type_bien === 'Lot Villa') ? `Ex: ${type_bien} X2323 ou ${type_bien} Mohammed` : "Ex: Nom du local..."}
                                        />
                                        <p className="mt-1 text-[10px] text-slate-400 italic">Donnez un nom unique à ce bien pour le distinguer plus facilement.</p>
                                    </FieldWrapper>
                                </div>
                            )}

                            {/* Surface */}
                            <FieldWrapper label="Surface (m²) *" error={errors.surface_m2?.message} fieldError={fieldErrors.surface_m2}>
                                <input
                                    type="text"
                                    {...register('surface_m2', {
                                        required: 'Requis.',
                                        onChange: (e) => setValue('surface_m2', formatNumber(e.target.value) as any)
                                    })}
                                    className={`${inputCls(!!errors.surface_m2)} font-bold text-indigo-700`}
                                    placeholder="0.00"
                                />
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
                        {!isLotVilla && (
                            <>
                                <div className="px-6 py-4 border-y border-gray-100 bg-gray-50/60">
                                    <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">3 – État d'Avancement Réel</h2>
                                </div>
                                <div className="px-6 py-6 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Gros Œuvre Binary Status */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Gros Œuvre</label>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${watch('gros_oeuvre_pourcentage') === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {watch('gros_oeuvre_pourcentage') === 100 ? 'Terminé' : 'En cours'}
                                                </span>
                                            </div>

                                            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('gros_oeuvre_pourcentage', 0)}
                                                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${watch('gros_oeuvre_pourcentage') !== 100 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                                >
                                                    En cours
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('gros_oeuvre_pourcentage', 100)}
                                                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${watch('gros_oeuvre_pourcentage') === 100 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                                >
                                                    Terminé
                                                </button>
                                            </div>
                                        </div>

                                        {/* Finition Quick Checklist */}
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block">Checklist Finition</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {fields.map((field, idx) => {
                                                    const isDefault = DEFAULT_FINITION_ITEMS.some(d => d.element === (field as any).element);
                                                    const label = DEFAULT_FINITION_ITEMS.find(d => d.element === (field as any).element)?.label;
                                                    return isDefault ? (
                                                        <label key={field.id} className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-white border border-gray-100 rounded-lg cursor-pointer transition-all group">
                                                            <input
                                                                type="checkbox"
                                                                {...register(`suivi_finition.${idx}.checked` as any)}
                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase">{label}</span>
                                                        </label>
                                                    ) : (
                                                        <div key={field.id} className="col-span-2 flex items-center gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                                                            <input
                                                                type="checkbox"
                                                                {...register(`suivi_finition.${idx}.checked` as any)}
                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 shrink-0"
                                                            />
                                                            <input
                                                                type="text"
                                                                {...register(`suivi_finition.${idx}.label_custom` as any)}
                                                                placeholder="Nom de l’élément..."
                                                                className="flex-1 text-[11px] font-bold bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => remove(idx)}
                                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Add custom item button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newKey = `autre_${Date.now()}`;
                                                    append({ element: newKey, label_custom: '', checked: false });
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all bg-gray-50/30"
                                            >
                                                <Plus size={14} />
                                                Ajouter un élément
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Financial configuration has been extracted out */}

                        {/* ──── Footer Actions ──── */}
                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex flex-col-reverse sm:flex-row justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => navigate('/properties')}
                                className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-100 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 px-5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition shadow-md hover:shadow-lg"
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
