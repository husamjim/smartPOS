import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, Landmark, RefreshCw } from 'lucide-react';
import { db } from '../db/localDb';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    salesToday: 0,
    ordersCount: 0,
    customersCount: 0,
    lowStockCount: 0
  });
  const [criticalItems, setCriticalItems] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Today's orders
    const orders = await db.orders.toArray();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.created_at.startsWith(todayStr));
    const salesToday = todayOrders.reduce((sum, o) => sum + o.total, 0);

    // Counts
    const customersCount = await db.customers.count();
    const products = await db.products.toArray();
    
    // Low stock calculation
    let lowStockCount = 0;
    const itemsWithWarnings: any[] = [];
    
    for (const p of products) {
      const prodName = isRtl ? p.name_ar : p.name_en;
      // For pharmacy items check batches
      if (p.is_pharmaceutical) {
        const productBatches = await db.batches.where('product_id').equals(p.id).toArray();
        const totalQty = productBatches.reduce((s, b) => s + b.quantity, 0);
        if (totalQty <= p.min_stock) {
          lowStockCount++;
          itemsWithWarnings.push({ 
            id: p.id, 
            name: prodName, 
            reason: isRtl ? `المخزون منخفض: ${totalQty} ${p.unit}` : `Low stock: ${totalQty} ${p.unit}` 
          });
        }

        // Expiry check
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 30); // 30 days window
        const nearExpiryBatches = productBatches.filter(b => b.expiry_date && new Date(b.expiry_date) <= tomorrow);
        if (nearExpiryBatches.length > 0) {
          itemsWithWarnings.push({ 
            id: p.id + '_exp', 
            name: prodName, 
            reason: isRtl 
              ? `باتش ${nearExpiryBatches[0].batch_number} ينتهي في ${nearExpiryBatches[0].expiry_date}` 
              : `Batch ${nearExpiryBatches[0].batch_number} expires on ${nearExpiryBatches[0].expiry_date}` 
          });
        }
      } else {
        // Standard items
        const qty = p.stock !== undefined ? p.stock : 0; // standard zero default stock
        if (qty <= p.min_stock) {
          lowStockCount++;
          itemsWithWarnings.push({ 
            id: p.id, 
            name: prodName, 
            reason: isRtl ? `المخزون منخفض: ${qty} ${p.unit}` : `Low stock: ${qty} ${p.unit}` 
          });
        }
      }
    }

    setStats({
      salesToday: parseFloat(salesToday.toFixed(2)),
      ordersCount: todayOrders.length,
      customersCount: customersCount,
      lowStockCount: lowStockCount
    });

    setCriticalItems(itemsWithWarnings.slice(0, 5));
  };

  const isRtl = document.documentElement.dir === 'rtl';

  // Chart data definitions
  const lineData = {
    labels: ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'],
    datasets: [
      {
        fill: true,
        label: isRtl ? 'مبيعات اليوم (ريال)' : 'Today Sales (SAR)',
        data: [120, 450, 780, 1100, 1500, 2100, 2480],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  const barData = {
    labels: isRtl ? ['فرع الرياض', 'فرع جدة'] : ['Riyadh Branch', 'Jeddah Branch'],
    datasets: [
      {
        label: isRtl ? 'المبيعات الكلية' : 'Total Revenue',
        data: [15400, 9800],
        backgroundColor: ['#3b82f6', '#10b981'],
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-sans">
              {isRtl ? 'لوحة التحكم والمؤشرات' : 'Performance Dashboard'}
            </h2>
            <p className="text-xs text-slate-500">
              {isRtl 
                ? 'مرحباً بك مجدداً. إليك نظرة سريعة على أداء الفروع اليوم.' 
                : 'Welcome back. Here is a quick look at branch performance today.'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {isRtl ? 'تحديث البيانات' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between neon-glow-blue">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{isRtl ? 'مبيعات اليوم' : 'Sales Today'}</span>
            <h3 className="text-2xl font-bold font-sans">{stats.salesToday.toFixed(2)} <span className="text-xs font-normal">SAR</span></h3>
            <span className="text-[10px] text-emerald-500 font-bold">▲ +12.4% {isRtl ? 'عن أمس' : 'from yesterday'}</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Orders */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{isRtl ? 'عمليات البيع اليوم' : 'Sales Transactions'}</span>
            <h3 className="text-2xl font-bold font-sans">{stats.ordersCount} {isRtl ? 'عملية' : 'orders'}</h3>
            <span className="text-[10px] text-emerald-500 font-bold">▲ +4.2% {isRtl ? 'معدل سحب' : 'throughput'}</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Customers */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{isRtl ? 'العملاء المسجلين' : 'Total Customers'}</span>
            <h3 className="text-2xl font-bold font-sans">{stats.customersCount}</h3>
            <span className="text-[10px] text-blue-500 font-bold">{isRtl ? 'موزعين على الفئات' : 'across tiers'}</span>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between neon-glow-green">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{isRtl ? 'تنبيهات المخزون والتواريخ' : 'Critical Stock Alerts'}</span>
            <h3 className="text-2xl font-bold font-sans text-amber-500 dark:text-amber-400">{stats.lowStockCount}</h3>
            <span className="text-[10px] text-amber-500 font-bold">{isRtl ? 'تطلب انتباهاً عاجلاً' : 'needs attention'}</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Line */}
        <div className="glass-card p-5 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h4 className="font-bold text-sm">{isRtl ? 'حركة المبيعات خلال ساعات اليوم' : 'Intraday Sales Flow'}</h4>
          </div>
          <div className="h-64">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>

        {/* Branch Comparison */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-1.5">
            <Landmark className="h-5 w-5 text-emerald-500" />
            <h4 className="font-bold text-sm">{isRtl ? 'مقارنة إيرادات الفروع' : 'Branch Revenue Compare'}</h4>
          </div>
          <div className="h-64">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Critical Warnings list */}
      {criticalItems.length > 0 && (
        <div className="glass-card p-5 rounded-2xl border border-red-500/10 bg-red-500/5 space-y-3">
          <h4 className="font-bold text-sm text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5" />
            {isRtl ? 'التحذيرات النشطة في المستودع' : 'Active Stock & Expiry Violations'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {criticalItems.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 text-xs border border-red-500/10">
                <div className="font-bold mb-1">{item.name}</div>
                <div className="text-slate-500 dark:text-slate-400">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
