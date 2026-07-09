import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 shrink-0" />,
    error: <XCircle className="h-5 w-5 shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 shrink-0" />,
    info: <Info className="h-5 w-5 shrink-0" />,
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-lg animate-fade-in text-xs font-semibold ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={() => onClose(id)} className="opacity-60 hover:opacity-100 font-bold ml-2">✕</button>
    </div>
  );
};
