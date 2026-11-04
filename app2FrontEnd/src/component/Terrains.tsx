// Terrains.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Trash2, X, Search, Download, FileText, Edit2, Map as MapIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { parseDate } from '../lib/utils';
import MediaManager from './media/MediaManager';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';

interface Terrain {
    id: number;
    nom_terrain?: string;
    nom_projet: string;
    numero_TF?: string;
    cout_global: number;
    frais_enregistrement: number;
    frais_immatriculation: number;
    frais_autorisation_intermediaire: number;
    honoraires_notaire: number;
    autorisation_construction: number;
    autorisation_equipement: number;
    frais_pompier: number;
    total: number;
    description?: string;
    created_at: string;
}


const Terrains = () => {
    const navigate = useNavigate();
    const [terrains, setTerrains] = useState<Terrain[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = usePersistedState('Terrains.searchTerm', '');
    useUrlSearch(setSearchTerm);

    // Modals State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedTerrain, setSelectedTerrain] = useState<Terrain | null>(null);

    const fetchTerrains = async () => {
        try {
            const data = await apiFetch<Terrain[]>('/terrains');
            setTerrains(data);
        } catch (err: any) {
            toast.error('Erreur lors du chargement des projets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTerrains();
    }, []);

    const handleDeleteTerrain = async (id: number) => {
        if (!await confirmDialog('Supprimer ce projet ?')) return;
        try {
            await apiFetch(`/terrains/${id}`, { method: 'DELETE' });
            toast.success('Projet supprimé');
            setTerrains(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleOpenDetails = (terrain: Terrain) => {
        setSelectedTerrain(terrain);
        setIsDetailsModalOpen(true);
    };

    const filteredTerrains = terrains.filter(t => {
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || (
            t.id.toString().includes(search) ||
            t.nom_projet?.toLowerCase().includes(search) ||
            t.nom_terrain?.toLowerCase().includes(search) ||
            t.numero_TF?.toString().includes(search)
        );

        if (!matchesSearch) return false;


        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
    };

    const handleExport = () => {
        if (filteredTerrains.length === 0) {
            toast.error("Aucune donnée à exporter");
            return;
        }
        const dataToExport = filteredTerrains.map(t => ({
            'ID': t.id,
            'NOM DU PROJET': t.nom_projet?.toUpperCase() || `PROJET #${t.id}`,
            'NOM DU PROJET (ORIGINE)': t.nom_terrain || 'N/A',
            'NUMÉRO TF': t.numero_TF || 'N/A',
            'DATE ACQUISITION': t.created_at ? parseDate(t.created_at).toLocaleDateString('fr-MA') : 'N/A',
        }));

        exportToExcel(dataToExport, `terrains_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Liste des projets exportée avec succès");
    };

    return (
        <div className="space-y-6">
            <div className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 mx-1">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <MapPin className="text-blue-600" size={32} />
                            Gestion des Projets
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">Acquisitions foncières et dossiers techniques de <span className="text-slate-800 font-semibold">Société les cinq elements</span>.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-medium text-sm border border-slate-200 active:scale-[0.98]"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>

                        <button
                            onClick={() => navigate('/add-terrain')}
                            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-sm active:scale-[0.98] bg-slate-900 hover:bg-slate-800"
                        >
                            <Plus size={18} />
                            Nouveau Projet
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-6 border-t border-slate-100 items-end">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Recherche par Projet, TF..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>

                    <button
                        onClick={resetFilters}
                        className="w-full text-slate-400 hover:text-blue-600 text-sm font-medium flex items-center justify-center gap-2 transition border border-slate-100 rounded-lg py-2.5 hover:bg-slate-50"
                    >
                        <X size={14} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white border-b border-slate-200">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Projet</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Terrain d'origine</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">N° Titre Foncier</th>
                            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Acquisition</th>
                            <th className="whitespace-nowrap text-right px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={5} className="px-4 py-3">
                                        <div className="h-4 w-1/3 rounded bg-slate-100 animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : filteredTerrains.length > 0 ? (
                            filteredTerrains.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleOpenDetails(t)} className="font-medium text-slate-900 hover:underline underline-offset-2 text-left">
                                            {t.nom_projet || `Projet #${t.id}`}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 capitalize">{t.nom_terrain || <span className="text-slate-300">—</span>}</td>
                                    <td className="px-4 py-3 text-slate-600 tabular-nums">{t.numero_TF || <span className="text-slate-300">—</span>}</td>
                                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                                        {t.created_at ? parseDate(t.created_at).toLocaleDateString('fr-FR') : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <button onClick={() => handleOpenDetails(t)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Détails">
                                                <FileText size={16} />
                                            </button>
                                            <button onClick={() => navigate(`/terrain-map/${t.id}`)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Voir la carte interactive">
                                                <MapIcon size={16} />
                                            </button>
                                            <button onClick={() => navigate(`/edit-terrain/${t.id}`)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteTerrain(t.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400">Aucun projet enregistré.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {
                isDetailsModalOpen && selectedTerrain && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-950/50 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden duration-200 ring-1 ring-slate-900/5 animate-dialog-in">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-lg">
                                        {selectedTerrain.nom_projet || `Projet #${selectedTerrain.id}`}
                                    </h3>
                                    {selectedTerrain.nom_terrain && <p className="text-sm text-slate-500 font-medium mb-1">Projet d'origine: {selectedTerrain.nom_terrain}</p>}
                                    <p className="text-xs font-medium text-slate-400">
                                        {selectedTerrain.numero_TF ? `TITRE FONCIER: ${selectedTerrain.numero_TF} • ` : ''}DÉTAILS COMPLETS DU DOSSIER FONCIER
                                    </p>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                                {/* Key Stats */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                        <p className="text-xs font-medium text-blue-400 mb-1">Dossier TF</p>
                                        <p className="text-lg font-semibold text-blue-700">{selectedTerrain.numero_TF || '-'}</p>
                                    </div>
                                </div>

                                {selectedTerrain.description && (
                                    <div className="mt-4">
                                        <label className="text-xs font-medium block mb-3 text-slate-600">Observations / Description</label>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-sm text-slate-600 leading-relaxed">{selectedTerrain.description}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100">
                                    {/* Media Management - Photos */}
                                    <div className="bg-white border text-left border-slate-200 shadow-sm p-4 rounded-xl">
                                        <MediaManager
                                            modelType="Terrain"
                                            modelId={selectedTerrain.id}
                                            category="photo"
                                            title="Galerie Bien"
                                        />
                                    </div>

                                    {/* Media Management - Documents */}
                                    <div className="bg-white border text-left border-slate-200 shadow-sm p-4 rounded-xl">
                                        <MediaManager
                                            modelType="Terrain"
                                            modelId={selectedTerrain.id}
                                            category="document"
                                            title="Plan de travail"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsDetailsModalOpen(false);
                                        navigate(`/edit-terrain/${selectedTerrain.id}`);
                                    }}
                                    className="flex-grow py-2 text-white rounded-lg font-medium text-sm transition-colors bg-slate-900 hover:bg-slate-800"
                                >
                                    Modifier ces informations
                                </button>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors">
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Terrains;
