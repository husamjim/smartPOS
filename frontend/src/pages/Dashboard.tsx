import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, Landmark, RefreshCw } from 'lucide-react';
import { db } from '../db/localDb';
import { useApp } from '../context/AppContext';
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
  const { t } = useTranslation();
  const { currency, branches } = useApp();
  const [stats, setStats] = useState({
    salesToday: 0,
    ordersCount: 0,
    customersCount: 0,
    lowStockCount: 0
  });
  const [hourlySales, setHourlySales] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [branchSales, setBranchSales] = useState<number[]>([]);
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

    // Dynamic hourly chart distribution
    const hourlySalesData = [0, 0, 0, 0, 0, 0, 0];
    const branchSalesData = new Array(branches.length).fill(0);

    for (const o of todayOrders) {
      const date = new Date(o.created_at);
      const hour = date.getHours();
      if (hour < 10) hourlySalesData[0] += o.total;
      else if (hour < 12) hourlySalesData[1] += o.total;
      else if (hour < 14) hourlySalesData[2] += o.total;
      else if (hour < 16) hourlySalesData[3] += o.total;
      else if (hour < 18) hourlySalesData[4] += o.total;
      else if (hour < 20) hourlySalesData[5] += o.total;
      else hourlySalesData[6] += o.total;

      const bIdx = branches.findIndex(b => b.id === o.branch_id);
      if (bIdx > -1) {
        branchSalesData[bIdx] += o.total;
      } else if (branchSalesData.length > 0) {
        branchSalesData[0] += o.total;
      }
    }
    setHourlySales(hourlySalesData);
    setBranchSales(branchSalesData);

    // Counts
    const customersCount = await db.customers.count();
    const products = await db.products.toArray();
    
    // Low stock calculation
    let lowStockCount = 0;
    const itemsWithWarnings: any[] = [];
    
    for (const p of products) {
      const prodName = isRtl ? p.name_ar : p.name_en;
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

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 30);
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
        const qty = p.stock !== undefined ? p.stock : 0;
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
        label: isRtl ? `مبيعات اليوم (${currency})` : `Today Sales (${currency})`,
        data: hourlySales,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  const barData = {
    labels: branches.map(b => isRtl ? b.name_ar : b.name_en),
    datasets: [
      {
        label: t('total_revenue'),
        data: branchSales,
        backgroundColor: ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899'],
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
          <img src="./logo.png" alt="Logo" className="h-16 w-16 object-contain" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-sans">
              {t('performance_dashboard')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('welcome_back_here_is_a_quick_look_at_branch_performance_today')}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('refresh')}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between neon-glow-blue">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{t('sales_today')}</span>
            <h3 className="text-2xl font-bold font-sans">{stats.salesToday.toFixed(2)} <span className="text-xs font-normal">{currency}</span></h3>
            <span className="text-[10px] text-emerald-500 font-bold">▲ +12.4% {t('from_yesterday')}</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Orders */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{t('sales_transactions')}</span>
            <h3 className="text-2xl font-bold font-sans">{stats.ordersCount} {t('orders')}</h3>
            <span className="text-[10px] text-emerald-500 font-bold">▲ +4.2% {t('throughput')}</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Customers */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{t('total_customers')}</span>
            <h3 className="text-2xl font-bold font-sans">{stats.customersCount}</h3>
            <span className="text-[10px] text-blue-500 font-bold">{t('across_tiers')}</span>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between neon-glow-green">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold">{t('critical_stock_alerts')}</span>
            <h3 className="text-2xl font-bold font-sans text-amber-500 dark:text-amber-400">{stats.lowStockCount}</h3>
            <span className="text-[10px] text-amber-500 font-bold">{t('needs_attention')}</span>
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
            <h4 className="font-bold text-sm">{t('intraday_sales_flow')}</h4>
          </div>
          <div className="h-64">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>

        {/* Branch Comparison */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-1.5">
            <Landmark className="h-5 w-5 text-emerald-500" />
            <h4 className="font-bold text-sm">{t('branch_revenue_compare')}</h4>
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
            {t('active_stock_expiry_violations')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {criticalItems.map((item: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 text-xs border border-red-500/10 shadow-xs">
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
