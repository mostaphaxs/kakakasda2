import React, { useEffect, useState } from 'react';
import { FileText, Search, Loader2, Eye, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';
import { confirmDialog } from './common/ConfirmDialog';
import { usePersistedState, useUrlSearch } from '../lib/usePersistedState';

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
    const [searchTerm, setSearchTerm] = usePersistedState('FacturesList.searchTerm', '');
    useUrlSearch(setSearchTerm);
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
        if (!await confirmDialog("Êtes-vous sûr de vouloir supprimer cette facture ?")) return;
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
            <div className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mx-1">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <FileText className="text-blue-600" /> Historique des Factures
                </h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/factures')}
                        className="text-white px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 shadow-sm bg-slate-900 hover:bg-slate-800"
                    >
                        <PlusCircle size={18} /> Nouveau Facture
                    </button>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="">
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">N° Facture</th>
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Date</th>
                                <th className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Émetteur / Objet</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Montant HT</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">TVA</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Montant TTC</th>
                                <th className="text-right whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={32} />
                                        <p className="font-semibold text-sm">Chargement des données...</p>
                                    </td>
                                </tr>
                            ) : filteredFactures.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        <FileText className="mx-auto mb-2 text-slate-300" size={48} />
                                        <p className="text-lg font-semibold">Aucune facture trouvée.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredFactures.map((facture) => (
                                    <tr key={facture.id} className="hover:bg-slate-50 transition-colors text-sm">
                                        <td className="px-4 py-3 font-semibold text-blue-600">{facture.invoice_no}</td>
                                        <td className="px-4 py-3 font-medium text-slate-600">{facture.date}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{facture.supplier_name || facture.client_name || '...'}</span>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{facture.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-600 text-right">{Number(facture.total_ht).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                        <td className="px-4 py-3 font-medium text-slate-600 text-right">{Number(facture.total_tva).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                        <td className="px-4 py-3 font-semibold text-slate-800 text-right">{Number(facture.total_ttc).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <button onClick={() => navigate('/factures', { state: { facture, mode: 'view' } })} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Visualiser"><Eye size={16} /></button>
                                                <button onClick={() => navigate('/factures', { state: { facture, mode: 'edit' } })} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-slate-900 hover:bg-slate-100" title="Modifier"><Edit size={16} /></button>
                                                <button onClick={() => deleteFacture(facture.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={16} /></button>
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
