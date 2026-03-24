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
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Package className="text-indigo-600 h-8 w-8" />
                            Inventaire & Stock
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Suivez l'état de vos stocks et affectations en temps réel.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.hash = '#/add-stock-exit'}
                            className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl hover:bg-rose-700 transition font-black shadow-lg shadow-rose-100 text-xs uppercase tracking-widest"
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <Package className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Articles</p>
                        <p className="text-2xl font-bold text-gray-900">{stocks.length}</p>
                    </div>
                </div>
                {/* Add more stats as needed */}
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Article</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Initial</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Consommé</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restant</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {stocks.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-900">{item.article.name}</span>
                                        <span className="text-xs text-gray-400 font-mono uppercase">{item.article.code}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {item.article.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                    {item.initial_stock} <span className="text-xs text-gray-400 uppercase ml-0.5">{item.article.unit}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                    {item.consumed_qty} <span className="text-xs text-gray-400 uppercase ml-0.5">{item.article.unit}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-sm font-bold ${item.remaining_stock < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {item.remaining_stock} <span className="text-xs uppercase ml-0.5">{item.article.unit}</span>
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {item.remaining_stock < 10 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                                            Action requise
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
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
