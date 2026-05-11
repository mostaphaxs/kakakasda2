import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { interpretVoiceCommand } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function VoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const navigate = useNavigate();
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'fr-FR';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = async (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                setIsListening(false);
                handleSpeech(text);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                toast.error("Erreur de reconnaissance vocale");
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            recognitionRef.current?.start();
            setIsListening(true);
            toast.success("Je vous écoute...", { icon: '🎙️' });
        }
    };

    const handleSpeech = async (text: string) => {
        setIsProcessing(true);
        try {
            const result = await interpretVoiceCommand(text);
            console.log("Voice Command Result:", result);

            if (result.action === 'navigate' && result.page) {
                const pageMap: Record<string, string> = {
                    'Stock': '/devices',
                    'Ventes': '/sales',
                    'Fournisseurs': '/suppliers',
                    'Dashboard': '/dashboard',
                    'Rapports': '/reports',
                    'Catalogue': '/articles',
                    'Dépenses': '/expenses',
                    'Paramètres': '/settings',
                    'Clients': '/customers'
                };
                const route = pageMap[result.page] || '/dashboard';
                navigate(route);
                speak(`D'accord, je vous dirige vers la page ${result.page}`);
            } else if (result.action === 'search' || result.action === 'check_stock') {
                navigate(`/devices?q=${encodeURIComponent(result.target || '')}`);
                speak(`Je recherche ${result.target} dans votre stock.`);
            } else {
                speak("Désolé, je n'ai pas compris cette commande vocale.");
            }
        } catch (error) {
            toast.error("Erreur d'interprétation");
        } finally {
            setIsProcessing(false);
        }
    };

    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
        toast(text, { icon: '🤖' });
    };

    return (
        <div className="flex flex-col gap-2 p-3 bg-slate-900/50 rounded-xl border border-white/10 backdrop-blur-md mb-4 shadow-xl overflow-hidden group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-800'}`}>
                        {isListening ? <Mic size={14} className="text-white" /> : <MicOff size={14} className="text-slate-400" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assistance Vocale</span>
                </div>

                <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={`p-2 rounded-lg transition-all ${isListening
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                        }`}
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : isListening ? <div className="text-[9px] font-black px-1">STOP</div> : <Mic size={16} />}
                </button>
            </div>

            {transcript && (
                <div className="px-2 py-1 bg-white/5 rounded border border-white/5 italic text-[10px] text-slate-300 truncate">
                    "{transcript}"
                </div>
            )}
        </div>
    );
}
