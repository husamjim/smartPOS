import React, { useState, useEffect } from 'react';
import { db } from '../../db/localDb';
import { Bell, Trash2, Eye, EyeOff } from 'lucide-react';
import { AuditLogger } from '../../utils/auditLogger';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState('');

  const isRtl = document.documentElement.dir === 'rtl';

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const items = await db.notifications.reverse().toArray();
      setNotifications(items);
    } catch {
      const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
      setNotifications(saved);
    } finally {
      setLoading(false);
    }
  };

  const toggleReadStatus = async (id: string, isRead: number) => {
    try {
      await db.notifications.update(id, { isRead: isRead === 1 ? 0 : 1 });
      fetchNotifications();
    } catch {
      const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
      const updated = saved.map((n: any) => n.id === id ? { ...n, isRead: isRead === 1 ? 0 : 1 } : n);
      localStorage.setItem('pos_notifications', JSON.stringify(updated));
      setNotifications(updated);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await db.notifications.delete(id);
      fetchNotifications();
    } catch {
      const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
      const filtered = saved.filter((n: any) => n.id !== id);
      localStorage.setItem('pos_notifications', JSON.stringify(filtered));
      setNotifications(filtered);
    }
  };

  const markAllAsRead = async () => {
    try {
      await db.notifications.filter(n => n.isRead === 0).modify({ isRead: 1 });
      fetchNotifications();
      AuditLogger.log('CHANGE_SETTINGS', 'notifications', 'Marked all notifications as read', 'success');
    } catch {
      const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
      const updated = saved.map((n: any) => ({ ...n, isRead: 1 }));
      localStorage.setItem('pos_notifications', JSON.stringify(updated));
      setNotifications(updated);
    }
  };

  const clearAll = async () => {
    if (!confirm(isRtl ? 'هل تريد حذف كافة الإشعارات نهائياً؟' : 'Delete all notifications permanently?')) {
      return;
    }
    try {
      await db.notifications.clear();
      fetchNotifications();
      AuditLogger.log('CHANGE_SETTINGS', 'notifications', 'Cleared all notifications', 'warning');
    } catch {
      localStorage.removeItem('pos_notifications');
      setNotifications([]);
    }
  };

  const filtered = notifications.filter(n => {
    const matchesRead = filter === 'all' || (filter === 'unread' && n.isRead === 0) || (filter === 'read' && n.isRead === 1);
    const matchesType = !typeFilter || n.type === typeFilter;
    return matchesRead && matchesType;
  });

  return (
    <div className="space-y-4 text-right" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Controls */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center text-xs font-semibold">
        <div className="flex gap-2">
          {/* Read Filter */}
          <select 
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="all">{isRtl ? 'كل الإشعارات' : 'All Notifications'}</option>
            <option value="unread">{isRtl ? 'غير مقروءة' : 'Unread'}</option>
            <option value="read">{isRtl ? 'مقروءة' : 'Read'}</option>
          </select>

          {/* Type Filter */}
          <select 
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="">{isRtl ? '— كل الأنواع —' : '— All Types —'}</option>
            <option value="stock_low">{isRtl ? 'المخزون' : 'Stock Levels'}</option>
            <option value="expiry_near">{isRtl ? 'تواريخ انتهاء الصلاحية' : 'Expiry warnings'}</option>
            <option value="backup">{isRtl ? 'النسخ الاحتياطي' : 'System Backup'}</option>
            <option value="sync">{isRtl ? 'المزامنة السحابية' : 'Cloud Sync'}</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 text-xs font-bold transition-all"
          >
            {isRtl ? 'تحديد الكل كمقروء' : 'Mark All Read'}
          </button>
          <button 
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-all flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isRtl ? 'مسح الكل' : 'Clear All'}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-2.5">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs font-bold">
            <span className="animate-spin block text-lg mb-2">⟳</span>
            {isRtl ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold space-y-1">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-35" />
            <p>{isRtl ? 'لا توجد إشعارات مطابقة للمرشحات.' : 'No notifications match selected filters.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-900">
            {filtered.map(n => (
              <div key={n.id} className={`py-3 flex justify-between items-center ${n.isRead === 0 ? 'bg-indigo-500/5 px-2 rounded-xl' : ''}`}>
                <div className="space-y-1 text-right flex-1">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    n.type === 'stock_low' ? 'bg-red-500/10 text-red-500' :
                    n.type === 'expiry_near' ? 'bg-purple-500/10 text-purple-500' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>{n.type}</span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{n.title}</h4>
                  <p className="text-[11px] text-slate-500 max-w-2xl leading-normal">{n.body}</p>
                  <span className="text-[9px] text-slate-400 font-mono block">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5 ml-3">
                  <button 
                    onClick={() => toggleReadStatus(n.id, n.isRead)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition-colors"
                    title={n.isRead === 1 ? (isRtl ? 'تعيين كغير مقروء' : 'Mark unread') : (isRtl ? 'تعيين كمقروء' : 'Mark read')}
                  >
                    {n.isRead === 1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => deleteNotif(n.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    title={isRtl ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
