import { useState, useRef, useEffect } from 'react';
import {
    Send, X, Paperclip, CheckCircle2,
    Maximize2, Minimize2, Trash2, FileText, Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { NovaAgent, type UiTool, type WriteAction } from '../lib/novaAgent';
import { openQuickPayment } from './common/QuickPayment';
import { openClientDocuments } from './common/ClientDocuments';
import { openWhatsAppReminder } from './common/WhatsAppReminder';
import { openTaskEditor } from './common/TaskEditor';
import { downloadMonthlyReport, downloadReceipt, downloadSaleDocument, downloadStatement } from '../lib/lazyDocs';
import novaFace from '../assets/nova-face.png';

interface ConfirmCard { action: WriteAction; state: 'pending' | 'yes' | 'all' | 'no' }

interface Message {
    id: number;
    role: 'user' | 'model';
    parts: string;
    isAction?: boolean;
    choices?: string[];
    confirm?: ConfirmCard;
}

let nextId = 1;
const msg = (m: Omit<Message, 'id'>): Message => ({ id: nextId++, ...m });
const WELCOME = "Bonjour ! Je suis **Nova**. Je peux consulter, créer, modifier ou encaisser n'importe quoi dans la gestion — dites-moi simplement ce qu'il faut faire.";
const SUGGESTIONS = [
    'Qui est en retard de paiement ?',
    'Encaisser un paiement',
    'Biens libres dans quel projet ?',
    'Bilan du mois',
];

const AIAssistant = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([msg({ role: 'model', parts: WELCOME })]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [chatFile, setChatFile] = useState<File | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const agentRef = useRef(new NovaAgent());
    const resolvers = useRef(new Map<number, (v: 'yes' | 'all' | 'no') => void>());

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, progress]);

    // Speech Synthesis
    const speak = (text: string) => {
        if (!isVoiceActive) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`>|]/g, ''));
        utterance.lang = 'fr-FR';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    };

    // Speech Recognition Initialization
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'fr-FR';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                toast.success("Voix captée !");
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech Recognition Error", event.error);
                setIsListening(false);

                // Specific error feedback
                if (event.error === 'not-allowed') {
                    toast.error("Microphone bloqué. Veuillez l'autoriser dans la barre d'adresse.");
                } else if (event.error === 'no-speech') {
                    toast.error("Aucune voix détectée. Réessayez !");
                } else if (event.error === 'audio-capture') {
                    toast.error("Problème de capture audio (micro occupé ?)");
                } else if (event.error === 'network') {
                    toast.error("Problème réseau : La voix nécessite une connexion internet stable.");
                } else if (event.error !== 'aborted') {
                    toast.error(`Erreur vocale : ${event.error}`);
                }
            };

            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (!recognitionRef.current) {
                toast.error("Reconnaissance vocale non supportée.");
                return;
            }
            try {
                setIsListening(true);
                recognitionRef.current.start();
                toast("Je vous écoute...");
            } catch (e) {
                setIsListening(false);
            }
        }
    };

    // ── confirmation cards ────────────────────────────────────────────────────
    const askConfirm = (action: WriteAction) => new Promise<'yes' | 'all' | 'no'>(resolve => {
        const m = msg({ role: 'model', parts: '', confirm: { action, state: 'pending' } });
        resolvers.current.set(m.id, resolve);
        setMessages(prev => [...prev, m]);
    });
    const answerConfirm = (id: number, v: 'yes' | 'all' | 'no') => {
        setMessages(prev => prev.map(m => (m.id === id && m.confirm ? { ...m, confirm: { ...m.confirm, state: v } } : m)));
        resolvers.current.get(id)?.(v);
        resolvers.current.delete(id);
    };

    // ── UI tools (pages, windows, PDFs) ───────────────────────────────────────
    const runUi = async (t: UiTool): Promise<string> => {
        const fetchClient = (id: number) => apiFetch<any>(`/clients/${id}`);
        switch (t.tool) {
            case 'navigate':
                navigate(t.args.path.startsWith('/') ? t.args.path : '/' + t.args.path);
                return 'Page ouverte.';
            case 'open_quick_payment':
                openQuickPayment({ clientId: t.args.client_id });
                return "Fenêtre d'encaissement ouverte.";
            case 'open_client_documents':
                openClientDocuments(t.args.client_id);
                return 'Fenêtre des documents ouverte.';
            case 'download_document': {
                const { kind, client_id, payment_id } = t.args;
                if (kind === 'releve') await downloadStatement(client_id);
                else if (kind === 'recu') {
                    if (!payment_id) return 'ERREUR : payment_id requis pour un reçu.';
                    await downloadReceipt(client_id, payment_id);
                } else await downloadSaleDocument(kind, client_id);
                return 'PDF téléchargé.';
            }
            case 'monthly_report':
                await downloadMonthlyReport(t.args.month || new Date().toISOString().slice(0, 7));
                return 'Rapport téléchargé.';
            case 'whatsapp_reminder': {
                const c = await fetchClient(t.args.client_id);
                openWhatsAppReminder({ client: c, messages: { fr: t.args.message_fr, ar: t.args.message_ar || t.args.message_fr } });
                return c.tel || c.tel_2 ? "Fenêtre WhatsApp ouverte (l'utilisateur choisit le numéro et envoie)." : "ERREUR : le client n'a pas de numéro.";
            }
            case 'open_task_editor':
                openTaskEditor({ clientId: t.args.client_id, title: t.args.title });
                return 'Formulaire de tâche ouvert.';
            default:
                return 'ERREUR : outil inconnu.';
        }
    };

    const send = async (text: string) => {
        if ((!text.trim() && !chatFile) || isLoading) return;
        const userMessage = text.trim();
        const currentFile = chatFile;
        setMessages(prev => [...prev, msg({ role: 'user', parts: userMessage || `📎 ${currentFile?.name}` })]);
        setInput('');
        setChatFile(null);
        setIsLoading(true);
        setProgress('');
        try {
            const r = await agentRef.current.send(userMessage, currentFile, { confirm: askConfirm, runUi, progress: setProgress });
            setMessages(prev => [...prev, msg({ role: 'model', parts: r.message, isAction: r.actions > 0, choices: r.choices })]);
            if (r.actions > 0) toast.success(r.actions > 1 ? `${r.actions} actions effectuées` : 'Action effectuée');
            speak(r.message);
        } catch (error: any) {
            const m = String(error?.message || '');
            setMessages(prev => [...prev, msg({ role: 'model', parts: m.includes('IA non configurée') ? m : `Désolé, je rencontre une difficulté technique.${m ? `\n\n_${m.slice(0, 200)}_` : ''}` })]);
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };
    const handleSend = () => send(input);

    const resetChat = () => {
        resolvers.current.forEach(r => r('no'));
        resolvers.current.clear();
        agentRef.current.reset();
        setMessages([msg({ role: 'model', parts: WELCOME })]);
    };

    return (
        <>
            {/* Standard Trigger Bubble (Bottom-Right) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[1000] w-16 h-16 chat-bubble-trigger text-white shadow-lg active:scale-[0.98] transition"
                >
                    <img src={novaFace} className="w-12 h-12 rounded-full object-cover" alt="Nova" />
                </button>
            )}

            {/* Standard Chat Window */}
            {isOpen && (
                <div className={`fixed right-6 bottom-6 z-[1000] chat-window-pro animate-slide-up transition ${isFullScreen ? 'w-[90vw] h-[90vh]' : 'w-[380px] h-[600px]'}`}>

                    {/* Professional Header */}
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={novaFace} className="w-10 h-10 rounded-full border-2 border-white/20" alt="Nova" />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm tracking-tight">Nova Assistant</span>
                                <span className="text-xs text-white/70">En ligne pour vous aider</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsVoiceActive(!isVoiceActive)} className={`p-2 rounded-lg transition-colors ${isVoiceActive ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}>
                                {isVoiceActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                            <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-rose-500 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-grow overflow-y-auto px-6 py-6 space-y-6 scroll-pro bg-slate-50/30">
                        {messages.map((m) => m.confirm ? (
                            <ConfirmBubble key={m.id} card={m.confirm} onAnswer={v => answerConfirm(m.id, v)} />
                        ) : (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-xl text-[12.3px] leading-relaxed shadow-sm ${m.role === 'user'
                                    ? 'bg-slate-900 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none markdown-pro'
                                    }`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.parts}</ReactMarkdown>

                                    {m.isAction && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600">
                                            <CheckCircle2 size={14} /> Action effectuée
                                        </div>
                                    )}

                                    {m.choices && m.choices.length > 0 && m.id === messages[messages.length - 1]?.id && !isLoading && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {m.choices.map((c, ci) => (
                                                <button key={ci} onClick={() => send(c)}
                                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors">
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {messages.length === 1 && !isLoading && (
                            <div className="flex flex-wrap gap-1.5">
                                {SUGGESTIONS.map(sg => (
                                    <button key={sg} onClick={() => send(sg)}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-600 transition-colors">
                                        {sg}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="px-4 py-2 bg-white border border-slate-200 rounded-full flex gap-1 items-center">
                                    <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    {progress && <span className="ml-2 text-xs text-slate-500">{progress}</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Input - Refactored for better spacing */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        {chatFile && (
                            <div className="mb-3 flex items-center justify-between text-xs text-slate-500 px-3 bg-slate-100/50 py-2 rounded-xl border border-slate-200">
                                <span className="truncate max-w-[250px] flex items-center gap-2 font-medium">
                                    <FileText size={14} className="text-brand-500" /> {chatFile.name}
                                </span>
                                <button onClick={() => setChatFile(null)} className="p-1 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-rose-500">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <div className="flex-grow flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20/20 border border-transparent focus-within:border-blue-200 transition min-h-[48px]">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded-lg transition ${chatFile ? 'text-slate-900 bg-slate-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/50'}`}
                                    title="Joindre un fichier"
                                >
                                    <Paperclip size={20} />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file" className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setChatFile(f); toast.success("Fichier prêt"); } }}
                                />
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                                    placeholder="Message ou commande vocale..."
                                    className="flex-grow pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                                <button
                                    onClick={toggleListening}
                                    className={`p-2 rounded-lg transition ${isListening ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/50'}`}
                                    title="Commande vocale"
                                >
                                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={(!input.trim() && !chatFile) || isLoading}
                                className="flex items-center justify-center w-12 h-10 text-white rounded-lg shadow-sm disabled:bg-slate-200 disabled:shadow-none transition active:scale-[0.98] disabled:text-slate-400 text-sm font-medium bg-slate-900 hover:bg-slate-800"
                            >
                                <Send size={20} />
                            </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between px-2">
                            <button onClick={resetChat} title="Nouvelle conversation" className="text-slate-300 hover:text-rose-400 transition-colors">
                                <Trash2 size={12} />
                            </button>
                            <span className="text-xs text-slate-300 font-medium">
                                Modifications sur confirmation
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ── confirmation card ─────────────────────────────────────────────────────────
const METHOD_LABEL: Record<WriteAction['method'], string> = { POST: 'Création', PUT: 'Modification', DELETE: 'Suppression' };
const FIELD_HIDE = (k: string) => k === '_method' || k === 'id' || k.endsWith('_id') || k.endsWith('_type');
const FIELD_LABEL: Record<string, string> = {
    amount: 'Montant', payment_date: 'Date', type: 'Type', method: 'Méthode', reference_no: 'Référence', bank_name: 'Banque',
    bank_commission: 'Commission', notes: 'Notes', nom: 'Nom', prenom: 'Prénom', cin: 'CIN', tel: 'Téléphone', tel_2: 'Téléphone 2',
    email: 'Email', adresse: 'Adresse', title: 'Titre', due_date: 'Échéance', priority: 'Priorité', status: 'Statut', statut: 'Statut',
    total: 'Total', count: "Nombre d'échéances", start_date: 'Début', interval_months: 'Intervalle (mois)', label: 'Libellé',
    refund_amount: 'Remboursement', date_reservation: 'Date de réservation', avec_finition: 'Avec finition', reason: 'Motif',
    nom_projet: 'Projet', type_bien: 'Type de bien', surface_m2: 'Surface (m²)', name: 'Nom', speciality: 'Spécialité', periode: 'Période',
    contact_name: 'Contact', contact_phone: 'Tél. contact', done: 'Terminée', nom_societe: 'Société', invoice_date: 'Date facture',
};

function ConfirmBubble({ card, onAnswer }: { card: ConfirmCard; onAnswer: (v: 'yes' | 'all' | 'no') => void }) {
    const { action, state } = card;
    const danger = action.method === 'DELETE' || /cancel|annul/i.test(action.path);
    const fields = Object.entries(action.body ?? {}).filter(([k, v]) => !FIELD_HIDE(k) && v !== null && v !== '' && v !== undefined);
    const show = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) && v.length < 10) ? Number(v).toLocaleString('fr-FR') : typeof v === 'number' ? v.toLocaleString('fr-FR') : typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : typeof v === 'object' ? JSON.stringify(v) : String(v));
    return (
        <div className="flex justify-start">
            <div className={`w-[90%] rounded-xl border bg-white shadow-sm overflow-hidden ${danger ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className={`px-4 py-2 text-xs font-medium ${danger ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
                    {METHOD_LABEL[action.method] ?? action.method} · à confirmer
                </div>
                <div className="px-4 py-3">
                    <p className="text-[12.3px] font-medium text-slate-900 leading-snug">{action.summary}</p>
                    {fields.length > 0 && (
                        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                            {fields.slice(0, 12).map(([k, v]) => (
                                <div key={k} className="contents">
                                    <dt className="text-slate-400">{FIELD_LABEL[k] ?? k.replace(/_/g, ' ')}</dt>
                                    <dd className="text-slate-700 truncate">{show(v)}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    {action.attach_file && <p className="mt-2 text-xs text-slate-500">📎 Le document joint sera enregistré.</p>}
                </div>
                <div className="px-4 pb-3">
                    {state === 'pending' ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => onAnswer('yes')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                Confirmer
                            </button>
                            <button onClick={() => onAnswer('no')} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100">Annuler</button>
                            {!danger && (
                                <button onClick={() => onAnswer('all')} className="ml-auto text-xs text-slate-400 hover:text-slate-700" title="Confirme aussi les étapes suivantes de cette demande">
                                    Tout confirmer
                                </button>
                            )}
                        </div>
                    ) : state === 'no' ? (
                        <span className="text-xs text-slate-400">Annulé</span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 size={13} /> Confirmé</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AIAssistant;
