import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Download, ArrowUpRight, ArrowDownRight,
    History, Loader2, MapPin, Receipt, Construction, Building2,
    Eye, X, Info, CreditCard, Calendar, Briefcase, FileSpreadsheet, File as FileIcon, ChevronDown
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { toast } from 'react-hot-toast';
import { parseDate } from '../lib/utils';
import { exportToExcel } from '../lib/excel';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface Transaction {
    id: string;
    date: string;
    amount: number;
    flow: 'IN' | 'OUT';
    is_cash: boolean;
    category: string;
    entity: string;
    bank: string;
    reference: string;
    method: string;
    project: string;
    notes: string;
    source_bank?: string;
    virement_type?: string;
}

const Transactions: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [terrains, setTerrains] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [filterMode, setFilterMode] = useState<'ALL' | 'CASH' | 'ENGAGEMENT'>('ALL');
    const [filterProject, setFilterProject] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const headerRef = React.useRef<HTMLDivElement>(null);
    const [stickyOffset, setStickyOffset] = React.useState(0);

    React.useEffect(() => {
        const updateOffset = () => {
            if (headerRef.current) {
                // Buffer for the sticky top-4 (1rem = 16px approx)
                setStickyOffset(headerRef.current.offsetHeight + 16);
            }
        };

        updateOffset();
        window.addEventListener('resize', updateOffset);
        const observer = new ResizeObserver(updateOffset);
        if (headerRef.current) observer.observe(headerRef.current);

        return () => {
            window.removeEventListener('resize', updateOffset);
            observer.disconnect();
        };
    }, []);


    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [txData, terrainData] = await Promise.all([
                    apiFetch('/transactions'),
                    apiFetch('/terrains')
                ]);
                setTransactions(Array.isArray(txData) ? txData : []);
                setTerrains(Array.isArray(terrainData) ? terrainData : []);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
                toast.error("Erreur lors de la récupération des données");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const categories = useMemo(() => {
        const cats = new Set(transactions.map(tx => tx.category));
        return Array.from(cats);
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch =
                tx.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.bank?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tx as any).source_bank?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === 'ALL' || tx.flow === filterType;
            const matchesMode = filterMode === 'ALL' ||
                (filterMode === 'CASH' && tx.is_cash) ||
                (filterMode === 'ENGAGEMENT' && !tx.is_cash);

            const matchesProject = filterProject === 'ALL' || tx.project === filterProject;
            const matchesCategory = filterCategory === 'ALL' || tx.category === filterCategory;

            const matchesDate = (!dateRange.start || tx.date >= dateRange.start) &&
                (!dateRange.end || tx.date <= dateRange.end);

            return matchesSearch && matchesType && matchesMode && matchesProject && matchesCategory && matchesDate;
        });
    }, [transactions, searchTerm, filterType, filterMode, filterProject, filterCategory, dateRange]);

    const stats = useMemo(() => {
        const cashTransactions = filteredTransactions.filter(tx => tx.is_cash);
        const income = cashTransactions.filter(tx => tx.flow === 'IN').reduce((acc, tx) => acc + tx.amount, 0);
        const expense = cashTransactions.filter(tx => tx.flow === 'OUT').reduce((acc, tx) => acc + tx.amount, 0);

        const commitments = filteredTransactions.filter(tx => !tx.is_cash && tx.flow === 'OUT').reduce((acc, tx) => acc + tx.amount, 0);

        return { income, expense, balance: income - expense, commitments };
    }, [filteredTransactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
    };

    const handleExportExcel = () => {
        try {
            const exportData = filteredTransactions.map(tx => ({
                'Date': tx.date,
                'ID': tx.id,
                'Flux': tx.flow === 'IN' ? 'Entrée' : 'Sortie',
                'Mode': tx.is_cash ? 'CASH' : 'ENGAGEMENT',
                'Entité': tx.entity,
                'Projet': tx.project,
                'Catégorie': tx.category,
                'Banque/Source': tx.bank,
                'Référence': tx.reference,
                'Méthode': tx.method,
                'Montant': tx.amount,
                'Notes': tx.notes
            }));

            exportToExcel(exportData, `Livre_Caisse_${new Date().toISOString().split('T')[0]}`, true);
            toast.success('Excel généré avec succès !');
            setShowExportMenu(false);
        } catch (error) {
            toast.error('Erreur lors de l\'export Excel');
        }
    };

    const handleExportWord = async () => {
        try {
            setIsExporting(true);
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: "Livre de Caisse 360° - Rapport Financier",
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: `Généré le: ${new Date().toLocaleDateString('fr-MA')}`, italics: true }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({ text: "", spacing: { after: 200 } }),

                        // Summary Table
                        new Paragraph({ text: "Résumé de la situation", heading: HeadingLevel.HEADING_2 }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Recettes", bold: true })] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Dépenses", bold: true })] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Engagements", bold: true })] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Direction Trésorerie", bold: true })] })] }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph(formatCurrency(stats.income))] }),
                                        new TableCell({ children: [new Paragraph(formatCurrency(stats.expense))] }),
                                        new TableCell({ children: [new Paragraph(formatCurrency(stats.commitments))] }),
                                        new TableCell({ children: [new Paragraph(formatCurrency(stats.balance))] }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: "", spacing: { after: 400 } }),

                        // Main Transactions Table
                        new Paragraph({ text: "Détails des opérations", heading: HeadingLevel.HEADING_2 }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    tableHeader: true,
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })], shading: { fill: "f1f5f9" } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Entité", bold: true })] })], shading: { fill: "f1f5f9" } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catégorie", bold: true })] })], shading: { fill: "f1f5f9" } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mode", bold: true })] })], shading: { fill: "f1f5f9" } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Montant", bold: true })] })], shading: { fill: "f1f5f9" } }),
                                    ],
                                }),
                                ...filteredTransactions.map(tx => new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph(tx.date)] }),
                                        new TableCell({ children: [new Paragraph(tx.entity)] }),
                                        new TableCell({ children: [new Paragraph(tx.category)] }),
                                        new TableCell({ children: [new Paragraph(tx.is_cash ? 'CASH' : 'ENGAG')] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(tx.amount), color: tx.flow === 'IN' ? '059669' : '000000' })] })] }),
                                    ],
                                })),
                            ],
                        }),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Rapport_Financier_${new Date().toISOString().split('T')[0]}.docx`);
            toast.success('Document Word généré !');
            setShowExportMenu(false);
        } catch (error) {
            console.error("Word export error", error);
            toast.error('Erreur lors de l\'export Word');
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-amber-500" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <History className="text-amber-500" size={32} />
                        Livre de Caisse 360°
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Gérez vos flux de trésorerie avec précision</p>
                </div>
                <div className="flex items-center gap-2 relative">
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                        >
                            <Download size={18} className="text-amber-500" />
                            Exporter
                            <ChevronDown size={14} className={`transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-emerald-50 text-slate-700 transition-colors border-b border-slate-50"
                                >
                                    <FileSpreadsheet size={18} className="text-emerald-600" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black">Format Excel</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Tableau de données</span>
                                    </div>
                                </button>
                                <button
                                    onClick={handleExportWord}
                                    disabled={isExporting}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 text-slate-700 transition-colors disabled:opacity-50"
                                >
                                    <FileIcon size={18} className="text-blue-600" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black">{isExporting ? 'Génération...' : 'Format Word'}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Rapport Officiel</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-lg">
                        <span className="text-[10px] font-black text-white/50 uppercase block text-center tracking-tighter">Budget Cash</span>
                        <span className="text-sm font-black text-white">{formatCurrency(stats.balance)}</span>
                    </div>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[80px] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Entrées</p>
                        <h2 className="text-xl font-black text-slate-800">{formatCurrency(stats.income)}</h2>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-bl-[80px] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sorties</p>
                        <h2 className="text-xl font-black text-slate-800">{formatCurrency(stats.expense)}</h2>
                    </div>
                </div>

                <div className="bg-amber-50 p-5 rounded-[24px] border border-amber-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/50 rounded-bl-[80px] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Engagements (Non Payés)</p>
                        <h2 className="text-xl font-black text-amber-700">{formatCurrency(stats.commitments)}</h2>
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-[24px] shadow-xl relative overflow-hidden group border border-slate-800">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-[80px] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative text-white">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Situation Net (Cash)</p>
                        <h2 className="text-xl font-black">{formatCurrency(stats.balance)}</h2>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div
                ref={headerRef}
                className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl p-4 rounded-[24px] border border-white shadow-xl shadow-gray-200/50 flex flex-wrap items-center gap-3 mx-1"
            >
                <div className="relative flex-grow min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher entité, banque, référence..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilterType('ALL')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterType === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >TOUT</button>
                    <button
                        onClick={() => setFilterType('IN')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterType === 'IN' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}
                    >RECETTES</button>
                    <button
                        onClick={() => setFilterType('OUT')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterType === 'OUT' ? 'bg-rose-500 text-white' : 'text-slate-500'}`}
                    >DÉPENSES</button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilterMode('ALL')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterMode === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >TOUT MODE</button>
                    <button
                        onClick={() => setFilterMode('CASH')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterMode === 'CASH' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                    >CASH</button>
                    <button
                        onClick={() => setFilterMode('ENGAGEMENT')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterMode === 'ENGAGEMENT' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                    >ENGAGEM.</button>
                </div>

                <select
                    className="bg-slate-100 border-none rounded-xl text-[10px] font-black px-4 py-2 outline-none"
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                >
                    <option value="ALL">Tous Projets</option>
                    {terrains.map(t => (
                        <option key={t.id} value={t.nom_projet}>{t.nom_projet}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-100 border-none rounded-xl text-[10px] font-black px-4 py-2 outline-none"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                >
                    <option value="ALL">Toutes Catégories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <div className="flex items-center gap-1">
                    <input
                        type="date"
                        className="bg-slate-100 border-none rounded-xl text-[9px] font-black px-2 py-2 text-slate-600"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                    <input
                        type="date"
                        className="bg-slate-100 border-none rounded-xl text-[9px] font-black px-2 py-2 text-slate-600"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead
                            className="sticky z-20 bg-white border-b border-slate-100 shadow-sm"
                            style={{ top: `${stickyOffset}px` }}
                        >
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Flux / Mode</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entité / Projet</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Montant</th>
                                <th className="px-6 py-4 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold italic">
                                        {isLoading ? 'Chargement...' : 'Aucune donnée trouvée.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${tx.flow === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {tx.flow === 'IN' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                </div>
                                                {tx.is_cash ? (
                                                    <div className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black">CASH</div>
                                                ) : (
                                                    <div className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[9px] font-black tracking-tight">ENGAGEM.</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-800">{parseDate(tx.date).toLocaleDateString('fr-MA')}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{tx.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{tx.entity}</span>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium italic">
                                                    <MapPin size={10} />
                                                    {tx.project}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    {tx.category === 'Achat (Matériaux)' && <Receipt size={12} className="text-amber-500" />}
                                                    {tx.category.includes('Mission') && <Construction size={12} className="text-amber-500" />}
                                                    {tx.category.includes('Personnel') && <Briefcase size={12} className="text-blue-500" />}
                                                    <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">{tx.category}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">{tx.notes}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-black ${tx.flow === 'IN' ? 'text-emerald-600' : (tx.is_cash ? 'text-slate-900' : 'text-amber-600')}`}>
                                                {formatCurrency(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedTx(tx)}
                                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-amber-600 transition-all"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className={`p-6 text-white flex justify-between items-start ${selectedTx.flow === 'IN' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">{selectedTx.flow === 'IN' ? 'Encaissement' : 'Décaissement'}</h3>
                                <p className="text-white/70 text-sm font-bold uppercase tracking-widest mt-1">{selectedTx.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Total</p>
                                    <p className={`text-3xl font-black ${selectedTx.flow === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {formatCurrency(selectedTx.amount)}
                                    </p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                                    <p className="text-lg font-black text-slate-800 flex items-center justify-end gap-2">
                                        <Calendar size={18} className="text-slate-400" />
                                        {parseDate(selectedTx.date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Info size={12} /> Entité
                                    </p>
                                    <p className="text-sm font-black text-slate-800">{selectedTx.entity}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={12} /> Projet
                                    </p>
                                    <p className="text-sm font-black text-slate-800">{selectedTx.project}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <CreditCard size={12} /> Mode
                                    </p>
                                    <p className="text-sm font-black text-slate-800">{selectedTx.method}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <History size={12} /> Référence
                                    </p>
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">{selectedTx.reference || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <div className="p-3 bg-amber-500 rounded-xl text-white">
                                        <Building2 size={24} />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Compte de Destination (Notre Banque)</p>
                                        <p className="text-sm font-black text-slate-800">{selectedTx.bank || 'Caisse Centrale - Espèces'}</p>
                                    </div>
                                </div>

                                {(selectedTx as any).source_bank && (
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                        <div className="p-3 bg-blue-500 rounded-xl text-white">
                                            <Briefcase size={24} />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Banque du Client (Source)</p>
                                            <p className="text-sm font-black text-slate-800">{(selectedTx as any).source_bank}</p>
                                            {(selectedTx as any).virement_type && (
                                                <p className="text-[10px] text-blue-400 font-bold uppercase mt-1">{(selectedTx as any).virement_type}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes & Observations</p>
                                    <div className="p-4 bg-slate-50 rounded-2xl text-sm font-medium text-slate-600 italic border-l-4 border-slate-300">
                                        "{selectedTx.notes || 'Aucune observation enregistrée.'}"
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;
