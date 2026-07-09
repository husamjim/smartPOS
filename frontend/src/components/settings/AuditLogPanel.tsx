import React, { useState, useEffect } from 'react';
import { db } from '../../db/localDb';
import { Download, Trash2 } from 'lucide-react';

export const AuditLogPanel: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isRtl = document.documentElement.dir === 'rtl';

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Query IndexedDB or fallback to localStorage
      let dbLogs: any[] = [];
      try {
        dbLogs = await db.auditLog.reverse().toArray();
      } catch {
        dbLogs = JSON.parse(localStorage.getItem('pos_audit_fallback') || '[]');
        // Sort reverse
        dbLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      setLogs(dbLogs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (logs.length === 0) return;
    const csvHeaders = ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Details', 'Branch', 'Result', 'Device', 'Session ID'];
    const csvRows = logs.map(l => [
      l.timestamp,
      l.user,
      l.role,
      l.action,
      l.entity,
      l.details,
      l.branch,
      l.result,
      l.device || '',
      l.sessionId || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearLogs = async () => {
    if (!confirm(isRtl ? '⚠️ تحذير: هل أنت متأكد من مسح جميع سجلات النشاط؟ لا يمكن التراجع عن هذا الإجراء.' : '⚠️ Warning: Are you sure you want to delete all activity audit logs? This cannot be undone.')) {
      return;
    }
    try {
      await db.auditLog.clear();
    } catch {
      localStorage.removeItem('pos_audit_fallback');
    }
    fetchLogs();
  };

  // Filter logic
  const filteredLogs = logs.filter(l => {
    const matchesUser = !userFilter || l.user.toLowerCase().includes(userFilter.toLowerCase());
    const matchesAction = !actionFilter || l.action === actionFilter;
    const matchesResult = !resultFilter || l.result === resultFilter;
    const matchesSearch = !searchQuery || 
      l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUser && matchesAction && matchesResult && matchesSearch;
  });

  return (
    <div className="space-y-4 text-right" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-semibold">
        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder={isRtl ? '🔍 بحث في التفاصيل...' : '🔍 Search logs...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          />
        </div>

        {/* User filter */}
        <div>
          <input 
            type="text" 
            placeholder={isRtl ? '👤 اسم المستخدم' : '👤 Username'}
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          />
        </div>

        {/* Action filter */}
        <div>
          <select 
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none text-[11px]"
          >
            <option value="">{isRtl ? '— كل العمليات —' : '— All Actions —'}</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE_INVOICE">CREATE_INVOICE</option>
            <option value="REFUND">REFUND</option>
            <option value="CREATE_PRODUCT">CREATE_PRODUCT</option>
            <option value="UPDATE_PRICE">UPDATE_PRICE</option>
            <option value="INVENTORY_COUNT">INVENTORY_COUNT</option>
            <option value="OPEN_DRAWER">OPEN_DRAWER</option>
            <option value="BACKUP_CREATE">BACKUP_CREATE</option>
            <option value="BACKUP_RESTORE">BACKUP_RESTORE</option>
            <option value="CHANGE_SETTINGS">CHANGE_SETTINGS</option>
          </select>
        </div>

        {/* Result filter */}
        <div>
          <select 
            value={resultFilter}
            onChange={e => setResultFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="">{isRtl ? '— النتيجة —' : '— Result —'}</option>
            <option value="success">{isRtl ? 'نجاح' : 'Success'}</option>
            <option value="failure">{isRtl ? 'أخفق' : 'Failure'}</option>
            <option value="warning">{isRtl ? 'تحذير' : 'Warning'}</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
          >
            <Download className="h-4 w-4" />
            {isRtl ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button 
            onClick={clearLogs}
            className="p-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all"
            title={isRtl ? 'حذف كافة السجلات' : 'Delete all logs'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-slate-400">
            <div className="animate-spin text-xl">⟳</div>
            <p className="text-xs font-bold mt-2">{isRtl ? 'جاري تحميل سجلات الأنشطة...' : 'Loading audit logs...'}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold space-y-1">
            <div>🔍</div>
            <p>{isRtl ? 'لم يتم العثور على أي نشاط مطابق للمرشحات.' : 'No matching audit activities logged.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-[11px] font-semibold">
            <table className="w-full text-right" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850">
                  <th className="py-2 text-slate-400">{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th className="py-2 text-slate-400">{isRtl ? 'المستخدم' : 'User'}</th>
                  <th className="py-2 text-slate-400">{isRtl ? 'العملية' : 'Action'}</th>
                  <th className="py-2 text-slate-400">{isRtl ? 'التفاصيل' : 'Details'}</th>
                  <th className="py-2 text-slate-400">{isRtl ? 'الفرع' : 'Branch'}</th>
                  <th className="py-2 text-slate-400">{isRtl ? 'الحالة' : 'Result'}</th>
                  <th className="py-2 text-slate-400">{isRtl ? 'الجهاز' : 'Device'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {filteredLogs.map(l => (
                  <tr key={l.id || l.timestamp} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2 font-mono text-[10px] text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="py-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{l.user}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-black block">{l.role}</span>
                    </td>
                    <td className="py-2 font-mono font-bold text-blue-500">{l.action}</td>
                    <td className="py-2 text-slate-500 max-w-[200px] truncate" title={l.details}>{l.details}</td>
                    <td className="py-2 text-slate-400">{l.branch}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        l.result === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        l.result === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>{l.result}</span>
                    </td>
                    <td className="py-2 font-mono text-[10px] text-slate-400">{l.device || 'PC'}</td>
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
