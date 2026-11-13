// Disponibilites.tsx — availability grid per project: building → floor → unit,
// coloured libre / réservé / vendu. Click a free unit to reserve it for a client.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutGrid, X, Search, UserPlus, Loader2, Wallet, FileSignature, ExternalLink, Camera } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { usePersistedState } from '../lib/usePersistedState';
import { openQuickPayment, useClientsLite } from './common/QuickPayment';
import { openClientDocuments } from './common/ClientDocuments';
import { openProgressPhotos } from './common/ProgressPhotos';

interface BienClient { id: number; nom: string; prenom: string; cin?: string; tel?: string; avec_finition?: number | boolean }
interface Bien {
    id: number; terrain_id: number; type_bien?: string; groupe_habitation?: string | null; immeuble?: string | null;
    etage?: number | null; num_appartement?: string | null; nom?: string | null; surface_m2?: number | null;
    statut: 'Libre' | 'Reserve' | 'Vendu'; prix_global_finition?: number; prix_global_non_finition?: number;
    gros_oeuvre_pourcentage?: number; finition_pourcentage?: number;
    terrain?: { id: number; nom_projet?: string; nom_terrain?: string };
    clients?: BienClient[];
}
interface Terrain { id: number; nom_projet?: string; nom_terrain?: string }

const STYLE: Record<Bien['statut'], { label: string; cell: string; dot: string }> = {
    Libre: { label: 'Libre', cell: 'bg-emerald-50 text-emerald-900 ring-emerald-600/25 hover:bg-emerald-100', dot: 'bg-emerald-500' },
    Reserve: { label: 'Réservé', cell: 'bg-amber-50 text-amber-900 ring-amber-600/25 hover:bg-amber-100', dot: 'bg-amber-500' },
    Vendu: { label: 'Vendu', cell: 'bg-slate-800 text-white ring-slate-900 hover:bg-slate-700', dot: 'bg-slate-800' },
};
const floorLabel = (e?: number | null) => (e === null || e === undefined ? '—' : e === 0 ? 'RDC' : e < 0 ? `SS${Math.abs(e)}` : `Étage ${e}`);
const unitLabel = (b: Bien) => b.num_appartement || b.nom || `#${b.id}`;
const natural = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true });

export default function Disponibilites() {
    const [terrainId, setTerrainId] = usePersistedState<number | null>('Disponibilites.terrain', null);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const biensQ = useQuery({ queryKey: ['palette-biens'], queryFn: () => apiFetch<Bien[]>('/biens'), staleTime: 15_000 });
    const terrainsQ = useQuery({ queryKey: ['palette-terrains'], queryFn: () => apiFetch<Terrain[]>('/terrains'), staleTime: 60_000 });
    const terrains = terrainsQ.data ?? [];
    const activeId = terrainId ?? terrains[0]?.id ?? null;
    const biens = (biensQ.data ?? []).filter(b => b.terrain_id === activeId);
    const selected = (biensQ.data ?? []).find(b => b.id === selectedId);

    // building → floor (desc) → units
    const buildings = useMemo(() => {
        const map = new Map<string, Map<number | 'x', Bien[]>>();
        biens.forEach(b => {
            const key = [b.groupe_habitation && `Groupe ${b.groupe_habitation}`, b.immeuble && `Immeuble ${b.immeuble}`].filter(Boolean).join(' · ') || (b.type_bien ?? 'Biens');
            if (!map.has(key)) map.set(key, new Map());
            const floors = map.get(key)!;
            const f = b.etage ?? 'x';
            floors.set(f, [...(floors.get(f) ?? []), b]);
        });
        return [...map.entries()].sort(([a], [b]) => natural(a, b)).map(([name, floors]) => ({
            name,
            floors: [...floors.entries()]
                .sort(([a], [b]) => (b === 'x' ? -1 : a === 'x' ? 1 : (b as number) - (a as number)))
                .map(([f, list]) => ({ floor: f === 'x' ? null : f, units: list.sort((x, y) => natural(unitLabel(x), unitLabel(y))) })),
        }));
    }, [biens]);

    const counts = { Libre: 0, Reserve: 0, Vendu: 0 } as Record<Bien['statut'], number>;
    biens.forEach(b => { counts[b.statut] = (counts[b.statut] ?? 0) + 1; });

    return (
        <div className="space-y-5 pb-10">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <LayoutGrid className="text-slate-400" size={26} /> Disponibilités
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Vue par immeuble et par étage. Cliquez sur un bien libre pour le réserver à un client.</p>
                    </div>
                    <select value={activeId ?? ''} onChange={e => { setTerrainId(Number(e.target.value)); setSelectedId(null); }}
                        className="min-w-56 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                        {terrains.map(t => <option key={t.id} value={t.id}>{t.nom_projet || t.nom_terrain || `Projet #${t.id}`}</option>)}
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-5 pt-5 border-t border-slate-100 text-sm">
                    {(Object.keys(STYLE) as Bien['statut'][]).map(s => (
                        <span key={s} className="inline-flex items-center gap-2 text-slate-600">
                            <span className={`w-3 h-3 rounded ${STYLE[s].dot}`} />
                            {STYLE[s].label}<span className="font-semibold text-slate-900 tabular-nums">{counts[s]}</span>
                        </span>
                    ))}
                    <span className="ml-auto text-slate-500">{biens.length} bien(s)</span>
                </div>
            </div>

            {biensQ.isLoading && <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />}
            {!biensQ.isLoading && biens.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">Aucun bien dans ce projet.</div>
            )}

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {buildings.map(bld => (
                    <section key={bld.name} className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="text-sm font-semibold text-slate-900">{bld.name}</h3>
                        <div className="mt-4 space-y-2">
                            {bld.floors.map(fl => (
                                <div key={String(fl.floor)} className="flex items-stretch gap-3">
                                    <div className="w-16 flex-shrink-0 pt-2 text-xs font-medium text-slate-500">{floorLabel(fl.floor)}</div>
                                    <div className="flex-1 flex flex-wrap gap-2 pb-2 border-b border-dashed border-slate-100">
                                        {fl.units.map(b => (
                                            <button key={b.id} onClick={() => setSelectedId(b.id)}
                                                className={`min-w-[88px] px-3 py-2 rounded-lg text-left ring-1 ring-inset transition-colors ${STYLE[b.statut].cell} ${selectedId === b.id ? 'outline-2 outline-offset-2 outline-slate-900' : ''}`}
                                                title={`${b.type_bien ?? ''} ${unitLabel(b)} · ${STYLE[b.statut].label}`}>
                                                <span className="block text-sm font-semibold leading-tight">{unitLabel(b)}</span>
                                                <span className="block text-[11px] opacity-75 leading-tight">{b.type_bien}{b.surface_m2 ? ` · ${b.surface_m2} m²` : ''}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {selected && <UnitPanel bien={selected} onClose={() => setSelectedId(null)} />}
        </div>
    );
}

function UnitPanel({ bien, onClose }: { bien: Bien; onClose: () => void }) {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data: clients = [] } = useClientsLite();
    const [q, setQ] = useState('');
    const [saving, setSaving] = useState<number | null>(null);
    const owner = bien.clients?.[0];

    const candidates = useMemo(() => {
        const s = q.trim().toLowerCase();
        return clients
            .filter(c => c.statut !== 'Annulé' && (c.biens?.length ?? 0) === 0)
            .filter(c => !s || `${c.prenom} ${c.nom} ${c.cin} ${c.tel}`.toLowerCase().includes(s))
            .slice(0, 8);
    }, [clients, q]);

    const reserve = async (clientId: number) => {
        setSaving(clientId);
        try {
            const res = await apiFetch<{ message: string }>(`/biens/${bien.id}/reserve`, { method: 'POST', body: JSON.stringify({ client_id: clientId }) });
            toast.success(res.message);
            ['palette-biens', 'clients-lite', 'home-stats', 'notifications', 'reports-profit'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
        } catch (e: any) { toast.error(e.message); } finally { setSaving(null); }
    };

    const price = owner ? (owner.avec_finition ? bien.prix_global_finition : bien.prix_global_non_finition) : undefined;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <aside className="w-full max-w-md h-full bg-white shadow-xl ring-1 ring-slate-900/5 flex flex-col">
                <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">{bien.type_bien} {unitLabel(bien)}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${STYLE[bien.statut].cell}`}>{STYLE[bien.statut].label}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {[bien.groupe_habitation && `Groupe ${bien.groupe_habitation}`, bien.immeuble && `Imm. ${bien.immeuble}`, floorLabel(bien.etage), bien.surface_m2 && `${bien.surface_m2} m²`].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <button onClick={onClose} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="Fermer"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <dl className="grid grid-cols-2 border-b border-slate-100">
                        <div className="px-6 py-4"><dt className="text-xs text-slate-500">Prix avec finition</dt><dd className="mt-1 font-semibold text-slate-900 tabular-nums">{formatNumber(bien.prix_global_finition ?? 0)} DH</dd></div>
                        <div className="px-6 py-4 border-l border-slate-100"><dt className="text-xs text-slate-500">Prix gros œuvre</dt><dd className="mt-1 font-semibold text-slate-900 tabular-nums">{formatNumber(bien.prix_global_non_finition ?? 0)} DH</dd></div>
                    </dl>
                    <div className="px-6 py-4 border-b border-slate-100 space-y-2.5">
                        {[['Gros œuvre', bien.gros_oeuvre_pourcentage ?? 0], ['Finition', bien.finition_pourcentage ?? 0]].map(([l, v]) => (
                            <div key={l as string}>
                                <div className="flex justify-between text-xs text-slate-500"><span>{l}</span><span className="tabular-nums">{v}%</span></div>
                                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-slate-900" style={{ width: `${v}%` }} /></div>
                            </div>
                        ))}
                        <button onClick={() => openProgressPhotos(bien)} className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                            <Camera size={13} /> Photos d'avancement
                        </button>
                    </div>

                    {owner ? (
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <p className="text-xs text-slate-500">{bien.statut === 'Vendu' ? 'Acquéreur' : 'Réservé par'}</p>
                                <p className="mt-1 text-base font-semibold text-slate-900 capitalize">{owner.prenom} {owner.nom}</p>
                                <p className="text-sm text-slate-500">{[owner.cin?.toUpperCase(), owner.tel].filter(Boolean).join(' · ')}</p>
                                {price !== undefined && <p className="mt-1 text-sm text-slate-500">Prix convenu : <span className="font-medium text-slate-900">{formatNumber(price)} DH</span> ({owner.avec_finition ? 'avec finition' : 'gros œuvre'})</p>}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => { onClose(); openQuickPayment({ clientId: owner.id }); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"><Wallet size={15} /> Encaisser</button>
                                <button onClick={() => openClientDocuments(owner.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"><FileSignature size={15} /> Documents de vente</button>
                                <button onClick={() => navigate(`/clients?search=${encodeURIComponent(owner.cin || owner.nom)}`)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink size={15} /> Ouvrir le dossier client</button>
                            </div>
                        </div>
                    ) : bien.statut === 'Libre' ? (
                        <div className="px-6 py-5">
                            <h4 className="text-sm font-semibold text-slate-900">Réserver ce bien</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Clients actifs sans bien réservé</p>
                            <div className="relative mt-3">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Nom, CIN, téléphone…"
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                            </div>
                            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {candidates.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">Aucun client disponible</li>}
                                {candidates.map(c => (
                                    <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium text-slate-900 capitalize truncate">{c.prenom} {c.nom}</span>
                                            <span className="block text-xs text-slate-500 truncate">{[c.cin?.toUpperCase(), c.tel].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <button disabled={saving !== null} onClick={() => reserve(c.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50">
                                            {saving === c.id && <Loader2 size={12} className="animate-spin" />} Réserver
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => navigate(`/add-client?bien=${bien.id}`)} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                <UserPlus size={15} /> Nouveau client pour ce bien
                            </button>
                        </div>
                    ) : (
                        <p className="px-6 py-5 text-sm text-slate-500">Aucun client associé.</p>
                    )}
                </div>
            </aside>
        </div>
    );
}
