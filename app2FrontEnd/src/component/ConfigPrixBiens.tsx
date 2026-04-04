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

interface ProjectConfig {
    finition: number;
    gros_oeuvre: number;
}

interface PricingSettings {
    default_prix_m2_finition: number;
    default_prix_m2_gros_oeuvre: number;
    projects: Record<string, ProjectConfig>;
}

const ConfigPrixBiens: React.FC = () => {
    const queryClient = useQueryClient();

    // Per-project state: { [terrainId]: { fin, gros } }
    const [projectPrices, setProjectPrices] = useState<Record<string, { fin: string; gros: string }>>({});
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
        const initial: Record<string, { fin: string; gros: string }> = {};
        Object.entries(settings.projects).forEach(([tid, cfg]) => {
            initial[tid] = {
                fin: formatNumber(cfg.finition),
                gros: formatNumber(cfg.gros_oeuvre),
            };
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
        const vals = projectPrices[key] || { fin: '9000', gros: '7000' };
        projectMutation.mutate({
            terrain_id: terrainId,
            prix_m2_finition: parseNumber(vals.fin) || 0,
            prix_m2_gros_oeuvre: parseNumber(vals.gros) || 0,
        });
    };

    const setProjectVal = (tid: string, field: 'fin' | 'gros', raw: string) => {
        setProjectPrices(prev => ({
            ...prev,
            [tid]: { ...(prev[tid] || { fin: '', gros: '' }), [field]: formatNumber(raw) },
        }));
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
        <div className="max-w-2xl mx-auto px-4 py-12 mt-12">
            {/* Header */}
            <div className="mb-10 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                    <Settings2 size={20} className="text-slate-400" />
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Paramètres de Tarification</h1>
                </div>
                <p className="text-slate-500 text-sm">Configurez les prix unitaires par projet pour le calcul automatique des biens.</p>
            </div>

            <div className="space-y-4">
                {terrains.map((terrain) => {
                    const key = String(terrain.id);
                    const vals = projectPrices[key] || { fin: '', gros: '' };
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
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                                                    <span>Finition: <span className="text-slate-900 font-bold">{formatNumber(cfg.finition)} DH</span></span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                    <span>Gros œuvre: <span className="text-slate-900 font-bold">{formatNumber(cfg.gros_oeuvre)} DH</span></span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium">Non configuré</span>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Prix avec finition (DH / m²)</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={vals.fin}
                                                    onChange={e => setProjectVal(key, 'fin', e.target.value)}
                                                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-md text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-300"
                                                    placeholder="9.000"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Prix gros œuvre (DH / m²)</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={vals.gros}
                                                    onChange={e => setProjectVal(key, 'gros', e.target.value)}
                                                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-md text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-300"
                                                    placeholder="7.000"
                                                />
                                            </div>
                                        </div>
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
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Calculateur de prix global actif</p>
            </div>
        </div>
    );
};

export default ConfigPrixBiens;
