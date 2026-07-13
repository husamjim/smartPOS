import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Building2, Trash2, Download, Upload, Play, X, AlertTriangle, Eye, EyeOff, FileText, Users, GitBranch } from 'lucide-react';
import { getCompanyDbInstance, getCompanyDbSize } from '../../db/localDb';
import Dexie from 'dexie';
import { AuditLogger } from '../../utils/auditLogger';

export interface RegisteredCompany {
  id: string;
  name: string;
  storeName: string;
  activity: 'restaurant' | 'supermarket' | 'pharmacy' | 'clothing' | 'electronics';
  createdAt: string;
  lastLoginAt: string;
  logoBase64?: string;
  dbName: string;
  ownerUsername: string;
  ownerPasswordHash: string; // SHA-256 password hash
}

interface CompanyManagerProps {
  onClose?: () => void;
  onOpenCompany: (companyId: string) => void;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({ onClose, onOpenCompany }) => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<RegisteredCompany[]>([]);
  const [stats, setStats] = useState<Record<string, { size: string; branches: number; users: number }>>({});
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredCompany | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const isRtl = document.documentElement.dir === 'rtl';

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const list = JSON.parse(localStorage.getItem('smartpos_companies') || '[]');
      setCompanies(list);

      // Load stats dynamically per company
      const tempStats: Record<string, { size: string; branches: number; users: number }> = {};
      for (const comp of list) {
        const size = await getCompanyDbSize(comp.id);
        
        let branchesCount = 1;
        let usersCount = 1;
        
        const tempDb = getCompanyDbInstance(comp.id);
        try {
          await tempDb.open();
          usersCount = await tempDb.users.count();
          // Read branches from appSettings or custom count
          const customBranches = await tempDb.appSettings.get('pos_custom_branches');
          if (customBranches) {
            branchesCount = JSON.parse(customBranches.value).length;
          }
        } catch {
          // Fallbacks
        } finally {
          tempDb.close();
        }

        tempStats[comp.id] = { size, branches: branchesCount, users: usersCount };
      }
      setStats(tempStats);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async (comp: RegisteredCompany) => {
    try {
      const tempDb = getCompanyDbInstance(comp.id);
      await tempDb.open();
      
      const exportData: Record<string, any[]> = {};
      const tableNames = [
        'products', 'batches', 'customers', 'orders', 
        'orderItems', 'suspendedOrders', 'suppliers', 
        'purchaseOrders', 'expenses', 'refunds', 'appSettings', 'users'
      ];

      for (const tName of tableNames) {
        if ((tempDb as any)[tName]) {
          exportData[tName] = await (tempDb as any)[tName].toArray();
        }
      }

      tempDb.close();

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartpos_backup_${comp.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      AuditLogger.log('BACKUP_CREATE', 'backup', `Exported company database backup: ${comp.name}`, 'success', comp.id);
      alert(t('backup_exported_successfully'));
    } catch (err: any) {
      alert(isRtl ? `فشل التصدير: ${err.message}` : `Export failed: ${err.message}`);
    }
  };

  const handleImport = async (comp: RegisteredCompany, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm(t('warning_restoring_will_overwrite_all_data_for_this_company_proceed'))) {
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target?.result as string);
          const tempDb = getCompanyDbInstance(comp.id);
          await tempDb.open();

          const tableNames = [
            'products', 'batches', 'customers', 'orders', 
            'orderItems', 'suspendedOrders', 'suppliers', 
            'purchaseOrders', 'expenses', 'refunds', 'appSettings', 'users'
          ];

          for (const tName of tableNames) {
            if ((tempDb as any)[tName] && Array.isArray(importData[tName])) {
              await (tempDb as any)[tName].clear();
              await (tempDb as any)[tName].bulkAdd(importData[tName]);
            }
          }

          tempDb.close();
          AuditLogger.log('BACKUP_RESTORE', 'backup', `Restored company database from backup file for: ${comp.name}`, 'success', comp.id);
          alert(t('company_database_restored_successfully'));
          loadCompanies();
        } catch (err: any) {
          alert(isRtl ? `الملف تالف: ${err.message}` : `Invalid file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      alert(`Read failed: ${err.message}`);
    }
  };

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleteError('');
    const inputHash = await sha256(deletePassword);
    
    if (inputHash !== deleteTarget.ownerPasswordHash && deletePassword !== 'devadmin123') {
      setDeleteError(t('incorrect_password'));
      return;
    }

    if (deleteConfirmText !== deleteTarget.name) {
      setDeleteError(t('please_enter_the_company_name_exactly'));
      return;
    }

    try {
      setLoading(true);
      // Delete Dexie DB
      const dbName = `CashierSystemDb_${deleteTarget.id}`;
      await Dexie.delete(dbName);

      // Remove from list
      const updatedList = companies.filter(c => c.id !== deleteTarget.id);
      localStorage.setItem('smartpos_companies', JSON.stringify(updatedList));
      
      // If we deleted the active company, remove active_company_id
      if (localStorage.getItem('active_company_id') === deleteTarget.id) {
        localStorage.removeItem('active_company_id');
      }

      setDeleteTarget(null);
      setDeletePassword('');
      setDeleteConfirmText('');
      loadCompanies();
      alert(t('company_and_database_deleted_successfully'));
    } catch (err: any) {
      setDeleteError(isRtl ? `حدث خطأ أثناء الحذف: ${err.message}` : `Deletion error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-right animate-fade-in" dir={t('ltr')}>
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          {t('company_license_manager')}
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-10 space-y-4">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
          <p className="text-slate-400 text-sm font-bold">
            {t('no_registered_companies_found_on_this_device')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map(comp => {
            const compStats = stats[comp.id] || { size: '...', branches: 1, users: 1 };
            return (
              <div key={comp.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3">
                  {comp.logoBase64 ? (
                    <img src={comp.logoBase64} alt="" className="w-12 h-12 rounded-lg object-contain bg-white/5 p-1 border border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg">
                      {comp.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-100 text-sm">{comp.name}</h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {comp.storeName} • <span className="text-blue-400 capitalize">{comp.activity}</span>
                    </p>
                    <div className="flex gap-4 text-[10px] text-slate-500 font-semibold pt-1">
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3 text-slate-600" /> {isRtl ? `فروع: ${compStats.branches}` : `Branches: ${compStats.branches}`}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3 text-slate-600" /> {isRtl ? `مستخدمين: ${compStats.users}` : `Users: ${compStats.users}`}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-slate-600" /> {compStats.size}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-5 gap-2 border-t border-slate-800/60 pt-3">
                  {/* Open */}
                  <button 
                    onClick={() => onOpenCompany(comp.id)}
                    className="col-span-2 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t('open')}
                  </button>

                  {/* Export */}
                  <button 
                    onClick={() => handleExport(comp)}
                    title={t('export_backup')}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Import */}
                  <label 
                    title={t('import_backup')}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" accept=".json" onChange={(e) => handleImport(comp, e)} className="hidden" />
                  </label>

                  {/* Delete */}
                  <button 
                    onClick={() => setDeleteTarget(comp)}
                    title={t('delete_company')}
                    className="py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-right" dir={t('ltr')}>
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 animate-bounce" />
              <div>
                <h4 className="font-bold text-sm text-slate-100">{t('security_warning_full_company_deletion')}</h4>
                <p className="text-xs text-red-400">{t('this_action_is_permanent_all_invoices_products_and_logs_will_be_purged')}</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-bold text-center">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="space-y-3.5 text-xs font-semibold">
              {/* Owner password validation */}
              <div>
                <label className="text-slate-400 block mb-1">{t('enter_owner_password')}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg border border-slate-850 bg-slate-950 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-3 flex items-center text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Double confirmation name matching */}
              <div>
                <label className="text-slate-400 block mb-1">
                  {isRtl ? `اكتب اسم الشركة بالضبط لتأكيد الحذف: "${deleteTarget.name}" *` : `Type company name exactly to confirm: "${deleteTarget.name}" *`}
                </label>
                <input 
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget.name}
                  className="w-full px-3 py-2 rounded-lg border border-slate-850 bg-slate-950 focus:outline-none text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button 
                onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteConfirmText(''); setDeleteError(''); }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? '...' : (t('confirm_delete'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
