// src/component/TerrainMap.tsx
// Interactive Digital Twin - Visual chantier map for a given terrain
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Save, ZoomIn, ZoomOut,
    Home, Edit2, CheckCircle2, Loader2, MapPin, LayoutDashboard,
    DollarSign, Briefcase, User as UserIcon, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/utils';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Bien {
    id: number;
    nom: string;
    type_bien: string;
    surface_m2: number;
    map_x: number;
    map_y: number;
    map_w: number;
    map_h: number;
    total_cost?: number;    // sum of missions cost
    total_paid?: number;    // sum of payments received
    sale_price?: number;    // agreed price with client
    client_name?: string;   // linked client name
    client_id?: number;
    progress?: number;      // 0 to 100
    statut?: string;        // Libre, Reserve, Vendu
}

interface Terrain {
    id: number;
    nom_projet: string;
    nom_terrain?: string;
}

// ── View Modes ───────────────────────────────────────────────────────────────
type ViewMode = 'progress' | 'recovery';

// ── Color & status logic ──────────────────────────────────────────────────────
const PROGRESS_STATUSES = [
    { key: 'vierge', label: 'Vierge', color: '#94a3b8', fill: '#f1f5f9', border: '#cbd5e1' },
    { key: 'encours', label: 'En cours', color: '#3b82f6', fill: '#eff6ff', border: '#93c5fd' },
    { key: 'finitions', label: 'Finitions', color: '#f59e0b', fill: '#fffbeb', border: '#fcd34d' },
    { key: 'livre', label: 'Livré', color: '#10b981', fill: '#ecfdf5', border: '#6ee7b7' },
];

const RECOVERY_STATUSES = [
    { key: 'available', label: 'Libre', color: '#94a3b8', fill: '#f8fafc', border: '#e2e8f0' },
    { key: 'nopayment', label: 'Vendu (0%)', color: '#ef4444', fill: '#fef2f2', border: '#fecaca' },
    { key: 'partial', label: 'Partiel', color: '#f59e0b', fill: '#fffbeb', border: '#fcd34d' },
    { key: 'paid', label: 'Soldé', color: '#10b981', fill: '#ecfdf5', border: '#6ee7b7' },
];

function getBienProgressStatus(bien: Bien): typeof PROGRESS_STATUSES[0] {
    if (bien.progress === 100) return PROGRESS_STATUSES[3]; // livré
    if ((bien.progress ?? 0) >= 40) return PROGRESS_STATUSES[2];  // finitions
    if ((bien.progress ?? 0) > 0) return PROGRESS_STATUSES[1];   // en cours
    if (bien.total_cost && bien.total_cost > 0) return PROGRESS_STATUSES[1];
    return PROGRESS_STATUSES[0];
}

function getBienRecoveryStatus(bien: Bien): typeof RECOVERY_STATUSES[0] {
    if (bien.statut !== 'Vendu' && bien.statut !== 'Reserve') return RECOVERY_STATUSES[0];
    if (bien.total_paid && bien.sale_price && bien.total_paid >= bien.sale_price) return RECOVERY_STATUSES[3];
    if (bien.total_paid && bien.total_paid > 0) return RECOVERY_STATUSES[2];
    return RECOVERY_STATUSES[1];
}

// ── Default size for new blocks ───────────────────────────────────────────────
const DEFAULT_W = 120;
const DEFAULT_H = 80;
const GRID_SIZE = 10;
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

// ── Component ─────────────────────────────────────────────────────────────────
const TerrainMap: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const svgRef = useRef<SVGSVGElement>(null);

    const [terrain, setTerrain] = useState<Terrain | null>(null);
    const [biens, setBiens] = useState<Bien[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('progress');
    const [zoom, setZoom] = useState(1);

    // Dragging state
    const dragging = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

    // ── Fetch data ────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [terrainData, biensData] = await Promise.all([
                    apiFetch<Terrain>(`/terrains/${id}`),
                    apiFetch<Bien[]>(`/terrain-map/${id}`),
                ]);
                setTerrain(terrainData);

                // Group by type for an organized initial layout
                const types = ['Appartement', 'Villa', 'Lot Villa', 'Local Commercial', 'Bureau', 'Autre'];
                const grouped: { [key: string]: Bien[] } = {};
                biensData.forEach((b: Bien) => {
                    const type = b.type_bien || 'Autre';
                    if (!grouped[type]) grouped[type] = [];
                    grouped[type].push(b);
                });

                const positioned: Bien[] = [];
                let currentY = 60;
                const spacingX = 60;
                const spacingY = 80;
                const startX = 60;
                const cols = 5;

                types.forEach(type => {
                    const items = grouped[type];
                    if (!items || items.length === 0) return;
                    items.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', undefined, { numeric: true }));
                    items.forEach((b, i) => {
                        const isAtDefault = !b.map_x || b.map_x <= 10;
                        positioned.push({
                            ...b,
                            map_x: isAtDefault ? (startX + (i % cols) * (DEFAULT_W + spacingX)) : b.map_x,
                            map_y: isAtDefault ? (currentY + Math.floor(i / cols) * (DEFAULT_H + spacingY)) : b.map_y,
                            map_w: b.map_w ?? DEFAULT_W,
                            map_h: b.map_h ?? DEFAULT_H,
                        });
                    });
                    currentY += Math.ceil(items.length / cols) * (DEFAULT_H + spacingY) + 40;
                });

                // Handle other types
                Object.keys(grouped).filter(t => !types.includes(t)).forEach(type => {
                    const items = grouped[type];
                    if (!items) return;
                    items.forEach((b, i) => {
                        const isAtDefault = !b.map_x || b.map_x <= 10;
                        positioned.push({
                            ...b,
                            map_x: isAtDefault ? (startX + (i % cols) * (DEFAULT_W + spacingX)) : b.map_x,
                            map_y: isAtDefault ? (currentY + Math.floor(i / cols) * (DEFAULT_H + spacingY)) : b.map_y,
                            map_w: b.map_w ?? DEFAULT_W,
                            map_h: b.map_h ?? DEFAULT_H,
                        });
                    });
                    currentY += Math.ceil(items.length / cols) * (DEFAULT_H + spacingY) + 40;
                });

                setBiens(positioned);
            } catch (e: any) {
                toast.error('Erreur chargement carte');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleAutoLayout = () => {
        const types = ['Appartement', 'Villa', 'Lot Villa', 'Local Commercial', 'Bureau', 'Autre'];
        const grouped: { [key: string]: Bien[] } = {};
        biens.forEach(b => {
            const type = b.type_bien || 'Autre';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(b);
        });

        const updated: Bien[] = [];
        let currentY = 60;
        const spacingX = 60;
        const spacingY = 80;
        const startX = 60;
        const cols = 5;

        types.forEach(type => {
            const items = grouped[type];
            if (!items || items.length === 0) return;
            items.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', undefined, { numeric: true }));
            items.forEach((b, i) => {
                updated.push({
                    ...b,
                    map_x: startX + (i % cols) * (DEFAULT_W + spacingX),
                    map_y: currentY + Math.floor(i / cols) * (DEFAULT_H + spacingY),
                });
            });
            currentY += Math.ceil(items.length / cols) * (DEFAULT_H + spacingY) + 40;
        });

        Object.keys(grouped).filter(t => !types.includes(t)).forEach(type => {
            const items = grouped[type];
            if (!items) return;
            items.forEach((b, i) => {
                updated.push({
                    ...b,
                    map_x: startX + (i % cols) * (DEFAULT_W + spacingX),
                    map_y: currentY + Math.floor(i / cols) * (DEFAULT_H + spacingY),
                });
            });
            currentY += Math.ceil(items.length / cols) * (DEFAULT_H + spacingY) + 40;
        });

        setBiens(updated);
        toast.success("Parcelles réorganisées par type ! 📐");
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = biens.map(b => ({
                id: b.id, map_x: b.map_x, map_y: b.map_y, map_w: b.map_w, map_h: b.map_h,
            }));
            await apiFetch(`/terrain-map/${id}`, { method: 'PUT', body: JSON.stringify({ biens: payload }) });
            toast.success('Carte sauvegardée ✅');
        } catch {
            toast.error('Erreur sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const getSVGPoint = (e: React.MouseEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
        };
    };

    const onMouseDown = (e: React.MouseEvent, id: number) => {
        if (!editMode) return;
        e.preventDefault();
        const pt = getSVGPoint(e);
        const bien = biens.find(b => b.id === id);
        if (!bien) return;
        dragging.current = { id, startX: pt.x, startY: pt.y, origX: bien.map_x, origY: bien.map_y };
        setSelectedId(id);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        const drag = dragging.current;
        if (!drag) return;
        const pt = getSVGPoint(e);
        const dx = pt.x - drag.startX;
        const dy = pt.y - drag.startY;
        setBiens(prev => prev.map(b =>
            b.id === drag.id ? {
                ...b,
                map_x: snap(Math.max(0, drag.origX + dx)),
                map_y: snap(Math.max(0, drag.origY + dy))
            } : b
        ));
    };

    const onMouseUp = () => { dragging.current = null; };

    const selectedBien = biens.find(b => b.id === selectedId) ?? null;

    // Financial calculations
    const recoveryProgress = selectedBien && selectedBien.sale_price ? Math.round((selectedBien.total_paid || 0) / selectedBien.sale_price * 100) : 0;

    const canvasW = 1200;
    const canvasH = 800;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-6 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/terrains')} className="p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <MapPin size={22} className="text-indigo-600" />
                            {terrain?.nom_projet ?? 'Carte du Terrain'}
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Digital Twin — Vue Interactive</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                        <button
                            onClick={() => setViewMode('progress')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'progress' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Briefcase size={14} /> Chantiers
                        </button>
                        <button
                            onClick={() => setViewMode('recovery')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'recovery' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <DollarSign size={14} /> Recouvrement
                        </button>
                    </div>

                    {/* Legend */}
                    <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
                        {(viewMode === 'progress' ? PROGRESS_STATUSES : RECOVERY_STATUSES).map(s => (
                            <div key={s.key} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
                        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-500 transition-all"><ZoomOut size={16} /></button>
                        <span className="text-[10px] font-black text-gray-400 px-2">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-500 transition-all"><ZoomIn size={16} /></button>
                    </div>
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className={`p-3 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${editMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-lg' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                    >
                        {editMode ? <CheckCircle2 size={16} /> : <Edit2 size={16} />}
                        {editMode ? 'Fin Édition' : 'Éditer'}
                    </button>
                    {editMode && (
                        <>
                            <button onClick={handleAutoLayout} className="p-3 bg-violet-600 text-white rounded-2xl border border-violet-600 shadow-lg shadow-violet-100 font-black text-xs uppercase tracking-widest transition-all hover:bg-violet-700 flex items-center gap-2">
                                <LayoutDashboard size={16} />
                                Auto-Layout
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 disabled:opacity-50">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Sauvegarder
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main layout: canvas + sidebar */}
            <div className="flex gap-6 items-start">
                <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-auto">
                    <svg
                        ref={svgRef}
                        viewBox={`0 0 ${canvasW} ${canvasH}`}
                        width={canvasW * zoom}
                        height={canvasH * zoom}
                        className="block"
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        style={{ cursor: editMode ? 'crosshair' : 'default' }}
                    >
                        <defs>
                            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                                <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width={canvasW} height={canvasH} fill="url(#grid)" />
                        <rect x={GRID_SIZE} y={GRID_SIZE} width={canvasW - GRID_SIZE * 2} height={canvasH - GRID_SIZE * 2} fill="none" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="6,4" rx={8} />

                        {[...biens].sort((a, b) => (a.id === selectedId ? 1 : 0) - (b.id === selectedId ? 1 : 0)).map(bien => {
                            const status = viewMode === 'progress' ? getBienProgressStatus(bien) : getBienRecoveryStatus(bien);
                            const isSelected = selectedId === bien.id;
                            const w = bien.map_w;
                            const h = bien.map_h;

                            const renderShape = () => {
                                switch (bien.type_bien) {
                                    case 'Villa':
                                        return <path d={`M 0 ${h * 0.3} L ${w / 2} 0 L ${w} ${h * 0.3} L ${w} ${h} L 0 ${h} Z`} fill={status.fill} stroke={isSelected ? '#6366f1' : status.border} strokeWidth={isSelected ? 3 : 1.5} />;
                                    case 'Lot Villa':
                                        return <rect width={w} height={h} rx={4} fill={status.fill} stroke={isSelected ? '#6366f1' : status.border} strokeWidth={isSelected ? 4 : 1.5} strokeDasharray="8,4" />;
                                    case 'Appartement':
                                        return (
                                            <g>
                                                <rect width={w} height={h} rx={2} fill={status.fill} stroke={isSelected ? '#6366f1' : status.border} strokeWidth={isSelected ? 3 : 1.5} />
                                                <line x1={w * 0.33} y1={h * 0.2} x2={w * 0.33} y2={h * 0.8} stroke={status.border} strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                                                <line x1={w * 0.66} y1={h * 0.2} x2={w * 0.66} y2={h * 0.8} stroke={status.border} strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                                            </g>
                                        );
                                    default:
                                        return <rect width={w} height={h} rx={10} fill={status.fill} stroke={isSelected ? '#6366f1' : status.border} strokeWidth={isSelected ? 3 : 1.5} />;
                                }
                            };

                            return (
                                <g
                                    key={bien.id}
                                    transform={`translate(${bien.map_x}, ${bien.map_y})`}
                                    onMouseDown={(e) => onMouseDown(e, bien.id)}
                                    onClick={() => setSelectedId(isSelected ? null : bien.id)}
                                    style={{ cursor: editMode ? 'grab' : 'pointer' }}
                                >
                                    <rect x={3} y={3} width={w} height={h} rx={10} fill="rgba(0,0,0,0.06)" />
                                    {renderShape()}
                                    <circle cx={w - 14} cy={14} r={6} fill={status.color} opacity={0.85} />
                                    <text x={10} y={16} fontSize={7} fontWeight="900" fill={status.color} style={{ textTransform: 'uppercase' }}>{bien.type_bien}</text>
                                    <text x={w / 2} y={h / 2 - 4} textAnchor="middle" fontSize={11} fontWeight="900" fill="#1e293b">{bien.nom}</text>
                                    <text x={w / 2} y={h / 2 + 12} textAnchor="middle" fontSize={9} fontWeight="700" fill="#64748b">{bien.surface_m2} m²</text>

                                    {/* Progress Bar Overlay */}
                                    <rect x={w * 0.1} y={h - 12} width={w * 0.8} height={4} rx={2} fill="#e2e8f0" />
                                    <rect
                                        x={w * 0.1} y={h - 12}
                                        width={(w * 0.8) * ((viewMode === 'progress' ? (bien.progress || 0) : (bien.sale_price ? Math.min(100, (bien.total_paid || 0) / bien.sale_price * 100) : 0)) / 100)}
                                        height={4} rx={2} fill={status.color}
                                    />
                                    {isSelected && <rect width={w} height={h} rx={10} fill="none" stroke="#6366f1" strokeWidth={3} strokeDasharray="6,3" />}
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Sidebar Panel */}
                <div className="w-80 space-y-4 flex-shrink-0 animate-in slide-in-from-right-4 duration-300">
                    {/* Stats Card */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Résumé {viewMode === 'progress' ? 'Technique' : 'Financier'}</p>
                            <TrendingUp size={16} className="text-indigo-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(viewMode === 'progress' ? PROGRESS_STATUSES : RECOVERY_STATUSES).map(s => {
                                const count = biens.filter(b => (viewMode === 'progress' ? getBienProgressStatus(b) : getBienRecoveryStatus(b)).key === s.key).length;
                                return (
                                    <div key={s.key} className="p-3 rounded-2xl border text-center transition-all hover:scale-105" style={{ background: s.fill, borderColor: s.border }}>
                                        <p className="text-xl font-black" style={{ color: s.color }}>{count}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: s.color }}>{s.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detailed Card */}
                    {selectedBien ? (
                        <div className="bg-white rounded-[2.5rem] border border-indigo-100 shadow-xl overflow-hidden">
                            <div className="bg-indigo-600 p-6 text-white">
                                <div className="flex items-center justify-between opacity-80 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedBien.type_bien}</span>
                                    <Home size={18} />
                                </div>
                                <h3 className="text-lg font-black uppercase mb-1">{selectedBien.nom}</h3>
                                <p className="text-[11px] font-bold opacity-80 flex items-center gap-1">
                                    <UserIcon size={12} /> {selectedBien.client_name || 'Aucun acquéreur'}
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Construction Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Construction</span>
                                        <span className="text-[10px] font-black text-indigo-600">{selectedBien.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${selectedBien.progress || 0}%` }} />
                                    </div>
                                </div>

                                {/* Financial Recovery */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recouvrement</span>
                                        <span className="text-[10px] font-black text-emerald-600">{recoveryProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${recoveryProgress}%` }} />
                                    </div>
                                </div>

                                {/* Detailed Stats */}
                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prix Vente</p>
                                        <p className="text-xs font-black text-gray-800">{formatNumber(selectedBien.sale_price || 0)} DH</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Déjà Payé</p>
                                        <p className="text-xs font-black text-emerald-600">{formatNumber(selectedBien.total_paid || 0)} DH</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Coût Chantiers (Excl. Mat.)</p>
                                        <p className="text-xs font-black text-amber-600">{formatNumber(selectedBien.total_cost || 0)} DH</p>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={() => navigate(`/edit-property/${selectedBien.id}`)}
                                        className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                            <Briefcase size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Suivi</span>
                                    </button>

                                    <button
                                        onClick={() => navigate(`/clients?client_id=${selectedBien.client_id}&action=payment`)}
                                        className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                                            <DollarSign size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Paiement</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-10 text-center opacity-50 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <MapPin size={32} className="text-gray-200" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                                Sélectionnez une parcelle<br />pour les détails profonds
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TerrainMap;
