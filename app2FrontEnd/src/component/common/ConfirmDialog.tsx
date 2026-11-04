// ConfirmDialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for window.confirm() that matches the app's design.
//
//   if (!(await confirmDialog('Supprimer ce projet ?'))) return;
//
//   await confirmDialog({
//       title: 'Supprimer le client',
//       message: 'Cette action est irréversible.',
//       confirmLabel: 'Supprimer',
//       variant: 'danger',
//   });
//
// <ConfirmHost /> must be mounted once (done in App.tsx).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' (red, default when the message mentions deletion) or 'default' (amber). */
    variant?: 'danger' | 'default';
}

interface PendingConfirm extends Required<Omit<ConfirmOptions, 'title'>> {
    title: string;
    resolve: (ok: boolean) => void;
}

let current: PendingConfirm | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

const looksDestructive = (msg: string) => /supprim|effac|irréversible|définitiv|annul/i.test(msg);

export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
    const opts: ConfirmOptions = typeof input === 'string' ? { message: input } : input;
    const variant = opts.variant ?? (looksDestructive(opts.message) ? 'danger' : 'default');

    // If a dialog is already open, cancel it before opening the new one.
    current?.resolve(false);

    return new Promise<boolean>(resolve => {
        current = {
            title: opts.title ?? (variant === 'danger' ? 'Confirmer la suppression' : 'Confirmation'),
            message: opts.message,
            confirmLabel: opts.confirmLabel ?? (variant === 'danger' ? 'Supprimer' : 'Confirmer'),
            cancelLabel: opts.cancelLabel ?? 'Annuler',
            variant,
            resolve: (ok: boolean) => {
                current = null;
                emit();
                resolve(ok);
            },
        };
        emit();
    });
}

const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};
const getSnapshot = () => current;

export function ConfirmHost() {
    const dialog = useSyncExternalStore(subscribe, getSnapshot);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!dialog) return;
        confirmRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); dialog.resolve(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dialog]);

    if (!dialog) return null;

    const danger = dialog.variant === 'danger';
    const Icon = danger ? AlertTriangle : HelpCircle;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
            onMouseDown={(e) => { if (e.target === e.currentTarget) dialog.resolve(false); }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden animate-dialog-in"
            >
                <div className="p-6 flex gap-4">
                    <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
                        <Icon size={22} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                        <h3 id="confirm-title" className="text-base font-semibold text-slate-900">{dialog.title}</h3>
                        <p id="confirm-message" className="mt-1.5 text-sm text-slate-600 leading-relaxed">{dialog.message}</p>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={() => dialog.resolve(false)}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                        {dialog.cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={() => dialog.resolve(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors ${danger ? 'bg-slate-900 hover:bg-slate-800' : 'bg-brand-600 hover:bg-brand-700'}`}
                    >
                        {dialog.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
