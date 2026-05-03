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

const ConfigPrixBiens: React.FC = () => {
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
        <div className="max-w-4xl mx-auto px-4 py-12 mt-12">
            {/* Header */}
            <div className="mb-10 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                    <Settings2 size={20} className="text-slate-400" />
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Paramètres de Tarification par Type</h1>
                </div>
                <p className="text-slate-500 text-sm">Configurez les prix unitaires par projet pour chaque type de bien.</p>
            </div>

            <div className="space-y-4">
                {terrains.map((terrain) => {
                    const key = String(terrain.id);
                    const prjVals = projectPrices[key] || {};
                    const isOpen = !!expanded[key];
                    const cfg = settings?.projects?.[key];
                    const isSaving = savingId === key;

                    return (
                        <div key={terrain.id} className="group bg-white border border-slate-200 rounded-lg overflow-hidden transition-all hover:border-slate-300">
                            {/* Row Header */}
                            <button
                                type="button"
                                onClick={() => toggleExpanded(key)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0 w-8">
                                        #{terrain.id}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-tight">{terrain.nom_projet}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            {cfg ? (
                                                <span className="text-[10px] text-emerald-600 font-bold uppercase">Tarifs spécifiques configurés</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium">Tarifs par défaut appliqués</span>
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
                                <div className="px-5 pb-6 pt-2 bg-slate-50/30 border-t border-slate-100 animate-in fade-in duration-300">
                                    <div className="overflow-x-auto mb-6">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr>
                                                    <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type de Bien</th>
                                                    <th className="pb-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Prix avec finition (DH / m²)</th>
                                                    <th className="pb-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Prix gros œuvre (DH / m²)</th>
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
                                                                    className="w-32 h-9 px-3 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-right transition-all"
                                                                    placeholder="9.000"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2 text-right">
                                                                <input
                                                                    type="text"
                                                                    value={typeVals.gros}
                                                                    onChange={e => setProjectVal(key, type, 'gros', e.target.value)}
                                                                    className="w-32 h-9 px-3 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-right transition-all"
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
                                            className="h-10 px-6 bg-slate-900 text-white rounded-md text-[11px] font-bold uppercase tracking-widest hover:bg-black disabled:bg-slate-400 transition-all shadow-sm flex items-center justify-center gap-2"
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
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Calculateur de prix par type actif</p>
            </div>
        </div>
    );
};

export default ConfigPrixBiens;
