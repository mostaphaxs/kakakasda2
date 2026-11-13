// ProgressPhotos.tsx — construction progress photos per unit, sent to the buyer.
//   openProgressPhotos(bien)
// WhatsApp links can only carry text, so "Envoyer au client" copies the photo to
// the clipboard and opens the usual reminder flow (number → language → message);
// the user pastes the photo (Ctrl+V) in the WhatsApp chat.

import { useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Upload, Loader2, Send, Trash2, ImageOff } from 'lucide-react';
import { apiFetch, STORAGE_BASE } from '../../lib/api';
import { openExternal } from '../../lib/tauri';
import { confirmDialog } from './ConfirmDialog';
import { openWhatsAppReminder } from './WhatsAppReminder';
import { getAppSettings } from '../../lib/appSettings';

export interface ProgressBien {
    id: number; type_bien?: string; num_appartement?: string | null; nom?: string | null;
    gros_oeuvre_pourcentage?: number; finition_pourcentage?: number;
    terrain?: { nom_projet?: string; nom_terrain?: string } | null;
    clients?: { id: number; nom: string; prenom: string; tel?: string | null; tel_2?: string | null }[];
}
interface Media { id: number; file_path: string; file_name: string; category: string; caption?: string | null; created_at: string }

let current: ProgressBien | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const openProgressPhotos = (b: ProgressBien) => { current = b; emit(); };
const close = () => { current = null; emit(); };

export function ProgressPhotosHost() {
    const b = useSyncExternalStore(subscribe, () => current);
    if (!b) return null;
    return <Photos key={b.id} bien={b} />;
}

const STAGES = ['Terrassement / fondations', 'Gros œuvre', 'Maçonnerie', 'Plomberie / électricité', 'Enduits', 'Carrelage', 'Menuiserie', 'Peinture', 'Finition', 'Extérieurs', 'Autre'];
const urlOf = (p: string) => `${STORAGE_BASE}/${p.replace(/^\/+/, '')}`;
const unit = (b: ProgressBien) => `${b.type_bien ?? 'Bien'} ${b.num_appartement || b.nom || ''}`.trim();

/** Copy an image to the clipboard as PNG (what WhatsApp accepts on paste). */
async function copyImage(url: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await img.decode();
    const max = 1600; // keep the paste light
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('conversion'))), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

function Photos({ bien }: { bien: ProgressBien }) {
    const qc = useQueryClient();
    const [stage, setStage] = useState(STAGES[1]);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const owner = bien.clients?.[0];
    const projet = bien.terrain?.nom_projet || bien.terrain?.nom_terrain || '';

    const { data: photos = [], isLoading } = useQuery({
        queryKey: ['progress-photos', bien.id],
        queryFn: async () => (await apiFetch<Media[]>(`/media?model_type=Bien&model_id=${bien.id}`)).filter(m => m.category === 'avancement'),
    });

    const upload = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);
        try {
            for (const f of Array.from(files)) {
                if (!f.type.startsWith('image/')) { toast.error(`${f.name} n'est pas une image`); continue; }
                const fd = new FormData();
                fd.append('file', f);
                fd.append('model_type', 'Bien');
                fd.append('model_id', String(bien.id));
                fd.append('category', 'avancement');
                fd.append('caption', stage);
                await apiFetch('/media', { method: 'POST', body: fd });
            }
            toast.success(files.length > 1 ? `${files.length} photos ajoutées` : 'Photo ajoutée');
            qc.invalidateQueries({ queryKey: ['progress-photos', bien.id] });
        } catch (e: any) { toast.error(e.message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
    };

    const remove = async (m: Media) => {
        if (!await confirmDialog('Supprimer cette photo ?')) return;
        try { await apiFetch(`/media/${m.id}`, { method: 'DELETE' }); qc.invalidateQueries({ queryKey: ['progress-photos', bien.id] }); toast.success('Photo supprimée'); }
        catch (e: any) { toast.error(e.message); }
    };

    const send = async (m?: Media) => {
        if (!owner) return toast.error('Aucun client associé à ce bien');
        if (m) {
            try { await copyImage(urlOf(m.file_path)); toast.success('Photo copiée : collez-la dans WhatsApp avec Ctrl+V', { duration: 6000 }); }
            catch { toast.error("Impossible de copier la photo automatiquement : joignez-la à la main dans WhatsApp", { duration: 6000 }); }
        }
        const go = bien.gros_oeuvre_pourcentage ?? 0;
        const fin = bien.finition_pourcentage ?? 0;
        const when = m ? new Date(m.created_at.replace(' ', 'T')).toLocaleDateString('fr-FR') : '';
        const fr = [
            `Bonjour ${owner.prenom} ${owner.nom},`,
            '',
            `Voici l'avancement des travaux de votre *${unit(bien)}*${projet ? ` (projet ${projet})` : ''} :`,
            `- Gros œuvre : *${go}%*`,
            `- Finition : *${fin}%*`,
            ...(m ? ['', `Photo : ${m.caption || 'chantier'}${when ? ` (${when})` : ''}.`] : []),
            '',
            'Nous restons à votre disposition pour toute question.',
            getAppSettings().company.name || 'Amical El Ouaha',
        ].join('\n');
        const ar = [
            `مرحباً ${owner.prenom} ${owner.nom}،`,
            '',
            `إليكم تقدم أشغال *${unit(bien)}*${projet ? ` (مشروع ${projet})` : ''}:`,
            `- الأشغال الكبرى: *${go}%*`,
            `- التشطيب: *${fin}%*`,
            ...(m ? ['', `الصورة: ${m.caption || 'الورش'}${when ? ` (${when})` : ''}.`] : []),
            '',
            'نحن رهن إشارتكم لأي استفسار.',
            'شركة الخمسة عناصر',
        ].join('\n');
        openWhatsAppReminder({ client: owner, messages: { fr, ar } });
    };

    return (
        <div className="fixed inset-0 z-[860] flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-dialog-in">
                <div className="flex items-start gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">Photos d'avancement · {unit(bien)}</h3>
                        <p className="text-sm text-slate-500 truncate">
                            {projet && `${projet} · `}Gros œuvre {bien.gros_oeuvre_pourcentage ?? 0}% · Finition {bien.finition_pourcentage ?? 0}%
                            {owner && <> · <span className="capitalize">{owner.prenom} {owner.nom}</span></>}
                        </p>
                    </div>
                    <button onClick={close} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="Fermer"><X size={16} /></button>
                </div>

                <div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Étape</label>
                        <select value={stage} onChange={e => setStage(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                            {STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => upload(e.target.files)} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Ajouter des photos
                    </button>
                    {owner && (
                        <button onClick={() => send(photos[0])} disabled={!photos.length} className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <Send size={15} /> Envoyer la dernière au client
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading && <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-[4/3] rounded-lg bg-slate-100 animate-pulse" />)}</div>}
                    {!isLoading && photos.length === 0 && (
                        <div className="py-12 text-center">
                            <ImageOff size={22} className="mx-auto text-slate-300" />
                            <p className="mt-2 text-sm text-slate-500">Aucune photo d'avancement pour ce bien.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {photos.map(m => (
                            <figure key={m.id} className="group">
                                <button onClick={() => openExternal(encodeURI(urlOf(m.file_path)))} className="block w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200" title="Agrandir">
                                    <img src={urlOf(m.file_path)} alt={m.caption ?? ''} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                </button>
                                <figcaption className="mt-2 flex items-start gap-2">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm text-slate-900 truncate">{m.caption || 'Photo'}</span>
                                        <span className="block text-xs text-slate-500">{m.created_at?.slice(0, 10)}</span>
                                    </span>
                                    {owner && <button onClick={() => send(m)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="Envoyer au client"><Send size={15} /></button>}
                                    <button onClick={() => remove(m)} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={15} /></button>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
