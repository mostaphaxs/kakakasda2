// src/component/SuiviRealisation.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Save, BarChart2, Plus, Trash2, Pencil, Check, Paintbrush } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FinItem {
    id: string;           // local client-side uuid for key
    label: string;        // what's displayed (editable)
    element: string;      // server key (e.g. 'carrelage')
    checked: boolean;
    editing: boolean;
}

interface SuiviFinitionItem {
    element: string;
    label_custom?: string;
    checked: boolean;
}

interface SuiviData {
    gros_oeuvre_pourcentage: number;
    avec_finition: boolean;
    suivi_finition: SuiviFinitionItem[];
}

interface BienDetail {
    id: number;
    type_bien: string;
    groupe_habitation?: string;
    immeuble?: string;
    etage?: number;
    num_appartement?: string;
    surface_m2: number;
    statut: string;
    terrain?: { nom_projet: string };
    client?: {
        nom: string;
        prenom: string;
        cin: string;
        tel: string;
        avec_finition: boolean;
    };
}

interface Props {
    bien: BienDetail;
    onClose: () => void;
    onRefresh?: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_ELEMENTS: { element: string; label: string }[] = [
    { element: 'carrelage', label: 'Carrelage' },
    { element: 'peinture', label: 'Peinture' },
    { element: 'platre', label: 'Plâtre' },
    { element: 'electricite', label: 'Électricité' },
    { element: 'plomberie', label: 'Plomberie' },
    { element: 'aluminium', label: 'Aluminium' },
    { element: 'portes', label: 'Portes' },
    { element: 'porte_principale', label: 'Porte principale' },
];

let _uid = 0;
const uid = () => `item_${++_uid}`;

// ─── Component ───────────────────────────────────────────────────────────────

const SuiviRealisation: React.FC<Props> = ({ bien, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(true);
    const [savingGO, setSavingGO] = useState(false);
    const [savingFin, setSavingFin] = useState(false);

    const [goPct, setGoPct] = useState(0);
    const [items, setItems] = useState<FinItem[]>([]);

    // ─── Load ─────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<SuiviData>(`/biens/${bien.id}/suivi`);
            setGoPct(data.gros_oeuvre_pourcentage ?? 0);

            const server = data.suivi_finition ?? [];

            if (server.length === 0) {
                // First time – seed from defaults
                setItems(DEFAULT_ELEMENTS.map(d => ({
                    id: uid(),
                    label: d.label,
                    element: d.element,
                    checked: false,
                    editing: false,
                })));
            } else {
                // Rebuild from server data
                const serverItems: FinItem[] = server.map(s => {
                    const def = DEFAULT_ELEMENTS.find(d => d.element === s.element);
                    return {
                        id: uid(),
                        label: s.label_custom ?? def?.label ?? s.element,
                        element: s.element,
                        checked: s.checked,
                        editing: false,
                    };
                });
                setItems(serverItems);
            }
        } catch {
            toast.error('Erreur de chargement du suivi');
        } finally {
            setLoading(false);
        }
    }, [bien.id]);

    useEffect(() => { load(); }, [load]);

    // ─── Computed ─────────────────────────────────────────────────────────────
    const done = items.filter(i => i.checked).length;
    const total = items.length;
    const finPct = total > 0 ? Math.round((done / total) * 100) : 0;

    // ─── Item operations ───────────────────────────────────────────────────────
    const toggleCheck = (id: string) =>
        setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));

    const startEdit = (id: string) =>
        setItems(prev => prev.map(i => ({ ...i, editing: i.id === id })));

    const commitEdit = (id: string, val: string) =>
        setItems(prev => prev.map(i => i.id === id
            ? { ...i, label: val.trim() || i.label, editing: false }
            : i
        ));

    const removeItem = (id: string) =>
        setItems(prev => prev.filter(i => i.id !== id));

    const addItem = () =>
        setItems(prev => [...prev, {
            id: uid(),
            label: 'Autre',
            element: `autre_${uid()}`,
            checked: false,
            editing: true,
        }]);

    // ─── Save GO ──────────────────────────────────────────────────────────────
    const saveGO = async () => {
        setSavingGO(true);
        try {
            await apiFetch(`/biens/${bien.id}/suivi/gros-oeuvre`, {
                method: 'POST',
                body: JSON.stringify({ pourcentage: goPct }),
            });
            toast.success('Gros Œuvre enregistré');
            if (onRefresh) onRefresh();
        } catch {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSavingGO(false);
        }
    };

    // ─── Save Finition ────────────────────────────────────────────────────────
    const saveFinition = async () => {
        setItems(prev => prev.map(i => ({ ...i, editing: false })));
        setSavingFin(true);
        try {
            const payload = items.map(i => {
                const isDefault = DEFAULT_ELEMENTS.some(d => d.element === i.element);
                return {
                    element: isDefault ? i.element : ('autre_' + i.id).substring(0, 90),
                    label_custom: isDefault ? null : i.label,
                    checked: i.checked,
                };
            });
            await apiFetch(`/biens/${bien.id}/suivi/finition`, {
                method: 'POST',
                body: JSON.stringify({ items: payload }),
            });
            toast.success('Finition enregistrée');
            if (onRefresh) onRefresh();
        } catch {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSavingFin(false);
        }
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const bienLabel = [
        bien.type_bien,
        bien.groupe_habitation,
        bien.immeuble ? `Imm. ${bien.immeuble}` : null,
        bien.etage ? `Étage ${bien.etage}` : null,
        bien.num_appartement ? `N° ${bien.num_appartement}` : null,
    ].filter(Boolean).join(' · ');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[96vh] border border-white/20">

                {/* ── Header ── */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4 text-slate-900">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-100">
                            <BarChart2 className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight">
                                Suivi de Réalisation
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bienLabel}</p>
                                {bien.terrain && (
                                    <>
                                        <span className="text-slate-200">|</span>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bien.terrain.nom_projet}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all duration-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Sync...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto w-full">

                            {/* ── Controls (GO & Finition) ── */}
                            <div className="space-y-8">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Client Card */}
                                    {bien.client && (
                                        <div className="group relative p-5 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 animate-in slide-in-from-left duration-500 overflow-hidden">
                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-100 shrink-0">
                                                <span className="text-sm font-black text-white tracking-tighter">
                                                    {bien.client.prenom[0]}{bien.client.nom[0]}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Propriétaire</p>
                                                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight truncate leading-tight">
                                                    {bien.client.prenom} {bien.client.nom}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[9px] font-bold text-slate-400">{bien.client.tel}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${bien.client.avec_finition
                                                        ? 'bg-slate-100 text-slate-900 border-slate-200'
                                                        : 'bg-slate-50 text-slate-400 border-slate-100'
                                                        }`}>
                                                        {bien.client.avec_finition ? '✨ Finition' : '🧱 Gros Œuvre'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Gros Œuvre Radial Card */}
                                    <div className="p-4 bg-white rounded-3xl border border-slate-100 flex items-center gap-5 relative group shadow-sm">
                                        <div className="relative w-16 h-16 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                            <svg className="w-full h-full -rotate-90">
                                                <circle cx="32" cy="32" r="28" fill="none" stroke="slate-50" strokeWidth="6" />
                                                <circle
                                                    cx="32" cy="32" r="28" fill="none"
                                                    stroke="currentColor" strokeWidth="6"
                                                    className="text-slate-900 transition-all duration-1000 ease-out"
                                                    strokeDasharray={176}
                                                    strokeDashoffset={176 - (176 * goPct) / 100}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                {goPct === 100 ? (
                                                    <Check className="text-emerald-600" size={24} />
                                                ) : (
                                                    <Loader2 className="text-slate-400 animate-pulse" size={20} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Gros Œuvre</p>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded border ${goPct === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                    {goPct === 100 ? 'TERMINÉ' : 'EN COURS'}
                                                </span>
                                            </div>

                                            <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                                                <button
                                                    onClick={() => setGoPct(0)}
                                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${goPct === 0 ? 'bg-white shadow-sm text-black border border-slate-100' : 'text-slate-400'}`}
                                                >
                                                    En cours
                                                </button>
                                                <button
                                                    onClick={() => setGoPct(100)}
                                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${goPct === 100 ? 'bg-white shadow-sm text-black border border-slate-100' : 'text-slate-400'}`}
                                                >
                                                    Terminé
                                                </button>
                                            </div>

                                            <button
                                                onClick={saveGO} disabled={savingGO}
                                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                            >
                                                {savingGO ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                METTRE À JOUR GROS ŒUVRE
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Finition Detailed Card */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                    <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-100">
                                                <Paintbrush size={16} className="text-white" />
                                            </div>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-wider">Checklist Finition</p>
                                        </div>
                                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="bg-slate-900 h-full transition-all duration-700" style={{ width: `${finPct}%` }} />
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl group border transition-all duration-300 ${item.checked ? 'bg-indigo-50/30 border-indigo-50' : 'bg-white border-gray-50'
                                                        }`}
                                                >
                                                    <div
                                                        onClick={() => toggleCheck(item.id)}
                                                        className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all shrink-0 ${item.checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                                                            }`}
                                                    >
                                                        {item.checked && <Check size={12} className="text-white" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        {item.editing ? (
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                defaultValue={item.label}
                                                                onBlur={e => commitEdit(item.id, e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && commitEdit(item.id, (e.target as HTMLInputElement).value)}
                                                                className="w-full bg-white border border-indigo-100 py-0.5 px-2 text-xs font-bold text-gray-800 rounded outline-none"
                                                            />
                                                        ) : (
                                                            <p
                                                                className={`text-xs font-bold truncate transition-colors cursor-pointer ${item.checked ? 'text-indigo-400' : 'text-gray-700'}`}
                                                                onDoubleClick={() => startEdit(item.id)}
                                                            >
                                                                {item.label}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); startEdit(item.id); }} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Pencil size={11} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                onClick={addItem}
                                                className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-50 rounded-2xl text-gray-300 hover:border-indigo-200 hover:text-indigo-500 hover:bg-indigo-50 transition-all text-[9px] font-black uppercase tracking-widest"
                                            >
                                                <Plus size={12} /> Nouvel Élément
                                            </button>
                                        </div>

                                        <button
                                            onClick={saveFinition} disabled={savingFin}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                                        >
                                            {savingFin ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            Enregistrer les finitions
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-8 py-5 border-t border-gray-50 bg-white flex items-center justify-between shrink-0">
                    <p className="text-[8px] font-bold text-gray-200 uppercase tracking-[0.2em]">Solution Immobilière Connectée · v2.2</p>
                    <button onClick={onClose} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95">
                        Clôturer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuiviRealisation;
