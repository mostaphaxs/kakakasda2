import React, { useEffect, useState } from 'react';
import { FileText, Search, Loader2, Eye, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface Facture {
    id: number;
    invoice_no: string;
    date: string;
    client_name: string;
    supplier_name?: string;
    client_address?: string;
    client_ice?: string;
    client_if?: string;
    client_rc?: string;
    description?: string;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
    items?: any[];
}

const FacturesList: React.FC = () => {
    const [factures, setFactures] = useState<Facture[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadFactures();
    }, []);

    const loadFactures = async () => {
        try {
            setIsLoading(true);
            const data = await apiFetch<Facture[]>('/factures');
            setFactures(data);
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors du chargement des factures');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteFacture = async (id: number) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) return;
        try {
            await apiFetch(`/factures/${id}`, { method: 'DELETE' });
            toast.success("Facture supprimée avec succès !");
            loadFactures();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la suppression");
        }
    };

    const filteredFactures = factures.filter(f =>
        f.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.client_name && f.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.supplier_name && f.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6">
            <div className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-white shadow-xl shadow-gray-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mx-1">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                    <FileText className="text-blue-600" /> Historique des Factures
                </h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/factures')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                        <PlusCircle size={18} /> Nouveau Facture
                    </button>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-black text-gray-500 uppercase tracking-widest">
                                <th className="px-6 py-4">N° Facture</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Émetteur / Objet</th>
                                <th className="px-6 py-4 text-right">Montant HT</th>
                                <th className="px-6 py-4 text-right">TVA</th>
                                <th className="px-6 py-4 text-right">Montant TTC</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={32} />
                                        <p className="font-bold text-sm">Chargement des données...</p>
                                    </td>
                                </tr>
                            ) : filteredFactures.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <FileText className="mx-auto mb-2 text-gray-300" size={48} />
                                        <p className="text-lg font-bold">Aucune facture trouvée.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredFactures.map((facture) => (
                                    <tr key={facture.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                                        <td className="px-6 py-4 font-bold text-blue-600">{facture.invoice_no}</td>
                                        <td className="px-6 py-4 font-medium text-gray-600">{facture.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800">{facture.supplier_name || facture.client_name || '...'}</span>
                                                <span className="text-[10px] text-gray-500 italic truncate max-w-[200px]">{facture.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-600 text-right">{Number(facture.total_ht).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                        <td className="px-6 py-4 font-medium text-gray-600 text-right">{Number(facture.total_tva).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                        <td className="px-6 py-4 font-black text-gray-800 text-right">{Number(facture.total_ttc).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => navigate('/factures', { state: { facture, mode: 'view' } })} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Visualiser"><Eye size={18} /></button>
                                                <button onClick={() => navigate('/factures', { state: { facture, mode: 'edit' } })} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Modifier"><Edit size={18} /></button>
                                                <button onClick={() => deleteFacture(facture.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Supprimer"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FacturesList;
