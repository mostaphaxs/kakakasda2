import React, { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Image as ImageIcon,
    Upload,
    Trash2,
    Plus,
    Loader2,
    Download,
    X,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { openExternal } from '../../lib/tauri';
import { apiFetch, STORAGE_BASE } from '../../lib/api';


interface Media {
    id: number;
    file_path: string;
    file_name: string;
    file_type: string;
    category: 'photo' | 'document';
}

interface MediaManagerProps {
    modelType: string;
    modelId: number | string;
    category: 'photo' | 'document';
    title: string;
}

// Simple counter for unique IDs (avoids useId colon chars issue in Tauri)
let _idCounter = 0;
const genId = () => `mm-input-${++_idCounter}`;

const MediaManager: React.FC<MediaManagerProps> = ({ modelType, modelId, category, title }) => {
    const [media, setMedia] = useState<Media[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // Stable unique id per component instance
    const inputId = useRef(genId()).current;

    const hasModel = Boolean(modelId);

    const getFullUrl = (path: string) =>
        `${STORAGE_BASE}/${path.replace(/^\/+/, '')}`;

    const fetchMedia = async () => {
        if (!hasModel) return;
        setLoading(true);
        try {
            const data = await apiFetch<Media[]>(
                `/media?model_type=${modelType}&model_id=${modelId}`
            );
            setMedia(data.filter(m => m.category === category));
        } catch (e) {
            console.error('Media fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelId, category]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasModel) return;
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const file = files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_type', modelType);
        formData.append('model_id', String(modelId));
        formData.append('category', category);

        try {
            await apiFetch('/media', { method: 'POST', body: formData });
            toast.success('Fichier ajouté !');
            await fetchMedia();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error?.message || "Erreur lors de l'upload");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Supprimer ce fichier ?')) return;
        try {
            await apiFetch(`/media/${id}`, { method: 'DELETE' });
            toast.success('Fichier supprimé');
            setMedia(prev => prev.filter(m => m.id !== id));
        } catch {
            toast.error('Erreur suppression');
        }
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon size={20} />;
        return <FileText size={20} />;
    };

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {category === 'photo'
                        ? <ImageIcon size={14} className="text-blue-500" />
                        : <FileText size={14} className="text-amber-500" />}
                    {title}
                </h3>

                {/* The hidden file input — NEVER disabled so label always works */}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    className="sr-only"
                    accept={category === 'photo' ? 'image/*' : '*/*'}
                    onChange={handleUpload}
                />

                {/* Label triggers the file picker; we guard inside onChange */}
                {hasModel ? (
                    <label
                        htmlFor={inputId}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer select-none"
                        title="Ajouter un fichier"
                    >
                        {uploading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Plus size={16} />}
                    </label>
                ) : (
                    <span
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-300 cursor-not-allowed select-none"
                        title="Enregistrez d'abord pour activer l'upload"
                    >
                        <Plus size={16} />
                    </span>
                )}
            </div>

            {/* No model yet */}
            {!hasModel && (
                <div className="p-6 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center gap-2">
                    <AlertCircle size={18} className="text-slate-300" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">
                        {category === 'photo'
                            ? 'Enregistrez d\'abord pour ajouter des photos'
                            : 'Enregistrez d\'abord pour ajouter des documents'}
                    </p>
                </div>
            )}

            {/* File list */}
            {hasModel && (
                <div className="grid grid-cols-1 gap-2">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="animate-spin text-slate-300" size={20} />
                        </div>
                    ) : media.length === 0 ? (
                        <div className="p-6 border border-dashed border-slate-200 rounded-xl flex flex-col items-center gap-1 text-center bg-slate-50/50">
                            <Upload size={18} className="text-slate-300" />
                            <p className="text-[9px] font-bold uppercase text-slate-400">Aucun fichier</p>
                        </div>
                    ) : (
                        media.map(m => (
                            <div
                                key={m.id}
                                className="group flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
                            >
                                {category === 'photo' ? (
                                    <div
                                        className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 cursor-zoom-in shrink-0"
                                        onClick={() => openExternal(getFullUrl(m.file_path))}
                                    >
                                        <img
                                            src={getFullUrl(m.file_path)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="w-12 h-12 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer transition-colors"
                                        onClick={() => openExternal(getFullUrl(m.file_path))}
                                        title="Ouvrir le document"
                                    >
                                        {getFileIcon(m.file_type)}
                                    </div>
                                )}


                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 truncate uppercase">{m.file_name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        {m.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => openExternal(getFullUrl(m.file_path))}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Voir / Télécharger"
                                    >
                                        <Download size={14} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(m.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MediaManager;
