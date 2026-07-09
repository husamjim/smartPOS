import React from 'react';

interface SkeletonProps {
  type: 'card' | 'row' | 'table';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ type, count = 3 }) => {
  const arr = Array.from({ length: count });

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {arr.map((_, idx) => (
          <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-3 animate-pulse">
            <div className="h-6 bg-slate-250 dark:bg-slate-800 rounded-lg w-1/3" />
            <div className="h-10 bg-slate-250 dark:bg-slate-800 rounded-xl w-3/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className="space-y-3 animate-pulse">
        {arr.map((_, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
            <div className="flex items-center gap-3 w-1/2">
              <div className="w-10 h-10 rounded-xl bg-slate-250 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-250 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded-sm w-1/2" />
              </div>
            </div>
            <div className="h-6 bg-slate-250 dark:bg-slate-800 rounded-lg w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded-lg w-full" />
      {arr.map((_, idx) => (
        <div key={idx} className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
      ))}
    </div>
  );
};
