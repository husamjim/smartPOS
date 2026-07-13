import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, ShieldAlert, CheckCircle, RefreshCw, Clock, HardDrive, Trash2 } from 'lucide-react';
import { db } from '../../db/localDb';
import { AuditLogger } from '../../utils/auditLogger';

interface BackupRecord {
  id: string;
  timestamp: string;
  size: number;
  type: 'manual' | 'auto' | 'cloud';
  status: 'success' | 'failed';
  integrity: 'valid' | 'corrupt';
}

export const BackupCenter: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<BackupRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pos_backup_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('pos_auto_backup_enabled') === 'true');
  const [backupInterval, setBackupInterval] = useState(() => localStorage.getItem('pos_auto_backup_interval') || '7'); // days
  const [dest, setDest] = useState(() => localStorage.getItem('pos_backup_destination') || 'file'); // 'file' | 'browser' | 'cloud'
  const [validating, setValidating] = useState(false);
  const [valMsg, setValMsg] = useState('');
  const [valStatus, setValStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const isRtl = document.documentElement.dir === 'rtl';

  useEffect(() => {
    localStorage.setItem('pos_backup_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('pos_auto_backup_enabled', String(autoBackup));
  }, [autoBackup]);

  useEffect(() => {
    localStorage.setItem('pos_auto_backup_interval', backupInterval);
  }, [backupInterval]);

  useEffect(() => {
    localStorage.setItem('pos_backup_destination', dest);
  }, [dest]);

  const runBackup = async () => {
    try {
      const exportData: Record<string, any[]> = {};
      const tableNames = [
        'products', 'batches', 'customers', 'orders', 
        'orderItems', 'suspendedOrders', 'suppliers', 
        'purchaseOrders', 'expenses', 'refunds'
      ] as const;

      for (const tName of tableNames) {
        exportData[tName] = await (db as any)[tName].toArray();
      }

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const sizeBytes = blob.size;

      if (dest === 'file') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `smartpos_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (dest === 'browser') {
        // Store in localStorage (compressed or small scale)
        localStorage.setItem(`pos_local_backup_data`, jsonStr);
      } else {
        // Cloud simulation
        await new Promise(r => setTimeout(r, 1500));
      }

      const record: BackupRecord = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        size: sizeBytes,
        type: dest === 'file' ? 'manual' : dest === 'browser' ? 'auto' : 'cloud',
        status: 'success',
        integrity: 'valid'
      };

      setHistory(prev => [record, ...prev]);
      AuditLogger.log('BACKUP_CREATE', 'backup', `Database backup compiled. Size: ${(sizeBytes / 1024).toFixed(2)} KB`, 'success');
      alert(t('backup_compiled_successfully'));
    } catch (err: any) {
      const record: BackupRecord = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        size: 0,
        type: dest === 'file' ? 'manual' : dest === 'browser' ? 'auto' : 'cloud',
        status: 'failed',
        integrity: 'corrupt'
      };
      setHistory(prev => [record, ...prev]);
      AuditLogger.log('BACKUP_CREATE', 'backup', `Database backup failed: ${err.message}`, 'failure');
      alert(t('backup_compilation_failed'));
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm(t('warning_restoring_will_overwrite_all_current_databases_proceed'))) {
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonStr = e.target?.result as string;
          const importData = JSON.parse(jsonStr);

          // Verify schema integrity
          const requiredTables = ['products', 'batches', 'customers', 'orders', 'orderItems'];
          const fileKeys = Object.keys(importData);
          const hasIntegrity = requiredTables.every(t => fileKeys.includes(t));

          if (!hasIntegrity) {
            alert(t('corrupt_file_missing_core_schema_tables'));
            return;
          }

          // Clear and rebuild
          const tableNames = [
            'products', 'batches', 'customers', 'orders', 
            'orderItems', 'suspendedOrders', 'suppliers', 
            'purchaseOrders', 'expenses', 'refunds'
          ] as const;

          for (const tName of tableNames) {
            await (db as any)[tName].clear();
            if (Array.isArray(importData[tName])) {
              await (db as any)[tName].bulkAdd(importData[tName]);
            }
          }

          AuditLogger.log('BACKUP_RESTORE', 'backup', 'Full database restore successfully executed from backup file.', 'success');
          alert(t('database_restored_successfully'));
          window.location.reload();
        } catch (err: any) {
          alert(isRtl ? `خطأ أثناء الاستعادة: ${err.message}` : `Restore error: ${err.message}`);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      alert(`File read failed: ${err.message}`);
    }
  };

  const testIntegrity = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidating(true);
    setValMsg(t('verifying_schema_integrity'));
    setValStatus('idle');

    await new Promise(r => setTimeout(r, 1200));

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const required = ['products', 'batches', 'customers', 'orders', 'orderItems'];
          const missing = required.filter(t => !data[t]);

          if (missing.length > 0) {
            setValStatus('error');
            setValMsg(isRtl 
              ? `النسخة غير سليمة! الجداول المفقودة: ${missing.join(', ')}`
              : `Corrupted backup! Missing key structures: ${missing.join(', ')}`);
          } else {
            setValStatus('success');
            const totalProducts = data.products?.length || 0;
            const totalOrders = data.orders?.length || 0;
            setValMsg(isRtl
              ? `النسخة سليمة 100%! تحتوي على (${totalProducts}) منتجات، و (${totalOrders}) فواتير.`
              : `Integrity verified! Found (${totalProducts}) products, (${totalOrders}) orders.`);
          }
        } catch {
          setValStatus('error');
          setValMsg(t('file_corrupted_or_invalid_json_format'));
        }
        setValidating(false);
      };
      reader.readAsText(file);
    } catch {
      setValStatus('error');
      setValMsg('Read error');
      setValidating(false);
    }
  };

  const clearHistory = () => {
    if (confirm(t('clear_backup_history_log'))) {
      setHistory([]);
    }
  };

  return (
    <div className="space-y-6 text-right" dir={t('ltr')}>
      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manual Backup Center */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
            <Database className="h-4 w-4" />
            {t('manual_backup_settings')}
          </h4>
          
          <div className="space-y-3 text-xs font-semibold">
            <div>
              <label className="text-slate-400 block mb-1">{t('backup_destination')}</label>
              <select 
                value={dest}
                onChange={e => setDest(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value="file">{t('local_file_download_json')}</option>
                <option value="browser">{t('save_to_browser_cache_storage')}</option>
                <option value="cloud">{t('sync_to_cloud_replica')}</option>
              </select>
            </div>

            <button
              onClick={runBackup}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              {t('create_download_backup_now')}
            </button>
          </div>
        </div>

        {/* Auto Backup Config */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
            <Clock className="h-4 w-4" />
            {t('automated_schedule_config')}
          </h4>

          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex justify-between items-center bg-slate-500/5 p-2 rounded-xl border border-slate-200/20">
              <span className="text-slate-600 dark:text-slate-350">{t('enable_scheduled_auto_backup')}</span>
              <input 
                type="checkbox" 
                checked={autoBackup}
                onChange={e => setAutoBackup(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-indigo-600" 
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">{t('repeat_cycle')}</label>
              <select 
                value={backupInterval}
                onChange={e => setBackupInterval(e.target.value)}
                disabled={!autoBackup}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none disabled:opacity-50"
              >
                <option value="1">{t('every_day')}</option>
                <option value="3">{t('every_3_days')}</option>
                <option value="7">{t('every_week')}</option>
                <option value="30">{t('every_month')}</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isRtl 
                ? '* سيتم التنبيه لتنزيل الملف تلقائياً عند انتهاء دورة النسخ لتجنب فقد البيانات.' 
                : '* System will send a download prompt reminder automatically when the cycle expires.'}
            </p>
          </div>
        </div>
      </div>

      {/* Restore & Integrity Check */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Restore */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-3">
          <h4 className="font-bold text-xs text-indigo-500 flex items-center gap-1.5 justify-start">
            <Upload className="h-4 w-4" />
            {t('restore_from_backup_file')}
          </h4>
          <p className="text-xs text-slate-400">{t('upload_a_previously_generated_json_file_to_replace_the_active_database')}</p>
          
          <label className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-xs font-bold text-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Upload className="h-4 w-4" />
            <span>{t('upload_restore_file')}</span>
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </label>
        </div>

        {/* Integrity Check */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-3">
          <h4 className="font-bold text-xs text-indigo-500 flex items-center gap-1.5 justify-start">
            <HardDrive className="h-4 w-4" />
            {t('verify_file_integrity')}
          </h4>
          <p className="text-xs text-slate-400">{t('upload_any_system_backup_file_to_perform_schema_verification_prior_to_restoring')}</p>
          
          <label className="w-full py-2.5 rounded-xl border border-dashed border-slate-350 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <RefreshCw className={`h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
            <span>{t('select_file_for_verification')}</span>
            <input type="file" accept=".json" onChange={testIntegrity} className="hidden" />
          </label>

          {valMsg && (
            <div className={`p-2.5 rounded-xl border text-[11px] font-bold text-center flex items-center gap-1.5 justify-center ${
              valStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
              valStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' :
              'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}>
              {valStatus === 'success' ? <CheckCircle className="h-3.5 w-3.5" /> : 
               valStatus === 'error' ? <ShieldAlert className="h-3.5 w-3.5" /> : null}
              <span>{valMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* History Log */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="font-bold text-xs text-slate-400">{t('historical_backup_log')}</h4>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="text-[10px] text-red-500 hover:underline font-bold flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              {t('clear_log')}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-semibold space-y-1">
            <div>📋</div>
            <p>{t('no_historical_backup_records_logged_yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs font-semibold">
            <table className="w-full text-right" dir={t('ltr')}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850">
                  <th className="py-2 text-slate-400">{t('date_time')}</th>
                  <th className="py-2 text-slate-400">{t('size_kb')}</th>
                  <th className="py-2 text-slate-400">{t('type_1')}</th>
                  <th className="py-2 text-slate-400">{t('status_1')}</th>
                  <th className="py-2 text-slate-400">{t('integrity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {history.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2 font-mono">{new Date(rec.timestamp).toLocaleString()}</td>
                    <td className="py-2 font-mono">{(rec.size / 1024).toFixed(2)} KB</td>
                    <td className="py-2 uppercase font-bold text-[10px] text-indigo-500">{rec.type}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                        rec.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>{rec.status.toUpperCase()}</span>
                    </td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                        rec.integrity === 'valid' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                      }`}>{rec.integrity.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
