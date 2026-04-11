import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { registerPreviewHandler } from '../lib/tauri';

const GlobalPreview = () => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        // Register this component as the global handler for all document preview requests
        registerPreviewHandler((url) => {
            setPreviewUrl(url);
        });

        return () => registerPreviewHandler(() => { });
    }, []);

    if (!previewUrl) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800">Aperçu du Document</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                // Close modal then open external as requested
                                setPreviewUrl(null);
                                // Set timeout to avoid the interceptor loop
                                setTimeout(() => {
                                    window.open(previewUrl, '_blank');
                                }, 100);
                            }}
                            className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                            Ouvrir externe
                        </button>
                        <button
                            onClick={() => setPreviewUrl(null)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 overflow-auto p-4 flex items-center justify-center">
                    {previewUrl.toLowerCase().endsWith('.pdf') ? (
                        <embed src={previewUrl} type="application/pdf" className="w-full h-full rounded-lg" />
                    ) : (
                        <img
                            src={previewUrl}
                            alt="Aperçu"
                            className="max-w-full max-h-full object-contain shadow-sm rounded-lg"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/600x400?text=Format+non+supporté';
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalPreview;
