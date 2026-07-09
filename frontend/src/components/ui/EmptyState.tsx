import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionText, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-3xl border border-dashed border-slate-200/60 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/10">
      <div className="text-5xl">{icon}</div>
      <div className="space-y-1">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="text-xs text-slate-400 max-w-sm">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
