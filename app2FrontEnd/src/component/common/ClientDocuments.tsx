// ClientDocuments.tsx — one place to generate a client's sale documents.
//   openClientDocuments(clientId)
// <ClientDocumentsHost /> is mounted once in App.tsx.

import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, FileSignature, FileText, BadgeCheck, ScrollText, Download, Loader2 } from 'lucide-react';
import { downloadSaleDocument, downloadStatement, fetchStatement, type SaleDocKind } from '../../lib/lazyDocs';
import { formatNumber } from '../../lib/utils';

let current: number | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const openClientDocuments = (clientId: number) => { current = clientId; emit(); };
const close = () => { current = null; emit(); };

export function ClientDocumentsHost() {
    const id = useSyncExternalStore(subscribe, () => current);
    if (!id) return null;
    return <Docs key={id} clientId={id} />;
}

const DOCS: { kind: SaleDocKind | 'releve'; title: string; desc: string; icon: typeof FileText; needsBien?: boolean }[] = [
    { kind: 'reservation', title: 'Contrat de réservation', desc: 'Réservation du bien, prix, avance versée et échéancier.', icon: FileSignature, needsBien: true },
    { kind: 'compromis', title: 'Compromis de vente', desc: 'Engagement de vente : désignation, titre foncier, prix, modalités.', icon: ScrollText, needsBien: true },
    { kind: 'attestation', title: 'Attestation de paiement', desc: 'Total versé à ce jour, avec le détail des versements.', icon: BadgeCheck },
    { kind: 'releve', title: 'Relevé de compte', desc: 'Situation complète : paiements et échéancier.', icon: FileText },
];

function Docs({ clientId }: { clientId: number }) {
    const { data, isLoading } = useQuery({ queryKey: ['statement', clientId], queryFn: () => fetchStatement(clientId) });
    const [busy, setBusy] = useState<string | null>(null);
    const hasBien = (data?.client.biens?.length ?? 0) > 0;
    const b = data?.client.biens?.[0];

    const run = async (kind: SaleDocKind | 'releve') => {
        setBusy(kind);
        try {
            if (kind === 'releve') await downloadStatement(clientId); else await downloadSaleDocument(kind, clientId);
            toast.success('Document téléchargé');
        } catch (e: any) { toast.error(e.message || 'Erreur lors de la génération'); } finally { setBusy(null); }
    };

    return (
        <div className="fixed inset-0 z-[870] flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-dialog-in">
                <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">Documents de vente</h3>
                        {isLoading ? <div className="mt-1 h-3 w-40 rounded bg-slate-100 animate-pulse" /> : (
                            <p className="text-sm text-slate-500 truncate">
                                <span className="capitalize">{data?.client.prenom} {data?.client.nom}</span>
                                {b && ` · ${b.type_bien ?? ''} ${b.num_appartement || b.nom || ''}`}
                                {data && ` · versé ${formatNumber(data.totals.paid)} / ${formatNumber(data.totals.prix)} DH`}
                            </p>
                        )}
                    </div>
                    <button onClick={close} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="Fermer"><X size={16} /></button>
                </div>
                <ul className="p-3">
                    {DOCS.map(d => {
                        const disabled = isLoading || (d.needsBien && !hasBien);
                        return (
                            <li key={d.kind}>
                                <button disabled={disabled || busy !== null} onClick={() => run(d.kind)}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors group">
                                    <d.icon size={18} className="text-slate-400 flex-shrink-0" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-slate-900">{d.title}</span>
                                        <span className="block text-xs text-slate-500">{d.needsBien && !hasBien && !isLoading ? 'Nécessite un bien réservé pour ce client.' : d.desc}</span>
                                    </span>
                                    {busy === d.kind ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <Download size={16} className="text-slate-300 group-hover:text-slate-700" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <p className="px-5 pb-4 text-xs text-slate-400">Modèles générés à partir du dossier client. Faites valider le texte par votre notaire avant la première utilisation.</p>
            </div>
        </div>
    );
}
