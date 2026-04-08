// src/component/Terrains.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Loader2, Trash2, X, Search, Download, FileText, Edit2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { formatNumber } from '../lib/utils';

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
    created_at: string;
}

const Terrains = () => {
    const navigate = useNavigate();
    const [terrains, setTerrains] = useState<Terrain[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
        if (!window.confirm('Supprimer ce projet ?')) return;
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
            'PRIX ACHAT (DH)': t.cout_global || 0,
            'FRAIS ENREG. (DH)': t.frais_enregistrement || 0,
            'FRAIS IMMAT. (DH)': t.frais_immatriculation || 0,
            'FRAIS NOTAIRE (DH)': t.honoraires_notaire || 0,
            'TOTAL INVESTI (DH)': t.total || 0,
            'DATE ACQUISITION': t.created_at ? new Date(t.created_at).toLocaleDateString('fr-MA') : 'N/A',
            'F. CONSTRUCTION (DH)': t.autorisation_construction || 0,
            "F. d'equipement (DH)": t.autorisation_equipement || 0, // Changed from autorisation_lotissement
            'F. POMPIER (DH)': t.frais_pompier || 0
        }));

        exportToExcel(dataToExport, `terrains_export_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}`, true);
        toast.success("Liste des projets exportée avec succès");
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[32px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <MapPin className="text-blue-600" size={32} />
                            Gestion des Projets
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">Acquisitions foncières et dossiers techniques de <span className="text-slate-800 font-bold">Société les cinq elements</span>.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-200 transition-all font-black text-xs uppercase tracking-widest border border-slate-200 active:scale-[0.98]"
                            title="Exporter la liste actuelle"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>

                        <button
                            onClick={() => navigate('/add-terrain')}
                            className="flex items-center gap-2 bg-amber-600 text-white px-8 py-3.5 rounded-2xl hover:bg-amber-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/20 active:scale-[0.98]"
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
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-tight text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>

                    <button
                        onClick={resetFilters}
                        className="w-full text-slate-400 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-100 rounded-2xl py-3 hover:bg-slate-50"
                    >
                        <X size={14} />
                        Réinitialiser
                    </button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg border border-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Désignation</th>
                            <th className="px-6 py-4 whitespace-nowrap">Coût Acquisition</th>
                            <th className="px-6 py-4 text-center whitespace-nowrap">Autorisations</th>
                            <th className="px-6 py-4 rounded-tr-xl text-right whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-20 text-center text-gray-400">
                                    <Loader2 className="animate-spin inline-block mb-2" size={32} />
                                    <p className="italic">Chargement des projets...</p>
                                </td>
                            </tr>
                        ) : filteredTerrains.length > 0 ? (
                            filteredTerrains.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{t.nom_projet || `Projet #${t.id}`}</span>
                                            {t.nom_terrain && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Origine: {t.nom_terrain}</p>}
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                {t.numero_TF ? `TF: ${t.numero_TF} ` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-800">{formatNumber(t.total)} DH</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            {t.autorisation_construction > 0 ? (
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md border border-emerald-100">CONST: {formatNumber(t.autorisation_construction)} DH</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-md border border-gray-100">CONST: 0 DH</span>
                                            )}
                                            {t.autorisation_equipement > 0 ? (
                                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-md border border-blue-100">EQUIP: {formatNumber(t.autorisation_equipement)} DH</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-md border border-gray-100">EQUIP: 0 DH</span>
                                            )}
                                            {t.frais_pompier > 0 ? (
                                                <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-md border border-red-100">POMPIER: {formatNumber(t.frais_pompier)} DH</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-md border border-gray-100">POMPIER: 0 DH</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenDetails(t)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Détails">
                                                <FileText size={16} />
                                            </button>
                                            <button onClick={() => navigate(`/edit-terrain/${t.id}`)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Modifier">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteTerrain(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-20 text-center text-gray-400 italic">Aucun projet enregistré.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {
                isDetailsModalOpen && selectedTerrain && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="font-black text-gray-800 text-lg uppercase tracking-widest">
                                        {selectedTerrain.nom_projet || `Projet #${selectedTerrain.id}`}
                                    </h3>
                                    {selectedTerrain.nom_terrain && <p className="text-sm text-gray-500 font-medium mb-1">Projet d'origine: {selectedTerrain.nom_terrain}</p>}
                                    <p className="text-[10px] font-bold text-gray-400">
                                        {selectedTerrain.numero_TF ? `TITRE FONCIER: ${selectedTerrain.numero_TF} • ` : ''}DÉTAILS COMPLETS DU DOSSIER FONCIER
                                    </p>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                                {/* Key Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Coût d'Achat</p>
                                        <p className="text-lg font-black text-indigo-700">{formatNumber(selectedTerrain.cout_global)} DH</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Total TTC</p>
                                        <p className="text-lg font-black text-emerald-700">{formatNumber(selectedTerrain.total)} DH</p>
                                    </div>
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Dossier TF</p>
                                        <p className="text-lg font-black text-blue-700">{selectedTerrain.numero_TF || '-'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 tracking-widest">Répartition des Frais</label>
                                            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Enregistrement:</span>
                                                    <span className="font-bold text-gray-800">{formatNumber(selectedTerrain.frais_enregistrement)} DH</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Immatriculation:</span>
                                                    <span className="font-bold text-gray-800">{formatNumber(selectedTerrain.frais_immatriculation)} DH</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Notaire:</span>
                                                    <span className="font-bold text-gray-800">{formatNumber(selectedTerrain.honoraires_notaire)} DH</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 tracking-widest">Autorisations Légales</label>
                                            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Construction:</span>
                                                    <span className="font-bold">{formatNumber(selectedTerrain.autorisation_construction || 0)} DH</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Équipement:</span>
                                                    <span className="font-bold">{formatNumber(selectedTerrain.autorisation_equipement || 0)} DH</span>

                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Pompier:</span>
                                                    <span className="font-bold">{formatNumber(selectedTerrain.frais_pompier || 0)} DH</span>

                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Intermédiaire:</span>
                                                    <span className="font-bold">{formatNumber(selectedTerrain.frais_autorisation_intermediaire || 0)} DH</span>

                                                </div>
                                            </div>


                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsDetailsModalOpen(false);
                                        navigate(`/edit-terrain/${selectedTerrain.id}`);
                                    }}
                                    className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                >
                                    Modifier ces informations
                                </button>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors">
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
