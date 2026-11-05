// NotificationBell.tsx
// Bell with unread badge + panel. Alerts come from GET /notifications
// (overdue/upcoming instalments, cheques to deposit, unsigned contracts,
// low stock, court hearings). "Read" state is remembered locally by alert id.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarClock, Banknote, FileSignature, Package, Scale, Check, ListTodo } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface AppNotification {
    id: string;
    type: 'echeance_retard' | 'echeance_avenir' | 'cheque' | 'contrat' | 'stock' | 'audience' | 'task';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail?: string;
    date?: string | null;
    link: string;
}

const SEEN_KEY = 'notifications:seen';
const readSeen = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
};
const writeSeen = (s: Set<string>) => {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500))); } catch { /* ignore */ }
};

const ICON = {
    echeance_retard: CalendarClock, echeance_avenir: CalendarClock, cheque: Banknote,
    contrat: FileSignature, stock: Package, audience: Scale, task: ListTodo,
} as const;
const DOT = { critical: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-slate-400' } as const;

export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: () => apiFetch<AppNotification[]>('/notifications'),
        staleTime: 60_000,
        refetchInterval: 5 * 60_000,
    });
}

export default function NotificationBell({ compact = false }: { compact?: boolean }) {
    const navigate = useNavigate();
    const { data = [] } = useNotifications();
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState<Set<string>>(readSeen);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const unread = useMemo(() => data.filter(n => !seen.has(n.id)), [data, seen]);
    const urgent = unread.some(n => n.severity === 'critical');

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey, true);
        return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true); };
    }, [open]);

    const toggle = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setPos({ top: Math.max(8, r.top - 4), left: r.right + 10 });
        setOpen(o => !o);
    };

    const markAll = () => { const s = new Set(seen); data.forEach(n => s.add(n.id)); setSeen(s); writeSeen(s); };
    const openItem = (n: AppNotification) => {
        const s = new Set(seen); s.add(n.id); setSeen(s); writeSeen(s);
        setOpen(false);
        navigate(n.link);
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={toggle}
                className={`relative inline-flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors ${compact ? 'w-10 h-10' : 'w-8 h-8'}`}
                title="Notifications"
                aria-label={`Notifications${unread.length ? ` (${unread.length} non lues)` : ''}`}
            >
                <Bell size={17} />
                {unread.length > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold leading-4 text-white text-center ring-2 ring-sidebar ${urgent ? 'bg-red-500' : 'bg-amber-500'}`}>
                        {unread.length > 9 ? '9+' : unread.length}
                    </span>
                )}
            </button>

            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{ top: pos.top, left: pos.left }}
                    className="fixed z-[800] w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl ring-1 ring-slate-900/10 overflow-hidden animate-dialog-in"
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Notifications {unread.length > 0 && <span className="ml-1 text-slate-400 font-normal">· {unread.length} non lue{unread.length > 1 ? 's' : ''}</span>}
                        </h3>
                        {unread.length > 0 && (
                            <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
                                <Check size={12} /> Tout marquer lu
                            </button>
                        )}
                    </div>
                    <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                        {data.length === 0 && (
                            <li className="px-4 py-10 text-center">
                                <Bell size={18} className="mx-auto text-slate-300" />
                                <p className="mt-2 text-sm text-slate-500">Rien à signaler</p>
                            </li>
                        )}
                        {data.map(n => {
                            const Icon = ICON[n.type] ?? Bell;
                            const isNew = !seen.has(n.id);
                            return (
                                <li key={n.id}>
                                    <button onClick={() => openItem(n)} className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${isNew ? '' : 'opacity-60'}`}>
                                        <span className="mt-0.5 text-slate-400 flex-shrink-0"><Icon size={16} /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm text-slate-900 leading-snug">{n.title}</span>
                                            {n.detail && <span className="block mt-0.5 text-xs text-slate-500">{n.detail}</span>}
                                        </span>
                                        {isNew && <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${DOT[n.severity]}`} title={n.severity === 'critical' ? 'Urgent' : n.severity === 'warning' ? 'À surveiller' : 'Info'} />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>,
                document.body,
            )}
        </>
    );
}
