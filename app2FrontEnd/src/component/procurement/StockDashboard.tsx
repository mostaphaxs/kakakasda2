import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Package, AlertTriangle, ArrowRight } from 'lucide-react';

interface StockItem {
    id: number;
    article: {
        name: string;
        code: string;
        category: string;
        unit: string;
    };
    initial_stock: number;
    consumed_qty: number;
    remaining_stock: number;
    destination?: {
        num_appartement: string;
        type_bien: string;
        nom?: string;
    };
}

const StockDashboard: React.FC = () => {
    const [stocks, setStocks] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        try {
            const data = await apiFetch<StockItem[]>('/stock');
            setStocks(data);
        } catch (error) {
            console.error('Error fetching stock:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Chargement du stock...</div>;

    const lowStockItems = stocks.filter(item => item.remaining_stock < 10);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="sticky top-4 z-30 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 mx-1">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                            <Package className="text-blue-600 h-8 w-8" />
                            Inventaire & Stock
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Suivez l'état de vos stocks et affectations en temps réel.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.hash = '#/add-stock-exit'}
                            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg transition font-medium shadow-sm text-sm bg-slate-900 hover:bg-slate-800"
                        >
                            <ArrowRight size={18} />
                            Nouvelle Sortie
                        </button>
                    </div>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-semibold text-amber-800">
                                Alertes de Stock Faible ({lowStockItems.length})
                            </h3>
                            <div className="mt-2 text-sm text-amber-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {lowStockItems.map(item => (
                                        <li key={item.id}>
                                            {item.article.name} ({item.article.code}) - {item.remaining_stock} {item.article.unit} restants
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div className="hidden">
                        <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Articles</p>
                        <p className="text-2xl font-bold text-slate-900">{stocks.length}</p>
                    </div>
                </div>
                {/* Add more stats as needed */}
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white border-b border-slate-200">
                        <tr>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Article</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Catégorie</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Initial</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Consommé</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Restant</th>
                            <th className="text-left whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-500">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {stocks.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-900">{item.article.name}</span>
                                        <span className="text-xs text-slate-400 font-mono">{item.article.code}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                        {item.article.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                    {item.initial_stock} <span className="text-xs text-slate-400 ml-0.5">{item.article.unit}</span>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                    {item.consumed_qty} <span className="text-xs text-slate-400 ml-0.5">{item.article.unit}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-sm font-semibold ${item.remaining_stock < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {item.remaining_stock} <span className="text-xs ml-0.5">{item.article.unit}</span>
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {item.remaining_stock < 10 ? (
                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                                            Action requise
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                            Correct
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockDashboard;
