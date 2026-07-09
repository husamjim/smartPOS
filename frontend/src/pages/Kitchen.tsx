import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHat, Clock, AlertCircle, CheckCircle, Flame } from 'lucide-react';
import { db } from '../db/localDb';

interface KitchenOrder {
  id: string;
  invoice_number: string;
  table_number?: string;
  type: 'dine_in' | 'takeaway' | 'delivery';
  items: Array<{
    name_ar: string;
    name_en: string;
    quantity: number;
    notes?: string;
  }>;
  status: 'pending' | 'preparing' | 'ready';
  created_at: string;
  elapsed: number; // minutes elapsed
}

export const Kitchen: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  useEffect(() => {
    loadKitchenOrders();
    const interval = setInterval(() => {
      setOrders(prev => prev.map(o => ({
        ...o,
        elapsed: Math.floor((new Date().getTime() - new Date(o.created_at).getTime()) / 60000)
      })));
    }, 10000); // update elapsed time every 10s
    return () => clearInterval(interval);
  }, []);

  const loadKitchenOrders = async () => {
    const localOrders = await db.orders.toArray();
    const localOrderItems = await db.orderItems.toArray();
    const products = await db.products.toArray();
    const suspendedOrders = await db.suspendedOrders.toArray();

    const kitchenList: KitchenOrder[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Process completed orders
    const todayOrders = localOrders.filter(o => o.created_at.startsWith(todayStr) && o.status === 'completed');
    for (const o of todayOrders) {
      const oItems = localOrderItems.filter(item => item.order_id === o.id);
      const foodItems = [];

      for (const oItem of oItems) {
        const prod = products.find(p => p.id === oItem.product_id);
        if (prod && (prod.category === 'Restaurant' || prod.category === 'meal' || prod.category === 'sandwich' || prod.category === 'drink' || prod.category === 'dessert')) {
          foodItems.push({
            name_ar: prod.name_ar,
            name_en: prod.name_en,
            quantity: oItem.quantity,
            notes: undefined
          });
        }
      }

      if (foodItems.length > 0) {
        kitchenList.push({
          id: o.id,
          invoice_number: o.invoice_number,
          table_number: o.table_number || undefined,
          type: o.table_number ? 'dine_in' : 'takeaway',
          items: foodItems,
          status: 'pending',
          created_at: o.created_at,
          elapsed: Math.max(0, Math.floor((new Date().getTime() - new Date(o.created_at).getTime()) / 60000))
        });
      }
    }

    // 2. Process active suspended table bills
    const todaySuspended = suspendedOrders.filter(o => o.date.startsWith(todayStr));
    for (const o of todaySuspended) {
      const foodItems = [];

      for (const item of o.items) {
        const prod = products.find(p => p.id === item.product.id);
        if (prod && (prod.category === 'Restaurant' || prod.category === 'meal' || prod.category === 'sandwich' || prod.category === 'drink' || prod.category === 'dessert')) {
          foodItems.push({
            name_ar: prod.name_ar,
            name_en: prod.name_en,
            quantity: item.quantity,
            notes: undefined
          });
        }
      }

      if (foodItems.length > 0) {
        kitchenList.push({
          id: o.id,
          invoice_number: o.invoice_number,
          table_number: o.table_number || undefined,
          type: o.table_number ? 'dine_in' : 'takeaway',
          items: foodItems,
          status: 'preparing',
          created_at: o.date,
          elapsed: Math.max(0, Math.floor((new Date().getTime() - new Date(o.date).getTime()) / 60000))
        });
      }
    }

    setOrders(kitchenList);
  };

  const handleUpdateStatus = (orderId: string, nextStatus: 'preparing' | 'ready' | 'served') => {
    if (nextStatus === 'served') {
      // Remove order from KDS display when served
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    }
  };

  const isRtl = document.documentElement.dir === 'rtl';

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-3 space-x-reverse">
          <ChefHat className="h-8 w-8 text-orange-100 animate-bounce" />
          <div>
            <h2 className="text-xl font-bold font-sans">{isRtl ? 'شاشة عرض المطبخ KDS' : 'Kitchen Display Screen (KDS)'}</h2>
            <p className="text-xs text-orange-150">تجهيز الأطباق والطلبات الداخلية والتوصيل بالتوقيت والملاحظات.</p>
          </div>
        </div>
        <button
          onClick={loadKitchenOrders}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-semibold transition-all"
        >
          {isRtl ? 'تحديث التذاكر' : 'Refresh Tickets'}
        </button>
      </div>

      {/* Kanban Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[480px]">
        {/* Pending Tickets */}
        <div className="glass-card p-4 rounded-2xl flex flex-col space-y-4">
          <h3 className="font-bold text-sm text-red-500 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <AlertCircle className="h-4 w-4" />
            {isRtl ? 'بانتظار التحضير' : 'Pending Preparation'} 
            <span className="ml-auto bg-red-500/10 px-2 py-0.5 rounded text-xs">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[420px]">
            {orders.filter(o => o.status === 'pending').map(o => (
              <div key={o.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-3 relative overflow-hidden">
                <div className={`absolute top-0 right-0 left-0 h-1 ${o.type === 'dine_in' ? 'bg-blue-500' : 'bg-green-500'}`} />
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{o.invoice_number.slice(-4)}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${o.type === 'dine_in' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                    {o.type === 'dine_in' ? `${t('dine_in')} - ${o.table_number}` : t('takeaway')}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between font-bold">
                        <span>{isRtl ? item.name_ar : item.name_en}</span>
                        <span>x{item.quantity}</span>
                      </div>
                      {item.notes && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 p-1.5 rounded mt-0.5">⚠️ {item.notes}</p>}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-red-500" />
                    {o.elapsed} {isRtl ? 'دقيقة مضت' : 'm ago'}
                  </span>
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'preparing')}
                    className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold transition-all"
                  >
                    {isRtl ? 'بدء التحضير' : 'Cook'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preparing Tickets */}
        <div className="glass-card p-4 rounded-2xl flex flex-col space-y-4">
          <h3 className="font-bold text-sm text-blue-500 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Flame className="h-4 w-4 animate-pulse" />
            {isRtl ? 'قيد التحضير والتجهيز' : 'In Preparation'} 
            <span className="ml-auto bg-blue-500/10 px-2 py-0.5 rounded text-xs">
              {orders.filter(o => o.status === 'preparing').length}
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[420px]">
            {orders.filter(o => o.status === 'preparing').map(o => (
              <div key={o.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-3 relative overflow-hidden">
                <div className={`absolute top-0 right-0 left-0 h-1 ${o.type === 'dine_in' ? 'bg-blue-500' : 'bg-green-500'}`} />
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{o.invoice_number.slice(-4)}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${o.type === 'dine_in' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                    {o.type === 'dine_in' ? `${t('dine_in')} - ${o.table_number}` : t('takeaway')}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between font-bold">
                        <span>{isRtl ? item.name_ar : item.name_en}</span>
                        <span>x{item.quantity}</span>
                      </div>
                      {item.notes && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 p-1.5 rounded mt-0.5">⚠️ {item.notes}</p>}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-500 animate-spin" style={{ animationDuration: '6s' }} />
                    {o.elapsed} {isRtl ? 'دقيقة مضت' : 'm ago'}
                  </span>
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'ready')}
                    className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-all"
                  >
                    {isRtl ? 'جاهز للتسليم' : 'Ready'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready Tickets */}
        <div className="glass-card p-4 rounded-2xl flex flex-col space-y-4">
          <h3 className="font-bold text-sm text-green-500 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <CheckCircle className="h-4 w-4" />
            {isRtl ? 'طلبات جاهزة للتسليم' : 'Ready for Pickup'} 
            <span className="ml-auto bg-green-500/10 px-2 py-0.5 rounded text-xs">
              {orders.filter(o => o.status === 'ready').length}
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[420px]">
            {orders.filter(o => o.status === 'ready').map(o => (
              <div key={o.id} className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{o.invoice_number.slice(-4)}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${o.type === 'dine_in' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                    {o.type === 'dine_in' ? `${t('dine_in')} - ${o.table_number}` : t('takeaway')}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>{isRtl ? item.name_ar : item.name_en}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200/55 dark:border-slate-800/55 text-[10px]">
                  <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                    🛎️ جاهز
                  </span>
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'served')}
                    className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded font-bold transition-all shadow-sm"
                  >
                    {isRtl ? 'تم التسليم / الخدمة' : 'Serve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
