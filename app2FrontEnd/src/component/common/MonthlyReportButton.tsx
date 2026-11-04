// "Rapport mensuel" button with a month picker → downloads the owner's PDF report.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FileBarChart, Loader2 } from 'lucide-react';
import { downloadMonthlyReport } from '../../lib/documents';

const thisMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function generateMonthlyReport(month = thisMonth()) {
    return toast.promise(downloadMonthlyReport(month), {
        loading: 'Préparation du rapport…',
        success: 'Rapport mensuel téléchargé',
        error: (e: Error) => e.message || 'Erreur lors du rapport',
    });
}

export default function MonthlyReportButton() {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(thisMonth());
    const [busy, setBusy] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const run = async () => {
        setBusy(true);
        try { await generateMonthlyReport(month); setOpen(false); } catch { /* toast shown */ } finally { setBusy(false); }
    };

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <FileBarChart size={15} /> Rapport mensuel
            </button>
            {open && (
                <div className="absolute right-0 mt-2 z-40 w-64 p-4 bg-white rounded-xl shadow-lg ring-1 ring-slate-900/10 animate-dialog-in">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Mois du rapport</label>
                    <input type="month" value={month} max={thisMonth()} onChange={e => setMonth(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                    <p className="mt-2 text-xs text-slate-500">Encaissements, dépenses, retards, chèques et avancement des projets, sur 1 à 2 pages.</p>
                    <button onClick={run} disabled={busy || !month} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                        {busy && <Loader2 size={14} className="animate-spin" />} Télécharger le PDF
                    </button>
                </div>
            )}
        </div>
    );
}
