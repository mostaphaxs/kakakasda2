import { useState, useEffect } from 'react';
import { X, FileText, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import { registerPreviewHandler } from '../lib/tauri';

const GlobalPreview = () => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isPdf, setIsPdf] = useState(false);

    useEffect(() => {
        // Register this component as the global handler for all document preview requests
        registerPreviewHandler((url) => {
            setPreviewUrl(url);
            setZoom(1); // Reset zoom on new document
            setIsPdf(url.split('?')[0].toLowerCase().endsWith('.pdf'));
        });

        return () => registerPreviewHandler(() => { });
    }, []);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setZoom(1);

    if (!previewUrl) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/95"
                onClick={() => setPreviewUrl(null)}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-6xl h-full flex flex-col bg-[#110905] rounded-xl border border-white/10 shadow-sm overflow-hidden duration-300">

                {/* Header Actions */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a0f0a]">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <FileText size={24} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Aperçu Document</h3>
                            <p className="text-xs text-white/40 font-medium mt-0.5">Amical El Ouaha</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isPdf && (
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 mr-4">
                                <button
                                    onClick={handleZoomOut}
                                    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={20} />
                                </button>
                                <div className="px-4 text-xs font-semibold text-amber-500 font-mono min-w-[70px] text-center bg-white/5 py-2 rounded-lg">
                                    {Math.round(zoom * 100)}%
                                </div>
                                <button
                                    onClick={handleZoomIn}
                                    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={20} />
                                </button>
                                <div className="w-[1px] h-5 bg-white/10 mx-1" />
                                <button
                                    onClick={handleResetZoom}
                                    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                                    title="Reset Zoom"
                                >
                                    <RefreshCcw size={20} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-3 bg-white/5 hover:bg-rose-600 text-white rounded-lg transition border border-white/10 group"
                            >
                                <X size={22} className="group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-[#0d0705] p-6 flex items-start justify-center custom-scrollbar">
                    {isPdf ? (
                        <iframe
                            src={`${previewUrl}?v=${Date.now()}`}
                            className="w-full h-full rounded-xl bg-white border-0 shadow-sm"
                            title="PDF Preview"
                        />
                    ) : (
                        <div
                            className="transition-transform duration-300 ease-out origin-top shadow-sm"
                            style={{
                                transform: `scale(${zoom})`,
                                paddingBottom: zoom > 1 ? '100px' : '0'
                            }}
                        >
                            <img
                                src={`${previewUrl}?v=${Date.now()}`}
                                alt="Document preview"
                                className="max-w-full h-auto rounded-xl shadow-sm"
                                onError={(e) => {
                                    console.error('[GlobalPreview] Image load failed for URL:', previewUrl);
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://placehold.co/600x400?text=Fichier+non+trouv%C3%A9';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalPreview;

