import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2, Trash2, Command, Search, Maximize2, Minimize2 } from 'lucide-react';
import { getChatResponse } from '../lib/gemini';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    role: 'user' | 'model';
    parts: string;
}

const AIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', parts: 'Bonjour ! Je suis votre assistant financier intelligent. Posez-moi une question sur vos projets ou votre comptabilité.' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [companyContext, setCompanyContext] = useState<string>('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, isFullScreen]);

    // Keyboard shortcut (CMD/CTRL + K) to focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                inputRef.current?.focus();
                setIsExpanded(true);
            }
            if (e.key === 'Escape') {
                if (isFullScreen) setIsFullScreen(false);
                else setIsExpanded(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    // Load context from dashboard stats
    useEffect(() => {
        const loadContext = async () => {
            try {
                const stats = await apiFetch<any>('/stats');
                const context = `
                    Société: Amical EL OUAHA
                    CA Total: ${stats.chiffre_affaires} MAD
                    Encaissé: ${stats.encaissements} MAD
                    Reste: ${stats.reste_a_recouvrer} MAD
                    Unités: ${stats.biens_status?.['Libre'] || 0} Libres, ${stats.reservations} Réservés
                    Charges: ${stats.charges} MAD
                `;
                setCompanyContext(context);
            } catch (err) {
                console.error("Failed to load context for AI", err);
            }
        };
        loadContext();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', parts: userMessage }]);
        setIsLoading(true);
        setIsExpanded(true);

        try {
            const historyForAI = messages.filter((m, idx) => idx > 0 || m.role === 'user');
            const response = await getChatResponse(userMessage, historyForAI, companyContext);
            setMessages(prev => [...prev, { role: 'model', parts: response }]);
        } catch (error: any) {
            toast.error(error.message || "Erreur de connexion avec l'IA.");
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'model', parts: 'Conversation réinitialisée. Comment puis-je vous aider ?' }]);
    };

    if (!isOpen) {
        return (
            <div className="absolute top-4 right-4 z-[100] animate-in fade-in zoom-in duration-300">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-10 h-10 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-xl shadow-lg flex items-center justify-center text-blue-600 hover:scale-110 active:scale-95 transition-all group"
                    title="Ouvrir l'Assistant IA (Ctrl+K)"
                >
                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                </button>
            </div>
        );
    }

    return (
        <div className="sticky top-0 z-[90] w-full px-4 pt-4 pb-2 animate-in slide-in-from-top-4 duration-500">
            <div className={`relative mx-auto transition-all duration-500 ease-in-out ${isFullScreen ? 'max-w-7xl' : 'max-w-5xl'} ${isExpanded ? 'mb-48' : 'mb-0'}`}>
                {/* Navbar Shell */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[24px] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center h-14 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] px-4 gap-4">

                        <div className="flex items-center gap-2 px-2 border-r border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Sparkles size={16} className="text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="flex-grow flex items-center gap-3">
                            <Search size={18} className="text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onFocus={() => setIsExpanded(true)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Posez une question technique ou financière..."
                                className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200/50">
                                <Command size={10} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">K</span>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center transition-all hover:bg-black active:scale-95 disabled:bg-slate-100 disabled:text-slate-300"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>

                            <button
                                onClick={() => {
                                    setIsExpanded(false);
                                    setIsFullScreen(false);
                                    setIsOpen(false);
                                }}
                                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                title="Masquer l'assistant"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expanded Conversation Overlay */}
                {isExpanded && (
                    <div className={`absolute top-full left-0 right-0 mt-4 bg-white/90 backdrop-blur-3xl border border-white/50 rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 z-50 transition-all ${isFullScreen ? 'h-[75vh]' : 'h-[400px]'}`}>
                        <div className="flex flex-col h-full">
                            {/* History Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intelligence Artificielle</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button onClick={clearChat} className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-rose-500 transition-colors flex items-center gap-1.5">
                                        <Trash2 size={12} /> Réinitialiser
                                    </button>
                                    <div className="w-px h-4 bg-slate-100"></div>
                                    <button
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        className="text-slate-400 hover:text-slate-900 transition-colors"
                                        title={isFullScreen ? "Réduire" : "Plein écran"}
                                    >
                                        {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-5 py-4 rounded-[24px] text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-slate-900 text-white rounded-tr-none'
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none markdown-content'
                                            }`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.parts}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="px-5 py-4 bg-white/50 backdrop-blur-md rounded-[24px] rounded-tl-none border border-slate-100/50 flex items-center gap-3">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Analyse en cours...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIAssistant;
