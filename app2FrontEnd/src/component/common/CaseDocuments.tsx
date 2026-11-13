// CaseDocuments.tsx — the documents of a legal case (affaire juridique).
// A case can hold any number of documents, each with a written title
// (jugement, convocation, PV d'huissier…). Stored through the generic /media API.
//
//   <CaseDocuments caseId={c.id} />                         existing case: saved immediately
//   <CaseDocuments pending={docs} onPendingChange={setDocs} />  new case: uploaded once the case is created

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Paperclip } from 'lucide-react';
import { apiFetch, STORAGE_BASE } from '../../lib/api';
import { openExternal } from '../../lib/tauri';
import { parseDate } from '../../lib/utils';
import { confirmDialog } from './ConfirmDialog';

export interface PendingCaseDoc { title: string; file: File }
interface CaseDoc { id: number; file_name: string; file_path: string; caption: string | null; created_at: string }

const MAX_MB = 50;
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || name;

export async function uploadCaseDocument(caseId: number | string, doc: PendingCaseDoc) {
    const fd = new FormData();
    fd.append('file', doc.file);
    fd.append('model_type', 'Contentieux');
    fd.append('model_id', String(caseId));
    fd.append('category', 'document');
    fd.append('caption', doc.title.slice(0, 120));
    await apiFetch('/media', { method: 'POST', body: fd });
}

export default function CaseDocuments({ caseId, pending, onPendingChange }: {
    caseId?: number | string;
    pending?: PendingCaseDoc[];
    onPendingChange?: (docs: PendingCaseDoc[]) => void;
}) {
    const qc = useQueryClient();
    const fileRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);
    const saved = !!caseId;

    const q = useQuery({
        queryKey: ['case-docs', String(caseId)],
        queryFn: async () => (await apiFetch<(CaseDoc & { category: string })[]>(`/media?model_type=Contentieux&model_id=${caseId}`)).filter(m => m.category === 'document'),
        enabled: saved,
    });
    const refresh = () => qc.invalidateQueries({ queryKey: ['case-docs', String(caseId)] });

    const add = async (files: FileList | null) => {
        const list = Array.from(files ?? []);
        if (fileRef.current) fileRef.current.value = '';
        if (list.length === 0) return;
        const tooBig = list.find(f => f.size > MAX_MB * 1024 * 1024);
        if (tooBig) { toast.error(`« ${tooBig.name} » dépasse ${MAX_MB} Mo`); return; }
        // the written title applies when one file is chosen; several files take their file names
        const docs = list.map(file => ({ file, title: (list.length === 1 && title.trim()) || titleFromFile(file.name) }));
        setTitle('');
        if (!saved) { onPendingChange?.([...(pending ?? []), ...docs]); return; }
        setBusy(true);
        try {
            for (const d of docs) await uploadCaseDocument(caseId!, d);
            toast.success(docs.length > 1 ? `${docs.length} documents ajoutés` : 'Document ajouté');
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de l'ajout du document");
        } finally { setBusy(false); refresh(); }
    };

    const remove = async (d: CaseDoc) => {
        if (!await confirmDialog(`Supprimer le document « ${d.caption || d.file_name} » ?`)) return;
        try { await apiFetch(`/media/${d.id}`, { method: 'DELETE' }); toast.success('Document supprimé'); }
        catch (e: any) { toast.error(e.message || 'Suppression impossible'); }
        refresh();
    };

    const rows: { key: string; title: string; sub: string; open?: () => void; remove: () => void }[] = saved
        ? (q.data ?? []).map(d => ({
            key: String(d.id), title: d.caption || titleFromFile(d.file_name),
            sub: `${d.file_name} · ${parseDate(d.created_at).toLocaleDateString('fr-FR')}`,
            open: () => openExternal(encodeURI(`${STORAGE_BASE}/${d.file_path}`)),
            remove: () => remove(d),
        }))
        : (pending ?? []).map((d, i) => ({
            key: `p-${i}`, title: d.title, sub: `${d.file.name} · sera enregistré avec le dossier`,
            remove: () => onPendingChange?.((pending ?? []).filter((_, j) => j !== i)),
        }));

    return (
        <div className="space-y-2">
            {saved && q.isLoading ? (
                <div className="h-[52px] rounded-lg border border-slate-200 bg-slate-50" aria-busy="true" />
            ) : rows.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Aucun document pour ce dossier.</p>
            ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                    {rows.map(r => (
                        <li key={r.key} className="flex items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                                <p className="text-xs text-slate-400 truncate">{r.sub}</p>
                            </div>
                            {r.open && <button type="button" onClick={r.open} className="text-xs font-medium text-slate-500 hover:text-slate-900">Ouvrir</button>}
                            <button type="button" onClick={r.remove} className="text-xs font-medium text-slate-500 hover:text-slate-900">Supprimer</button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fileRef.current?.click(); } }}
                    placeholder="Titre du document (ex. Jugement, Convocation…)"
                    className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />} Ajouter un fichier
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => add(e.target.files)} />
            </div>
        </div>
    );
}
