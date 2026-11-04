// AppToaster.tsx
// Styled react-hot-toast container. Existing toast.success / toast.error /
// toast.loading calls throughout the app pick this styling up automatically.

import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const AppToaster = () => (
    <Toaster
        position="bottom-center"
        gutter={10}
        containerStyle={{ bottom: 24, zIndex: 2000 }}
        toastOptions={{
            duration: 3500,
            style: {
                background: '#0f172a',
                color: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: 1.45,
                maxWidth: 420,
                boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.45), 0 0 0 1px rgba(255,255,255,0.06) inset',
            },
            success: {
                iconTheme: { primary: '#10b981', secondary: '#0f172a' },
            },
            error: {
                duration: 5000,
                iconTheme: { primary: '#f43f5e', secondary: '#0f172a' },
            },
            loading: {
                iconTheme: { primary: '#f59e0b', secondary: '#334155' },
            },
        }}
    >
        {(t) => (
            <ToastBar toast={t}>
                {({ icon, message }) => (
                    <>
                        {icon}
                        <div className="flex-1">{message}</div>
                        {t.type !== 'loading' && (
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="ml-1 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="Fermer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </>
                )}
            </ToastBar>
        )}
    </Toaster>
);

export default AppToaster;
