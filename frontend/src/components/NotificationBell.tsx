import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { db } from '../db/localDb';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const isRtl = document.documentElement.dir === 'rtl';

  useEffect(() => {
    fetchNotifications();

    // Check low stock on load & schedule every 30 seconds
    const interval = setInterval(checkAlerts, 30000);
    checkAlerts();

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const items = await db.notifications.reverse().toArray();
      setNotifications(items);
    } catch {
      // fallback
      const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
      setNotifications(saved);
    }
  };

  const checkAlerts = async () => {
    try {
      // 1. Low stock scanner
      const products = await db.products.toArray();
      for (const p of products) {
        const prodName = isRtl ? p.name_ar : p.name_en;
        let qty = 0;
        if (p.is_pharmaceutical) {
          const batches = await db.batches.where('product_id').equals(p.id).toArray();
          qty = batches.reduce((sum, b) => sum + b.quantity, 0);
        } else {
          qty = p.stock || 0;
        }

        if (qty <= p.min_stock) {
          const alertId = `stock_low_${p.id}`;
          const existing = await db.notifications.get(alertId).catch(() => null);
          if (!existing) {
            const notif = {
              id: alertId,
              type: 'stock_low',
              title: isRtl ? '⚠️ تنبيه: انخفاض المخزون' : '⚠️ Alert: Low Stock Level',
              body: isRtl 
                ? `لقد قارب المخزون من منتج "${prodName}" على النفاد (المتبقي: ${qty} ${p.unit})`
                : `Product "${prodName}" is running low (Remaining: ${qty} ${p.unit})`,
              isRead: 0,
              createdAt: new Date().toISOString()
            };
            await db.notifications.put(notif).catch(() => {
              const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
              if (!saved.some((n: any) => n.id === alertId)) {
                saved.push(notif);
                localStorage.setItem('pos_notifications', JSON.stringify(saved));
              }
            });
          }
        }
      }
      
      // 2. Expiry dates checker
      const batches = await db.batches.toArray();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      for (const b of batches) {
        if (b.expiry_date && new Date(b.expiry_date) <= in30Days) {
          const p = await db.products.get(b.product_id);
          if (p) {
            const prodName = isRtl ? p.name_ar : p.name_en;
            const alertId = `expiry_near_${b.id}`;
            const existing = await db.notifications.get(alertId).catch(() => null);
            if (!existing) {
              const notif = {
                id: alertId,
                type: 'expiry_near',
                title: isRtl ? '💊 تنبيه صلاحية قريب' : '💊 Expiry warning',
                body: isRtl 
                  ? `الباتش (${b.batch_number}) للمنتج "${prodName}" سينتهي في تاريخ ${b.expiry_date}`
                  : `Batch (${b.batch_number}) for product "${prodName}" expires on ${b.expiry_date}`,
                isRead: 0,
                createdAt: new Date().toISOString()
              };
              await db.notifications.put(notif).catch(() => {
                const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
                if (!saved.some((n: any) => n.id === alertId)) {
                  saved.push(notif);
                  localStorage.setItem('pos_notifications', JSON.stringify(saved));
                }
              });
            }
          }
        }
      }

      fetchNotifications();
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await db.notifications.filter(n => n.isRead === 0).modify({ isRead: 1 });
      fetchNotifications();
    } catch {
      const saved = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
      const updated = saved.map((n: any) => ({ ...n, isRead: 1 }));
      localStorage.setItem('pos_notifications', JSON.stringify(updated));
      setNotifications(updated);
    }
  };

  const deleteNotification = async (id: string) => {
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

  const unreadCount = notifications.filter(n => n.isRead === 0).length;

  return (
    <div className="relative font-sans select-none">
      {/* Icon Bell */}
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all relative"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {showDropdown && (
        <div className={`absolute top-12 z-50 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-2xl w-80 space-y-3 ${isRtl ? 'left-0' : 'right-0'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-200">{isRtl ? 'مركز الإشعارات' : 'Notifications'}</h4>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] text-indigo-500 hover:underline font-bold flex items-center gap-0.5"
              >
                <Check className="h-3 w-3" />
                {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>{isRtl ? 'علبة الإشعارات فارغة.' : 'All caught up! No notifications.'}</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`py-2 flex gap-2 justify-between items-start ${n.isRead === 0 ? 'bg-indigo-500/5' : ''}`}>
                  <div className="space-y-0.5 flex-1 text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="text-[10px] text-slate-500 leading-normal">{n.body}</p>
                    <span className="text-[8px] text-slate-400 font-mono block">{new Date(n.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <button 
                    onClick={() => deleteNotification(n.id)}
                    className="text-slate-350 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
