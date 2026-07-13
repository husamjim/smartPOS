import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { db } from '../../db/localDb';
import { Bell, Trash2, Eye, EyeOff } from 'lucide-react';
import { AuditLogger } from '../../utils/auditLogger';

export const NotificationCenter: React.FC = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState('');

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
    if (!confirm(t('delete_all_notifications_permanently'))) {
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
    <div className="space-y-4 text-right" dir={t('ltr')}>
      {/* Controls */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center text-xs font-semibold">
        <div className="flex gap-2">
          {/* Read Filter */}
          <select 
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="all">{t('all_notifications')}</option>
            <option value="unread">{t('unread')}</option>
            <option value="read">{t('read')}</option>
          </select>

          {/* Type Filter */}
          <select 
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="">{t('all_types')}</option>
            <option value="stock_low">{t('stock_levels')}</option>
            <option value="expiry_near">{t('expiry_warnings')}</option>
            <option value="backup">{t('system_backup')}</option>
            <option value="sync">{t('cloud_sync')}</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 text-xs font-bold transition-all"
          >
            {t('mark_all_read_1')}
          </button>
          <button 
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-all flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear_all')}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-2.5">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs font-bold">
            <span className="animate-spin block text-lg mb-2">⟳</span>
            {t('loading_notifications')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold space-y-1">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-35" />
            <p>{t('no_notifications_match_selected_filters')}</p>
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
                    title={n.isRead === 1 ? (t('mark_unread')) : (t('mark_read'))}
                  >
                    {n.isRead === 1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => deleteNotif(n.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    title={t('delete')}
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
