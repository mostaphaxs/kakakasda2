import { useState, useRef, useEffect } from 'react';
import {
    Send, X, Paperclip, CheckCircle2,
    Sparkles, Maximize2, Minimize2, Trash2, FileText, Mic, MicOff, Volume2, VolumeX,
    Phone, PhoneOff, User, MoreVertical, Waves
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { executeAICommand } from '../lib/gemini';
import { apiFetch } from '../lib/api';
import novaFace from '../assets/nova-face.png';

interface Choice {
    label: string;
    action: string;
    action_data: any;
}

interface Message {
    role: 'user' | 'model';
    parts: string;
    isAction?: boolean;
    choices?: Choice[];
}

const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isNovaSpeaking, setIsNovaSpeaking] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', parts: "Bonjour ! Je suis **Nova**. Comment puis-je vous aider aujourd'hui ?" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [chatFile, setChatFile] = useState<File | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const [volume, setVolume] = useState(0);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Speech Synthesis
    const speak = async (text: string, onEnd?: () => void) => {
        console.log("Nova: Appel de speak() - flags:", { isVoiceActive, isCallActive, hasText: !!text });
        if (!isVoiceActive && !isCallActive) {
            console.log("Nova: speak() interrompu car les voix sont désactivées.");
            onEnd?.();
            return;
        }

        // --- ROBUST HIGH QUALITY FALLBACK VIA BACKEND PROXY ---
        try {
            setIsNovaSpeaking(true);
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const ttsUrl = `${apiUrl}/proxy-tts?text=${encodeURIComponent(text)}`;

            console.log("Nova: Téléchargement de la voix via le serveur local...");
            const response = await fetch(ttsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Erreur de proxy TTS");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (!audioElementRef.current) {
                audioElementRef.current = new Audio();
            }

            const audio = audioElementRef.current;
            audio.src = url;

            console.log("Nova: Démarrage de la lecture audio locale...");

            audio.onended = () => {
                URL.revokeObjectURL(url);
                setIsNovaSpeaking(false);
                if (onEnd) onEnd();
                else if (isCallActive) toggleListening();
            };

            audio.onerror = () => {
                URL.revokeObjectURL(url);
                console.error("Nova: Échec du flux audio secondaire, essai du système TTS...");
                systemSpeak(text, onEnd);
            };

            await audio.play();
        } catch (err) {
            console.warn("Nova: Fallback audio bloqué ou échoué, essai du système...", err);
            systemSpeak(text, onEnd);
        }
    };

    const systemSpeak = (text: string, onEnd?: () => void) => {
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const frVoice = voices.find(v => v.lang.startsWith('fr')) || voices.find(v => v.lang.includes('FR'));
            if (frVoice) utterance.voice = frVoice;
            utterance.lang = 'fr-FR';
            utterance.onstart = () => setIsNovaSpeaking(true);
            utterance.onend = () => {
                setIsNovaSpeaking(false);
                if (onEnd) onEnd();
                else if (isCallActive) toggleListening();
            };
            utterance.onerror = () => { setIsNovaSpeaking(false); onEnd?.(); };
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("Nova: System TTS also failed", err);
            setIsNovaSpeaking(false);
            onEnd?.();
        }
    };

    const primeTTS = () => {
        console.log("Nova: Amorçage du moteur vocal (Priming)...");
        const utterance = new SpeechSynthesisUtterance("");
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

                if (isCallActive) {
                    // Auto-send in call mode after a short delay
                    setTimeout(() => {
                        handleSend(transcript);
                    }, 500);
                }
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

            if (window.speechSynthesis) {
                console.log("Nomda: Initialisation des voix...");
                const loadVoices = () => {
                    const voices = window.speechSynthesis.getVoices();
                    console.log("Nomda: Voix disponibles:", voices.length, voices.filter(v => v.lang.includes('fr')).map(v => v.name));
                };
                loadVoices();
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
            recognitionRef.current.onend = () => setIsListening(false);
        }

        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const toggleListening = () => {
        // Use MediaRecorder by default as it's more robust (works on Brave/Linux/etc)
        // and uses Gemini's multimodal capabilities.
        const useNativeRecorder = true;

        if (isListening) {
            if (useNativeRecorder) {
                stopRecording();
            } else {
                recognitionRef.current?.stop();
            }
        } else {
            if (useNativeRecorder) {
                startRecording();
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
        }
    };

    const startRecording = async () => {
        console.log("Nomda: Tentative de démarrage du microphone...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup VAD & Volume Monitoring
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let silenceStart: number | null = null;
            const SILENCE_THRESHOLD = 15; // Adjustment based on noise
            const SILENCE_DURATION = 1500; // 1.5 seconds

            const checkVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((p, c) => p + c, 0) / bufferLength;
                setVolume(average);

                if (average < SILENCE_THRESHOLD) {
                    if (!silenceStart) silenceStart = Date.now();
                    else if (Date.now() - silenceStart > SILENCE_DURATION) {
                        console.log("Nova: Silence détecté, arrêt automatique.");
                        stopRecording();
                        return;
                    }
                } else {
                    silenceStart = null;
                }
                animationFrameRef.current = requestAnimationFrame(checkVolume);
            };
            animationFrameRef.current = requestAnimationFrame(checkVolume);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                if (audioContextRef.current) audioContextRef.current.close();

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log("Nova: Enregistrement terminé. Taille:", audioBlob.size);
                if (audioBlob.size > 1000) {
                    handleSend(audioBlob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsListening(true);
            toast("Je vous écoute...");
        } catch (err) {
            console.error("Nova Error: Échec du microphone", err);
            toast.error("Microphone inaccessible.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const handleSend = async (overrideInput?: string | Blob) => {
        const isAudio = overrideInput instanceof Blob;
        const userMessage = isAudio ? "" : (overrideInput || input).trim();

        if (!userMessage && !chatFile && !isAudio) return;

        const currentFile = chatFile;
        setMessages(prev => [...prev, {
            role: 'user',
            parts: isAudio ? "🎤 Commande vocale envoyée" : (userMessage || "Document envoyé")
        }]);
        setInput('');
        setIsLoading(true);

        try {
            const isCall = isCallActive;
            const context = `Assistante Nova - Service Client Pro. Amical El Ouaha. 
            ${isCall ? "IMPORTANT: Tu es au TÉLÉPHONE. Réponds de manière TRES CONCISE et directe, comme une conversation réelle. Pas de listes longues, pas de textes trop longs." : ""}`;
            console.log("Nova: Envoi de la requête à l'IA...", isAudio ? "Format Audio" : "Format Texte");
            const response = await executeAICommand(isAudio ? overrideInput : userMessage, currentFile, context);
            console.log("Nova: Réponse reçue de l'IA:", response.type);
            console.log("Nova message text:", response.message);

            if (response.type === 'ACTION' && response.action) {
                let alertMsg = "Action réussie";
                try {
                    const d = response.action_data || {};
                    if (response.action === 'CREATE_CHARGE') {
                        const fd = new FormData();
                        const catMapping: Record<string, string> = { 'loyer': 'loyer_bureau', 'gasoil': 'gasoil', 'fournitures': 'fournitures_bureau', 'employes': 'employes_bureau', 'impots': 'impots', 'essence': 'gasoil' };
                        const cat = (d.category || 'gasoil').toLowerCase();
                        const targetKey = catMapping[cat] || 'gasoil';
                        const amount = String(d.amount || 0);
                        ['loyer_bureau', 'gasoil', 'fournitures_bureau', 'employes_bureau', 'impots'].forEach(f => fd.append(f, f === targetKey ? amount : '0'));
                        fd.append('periode', new Date().toLocaleDateString('fr-MA'));
                        if (d.reference) fd.append(`${targetKey}_ref`, d.reference);
                        if (currentFile) fd.append(`${targetKey}_scan`, currentFile);
                        await apiFetch('/charges', { method: 'POST', body: fd });
                    } else if (response.action === 'CREATE_PROVIDER_INVOICE') {
                        const providerId = await resolveServiceProvider(d.provider_name || 'Inconnu');
                        const fd = new FormData();
                        fd.append('service_provider_id', String(providerId));
                        fd.append('amount', String(d.montant || 0));
                        fd.append('invoice_date', new Date().toISOString().split('T')[0]);
                        if (d.reference) fd.append('reference', d.reference);
                        if (currentFile) fd.append('scan_path', currentFile);
                        await apiFetch('/provider-invoices', { method: 'POST', body: fd });
                    } else if (response.action === 'CREATE_PROJECT') {
                        await apiFetch('/terrains', { method: 'POST', body: JSON.stringify({ nom_projet: d.nom || 'Projet', nom_terrain: d.ville || '', cout_global: 0, total: 0, honoraires_notaire: 0, frais_enregistrement: 0, frais_immatriculation: 0 }) });
                    } else if (response.action === 'CREATE_CLIENT') {
                        await apiFetch('/clients', { method: 'POST', body: JSON.stringify({ nom: d.nom || '', prenom: d.prenom || '', cin: d.cin || 'INCONNU', tel: d.tel || '0000000000', date_reservation: new Date().toISOString().split('T')[0] }) });
                    } else if (response.action === 'CREATE_SUPPLIER') {
                        await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify({ nom: d.nom || 'Fournisseur', telephone: d.tel || '0000000000', adresse: d.adresse || '' }) });
                    } else if (response.action === 'CREATE_WORKER') {
                        await apiFetch('/ouvriers', { method: 'POST', body: JSON.stringify({ nom: d.nom || '', prenom: d.prenom || '', cin: d.cin || '', metier: d.metier || '', telephone: d.telephone || '' }) });
                    } else if (response.action === 'CREATE_SALARY') {
                        await apiFetch('/salaries', { method: 'POST', body: JSON.stringify({ nom: d.nom || '', prenom: d.prenom || '', cin: d.cin || '', poste: d.poste || '', salaire_base: d.salaire_base || 0, date_embauche: new Date().toISOString().split('T')[0] }) });
                    }

                    setMessages(prev => [...prev, { role: 'model', parts: response.message, isAction: true }]);
                    speak(response.message);
                    toast.success(alertMsg);
                    setChatFile(null);
                } catch (actionErr: any) {
                    setMessages(prev => [...prev, { role: 'model', parts: `Erreur : ${actionErr.message}` }]);
                }
            } else if (response.type === 'CLARIFY') {
                setMessages(prev => [...prev, { role: 'model', parts: response.message, choices: response.choices || [] }]);
                speak(response.message);
            } else {
                setMessages(prev => [...prev, { role: 'model', parts: response.message }]);
                speak(response.message);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', parts: "Désolé, je rencontre une difficulté technique." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const resolveServiceProvider = async (providerName: string) => {
        const providers: any[] = await apiFetch('/service-providers');
        const match = providers.find(p => p.nom.toLowerCase() === providerName.toLowerCase());
        if (match) return match.id;
        const newP = await apiFetch('/service-providers', { method: 'POST', body: JSON.stringify({ nom: providerName, categorie: 'Autre' }) }) as any;
        return newP.id;
    };

    const handleChoice = async (choice: Choice, msgIndex: number) => {
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, choices: [] } : m));
        setMessages(prev => [...prev, { role: 'user', parts: `✅ ${choice.label}` }]);
        setIsLoading(true);
        try {
            const d = choice.action_data || {};
            let alertMsg = "Terminé";
            const catMapping: Record<string, string> = { 'loyer': 'loyer_bureau', 'gasoil': 'gasoil', 'fournitures': 'fournitures_bureau', 'employes': 'employes_bureau', 'impots': 'impots', 'essence': 'gasoil' };
            if (choice.action === 'CREATE_CHARGE') {
                const fd = new FormData();
                const cat = (d.category || 'gasoil').toLowerCase();
                const targetKey = catMapping[cat] || 'gasoil';
                ['loyer_bureau', 'gasoil', 'fournitures_bureau', 'employes_bureau', 'impots'].forEach(f => fd.append(f, f === targetKey ? String(d.amount || 0) : '0'));
                fd.append('periode', new Date().toLocaleDateString('fr-MA'));
                if (chatFile) { fd.append(`${targetKey}_scan`, chatFile); if (d.reference) fd.append(`${targetKey}_ref`, d.reference); }
                await apiFetch('/charges', { method: 'POST', body: fd });
            } else if (choice.action === 'CREATE_PROVIDER_INVOICE') {
                const providerId = await resolveServiceProvider(d.provider_name || 'Inconnu');
                const fd = new FormData();
                fd.append('service_provider_id', String(providerId));
                fd.append('amount', String(d.montant || 0));
                fd.append('invoice_date', new Date().toISOString().split('T')[0]);
                if (chatFile) fd.append('scan_path', chatFile);
                await apiFetch('/provider-invoices', { method: 'POST', body: fd });
            }
            setMessages(prev => [...prev, { role: 'model', parts: "Action complétée.", isAction: true }]);
            speak("L'action a été finalisée avec succès.");
            setChatFile(null);
            toast.success(alertMsg);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'model', parts: `Erreur: ${err.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Standard Trigger Bubble (Bottom-Right) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[1000] w-16 h-16 chat-bubble-trigger text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                    <img src={novaFace} className="w-12 h-12 rounded-full object-cover" alt="Nova" />
                </button>
            )}

            {/* Standard Chat Window */}
            {isOpen && (
                <div className={`fixed right-6 bottom-6 z-[1000] chat-window-pro animate-slide-up transition-all ${isFullScreen ? 'w-[90vw] h-[90vh]' : 'w-[380px] h-[600px]'}`}>

                    {/* Professional Header */}
                    <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={novaFace} className="w-10 h-10 rounded-full border-2 border-white/20" alt="Nova" />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-600 rounded-full"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight">Nova Assistant</span>
                                <span className="text-[10px] text-white/70">En ligne pour vous aider</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    primeTTS();
                                    if (isCallActive) setIsCallActive(false);
                                    else {
                                        setIsCallActive(true);
                                        setIsVoiceActive(true); // Mandatory for call
                                        if (messages.length > 0) {
                                            speak("Appel Nova activé. Comment puis-je vous aider ?");
                                        }
                                    }
                                }}
                                className={`p-2 rounded-lg transition-all ${isCallActive ? 'bg-rose-500 text-white animate-pulse' : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white'}`}
                                title={isCallActive ? "Quitter le mode Appel" : "Démarrer un Appel Nova"}
                            >
                                {isCallActive ? <PhoneOff size={18} /> : <Phone size={18} />}
                            </button>
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

                    {/* CALL INTERFACE OVERLAY */}
                    {isCallActive && (
                        <div className="absolute inset-0 z-[1010] bg-slate-900 flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
                            {/* Abstract background effect */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-blue-600/30"></div>
                            </div>

                            {/* Top info */}
                            <div className="relative z-10 text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 mb-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">En appel direct</span>
                                </div>
                                <h2 className="text-white text-2xl font-black tracking-tight">Nova Assistant</h2>
                            </div>

                            {/* Central Persona / Visualizer */}
                            <div className="relative flex flex-col items-center gap-8">
                                <div className="relative">
                                    {/* Animated Ring - Pulsates based on volume when listening, or automatic pulse when speaking */}
                                    <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-pulse-ring" style={{
                                        transform: `scale(${1 + (isListening ? volume / 100 : (isNovaSpeaking ? 0.2 : 0))})`,
                                        transition: 'transform 0.1s ease-out'
                                    }}></div>
                                    <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse-ring animation-delay-500" style={{
                                        transform: `scale(${1.2 + (isListening ? volume / 80 : (isNovaSpeaking ? 0.3 : 0))})`,
                                        transition: 'transform 0.1s ease-out'
                                    }}></div>

                                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-slate-800 shadow-2xl ring-4 ring-blue-600/20">
                                        <img src={novaFace} className={`w-full h-full object-cover transition-transform duration-500 ${isNovaSpeaking ? 'scale-110 grayscale-0' : 'scale-100 grayscale-[0.2]'}`} alt="Nova" />
                                    </div>

                                    {/* Audio Waves Overlay when speaking */}
                                    {isNovaSpeaking && (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-6">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="w-1 bg-white rounded-full animate-wave" style={{ animationDelay: `${i * 0.1}s`, height: '40%' }}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center gap-2 min-h-[40px] text-center">
                                    {isNovaSpeaking ? (
                                        <p className="text-blue-400 font-bold text-sm flex items-center gap-2 animate-pulse">
                                            <Waves size={16} /> Nova parle...
                                        </p>
                                    ) : isLoading ? (
                                        <p className="text-blue-300 font-bold text-sm flex items-center gap-2 animate-pulse">
                                            <Sparkles size={16} className="animate-spin" /> Nova réfléchit...
                                        </p>
                                    ) : isListening ? (
                                        <p className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                                            <Mic size={16} className="animate-bounce" /> À vous, je vous écoute
                                        </p>
                                    ) : (
                                        <p className="text-white/40 font-medium text-xs italic">
                                            Nova est en attente
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Subtitle / Current Transcript */}
                            <div className="relative z-10 w-full max-w-sm text-center">
                                {messages.length > 0 && (
                                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                                        <p className="text-white/80 text-sm leading-relaxed line-clamp-3 italic">
                                            "{messages[messages.length - 1].parts.substring(0, 150)}..."
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="relative z-10 flex items-center gap-6">
                                <button
                                    onClick={() => speak(messages[messages.length - 1].parts)}
                                    className="p-4 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
                                >
                                    <Volume2 size={24} />
                                </button>
                                <button
                                    onClick={() => setIsCallActive(false)}
                                    className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/40 hover:bg-rose-700 active:scale-90 transition-all border-4 border-rose-500/20"
                                >
                                    <PhoneOff size={32} />
                                </button>
                                <button
                                    onClick={() => toggleListening()}
                                    className={`p-4 rounded-full transition ${isListening ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}
                                >
                                    <Mic size={24} />
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-grow overflow-y-auto px-6 py-6 space-y-6 scroll-pro bg-slate-50/30">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none markdown-pro'
                                    }`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.parts}</ReactMarkdown>

                                    {msg.isAction && (
                                        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-600">
                                            <CheckCircle2 size={14} /> Action effectuée
                                        </div>
                                    )}

                                    {msg.choices && msg.choices.length > 0 && (
                                        <div className="mt-4 flex flex-col gap-2">
                                            {msg.choices.map((choice, ci) => (
                                                <button
                                                    key={ci}
                                                    onClick={() => handleChoice(choice, i)}
                                                    className="w-full text-left px-4 py-2 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-[12px] font-semibold text-slate-700 transition-all flex justify-between items-center group"
                                                >
                                                    {choice.label}
                                                    <Sparkles size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="px-4 py-2 bg-white border border-slate-200 rounded-full flex gap-1 items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Input - Refactored for better spacing */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        {chatFile && (
                            <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500 px-3 bg-blue-50/50 py-2 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-bottom-1">
                                <span className="truncate max-w-[250px] flex items-center gap-2 font-medium">
                                    <FileText size={14} className="text-blue-500" /> {chatFile.name}
                                </span>
                                <button onClick={() => setChatFile(null)} className="p-1 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-rose-500">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <div className="flex-grow flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 border border-transparent focus-within:border-blue-200 transition-all min-h-[48px]">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded-xl transition-all ${chatFile ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200/50'}`}
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
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Message ou commande vocale..."
                                    className="flex-grow bg-transparent border-none outline-none text-[14px] text-slate-700 placeholder:text-slate-400 py-1"
                                />
                                <button
                                    onClick={toggleListening}
                                    className={`p-2 rounded-xl transition-all ${isListening ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200/50'}`}
                                    title="Commande vocale"
                                >
                                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                            </div>

                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() && !chatFile && !isLoading}
                                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95 disabled:text-slate-400"
                            >
                                <Send size={20} />
                            </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between px-2">
                            <button onClick={() => setMessages([{ role: 'model', parts: 'Nouvelle conversation initialisée.' }])} className="text-slate-300 hover:text-rose-400 transition-colors">
                                <Trash2 size={12} />
                            </button>
                            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em]">
                                Nova Pro Voice Ready
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIAssistant;
