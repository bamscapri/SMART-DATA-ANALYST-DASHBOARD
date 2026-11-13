import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast, index) => {
        let icon = <Info className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />;
        let accentBorder = 'var(--border-color)';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-success)' }} />;
          accentBorder = 'var(--color-success)';
        } else if (toast.type === 'error') {
          icon = <XCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />;
          accentBorder = 'var(--color-danger)';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />;
          accentBorder = 'var(--color-warning)';
        }

        return (
          <div
            key={`${toast.id}-${index}`}
            role="status"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: accentBorder,
              boxShadow: 'var(--shadow-elevated)'
            }}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border transition-theme"
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--text-main)]">{toast.title}</div>
              {toast.message && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  {toast.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup Notifikasi"
              className="text-[var(--text-secondary)] hover:text-[var(--text-main)] p-0.5 rounded transition-theme cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
