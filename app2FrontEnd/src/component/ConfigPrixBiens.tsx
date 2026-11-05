import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';
import { Loader2, Save, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { formatNumber, parseNumber } from '../lib/utils';

interface Terrain {
    id: number;
    nom_projet: string;
}

interface TypePricing {
    finition: number;
    gros_oeuvre: number;
}

interface PricingSettings {
    default: Record<string, TypePricing>;
    projects: Record<string, Record<string, TypePricing>>;
}

const PROPERTY_TYPES = ['Appartement', 'Villa', 'Lot Villa', 'Local Commercial', 'Bureau', 'Autre'];

const ConfigPrixBiens: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const queryClient = useQueryClient();

    // Per-project state: { [terrainId]: { [type_bien]: { fin, gros } } }
    const [projectPrices, setProjectPrices] = useState<Record<string, Record<string, { fin: string; gros: string }>>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const { data: settings, isLoading: settingsLoading } = useQuery<PricingSettings>({
        queryKey: ['settings-pricing'],
        queryFn: () => apiFetch<PricingSettings>('/settings/pricing'),
    });

    const { data: terrains = [], isLoading: terrainsLoading } = useQuery<Terrain[]>({
        queryKey: ['terrains'],
        queryFn: () => apiFetch<Terrain[]>('/terrains'),
    });

    useEffect(() => {
        if (!settings?.projects) return;
        const initial: Record<string, Record<string, { fin: string; gros: string }>> = {};
        Object.entries(settings.projects).forEach(([tid, cfg]) => {
            initial[tid] = {};
            PROPERTY_TYPES.forEach(type => {
                const typeCfg = cfg[type] || settings.default[type] || { finition: 0, gros_oeuvre: 0 };
                initial[tid][type] = {
                    fin: formatNumber(typeCfg.finition),
                    gros: formatNumber(typeCfg.gros_oeuvre),
                };
            });
        });
        setProjectPrices(initial);
    }, [settings]);

    const projectMutation = useMutation({
        mutationFn: (payload: any) =>
            apiFetch('/settings/pricing', { method: 'POST', body: JSON.stringify(payload) }),
        onSuccess: (_data, variables) => {
            toast.success(`Tarifs mis à jour`);
            queryClient.invalidateQueries({ queryKey: ['settings-pricing'] });
            queryClient.invalidateQueries({ queryKey: ['biens'] });
            setSavingId(null);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erreur');
            setSavingId(null);
        },
    });

    const handleProjectSave = (terrainId: number) => {
        const key = String(terrainId);
        setSavingId(key);
        const vals = projectPrices[key] || {};

        const payloadPrices: Record<string, any> = {};
        PROPERTY_TYPES.forEach(type => {
            const typeVals = vals[type] || { fin: '9000', gros: '7000' };
            payloadPrices[type] = {
                finition: parseNumber(typeVals.fin) || 0,
                gros_oeuvre: parseNumber(typeVals.gros) || 0,
            };
        });

        projectMutation.mutate({
            terrain_id: terrainId,
            prices: payloadPrices,
        });
    };

    const setProjectVal = (tid: string, type: string, field: 'fin' | 'gros', raw: string) => {
        setProjectPrices(prev => {
            const currentProj = prev[tid] || {};
            const currentType = currentProj[type] || { fin: '', gros: '' };
            return {
                ...prev,
                [tid]: {
                    ...currentProj,
                    [type]: { ...currentType, [field]: formatNumber(raw) }
                }
            };
        });
    };

    const toggleExpanded = (tid: string) =>
        setExpanded(prev => ({ ...prev, [tid]: !prev[tid] }));

    if (settingsLoading || terrainsLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-10">
            {/* Header (hidden when shown inside Paramètres) */}
            {!embedded && <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <Settings2 size={26} className="text-slate-400 flex-shrink-0" /> Configuration des prix
                </h1>
                <p className="text-slate-500 text-sm mt-1">Prix unitaires (DH/m²) par projet et par type de bien, avec ou sans finition.</p>
            </div>}

            <div className="space-y-4">
                {terrains.map((terrain) => {
                    const key = String(terrain.id);
                    const prjVals = projectPrices[key] || {};
                    const isOpen = !!expanded[key];
                    const cfg = settings?.projects?.[key];
                    const isSaving = savingId === key;

                    return (
                        <div key={terrain.id} className="group bg-white border border-slate-200 rounded-lg overflow-hidden transition hover:border-slate-300">
                            {/* Row Header */}
                            <button
                                type="button"
                                onClick={() => toggleExpanded(key)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-xs font-medium text-slate-400 shrink-0 w-8">
                                        #{terrain.id}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{terrain.nom_projet}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            {cfg ? (
                                                <span className="text-xs text-emerald-600 font-medium">Tarifs spécifiques configurés</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium">Tarifs par défaut appliqués</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-slate-300 group-hover:text-slate-400 transition">
                                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </button>

                            {/* Settings Panel */}
                            {isOpen && (
                                <div className="px-5 pb-6 pt-2 bg-slate-50/30 border-t border-slate-100 duration-300">
                                    <div className="overflow-x-auto mb-6">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr>
                                                    <th className="pb-3 whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Type de Bien</th>
                                                    <th className="pb-3 text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Prix avec finition (DH / m²)</th>
                                                    <th className="pb-3 text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Prix gros œuvre (DH / m²)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                                                {PROPERTY_TYPES.map(type => {
                                                    const typeVals = prjVals[type] || { fin: '', gros: '' };
                                                    return (
                                                        <tr key={type} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-2 text-sm font-semibold text-slate-700">{type}</td>
                                                            <td className="py-2 px-2 text-right">
                                                                <input
                                                                    type="text"
                                                                    value={typeVals.fin}
                                                                    onChange={e => setProjectVal(key, type, 'fin', e.target.value)}
                                                                    className="w-32 text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                                    placeholder="9.000"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2 text-right">
                                                                <input
                                                                    type="text"
                                                                    value={typeVals.gros}
                                                                    onChange={e => setProjectVal(key, type, 'gros', e.target.value)}
                                                                    className="w-32 text-right pl-3 pr-3 py-2 tabular-nums bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                                    placeholder="7.000"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            disabled={isSaving}
                                            onClick={() => handleProjectSave(terrain.id)}
                                            className="h-10 px-4 text-white rounded-md text-sm font-medium disabled:bg-slate-400 transition shadow-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800"
                                        >
                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isSaving ? 'Mise à jour...' : 'Appliquer les tarifs'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center sm:justify-start gap-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs text-slate-400 font-semibold">Calculateur de prix par type actif</p>
            </div>
        </div>
    );
};

export default ConfigPrixBiens;
